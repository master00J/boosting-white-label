import type { Metadata } from "next";
import DuelArenaClient from "./duel-arena-client";

export const metadata: Metadata = {
  title: "Duel Arena Simulator",
  description: "Run a cinematic whip duel simulation with animated fighters, hit splats, and battle logs.",
};

export default function DuelArenaPage() {
  return <DuelArenaClient />;
}
