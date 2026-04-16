export const runtime = "nodejs";

const VALID_REASONS = new Set(["inappropriate", "inaccurate", "harmful", "other"]);

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: Request) {
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
