import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Ensure profile exists (fallback when trigger fails e.g. null email from OAuth). */
async function ensureProfileExists(
  userId: string,
  email: string | undefined,
  displayName: string | null,
  discordId: string | null,
  discordUsername: string | null
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: existing } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (existing) return;
    const emailVal = email?.trim() || `oauth-${userId}@placeholder.local`;
    await admin.from("profiles").insert({
      id: userId,
      email: emailVal,
      display_name: displayName ?? emailVal.split("@")[0],
      discord_id: discordId,
      discord_username: discordUsername,
      discord_linked_at: discordId ? new Date().toISOString() : null,
    } as never);
  } catch {
    // Non-fatal
  }
}

/** After Discord OAuth, sync discord_id and discord_username to profiles so the bot can create tickets. */
async function syncDiscordToProfile(userId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.admin.getUserById(userId);
    if (!user) return;

    type Identity = { provider: string; id?: string; provider_id?: string; identity_data?: Record<string, unknown> };
    const identities: Identity[] = (user as { identities?: Identity[] }).identities ?? [];
    const discord = identities.find((i) => i.provider === "discord");
    if (!discord) return;

    // Discord ID: provider_id (GoTrue) or identity_data.sub / identity_data.id
    const data = discord.identity_data ?? {};
    const discordId =
      (discord.provider_id && String(discord.provider_id)) ||
      (typeof data.id === "string" && data.id) ||
      (typeof data.sub === "string" && data.sub) ||
      "";
    if (!discordId) return;

    const discordUsername =
      (typeof data.username === "string" && data.username) ||
      (typeof data.full_name === "string" && data.full_name) ||
      (typeof data.name === "string" && data.name) ||
      null;
    const usernameTrimmed = discordUsername ? discordUsername.slice(0, 255) : null;

    await admin
      .from("profiles")
      .update({
        discord_id: discordId,
        discord_username: usernameTrimmed,
        discord_linked_at: new Date().toISOString(),
      } as never)
      .eq("id", userId);
  } catch {
    // Non-fatal: user can still use the site; ticket creation may be skipped
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextRaw = requestUrl.searchParams.get("next") ?? "/dashboard";
  const next = (nextRaw.startsWith("/") && !nextRaw.startsWith("//") && !nextRaw.startsWith("/\\")) ? nextRaw : "/dashboard";
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      const u = data.user;
      const meta = (u as { user_metadata?: Record<string, unknown> }).user_metadata ?? {};
      const discordIdFromMeta = typeof meta.provider_id === "string" ? meta.provider_id : typeof meta.sub === "string" ? meta.sub : null;
      const discordUsernameFromMeta =
        (typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : null)?.slice(0, 255) ?? null;
      const displayName = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : null;

      // Ensure profile exists (trigger may fail if email is null from OAuth)
      await ensureProfileExists(
        u.id,
        u.email ?? undefined,
        displayName,
        discordIdFromMeta,
        discordUsernameFromMeta
      );

      await syncDiscordToProfile(u.id);
      const admin = createAdminClient();
      const { data: profile } = await admin.from("profiles").select("discord_id").eq("id", u.id).single();
      if (!profile?.discord_id && discordIdFromMeta) {
        await admin
          .from("profiles")
          .update({
            discord_id: discordIdFromMeta,
            discord_username: discordUsernameFromMeta,
            discord_linked_at: new Date().toISOString(),
          } as never)
          .eq("id", u.id);
      }

      // Explicitly copy cookies to redirect response (fixes Safari/mobile redirect loop)
      const redirectUrl = `${origin}${next}`;
      const response = NextResponse.redirect(redirectUrl);
      const cookieStore = await cookies();
      cookieStore.getAll().forEach(({ name, value }) => {
        response.cookies.set(name, value, { path: "/" });
      });
      return response;
    }
    console.error("Auth callback error:", error?.message);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
