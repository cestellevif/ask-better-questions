import { describe, it, expect } from "vitest";
import { GET as healthGET } from "@/app/api/health/route";
import { GET as extractorHealthGET } from "@/app/api/extractor-health/route";

describe("GET /api/health", () => {
  it("returns 200 with ok:true", async () => {
    const res = await healthGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

describe("GET /api/extractor-health", () => {
  it("returns 200 with ok:true", async () => {
    const res = await extractorHealthGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
