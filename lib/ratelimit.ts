import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lazy singleton — only initialised when env vars are present.
// Skips rate limiting silently in local dev without Redis credentials.
let _ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }
  if (!_ratelimit) {
    _ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      analytics: false,
    });
  }
  return _ratelimit;
}

/**
 * Checks the rate limit for a given IP.
 * Returns { limited: false } if Redis env vars are not configured.
 */
export async function checkRateLimit(
  ip: string
): Promise<{ limited: boolean; retryAfter: number }> {
  const rl = getRatelimit();
  if (!rl) return { limited: false, retryAfter: 0 };
  const { success, reset } = await rl.limit(ip);
  return {
    limited: !success,
    retryAfter: Math.ceil((reset - Date.now()) / 1000),
  };
}
