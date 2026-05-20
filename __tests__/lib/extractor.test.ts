import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  looksLikeArchivePath,
  looksLikeSectionPath,
  looksLikeHubText,
  guessStoryLinks,
  decideIsMulti,
  isPublicHttpUrl,
  fetchHtml,
} from "@/lib/extractor";

// ── DNS mock for isPublicHttpUrl tests ────────────────────────────────────────

const { mockResolve4, mockResolve6 } = vi.hoisted(() => ({
  mockResolve4: vi.fn().mockResolvedValue([]),
  mockResolve6: vi.fn().mockResolvedValue([]),
}));

vi.mock("node:dns/promises", () => ({
  default: {
    resolve4: (...args: unknown[]) => mockResolve4(...args),
    resolve6: (...args: unknown[]) => mockResolve6(...args),
  },
}));

// ── looksLikeArchivePath ──────────────────────────────────────────────────────

describe("looksLikeArchivePath", () => {
  it("matches /tag/ paths", () => {
    expect(looksLikeArchivePath("https://example.com/tag/politics")).toBe(true);
  });

  it("matches /category/ paths", () => {
    expect(looksLikeArchivePath("https://example.com/category/news")).toBe(true);
  });

  it("matches /archive paths", () => {
    expect(looksLikeArchivePath("https://example.com/archive/2024")).toBe(true);
  });

  it("matches /topics/ paths", () => {
    expect(looksLikeArchivePath("https://example.com/topics/climate")).toBe(true);
  });

  it("does not match article paths", () => {
    expect(looksLikeArchivePath("https://cnn.com/2024/01/01/politics/story")).toBe(false);
  });

  it("does not match single-segment section paths", () => {
    expect(looksLikeArchivePath("https://cnn.com/politics")).toBe(false);
  });

  it("returns false for invalid URL", () => {
    expect(looksLikeArchivePath("not-a-url")).toBe(false);
  });
});

// ── looksLikeSectionPath ──────────────────────────────────────────────────────

describe("looksLikeSectionPath", () => {
  it("matches single-segment section paths like /politics", () => {
    expect(looksLikeSectionPath("https://cnn.com/politics")).toBe(true);
  });

  it("matches /world, /business, /entertainment", () => {
    expect(looksLikeSectionPath("https://bbc.com/world")).toBe(true);
    expect(looksLikeSectionPath("https://nytimes.com/business")).toBe(true);
  });

  it("does not match paths with digits (e.g. year segments)", () => {
    expect(looksLikeSectionPath("https://example.com/2024")).toBe(false);
  });

  it("does not match paths with file extensions", () => {
    expect(looksLikeSectionPath("https://example.com/index.html")).toBe(false);
  });

  it("does not match multi-segment paths", () => {
    expect(looksLikeSectionPath("https://cnn.com/politics/story-slug")).toBe(false);
  });

  it("matches bare domain homepage (no path segments)", () => {
    expect(looksLikeSectionPath("https://cnn.com/")).toBe(true);
    expect(looksLikeSectionPath("https://cnn.com")).toBe(true);
  });

  it("returns false for invalid URL", () => {
    expect(looksLikeSectionPath("not-a-url")).toBe(false);
  });
});

// ── looksLikeHubText ──────────────────────────────────────────────────────────

describe("looksLikeHubText", () => {
  it("returns true for many short lines", () => {
    const lines = Array.from({ length: 25 }, (_, i) => `Headline number ${i + 1} is a short line`);
    expect(looksLikeHubText(lines.join("\n"))).toBe(true);
  });

  it("returns false for fewer than 20 lines", () => {
    const lines = Array.from({ length: 15 }, (_, i) => `Short line ${i}`);
    expect(looksLikeHubText(lines.join("\n"))).toBe(false);
  });

  it("returns false for single-line text (Readability output)", () => {
    const text = "This is a long article text all on one line. ".repeat(50);
    expect(looksLikeHubText(text)).toBe(false);
  });

  it("returns false when most lines are long prose", () => {
    const lines = Array.from(
      { length: 25 },
      () => "This is a very long line of prose that exceeds the ninety character threshold for hub detection and keeps going."
    );
    expect(looksLikeHubText(lines.join("\n"))).toBe(false);
  });
});

// ── guessStoryLinks ───────────────────────────────────────────────────────────

describe("guessStoryLinks", () => {
  const BASE = "https://example.com";

  function html(links: { href: string; text: string }[]) {
    return `<html><body><main>${links.map(
      l => `<a href="${l.href}">${l.text}</a>`
    ).join("")}</main></body></html>`;
  }

  it("returns scored candidates for story-like links", () => {
    const h = html([
      { href: "/news/2024/01/01/some-story", text: "This is a long enough article headline text" },
    ]);
    const links = guessStoryLinks(h, BASE);
    expect(links.length).toBe(1);
    expect(links[0].score).toBeGreaterThan(80);
  });

  it("excludes links to other domains", () => {
    const h = html([
      { href: "https://other.com/news/story-slug-here-long", text: "Article about something important today" },
    ]);
    expect(guessStoryLinks(h, BASE)).toHaveLength(0);
  });

  it("includes www-prefixed links when base has no www (redirect case)", () => {
    // foxnews.com redirects to www.foxnews.com — HTML links use www host, base does not
    const h = `<html><body><main>
      <a href="https://www.example.com/politics/2024/story-slug">Long enough headline about breaking news today</a>
    </main></body></html>`;
    expect(guessStoryLinks(h, BASE)).toHaveLength(1);
  });

  it("excludes links with nav keywords", () => {
    const h = html([
      { href: "/subscribe/plan", text: "Subscribe to get full access to our articles" },
      { href: "/signin/page", text: "Sign in to your account to read this article" },
    ]);
    expect(guessStoryLinks(h, BASE)).toHaveLength(0);
  });

  it("excludes links with text shorter than 18 chars", () => {
    const h = html([
      { href: "/news/story", text: "Too short" },
    ]);
    expect(guessStoryLinks(h, BASE)).toHaveLength(0);
  });

  it("returns at most 8 results", () => {
    const links = Array.from({ length: 15 }, (_, i) => ({
      href: `/news/2024/story-number-${i}`,
      text: `Article headline number ${i} about something that happened recently`,
    }));
    const result = guessStoryLinks(html(links), BASE);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it("sorts by score descending", () => {
    const h = html([
      { href: "/about", text: "A short but valid text link about us" },
      { href: "/news/2024/01/story", text: "Breaking news article with a long enough headline today" },
    ]);
    const links = guessStoryLinks(h, BASE);
    expect(links[0].score).toBeGreaterThanOrEqual(links[links.length - 1].score);
  });
});

// ── decideIsMulti ─────────────────────────────────────────────────────────────

describe("decideIsMulti", () => {
  const LONG_TEXT = "x".repeat(2000);
  const SHORT_TEXT = "x".repeat(400);

  function strongLinks(n = 6) {
    return Array.from({ length: n }, (_, i) => ({
      title: `Article headline ${i}`,
      url: `https://cnn.com/politics/2024/story-${i}`,
      score: 95,
      snippet: `Article headline ${i}`,
    }));
  }

  it("returns true for archive path with enough links", () => {
    expect(decideIsMulti("https://example.com/tag/news", LONG_TEXT, strongLinks())).toBe(true);
  });

  it("returns false for long article text with no hub signals", () => {
    expect(decideIsMulti("https://example.com/2024/01/01/story", LONG_TEXT, [])).toBe(false);
  });

  it("returns true for section path with strong links, even with long text (CNN/politics case)", () => {
    expect(decideIsMulti("https://cnn.com/politics", LONG_TEXT, strongLinks())).toBe(true);
  });

  it("returns true for section path with any links found (foxnews.com/politics case)", () => {
    // Section paths are unambiguously hubs — MIN_CANDIDATES (6) is too strict.
    // Even 1–3 story links found is enough to confirm it's a hub.
    expect(decideIsMulti("https://cnn.com/politics", LONG_TEXT, strongLinks(3))).toBe(true);
    expect(decideIsMulti("https://foxnews.com/politics", LONG_TEXT, strongLinks(1))).toBe(true);
  });

  it("returns true for section path even with no links (JS-rendered hub, e.g. foxnews.com/politics)", () => {
    expect(decideIsMulti("https://cnn.com/politics", LONG_TEXT, [])).toBe(true);
    expect(decideIsMulti("https://foxnews.com/politics", LONG_TEXT, [])).toBe(true);
  });

  it("returns true for short text with strong link signal", () => {
    expect(decideIsMulti("https://example.com/some-page", SHORT_TEXT, strongLinks())).toBe(true);
  });

  it("returns false for short text without strong link signal", () => {
    // Multi-segment path — not a section path, so short text + no links = not a hub
    expect(decideIsMulti("https://example.com/some-page/detail", SHORT_TEXT, [])).toBe(false);
  });

  it("returns false for long text non-section path even with strong links (links not gathered in practice)", () => {
    expect(decideIsMulti("https://example.com/2024/long/article/path", LONG_TEXT, strongLinks())).toBe(false);
  });
});

// ── isPublicHttpUrl ───────────────────────────────────────────────────────────

describe("isPublicHttpUrl", () => {
  beforeEach(() => {
    mockResolve4.mockReset().mockResolvedValue([]);
    mockResolve6.mockReset().mockResolvedValue([]);
  });

  it("rejects ftp:// protocol", async () => {
    expect(await isPublicHttpUrl("ftp://example.com")).toBe(false);
  });

  it("rejects localhost", async () => {
    expect(await isPublicHttpUrl("http://localhost/foo")).toBe(false);
  });

  it("rejects .local domains", async () => {
    expect(await isPublicHttpUrl("http://mydevbox.local/api")).toBe(false);
  });

  it("rejects malformed URLs", async () => {
    expect(await isPublicHttpUrl("not-a-url")).toBe(false);
  });

  it("rejects private IPv4 addresses", async () => {
    mockResolve4.mockResolvedValue(["192.168.1.1"]);
    expect(await isPublicHttpUrl("http://internal.corp")).toBe(false);
  });

  it("rejects loopback addresses", async () => {
    mockResolve4.mockResolvedValue(["127.0.0.1"]);
    expect(await isPublicHttpUrl("http://loopback.test")).toBe(false);
  });

  it("accepts public IP addresses", async () => {
    mockResolve4.mockResolvedValue(["93.184.216.34"]);
    expect(await isPublicHttpUrl("https://example.com")).toBe(true);
  });

  it("rejects hosts with no DNS records", async () => {
    mockResolve4.mockResolvedValue([]);
    mockResolve6.mockResolvedValue([]);
    expect(await isPublicHttpUrl("https://nonexistent.example.invalid")).toBe(false);
  });
});

// ── fetchHtml error paths ─────────────────────────────────────────────────────

describe("fetchHtml error paths", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockFetch(response: object) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  }

  it("throws on HTTP 403", async () => {
    mockFetch({ ok: false, status: 403, headers: { get: () => null }, body: null });
    await expect(fetchHtml("https://example.com/r403")).rejects.toThrow(/restricted/i);
  });

  it("throws on HTTP 404", async () => {
    mockFetch({ ok: false, status: 404, headers: { get: () => null }, body: null });
    await expect(fetchHtml("https://example.com/r404")).rejects.toThrow(/not found/i);
  });

  it("throws on HTTP 429 with status 429", async () => {
    mockFetch({ ok: false, status: 429, headers: { get: () => null }, body: null });
    await expect(fetchHtml("https://example.com/r429")).rejects.toMatchObject({ status: 429 });
  });

  it("throws on non-HTML content-type with status 415", async () => {
    mockFetch({
      ok: true, status: 200,
      headers: { get: (h: string) => h === "content-type" ? "application/json" : null },
      body: {},
    });
    await expect(fetchHtml("https://example.com/r415")).rejects.toMatchObject({ status: 415 });
  });

  it("throws when response body exceeds 5 MB with status 413", async () => {
    const bigChunk = new Uint8Array(5_000_001);
    let read = false;
    const reader = { read: vi.fn(async () => {
      if (read) return { done: true, value: undefined };
      read = true;
      return { done: false, value: bigChunk };
    }) };
    mockFetch({
      ok: true, status: 200,
      headers: { get: (h: string) => h === "content-type" ? "text/html" : null },
      body: { getReader: () => reader },
    });
    await expect(fetchHtml("https://example.com/r413")).rejects.toMatchObject({ status: 413 });
  });
});
