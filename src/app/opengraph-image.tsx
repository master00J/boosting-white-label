import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "BoostPlatform — Professional Game Boosting";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#09090b",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(232,114,12,0.18) 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #E8720C, #f59e0b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 700,
              color: "white",
            }}
          >
            F
          </div>
          <span style={{ fontSize: 32, fontWeight: 700, color: "white" }}>
            BoostPlatform<span style={{ color: "#E8720C" }}>Boosting</span>
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "white",
            textAlign: "center",
            lineHeight: 1.1,
            margin: 0,
            maxWidth: 900,
          }}
        >
          Professional Game Boosting
        </h1>

        {/* Subline */}
        <p
          style={{
            fontSize: 24,
            color: "#a1a1aa",
            marginTop: 20,
            textAlign: "center",
          }}
        >
          Fast · Safe · Verified Boosters
        </p>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 48,
            marginTop: 48,
          }}
        >
          {[
            { value: "Verified", label: "Boosters" },
            { value: "< 1h", label: "Start time" },
            { value: "24/7", label: "Support" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 700, color: "#E8720C" }}>
                {stat.value}
              </span>
              <span style={{ fontSize: 14, color: "#71717a" }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
