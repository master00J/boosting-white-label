import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = [
  "/",
  "/games",
  "/search",
  "/boosters",
  "/reviews",
  "/leaderboard",
  "/faq",
  "/tos",
  "/privacy",
  "/apply",
  "/track",
];

const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify", "/auth/callback", "/callback"];

const WORKER_ROUTES = ["/worker", "/booster"];
const ADMIN_ROUTES = ["/admin"];
const PUBLIC_FILE = /\.(?:avif|css|gif|ico|jpg|jpeg|js|json|map|png|svg|txt|webmanifest|webp|xml)$/i;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Strip OAuth error params from URL (bad_oauth_state etc.) — user may still be logged in from previous attempt
  const errorCode = request.nextUrl.searchParams.get("error_code");
  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError || errorCode === "bad_oauth_state") {
    const cleanUrl = new URL(pathname, request.url);
    cleanUrl.searchParams.delete("error");
    cleanUrl.searchParams.delete("error_code");
    cleanUrl.searchParams.delete("error_description");
    return NextResponse.redirect(cleanUrl);
  }

  // API routes handle their own auth — skip updateSession to avoid blocking on Supabase auth call
  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (PUBLIC_FILE.test(pathname)) return NextResponse.next();

  const { supabaseResponse, user, supabase } = await updateSession(request);

  // Allow public routes without auth
  const isPublic =
    PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/")) ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/external") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/fonts") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml";

  if (isPublic) return supabaseResponse;

  // Auth routes: redirect logged-in users away
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  if (isAuthRoute) {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return supabaseResponse;
  }

  // Protected routes: require auth
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control — RLS-first: gebruik user-scoped client (geen service role in middleware)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_banned")
    .eq("id", user.id)
    .single<{ role: "customer" | "worker" | "admin" | "super_admin"; is_banned: boolean }>();

  if (!profile) {
    // Profile missing (trigger may have failed) — redirect naar dedicated API die profile aanmaakt
    const ensureUrl = new URL("/api/auth/ensure-profile", request.url);
    ensureUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(ensureUrl);
  }

  if (!profile || profile.is_banned) {
    return NextResponse.redirect(new URL("/login?error=banned", request.url));
  }

  const role = profile.role;

  // Admin routes
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
    if (role !== "admin" && role !== "super_admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Worker routes
  if (WORKER_ROUTES.some((r) => pathname.startsWith(r))) {
    if (role !== "worker" && role !== "admin" && role !== "super_admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:avif|css|gif|ico|jpg|jpeg|js|json|map|png|svg|txt|webmanifest|webp|xml)$).*)",
  ],
};
