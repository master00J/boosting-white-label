import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import CustomersClient from "./customers-client";

export const metadata: Metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { data: currentProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single<{ role: "customer" | "worker" | "admin" | "super_admin" | null }>();

  const { data: customers } = await admin
    .from("profiles")
    .select("*")
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  return (
    <CustomersClient
      initialCustomers={customers ?? []}
      isSuperAdmin={currentProfile?.role === "super_admin"}
    />
  );
}
