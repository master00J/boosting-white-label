import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MessageCircle, Mail } from "lucide-react";
import { JsonLdFAQPage } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "FAQ & Contact",
  description:
    "Frequently asked questions and contact information for BoostPlatform game boosting services.",
  openGraph: {
    title: "FAQ & Contact | BoostPlatform",
    description:
      "Frequently asked questions and contact information for BoostPlatform game boosting services.",
    url: "/faq",
    type: "website",
  },
  alternates: { canonical: "/faq" },
};

export const dynamic = "force-dynamic";

function parseFaqContent(md: string): Array<{ question: string; answer: string }> {
  const items: Array<{ question: string; answer: string }> = [];
  const blocks = md.split(/\n## /);
  for (const block of blocks) {
    const firstLine = block.indexOf("\n");
    if (firstLine === -1) continue;
    const question = block.slice(0, firstLine).replace(/^#+\s*/, "").trim();
    const answer = block.slice(firstLine + 1).trim().replace(/\n+/g, " ");
    if (question && answer) items.push({ question, answer });
  }
  return items;
}

export default async function FaqPage() {
  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await admin
    .from("static_pages")
    .select("title, content")
    .eq("slug", "faq")
    .eq("is_published", true)
    .maybeSingle();

  const title = data?.title ?? "FAQ & Contact";
  const content =
    data?.content ||
    `# Frequently Asked Questions

## Is game boosting safe?
Yes. Our boosters use VPN connections matching your region and follow game guidelines. We have a strong track record.

## How long until my order starts?
Orders typically start within 1 hour. During off-peak hours it can take up to 3 hours.

## Can I track my order?
Yes. Log in to your dashboard to follow progress in real-time and message your booster.

## What if I'm not satisfied?
We offer a full refund or free redo if the agreed result isn't delivered. Contact support within 48 hours.

## What payment methods do you accept?
Credit/debit cards, PayPal, and account balance. All payments are secure.`;

  const { data: settings } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "general")
    .maybeSingle();
  const supportEmail =
    (settings as { value?: { support_email?: string } } | null)?.value?.support_email ?? "support@example.com";

  const faqItems = parseFaqContent(content);

  return (
    <div className="min-h-screen py-20 px-4">
      {faqItems.length > 0 && <JsonLdFAQPage items={faqItems} />}
      <div className="max-w-2xl mx-auto">
        <h1 className="font-heading text-3xl font-bold mb-8">{title}</h1>
        <article className="prose prose-invert prose-headings:font-heading mb-16">
          <div className="prose-p:text-[var(--text-secondary)] prose-li:text-[var(--text-secondary)]">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </article>

        <section className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] p-6 sm:p-8">
          <h2 className="font-heading text-xl font-semibold mb-4">Contact</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            Can&apos;t find your answer? Reach out and we&apos;ll help within 24 hours.
          </p>
          <div className="space-y-4">
            <a
              href={`mailto:${supportEmail}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-white/[0.05] transition-colors"
            >
              <Mail className="h-5 w-5 text-[var(--color-primary)]" />
              <span>{supportEmail}</span>
            </a>
            {user ? (
              <Link
                href="/support"
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-white/[0.05] transition-colors"
              >
                <MessageCircle className="h-5 w-5 text-[var(--color-primary)]" />
                <span>View your support tickets</span>
              </Link>
            ) : (
              <Link
                href="/login?redirectTo=/support"
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-white/[0.05] transition-colors"
              >
                <MessageCircle className="h-5 w-5 text-[var(--color-primary)]" />
                <span>Log in to create a support ticket</span>
              </Link>
            )}
          </div>
        </section>

        <p className="mt-8 text-sm text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--text-primary)] transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
