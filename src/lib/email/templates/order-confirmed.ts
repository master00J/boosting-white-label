import { baseLayout, h1, p, button, divider, infoTable, infoRow } from "./base-layout";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

export function orderConfirmedEmail(data: {
  customerName: string;
  orderNumber: string;
  game: string;
  service: string;
  total: number;
}): string {
  const content = `
    ${h1("Order confirmed! 🎉")}
    ${p(`Hi ${data.customerName}, your order has been received and will be picked up by one of our boosters as soon as possible.`)}
    ${divider()}
    ${infoTable(`
      ${infoRow("Order number", data.orderNumber)}
      ${infoRow("Game", data.game)}
      ${infoRow("Service", data.service)}
      ${infoRow("Total", `$${data.total.toFixed(2)}`)}
    `)}
    ${divider()}
    ${p("You can track the progress in your dashboard.")}
    ${button("View order", `${APP_URL}/orders`)}
  `;
  return baseLayout(content, `Order ${data.orderNumber} confirmed`);
}
