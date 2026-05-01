import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { sendEmail } from "@/lib/email/client";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const body = await req.json() as { to?: string };
  const { to } = body;

  if (!to) {
    return NextResponse.json({ error: "Missing 'to' address" }, { status: 400 });
  }

  const result = await sendEmail({
    from: "",
    to,
    subject: "Test email from your admin dashboard",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#0f0f0f;color:#fff;border-radius:12px;">
        <h2 style="margin:0 0 12px;font-size:20px;">✅ Email is working!</h2>
        <p style="color:#aaa;margin:0 0 24px;line-height:1.6;">
          This is a test email sent from your admin dashboard. If you received this, your Resend integration is correctly configured.
        </p>
        <hr style="border:none;border-top:1px solid #222;margin:24px 0;" />
        <p style="color:#555;font-size:12px;margin:0;">Sent from Admin → Settings → Email</p>
      </div>
    `,
  });

  if (!result) {
    return NextResponse.json({ error: "Failed to send — check your API key and from address in email settings." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: result.id });
}
