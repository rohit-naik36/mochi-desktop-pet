// Winter pack for mochicuddle.com. Runs on the visitor's own clock only: no
// requests, no cookies, no storage. Festive from 20 Dec to 2 Jan inclusive.
// ?festive=1 previews it, ?festive=0 forces it off. Normal visits are unaffected.
(function (root) {
  const FROM = { month: 11, day: 20 }; // 20 Dec (months are 0-based)
  const TO = { month: 0, day: 2 };     // 2 Jan

  function isFestiveDate(date) {
    const m = date.getMonth(), d = date.getDate();
    return (m === FROM.month && d >= FROM.day) || (m === TO.month && d <= TO.day);
  }

  // search is location.search; returns true when the festive look should show.
  function shouldBeFestive(date, search) {
    const q = new URLSearchParams(search || '').get('festive');
    if (q === '1') return true;
    if (q === '0') return false;
    return isFestiveDate(date);
  }

  const api = { isFestiveDate, shouldBeFestive };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  if (typeof document === 'undefined' || !shouldBeFestive(new Date(), root.location.search)) return;

  document.documentElement.classList.add('festive');

  // One small accessory per buddy, drawn on top of the same svg.
  const NS = 'http://www.w3.org/2000/svg';
  const hat = (c) => `<path d="M42 34 Q58 6 80 30 Z" fill="${c}"/><rect x="40" y="31" width="42" height="7" rx="3.5" fill="#fff"/><circle cx="80" cy="29" r="4.5" fill="#fff"/>`;
  const ACC = {
    smoke: hat('#d8433f'),
    cinder: '<path d="M44 34 L38 14 M38 14 L32 20 M38 14 L45 19 M76 34 L82 14 M82 14 L88 20 M82 14 L75 19" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round" fill="none"/>',
    mist: '<path d="M38 80 Q60 92 82 80" stroke="#d8433f" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M74 84 L78 98" stroke="#d8433f" stroke-width="6" stroke-linecap="round"/>',
    dusk: hat('#2f6fe4'),
    hope: '<circle cx="60" cy="28" r="9" fill="none" stroke="#f2c14e" stroke-width="3"/><circle cx="60" cy="19" r="2" fill="#e04b4b"/><circle cx="51" cy="26" r="2" fill="#2e9e5b"/><circle cx="69" cy="26" r="2" fill="#e04b4b"/>',
  };
  for (const el of document.querySelectorAll('.buddy[data-skin]')) {
    const svg = el.querySelector('svg'), acc = ACC[el.getAttribute('data-skin')];
    if (!svg || !acc) continue;
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'festive-acc');
    g.innerHTML = acc;
    svg.appendChild(g);
  }

  const banner = document.createElement('div');
  banner.className = 'festive-banner';
  banner.setAttribute('role', 'note');
  banner.textContent = 'Happy holidays from Mochi and friends! Warm wishes for the new year.';
  document.body.insertBefore(banner, document.body.firstChild);
})(typeof window !== 'undefined' ? window : globalThis);
