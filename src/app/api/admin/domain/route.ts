import { NextRequest, NextResponse } from 'next/server';
import { assertAdmin } from '@/lib/auth/assert-admin';

const VERCEL_API = 'https://api.vercel.com';

async function vercelRequest(path: string, method: string, body?: object) {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) throw new Error('Vercel credentials not configured');

  const res = await fetch(`${VERCEL_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export async function POST(req: NextRequest) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;
  try {
    const { domain } = await req.json() as { domain: string };
    if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 });

    const projectId = process.env.VERCEL_PROJECT_ID;

    // Add domain to Vercel project
    const { ok, data } = await vercelRequest(`/v9/projects/${projectId}/domains`, 'POST', { name: domain });

    if (!ok && data?.error?.code !== 'domain_already_in_use') {
      return NextResponse.json({ error: data?.error?.message ?? 'Failed to add domain' }, { status: 400 });
    }

    await admin.from('site_settings').upsert({ key: 'custom_domain', value: domain }, { onConflict: 'key' });

    // Get verification records
    const { data: verifyData } = await vercelRequest(`/v9/projects/${projectId}/domains/${domain}`, 'GET');

    return NextResponse.json({
      success: true,
      verification: verifyData?.verification ?? [],
      cname: 'cname.vercel-dns.com',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;
  try {
    const { domain } = await req.json() as { domain: string };
    if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 });

    const projectId = process.env.VERCEL_PROJECT_ID;
    await vercelRequest(`/v9/projects/${projectId}/domains/${domain}`, 'DELETE');

    await admin.from('site_settings').delete().eq('key', 'custom_domain');

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
