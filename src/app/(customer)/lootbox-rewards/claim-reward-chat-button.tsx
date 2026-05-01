"use client";

import { MessageCircle } from "lucide-react";

export default function ClaimRewardChatButton({ message }: { message: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent("chat:open", {
            detail: {
              initialMessage: message,
              gameName: "Old School RuneScape",
              serviceName: "Lootbox reward claim",
              autoStart: true,
            },
          })
        );
      }}
      className="inline-flex items-center gap-1.5 rounded-full bg-[#E8720C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#ff8a24] transition-colors"
    >
      <MessageCircle className="h-3.5 w-3.5" />
      Claim via live chat
    </button>
  );
}
