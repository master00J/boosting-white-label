import { baseLayout, h1, p, button, divider, infoTable, infoRow } from "./base-layout";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

export function orderCompletedEmail(data: {
  customerName: string;
  orderNumber: string;
  game: string;
  service: string;
  boosterName: string;
}): string {
  const content = `
    ${h1("Order completed! ✅")}
    ${p(`Great news ${data.customerName}! Your order has been successfully completed by ${data.boosterName}.`)}
    ${divider()}
    ${infoTable(`
      ${infoRow("Order number", data.orderNumber)}
      ${infoRow("Game", data.game)}
      ${infoRow("Service", data.service)}
      ${infoRow("Booster", data.boosterName)}
    `)}
    ${divider()}
    ${p("Leave a review to thank your booster!")}
    ${button("Leave a review", `${APP_URL}/orders`)}
  `;
  return baseLayout(content, `Order ${data.orderNumber} completed`);
}
