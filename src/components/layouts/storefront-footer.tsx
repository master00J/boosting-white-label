import Link from "next/link";
import Image from "next/image";
import Logo from "@/components/shared/logo";
import { CreditCard, Clock, Star, MessageCircle } from "lucide-react";

const FOOTER_LINKS = {
  Platform: [
    { href: "/games", label: "Browse Services" },
    { href: "/boosters", label: "Our Boosters" },
    { href: "/apply", label: "Become a Booster" },
  ],
  Company: [
    { href: "/about", label: "About Us" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/contact", label: "Contact" },
  ],
  Support: [
    { href: "/faq", label: "FAQ" },
    { href: "/support", label: "Support Tickets" },
    { href: "/orders", label: "Order Tracking" },
    { href: "/tos", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
  ],
};

const TRUST_ITEMS_STATIC = [
  { icon: CreditCard, label: "Payments via Whop & Stripe" },
  { icon: Clock, label: "Avg. start within 1 hour" },
  { icon: MessageCircle, label: "Support replies within 2 hours" },
];

type StorefrontStats = {
  completed_orders: number;
  review_count: number;
  avg_rating: number;
};

function TrustRow({ stats }: { stats: StorefrontStats }) {
  const ratingLabel =
    stats.review_count > 0
      ? `${stats.avg_rating.toFixed(1)} / 5 from ${stats.review_count.toLocaleString()} ${stats.review_count === 1 ? "review" : "reviews"}`
      : "Verified buyer reviews";
  const items = [
    ...TRUST_ITEMS_STATIC.slice(0, 2),
    { icon: Star, label: ratingLabel },
    ...TRUST_ITEMS_STATIC.slice(2),
  ];
  return (
    <div className="border-b border-[var(--border-subtle)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <Icon className="h-4 w-4 text-[#E8720C]/70 flex-shrink-0" />
              <span className="text-sm text-[var(--text-muted)]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StorefrontFooter({ stats = { completed_orders: 0, review_count: 0, avg_rating: 0 } }: { stats?: StorefrontStats }) {
  return (
    <footer className="bg-[#0F0A05] border-t border-[#E8720C]/15 mt-auto">
      {/* Trust row */}
      <TrustRow stats={stats} />

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <Logo size="md" href="/" />
            <p className="mt-3 text-sm text-[var(--text-muted)] leading-relaxed">
              Professional game boosting by verified players. Fast, safe, and backed by a full refund guarantee.
            </p>
            <p className="mt-4 text-xs text-[var(--text-muted)]">
              Configure your support email, Discord invite and review links from the admin panel.
            </p>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-xs font-semibold text-[#E8720C]/80 uppercase tracking-widest mb-4">{title}</h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--text-muted)] hover:text-[#FF9438] transition-colors"
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

      {/* Bottom bar */}
      <div className="border-t border-[#E8720C]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} BoostPlatform. All rights reserved.
          </p>
          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end">
            <Link href="/tos" className="text-xs text-[var(--text-muted)] hover:text-[#FF9438] transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-xs text-[var(--text-muted)] hover:text-[#FF9438] transition-colors">
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
