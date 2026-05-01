"use client";

import { useState } from "react";
import {
  Save, Loader2, Check, CreditCard, Eye, EyeOff,
  AlertTriangle, ExternalLink, Webhook, ShieldCheck,
} from "lucide-react";

type Settings = Record<string, string>;

function SecretInput({
  label, value, onChange, placeholder, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••••••••••••••••"}
          className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono focus:outline-none focus:border-primary/50 transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow((p) => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-default)] transition-colors"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      {hint && <p className="text-xs text-[var(--text-muted)] mt-1">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${checked ? "bg-primary" : "bg-[var(--bg-elevated)]"}`}
    >
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
    </div>
  );
}

export default function PaymentSettingsClient({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const update = (key: string, value: string) => setSettings((p) => ({ ...p, [key]: value }));
  const toggle = (key: string) => setSettings((p) => ({ ...p, [key]: p[key] === "true" ? "false" : "true" }));
  const bool = (key: string) => settings[key] === "true";
  const val = (key: string, def = "") => settings[key] ?? def;

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const stripeConfigured = !!(val("stripe_secret_key") && val("stripe_publishable_key"));
  const paypalConfigured = !!(val("paypal_client_id") && val("paypal_client_secret") && val("paypal_webhook_id"));
  const whopConfigured = !!(val("whop_api_key") && val("whop_company_id") && val("whop_product_id"));
  const nowpaymentsConfigured = !!val("nowpayments_api_key");

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Settings</p>
          <h1 className="font-heading text-2xl font-semibold">Payments</h1>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : "Save"}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-sm text-red-400">{error}</div>
      )}

      {/* Payment methods */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-semibold text-sm">Payment methods</h2>
        </div>
        {[
          { key: "stripe_enabled", label: "Stripe (credit / debit card)", desc: "Payments via Stripe Checkout", configured: stripeConfigured },
          { key: "paypal_enabled", label: "PayPal", desc: "Payments via PayPal", configured: paypalConfigured },
          { key: "balance_enabled", label: "Account balance", desc: "Customers pay with their stored balance", configured: true },
          { key: "gold_enabled", label: "In-game gold", desc: "Customers pay with in-game gold (configure rates under Currency & Gold)", configured: true },
          { key: "whop_enabled", label: "Whop (card + crypto + 100+ methods)", desc: "Accept crypto, BNPL, and global payment methods via Whop", configured: whopConfigured },
          { key: "nowpayments_enabled", label: "NOWPayments (crypto)", desc: "Accept Bitcoin, Ethereum, USDT and 300+ cryptocurrencies via NOWPayments", configured: nowpaymentsConfigured },
        ].map((t) => (
          <div key={t.key} className="flex items-center gap-3">
            <Toggle checked={bool(t.key)} onChange={() => toggle(t.key)} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{t.label}</p>
                {!t.configured && bool(t.key) && (
                  <span className="flex items-center gap-1 text-xs text-amber-400">
                    <AlertTriangle className="h-3 w-3" /> Keys missing
                  </span>
                )}
                {t.configured && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <ShieldCheck className="h-3 w-3" /> Configured
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)]">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Stripe mode */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-sm">Stripe mode</h2>
          <a
            href="https://dashboard.stripe.com/apikeys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Stripe Dashboard <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex gap-3">
          {["test", "live"].map((mode) => (
            <button
              key={mode}
              onClick={() => update("stripe_mode", mode)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${val("stripe_mode", "test") === mode ? "border-primary bg-primary/10 text-primary" : "border-[var(--border-default)] text-[var(--text-muted)]"}`}
            >
              {mode === "test" ? "🧪 Test mode" : "🚀 Live mode"}
            </button>
          ))}
        </div>
        {val("stripe_mode") === "live" && (
          <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-xs text-amber-400">
            ⚠️ Live mode active — real payments are being processed
          </div>
        )}

        <div className="space-y-3 pt-1">
          <SecretInput
            label="Publishable key"
            value={val("stripe_publishable_key")}
            onChange={(v) => update("stripe_publishable_key", v)}
            placeholder={val("stripe_mode", "test") === "test" ? "pk_test_..." : "pk_live_..."}
            hint="Starts with pk_test_ (test) or pk_live_ (live). Safe to expose to the browser."
          />
          <SecretInput
            label="Secret key"
            value={val("stripe_secret_key")}
            onChange={(v) => update("stripe_secret_key", v)}
            placeholder={val("stripe_mode", "test") === "test" ? "sk_test_..." : "sk_live_..."}
            hint="Starts with sk_test_ (test) or sk_live_ (live). Never share this key."
          />
        </div>
      </div>

      {/* Stripe webhooks */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-semibold text-sm">Stripe webhook</h2>
        </div>
        <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs space-y-1">
          <p className="font-medium text-[var(--text-default)]">Webhook endpoint URL</p>
          <p className="font-mono text-primary select-all">
            {typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/webhooks/stripe
          </p>
          <p className="text-[var(--text-muted)] pt-1">
            Add this URL in your{" "}
            <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Stripe webhook settings
            </a>
            . Listen for: <span className="font-mono">checkout.session.completed</span>, <span className="font-mono">payment_intent.payment_failed</span>
          </p>
        </div>
        <SecretInput
          label="Webhook signing secret"
          value={val("stripe_webhook_secret")}
          onChange={(v) => update("stripe_webhook_secret", v)}
          placeholder="whsec_..."
          hint="Found in your Stripe webhook settings after adding the endpoint."
        />
      </div>

      {/* PayPal */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-sm">PayPal credentials</h2>
          <a
            href="https://developer.paypal.com/dashboard/applications"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            PayPal Developer <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="flex gap-3">
          {["sandbox", "live"].map((mode) => (
            <button
              key={mode}
              onClick={() => update("paypal_mode", mode)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${val("paypal_mode", "sandbox") === mode ? "border-primary bg-primary/10 text-primary" : "border-[var(--border-default)] text-[var(--text-muted)]"}`}
            >
              {mode === "sandbox" ? "🧪 Sandbox" : "🚀 Live"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <SecretInput
            label="Client ID"
            value={val("paypal_client_id")}
            onChange={(v) => update("paypal_client_id", v)}
            placeholder="AaBbCc..."
            hint="Found in your PayPal app under 'API Credentials'."
          />
          <SecretInput
            label="Client secret"
            value={val("paypal_client_secret")}
            onChange={(v) => update("paypal_client_secret", v)}
            placeholder="EeFfGg..."
            hint="Keep this secret. Never expose it to the browser."
          />
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs space-y-1">
          <p className="font-medium text-[var(--text-default)]">PayPal webhook URL</p>
          <p className="font-mono text-primary select-all">
            {typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/webhooks/paypal
          </p>
          <p className="text-[var(--text-muted)] pt-1">
            Add this in your PayPal app under <span className="font-medium">Webhooks</span>.
            Listen for: <span className="font-mono">CHECKOUT.ORDER.APPROVED</span>, <span className="font-mono">PAYMENT.CAPTURE.COMPLETED</span>, <span className="font-mono">PAYMENT.CAPTURE.REFUNDED</span>
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5">Webhook ID</label>
          <input
            type="text"
            value={val("paypal_webhook_id")}
            onChange={(e) => update("paypal_webhook_id", e.target.value)}
            placeholder="WH-XXXXXXXXXXXXXXXX-XXXXXXXXXXXXXXXX"
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono focus:outline-none focus:border-primary/50 transition-colors"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Found in your PayPal app under Webhooks → your webhook → Webhook ID. Required for signature verification.
          </p>
        </div>
      </div>

      {/* Whop */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-sm">Whop credentials</h2>
          <a
            href="https://whop.com/dashboard/developer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Whop Developer Dashboard <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-xs text-amber-400 space-y-1">
          <p className="font-semibold">⚠️ Important before enabling Whop</p>
          <p>Whop may restrict or hold payouts for boosting/gaming services. Contact Whop support first to confirm your business type is allowed.</p>
        </div>

        <div className="space-y-3">
          <SecretInput
            label="API Key"
            value={val("whop_api_key")}
            onChange={(v) => update("whop_api_key", v)}
            placeholder="whop_..."
            hint="Create a Company API key in your Whop Developer Dashboard with checkout permissions."
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5">Company ID</label>
              <input
                type="text"
                value={val("whop_company_id")}
                onChange={(e) => update("whop_company_id", e.target.value)}
                placeholder="biz_..."
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Product ID</label>
              <input
                type="text"
                value={val("whop_product_id")}
                onChange={(e) => update("whop_product_id", e.target.value)}
                placeholder="pass_..."
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono focus:outline-none focus:border-primary/50 transition-colors"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">Create a product in Whop for your boosting services.</p>
            </div>
          </div>
          <SecretInput
            label="Webhook secret"
            value={val("whop_webhook_secret")}
            onChange={(v) => update("whop_webhook_secret", v)}
            placeholder="whsec_..."
            hint="Found in your Whop webhook settings."
          />
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs space-y-1">
          <p className="font-medium text-[var(--text-default)]">Whop webhook URL</p>
          <p className="font-mono text-primary select-all">
            {typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/webhooks/whop
          </p>
          <p className="text-[var(--text-muted)] pt-1">
            Add this in your{" "}
            <a href="https://whop.com/dashboard/developer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Whop webhook settings
            </a>.
            Listen for: <span className="font-mono">payment.succeeded</span>, <span className="font-mono">payment.failed</span>, <span className="font-mono">payment.refunded</span>
          </p>
        </div>
      </div>

      {/* NOWPayments */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-sm">NOWPayments credentials</h2>
          <a
            href="https://account.nowpayments.io/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            NOWPayments Dashboard <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="space-y-3">
          <SecretInput
            label="API Key"
            value={val("nowpayments_api_key")}
            onChange={(v) => update("nowpayments_api_key", v)}
            placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
            hint="Create an API key in your NOWPayments dashboard under Store Settings → API Keys."
          />
          <SecretInput
            label="IPN Secret"
            value={val("nowpayments_ipn_secret")}
            onChange={(v) => update("nowpayments_ipn_secret", v)}
            placeholder="IPN secret key"
            hint="Optional but recommended. Set a random secret in NOWPayments IPN settings to verify webhook authenticity."
          />
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs space-y-1">
          <p className="font-medium text-[var(--text-default)]">IPN (webhook) URL</p>
          <p className="font-mono text-primary select-all">
            {typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/webhooks/nowpayments
          </p>
          <p className="text-[var(--text-muted)] pt-1">
            Add this in your{" "}
            <a href="https://account.nowpayments.io/payment-tools/ipn" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              NOWPayments IPN settings
            </a>.
            NOWPayments will POST payment status updates here. Listen for: <span className="font-mono">finished</span>, <span className="font-mono">confirmed</span>, <span className="font-mono">failed</span>, <span className="font-mono">expired</span>, <span className="font-mono">refunded</span>
          </p>
        </div>
      </div>

      {/* Payment fees */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div>
          <h2 className="font-heading font-semibold text-sm">Payment fees</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Extra fee added to the order total per payment method. Set 0 for no fee.
            You can use a percentage (e.g. <span className="font-mono">2.9</span> = 2.9%) or a fixed amount (e.g. <span className="font-mono">0.30</span> = $0.30), or both.
          </p>
        </div>

        {[
          { method: "stripe", label: "Stripe (credit card)", hint: "Stripe charges ~2.9% + $0.30 per transaction" },
          { method: "paypal", label: "PayPal", hint: "PayPal charges ~3.49% + $0.49 per transaction" },
          { method: "balance", label: "Account balance", hint: "Usually 0 — internal transfer" },
          { method: "gold", label: "In-game gold", hint: "Usually 0 — no payment processor involved" },
          { method: "whop", label: "Whop", hint: "Whop charges 2.7% + $0.30 per transaction" },
          { method: "nowpayments", label: "NOWPayments (crypto)", hint: "NOWPayments charges 0.5% per transaction" },
        ].map((f) => (
          <div key={f.method} className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] space-y-3">
            <p className="text-sm font-medium">{f.label}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5">Fee % (percentage)</label>
                <div className="relative">
                  <input
                    type="number" min="0" max="100" step="0.01"
                    value={val(`fee_pct_${f.method}`, "0")}
                    onChange={(e) => update(`fee_pct_${f.method}`, e.target.value)}
                    className="w-full pl-3 pr-8 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5">Fee fixed (per order)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">$</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={val(`fee_fixed_${f.method}`, "0")}
                    onChange={(e) => update(`fee_fixed_${f.method}`, e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)]">{f.hint}</p>
          </div>
        ))}
      </div>

      {/* Order limits */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <h2 className="font-heading font-semibold text-sm">Order limits</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">Min. order amount ($)</label>
            <input
              type="number" min="0" step="0.01"
              value={val("min_order_amount", "5")}
              onChange={(e) => update("min_order_amount", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Max. order amount ($)</label>
            <input
              type="number" min="0" step="0.01"
              value={val("max_order_amount", "1000")}
              onChange={(e) => update("max_order_amount", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="p-4 rounded-xl bg-blue-400/10 border border-blue-400/20 text-xs text-blue-300 space-y-1.5">
        <p className="font-semibold flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> How keys are stored</p>
        <p>
          Keys saved here are stored in your Supabase <span className="font-mono">site_settings</span> table and loaded server-side at runtime.
          They are never exposed to the browser. For maximum security you can also set them as{" "}
          <a href="https://vercel.com/docs/environment-variables" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">
            Vercel environment variables
          </a>{" "}
          — those take priority over the database values.
        </p>
      </div>
    </div>
  );
}
