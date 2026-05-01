import { baseLayout, h1, p, button, divider } from "./base-layout";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

export function ticketResponseEmail(data: {
  customerName: string;
  ticketNumber: string;
  subject: string;
  responseContent: string;
  isAI: boolean;
}): string {
  const senderLabel = data.isAI ? "BoostPlatform AI Support" : "BoostPlatform Support";
  const content = `
    ${h1(`Reply to ticket ${data.ticketNumber}`)}
    ${p(`Hi ${data.customerName}, there is a new reply on your support ticket.`)}
    ${divider()}
    <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;">Subject: <strong style="color:#fafafa;">${data.subject}</strong></p>
    <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;">From: <strong style="color:#fafafa;">${senderLabel}</strong></p>
    ${divider()}
    <div style="background:#09090b;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:14px;line-height:1.7;color:#a1a1aa;">${data.responseContent.replace(/\n/g, "<br/>")}</p>
    </div>
    ${divider()}
    ${p("Reply to this ticket via your dashboard.")}
    ${button("View ticket", `${APP_URL}/support`)}
  `;
  return baseLayout(content, `Reply to ticket ${data.ticketNumber}`);
}

export function ticketCreatedEmail(data: {
  customerName: string;
  ticketNumber: string;
  subject: string;
}): string {
  const content = `
    ${h1("Ticket created ✉️")}
    ${p(`Hi ${data.customerName}, your support ticket has been created. We will respond as soon as possible.`)}
    ${divider()}
    <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;">Ticket number: <strong style="color:#fafafa;">${data.ticketNumber}</strong></p>
    <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;">Subject: <strong style="color:#fafafa;">${data.subject}</strong></p>
    ${divider()}
    ${button("View ticket", `${APP_URL}/support`)}
  `;
  return baseLayout(content, `Ticket ${data.ticketNumber} created`);
}
