import { corsOptions } from "@/lib/cors";

export const runtime = "nodejs";

export { corsOptions as OPTIONS };

export async function GET() {
  return Response.json({ ok: true });
}