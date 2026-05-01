import type { Client } from "discord.js";
import { supabase } from "./supabase.js";
import { sendToChannel } from "./notifications.js";
import { buildReviewEmbed } from "../lib/embeds.js";
import { logger } from "../lib/logger.js";

type ReviewRecord = {
  id: string;
  order_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  is_public: boolean;
  created_at: string;
};

let reviewRealtimeFailures = 0;
const REVIEW_REALTIME_MAX_FAILURES = 5;

export function startReviewSync(client: Client): void {
  logger.info("Review sync started — listening for new reviews...");
  subscribeReviews(client);
}

function subscribeReviews(client: Client, attempt = 0): void {
  const channelName = `review-changes-${Date.now()}`;
  supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "order_reviews" },
      async (payload) => {
        const review = payload.new as ReviewRecord;

        if (!review.is_public) return;

        logger.info(`New review for order ${review.order_id} — rating: ${review.rating}/5`);

        try {
          const { data: order } = await supabase
            .from("orders")
            .select("order_number, service:services(name), game:games(name)")
            .eq("id", review.order_id)
            .single() as {
              data: {
                order_number: string;
                service: { name: string } | null;
                game: { name: string } | null;
              } | null;
            };

          const { data: reviewer } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", review.reviewer_id)
            .single() as { data: { display_name: string | null } | null };

          const embed = buildReviewEmbed({
            order_number: order?.order_number ?? "—",
            rating: review.rating,
            comment: review.comment,
            reviewer_name: reviewer?.display_name ?? null,
            service_name: order?.service?.name ?? null,
            game_name: order?.game?.name ?? null,
            created_at: review.created_at,
          });

          await sendToChannel(client, "reviews", embed);
        } catch (err) {
          logger.error("Error posting review to Discord", err);
        }
      }
    )
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        reviewRealtimeFailures = 0;
        logger.info("Review sync realtime connected ✅");
      } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR" || status === "CLOSED") {
        reviewRealtimeFailures++;
        if (reviewRealtimeFailures >= REVIEW_REALTIME_MAX_FAILURES) {
          logger.warn(`Review sync realtime failed ${reviewRealtimeFailures}x — giving up, no realtime reviews`);
          return;
        }
        const delay = Math.min(10_000 * Math.pow(2, attempt), 300_000);
        logger.warn(`Review sync ${status} (attempt ${attempt + 1}) — retrying in ${delay / 1000}s...`);
        setTimeout(() => subscribeReviews(client, attempt + 1), delay);
      } else if (err) {
        logger.debug(`Review sync realtime status: ${status} | ${JSON.stringify(err)}`);
      }
    });
}
