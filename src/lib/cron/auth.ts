import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Validates the cron secret from the Authorization header.
 * Vercel sends: Authorization: Bearer <CRON_SECRET>
 * Uses timing-safe comparison to prevent side-channel leaks.
 */
export function validateCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authHeader);

  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
