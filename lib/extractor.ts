import dns from "node:dns/promises";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_BYTES        = 5_000_000;       // 5 MB download cap (major news sites run 3–5 MB)
const CACHE_TTL_MS     = 15 * 60 * 1000; // 15-min HTML cache
const MIN_ARTICLE_CHARS = 1_600;
const SHORT_TEXT_CEILING = 800;
const MIN_CANDIDATES   = 6;
const MIN_TOP_SCORE    = 85;
const MIN_AVG_TOP5     = 70;

const FETCH_HEADERS = {
  "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

const ARCHIVE_TOKENS = ["/archive", "/sections/", "/tag/", "/category/", "/topics/", "/subject/", "/keyword/", "/newsroom/"];
const STORY_TOKENS   = ["/news/", "/newsroom/", "/politics/", "/world/", "/story", "/article", "/202"];
const NAV_KEYWORDS   = ["sign in", "subscribe", "donate", "privacy", "terms", "contact"];

// ── Types ────────────────────────────────────────────────────────────────────

export type ExtractCandidate = { title: string; url: string; score: number; snippet: string };

export type ExtractResponse = {
  url:        string;
  chosen_url: string;
  title:      string;
  text:       string;
  is_multi:   boolean;
  candidates: ExtractCandidate[];
};

type LinkCandidate = ExtractCandidate; // same shape internally

// ── HTML cache ───────────────────────────────────────────────────────────────

const htmlCache = new Map<string, { expiresAt: number; html: string }>();

function cacheGet(url: string): string | null {
  const hit = htmlCache.get(url);
  if (!hit || Date.now() > hit.expiresAt) return null;
  return hit.html;
}

function cacheSet(url: string, html: string): void {
  htmlCache.set(url, { expiresAt: Date.now() + CACHE_TTL_MS, html });
}

// ── SSRF protection ──────────────────────────────────────────────────────────

const PRIVATE_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
  /^::1$/,
  /^f[cd][0-9a-f]{2}:/i,  // fc00::/7 ULA (fc + fd prefixes)
  /^fe[89ab][0-9a-f]:/i,
];

async function isPublicHost(hostname: string): Promise<boolean> {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local")) return false;
  try {
    const v4 = await dns.resolve4(hostname).catch(() => [] as string[]);
    const v6 = await dns.resolve6(hostname).catch(() => [] as string[]);
    const all = [...v4, ...v6];
    if (all.length === 0) return false;
    return !all.some(ip => PRIVATE_RANGES.some(r => r.test(ip)));
  } catch {
    return false;
  }
}

export async function isPublicHttpUrl(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    if (!parsed.hostname) return false;
    return await isPublicHost(parsed.hostname);
  } catch {
    return false;
  }
}

// ── HTML fetch ───────────────────────────────────────────────────────────────

class FetchError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function fetchHtml(url: string): Promise<string> {
  const cached = cacheGet(url);
  if (cached) return cached;

  let r: Response;
  try {
    r = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(12_000),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError")
      throw new FetchError(422, "The request timed out — the website may be slow or blocking access.");
    throw new FetchError(422, "Could not connect to the website. It may be blocking automated access.");
  }

  if (!r.ok) {
    if (r.status === 403) throw new FetchError(422, "This article is restricted or blocked by the website.");
    if (r.status === 404) throw new FetchError(422, "Article not found — check the URL and try again.");
    if (r.status === 429) throw new FetchError(429, "The article website is rate-limiting requests. Try again later.");
    throw new FetchError(422, `The article website returned an error (${r.status}).`);
  }

  const ct = r.headers.get("content-type") ?? "";
  if (!ct.includes("text/html") && !ct.includes("application/xhtml+xml"))
    throw new FetchError(415, "Unsupported content-type — this URL does not appear to be a web page.");

  // Stream with size cap
  if (!r.body) throw new FetchError(422, "Empty response from website.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = r.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) throw new FetchError(413, "Page too large to process.");
    chunks.push(value);
  }

  const html = new TextDecoder("utf-8", { fatal: false }).decode(
    Buffer.concat(chunks.map(c => Buffer.from(c)))
  );
  cacheSet(url, html);
  return html;
}

// ── Text extraction ──────────────────────────────────────────────────────────

export function extractText(html: string, url: string): { title: string; text: string } {
  const { document } = parseHTML(html);
  const article = new Readability(document as unknown as Document).parse();
  const title = article?.title?.trim() ?? "";

  // Use Readability's HTML output to extract per-paragraph text, preserving breaks.
  // Falling back to flat textContent if no <p> tags are found.
  if (article?.content) {
    const { document: articleDoc } = parseHTML(article.content);
    const paras = Array.from(articleDoc.querySelectorAll("p"))
      .map(p => (p.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (paras.length > 0) {
      return { title, text: paras.join("\n\n") };
    }
  }

  return { title, text: (article?.textContent ?? "").replace(/\s+/g, " ").trim() };
}

// ── Hub detection helpers ────────────────────────────────────────────────────

export function looksLikeArchivePath(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return ARCHIVE_TOKENS.some(t => path.includes(t));
  } catch { return false; }
}

export function looksLikeSectionPath(url: string): boolean {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    if (parts.length === 0) return true; // bare domain homepage (e.g. cnn.com, bbc.com)
    return parts.length === 1 && !/\d/.test(parts[0]) && !parts[0].includes(".");
  } catch { return false; }
}

export function looksLikeHubText(text: string): boolean {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 12) return false;
  const short = lines.filter(l => l.length <= 90).length;
  return lines.length >= 20 && short / lines.length >= 0.65;
}

// ── Story link extraction ────────────────────────────────────────────────────

export function guessStoryLinks(html: string, baseUrl: string): LinkCandidate[] {
  const { document: doc } = parseHTML(html);
  const root: Element = doc.querySelector("main") ?? doc.body;
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const links: LinkCandidate[] = [];

  for (const el of root.querySelectorAll("a[href]")) {
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text.length < 18 || text.length > 140) continue;
    if (NAV_KEYWORDS.some(k => text.toLowerCase().includes(k))) continue;

    let href: URL;
    try { href = new URL(el.getAttribute("href")!, baseUrl); } catch { continue; }
    if (!["http:", "https:"].includes(href.protocol)) continue;
    if (href.hostname !== base.hostname) continue;

    const key = `${href.hostname}${href.pathname}${href.search}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const path = href.pathname.toLowerCase();
    let score = Math.min(60, text.length);
    if (STORY_TOKENS.some(t => path.includes(t))) score += 25;
    if (path.split("/").length >= 4)              score += 10;
    if (/\d/.test(path))                          score += 10;

    links.push({ title: text, url: href.href, score, snippet: text.slice(0, 120) });
  }

  return links.sort((a, b) => b.score - a.score).slice(0, 8);
}

// ── Multi-story detection ────────────────────────────────────────────────────

export function decideIsMulti(url: string, text: string, links: LinkCandidate[]): boolean {
  // Archive/category path check runs BEFORE text-length guard
  if (looksLikeArchivePath(url)) {
    if (links.length >= MIN_CANDIDATES || looksLikeHubText(text)) return true;
  }

  const topScore  = links[0]?.score ?? 0;
  const top5      = links.slice(0, 5);
  const avgTop5   = top5.length ? top5.reduce((s, l) => s + l.score, 0) / top5.length : 0;
  const strong    = links.length >= MIN_CANDIDATES && topScore >= MIN_TOP_SCORE && avgTop5 >= MIN_AVG_TOP5;

  // Long text is normally a single article — except on known hub URL shapes.
  if (strong && (looksLikeArchivePath(url) || looksLikeSectionPath(url))) return true;

  if (text.length >= MIN_ARTICLE_CHARS) return false;

  return strong && (text.length <= SHORT_TEXT_CEILING || looksLikeHubText(text));
}

// ── Main entry point ─────────────────────────────────────────────────────────

export async function extract(
  url: string,
  opts: { include_candidates?: boolean; max_chars?: number } = {}
): Promise<ExtractResponse> {
  const { include_candidates = true, max_chars = 40_000 } = opts;

  if (!await isPublicHttpUrl(url))
    throw new Error("URL must be http(s) and not a local or private address.");

  const html = await fetchHtml(url);
  const { title, text: rawText } = extractText(html, url);

  let links: LinkCandidate[] = [];
  if (include_candidates && (rawText.length < MIN_ARTICLE_CHARS || looksLikeArchivePath(url) || looksLikeSectionPath(url))) {
    links = guessStoryLinks(html, url);
  }

  const is_multi   = decideIsMulti(url, rawText, links);
  const candidates = is_multi ? links : [];
  const text       = rawText.slice(0, max_chars).trim();

  if (!text) throw new Error("Could not extract readable article text. Try pasting the article instead.");

  return { url, chosen_url: url, title, text, is_multi, candidates };
}
