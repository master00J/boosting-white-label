export type PaymentMethod = "stripe" | "paypal" | "balance";

export interface PaymentIntent {
  method: PaymentMethod;
  redirectUrl?: string;
  sessionId?: string;
  paypalOrderId?: string;
}

export { createStripeCheckoutSession, createStripeRefund, verifyStripeWebhook } from "./stripe";
export { createPayPalOrder, capturePayPalOrder, verifyPayPalWebhook } from "./paypal";
export { getBalance, validateBalancePayment, deductBalance, creditBalance } from "./balance";
