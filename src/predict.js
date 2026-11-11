// Mochi learns, on this computer only, when you tend to act on a reminder.
// Counts per hour of the week, nothing else: no words, no finer time. Pure
// functions, so they can be tested without a window.
(function (root) {
  const NUDGES = ['water', 'stretch', 'eyes'];
  const SLOTS = 168; // 24 hours x 7 days, Monday 00:00 = 0
  const DECAY = 0.97; // each new outcome fades the slot's older ones a little
  const NEIGHBOUR = 0.5; // the hour either side counts at half weight
  const MIN_N = 14; // fewer observations than this: not ready, use the fixed timer
  const Z = 1.28; // about an 80% lower bound
  const THRESHOLD = 0.5; // act on a reminder only when the lower bound reaches this
  const STEP_MIN = 15;

  const zeros = () => new Array(SLOTS).fill(0);

  function fresh() {
    const w = {};
    for (const n of NUDGES) w[n] = { a: zeros(), b: zeros() };
    return { v: 1, on: true, w };
  }

  const okArr = (x) => Array.isArray(x) && x.length === SLOTS && x.every((n) => Number.isFinite(n) && n >= 0);

  // Anything that is not a well-formed rhythm (missing, old, damaged) becomes an empty one.
  function sanitize(x) {
    const f = fresh();
    if (!x || typeof x !== 'object' || x.v !== 1 || !x.w || !NUDGES.every((n) => x.w[n] && okArr(x.w[n].a) && okArr(x.w[n].b))) return f;
    for (const n of NUDGES) f.w[n] = { a: x.w[n].a.slice(), b: x.w[n].b.slice() };
    if (typeof x.on === 'boolean') f.on = x.on;
    return f;
  }

  function slotOf(d) {
    return ((d.getDay() + 6) % 7) * 24 + d.getHours();
  }

  function record(r, nudge, outcome, d) {
    if (!NUDGES.includes(nudge) || (outcome !== 'acted' && outcome !== 'ignored')) return;
    const s = slotOf(d), c = r.w[nudge];
    c.a[s] *= DECAY;
    c.b[s] *= DECAY;
    (outcome === 'acted' ? c.a : c.b)[s] += 1;
  }

  // Beta(1,1) prior plus the slot's counts and half of each neighbour's.
  function range(a, b, n) {
    const A = a + 1, B = b + 1, p = A / (A + B), sd = Math.sqrt((p * (1 - p)) / (A + B + 1));
    return { p, lo: Math.max(0, p - Z * sd), hi: Math.min(1, p + Z * sd), n, ready: n >= MIN_N };
  }

  function predict(r, nudge, d) {
    const c = r.w[nudge], s = slotOf(d), lo = (s + SLOTS - 1) % SLOTS, hi = (s + 1) % SLOTS;
    const a = c.a[s] + NEIGHBOUR * (c.a[lo] + c.a[hi]);
    const b = c.b[s] + NEIGHBOUR * (c.b[lo] + c.b[hi]);
    return range(a, b, a + b);
  }

  function should(r, nudge, d) {
    const x = predict(r, nudge, d);
    return !x.ready || x.lo >= THRESHOLD;
  }

  // Minutes to wait before showing a reminder that was due at dueSince: 0 = show it now.
  // Never waits past maxMin in total, and only waits for a slot that looks better.
  function wait(r, nudge, now, dueSince, maxMin) {
    const left = maxMin - (now - dueSince) / 60000;
    if (left <= 0 || should(r, nudge, now)) return 0;
    for (let m = STEP_MIN; m <= left; m += STEP_MIN) {
      if (should(r, nudge, new Date(now.getTime() + m * 60000))) return m;
    }
    return 0;
  }

  root.Predict = { NUDGES, SLOTS, fresh, sanitize, slotOf, record, predict, should, wait };
  if (typeof module !== 'undefined') module.exports = root.Predict;
})(typeof window !== 'undefined' ? window : globalThis);
