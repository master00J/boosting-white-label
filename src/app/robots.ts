import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/games",
          "/games/*",
          "/boosters",
          "/boosters/*",
          "/leaderboard",
          "/reviews",
          "/faq",
          "/track",
          "/apply",
          "/tos",
          "/privacy",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/dashboard",
          "/dashboard/*",
          "/worker",
          "/worker/*",
          "/booster",
          "/booster/*",
          "/orders",
          "/orders/*",
          "/api",
          "/auth/callback",
          "/cart",
          "/checkout",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
