import { sendEmail, isEmailEnabled } from "./client";
import { orderConfirmedEmail } from "./templates/order-confirmed";
import { orderCompletedEmail } from "./templates/order-completed";
import { ticketResponseEmail, ticketCreatedEmail } from "./templates/ticket-response";
import { workerApprovedEmail } from "./templates/worker-approved";

// Pass an empty string as `from` — sendEmail will resolve it from config (DB or env)
const FROM = "";

export async function sendOrderConfirmed(to: string, data: {
  customerName: string;
  orderNumber: string;
  game: string;
  service: string;
  total: number;
}) {
  if (!await isEmailEnabled("email_order_confirmed_enabled")) return null;
  return sendEmail({
    from: FROM,
    to,
    subject: `Order ${data.orderNumber} confirmed`,
    html: orderConfirmedEmail(data),
  });
}

export async function sendOrderCompleted(to: string, data: {
  customerName: string;
  orderNumber: string;
  game: string;
  service: string;
  boosterName: string;
}) {
  if (!await isEmailEnabled("email_order_completed_enabled")) return null;
  return sendEmail({
    from: FROM,
    to,
    subject: `Order ${data.orderNumber} completed! 🎉`,
    html: orderCompletedEmail(data),
  });
}

export async function sendTicketCreated(to: string, data: {
  customerName: string;
  ticketNumber: string;
  subject: string;
}) {
  if (!await isEmailEnabled("email_ticket_created_enabled")) return null;
  return sendEmail({
    from: FROM,
    to,
    subject: `Ticket ${data.ticketNumber} created`,
    html: ticketCreatedEmail(data),
  });
}

export async function sendTicketResponse(to: string, data: {
  customerName: string;
  ticketNumber: string;
  subject: string;
  responseContent: string;
  isAI: boolean;
}) {
  if (!await isEmailEnabled("email_ticket_response_enabled")) return null;
  return sendEmail({
    from: FROM,
    to,
    subject: `Re: [${data.ticketNumber}] ${data.subject}`,
    html: ticketResponseEmail(data),
  });
}

export async function sendWorkerApproved(to: string, data: { displayName: string }) {
  if (!await isEmailEnabled("email_worker_approved_enabled")) return null;
  return sendEmail({
    from: FROM,
    to,
    subject: "Your booster application has been approved! 🎉",
    html: workerApprovedEmail(data),
  });
}
