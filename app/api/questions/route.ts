// app/api/questions/route.ts
import OpenAI from "openai";
import { buildPrompt, type Mode as PromptMode } from "@/lib/prompt";
import { extract, type ExtractResponse, type ExtractCandidate } from "@/lib/extractor";
import { corsOptions } from "@/lib/cors";

export const runtime = "nodejs";
export const maxDuration = 300; // allow Vercel to stream for up to 5 min

// OpenAI client — lazy singleton so missing API key fails at request time,
// not at module load (which would crash the dev server before any request).
let _client: OpenAI | null = null;

/**
 * Returns the shared OpenAI client instance, creating it on first call.
 *
 * @returns {OpenAI} The OpenAI client configured with OPENAI_API_KEY.
 */
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

// -----------------------------
// Types
// -----------------------------
type Mode = PromptMode;

type Label = "Words" | "Proof" | "Missing";

type NormalizedItem = { label: Label; text: string; why: string; excerpt?: string };

type NormalizedOutput = {
  mode: Exclude<Mode, "bundle">; // fast|deeper|cliff
  items: NormalizedItem[];
};

type Bundle = {
  fast: NormalizedItem[];
  deeper: NormalizedItem[];
  cliff: NormalizedItem[];
};

type BundledOutput = {
  mode: "bundle";
  bundle: Bundle;
};

type NeedsChoice = {
  mode: Mode;
  needsChoice: true;
  sourceUrl: string;
  candidates: ExtractCandidate[];
};

type ApiOut = NormalizedOutput | BundledOutput | NeedsChoice;

type Body = {
  mode?: unknown;
  inputMode?: unknown;
  text?: unknown;
  url?: unknown;
  chosenUrl?: unknown;
};

// -----------------------------
// Small helpers
// -----------------------------

/**
 * Coerces an unknown value to a valid Mode string, defaulting to "fast".
 *
 * @param {unknown} raw - The raw value from the request body.
 * @returns {Mode} One of "fast" | "deeper" | "cliff" | "bundle".
 */
function parseMode(raw: unknown): Mode {
  return raw === "deeper" || raw === "fast" || raw === "cliff" || raw === "bundle"
    ? raw
    : "fast";
}

/**
 * Type guard that checks whether a value is a valid question label.
 *
 * @param {unknown} x - The value to check.
 * @returns {boolean} True if x is "Words", "Proof", or "Missing".
 */
function isLabel(x: unknown): x is Label {
  return x === "Words" || x === "Proof" || x === "Missing";
}

// -----------------------------
// Content moderation
// -----------------------------

// Categories always rejected regardless of score
const HARD_REJECT = new Set(["sexual/minors", "hate"]);

// High-threshold categories — news legitimately covers these
const SOFT_THRESHOLD: Record<string, number> = {
  violence: 0.90,
  harassment: 0.90,
  "hate/threatening": 0.85,
  "violence/graphic": 0.90,
};

type ModerationResult =
  | { flagged: false }
  | { flagged: true; reason: string };

/**
 * Screens article text with the OpenAI Moderation API.
 *
 * Hard-rejects hate and sexual/minors content at any score.
 * Applies higher thresholds for violence/harassment to avoid
 * over-flagging legitimate news coverage.
 */
async function moderateText(text: string): Promise<ModerationResult> {
  const result = await getClient().moderations.create({ input: text });
  const r = result.results[0];
  if (!r) return { flagged: false };

  const cats = r.categories as unknown as Record<string, boolean>;
  const scores = r.category_scores as unknown as Record<string, number>;

  for (const cat of HARD_REJECT) {
    if (cats[cat]) return { flagged: true, reason: cat };
  }

  for (const [cat, threshold] of Object.entries(SOFT_THRESHOLD)) {
    if ((scores[cat] ?? 0) >= threshold) return { flagged: true, reason: cat };
  }

  return { flagged: false };
}

// -----------------------------
// Model call
// -----------------------------

/**
 * Sends a prompt to the OpenAI model and returns the parsed JSON response.
 *
 * Uses the Responses API with json_object format and a 30-second abort timeout.
 *
 * @param {string} prompt - The fully-built prompt string to send to the model.
 * @returns {Promise<unknown>} Parsed JSON from the model's first output message.
 * @throws {Error} If the model returns no message, no text content, or invalid JSON.
 */
async function runModel(prompt: string): Promise<unknown> {
  const resp = await getClient().responses.create(
    {
      model: "gpt-5.2",
      input: prompt,
      text: { format: { type: "json_object" } }
    },
    { signal: AbortSignal.timeout(30_000) }
  );

  const output = resp.output?.[0];
  if (!output || output.type !== "message") {
    throw new Error("No message output from model.");
  }

  const content = output.content?.[0];
  if (!content || content.type !== "output_text") {
    throw new Error("Model did not return text output.");
  }

  return JSON.parse(content.text);
}

// -----------------------------
// Input resolution
// -----------------------------
type ResolveResult =
  | { kind: "text"; text: string }
  | { kind: "needs-choice"; sourceUrl: string; candidates: ExtractCandidate[] }
  | { kind: "error"; message: string };

/**
 * Resolves the request body into article text, a user-choice prompt, or a validation error.
 *
 * In paste mode, validates that the pasted text is at least 80 characters.
 * In URL mode, calls the extractor and either returns text, requests a user choice
 * (if the page is a multi-article listing), or returns an error if extraction fails.
 *
 * @param {Body} body - The parsed request body.
 * @returns {Promise<ResolveResult>} Discriminated union: "text" | "needs-choice" | "error".
 */
async function resolveInput(body: Body): Promise<ResolveResult> {
  const inputMode = body.inputMode === "url" ? "url" : "paste";

  if (inputMode === "paste") {
    const text = String(body.text ?? "");
    const trimmed = text.trim();
    if (trimmed.length < 80) {
      return { kind: "error", message: "Paste a bit more article text (at least ~80 characters)." };
    }
    return { kind: "text", text: trimmed };
  }

  const url = String(body.url ?? "").trim();
  const chosenUrl = String(body.chosenUrl ?? "").trim();

  if (url.length < 8) {
    return { kind: "error", message: "Paste a valid URL." };
  }

  const targetUrl = chosenUrl || url;
  const extracted = await extract(targetUrl, { include_candidates: true });

  if (!chosenUrl && extracted.is_multi) {
    return { kind: "needs-choice", sourceUrl: extracted.url, candidates: extracted.candidates ?? [] };
  }

  const text = (extracted.text ?? "").trim();
  if (text.length < 80) {
    return { kind: "error", message: "Could not extract enough article text from that URL." };
  }

  return { kind: "text", text };
}

// -----------------------------
// Normalization helpers
// -----------------------------

/**
 * Validates and normalizes the raw items array returned by the model.
 *
 * Enforces:
 * - Exactly 3 items in the array.
 * - Each item has a valid label ("Words" | "Proof" | "Missing").
 * - Each item has non-empty `text` (accepting "text", "question", or "cue" keys) and `why`.
 * - Cliff mode: `text` must not contain "?" and will have a period auto-appended if missing.
 * - Question modes (fast/deeper): `text` must end with "?".
 *
 * @param {unknown} rawItems - The raw array from the model response.
 * @param {Exclude<Mode, "bundle">} mode - The analysis mode ("fast" | "deeper" | "cliff").
 * @returns {NormalizedItem[]} Array of exactly 3 validated, normalized items.
 * @throws {Error} On any schema violation (wrong count, bad label, missing fields, format rules).
 */
function normalizeItems(rawItems: unknown, mode: Exclude<Mode, "bundle">): NormalizedItem[] {
  if (!Array.isArray(rawItems) || rawItems.length !== 3) {
    throw new Error("Model returned unexpected shape (need 3 items).");
  }

  return rawItems.map((raw) => {
    if (typeof raw !== "object" || raw === null) throw new Error("Invalid item.");

    const it = raw as Record<string, unknown>;
    if (!isLabel(it.label)) throw new Error("Invalid label.");

    const why = typeof it.why === "string" ? it.why.trim() : "";
    if (!why) throw new Error("Missing why.");

    const textCandidate =
      typeof it.text === "string"
        ? it.text
        : typeof it.question === "string"
        ? it.question
        : typeof it.cue === "string"
        ? it.cue
        : "";

    const text = textCandidate.trim();
    if (!text) throw new Error("Missing text.");

    if (mode === "cliff") {
      if (text.includes("?")) throw new Error("Cliff cue contains '?'.");
      // Auto-append period if model omitted it
      return {
        label: it.label,
        text: text.endsWith(".") ? text : text + ".",
        why,
        excerpt: typeof it.excerpt === "string" && it.excerpt.trim() ? it.excerpt.trim() : undefined,
      };
    } else {
      if (!text.endsWith("?")) throw new Error("Question must end with '?'.");
    }

    const excerpt =
      typeof it.excerpt === "string" && it.excerpt.trim() ? it.excerpt.trim() : undefined;

    return { label: it.label, text, why, excerpt };
  });
}

/**
 * Normalizes model output for a single analysis mode (fast, deeper, or cliff).
 *
 * Accepts either "items" or "questions" as the array key to tolerate minor model variation.
 *
 * @param {unknown} parsed - The raw parsed JSON object from the model.
 * @param {Exclude<Mode, "bundle">} mode - The active analysis mode.
 * @returns {NormalizedOutput} Validated output with mode and 3 normalized items.
 * @throws {Error} If the parsed value is not an object or fails item validation.
 */
function normalizeSingle(parsed: unknown, mode: Exclude<Mode, "bundle">): NormalizedOutput {
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Model returned non-object JSON.");
  }

  const obj = parsed as Record<string, unknown>;
  const rawItems = (obj.items ?? obj.questions) as unknown;

  const items = normalizeItems(rawItems, mode);

  return { mode, items };
}

/**
 * Normalizes model output for bundle mode, which returns all three modes at once.
 *
 * Expects the model to return `{ bundle: { fast: [...], deeper: [...], cliff: [...] } }`.
 * Each sub-array is normalized independently by `normalizeItems`.
 *
 * @param {unknown} parsed - The raw parsed JSON object from the model.
 * @returns {BundledOutput} Validated bundle output containing fast, deeper, and cliff item sets.
 * @throws {Error} If the parsed value is not an object, the bundle key is missing, or any
 *   sub-array fails item validation.
 */
function normalizeBundle(parsed: unknown): BundledOutput {
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Model returned non-object JSON.");
  }

  const obj = parsed as Record<string, unknown>;
  const rawBundle = obj.bundle as unknown;

  if (typeof rawBundle !== "object" || rawBundle === null) {
    throw new Error("Model returned missing/invalid bundle.");
  }

  const b = rawBundle as Record<string, unknown>;

  const fast = normalizeItems(b.fast, "fast");
  const deeper = normalizeItems(b.deeper, "deeper");
  const cliff = normalizeItems(b.cliff, "cliff");

  return { mode: "bundle", bundle: { fast, deeper, cliff } };
}

// -----------------------------
// CORS preflight
// -----------------------------

export { corsOptions as OPTIONS };

// -----------------------------
// Route handler (streaming NDJSON)
// -----------------------------

/**
 * Main POST handler for /api/questions.
 *
 * Streams NDJSON events to the client as work progresses:
 *   - `{ type: "progress", stage: string }` — status updates during fetch/analysis.
 *   - `{ type: "error", error: string, detail?: string }` — user-facing error with optional detail.
 *   - `{ type: "choice", data: NeedsChoice }` — sent when the URL resolves to a multi-article page.
 *   - `{ type: "result", data: NormalizedOutput | BundledOutput }` — final analysis output.
 *
 * The stream controller is always closed in `finally`, regardless of success or error.
 *
 * @param req - The incoming Next.js request. Body must be JSON matching `Body`.
 * @returns 200 response with Content-Type: application/x-ndjson and a ReadableStream body.
 */
export async function POST(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      /**
       * Encodes an event object as a JSON line and enqueues it to the stream.
       *
       * @param event - Any serializable event object.
       */
      function send(event: object) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      try {
        const body = (await req.json()) as Body;
        const mode = parseMode(body.mode);
        const inputMode = body.inputMode === "url" ? "url" : "paste";

        send({ type: "progress", stage: inputMode === "url" ? "Fetching page…" : "Reading text…" });

        const resolved = await resolveInput(body);

        if (resolved.kind === "error") {
          send({ type: "error", error: resolved.message });
          return;
        }

        if (resolved.kind === "needs-choice") {
          const out: NeedsChoice = {
            mode,
            needsChoice: true,
            sourceUrl: resolved.sourceUrl,
            candidates: resolved.candidates
          };
          send({ type: "choice", data: out });
          return;
        }

        send({ type: "progress", stage: "Analyzing…" });

        const moderation = await moderateText(resolved.text);
        if (moderation.flagged) {
          send({ type: "error", error: "This content can't be analyzed." });
          return;
        }

        const prompt = buildPrompt(resolved.text, mode);
        const parsed = await runModel(prompt);

        send({ type: "progress", stage: "Writing output…" });

        const out: ApiOut =
          mode === "bundle"
            ? normalizeBundle(parsed)
            : normalizeSingle(parsed, mode);

        send({ type: "result", data: { ...out, articleText: resolved.text } });
      } catch (err: unknown) {
        console.error("POST /api/questions failed:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        send({ type: "error", error: "Failed to generate output.", detail: message });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson" }
  });
}
