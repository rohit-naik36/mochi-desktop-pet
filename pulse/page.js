dash.calc('summary', {
  inputs: ['weekly'],
  title: 'Last 4 weeks vs first 4',
  description: 'Averages and totals for the last 4 weeks of the pilot, and their change from the first 4 weeks.',
  fn: (weekly) => {
    const first = weekly.slice(0, 4), last = weekly.slice(-4);
    const mean = (rs, f) => rs.reduce((s, r) => s + Number(r[f]), 0) / rs.length;
    const sum = (rs, f) => rs.reduce((s, r) => s + Number(r[f]), 0);
    const share = rs => sum(rs, 'breaks_taken') / sum(rs, 'breaks_prompted');
    const away = rs => sum(rs, 'breaks_away') / sum(rs, 'breaks_prompted');
    const r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000;
    return [{
      mood_last4: r2(mean(last, 'avg_mood')),
      mood_change: r2(mean(last, 'avg_mood') - mean(first, 'avg_mood')),
      breaks_last4: r3(share(last)),
      breaks_change_pts: Math.round((share(last) - share(first)) * 1000) / 10,
      away_last4: r3(away(last)),
      away_change_pts: Math.round((away(last) - away(first)) * 1000) / 10,
      calls_last4: Math.round(mean(last, 'call_hours_per_person') * 10) / 10,
      calls_change: r3(mean(last, 'call_hours_per_person') / mean(first, 'call_hours_per_person') - 1),
      late_last4: r3(mean(last, 'late_night_share')),
      late_change_pts: Math.round((mean(last, 'late_night_share') - mean(first, 'late_night_share')) * 1000) / 10,
      worry_last4: sum(last, 'worry_chats'),
      worry_change: r3(sum(last, 'worry_chats') / sum(first, 'worry_chats') - 1),
      support_last4: sum(last, 'support_shown'),
      support_first4: sum(first, 'support_shown')
    }];
  }
});

dash.calc('habits', {
  inputs: ['weekly'],
  title: 'Weekly habits',
  description: 'Share of break reminders people clicked Done on, share where the keyboard and mouse really went quiet afterwards, and share of active people online after bedtime, each week.',
  fn: (weekly) => weekly.map(r => ({
    week: r.week,
    breaks_taken_share: Math.round(Number(r.breaks_taken) / Number(r.breaks_prompted) * 1000) / 1000,
    breaks_away_share: Math.round(Number(r.breaks_away) / Number(r.breaks_prompted) * 1000) / 1000,
    late_night_share: Number(r.late_night_share)
  }))
});

dash.calc('privacy', {
  inputs: ['teams_all'],
  title: 'Hidden teams',
  description: 'Teams left out because fewer than 8 people use Mochi there.',
  fn: (teams) => [{ hidden_teams: teams.filter(t => t.hidden === true || t.hidden === 'true').length }]
});

dash.calc('issues', {
  inputs: ['teams', 'themes', 'summary'],
  title: 'Flagged issues',
  description: 'Rules Mochi Pulse applies to groups of 8 or more, each with a suggested initiative.',
  fn: (teams, themes, summary) => {
    const pct = v => Math.round(v * 100) + '%';
    const out = [];
    for (const t of teams.filter(t => !(t.hidden === true || t.hidden === 'true'))) {
      const late = Number(t.late_night_share), mood = Number(t.mood_change), skip = Number(t.breaks_skipped);
      if (late >= 0.2 && mood <= -0.3) out.push({ id: t.team + '-late', level: 'high', area: t.team,
        issue: 'Late nights and falling mood',
        evidence: pct(late) + ' active after bedtime and mood down ' + Math.abs(mood).toFixed(2) + ' points. Top worry: ' + t.top_theme.toLowerCase() + '.',
        initiative: 'Review release workload with team leads, agree no-message hours after 9 pm, and give a recovery day after the release.' });
      if (skip >= 0.55) out.push({ id: t.team + '-breaks', level: 'watch', area: t.team,
        issue: 'Breaks are being skipped',
        evidence: pct(skip) + ' of break reminders ignored. Top worry: ' + t.top_theme.toLowerCase() + '.',
        initiative: 'Build a 5-minute break into the call roster every 2 hours and run a short team stretch each afternoon.' });
      if (t.top_theme === 'Money') out.push({ id: t.team + '-money', level: 'watch', area: t.team,
        issue: 'Money is the top worry',
        evidence: 'Money leads worry chats in this team, while its mood is steady (' + (mood >= 0 ? '+' : '') + mood.toFixed(2) + ').',
        initiative: 'Offer a financial wellness session through your EAP and explain how incentives and payouts work.' });
      if (mood >= 0.1) out.push({ id: t.team + '-good', level: 'good', area: t.team,
        issue: 'Mood is improving',
        evidence: 'Mood up ' + mood.toFixed(2) + ' points with only ' + pct(late) + ' after bedtime.',
        initiative: 'Ask the team what helped and share it with other managers.' });
    }
    const rise = themes.map(t => ({ ...t, d: Number(t.last_month) - Number(t.first_month) })).sort((a, b) => b.d - a.d)[0];
    if (rise && rise.d >= 0.05) out.push({ id: 'theme-rise', level: 'high', area: window.PULSE_SCOPE === 'All teams' ? 'Whole company' : window.PULSE_SCOPE,
      issue: rise.theme + ' worries are rising',
      evidence: 'Now ' + pct(Number(rise.last_month)) + ' of worry chats, up from ' + pct(Number(rise.first_month)) + ' in the first month.',
      initiative: 'Raise workload at the next leadership meeting and remind everyone how to reach the EAP counsellors.' });
    const s = summary[0];
    if (s && s.support_last4 > s.support_first4) out.push({ id: 'support', level: 'watch', area: window.PULSE_SCOPE === 'All teams' ? 'Whole company' : window.PULSE_SCOPE,
      issue: 'More people needed support contacts',
      evidence: 'Mochi showed helpline and EAP details about ' + s.support_last4 + ' times in the last 4 weeks, against about ' + s.support_first4 + ' in the first 4.',
      initiative: 'Share the EAP and Tele-MANAS (14416) again, and train two mental health first aiders per floor.' });
    if (s && s.calls_change >= 0.2) out.push({ id: 'calls', level: 'watch', area: window.PULSE_SCOPE === 'All teams' ? 'Whole company' : window.PULSE_SCOPE,
      issue: 'Meeting load is up',
      evidence: 'About ' + s.calls_last4 + ' hours a week on calls per person, ' + pct(s.calls_change) + ' more than in the first month.',
      initiative: 'Try 25 and 50 minute default meetings, and one meeting-free afternoon a week.' });
    if (s && s.away_last4 < s.breaks_last4 * 0.6) out.push({ id: 'fake-breaks', level: 'watch', area: window.PULSE_SCOPE === 'All teams' ? 'Whole company' : window.PULSE_SCOPE,
      issue: 'Breaks are accepted but not taken',
      evidence: pct(s.breaks_last4) + ' of reminders get a Done, but only ' + pct(s.away_last4) + ' are followed by real time away from the keyboard.',
      initiative: 'Ask managers to take visible breaks themselves, and leave 5 minutes between back-to-back meetings.' });
    const rank = { high: 0, watch: 1, good: 2 };
    return out.sort((a, b) => rank[a.level] - rank[b.level]);
  }
});

dash.calc('issue_count', {
  inputs: ['issues'],
  title: 'Issues needing action',
  description: 'Flagged issues that are high or to watch, leaving out what is going well.',
  fn: (issues) => [{ needs_action: issues.filter(i => i.level !== 'good').length }]
});

(function () {
  const f1 = d3.format('.1%'), f0 = d3.format('.0%'), fc = d3.format(','), wk = d3.utcFormat('%b %-d');
  const sgn = (v, f) => (v > 0 ? '+' : v < 0 ? '−' : '±') + f(Math.abs(v));
  const OK = 'ok';

  function gate(el, id) {
    const st = dash.data(id).status;
    if (st === OK) { el.classList.remove('dash-skeleton'); return true; }
    el.replaceChildren();
    if (st === 'loading') { el.classList.add('dash-skeleton'); return false; }
    el.classList.remove('dash-skeleton');
    if (st === 'error') { const d = document.createElement('div'); d.className = 'mp-fail'; d.textContent = 'Failed to load'; el.appendChild(d); }
    return false;
  }
  function fill(el, txt, cls) { el.classList.remove('dash-skeleton'); el.textContent = txt; if (cls !== undefined) el.className = cls; }
  function svgIn(el, h) {
    el.replaceChildren();
    const w = Math.max(240, el.clientWidth);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${w} ${h}`).attr('height', h);
    return { svg, w };
  }
  function textW(svg, strs, cls) {
    const t = svg.append('text').attr('class', cls || 'mp-tick');
    let m = 0; for (const s of strs) { t.text(s); m = Math.max(m, t.node().getComputedTextLength()); }
    t.remove(); return m;
  }
  function tipFor(el) { const t = document.createElement('div'); t.className = 'mp-tip'; t.hidden = true; el.appendChild(t); return t; }
  function showTip(el, t, head, lines, x, y) {
    t.replaceChildren();
    const h = document.createElement('div'); h.className = 'h'; h.textContent = head; t.appendChild(h);
    for (const l of lines) {
      const d = document.createElement('div');
      if (l.color) { const s = document.createElement('span'); s.className = 'mp-sw'; s.style.background = l.color; if (l.op) s.style.opacity = l.op; d.appendChild(s); }
      d.appendChild(document.createTextNode(l.text)); t.appendChild(d);
    }
    t.hidden = false;
    const left = Math.max(0, Math.min(x + 12, el.clientWidth - t.offsetWidth));
    t.style.left = left + 'px'; t.style.top = Math.max(0, y - t.offsetHeight - 10) + 'px';
  }
  function legend(id, items) {
    const el = document.getElementById(id); el.replaceChildren();
    for (const it of items) { const s = document.createElement('span'); const sw = document.createElement('i'); sw.className = 'mp-sw'; sw.style.background = it.color; sw.style.opacity = it.op || 1; s.append(sw, it.name); el.appendChild(s); }
  }

  const MOODS = [
    { key: 'very_low', name: 'Very low', color: 'var(--color-bad)', op: 1 },
    { key: 'low', name: 'Low', color: 'var(--color-bad)', op: .5 },
    { key: 'okay', name: 'Okay', color: 'var(--cds-chart-muted)', op: 1 },
    { key: 'good', name: 'Good', color: 'var(--color-ok)', op: .5 },
    { key: 'great', name: 'Great', color: 'var(--color-ok)', op: 1 }
  ];
  legend('mood-legend', MOODS.slice().reverse());

  function moodChart() {
    const el = document.getElementById('c-mood');
    if (!gate(el, 'emotions')) return;
    const rows = dash.data('emotions').data.map(r => { const o = { week: new Date(r.week) }; MOODS.forEach(m => o[m.key] = Number(r[m.key])); return o; });
    const H = 240, { svg, w } = svgIn(el, H);
    const m = { t: 8, r: 4, b: 26, l: textW(svg, ['100%']) + 8 };
    const x = d3.scaleBand(rows.map(r => r.week), [m.l, w - m.r]).padding(.28);
    const y = d3.scaleLinear([0, 1], [H - m.b, m.t]);
    svg.append('g').selectAll('line').data([0, .5, 1]).join('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y).attr('y2', y).style('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data([0, .5, 1]).join('text').attr('class', 'mp-tick').attr('x', m.l - 6).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').text(f0);
    const series = d3.stack().keys(MOODS.map(m => m.key))(rows);
    const tip = tipFor(el);
    series.forEach((s, i) => {
      svg.append('g').selectAll('rect').data(s).join('rect')
        .attr('x', d => x(d.data.week)).attr('width', x.bandwidth())
        .attr('y', d => y(d[1])).attr('height', d => Math.max(0, y(d[0]) - y(d[1])))
        .style('fill', MOODS[i].color).attr('fill-opacity', MOODS[i].op);
    });
    const step = w < 520 ? 3 : 2;
    svg.append('g').selectAll('text').data(rows.filter((_, i) => i % step === 0)).join('text').attr('class', 'mp-tick')
      .attr('x', d => x(d.week) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').text(d => wk(d.week));
    svg.append('g').selectAll('rect').data(rows).join('rect').attr('x', d => x(d.week) - x.step() * x.paddingInner() / 2).attr('width', x.step())
      .attr('y', m.t).attr('height', H - m.t - m.b).style('fill', 'transparent')
      .on('mousemove', (ev, d) => { const [px, py] = d3.pointer(ev, el); showTip(el, tip, 'Week of ' + wk(d.week), MOODS.slice().reverse().map(mm => ({ color: mm.color, op: mm.op, text: mm.name + '  ' + f0(d[mm.key]) })), px, py); })
      .on('mouseleave', () => { tip.hidden = true; });
  }

  // series: [{ key, label, color }]; the first gets a soft area under its line.
  function lineChart(id, src, series, fmt, tickFmt) {
    const el = document.getElementById(id);
    if (!gate(el, src)) return;
    const rows = dash.data(src).data.map(r => { const o = { week: new Date(r.week) }; series.forEach(s => o[s.key] = Number(r[s.key])); return o; });
    const H = 220, { svg, w } = svgIn(el, H);
    const max = d3.max(rows, r => d3.max(series, s => r[s.key]));
    const ticks = d3.ticks(0, max * 1.1, 4), top = Math.max(max * 1.1, ticks[ticks.length - 1]);
    const last = rows[rows.length - 1];
    const ends = series.map(s => ({ s, txt: s.label + ' ' + fmt(last[s.key]) }));
    const m = { t: 12, r: textW(svg, ends.map(e => series.length > 1 ? e.txt : fmt(last[e.s.key])), 'mp-lab') + 10, b: 26, l: textW(svg, ticks.map(tickFmt)) + 8 };
    const x = d3.scaleUtc(d3.extent(rows, r => r.week), [m.l, w - m.r]);
    const y = d3.scaleLinear([0, top], [H - m.b, m.t]);
    svg.append('g').selectAll('line').data(ticks).join('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y).attr('y2', y).style('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(ticks).join('text').attr('class', 'mp-tick').attr('x', m.l - 6).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').text(tickFmt);
    const xt = [rows[0].week, rows[Math.floor(rows.length / 2)].week, last.week];
    svg.append('g').selectAll('text').data(xt).join('text').attr('class', 'mp-tick').attr('x', x).attr('y', H - 8)
      .attr('text-anchor', (d, i) => i === 0 ? 'start' : i === 2 ? 'end' : 'middle').text(wk);
    const s0 = series[0], gid = 'g-' + id;
    const grad = svg.append('defs').append('linearGradient').attr('id', gid).attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
    [[0, .26], [.25, .16], [.5, .08], [.75, .03], [1, 0]].forEach(([o, a]) => grad.append('stop').attr('offset', o).attr('style', `stop-color:${s0.color};stop-opacity:${a}`));
    svg.append('path').datum(rows).style('fill', `url(#${gid})`).attr('d', d3.area().x(r => x(r.week)).y0(y(0)).y1(r => y(r[s0.key])));
    // End labels, nudged apart so two never overlap.
    const ly = ends.map(e => y(last[e.s.key])).map((v, i, a) => v);
    if (ly.length === 2 && Math.abs(ly[0] - ly[1]) < 16) { const mid = (ly[0] + ly[1]) / 2, up = ly[0] <= ly[1] ? -8 : 8; ly[0] = mid + up; ly[1] = mid - up; }
    series.forEach((s, i) => {
      svg.append('path').datum(rows).style('fill', 'none').style('stroke', s.color).attr('stroke-width', 2).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round').attr('d', d3.line().x(r => x(r.week)).y(r => y(r[s.key])));
      svg.append('circle').attr('cx', x(last.week)).attr('cy', y(last[s.key])).attr('r', 3.5).style('fill', s.color);
      svg.append('text').attr('class', 'mp-lab').attr('x', x(last.week) + 6).attr('y', ly[i]).attr('dy', '0.32em').text(series.length > 1 ? ends[i].txt : fmt(last[s.key]));
    });
    const tip = tipFor(el), dots = series.map(s => svg.append('circle').attr('r', 4).style('fill', s.color).attr('visibility', 'hidden'));
    const bis = d3.bisector(r => r.week).center;
    svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', w - m.l - m.r).attr('height', H - m.t - m.b).style('fill', 'transparent')
      .on('mousemove', ev => { const [px] = d3.pointer(ev); const r = rows[bis(rows, x.invert(px))]; series.forEach((s, i) => dots[i].attr('cx', x(r.week)).attr('cy', y(r[s.key])).attr('visibility', 'visible')); const [ex, ey] = d3.pointer(ev, el); showTip(el, tip, 'Week of ' + wk(r.week), series.map(s => ({ color: series.length > 1 ? s.color : null, text: s.label + '  ' + fmt(r[s.key]) })), ex, ey); })
      .on('mouseleave', () => { tip.hidden = true; dots.forEach(d => d.attr('visibility', 'hidden')); });
  }

  function activeChart() {
    const el = document.getElementById('c-active');
    if (!gate(el, 'weekly')) return;
    const rows = dash.data('weekly').data.map(r => ({ week: new Date(r.week), v: Number(r.active), e: Number(r.enrolled) }));
    const H = 220, { svg, w } = svgIn(el, H);
    const enrolled = rows[rows.length - 1].e;
    const ticks = d3.ticks(0, enrolled, 4);
    const refTxt = fc(enrolled) + ' enrolled';
    const m = { t: 22, r: 4, b: 26, l: textW(svg, ticks.map(fc)) + 8 };
    const x = d3.scaleBand(rows.map(r => r.week), [m.l, w - m.r]).padding(.3);
    const y = d3.scaleLinear([0, enrolled], [H - m.b, m.t]);
    svg.append('g').selectAll('line').data(ticks).join('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y).attr('y2', y).style('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(ticks).join('text').attr('class', 'mp-tick').attr('x', m.l - 6).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').text(fc);
    svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(enrolled)).attr('y2', y(enrolled)).style('stroke', 'var(--cds-chart-reference)').attr('stroke-dasharray', '4 4');
    svg.append('text').attr('class', 'mp-tick').attr('x', w - m.r).attr('y', y(enrolled) - 6).attr('text-anchor', 'end').text(refTxt);
    const tip = tipFor(el);
    svg.append('g').selectAll('rect').data(rows).join('rect').attr('x', d => x(d.week) + Math.max(0, (x.bandwidth() - 32) / 2)).attr('width', Math.min(32, x.bandwidth()))
      .attr('y', d => y(d.v)).attr('height', d => y(0) - y(d.v)).attr('rx', 4).style('fill', dash.colors[0])
      .on('mousemove', (ev, d) => { const [px, py] = d3.pointer(ev, el); showTip(el, tip, 'Week of ' + wk(d.week), [{ text: fc(d.v) + ' active, ' + f0(d.v / d.e) + ' of enrolled' }], px, py); })
      .on('mouseleave', () => { tip.hidden = true; });
    const step = w < 520 ? 3 : 2;
    svg.append('g').selectAll('text').data(rows.filter((_, i) => i % step === 0)).join('text').attr('class', 'mp-tick')
      .attr('x', d => x(d.week) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').text(d => wk(d.week));
  }

  function hbars(id, src, labelKey, series, fmt) {
    const el = document.getElementById(id);
    if (!gate(el, src)) return;
    const rows = dash.data(src).data.map(r => { const o = { label: r[labelKey] }; series.forEach(s => o[s.key] = Number(r[s.key])); return o; })
      .sort((a, b) => b[series[series.length - 1].key] - a[series[series.length - 1].key]);
    const bh = 10, gap = series.length > 1 ? 8 : 3, lab = 20, rowH = lab + series.length * (bh + gap) + 10;
    const H = rows.length * rowH + 4, { svg, w } = svgIn(el, H);
    const max = d3.max(rows, r => d3.max(series, s => r[s.key]));
    const right = textW(svg, rows.flatMap(r => series.map(s => fmt(r[s.key])))) + 10;
    const x = d3.scaleLinear([0, max], [0, w - right]);
    const tip = tipFor(el);
    const g = svg.selectAll('g.row').data(rows).join('g').attr('transform', (d, i) => `translate(0,${i * rowH})`);
    g.append('text').attr('class', 'mp-lab').attr('x', 0).attr('y', 13).text(d => d.label);
    series.forEach((s, j) => {
      const yy = lab + j * (bh + gap);
      g.append('rect').attr('x', 0).attr('y', yy).attr('height', bh).attr('rx', 4).attr('width', d => Math.max(2, x(d[s.key]))).style('fill', s.color).attr('fill-opacity', s.op || 1);
      g.append('text').attr('class', 'mp-tick').attr('x', d => x(d[s.key]) + 6).attr('y', yy + bh / 2).attr('dy', '0.32em').text(d => fmt(d[s.key]));
    });
    g.append('rect').attr('x', 0).attr('y', 0).attr('width', w).attr('height', rowH).style('fill', 'transparent')
      .on('mousemove', (ev, d) => { const [px, py] = d3.pointer(ev, el); showTip(el, tip, d.label, series.map(s => ({ color: s.color, op: s.op, text: (series.length > 1 ? s.name + '  ' : '') + fmt(d[s.key]) })), px, py); })
      .on('mouseleave', () => { tip.hidden = true; });
  }

  const THEME_SERIES = [
    { key: 'first_month', name: 'First month', color: 'var(--cds-chart-muted)' },
    { key: 'last_month', name: 'Last month', color: dash.colors[1] }
  ];
  legend('theme-legend', THEME_SERIES);

  function tiles() {
    const st = dash.data('summary');
    const set = (sel, txt) => document.querySelectorAll(sel).forEach(e => fill(e, txt));
    const wst = dash.data('weekly');
    if (wst.status === OK) {
      const last = wst.data[wst.data.length - 1];
      document.querySelectorAll('[data-source="weekly"][data-field="active"]').forEach(e => fill(e, fc(Number(last.active))));
      document.querySelectorAll('[data-source="weekly"][data-field="enrolled"]').forEach(e => fill(e, fc(Number(last.enrolled))));
    }
    if (st.status !== OK) return;
    const s = st.data[0];
    set('[data-source="summary"][data-field="mood_last4"]', s.mood_last4.toFixed(2));
    set('[data-source="summary"][data-field="mood_change"]', sgn(s.mood_change, v => v.toFixed(2)));
    set('[data-source="summary"][data-field="breaks_last4"]', f0(s.breaks_last4));
    set('[data-source="summary"][data-field="away_last4"]', f0(s.away_last4));
    set('[data-source="summary"][data-field="away_change_pts"]', sgn(s.away_change_pts, v => v.toFixed(1)));
    set('[data-source="summary"][data-field="calls_last4"]', s.calls_last4.toFixed(1) + ' h');
    set('[data-source="summary"][data-field="calls_change"]', sgn(s.calls_change, f0));
    set('[data-source="summary"][data-field="late_last4"]', f0(s.late_last4));
    set('[data-source="summary"][data-field="late_change_pts"]', sgn(s.late_change_pts, v => v.toFixed(1)));
    set('[data-source="summary"][data-field="worry_last4"]', fc(s.worry_last4));
    set('[data-source="summary"][data-field="worry_change"]', sgn(s.worry_change, f0));
    const tone = (id, good) => { document.getElementById(id).className = 'd ' + (good === null ? 'flat' : good ? 'good' : 'bad'); };
    tone('d-mood', s.mood_change === 0 ? null : s.mood_change > 0);
    tone('d-breaks', s.away_change_pts === 0 ? null : s.away_change_pts > 0);
    tone('d-calls', s.calls_change === 0 ? null : s.calls_change < 0);
    tone('d-late', s.late_change_pts === 0 ? null : s.late_change_pts < 0);
    tone('d-worry', s.worry_change === 0 ? null : s.worry_change < 0);
    const ic = dash.data('issue_count');
    if (ic.status === OK) document.querySelectorAll('[data-source="issue_count"]').forEach(e => fill(e, String(ic.data[0].needs_action)));
  }

  function issues() {
    const el = document.getElementById('issue-list');
    if (!gate(el, 'issues')) return;
    el.replaceChildren();
    const LV = { high: 'Act now', watch: 'Watch', good: 'Working well' };
    for (const it of dash.data('issues').data) {
      const c = document.createElement('article'); c.className = 'mp-card mp-issue mp-in';
      const top = document.createElement('div'); top.className = 'top';
      const lv = document.createElement('span'); lv.className = 'mp-level ' + it.level; lv.textContent = LV[it.level] || it.level;
      const ar = document.createElement('span'); ar.className = 'mp-area'; ar.textContent = it.area;
      top.append(lv, ar);
      const h = document.createElement('h3'); h.textContent = it.issue;
      const ev = document.createElement('p'); ev.className = 'ev'; ev.textContent = it.evidence;
      ev.setAttribute('data-source', 'issues'); ev.setAttribute('data-field', 'evidence'); ev.setAttribute('data-where', 'id=' + encodeURIComponent(it.id));
      const act = document.createElement('div'); act.className = 'act';
      const b = document.createElement('b'); b.textContent = 'Suggested initiative';
      const p = document.createElement('p'); p.textContent = it.initiative;
      act.append(b, p);
      c.append(top, h, ev, act); el.appendChild(c);
    }
  }

  function teamTable() {
    const tb = document.querySelector('#t-teams tbody');
    tb.replaceChildren();
    const st = dash.data('teams_all');
    if (st.status !== OK) return;
    const rows = st.data.filter(t => !(t.hidden === true || t.hidden === 'true'));
    for (const t of rows) {
      const tr = document.createElement('tr');
      if (t.team === window.PULSE_SCOPE) tr.className = 'sel';
      const mood = Number(t.mood_change), late = Number(t.late_night_share), skip = Number(t.breaks_skipped);
      const cells = [
        [t.team], [fc(Number(t.people))], [f0(Number(t.active_share))], [Number(t.avg_mood).toFixed(2)],
        [sgn(mood, v => v.toFixed(2)), mood <= -0.3], [f0(late), late >= 0.2], [f0(skip), skip >= 0.5], [t.top_theme]
      ];
      for (const [txt, flag] of cells) { const td = document.createElement('td'); td.textContent = txt; if (flag) td.className = 'flag'; tr.appendChild(td); }
      tb.appendChild(tr);
    }
    const pv = dash.data('privacy');
    if (pv.status === OK) document.querySelectorAll('[data-source="privacy"]').forEach(e => fill(e, String(pv.data[0].hidden_teams)));
  }

  dash.onData(() => {
    tiles();
    issues();
    teamTable();
    moodChart();
    hbars('c-themes', 'themes', 'theme', THEME_SERIES, f0);
    lineChart('c-late', 'habits', [{ key: 'late_night_share', label: 'After bedtime', color: dash.colors[2] }], f0, f0);
    activeChart();
    lineChart('c-breaks', 'habits', [{ key: 'breaks_taken_share', label: 'Clicked Done', color: 'var(--cds-chart-muted)' }, { key: 'breaks_away_share', label: 'Really stepped away', color: dash.colors[0] }], f0, f0);
    lineChart('c-calls', 'weekly', [{ key: 'call_hours_per_person', label: 'Hours on calls', color: dash.colors[3] }], v => d3.format('.1f')(v) + ' h', d3.format('d'));
    hbars('c-features', 'features', 'feature', [{ key: 'users', name: 'People', color: dash.colors[0] }], f0);
  });
})();
