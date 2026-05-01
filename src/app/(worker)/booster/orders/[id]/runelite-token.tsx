"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

interface RuneLiteTokenProps {
  trackToken: string;
  orderId: string;
}

const STEPS = [
  {
    step: 1,
    title: "Install DinkPlugin",
    description: (
      <>
        Open RuneLite → click the <strong>Plugin Hub</strong> icon → search for{" "}
        <strong>&quot;Dink&quot;</strong> → click <strong>Install</strong>.
      </>
    ),
  },
  {
    step: 2,
    title: "Set the Webhook URL",
    description: (
      <>
        Go to the Dink plugin settings and paste the URL below into the{" "}
        <strong>&quot;Webhook URL&quot;</strong> field.
      </>
    ),
  },
  {
    step: 3,
    title: "Choose which events to send",
    description: (
      <>
        Enable: <strong>Level Up</strong>, <strong>Kill Count</strong>,{" "}
        <strong>Quest Completion</strong>. Optional: <strong>Screenshot</strong> for proof.
      </>
    ),
  },
  {
    step: 4,
    title: "Done",
    description: (
      <>
        RuneLite will now automatically send updates to this order. They will appear in the
        order messages below.
      </>
    ),
  },
];

export default function RuneLiteToken({ trackToken, orderId }: RuneLiteTokenProps) {
  const [urlCopied, setUrlCopied] = useState(false);

  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const webhookUrl = `${baseUrl}/api/webhooks/runelite?token=${trackToken}`;

  const copyUrl = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
          {/* RuneLite logo placeholder */}
          <span className="text-sm font-bold text-[var(--color-primary)]">RL</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">RuneLite AutoTrack</p>
          <p className="text-xs text-[var(--text-muted)]">via DinkPlugin</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Webhook URL */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
            Webhook URL
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2">
            <code className="flex-1 text-xs text-[var(--text-secondary)] truncate font-mono">
              {webhookUrl}
            </code>
            <button
              onClick={copyUrl}
              className="flex-shrink-0 p-1 rounded hover:bg-[var(--bg-elevated)] transition-colors"
              title="Copy webhook URL"
            >
              {urlCopied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              )}
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Paste this URL into the <strong>Webhook URL</strong> field of DinkPlugin.
          </p>
        </div>

        {/* Setup steps */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
            Setup
          </p>
          <div className="space-y-2">
            {STEPS.map(({ step, title, description }) => (
              <div key={step} className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--color-primary)]/15 flex items-center justify-center mt-0.5">
                  <span className="text-[10px] font-bold text-[var(--color-primary)]">{step}</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary)]">{title}</p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Link to Plugin Hub */}
        <a
          href="https://runelite.net/plugin-hub/show/dink"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-[var(--border-default)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--color-primary)]/40 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          DinkPlugin on RuneLite Plugin Hub
        </a>
      </div>

      {/* Footer note */}
      <div className="px-4 py-2.5 border-t border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <p className="text-[11px] text-[var(--text-muted)]">
          Order ID: <span className="font-mono">{orderId.slice(0, 8)}…</span> — events will appear
          automatically in the messages below.
        </p>
      </div>
    </div>
  );
}
