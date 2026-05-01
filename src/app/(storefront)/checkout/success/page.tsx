import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import SuccessClient from "./success-client";

export default async function CheckoutSuccessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse" />
        <div className="h-6 bg-[var(--bg-card)] rounded-lg w-48 mx-auto mb-2 animate-pulse" />
        <div className="h-4 bg-[var(--bg-card)] rounded-lg w-64 mx-auto animate-pulse" />
      </div>
    }>
      <SuccessClient userId={user?.id ?? null} />
    </Suspense>
  );
}
