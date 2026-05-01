import { baseLayout, h1, p, button, divider } from "./base-layout";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

export function workerApprovedEmail(data: { displayName: string }): string {
  const content = `
    ${h1("Welcome as a booster! 🚀")}
    ${p(`Congratulations ${data.displayName}! Your booster application has been approved.`)}
    ${divider()}
    ${p("You can now log in to your booster dashboard and claim orders.")}
    ${button("Go to booster dashboard", `${APP_URL}/booster/dashboard`)}
  `;
  return baseLayout(content, "Your booster application has been approved");
}
