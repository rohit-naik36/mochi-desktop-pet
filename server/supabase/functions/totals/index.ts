// POST { code, team, week, packet } -> stores one laptop's weekly counts.
import { serve, sql } from '../_shared/serve.ts';
import { totals } from '../_shared/core.ts';

serve((body) => totals(sql, body));
