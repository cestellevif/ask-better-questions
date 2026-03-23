// Extractor is now in-process — always healthy.
export async function GET() {
  return Response.json({ ok: true });
}
