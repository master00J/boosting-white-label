import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import ChatWidget from "@/components/chat/chat-widget";
import TawkToWidget from "@/components/tawkto-widget";
import ServiceWorkerRegister from "@/components/pwa/service-worker-register";
import { JsonLdOrganization, JsonLdWebSite } from "@/components/seo/json-ld";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 3600;

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-cal-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-satoshi",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  alternates: { canonical: appUrl },
  title: {
    default: "BoostPlatform — Professional Game Boosting",
    template: "%s | BoostPlatform",
  },
  description:
    "Professional game boosting and powerleveling services. Fast, safe, and by verified boosters.",
  keywords: [
    "game boosting",
    "powerleveling",
    "rank boost",
    "coaching",
    "elo boost",
    "carry",
    "boosting service",
    "OSRS boosting",
    "RuneScape boost",
  ],
  authors: [{ name: "BoostPlatform" }],
  creator: "BoostPlatform",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appUrl,
    siteName: "BoostPlatform",
    title: "BoostPlatform — Professional Game Boosting",
    description:
      "Professional game boosting and powerleveling services. Fast, safe, and by verified boosters.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BoostPlatform — Professional Game Boosting",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BoostPlatform — Professional Game Boosting",
    description:
      "Professional game boosting and powerleveling services. Fast, safe, and by verified boosters.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

async function getIntegrationSettings() {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", "integrations")
      .single() as unknown as { data: { value: Record<string, unknown> } | null };

    let raw = data?.value ?? {};
    if (typeof raw === "string") {
      try { raw = JSON.parse(raw); } catch { raw = {}; }
    }
    return raw as {
      tawkto_enabled?: boolean;
      tawkto_property_id?: string;
      tawkto_widget_id?: string;
      custom_chat_enabled?: boolean;
    };
  } catch {
    return { custom_chat_enabled: true };
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const integrations = await getIntegrationSettings();

  const tawkEnabled = integrations.tawkto_enabled && !!integrations.tawkto_property_id;
  // custom_chat_enabled defaults to true if not set yet
  const customChatEnabled = integrations.custom_chat_enabled !== false;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#E8720C" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BoostPlatform" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body
        className="min-h-screen font-sans antialiased"
        style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}
      >
        <JsonLdOrganization />
        <JsonLdWebSite />
        <ServiceWorkerRegister />
        <Providers>
          {children}
          {customChatEnabled && <ChatWidget />}
          {tawkEnabled && (
            <TawkToWidget
              propertyId={integrations.tawkto_property_id!}
              widgetId={integrations.tawkto_widget_id ?? "default"}
            />
          )}
        </Providers>
      </body>
    </html>
  );
}
