"use client";

import Link from "next/link";
import Image from "next/image";
import Logo from "@/components/shared/logo";
import { CreditCard, Clock, Star, MessageCircle } from "lucide-react";
import { useTheme, useStorefrontFooterColumns } from "@/components/providers/theme-provider";
import { useStorefrontBuilderPickMode } from "@/hooks/use-storefront-builder-pick-mode";
import { storefrontPickProps } from "@/lib/storefront-pick-props";

type StorefrontStats = {
  completed_orders: number;
  review_count: number;
  avg_rating: number;
};

function TrustRow({ stats }: { stats: StorefrontStats }) {
  const theme = useTheme();
  const pickOn = useStorefrontBuilderPickMode();
  const ratingLabel =
    stats.review_count > 0
      ? `${stats.avg_rating.toFixed(1)} / 5 from ${stats.review_count.toLocaleString()} ${stats.review_count === 1 ? "review" : "reviews"}`
      : "Verified buyer reviews";
  const items = [
    { icon: CreditCard, label: theme.trust_line_payments, pick: "trust_line_payments" as const },
    { icon: Clock, label: theme.trust_line_start, pick: "trust_line_start" as const },
    { icon: Star, label: ratingLabel, pick: null },
    { icon: MessageCircle, label: theme.trust_line_support, pick: "trust_line_support" as const },
  ];
  return (
    <div className="border-b border-[var(--border-subtle)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map(({ icon: Icon, label, pick }) => (
            <div
              key={`${pick ?? "rating"}-${label.slice(0, 24)}`}
              className="flex items-center gap-2.5"
              {...storefrontPickProps(pick ?? "", !!pick && pickOn)}
            >
              <Icon className="h-4 w-4 text-[var(--color-primary)]/70 flex-shrink-0" />
              <span className="text-sm text-[var(--text-muted)]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StorefrontFooter({ stats = { completed_orders: 0, review_count: 0, avg_rating: 0 } }: { stats?: StorefrontStats }) {
  const theme = useTheme();
  const footerColumns = useStorefrontFooterColumns();
  const pickOn = useStorefrontBuilderPickMode();

  return (
    <footer className="border-t border-[var(--border-default)] mt-auto" style={{ backgroundColor: "var(--footer-bg)" }}>
      <TrustRow stats={stats} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <Logo size="md" href="/" />
            <p
              className="mt-3 text-sm text-[var(--text-muted)] leading-relaxed"
              {...storefrontPickProps("footer_brand_blurb", pickOn)}
            >
              {theme.footer_brand_blurb}
            </p>
            <p className="mt-4 text-xs text-[var(--text-muted)]" {...storefrontPickProps("footer_brand_note", pickOn)}>
              {theme.footer_brand_note}
            </p>
          </div>

          {footerColumns.map((col, ci) => (
            <div key={`${col.title}-${ci}`}>
              <h3
                className="text-xs font-semibold text-[var(--color-primary)]/80 uppercase tracking-widest mb-4"
                {...storefrontPickProps(`footer_col:${ci}`, pickOn)}
              >
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--color-accent)] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--border-default)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]" {...storefrontPickProps("copyright_name", pickOn)}>
            © {new Date().getFullYear()} {theme.copyright_name}. All rights reserved.
          </p>
          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end">
            <Link href="/tos" className="text-xs text-[var(--text-muted)] hover:text-[var(--color-accent)] transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-xs text-[var(--text-muted)] hover:text-[var(--color-accent)] transition-colors">
              Privacy
            </Link>
            <div className="flex items-center gap-2">
              <Image src="/images/payment/visa.svg" alt="Visa" width={32} height={16} className="h-4 w-auto opacity-30" />
              <Image src="/images/payment/mastercard.svg" alt="Mastercard" width={32} height={16} className="h-4 w-auto opacity-30" />
              <Image src="/images/payment/paypal.svg" alt="PayPal" width={32} height={16} className="h-4 w-auto opacity-30" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
