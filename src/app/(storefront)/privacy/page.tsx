import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for BoostPlatform. Learn how we collect, use, and protect your data.",
  openGraph: {
    title: "Privacy Policy | BoostPlatform",
    description:
      "Privacy Policy for BoostPlatform. Learn how we collect, use, and protect your data.",
    url: "/privacy",
    type: "website",
  },
  alternates: { canonical: "/privacy" },
};

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("static_pages")
    .select("title, content")
    .eq("slug", "privacy")
    .eq("is_published", true)
    .maybeSingle();

  const title = data?.title ?? "Privacy Policy";
  const content =
    data?.content ||
    `# Privacy Policy

We respect your privacy. This policy describes how we collect and use your data.

## Data We Collect
- Account information (email, display name)
- Order and payment details
- Support ticket communications

## How We Use It
To provide our services, process orders, and improve the platform.

## Security
We use industry-standard encryption and do not share your data with third parties except as required for payment processing.

## Contact
For privacy concerns: support@example.com

*Please add your full privacy policy via Admin → Content → Pages.*`;

  return (
    <div className="min-h-screen py-20 px-4">
      <article className="max-w-2xl mx-auto prose prose-invert prose-headings:font-heading">
        <h1 className="font-heading text-3xl font-bold mb-8">{title}</h1>
        <div className="prose-p:text-[var(--text-secondary)] prose-li:text-[var(--text-secondary)]">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
        <p className="mt-12 text-sm text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--text-primary)] transition-colors">
            ← Back to home
          </Link>
        </p>
      </article>
    </div>
  );
}
