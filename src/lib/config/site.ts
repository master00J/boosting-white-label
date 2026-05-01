export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "BoostPlatform",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  description: "Professional game boosting and powerleveling services.",
  supportEmail: "support@boostplatform.gg",
  currency: "USD",
  currencySymbol: "$",
  locale: "en-US",
} as const;
