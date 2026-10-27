// Mochi Pulse, set 2: the weekly question, wellness campaigns, and the
// reports HR takes to leadership (pilot report, quarterly review, BRSR
// figures). Everything here is built from the same team totals as the rest
// of the page: groups under 8 people never appear, and nothing is new data.
(function () {
  const S = window.PULSE_SAMPLE;
  const ALL = 'All teams';
  const $ = (id) => document.getElementById(id);

  // The same names as the app's campaign themes (src/campaigns.js).
  const THEMES = {
    hydration: 'Hydration week', movement: 'Move more week', eyes: 'Screen break week', sleep: 'Sleep well week',
    gratitude: 'Gratitude week', 'mental-health': 'Mental health week', breathe: 'Calm week', kindness: 'Kindness week',
  };

  const pct = (v) => (Number.isFinite(v) ? Math.round(v * 100) + '%' : '—');
  const pct1 = (v) => (Number.isFinite(v) ? (Math.round(v * 1000) / 10) + '%' : '—');
  const sgn = (v, digits = 2) => (Number.isFinite(v) ? (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(digits) : '—');
  const pts = (v) => (Number.isFinite(v) ? sgn(v * 100, 0) + ' pts' : '—');
  const day = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const monday = (d) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10); };
  const plusDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const mean = (rs, f) => (rs.length ? rs.reduce((a, r) => a + Number(f(r)), 0) / rs.length : NaN);

  function el(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
    for (const k of kids.flat()) if (k != null) e.append(k instanceof Node ? k : String(k));
    return e;
  }
  function table(head, rows, cls = 'mp-table') {
    return el('table', { class: cls }, el('thead', {}, el('tr', {}, head.map((h) => el('th', {}, h)))),
      el('tbody', {}, rows.map((r) => el('tr', {}, r.map((c) => el('td', {}, c))))));
  }

  // Data for one group, whatever the page is showing.
  function withScope(scope, fn) {
    const was = window.PULSE_SCOPE;
    window.PULSE_SCOPE = scope;
    try { return fn(); } finally { window.PULSE_SCOPE = was; }
  }
  const data = (id) => dash.data(id).data || [];

  // ---------- weekly question ----------

  function questionCard(q) {
    const card = el('div', { class: 'mp-card mp-q' },
      el('h3', {}, q.text),
      el('p', { class: 'mp-note' }, `${day(q.start)} to ${day(q.end)}` + (q.answered ? ` · about ${q.answered} answers` : '')));
    if (!q.counts) {
      card.append(el('p', { class: 'mp-note' }, 'Fewer than 8 people in this group answered, so there are no results to show.'));
      return card;
    }
    const total = q.counts.reduce((a, b) => a + b, 0) || 1;
    card.append(el('div', { class: 'mp-bars' }, q.options.map((o, i) => el('div', { class: 'mp-bar' },
      el('span', { class: 'lab' }, o),
      el('span', { class: 'track' }, el('span', { class: 'fill', style: `width:${Math.round(q.counts[i] / total * 100)}%` })),
      el('span', { class: 'val' }, pct(q.counts[i] / total))))));
    return card;
  }

  function drawQuestions() {
    const qs = data('questions');
    $('checkins').hidden = !(S.questions && S.questions[ALL] && S.questions[ALL].length);
    $('q-list').replaceChildren(...(qs.length ? qs.map(questionCard) : [el('p', { class: 'mp-note' }, 'No questions for this group yet.')]));
  }

  // ---------- campaigns ----------

  // What each theme hopes to move, measured in the campaign week against the
  // two weeks before it.
  const EFFECT = {
    hydration: ['Breaks with real time away', (r) => r.breaks_away / r.breaks_prompted, pct1, 'up'],
    movement: ['Breaks with real time away', (r) => r.breaks_away / r.breaks_prompted, pct1, 'up'],
    eyes: ['Breaks with real time away', (r) => r.breaks_away / r.breaks_prompted, pct1, 'up'],
    sleep: ['Active after bedtime', (r) => r.late_night_share, pct1, 'down'],
    'mental-health': ['Support contacts shown', (r) => r.support_shown, (v) => String(Math.round(v)), 'any'],
    breathe: ['Average mood', (r) => r.avg_mood, (v) => v.toFixed(2), 'up'],
    gratitude: ['Average mood', (r) => r.avg_mood, (v) => v.toFixed(2), 'up'],
    kindness: ['Average mood', (r) => r.avg_mood, (v) => v.toFixed(2), 'up'],
  };

  function campaignEffect(c, weekly) {
    const e = EFFECT[c.theme];
    const i = weekly.findIndex((r) => r.week === monday(c.start));
    if (!e || i < 1) return { text: 'Not enough weeks to compare', good: null };
    const [label, f, fmt, want] = e;
    const now = f(weekly[i]), before = mean(weekly.slice(Math.max(0, i - 2), i), f);
    if (!Number.isFinite(now) || !Number.isFinite(before)) return { text: 'Not enough weeks to compare', good: null };
    const good = want === 'any' ? null : want === 'up' ? now > before : now < before;
    return { text: `${label}: ${fmt(now)} (from ${fmt(before)})`, good };
  }

  function drawCampaigns() {
    const cs = S.campaigns || [];
    $('campaigns').hidden = !cs.length;
    const weekly = data('weekly');
    $('t-campaigns').tBodies[0].replaceChildren(...cs.map((c) => {
      const fx = campaignEffect(c, weekly);
      const td = el('td', fx.good === true ? { class: 'good' } : {}, fx.text);
      return el('tr', {}, el('td', {}, THEMES[c.theme] || c.theme), el('td', {}, `${day(c.start)} to ${day(c.end)}`), el('td', { class: 'wrap' }, c.note || '—'), td);
    }));
  }

  dash.onData(() => { drawQuestions(); drawCampaigns(); });

  // ---------- reports ----------

  // Next quarter's ideas, from what Pulse flagged.
  const PLAN = [
    [/-late$/, 'sleep', 'Late nights with falling mood'],
    [/-breaks$|^fake-breaks$/, 'movement', 'Breaks skipped or not really taken'],
    [/^theme-rise$|^support$/, 'mental-health', 'Worries or support needs rising'],
    [/^calls$/, 'breathe', 'Meeting load up'],
  ];

  function facts() {
    return withScope(ALL, () => {
      const weekly = data('weekly');
      const s = data('summary')[0] || {};
      const first = weekly.slice(0, 4), last = weekly.slice(-4);
      const latest = weekly[weekly.length - 1] || {};
      const share = (rs, a, b) => rs.reduce((x, r) => x + Number(r[a]), 0) / rs.reduce((x, r) => x + Number(r[b]), 0);
      return {
        weekly, s, first, last, latest,
        themes: data('themes'), issues: data('issues'), teams: data('teams_all'), questions: data('questions'),
        rows: [
          ['Active people per week', mean(first, (r) => r.active), mean(last, (r) => r.active), (v) => String(Math.round(v)), (a, b) => sgn(b - a, 0)],
          ['Average mood (1 to 5)', mean(first, (r) => r.avg_mood), mean(last, (r) => r.avg_mood), (v) => v.toFixed(2), (a, b) => sgn(b - a)],
          ['Break reminders clicked Done', share(first, 'breaks_taken', 'breaks_prompted'), share(last, 'breaks_taken', 'breaks_prompted'), pct, (a, b) => pts(b - a)],
          ['Breaks with real time away', share(first, 'breaks_away', 'breaks_prompted'), share(last, 'breaks_away', 'breaks_prompted'), pct, (a, b) => pts(b - a)],
          ['Active after bedtime', mean(first, (r) => r.late_night_share), mean(last, (r) => r.late_night_share), pct, (a, b) => pts(b - a)],
          ['Worry chats per week', mean(first, (r) => r.worry_chats), mean(last, (r) => r.worry_chats), (v) => String(Math.round(v)), (a, b) => sgn(b - a, 0)],
          ['Support contacts shown per week', mean(first, (r) => r.support_shown), mean(last, (r) => r.support_shown), (v) => String(Math.round(v)), (a, b) => sgn(b - a, 0)],
          ['Hours on calls per person, weekly', mean(first, (r) => r.call_hours_per_person), mean(last, (r) => r.call_hours_per_person), (v) => v.toFixed(1), (a, b) => sgn(b - a, 1)],
        ],
      };
    });
  }

  function period(weekly) {
    const a = weekly[0].week, b = plusDays(weekly[weekly.length - 1].week, 6);
    return `${day(a)} to ${day(b)} · ${weekly.length} weeks`;
  }

  function buildReport(kind) {
    const f = facts();
    const title = kind === 'pilot' ? 'Pilot report' : 'Quarterly wellbeing review';
    const activeShare = f.latest.enrolled ? f.latest.active / f.latest.enrolled : NaN;
    const [, moodA, moodB] = f.rows[1], [, awayA, awayB] = f.rows[3], [, lateA, lateB] = f.rows[4];
    const r = $('report');
    r.replaceChildren(
      el('header', {},
        el('p', { class: 'eyebrow' }, 'Mochi for Teams · Mochi Pulse'),
        el('h1', {}, title),
        el('p', { class: 'lede' }, `${S.company} · ${period(f.weekly)}`),
        S.sample ? el('p', { class: 'badge' }, 'Sample data for a demo, not real people') : null),
      el('section', {},
        el('h2', {}, 'Summary'),
        el('p', {}, `In the latest week, ${f.latest.active} of ${f.latest.enrolled} enrolled people used Mochi (${pct(activeShare)}). ` +
          `Average mood moved ${sgn(moodB - moodA)} points between the first and last four weeks. ` +
          `Breaks with real time away from the keyboard went from ${pct(awayA)} to ${pct(awayB)} of reminders, ` +
          `and the share of people still on their laptop after bedtime went from ${pct(lateA)} to ${pct(lateB)}.`)),
      el('section', {},
        el('h2', {}, 'First four weeks against the last four'),
        table(['Measure', 'First 4 weeks', 'Last 4 weeks', 'Change'], f.rows.map(([k, a, b, fmt, ch]) => [k, fmt(a), fmt(b), ch(a, b)]))),
      el('section', {},
        el('h2', {}, 'What people worry about'),
        el('p', { class: 'note' }, 'Share of worry chats by theme. Mochi sorts each worry into a theme on the laptop; the words never leave it.'),
        table(['Theme', 'First month', 'Last month'], f.themes.filter((t) => t.first_month || t.last_month)
          .sort((a, b) => b.last_month - a.last_month).map((t) => [t.theme, pct(t.first_month), pct(t.last_month)]))),
      f.questions.length ? el('section', {},
        el('h2', {}, 'Weekly questions'),
        f.questions.map((q) => el('div', { class: 'q' },
          el('h3', {}, q.text),
          el('p', { class: 'note' }, `${day(q.start)} to ${day(q.end)}` + (q.answered ? ` · about ${q.answered} answers` : ' · fewer than 8 answers, not shown')),
          q.counts ? table(['Answer', 'Share'], q.options.map((o, i) => [o, pct(q.counts[i] / (q.counts.reduce((a, b) => a + b, 0) || 1))])) : null))) : null,
      (S.campaigns || []).length ? el('section', {},
        el('h2', {}, 'Wellness campaigns'),
        table(['Campaign', 'Dates', 'During the campaign'], S.campaigns.map((c) => [THEMES[c.theme] || c.theme, `${day(c.start)} to ${day(c.end)}`, campaignEffect(c, f.weekly).text]))) : null,
      el('section', {},
        el('h2', {}, 'By team, last four weeks'),
        table(['Team', 'People', 'Active', 'Mood', 'Mood change', 'After bedtime', 'Breaks skipped', 'Top worry'],
          f.teams.map((t) => (t.hidden ? [t.team, 'under 8', 'hidden', '', '', '', '', ''] : [t.team, t.people, pct(t.active_share), Number(t.avg_mood).toFixed(2), sgn(Number(t.mood_change)), pct(t.late_night_share), pct(t.breaks_skipped), t.top_theme])))),
      el('section', {},
        el('h2', {}, kind === 'pilot' ? 'What Pulse flagged, with suggested actions' : 'Flagged this quarter, with suggested actions'),
        f.issues.length ? f.issues.map((i) => el('div', { class: 'issue ' + i.level },
          el('h3', {}, `${i.issue} · ${i.area}`), el('p', {}, i.evidence), el('p', {}, el('b', {}, 'Suggested: '), i.initiative)))
          : el('p', {}, 'Nothing was flagged.')),
      kind === 'quarter' ? planSection(f) : verdictSection(f, activeShare),
      el('footer', {},
        el('p', {}, 'How these numbers are made: each person chooses to add their counts to team totals. Counts are worked out on their laptop and sent once a week with no name, email or device ID. ' +
          'Groups under 8 people are hidden and counts are rounded to the nearest 5, so no one can be picked out. Nothing anyone typed to Mochi is ever sent.'),
        el('p', {}, `Made with Mochi Pulse on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. Little Smoke Studio · hello@mochicuddle.com`)));
  }

  function verdictSection(f, activeShare) {
    const [, moodA, moodB] = f.rows[1], [, awayA, awayB] = f.rows[3];
    const better = [moodB - moodA > 0.02 && 'mood went up', awayB - awayA > 0.02 && 'more breaks were real'].filter(Boolean);
    const adopted = activeShare >= 0.4;
    const text = adopted && better.length
      ? `People kept using Mochi (${pct(activeShare)} active in the latest week) and ${better.join(' and ')}. That supports rolling it out to more teams.`
      : adopted
        ? `People kept using Mochi (${pct(activeShare)} active in the latest week), but mood and breaks held steady. A campaign aimed at the flagged issues would show whether it can move them.`
        : `Only ${pct(activeShare)} of enrolled people were active in the latest week. A launch session and a reminder from team leads usually lift this before a decision.`;
    return el('section', { class: 'verdict' }, el('h2', {}, 'What the numbers suggest'), el('p', {}, text));
  }

  function planSection(f) {
    const ideas = [];
    for (const i of f.issues) {
      const hit = PLAN.find(([re]) => re.test(i.id));
      if (hit && !ideas.some((x) => x[1] === hit[1])) ideas.push([hit[2] + ` (${i.area})`, hit[1]]);
    }
    if (!ideas.length) ideas.push(['Keep the good habits going', 'gratitude']);
    return el('section', { class: 'keep' },
      el('h2', {}, 'Plan for next quarter'),
      table(['Because of', 'Suggested campaign'], ideas.slice(0, 3).map(([why, theme]) => [why, THEMES[theme]])),
      el('p', { class: 'note' }, 'Repeat one weekly question from this quarter to see how answers change, and send us the campaign dates. We set them up for you.'));
  }

  // BRSR, Principle 3 (employee well-being): figures the company can use in
  // its disclosures. The company's compliance team decides what to report.
  function brsrCsv() {
    const f = facts();
    const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const per = period(f.weekly);
    const seats = window.PULSE_SEATS;
    const rows = [
      ['Measure', 'Value', 'Period', 'How it is measured'],
      ['Wellbeing programme', 'Mochi for Teams (desk wellbeing companion)', per, 'Software licence from Little Smoke Studio (Unorthologic LLP)'],
      ...(seats && seats.committed ? [['Employees with access (licensed seats)', seats.committed, per, 'Seats on the contract']] : []),
      ...(seats && seats.months && seats.months[0] ? [['Laptops using it this month', seats.months[0].active, seats.months[0].month, 'Monthly licence check-ins']] : []),
      ['People enrolled in team totals, latest week', f.latest.enrolled, per, 'People who chose to add their counts; rounded to 5'],
      ['Active people, average per week', Math.round(mean(f.weekly, (r) => r.active)), per, 'Rounded to 5 each week'],
      ['Break reminders acted on', pct(f.weekly.reduce((a, r) => a + r.breaks_taken, 0) / f.weekly.reduce((a, r) => a + r.breaks_prompted, 0)), per, 'Water, stretch and eye-rest reminders marked Done'],
      ['Breaks with real time away', pct(f.weekly.reduce((a, r) => a + r.breaks_away, 0) / f.weekly.reduce((a, r) => a + r.breaks_prompted, 0)), per, 'No keyboard or mouse for 20 to 60 seconds after Done'],
      ['Times support contacts were shown', f.weekly.reduce((a, r) => a + Number(r.support_shown), 0), per, 'EAP, HR, POSH and helpline details shown in Mochi'],
      ['Average mood, first 4 weeks to last 4 weeks', `${f.rows[1][1].toFixed(2)} to ${f.rows[1][2].toFixed(2)}`, per, 'Optional mood check-ins, 1 to 5'],
      ['Wellness campaigns run', (S.campaigns || []).length, per, (S.campaigns || []).map((c) => THEMES[c.theme] || c.theme).join('; ')],
      ['Weekly check-in questions asked', f.questions.length, per, 'Anonymous; results shown for 8 or more answers'],
      [],
      ['Note', 'For BRSR Principle 3 (employee well-being) disclosures. Team totals only: groups under 8 are hidden and counts are rounded to 5. Your compliance team decides what to report.'],
    ];
    return rows.map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';
  }

  const fname = (what) => `${S.company} - ${what} - ${new Date().toISOString().slice(0, 10)}`;

  async function savePdf(kind) {
    buildReport(kind);
    const name = fname(kind === 'pilot' ? 'Mochi pilot report' : 'Mochi quarterly review');
    if (window.pulseApp) return window.pulseApp.savePdf(name);
    window.print(); // in a browser: the print dialog can save as PDF
    return true;
  }

  async function saveCsv() {
    const name = fname('BRSR wellbeing figures');
    const text = brsrCsv();
    if (window.pulseApp) return window.pulseApp.saveCsv(name, text);
    const a = el('a', { href: URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })), download: name + '.csv' });
    a.click();
    return true;
  }

  for (const [id, run] of [['r-pilot', () => savePdf('pilot')], ['r-quarter', () => savePdf('quarter')], ['r-brsr', saveCsv]]) {
    $(id).addEventListener('click', async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      $('r-msg').textContent = '';
      try { if (await run()) $('r-msg').textContent = 'Saved.'; } catch (err) {
        console.error(err);
        $('r-msg').textContent = "Couldn't save the file. Try again, or pick another folder.";
      } finally { b.disabled = false; }
    });
  }

  // For tests and the print preview.
  window.PulseReports = { buildReport, brsrCsv, campaignEffect, THEMES };
})();
