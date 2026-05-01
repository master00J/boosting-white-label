import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminSectionKey } from "@/lib/admin-sections";

type AdminClient = ReturnType<typeof createAdminClient>;

export type AdminContext = {
  ok: true;
  admin: AdminClient;
  userId: string;
  role: "admin" | "super_admin";
};

export type AdminResult = AdminContext | { ok: false; response: NextResponse };

/**
 * Verifies that the calling user is an admin or super_admin.
 * Returns { ok: true, admin, userId, role } on success,
 * or { ok: false, response } with the appropriate 401/403 on failure.
 *
 * Usage:
 *   const ctx = await assertAdmin();
 *   if (!ctx.ok) return ctx.response;
 *   const { admin, userId } = ctx;
 */
export async function assertAdmin(): Promise<AdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const admin = createAdminClient();
  const { data: profile } = (await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()) as { data: { role: string } | null };

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    admin,
    userId: user.id,
    role: profile.role as "admin" | "super_admin",
  };
}

export async function assertAdminSection(section: AdminSectionKey): Promise<AdminResult> {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx;
  if (ctx.role === "super_admin") return ctx;
  if (section === "ranks") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const { data: profile } = await ctx.admin
    .from("profiles")
    .select("admin_rank_id")
    .eq("id", ctx.userId)
    .single() as { data: { admin_rank_id: string | null } | null };

  // Existing admin accounts without a rank keep broad admin access except super-admin-only sections.
  if (!profile?.admin_rank_id) return ctx;

  const { data: permission } = await ctx.admin
    .from("admin_rank_permissions")
    .select("section_key")
    .eq("rank_id", profile.admin_rank_id)
    .eq("section_key", section)
    .maybeSingle() as { data: { section_key: string } | null };

  if (!permission) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return ctx;
}

/**
 * Verifies that the calling user is a super_admin.
 * Usage identical to assertAdmin().
 */
export async function assertSuperAdmin(): Promise<AdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const admin = createAdminClient();
  const { data: profile } = (await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()) as { data: { role: string } | null };

  if (!profile || profile.role !== "super_admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    admin,
    userId: user.id,
    role: "super_admin",
  };
}
