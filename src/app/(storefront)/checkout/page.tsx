"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CreditCard, Wallet, ArrowLeft, ArrowRight, Lock,
  AlertCircle, Loader2, ShieldCheck, Coins,
} from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils/cn";
import { formatUSD, formatGold } from "@/lib/format";
import { formatConfigurationSummary } from "@/lib/utils/configuration-summary";
import type { CurrencyRates, GameCurrencyConfig } from "@/types/currency";

type PaymentMethod = "stripe" | "paypal" | "balance" | "gold" | "whop" | "nowpayments";

interface CheckoutResponse {
  method: PaymentMethod;
  redirectUrl?: string;
  success?: boolean;
  orderId?: string;
  goldAmount?: number;
  goldLabel?: string;
  instructions?: string;
  error?: string;
}

type PaymentFees = {
  stripe:       { pct: number; fixed: number };
  paypal:       { pct: number; fixed: number };
  balance:      { pct: number; fixed: number };
  gold:         { pct: number; fixed: number };
  whop:         { pct: number; fixed: number };
  nowpayments:  { pct: number; fixed: number };
};

type PaymentConfig = Partial<Record<`${PaymentMethod}_enabled`, string>>;

export default function CheckoutPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { items, getSubtotal, getTotal, couponCode, couponDiscount, clearCart } = useCartStore();

  const [method, setMethod] = useState<PaymentMethod>("stripe");
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currencyRates, setCurrencyRates] = useState<CurrencyRates | null>(null);
  const [fees, setFees] = useState<PaymentFees>({
    stripe:       { pct: 0, fixed: 0 },
    paypal:       { pct: 0, fixed: 0 },
    balance:      { pct: 0, fixed: 0 },
    gold:         { pct: 0, fixed: 0 },
    whop:         { pct: 0, fixed: 0 },
    nowpayments:  { pct: 0, fixed: 0 },
  });
  const [goldEnabled, setGoldEnabled] = useState(false);
  const [whopEnabled, setWhopEnabled] = useState(false);
  const [nowpaymentsEnabled, setNowpaymentsEnabled] = useState(false);
  const [accountValue, setAccountValue] = useState<string>("");

  /** Parse shorthand like "50M", "500K", "1.5B" → raw number string, or return null if unparseable */
  const parseShorthand = (raw: string): number | null => {
    const s = raw.trim().toUpperCase();
    if (s === "") return null;
    const match = s.match(/^(\d+(?:\.\d+)?)\s*([KMB]?)$/);
    if (!match) return null;
    const num = parseFloat(match[1]!);
    const suffix = match[2];
    if (suffix === "K") return Math.round(num * 1_000);
    if (suffix === "M") return Math.round(num * 1_000_000);
    if (suffix === "B") return Math.round(num * 1_000_000_000);
    return Math.round(num);
  };

  const parsedAccountValue = parseShorthand(accountValue);

  const subtotal = getSubtotal();
  const discount = couponDiscount;
  const baseTotal = getTotal(); // subtotal - coupon

  // Calculate fee for selected method
  const feeForMethod = (m: PaymentMethod, amount: number) => {
    const f = fees[m];
    if (!f || (f.pct === 0 && f.fixed === 0)) return 0;
    return parseFloat(((amount * f.pct) / 100 + f.fixed).toFixed(2));
  };

  const fee = feeForMethod(method, baseTotal);
  const total = parseFloat((baseTotal + fee).toFixed(2));

  // Load all config in parallel — show skeleton until everything resolves
  useEffect(() => {
    setConfigLoading(true);
    Promise.all([
      fetch("/api/payment-fees").then((r) => r.json()).catch(() => null) as Promise<PaymentFees | null>,
      fetch("/api/payment-config").then((r) => r.json()).catch(() => null) as Promise<PaymentConfig | null>,
      fetch("/api/currency-rates").then((r) => r.json()).catch(() => null) as Promise<CurrencyRates | null>,
    ]).then(([feesData, configData, ratesData]) => {
      if (feesData) setFees(feesData);
      if (configData) {
        setGoldEnabled(configData.gold_enabled === "true");
        setWhopEnabled(configData.whop_enabled === "true");
        setNowpaymentsEnabled(configData.nowpayments_enabled === "true");
      }
      if (ratesData) setCurrencyRates(ratesData);
      setConfigLoading(false);
    });
  }, []);

  // Check if gold payment is available for all items in cart
  const goldAvailableForCart = currencyRates !== null && items.length > 0 && items.every((item) => {
    const cfg = currencyRates?.games[item.gameId] as GameCurrencyConfig | undefined;
    return cfg?.gold_enabled === true;
  });

  // Get gold info for the primary game in cart
  const primaryGameId = items[0]?.gameId;
  const primaryGoldCfg = primaryGameId
    ? (currencyRates?.games[primaryGameId] as GameCurrencyConfig | undefined)
    : undefined;

  const goldAmountForTotal = primaryGoldCfg?.gold_per_usd
    ? Math.ceil(total * primaryGoldCfg.gold_per_usd)
    : 0;

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="text-[var(--text-muted)] mb-4">Your cart is empty.</p>
        <Link href="/games" className="text-primary hover:underline">Browse games →</Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <Lock className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
        <h1 className="font-heading text-2xl font-semibold mb-2">Sign in required</h1>
        <p className="text-[var(--text-muted)] mb-6">You must be logged in to checkout.</p>
        <Link
          href="/login?redirect=/checkout"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
        >
          Sign in
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        method,
        items: items.map((item) => ({
          serviceId: item.serviceId,
          serviceName: item.serviceName,
          gameName: item.gameName,
          gameId: item.gameId,
          quantity: item.quantity,
          finalPrice: item.finalPrice,
          configuration: item.configuration ?? {},
        })),
        couponCode: couponCode ?? undefined,
        couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
        accountValueIngame: parsedAccountValue !== null ? parsedAccountValue : undefined,
        accountValueGameId: primaryGameId ?? undefined,
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as CheckoutResponse;

      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Gold payment: redirect to success page with gold instructions
      if (data.method === "gold" && data.success) {
        const params = new URLSearchParams({
          order: data.orderId ?? "",
          method: "gold",
          goldAmount: String(data.goldAmount ?? 0),
          goldLabel: data.goldLabel ?? "GP",
          instructions: data.instructions ?? "",
        });
        clearCart();
        router.push(`/checkout/success?${params.toString()}`);
        return;
      }

      // Balance payment: direct success
      if (data.method === "balance" && data.success) {
        const target = data.redirectUrl ?? `/checkout/success?order=${data.orderId}`;
        clearCart();
        router.push(target);
        return;
      }

      // Stripe / PayPal / Whop / NOWPayments: redirect to payment provider
      // Build the URL first, then clear the cart so it's gone only if redirect is valid
      if (data.redirectUrl) {
        const url = data.redirectUrl;
        clearCart();
        window.location.href = url;
        return;
      }

      setError("Unexpected response from server.");
    } catch {
      setError("Connection error. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const feeLabel = (m: PaymentMethod) => {
    const f = fees[m];
    if (!f || (f.pct === 0 && f.fixed === 0)) return null;
    if (f.pct > 0 && f.fixed > 0) return `+${f.pct}% + $${f.fixed.toFixed(2)} fee`;
    if (f.pct > 0) return `+${f.pct}% fee`;
    return `+$${f.fixed.toFixed(2)} fee`;
  };

  const paymentMethods: {
    id: PaymentMethod;
    label: string;
    icon: React.ReactNode;
    description: string;
    fee?: string | null;
    hidden?: boolean;
    disabled?: boolean;
    disabledReason?: string;
  }[] = [
    {
      id: "stripe",
      label: "Credit / Debit card",
      icon: <CreditCard className="h-5 w-5" />,
      description: "Visa, Mastercard, Amex — secured via Stripe",
      fee: feeLabel("stripe"),
    },
    {
      id: "paypal",
      label: "PayPal",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" />
        </svg>
      ),
      description: "Pay securely via your PayPal account",
      fee: feeLabel("paypal"),
    },
    {
      id: "balance",
      label: "Account balance",
      icon: <Wallet className="h-5 w-5" />,
      description: `Current balance: ${formatUSD(profile?.balance ?? 0)}`,
      fee: feeLabel("balance"),
    },
    {
      id: "gold",
      label: `Pay with ${primaryGoldCfg?.gold_currency_label ?? "In-game Gold"}`,
      icon: <Coins className="h-5 w-5" />,
      description: goldAmountForTotal > 0
        ? `${formatGold(goldAmountForTotal, primaryGoldCfg?.gold_currency_label ?? "GP")} — trade in-game after ordering`
        : "Trade in-game gold after ordering",
      fee: feeLabel("gold"),
      hidden: !goldEnabled,
      disabled: !goldAvailableForCart,
      disabledReason: "Configure Currency & Gold for every game in your cart before accepting in-game currency.",
    },
    {
      id: "whop" as PaymentMethod,
      label: "Whop (crypto, card & more)",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
        </svg>
      ),
      description: "Pay with crypto, credit card, BNPL and 100+ global methods via Whop",
      fee: feeLabel("whop"),
      hidden: !whopEnabled,
    },
    {
      id: "nowpayments" as PaymentMethod,
      label: "Crypto (NOWPayments)",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
        </svg>
      ),
      description: "Pay with Bitcoin, Ethereum, USDT and 300+ cryptocurrencies via NOWPayments",
      fee: feeLabel("nowpayments"),
      hidden: !nowpaymentsEnabled,
    },
  ];

  const visibleMethods = paymentMethods.filter((pm) => !pm.hidden);
  const balanceInsufficient = method === "balance" && (profile?.balance ?? 0) < total;
  const selectedMethod = paymentMethods.find((pm) => pm.id === method);
  const selectedMethodUnavailable = selectedMethod?.disabled ?? false;

  const PROVIDER_MINIMUMS: Partial<Record<PaymentMethod, number>> = {
    whop: 1.00,
    stripe: 0.50,
    nowpayments: 0.50,
  };
  const providerMin = PROVIDER_MINIMUMS[method];
  const belowProviderMin = providerMin !== undefined && total < providerMin;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6 text-sm">
        <Link href="/cart" className="text-[var(--text-muted)] hover:text-primary transition-colors">
          Cart
        </Link>
        <span className="text-[var(--text-muted)]">→</span>
        <span className="font-medium text-primary">Review & pay</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to cart
        </Link>
        <h1 className="font-heading text-3xl font-semibold">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: payment method */}
        <div className="lg:col-span-3 space-y-6">
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <h2 className="font-heading font-semibold mb-4">Payment method</h2>
            <div className="space-y-3">
              {configLoading ? (
                /* Skeleton — fixed height matches real items, prevents layout shift */
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border-default)] animate-pulse">
                      <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)] flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-32 bg-[var(--bg-elevated)] rounded" />
                        <div className="h-3 w-48 bg-[var(--bg-elevated)] rounded opacity-60" />
                      </div>
                      <div className="w-4 h-4 rounded-full border-2 border-[var(--border-default)] flex-shrink-0" />
                    </div>
                  ))}
                </>
              ) : visibleMethods.map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => {
                    if (!pm.disabled) setMethod(pm.id);
                  }}
                  disabled={pm.disabled}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                    pm.disabled && "opacity-60 cursor-not-allowed",
                    method === pm.id
                      ? "border-primary bg-primary/5"
                      : "border-[var(--border-default)] hover:border-primary/40"
                  )}
                  aria-label={`Select ${pm.label} as payment method`}
                  aria-pressed={method === pm.id}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    method === pm.id ? "bg-primary/10 text-primary" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                  )}>
                    {pm.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{pm.label}</p>
                      {pm.fee && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md bg-orange-400/10 text-orange-400 font-medium flex-shrink-0">
                          {pm.fee}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{pm.description}</p>
                    {pm.disabledReason && (
                      <p className="text-xs text-amber-400 mt-1">{pm.disabledReason}</p>
                    )}
                  </div>
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex-shrink-0",
                    method === pm.id ? "border-primary bg-primary" : "border-[var(--border-default)]"
                  )} />
                </button>
              ))}
            </div>

            {!configLoading && balanceInsufficient && (
              <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-orange-400/10 border border-orange-400/20 text-orange-400 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>Insufficient balance. You are {formatUSD(total - (profile?.balance ?? 0))} short. Choose another payment method or top up your balance.</p>
              </div>
            )}

            {belowProviderMin && providerMin !== undefined && (
              <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  Minimum order for {method === "whop" ? "Whop" : method === "nowpayments" ? "NOWPayments" : "card payments"} is {formatUSD(providerMin)}.
                  Your total is {formatUSD(total)}. Please add more services to your cart or choose a different payment method.
                </p>
              </div>
            )}

            {method === "gold" && primaryGoldCfg && (
              <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-orange-400/10 border border-orange-400/20 text-orange-400 text-sm">
                <Coins className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Gold payment instructions</p>
                  <p className="mt-0.5 opacity-80">After placing your order you will receive instructions on where to trade your gold. Your order will be activated once gold is received.</p>
                </div>
              </div>
            )}

          </div>

          {/* Security badges */}
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-green-400" />
              SSL secured
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-green-400" />
              Encrypted
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-4 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Right: order summary */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <h2 className="font-heading font-semibold mb-4">Overview</h2>

            {/* Items */}
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.serviceName}</p>
                    <p className="text-xs text-[var(--text-muted)]">{item.gameName} × {item.quantity}</p>
                    {formatConfigurationSummary(item.configuration) && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {formatConfigurationSummary(item.configuration)}
                      </p>
                    )}
                  </div>
                  <span className="font-medium flex-shrink-0">{formatUSD(item.finalPrice * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--border-subtle)] pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Subtotal</span>
                <span>{formatUSD(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Discount ({couponCode})</span>
                  <span>-{formatUSD(discount)}</span>
                </div>
              )}
              {fee > 0 && (
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>
                    Payment fee
                    {fees[method].pct > 0 && fees[method].fixed > 0
                      ? ` (${fees[method].pct}% + $${fees[method].fixed.toFixed(2)})`
                      : fees[method].pct > 0
                      ? ` (${fees[method].pct}%)`
                      : ` ($${fees[method].fixed.toFixed(2)})`}
                  </span>
                  <span>+{formatUSD(fee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-[var(--border-subtle)]">
                <span>Total</span>
                <span className="text-primary">{formatUSD(total)}</span>
              </div>
              {method === "gold" && goldAmountForTotal > 0 && (
                <div className="flex justify-between text-orange-400 font-semibold pt-1">
                  <span>Gold required</span>
                  <span>{formatGold(goldAmountForTotal, primaryGoldCfg?.gold_currency_label ?? "GP")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Value on account (in-game) — USD wordt bij orderaanmaak vastgezet */}
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <label htmlFor="account-value" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Value on my account {primaryGoldCfg ? `(${primaryGoldCfg.gold_currency_label})` : "(in-game)"}
            </label>
            <input
              id="account-value"
              type="text"
              inputMode="decimal"
              placeholder="e.g. 50M, 500K, 1.5B"
              value={accountValue}
              onChange={(e) => setAccountValue(e.target.value)}
              className={cn(
                "w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border text-sm focus:outline-none transition-colors",
                accountValue.trim() !== "" && parsedAccountValue === null
                  ? "border-red-400/60 focus:border-red-400"
                  : "border-[var(--border-default)] focus:border-primary/50"
              )}
            />
            {/* Live parsed value feedback */}
            {accountValue.trim() !== "" && parsedAccountValue !== null && (
              <p className="text-xs text-[var(--text-muted)] mt-1.5 flex items-center gap-1.5">
                <span className="text-green-400 font-medium">= {parsedAccountValue.toLocaleString("en-US")} {primaryGoldCfg?.gold_currency_label ?? "GP"}</span>
                {primaryGoldCfg?.gold_per_usd && (
                  <span>≈ {formatUSD(parsedAccountValue / primaryGoldCfg.gold_per_usd)} USD (rate at order placement)</span>
                )}
              </p>
            )}
            {accountValue.trim() !== "" && parsedAccountValue === null && (
              <p className="text-xs text-red-400 mt-1.5">
                Invalid format. Use a number like 50M, 500K, 1.5B or just a plain number.
              </p>
            )}
            <p className="text-xs text-[var(--text-muted)] mt-1">
              In-game value on your account. Only boosters with sufficient deposit can claim your order.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading || balanceInsufficient || belowProviderMin || selectedMethodUnavailable}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-primary/25"
            aria-label={method === "gold" ? `Place order for ${formatGold(goldAmountForTotal, primaryGoldCfg?.gold_currency_label ?? "GP")}` : `Pay ${formatUSD(total)}`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : method === "gold" ? (
              <>
                <Coins className="h-4 w-4" />
                Place order — {goldAmountForTotal > 0 ? formatGold(goldAmountForTotal, primaryGoldCfg?.gold_currency_label ?? "GP") : formatUSD(total)}
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Pay — {formatUSD(total)}
              </>
            )}
          </button>

          <p className="text-xs text-center text-[var(--text-muted)]">
            By paying you agree to our{" "}
            <Link href="/tos" className="text-primary hover:underline">Terms and Conditions</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
