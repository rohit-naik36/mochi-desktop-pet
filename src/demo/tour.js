// The tour panel: one step at a time, with a button that makes the app do the
// thing the step talks about.
const $ = (id) => document.getElementById(id);
let steps = [];
let at = 0;

function render() {
  const s = steps[at];
  if (!s) return;
  $('dots').replaceChildren(...steps.map((_, i) => {
    const d = document.createElement('i');
    if (i === at) d.className = 'on'; else if (i < at) d.className = 'done';
    return d;
  }));
  $('count').textContent = `Step ${at + 1} of ${steps.length}`;
  $('title').textContent = s.title;
  $('text').textContent = s.text;
  $('show').textContent = s.button;
  $('note').textContent = '';
  $('back').disabled = at === 0;
  $('next').textContent = at === steps.length - 1 ? 'Start over' : 'Next';
}

$('show').addEventListener('click', async () => {
  const btn = $('show');
  btn.disabled = true;
  try {
    const r = await window.tour.run(steps[at].id);
    $('note').textContent = (r && r.note) || '';
  } finally { btn.disabled = false; }
});
$('back').addEventListener('click', () => { if (at > 0) { at -= 1; render(); } });
$('next').addEventListener('click', () => { at = at === steps.length - 1 ? 0 : at + 1; render(); });
window.tour.onRestart(() => { at = 0; render(); });

window.tour.steps().then((s) => { steps = s; render(); });
