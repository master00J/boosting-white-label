import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const { data, error } = await admin.from("games").select("*").order("sort_order");
  if (error) return NextResponse.json({ error: "Database query failed" }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const body = await request.json();
  const { data, error } = await admin.from("games").insert(body as never).select().single();
  if (error) return NextResponse.json({ error: "Failed to create game" }, { status: 500 });
  return NextResponse.json(data);
}
