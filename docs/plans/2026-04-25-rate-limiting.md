# Rate Limiting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add IP-based rate limiting (10 req/hour, sliding window) to `/api/questions` using Upstash Redis, preventing OpenAI credit abuse.

**Architecture:** A thin `lib/ratelimit.ts` wrapper initialises the Upstash client lazily and is called at the top of the POST handler before any extraction or OpenAI calls. Returns a plain `429` (not a stream) on breach. Gracefully no-ops if env vars are absent (local dev without Redis).

**Tech Stack:** `@upstash/redis`, `@upstash/ratelimit`, Next.js route handler, Vitest for route integration test.

**Agents to check in with:** `nextjs-developer` for route handler patterns.

---

### Task 1: Install packages

**Files:**
- Modify: `package.json` (via npm install)

**Step 1: Install dependencies**

```bash
cd C:\Users\cestellevif\Desktop\ask-better-questions
npm install @upstash/redis @upstash/ratelimit
```

Expected: packages added to `dependencies` in `package.json`, lock file updated.

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add upstash redis and ratelimit packages"
```

---

### Task 2: Create `lib/ratelimit.ts`

**Files:**
- Create: `lib/ratelimit.ts`

**Step 1: Write the file**

```ts
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
```

**Step 2: Commit**

```bash
git add lib/ratelimit.ts
git commit -m "feat(ratelimit): add upstash rate limit wrapper"
```

---

### Task 3: Integrate rate limit check into the route

**Files:**
- Modify: `app/api/questions/route.ts`
- Modify: `__tests__/api/route.test.ts`

**Step 1: Write the failing test first**

Open `__tests__/api/route.test.ts`. Add this test near the top of the describe block (after existing imports/setup). You'll need to mock `lib/ratelimit`:

At the top of the test file, add a vi.mock call. Look for where other mocks are set up (likely near the top) and add alongside them:

```ts
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ limited: false, retryAfter: 0 }),
}));
```

Then add this test case:

```ts
it("returns 429 when rate limit is exceeded", async () => {
  const { checkRateLimit } = await import("@/lib/ratelimit");
  vi.mocked(checkRateLimit).mockResolvedValueOnce({ limited: true, retryAfter: 3600 });

  const req = new Request("http://localhost/api/questions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify({ mode: "bundle", inputMode: "paste", text: "a".repeat(80) }),
  });

  const res = await POST(req);
  expect(res.status).toBe(429);
  expect(res.headers.get("Retry-After")).toBe("3600");
});
```

**Step 2: Run the test to confirm it fails**

```bash
npm run test -- route
```

Expected: FAIL — `checkRateLimit` is not called yet, so the mock has no effect and you get a 200.

**Step 3: Integrate into the route**

Open `app/api/questions/route.ts`. Add the import at the top (with the other imports):

```ts
import { checkRateLimit } from "@/lib/ratelimit";
```

At the very top of the `POST` function body, before the `ReadableStream` is created, add:

```ts
const ip =
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "anonymous";
const { limited, retryAfter } = await checkRateLimit(ip);
if (limited) {
  return new Response("Too many requests", {
    status: 429,
    headers: { "Retry-After": String(retryAfter) },
  });
}
```

**Step 4: Run tests to confirm they pass**

```bash
npm run test
```

Expected: all tests pass including the new 429 test.

**Step 5: Commit**

```bash
git add app/api/questions/route.ts __tests__/api/route.test.ts
git commit -m "feat: enforce IP rate limit on /api/questions (10 req/hr)"
```

---

### Task 4: Add environment variables

**Step 1: Create an Upstash Redis database**

1. Go to console.upstash.com and sign up / log in
2. Create a new Redis database (region: closest to Vercel deployment — US East 1)
3. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from the database dashboard

**Step 2: Add to local dev**

Open `.env.local` and add:

```
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

**Step 3: Add to Vercel**

In the Vercel project dashboard → Settings → Environment Variables, add both variables for Production (and Preview if desired).

**Step 4: Verify locally**

Start the dev server and submit an article. Confirm it still works normally (no 429 on first request).

```bash
npm run dev
```

**Step 5: No commit needed** — `.env.local` is git-ignored. Vercel vars are set via dashboard.

---

## Done

Rate limiting is live. Each IP can make 10 requests per hour. Requests beyond that get a `429` with a `Retry-After` header. Local dev without env vars skips the check transparently.
