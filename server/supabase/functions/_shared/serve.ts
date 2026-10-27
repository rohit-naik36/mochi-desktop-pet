// Shared wrapper for the Edge Functions: one database pool, JSON in and out,
// and no logging of request bodies or addresses.
import postgres from 'npm:postgres@3.4.5';

export const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 3, prepare: false });

const HEADERS = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, x-pulse-key',
  'access-control-allow-methods': 'POST, OPTIONS',
  'cache-control': 'no-store',
};

const MAX_BODY = 16 * 1024;
const tooBig = () => new Response('{"ok":false,"reason":"too-big"}', { status: 413, headers: HEADERS });

type Out = { status: number; body: Record<string, unknown> };

export function serve(handle: (body: unknown, req: Request) => Promise<Out>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: HEADERS });
    if (req.method !== 'POST') return new Response('{"ok":false}', { status: 405, headers: HEADERS });
    // A weekly packet is well under 4 KB, so anything bigger is refused unread.
    if (Number(req.headers.get('content-length') || 0) > MAX_BODY) return tooBig();
    let body: unknown = null;
    try {
      const text = await req.text();
      if (text.length > MAX_BODY) return tooBig();
      body = JSON.parse(text);
    } catch { /* empty or not JSON */ }
    try {
      const out = await handle(body, req);
      return new Response(JSON.stringify(out.body), { status: out.status, headers: HEADERS });
    } catch (e) {
      console.error('failed:', (e as Error).message);
      return new Response('{"ok":false,"reason":"server"}', { status: 500, headers: HEADERS });
    }
  });
}
