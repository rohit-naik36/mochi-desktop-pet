const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const Campaigns = require('../src/campaigns');
const Company = require('../src/company');
const Insights = require('../src/insights');
const I18N = require('../src/i18n');

test('the app and the server know the same campaign themes', () => {
  const core = fs.readFileSync(path.join(__dirname, '../server/supabase/functions/_shared/core.ts'), 'utf8');
  const server = core.match(/CAMPAIGN_THEMES = \[([^\]]*)\]/)[1].match(/'([a-z-]+)'/g).map((x) => x.slice(1, -1));
  assert.deepStrictEqual(Object.keys(Campaigns.THEMES).sort(), server.sort());
});

test('every theme has lines in every language, and they fill in cleanly', () => {
  for (const [id, t] of Object.entries(Campaigns.THEMES)) {
    for (const lang of ['en', 'hi', 'hinglish']) {
      assert.ok(t[lang].length >= 3, `${id} ${lang}`);
      for (const l of t[lang]) {
        const out = I18N.fill(lang, l, { gender: 'female', pet: 'Mochi' });
        assert.ok(!/[{}]/.test(out), `${id} ${lang}: ${out}`);
        assert.ok(out.length <= 140, `${id} ${lang} too long for the bubble: ${out}`);
      }
    }
    if (t.action) assert.ok(I18N.t('en', 'company.go.' + t.action), `${id} button label`);
  }
});

test('the campaign running today', () => {
  const list = [{ theme: 'sleep', start: '2026-11-01', end: '2026-11-07' }, { theme: 'nope', start: '2026-11-01', end: '2026-11-30' }];
  assert.strictEqual(Campaigns.active(list, '2026-11-07').theme, 'sleep');
  assert.strictEqual(Campaigns.active(list, '2026-11-08'), null);
});

test('a company file keeps only valid campaigns and questions', () => {
  const c = Company.clean({
    code: 'ACME-2026', name: 'Acme',
    campaigns: [
      { id: 'ok', theme: 'hydration', start: '2026-11-01', end: '2026-11-05', note: 'x'.repeat(300) },
      { id: 'Bad Id', theme: 'hydration', start: '2026-11-01', end: '2026-11-05' },
      { id: 'unknown', theme: 'free-pizza', start: '2026-11-01', end: '2026-11-05' },
      { id: 'backwards', theme: 'sleep', start: '2026-11-05', end: '2026-11-01' },
    ],
    questions: [
      { id: 'q1', text: 'How was your week?', options: ['Good', 'Okay', 'Hard'], start: '2026-11-01', end: '2026-11-07' },
      { id: 'q2', text: 'One option only', options: ['Yes'], start: '2026-11-01', end: '2026-11-07' },
      { id: 'q3', text: 'Too many', options: ['1', '2', '3', '4', '5', '6'], start: '2026-11-01', end: '2026-11-07' },
    ],
  });
  assert.deepStrictEqual(c.campaigns.map((x) => x.id), ['ok']);
  assert.strictEqual(c.campaigns[0].note.length, 100);
  assert.deepStrictEqual(c.questions.map((x) => x.id), ['q1']);
});

test('an answer is an id and an option number, nothing else', () => {
  const store = {};
  const d = new Date(2026, 10, 11);
  Insights.record(store, 'answer', { q: 'q1', a: 2, note: 'I hate my job' }, d);
  Insights.record(store, 'answer', { q: 'q1', a: 'two' }, d); // ignored
  Insights.record(store, 'answer', 'free text', d); // ignored
  const p = Insights.packet(store, { id: 'acme' }, Insights.weekKey(d));
  assert.deepStrictEqual(p.answer, { q: 'q1', a: 2 });
  assert.ok(!JSON.stringify(p).includes('hate'));
  assert.ok(!('answer' in Insights.packet({}, { id: 'acme' }, Insights.weekKey(d))));
});

test('Mochi Pulse names the themes the same way as the app', () => {
  const src = fs.readFileSync(path.join(__dirname, '../pulse/reports.js'), 'utf8');
  const block = src.match(/const THEMES = \{([\s\S]*?)\};/)[1];
  const pulse = Object.fromEntries([...block.matchAll(/'?([a-z-]+)'?: '([^']+)'/g)].map((m) => [m[1], m[2]]));
  assert.deepStrictEqual(pulse, Object.fromEntries(Object.entries(Campaigns.THEMES).map(([k, t]) => [k, t.name])));
});
