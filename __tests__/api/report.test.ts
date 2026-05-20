import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ limited: false, retryAfter: 0 }),
}));

import { POST } from "@/app/api/report/route";
import { checkRateLimit } from "@/lib/ratelimit";

describe("POST /api/report", () => {
  function makeReq(body: unknown) {
    return new Request("http://localhost/api/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns ok:true for a valid reason", async () => {
    const res = await POST(makeReq({ reason: "inaccurate" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("accepts all valid reason values", async () => {
    for (const reason of ["inappropriate", "inaccurate", "harmful", "other"]) {
      const res = await POST(makeReq({ reason }));
      expect(res.status).toBe(200);
    }
  });

  it("returns 400 for missing reason", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid reason string", async () => {
    const res = await POST(makeReq({ reason: "spam" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ limited: true, retryAfter: 60 });
    const res = await POST(makeReq({ reason: "inappropriate" }));
    expect(res.status).toBe(429);
  });
});
