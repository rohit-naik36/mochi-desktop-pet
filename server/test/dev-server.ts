// A local stand-in for the Supabase functions, for trying the app against a
// real database: bun test/dev-server.ts (needs DATABASE_URL and PORT).
import postgres from 'postgres';
import { checkin, totals, pulse } from '../supabase/functions/_shared/core.ts';

const sql = postgres(process.env.DATABASE_URL!, { onnotice: () => {} });
const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, x-pulse-key' };

Bun.serve({
  port: Number(process.env.PORT || 8787),
  async fetch(req) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const body = await req.json().catch(() => null);
    const name = new URL(req.url).pathname.split('/').pop();
    const out = name === 'checkin' ? await checkin(sql, 'dev-pepper', body)
      : name === 'totals' ? await totals(sql, body)
      : name === 'pulse' ? await pulse(sql, req.headers.get('x-pulse-key'))
      : { status: 404, body: { ok: false } };
    return new Response(JSON.stringify(out.body), { status: out.status, headers });
  },
});
console.log('dev server on', process.env.PORT || 8787);
