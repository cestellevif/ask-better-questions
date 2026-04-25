# Rate Limiting Design

**Date:** 2026-04-25
**Status:** Approved

## Problem

The `/api/questions` endpoint is open with no rate limiting. Each request triggers two OpenAI calls (moderation + model). A bot or curious developer could drain the OpenAI credit balance in one session. The user's OpenAI account has no autocharge, so abuse burns a fixed balance rather than creating runaway billing.

## Approach

Upstash Redis + `@upstash/ratelimit`. Free tier (10,000 commands/day). Purpose-built for Vercel serverless. Sliding window algorithm so bursts are smoothed out rather than hard-reset every hour.

## Design

**Limit:** 10 requests / IP / hour (sliding window)

**IP detection:** `x-forwarded-for` header — Vercel sets this reliably. Fall back to `"anonymous"` if absent.

**New module:** `lib/ratelimit.ts` — thin wrapper that initialises the Upstash client and exports a `checkRateLimit(ip: string)` function returning `{ success: boolean; reset: number }`.

**Integration point:** Top of the POST handler in `app/api/questions/route.ts`, before `resolveInput`. On failure, return a plain `429` response (not a streaming NDJSON response — the stream hasn't opened yet). Include `Retry-After` header (seconds until window resets).

**Client behaviour:** The existing error state handles a 429 gracefully — no UI changes needed.

## New env vars

| Variable | Purpose |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis auth token |

Add to `.env.local` for local dev and to Vercel project settings for production.

## Packages

- `@upstash/redis`
- `@upstash/ratelimit`

## Out of scope

- Per-user (authenticated) limits — no auth exists
- UI for rate limit errors — existing error state is sufficient
- Tests for the ratelimit wrapper — it's a thin pass-through to the Upstash SDK
