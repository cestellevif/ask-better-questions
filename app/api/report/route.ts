import { corsOptions } from "@/lib/cors";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const VALID_REASONS = new Set(["inappropriate", "inaccurate", "harmful", "other"]);

export { corsOptions as OPTIONS };

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "anonymous";
  const { limited, retryAfter } = await checkRateLimit(ip);
  if (limited) {
    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { reason } = body as Record<string, unknown>;

  if (typeof reason !== "string" || !VALID_REASONS.has(reason)) {
    return Response.json(
      { error: "Invalid reason. Must be one of: inappropriate, inaccurate, harmful, other." },
      { status: 400 }
    );
  }

  console.log("[report]", reason, new Date().toISOString());

  return Response.json({ ok: true });
}
