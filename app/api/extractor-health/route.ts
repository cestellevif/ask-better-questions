import { corsOptions } from "@/lib/cors";

// Extractor is now in-process — always healthy.
export { corsOptions as OPTIONS };

export async function GET() {
  return Response.json({ ok: true });
}
