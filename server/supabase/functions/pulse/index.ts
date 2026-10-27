// POST with header x-pulse-key -> the company's team totals for Mochi Pulse.
import { serve, sql } from '../_shared/serve.ts';
import { pulse } from '../_shared/core.ts';

serve((_body, req) => pulse(sql, req.headers.get('x-pulse-key')));
