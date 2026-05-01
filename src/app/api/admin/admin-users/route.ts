import { NextResponse } from "next/server";
import { assertAdmin, assertSuperAdmin } from "@/lib/auth/assert-admin";

export const dynamic = "force-dynamic";

type UserRole = "customer" | "worker" | "admin" | "super_admin";

/** GET: Lijst van alle admin-gebruikers (admin of super_admin) */
export async function GET() {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const { data: admins, error } = await admin
    .from("profiles")
    .select("id, email, display_name, avatar_url, role, admin_rank_id, created_at")
    .in("role", ["admin", "super_admin"])
    .order("role", { ascending: false }) // super_admin eerst
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin-users] GET error:", error.message);
    return NextResponse.json({ error: "Database query failed" }, { status: 500 });
  }
  return NextResponse.json(admins ?? []);
}

/** PATCH: Change role (super_admin only, e.g. add or remove admin) */
export async function PATCH(req: Request) {
  const ctx = await assertSuperAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin, userId: actorId } = ctx;

  const body = await req.json();
  const { userId, newRole, admin_rank_id } = body as { userId: string; newRole: UserRole; admin_rank_id?: string | null };

  if (!userId || !newRole) {
    return NextResponse.json({ error: "userId and newRole are required" }, { status: 400 });
  }

  const validRoles: UserRole[] = ["customer", "worker", "admin", "super_admin"];
  if (!validRoles.includes(newRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { data: targetProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single<{ role: UserRole | null }>();

  if (!targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isCurrentlyAdmin = ["admin", "super_admin"].includes(targetProfile.role ?? "");

  if (isCurrentlyAdmin && !["admin", "super_admin"].includes(newRole)) {
    if (targetProfile.role === "super_admin") {
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "super_admin");
      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "You cannot remove the last super_admin." },
          { status: 400 }
        );
      }
    }
  }

  if (userId === actorId && !["admin", "super_admin"].includes(newRole)) {
    return NextResponse.json({ error: "You cannot remove admin access from yourself." }, { status: 400 });
  }

  const updatePayload: { role: UserRole; admin_rank_id?: string | null } = { role: newRole };
  if (newRole === "admin" && admin_rank_id !== undefined) updatePayload.admin_rank_id = admin_rank_id || null;
  if (newRole !== "admin") updatePayload.admin_rank_id = null;

  const { data, error: updateError } = await admin
    .from("profiles")
    .update(updatePayload)
    .eq("id", userId)
    .select()
    .single();

  if (updateError) {
    console.error("[admin-users] PATCH error:", updateError.message);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
  return NextResponse.json(data);
}

/** POST: Admin toevoegen op basis van e-mail (alleen super_admin) */
export async function POST(req: Request) {
  const ctx = await assertSuperAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const body = await req.json();
  const { email, role = "admin", admin_rank_id } = body as { email?: string; role?: UserRole; admin_rank_id?: string | null };

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email address is required" }, { status: 400 });
  }

  const targetRole: UserRole = role === "super_admin" ? "super_admin" : "admin";

  const { data: profile, error: findError } = await admin
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (findError || !profile) {
    return NextResponse.json({ error: "User not found. Check the email address." }, { status: 404 });
  }

  if (["admin", "super_admin"].includes(profile.role ?? "")) {
    return NextResponse.json({ error: "This user already has admin access." }, { status: 400 });
  }

  const updatePayload: { role: UserRole; admin_rank_id?: string | null } = { role: targetRole };
  if (targetRole === "admin" && admin_rank_id !== undefined) updatePayload.admin_rank_id = admin_rank_id || null;

  const { data, error: postError } = await admin
    .from("profiles")
    .update(updatePayload)
    .eq("id", profile.id)
    .select()
    .single();

  if (postError) {
    console.error("[admin-users] POST error:", postError.message);
    return NextResponse.json({ error: "Failed to grant admin access" }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
