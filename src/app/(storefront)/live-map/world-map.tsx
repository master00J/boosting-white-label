"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import createGlobe from "cobe";
import { getCountryInfo } from "@/app/(worker)/booster/orders/[id]/vpn-location-picker";

const COUNTRY_COORDS: Record<string, [number, number]> = {
  NL: [52.1, 5.3], DE: [51.2, 10.4], GB: [52.4, -1.5], FR: [46.2, 2.3],
  US: [39.8, -98.6], CA: [56.1, -96.8], AU: [-25.7, 133.8], SE: [60.1, 18.6],
  NO: [60.5, 8.5], FI: [61.9, 25.7], DK: [56.3, 9.5], CH: [46.8, 8.2],
  AT: [47.5, 14.5], BE: [50.5, 4.5], ES: [40.4, -3.7], IT: [41.9, 12.6],
  PL: [52.2, 19.1], RO: [24.9, 45.9], CZ: [49.8, 15.5], SK: [48.7, 19.7],
  HU: [47.2, 19.5], PT: [39.4, -8.2], LT: [55.2, 23.9], LV: [56.9, 24.6],
  EE: [58.6, 25.0], SG: [1.4, 103.8], JP: [36.2, 138.3], KR: [35.9, 127.8],
  HK: [22.3, 114.2], IN: [20.6, 78.9], BR: [-14.2, -51.9], MX: [23.6, -102.6],
  ZA: [-29.0, 25.1], TR: [38.9, 35.2], UA: [48.4, 31.2], RS: [44.0, 21.0],
  BG: [42.7, 25.5], HR: [45.1, 15.2], GR: [39.1, 21.8], LU: [49.8, 6.1],
  IE: [53.4, -8.2], NZ: [-40.9, 172.5], AR: [-38.4, -63.6], CL: [-35.7, -71.5],
  CO: [4.6, -74.3], MY: [4.2, 109.7], TH: [15.9, 100.9], ID: [-0.8, 113.9],
  PH: [12.9, 121.8], VN: [14.1, 108.3],
};

type Location = { country_code: string; count: number };

function locationToAngles(lat: number, lng: number): [number, number] {
  return [
    Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2),
    (lat * Math.PI) / 180,
  ];
}

function Particles({ count = 60 }: { count?: number }) {
  const pts = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      r: Math.random() * 1.2 + 0.3,
      dur: 2 + Math.random() * 4,
      delay: Math.random() * 5,
    }))
  );
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      {pts.current.map((p) => (
        <circle key={p.id} cx={`${p.x}%`} cy={`${p.y}%`} r={p.r} fill="rgba(255,165,60,0.6)">
          <animate attributeName="opacity" values="0;0.7;0" dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

const HALF_PI = Math.PI / 2;
const DRAG_SENSITIVITY = 0.008;
const MOMENTUM_DECAY = 0.92;
const AUTO_ROTATE_SPEED = 0.003;

export default function WorldMap({ locations }: { locations: Location[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(0);
  const [hovered, setHovered] = useState<string | null>(null);

  const markers = locations.map((loc) => {
    const coords = COUNTRY_COORDS[loc.country_code];
    if (!coords) return null;
    return { location: coords, size: Math.min(0.04 + loc.count * 0.015, 0.12) };
  }).filter(Boolean) as { location: [number, number]; size: number }[];

  const [initPhi, initTheta] = locationToAngles(50, 5);

  // All mutable state lives in a single ref to avoid stale closures
  const state = useRef({
    phi: initPhi,
    theta: initTheta,
    velocityPhi: 0,
    velocityTheta: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
  });

  const onResize = useCallback(() => {
    if (containerRef.current) {
      widthRef.current = containerRef.current.offsetWidth;
    }
  }, []);

  useEffect(() => {
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [onResize]);

  // Globe
  useEffect(() => {
    if (!canvasRef.current) return;
    const dpr = Math.min(window.devicePixelRatio ?? 2, 2);

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: dpr,
      width: widthRef.current * dpr,
      height: widthRef.current * dpr,
      phi: state.current.phi,
      theta: state.current.theta,
      dark: 1,
      diffuse: 1.4,
      mapSamples: 40000,
      mapBrightness: 8,
      baseColor: [0.4, 0.15, 0.05],
      markerColor: [1, 0.55, 0],
      glowColor: [0.35, 0.08, 0.02],
      markers,
      scale: 1.02,
      offset: [0, 0],
      onRender: (s) => {
        const st = state.current;

        if (!st.dragging) {
          if (Math.abs(st.velocityPhi) > 0.00005 || Math.abs(st.velocityTheta) > 0.00005) {
            st.phi += st.velocityPhi;
            st.theta = Math.max(-HALF_PI, Math.min(HALF_PI, st.theta + st.velocityTheta));
            st.velocityPhi *= MOMENTUM_DECAY;
            st.velocityTheta *= MOMENTUM_DECAY;
          } else {
            st.velocityPhi = 0;
            st.velocityTheta = 0;
            st.phi += AUTO_ROTATE_SPEED;
          }
        }

        s.phi = st.phi;
        s.theta = st.theta;
        s.width = widthRef.current * dpr;
        s.height = widthRef.current * dpr;
      },
    });

    return () => globe.destroy();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers.length]);

  // Pointer events — attach move/up to window so dragging stays smooth even outside canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      const st = state.current;
      st.dragging = true;
      st.velocityPhi = 0;
      st.velocityTheta = 0;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      canvas.style.cursor = "grabbing";
      canvas.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      const st = state.current;
      if (!st.dragging) return;

      const dx = e.clientX - st.lastX;
      const dy = e.clientY - st.lastY;

      st.phi += dx * DRAG_SENSITIVITY;
      st.theta = Math.max(-HALF_PI, Math.min(HALF_PI, st.theta - dy * DRAG_SENSITIVITY));

      st.velocityPhi = dx * DRAG_SENSITIVITY;
      st.velocityTheta = -dy * DRAG_SENSITIVITY;

      st.lastX = e.clientX;
      st.lastY = e.clientY;
    };

    const onUp = () => {
      state.current.dragging = false;
      canvas.style.cursor = "grab";
    };

    canvas.addEventListener("pointerdown", onDown, { passive: false });
    canvas.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onUp);

    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[560px] mx-auto overflow-hidden select-none"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% 40%, #2a0505 0%, #0e0101 50%, #050000 100%)",
        aspectRatio: "1",
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)",
        zIndex: 3,
      }} />

      <Particles />

      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          position: "relative",
          zIndex: 2,
          contain: "layout paint size",
          cursor: "grab",
          touchAction: "none",
        }}
      />

      {locations.length > 0 && (
        <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-1.5 max-w-[60%]">
          {locations.sort((a, b) => b.count - a.count).slice(0, 8).map((loc) => {
            const info = getCountryInfo(loc.country_code);
            if (!info) return null;
            return (
              <div
                key={loc.country_code}
                onMouseEnter={() => setHovered(loc.country_code)}
                onMouseLeave={() => setHovered(null)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] transition-all cursor-default"
                style={{
                  background: hovered === loc.country_code ? "rgba(255,100,20,0.2)" : "rgba(255,100,20,0.08)",
                  border: "1px solid rgba(255,100,20,0.2)",
                }}
              >
                <span>{info.flag}</span>
                <span className="font-medium text-orange-200">{info.name}</span>
                <span className="font-bold" style={{ color: "#FF8C00" }}>{loc.count}</span>
              </div>
            );
          })}
        </div>
      )}

      <p className="absolute bottom-2 right-3 text-[10px] z-10" style={{ color: "rgba(255,120,40,0.25)" }}>
        Drag to rotate
      </p>
    </div>
  );
}
