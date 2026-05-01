import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ReviewClient from "./review-client";

export const metadata: Metadata = { title: "Write a review" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/orders/${id}/review`);

  const [orderResult, existingReview] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, status, customer_id, worker_id, service:services(name), game:games(name)")
      .eq("id", id)
      .eq("customer_id", user.id)
      .single(),
    supabase
      .from("order_reviews")
      .select("id")
      .eq("order_id", id)
      .maybeSingle(),
  ]);

  const order = orderResult.data as {
    id: string;
    order_number: string;
    status: string;
    customer_id: string | null;
    worker_id: string | null;
    service: { name: string } | null;
    game: { name: string } | null;
  } | null;

  if (!order) notFound();
  if (order.status !== "completed") redirect(`/orders/${id}`);
  if (existingReview.data) redirect(`/orders/${id}`);

  return (
    <ReviewClient
      orderId={id}
      orderNumber={order.order_number}
      workerId={order.worker_id ?? undefined}
      serviceName={order.service?.name ?? "Service"}
      gameName={order.game?.name ?? ""}
    />
  );
}
