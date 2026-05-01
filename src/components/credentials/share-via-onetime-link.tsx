"use client";

import { ExternalLink, MessageCircle, Shield } from "lucide-react";

const ONETIME_URL = "https://1ty.me/";

/**
 * Shown to customers: share credentials via a one-time link (e.g. 1ty.me),
 * then paste the link in the order messages. The message is deleted after viewing.
 */
export function CustomerShareCredentialsViaLink() {
  return (
    <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-3">
      <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        Share login details securely
      </h2>
      <p className="text-sm text-[var(--text-muted)]">
        Use a one-time link so your credentials are deleted after the booster views them. We recommend{" "}
        <a
          href={ONETIME_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          1ty.me <ExternalLink className="h-3 w-3" />
        </a>
        .
      </p>
      <ol className="text-sm text-[var(--text-secondary)] space-y-1 list-decimal list-inside">
        <li>Go to {ONETIME_URL} and paste your username and temporary password.</li>
        <li>Copy the short link you get.</li>
        <li>Paste that link in the <strong>order messages</strong> below so your booster can open it once.</li>
      </ol>
      <p className="text-xs text-amber-400/90 flex items-center gap-1.5">
        <MessageCircle className="h-3.5 w-3.5 flex-shrink-0" />
        Do not post your actual password in the chat — only the one-time link.
      </p>
    </div>
  );
}

/**
 * Shown to boosters: credentials will be shared via one-time link in order messages.
 */
export function BoosterCredentialsViaLinkNotice() {
  return (
    <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-2">
      <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        Customer credentials
      </h2>
      <p className="text-sm text-[var(--text-muted)]">
        The customer will share their login details via a one-time link (e.g. 1ty.me) in the order messages below.
        The link can only be viewed once and is then deleted. Check the messages for the link.
      </p>
    </div>
  );
}
