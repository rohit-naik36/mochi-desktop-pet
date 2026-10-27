// Team picker and the line under the title.
(function () {
  const S = window.PULSE_SAMPLE;
  const sel = document.getElementById('scope');
  sel.append(new Option('All teams', 'All teams'));
  for (const t of S.teams) {
    const o = new Option(t.hidden ? t.team + ' (hidden, under ' + S.minGroup + ' people)' : t.team, t.team);
    o.disabled = !!t.hidden;
    sel.append(o);
  }
  const fmt = d3.utcFormat('%b %-d, %Y');
  const end = new Date(S.weeks[S.weeks.length - 1]); end.setUTCDate(end.getUTCDate() + 6);
  document.getElementById('company-line').textContent =
    S.company + ' · ' + S.weeks.length + '-week pilot · ' + fmt(new Date(S.weeks[0])) + ' to ' + fmt(end);
  sel.addEventListener('change', () => {
    window.PULSE_SCOPE = sel.value;
    window.dash.redraw();
  });
})();
