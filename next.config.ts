import type { NextConfig } from "next";
import path from "path";

const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://embed.tawk.to https://*.tawk.to https://cdn.jsdelivr.net https://vercel.live https://*.vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://embed.tawk.to https://*.tawk.to https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https://*.supabase.co",
  "font-src 'self' https://fonts.gstatic.com https://embed.tawk.to https://*.tawk.to",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://embed.tawk.to https://*.tawk.to wss://*.tawk.to https://va.tawk.to wss://va.tawk.to https://static-v.tawk.to wss://static-v.tawk.to " +
  Array.from({ length: 100 }, (_, i) => `https://vsa${i}.tawk.to wss://vsa${i}.tawk.to`).join(" ") +
  " https://vercel.live https://*.vercel.live wss://vercel.live wss://*.vercel.live",
  "frame-src 'self' https://embed.tawk.to https://*.tawk.to https://vercel.live https://*.vercel.live",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.tawk.to",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  env: {
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "",
  },
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
      {
        protocol: "https",
        hostname: "oldschool.runescape.wiki",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "oldschool.runescape.wiki",
        pathname: "/wiki/Special:FilePath/**",
      },
    ],
  },
};

export default nextConfig;
