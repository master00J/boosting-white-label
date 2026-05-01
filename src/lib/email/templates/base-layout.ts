const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "BoostPlatform";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

export function baseLayout(content: string, previewText?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${APP_NAME}</title>
  ${previewText ? `<span style="display:none;max-height:0;overflow:hidden;">${previewText}</span>` : ""}
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fafafa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:0 0 32px 0;text-align:center;">
              <a href="${APP_URL}" style="text-decoration:none;color:#6366f1;font-size:24px;font-weight:700;letter-spacing:-0.5px;">${APP_NAME}</a>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="background:#18181b;border-radius:16px;border:1px solid #27272a;padding:40px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0 0;text-align:center;color:#71717a;font-size:12px;">
              <p style="margin:0 0 8px 0;">&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
              <p style="margin:0;">
                <a href="${APP_URL}" style="color:#6366f1;text-decoration:none;">Website</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}/support" style="color:#6366f1;text-decoration:none;">Support</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function button(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;margin:16px 0;">${text}</a>`;
}

export function h1(text: string): string {
  return `<h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#fafafa;">${text}</h1>`;
}

export function p(text: string): string {
  return `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#a1a1aa;">${text}</p>`;
}

export function divider(): string {
  return `<hr style="border:none;border-top:1px solid #27272a;margin:24px 0;" />`;
}

export function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;color:#71717a;font-size:13px;width:40%;">${label}</td>
    <td style="padding:8px 0;color:#fafafa;font-size:13px;font-weight:500;">${value}</td>
  </tr>`;
}

export function infoTable(rows: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${rows}</table>`;
}
