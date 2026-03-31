export const runtime = "nodejs";

type ReportBody = {
  reason?: unknown;
  categories?: unknown;
  score?: unknown;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReportBody;
    const reason = typeof body.reason === "string" ? body.reason : "unknown";
    const categories = body.categories ?? null;
    const score = typeof body.score === "number" ? body.score : null;

    console.log("[report]", JSON.stringify({ reason, categories, score, ts: new Date().toISOString() }));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 400 });
  }
}
