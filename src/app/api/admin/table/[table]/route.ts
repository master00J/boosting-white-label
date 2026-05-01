import { NextResponse } from "next/server";
import { assertAdminSection } from "@/lib/auth/assert-admin";
import { getRateLimitIdentifier, checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { filterPatchBody } from "@/lib/table-patch-allowlist";
import { insertActivityLog } from "@/lib/supabase/db-helpers";
import type { AdminSectionKey } from "@/lib/admin-sections";
import type { Database } from "@/types/database";

type TableName = keyof Database["public"]["Tables"];

export const dynamic = "force-dynamic";

// Allowlist of tables that can be managed via this generic route
const ALLOWED_TABLES = [
  "service_categories",
  "services",
  "worker_tiers",
  "workers",
  "profiles",
  "site_settings",
  "announcements",
  "static_pages",
  "promo_banners",
  "game_skills",
  "game_service_methods",
  "affiliates",
  "loyalty_tiers",
] as const;

type AllowedTable = (typeof ALLOWED_TABLES)[number];

const TABLE_TO_SECTION: Record<AllowedTable, AdminSectionKey> = {
  service_categories: "catalog",
  services: "catalog",
  worker_tiers: "workers",
  workers: "workers",
  profiles: "customers",
  site_settings: "settings",
  announcements: "content",
  static_pages: "content",
  promo_banners: "marketing",
  game_skills: "catalog",
  game_service_methods: "catalog",
  affiliates: "marketing",
  loyalty_tiers: "marketing",
};

const SUPER_ADMIN_PROFILE_FIELDS = new Set([
  "role",
  "admin_rank_id",
  "is_banned",
  "ban_reason",
  "balance",
  "total_spent",
]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ table: string }> }
) {
  const rl = await checkRateLimit(getRateLimitIdentifier(req), RATE_LIMITS.admin);
  if (rl) return rl;

  const { table } = await params;
  if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ctx = await assertAdminSection(TABLE_TO_SECTION[table as AllowedTable]);
  if (!ctx.ok) return ctx.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ctx.admin as any;
  const { data, error } = await db.from(table as TableName).select("*").order("sort_order", { ascending: true });
  if (error) { console.error(`[table-api] GET ${table} error:`, error.message); return NextResponse.json({ error: "Database query failed" }, { status: 500 }); }
  return NextResponse.json(data);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ table: string }> }
) {
  const rl = await checkRateLimit(getRateLimitIdentifier(req), RATE_LIMITS.admin);
  if (rl) return rl;

  const { table } = await params;
  if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ctx = await assertAdminSection(TABLE_TO_SECTION[table as AllowedTable]);
  if (!ctx.ok) return ctx.response;

  const body = await req.json();
  const filtered = filterPatchBody(table, body as Record<string, unknown>);
  if (Object.keys(filtered).length === 0) {
    return NextResponse.json({ error: "No allowed fields provided" }, { status: 400 });
  }

  if (table === "profiles" && Object.keys(filtered).some((field) => SUPER_ADMIN_PROFILE_FIELDS.has(field)) && ctx.role !== "super_admin") {
    return NextResponse.json(
      { error: "Only super_admin can set sensitive profile fields. Use Settings → Admin Access." },
      { status: 403 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ctx.admin as any;
  const { data, error } = await db.from(table).insert(filtered).select().single();
  if (error) {
    console.error(`[table-api] POST ${table} error:`, error.message);
    return NextResponse.json({ error: "Failed to create record" }, { status: 500 });
  }
  await insertActivityLog(ctx.admin, {
    actor_id: ctx.userId,
    action: "admin_table_create",
    target_type: table,
    target_id: typeof data?.id === "string" ? data.id : null,
    metadata: { fields: Object.keys(filtered) },
  });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ table: string }> }
) {
  const rl = await checkRateLimit(getRateLimitIdentifier(req), RATE_LIMITS.admin);
  if (rl) return rl;

  const { table } = await params;
  if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ctx = await assertAdminSection(TABLE_TO_SECTION[table as AllowedTable]);
  if (!ctx.ok) return ctx.response;

  const raw = await req.json();
  const { id, ...body } = raw;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const filtered = filterPatchBody(table, body as Record<string, unknown>);
  if (Object.keys(filtered).length === 0) {
    return NextResponse.json(
      { error: "No allowed fields to update or table not configured" },
      { status: 400 }
    );
  }

  if (table === "profiles" && Object.keys(filtered).some((field) => SUPER_ADMIN_PROFILE_FIELDS.has(field))) {
    if (ctx.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super_admin can change sensitive profile fields. Use Settings → Admin Access." },
        { status: 403 }
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ctx.admin as any;
  const { data, error } = await db.from(table).update(filtered).eq("id", id).select().single();
  if (error) {
    console.error(`[table-api] PATCH ${table} error:`, error.message, "id:", id);
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
  await insertActivityLog(ctx.admin, {
    actor_id: ctx.userId,
    action: "admin_table_update",
    target_type: table,
    target_id: String(id),
    metadata: { fields: Object.keys(filtered) },
  });
  return NextResponse.json(data);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ table: string }> }
) {
  const rl = await checkRateLimit(getRateLimitIdentifier(req), RATE_LIMITS.admin);
  if (rl) return rl;

  const { table } = await params;
  if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ctx = await assertAdminSection(TABLE_TO_SECTION[table as AllowedTable]);
  if (!ctx.ok) return ctx.response;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ctx.admin as any;
  const { error } = await db.from(table).delete().eq("id", id);
  if (error) {
    console.error(`[table-api] DELETE ${table} error:`, error.message, "id:", id);
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
  await insertActivityLog(ctx.admin, {
    actor_id: ctx.userId,
    action: "admin_table_delete",
    target_type: table,
    target_id: String(id),
    metadata: {},
  });
  return NextResponse.json({ success: true });
}
