import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Legacy callback route — forwards to the canonical /auth/callback.
 * Preserves all query parameters (code, next, etc.) so the main handler
 * can exchange the auth code and redirect the user.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const target = new URL("/auth/callback", origin);
  searchParams.forEach((value, key) => target.searchParams.set(key, value));
  return NextResponse.redirect(target.toString());
}
