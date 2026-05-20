import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLimit = vi.fn();

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() { return {}; }
    constructor() {}
    limit(ip: string) { return mockLimit(ip); }
  },
}));

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: () => ({}),
  },
}));

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    mockLimit.mockReset();
  });

  it("returns limited:false when env vars are absent", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const { checkRateLimit } = await import("@/lib/ratelimit");
    const result = await checkRateLimit("1.2.3.4");
    expect(result.limited).toBe(false);
    expect(result.retryAfter).toBe(0);
  });

  it("returns limited:false when Redis throws (fail-open)", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "fake-token");
    mockLimit.mockRejectedValue(new Error("Redis timeout"));
    const { checkRateLimit } = await import("@/lib/ratelimit");
    const result = await checkRateLimit("1.2.3.4");
    expect(result.limited).toBe(false);
  });

  it("returns limited:true when rate limit is exceeded", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "fake-token");
    mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 3_600_000 });
    const { checkRateLimit } = await import("@/lib/ratelimit");
    const result = await checkRateLimit("1.2.3.4");
    expect(result.limited).toBe(true);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("returns limited:false when rate limit is not exceeded", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "fake-token");
    mockLimit.mockResolvedValue({ success: true, reset: 0 });
    const { checkRateLimit } = await import("@/lib/ratelimit");
    const result = await checkRateLimit("1.2.3.4");
    expect(result.limited).toBe(false);
    expect(result.retryAfter).toBe(0);
  });
});
