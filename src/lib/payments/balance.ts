import { createAdminClient } from "@/lib/supabase/admin";

export async function getBalance(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await (supabase
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .single() as unknown as Promise<{ data: { balance: number } | null; error: unknown }>);

  if (error || !data) throw new Error("Could not fetch balance");
  return data.balance;
}

export async function validateBalancePayment(
  userId: string,
  amount: number
): Promise<{ valid: boolean; balance: number; shortfall: number }> {
  const balance = await getBalance(userId);
  const valid = balance >= amount;
  return {
    valid,
    balance,
    shortfall: valid ? 0 : amount - balance,
  };
}

export async function deductBalance(
  userId: string,
  amount: number,
  orderId: string
): Promise<void> {
  const supabase = createAdminClient();

  const { data: profile, error: fetchError } = await (supabase
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .single() as unknown as Promise<{ data: { balance: number } | null; error: unknown }>);

  if (fetchError || !profile) throw new Error("Could not fetch profile for balance deduction");
  if (profile.balance < amount) throw new Error("Insufficient balance");

  const { error } = await (supabase
    .from("profiles")
    .update({ balance: profile.balance - amount } as never)
    .eq("id", userId) as unknown as Promise<{ error: unknown }>);

  if (error) throw new Error(`Balance deduction failed`);

  await (supabase.from("activity_log").insert({
    actor_id: userId,
    action: "balance_deducted",
    target_type: "order",
    target_id: orderId,
    metadata: { amount, new_balance: profile.balance - amount },
  } as never) as unknown as Promise<unknown>);
}

export async function creditBalance(
  userId: string,
  amount: number,
  reason: string,
  orderId?: string
): Promise<void> {
  const supabase = createAdminClient();

  const { data: profile, error: fetchError } = await (supabase
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .single() as unknown as Promise<{ data: { balance: number } | null; error: unknown }>);

  if (fetchError || !profile) throw new Error("Could not fetch profile for balance credit");

  const { error } = await (supabase
    .from("profiles")
    .update({ balance: profile.balance + amount } as never)
    .eq("id", userId) as unknown as Promise<{ error: unknown }>);

  if (error) throw new Error(`Balance credit failed`);

  await (supabase.from("activity_log").insert({
    actor_id: userId,
    action: "balance_credited",
    target_type: orderId ? "order" : "profile",
    target_id: orderId ?? userId,
    metadata: { amount, reason, new_balance: profile.balance + amount },
  } as never) as unknown as Promise<unknown>);
}
