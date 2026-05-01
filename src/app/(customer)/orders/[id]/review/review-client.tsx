"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ReviewClient({
  orderId,
  orderNumber,
  workerId,
  serviceName,
  gameName,
}: {
  orderId: string;
  orderNumber: string;
  workerId?: string;
  serviceName: string;
  gameName: string;
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const submit = async () => {
    if (rating === 0) { setError("Please select a rating."); return; }
    setSubmitting(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Not logged in."); return; }

      const { error: err } = await supabase.from("order_reviews").insert({
        order_id: orderId,
        reviewer_id: user.id,
        worker_id: workerId ?? null,
        rating,
        comment: comment.trim() || null,
        is_public: true,
      } as never);

      if (err) { setError("Something went wrong. Please try again."); return; }
      router.push(`/orders/${orderId}?reviewed=1`);
    } finally {
      setSubmitting(false);
    }
  };

  const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/orders/${orderId}`}
          className="p-2 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Order #{orderNumber}</p>
          <h1 className="font-heading text-xl font-semibold">Write a review</h1>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-6">
        <div className="text-center">
          <p className="text-sm text-[var(--text-muted)] mb-1">{gameName}</p>
          <p className="font-heading font-semibold">{serviceName}</p>
        </div>

        {/* Star rating */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-9 w-9 transition-colors ${
                    star <= (hovered || rating)
                      ? "fill-orange-400 text-orange-400"
                      : "text-[var(--border-default)]"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-sm font-medium text-orange-400 h-5">
            {LABELS[hovered || rating]}
          </p>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Comment <span className="text-[var(--text-muted)] font-normal">(optional)</span>
          </label>
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this service..."
            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={submitting || rating === 0}
          className="w-full py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Submit review
        </button>
      </div>
    </div>
  );
}
