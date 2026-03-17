export async function GET() {
  const base = (process.env.EXTRACTOR_URL ?? "https://ask-better-questions-vrjh.onrender.com/extract")
    .replace(/\/extract$/, "");
  try {
    const r = await fetch(`${base}/health`, { signal: AbortSignal.timeout(35_000) });
    return Response.json({ ok: r.ok });
  } catch {
    return Response.json({ ok: false });
  }
}
