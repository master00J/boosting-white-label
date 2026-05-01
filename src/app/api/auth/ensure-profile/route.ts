import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Creates a profile if the trigger failed (e.g. OAuth edge case).
 * Called by middleware when user has session but no profile.
 * Uses service role only in this dedicated route, not in request-hot middleware.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
  const rawRedirect = req.nextUrl.searchParams.get("redirectTo") ?? "/dashboard";
  const safeRedirect = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") && !rawRedirect.includes("\\")
    ? rawRedirect
    : "/dashboard";

  if (existing) {
    return NextResponse.redirect(new URL(safeRedirect, req.url));
  }

  const emailVal = (user.email ?? "").trim() || `oauth-${user.id}@placeholder.local`;
  const displayName =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? emailVal.split("@")[0];

  await admin.from("profiles").insert({
    id: user.id,
    email: emailVal,
    display_name: displayName,
  } as never);

  return NextResponse.redirect(new URL(safeRedirect, req.url));
}
