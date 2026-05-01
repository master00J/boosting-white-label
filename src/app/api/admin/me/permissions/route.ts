import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { ADMIN_SECTION_KEYS } from "@/lib/admin-sections";

export const dynamic = "force-dynamic";

/**
 * GET: Returns the current admin user's allowed dashboard sections.
 * Super-admins get all sections including "ranks". Admins without a rank get all (except "ranks").
 * Admins with a rank get only their rank's sections.
 */
export async function GET() {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const { admin, userId, role } = ctx;
  const isSuperAdmin = role === "super_admin";

  if (isSuperAdmin) {
    return NextResponse.json({
      allowedSections: [...ADMIN_SECTION_KEYS],
      isSuperAdmin: true,
    });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("admin_rank_id")
    .eq("id", userId)
    .single() as { data: { admin_rank_id: string | null } | null };

  if (!profile?.admin_rank_id) {
    // Admin without rank: all sections except "ranks"
    return NextResponse.json({
      allowedSections: ADMIN_SECTION_KEYS.filter((k) => k !== "ranks"),
      isSuperAdmin: false,
    });
  }

  const { data: perms } = await admin
    .from("admin_rank_permissions")
    .select("section_key")
    .eq("rank_id", profile.admin_rank_id) as { data: { section_key: string }[] | null };

  const allowedSections = (perms ?? []).map((p) => p.section_key);
  return NextResponse.json({
    allowedSections,
    isSuperAdmin: false,
  });
}
