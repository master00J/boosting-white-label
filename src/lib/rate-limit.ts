import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting: Redis (Upstash) when env vars are set, else in-memory fallback.
 *
 * Voor productie: stel UPSTASH_REDIS_REST_URL en UPSTASH_REDIS_REST_TOKEN in
 * voor gedeelde, persistent rate limiting over instances.
 */

export type RateLimitOptions = { limit?: number; windowMs?: number; preset?: string };

// ─── In-memory fallback ───
const store = new Map<string, { count: number; resetAt: number }>();
const MAX_ENTRIES = 10_000;

function pruneIfNeeded() {
  if (store.size > MAX_ENTRIES) {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key);
    }
  }
}

function checkRateLimitInMemory(
  identifier: string,
  options: RateLimitOptions
): NextResponse | null {
  const { limit = 60, windowMs = 60_000 } = options;
  pruneIfNeeded();

  const now = Date.now();
  let entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(identifier, entry);
    return null;
  }

  entry.count++;
  if (entry.count > limit) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }
  return null;
}

// ─── Redis (Upstash) ───
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = Boolean(redisUrl && redisToken);

let redisClient: Redis | null = null;
const limiters: Record<string, Ratelimit> = {};

function getRedisClient(): Redis | null {
  if (!useRedis) return null;
  if (!redisClient) {
    redisClient = new Redis({ url: redisUrl!, token: redisToken! });
  }
  return redisClient;
}

function getRedisLimiter(preset: string): Ratelimit | null {
  const redis = getRedisClient();
  if (!redis) return null;
  if (limiters[preset]) return limiters[preset];

  const config = {
    checkout: { limit: 10, window: "60 s" as const },
    sensitive: { limit: 5, window: "60 s" as const },
    general: { limit: 100, window: "60 s" as const },
    admin: { limit: 200, window: "60 s" as const },
  } as const;
  const c = config[preset as keyof typeof config] ?? config.general;
  limiters[preset] = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(c.limit, c.window),
    prefix: "boost-rate",
  });
  return limiters[preset];
}

export const RATE_LIMITS = {
  checkout: { limit: 10, windowMs: 60_000, preset: "checkout" } as const,
  sensitive: { limit: 5, windowMs: 60_000, preset: "sensitive" } as const,
  general: { limit: 100, windowMs: 60_000, preset: "general" } as const,
  admin: { limit: 200, windowMs: 60_000, preset: "admin" } as const,
} as const;

export function getRateLimitIdentifier(req: { headers: { get(name: string): string | null } }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") ?? "unknown";
  return ip;
}

/**
 * Returns null if allowed, or a 429 Response if rate limited.
 * Async (Redis) of sync fallback (in-memory). Gebruik RATE_LIMITS.xxx voor Redis.
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): Promise<NextResponse | null> {
  if (!options.preset) return checkRateLimitInMemory(identifier, options);
  const limiter = getRedisLimiter(options.preset);

  if (limiter) {
    const { success, limit, reset } = await limiter.limit(identifier);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
    return null;
  }

  return checkRateLimitInMemory(identifier, options);
}
