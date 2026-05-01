import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Shared types ────────────────────────────────────────────────────────────

type OrderItem = {
  serviceId: string;
  serviceName: string;
  gameName: string;
  gameId: string;
  quantity: number;
  finalPrice: number;
  configuration: Record<string, unknown>;
};

/** One entry in the item_progress JSONB array — stored flat for JSONB compatibility */
export type ItemProgressEntry = {
  index: number;
  serviceName: string;
  /** "level" = skilling, "kills" = bossing, "quest" = quest list, "percent" = generic */
  type: "level" | "kills" | "quest" | "percent";
  // level / kills
  skillId?: string;
  startLevel?: number;
  goal?: number;
  current?: number;
  bossId?: string;
  // quest
  questIds?: string[];
  completedQuestIds?: string[];
  // shared
  completed: boolean;
};

type OrderRow = {
  id: string;
  status: string;
  configuration: Record<string, unknown>;
  worker_id: string | null;
  worker_payout: number | null;
  items: OrderItem[] | null;
  item_progress: ItemProgressEntry[] | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getQuestIds(config: Record<string, unknown>): string[] {
  const ids: string[] = [];
  if (typeof config.item === "string" && config.item) ids.push(config.item);
  if (Array.isArray(config.quests)) ids.push(...(config.quests as string[]));
  return ids;
}

function normalizeSkillName(skill: string): string {
  return skill.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Build initial item_progress from the order's items (or single configuration) */
function initItemProgress(order: OrderRow): ItemProgressEntry[] {
  const entries: Array<{ index: number; serviceName: string; config: Record<string, unknown> }> = [];

  if (order.items && order.items.length > 0) {
    order.items.forEach((item, i) => {
      entries.push({ index: i, serviceName: item.serviceName, config: item.configuration ?? {} });
    });
  } else {
    entries.push({ index: 0, serviceName: "Service", config: order.configuration });
  }

  return entries.map(({ index, serviceName, config }) => {
    // Boss kills
    if ("boss" in config && "kills" in config) {
      return {
        index, serviceName,
        type: "kills" as const,
        bossId: String(config.boss),
        goal: Number(config.kills),
        current: 0,
        completed: false,
      };
    }
    // Level-based (route_segments or end_level)
    if ("route_segments" in config || "end_level" in config) {
      const segs = config.route_segments as { from_level: number; to_level: number }[] | undefined;
      const goal = segs?.at(-1)?.to_level ?? Number(config.end_level) ?? 99;
      const startLevel = segs?.[0]?.from_level ?? (config.start_level ? Number(config.start_level) : 1);
      const skillId = typeof config.skill === "string" ? config.skill : "skill";
      return {
        index, serviceName,
        type: "level" as const,
        skillId,
        startLevel,
        goal,
        current: startLevel,
        completed: false,
      };
    }
    // Quest
    const questIds = getQuestIds(config);
    if (questIds.length > 0) {
      return {
        index, serviceName,
        type: "quest" as const,
        questIds,
        completedQuestIds: [],
        completed: false,
      };
    }
    // Fallback: generic percent
    return { index, serviceName, type: "percent" as const, current: 0, completed: false };
  });
}

/** Recalculate the overall progress percentage from item_progress */
export function calcOverallProgress(items: ItemProgressEntry[]): number {
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, item) => {
    if (item.completed) return acc + 100;
    if (item.type === "level" && item.goal != null && item.startLevel != null && item.current != null) {
      return acc + Math.min(100, Math.round(((item.current - item.startLevel) / Math.max(1, item.goal - item.startLevel)) * 100));
    }
    if (item.type === "kills" && item.goal != null && item.current != null) {
      return acc + Math.min(100, Math.round((item.current / item.goal) * 100));
    }
    if (item.type === "quest" && item.questIds && item.completedQuestIds) {
      return acc + Math.min(100, Math.round((item.completedQuestIds.length / Math.max(1, item.questIds.length)) * 100));
    }
    if (item.type === "percent" && item.current != null) return acc + item.current;
    return acc;
  }, 0);
  return Math.round(sum / items.length);
}

/** Parse DinkPlugin payload from plain JSON or multipart/form-data */
async function parseDinkPayload(req: Request): Promise<{ payload: Record<string, unknown>; screenshotFile: File | null }> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const payloadJson = formData.get("payload_json");
    const file = formData.get("file");
    const payload = payloadJson ? JSON.parse(String(payloadJson)) : {};
    return { payload, screenshotFile: file instanceof File ? file : null };
  }
  const payload = await req.json().catch(() => ({}));
  return { payload, screenshotFile: null };
}

/** Rate limiting: simple in-memory store (resets on cold start) */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const MAX_MAP_ENTRIES = 5_000;

function pruneRateLimitMap() {
  if (rateLimitMap.size < MAX_MAP_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
  // If still too large after pruning expired entries, drop oldest half
  if (rateLimitMap.size >= MAX_MAP_ENTRIES) {
    const keys = [...rateLimitMap.keys()].slice(0, Math.floor(MAX_MAP_ENTRIES / 2));
    for (const key of keys) rateLimitMap.delete(key);
  }
}

function isRateLimited(token: string): boolean {
  pruneRateLimitMap();
  const now = Date.now();
  const entry = rateLimitMap.get(token);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(token, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

/** Complete an order: update status, credit worker, send system message */
async function completeOrder(admin: ReturnType<typeof createAdminClient>, order: OrderRow) {
  if (order.worker_id) {
    const { data: worker } = await admin
      .from("workers")
      .select("id, total_earned, pending_balance, total_orders_completed, current_active_orders")
      .eq("id", order.worker_id)
      .single() as unknown as { data: { id: string; total_earned: number; pending_balance: number; total_orders_completed: number; current_active_orders: number } | null };

    if (worker) {
      const payout = order.worker_payout ?? 0;
      await admin
        .from("workers")
        .update({
          total_earned: worker.total_earned + payout,
          pending_balance: worker.pending_balance + payout,
          total_orders_completed: worker.total_orders_completed + 1,
          current_active_orders: Math.max(0, worker.current_active_orders - 1),
        } as never)
        .eq("id", worker.id) as unknown as Promise<unknown>;
    }
  }

  await admin
    .from("orders")
    .update({ status: "completed", completed_at: new Date().toISOString(), progress: 100 } as never)
    .eq("id", order.id) as unknown as Promise<unknown>;

  await admin
    .from("order_messages")
    .insert({
      order_id: order.id,
      content: "Your order has been completed automatically via RuneLite tracking. Thank you for your trust!",
      is_system: true,
    } as never) as unknown as Promise<unknown>;
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  if (isRateLimited(token)) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, status, configuration, worker_id, worker_payout, items, item_progress")
    .eq("track_token", token)
    .single() as unknown as { data: OrderRow | null };

  if (!order) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  if (!["claimed", "in_progress", "paused"].includes(order.status)) {
    return NextResponse.json({ error: "Order is not active" }, { status: 400 });
  }

  const { payload, screenshotFile } = await parseDinkPayload(req);
  const type = String(payload.type ?? "");
  const playerName = String(payload.playerName ?? "Booster");
  const extra = (payload.extra ?? {}) as Record<string, unknown>;

  // Ensure item_progress is initialised
  const itemProgress: ItemProgressEntry[] = order.item_progress && order.item_progress.length > 0
    ? order.item_progress
    : initItemProgress(order);

  let systemMessage: string | null = null;
  let progressUpdate: { item_progress?: ItemProgressEntry[]; progress?: number; progress_current?: number } | null = null;
  let shouldAutoComplete = false;

  switch (type) {
    // ── LEVEL ──────────────────────────────────────────────────────────────────
    case "LEVEL": {
      const levelledSkills = extra.levelledSkills as Record<string, number> | undefined;
      const allSkills = extra.allSkills as Record<string, number> | undefined;

      if (levelledSkills) {
        const skillLines = Object.entries(levelledSkills)
          .map(([skill, level]) => `**${skill}** level ${level}`)
          .join(", ");
        systemMessage = `RuneLite: ${playerName} reached ${skillLines}`;
      }

      if (allSkills) {
        let anyChanged = false;
        for (const item of itemProgress) {
          if (item.type !== "level" || !item.skillId) continue;
          const skillTitle = normalizeSkillName(item.skillId);
          const currentLevel =
            allSkills[skillTitle] ?? allSkills[item.skillId] ?? allSkills[item.skillId.toUpperCase()] ?? item.current ?? item.startLevel ?? 1;

          if (currentLevel !== item.current) {
            item.current = currentLevel;
            anyChanged = true;
          }
          if (!item.completed && item.goal != null && currentLevel >= item.goal) {
            item.completed = true;
            anyChanged = true;
          }
        }

        if (anyChanged) {
          const overall = calcOverallProgress(itemProgress);
          // Also expose first level item's current for legacy progress_current
          const firstLevel = itemProgress.find((i) => i.type === "level");
          progressUpdate = {
            item_progress: itemProgress,
            progress: overall,
            ...(firstLevel?.current != null ? { progress_current: firstLevel.current } : {}),
          };
        }
      }
      break;
    }

    // ── XP_MILESTONE ──────────────────────────────────────────────────────────
    case "XP_MILESTONE": {
      const milestones = extra.milestoneAchieved as string[] | undefined;
      const xpData = extra.xpData as Record<string, number> | undefined;
      if (milestones && xpData) {
        const lines = milestones
          .map((skill) => `**${skill}** — ${(xpData[skill] ?? 0).toLocaleString()} XP`)
          .join(", ");
        systemMessage = `RuneLite: ${playerName} hit XP milestone — ${lines}`;
      }
      break;
    }

    // ── KILL_COUNT ─────────────────────────────────────────────────────────────
    case "KILL_COUNT": {
      const boss = String(extra.boss ?? "");
      const count = Number(extra.count ?? 0);
      const isPb = extra.isPersonalBest === true;
      systemMessage = `RuneLite: ${playerName} completed **${boss}** kill #${count}${isPb ? " (Personal Best!)" : ""}`;

      let anyChanged = false;
      for (const item of itemProgress) {
        if (item.type !== "kills" || !item.bossId) continue;
        // Match by normalizing both sides (bossId "zulrah" vs DinkPlugin "Zulrah")
        const bossNorm = boss.toLowerCase().replace(/[^a-z0-9]/g, "");
        const idNorm = item.bossId.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (bossNorm !== idNorm) continue;

        item.current = count;
        anyChanged = true;
        if (!item.completed && item.goal != null && count >= item.goal) {
          item.completed = true;
        }
      }

      if (anyChanged) {
        const overall = calcOverallProgress(itemProgress);
        const firstKills = itemProgress.find((i) => i.type === "kills");
        progressUpdate = {
          item_progress: itemProgress,
          progress: overall,
          ...(firstKills?.current != null ? { progress_current: firstKills.current } : {}),
        };
      }
      break;
    }

    // ── SLAYER ────────────────────────────────────────────────────────────────
    case "SLAYER": {
      const task = String(extra.slayerTask ?? "");
      const killCount = Number(extra.killCount ?? 0);
      const points = String(extra.slayerPoints ?? "");
      systemMessage = `RuneLite: ${playerName} completed slayer task **${task}** (${killCount} kills, ${points} points)`;
      break;
    }

    // ── QUEST ─────────────────────────────────────────────────────────────────
    case "QUEST": {
      const questName = String(extra.questName ?? "");
      const questPoints = Number(extra.questPoints ?? 0);
      systemMessage = `RuneLite: ${playerName} completed quest **${questName}** (${questPoints} QP total)`;

      // Resolve quest name → DB id
      const { data: questRow } = await admin
        .from("game_quests" as never)
        .select("id, name")
        .ilike("name", questName.trim())
        .limit(1)
        .single() as unknown as { data: { id: string; name: string } | null };

      const questKey = questRow?.id ?? questName.toLowerCase().trim();

      let anyChanged = false;
      for (const item of itemProgress) {
        if (item.type !== "quest" || !item.questIds) continue;
        const inList = item.questIds.includes(questKey);
        // Also try name-based fallback
        const nameMatch = item.questIds.some((qid) => qid.toLowerCase().trim() === questName.toLowerCase().trim());
        if (!inList && !nameMatch) continue;

        const completedQuestIds = item.completedQuestIds ?? [];
        const matchKey = inList ? questKey : (item.questIds.find((qid) => qid.toLowerCase().trim() === questName.toLowerCase().trim()) ?? questKey);
        if (!completedQuestIds.includes(matchKey)) {
          completedQuestIds.push(matchKey);
          item.completedQuestIds = completedQuestIds;
          anyChanged = true;
        }
        const total = item.questIds.length;
        const done = completedQuestIds.length;
        if (!item.completed && done >= total) item.completed = true;

        systemMessage += ` — ${done}/${total} quests done`;
      }

      if (anyChanged) {
        const overall = calcOverallProgress(itemProgress);
        progressUpdate = { item_progress: itemProgress, progress: overall };
      }
      break;
    }

    // ── LOOT ──────────────────────────────────────────────────────────────────
    case "LOOT": {
      const source = String(extra.source ?? "");
      const items = extra.items as { name: string; quantity: number }[] | undefined;
      if (items && items.length > 0) {
        const topItems = items.slice(0, 5).map((i) => `${i.name} x${i.quantity}`).join(", ");
        const more = items.length > 5 ? ` (+${items.length - 5} more)` : "";
        systemMessage = `RuneLite: ${playerName} looted from **${source}** — ${topItems}${more}`;
      }
      break;
    }

    // ── DEATH ─────────────────────────────────────────────────────────────────
    case "DEATH": {
      systemMessage = `RuneLite: ${playerName} died`;
      break;
    }

    default:
      return NextResponse.json({ success: true, ignored: true });
  }

  // Check auto-complete: all items done
  if (itemProgress.length > 0 && itemProgress.every((i) => i.completed)) {
    shouldAutoComplete = true;
  }

  // Upload screenshot if present
  const ALLOWED_SCREENSHOT_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);
  const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024; // 10 MB

  if (screenshotFile) {
    if (!ALLOWED_SCREENSHOT_TYPES.has(screenshotFile.type)) {
      // Ignore disallowed file type silently — don't fail the whole webhook
      return NextResponse.json({ success: true });
    }
    if (screenshotFile.size > MAX_SCREENSHOT_BYTES) {
      return NextResponse.json({ success: true }); // Ignore oversized screenshots silently
    }
    try {
      const ext = screenshotFile.type === "image/jpeg" || screenshotFile.type === "image/jpg" ? "jpg" : "png";
      const filename = `${order.id}/${Date.now()}.${ext}`;
      const buffer = new Uint8Array(await screenshotFile.arrayBuffer());
      const { data: uploadData, error: uploadError } = await admin.storage
        .from("screenshots")
        .upload(filename, buffer, { contentType: screenshotFile.type, upsert: false });

      const screenshotNote = (!uploadError && uploadData)
        ? (() => {
            const { data: urlData } = admin.storage.from("screenshots").getPublicUrl(uploadData.path);
            return urlData?.publicUrl
              ? `RuneLite: ${playerName} submitted a screenshot as proof\n![screenshot](${urlData.publicUrl})`
              : `RuneLite: ${playerName} submitted a screenshot as proof`;
          })()
        : `RuneLite: ${playerName} submitted a screenshot as proof`;

      systemMessage = systemMessage ? `${systemMessage}\n${screenshotNote}` : screenshotNote;
    } catch {
      const screenshotNote = `RuneLite: ${playerName} submitted a screenshot as proof`;
      systemMessage = systemMessage ? `${systemMessage}\n${screenshotNote}` : screenshotNote;
    }
  }

  // Persist progress update
  if (progressUpdate && !shouldAutoComplete) {
    await admin
      .from("orders")
      .update(progressUpdate as never)
      .eq("id", order.id) as unknown as Promise<unknown>;
  } else if (!progressUpdate && order.item_progress === null) {
    // At minimum persist the initialised item_progress so realtime subscribers see it
    await admin
      .from("orders")
      .update({ item_progress: itemProgress } as never)
      .eq("id", order.id) as unknown as Promise<unknown>;
  }

  // Insert system message
  if (systemMessage) {
    await admin
      .from("order_messages")
      .insert({ order_id: order.id, content: systemMessage, is_system: true } as never) as unknown as Promise<unknown>;
  }

  if (shouldAutoComplete) {
    await completeOrder(admin, order);
    return NextResponse.json({ success: true, autoCompleted: true });
  }

  return NextResponse.json({ success: true });
}
