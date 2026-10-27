// POST { code, install, tenant?, domain?, version? } -> the company's settings.
import { serve, sql } from '../_shared/serve.ts';
import { checkin } from '../_shared/core.ts';

serve((body) => checkin(sql, Deno.env.get('SEAT_PEPPER')!, body));
