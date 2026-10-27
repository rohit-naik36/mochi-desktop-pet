// Shared behaviour for mochicuddle.com: the buddy drawing, the menu, the hero
// buddy picker and the enquiry forms. No trackers, no cookies.
(function () {
  // The same drawing the app uses. Each copy gets its own filter ids.
  let n = 0;
  const svg = (still) => {
    const k = ++n;
    const anim = still ? '' : '<animate attributeName="baseFrequency" values="0.020;0.026;0.020" dur="9s" repeatCount="indefinite"/>';
    return `<svg viewBox="0 0 120 110" aria-hidden="true" focusable="false"><defs>
<filter id="so${k}" x="-60%" y="-60%" width="220%" height="220%"><feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="4" seed="7" result="n">${anim}</feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="26" result="d"/><feGaussianBlur in="d" stdDeviation="5"/></filter>
<filter id="sm${k}" x="-50%" y="-50%" width="200%" height="200%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="4" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16" result="d"/><feGaussianBlur in="d" stdDeviation="2.2"/></filter>
<filter id="sw${k}" x="-150%" y="-150%" width="400%" height="400%"><feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="12" result="d"/><feGaussianBlur in="d" stdDeviation="3"/></filter>
<filter id="gl${k}" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<radialGradient id="co${k}" cx="50%" cy="50%" r="50%"><stop class="core-a" offset="0"/><stop class="core-b" offset=".7"/><stop class="core-c" offset="1"/></radialGradient></defs>
<g class="float-group"><g filter="url(#sw${k})"><circle class="wisp" cx="50" cy="30" r="8"/><circle class="wisp w2" cx="68" cy="28" r="7"/><circle class="wisp w3" cx="58" cy="34" r="6"/></g>
<g class="smoke-body"><ellipse class="haze" cx="60" cy="60" rx="46" ry="42" filter="url(#so${k})"/><g filter="url(#sm${k})"><circle class="mid" cx="60" cy="58" r="33"/><circle class="mid" cx="42" cy="76" r="13"/><circle class="mid" cx="78" cy="77" r="12"/></g><circle cx="60" cy="60" r="28" fill="url(#co${k})"/></g>
<g><circle class="speck" cx="30" cy="48" r="1.4"/><circle class="speck s2" cx="90" cy="54" r="1.2"/><circle class="speck s3" cx="40" cy="86" r="1.1"/><circle class="speck s4" cx="82" cy="84" r="1.4"/><circle class="speck s5" cx="62" cy="28" r="1.1"/></g>
<g class="body-group"><g class="eyes" filter="url(#gl${k})"><g class="eye"><ellipse cx="47" cy="58" rx="6" ry="8"/></g><g class="eye"><ellipse cx="73" cy="58" rx="6" ry="8"/></g></g>
<g class="eyes-closed" filter="url(#gl${k})"><path d="M41 60 Q47 64 53 60"/><path d="M67 60 Q73 64 79 60"/></g>
<g class="eyes-happy" filter="url(#gl${k})"><path d="M41 62 Q47 53 53 62"/><path d="M67 62 Q73 53 79 62"/></g>
<g class="blush"><ellipse cx="38" cy="69" rx="5" ry="2.6"/><ellipse cx="82" cy="69" rx="5" ry="2.6"/></g>
<path class="mouth" d="M57 71 Q60 73.5 63 71"/></g></g></svg>`;
  };
  for (const el of document.querySelectorAll('.buddy')) el.innerHTML = svg(el.hasAttribute('data-still'));

  // Blink now and then, like the app.
  setInterval(() => {
    for (const el of document.querySelectorAll('.buddy:not(.happy):not(.sleep)')) {
      if (Math.random() < 0.35) { el.classList.add('sleep'); setTimeout(() => el.classList.remove('sleep'), 160); }
    }
  }, 2600);

  // Mobile menu
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('nav');
  if (toggle && nav) toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  // Hero: pick a buddy and a language; the bubble shows that buddy's real lines.
  const LINES = {
    smoke: {
      en: ["Um... would you drink some water? For me? 💧", "*peeks out* Oh! Hi. I missed you a little. Okay, a lot.", "You don't have to talk to me. I just like being near you."],
      hi: ['उम्म... थोड़ा पानी पियोगे? मेरे लिए? 💧', '*झाँककर* ओह! मुझे तुम्हारी थोड़ी याद आई। अच्छा, बहुत ज़्यादा।'],
      hinglish: ['Umm... thoda paani piyoge? Mere liye? 💧', '*jhaank ke* Oh! Tumhari thodi yaad aayi. Accha, bahut zyada.'],
    },
    cinder: {
      en: ["WATER BREAK! Champions hydrate! 💧🔥", "Posture check! Shoulders back! You are a CHAMPION! 💪", "Every task you finish? That's a point on the board! 🔥"],
      hi: ['पानी ब्रेक! चैंपियन पानी पीते हैं! 💧🔥', 'चलो शुरू करें! 🔥 आज का दिन अपना है!'],
      hinglish: ['PAANI BREAK! Champions paani peete hain! 💧🔥', 'CHALO SHURU KAREIN! 🔥 Aaj ka din apna hai!'],
    },
    mist: {
      en: ['A glass of water, slowly sipped 💧', 'Rivers need rain. So do you 💧', 'The day is soft and new. Let\'s go gently 🌫️'],
      hi: ['एक गिलास पानी, धीरे-धीरे 💧', 'नदियों को बारिश चाहिए। तुम्हें भी 💧'],
      hinglish: ['Ek glass paani, dheere dheere 💧', 'Nadiyon ko baarish chahiye. Tumhe bhi 💧'],
    },
    dusk: {
      en: ['Water break! Earth is 71% water. You should be at least a bit 💧', 'Stretch like you\'re reaching for the Moon 🌙🙆', 'Did you know some stars we see are already gone? You\'re still here though. Good ✨'],
      hi: ['पानी ब्रेक! धरती 71% पानी है। तुम्हें भी थोड़ा होना चाहिए 💧', 'अंतरिक्ष यात्री भी पानी पीते हैं 💧'],
      hinglish: ['Paani break! Earth 71% paani hai. Tumhe bhi thoda hona chahiye 💧', 'Taaron jaise chamakte hue! ✨'],
    },
    hope: {
      en: ["You've got this 💗 One sip of water first?", 'Tiny breaks, big days. Stretch with me? 🙆💗', 'Whatever today brings, I\'m on your side 💗'],
      hi: ['तुम कर लोगे 💗 पहले एक घूँट पानी?', 'छोटे ब्रेक, बड़े दिन। मेरे साथ स्ट्रेच करोगे? 🙆💗'],
      hinglish: ['Tum kar loge 💗 Pehle ek sip paani?', 'Chhote breaks, bade din. Mere saath stretch karoge? 🙆💗'],
    },
  };
  const stage = document.querySelector('[data-hero]');
  if (stage) {
    const bud = stage.querySelector('.buddy');
    const bubble = stage.querySelector('.bubble');
    let skin = 'smoke', lang = 'en', i = 0, timer;
    const show = () => {
      const pool = LINES[skin][lang];
      bubble.classList.add('fade');
      setTimeout(() => {
        bubble.textContent = pool[i % pool.length];
        bubble.lang = lang === 'hi' ? 'hi' : 'en';
        bubble.classList.remove('fade');
      }, 220);
      i++;
    };
    const restart = () => { clearInterval(timer); show(); timer = setInterval(show, 4800); };
    for (const b of document.querySelectorAll('[data-pick-skin]')) b.addEventListener('click', () => {
      skin = b.dataset.pickSkin; i = 0;
      bud.dataset.skin = skin;
      bud.classList.add('happy'); setTimeout(() => bud.classList.remove('happy'), 1400);
      for (const o of document.querySelectorAll('[data-pick-skin]')) o.setAttribute('aria-pressed', String(o === b));
      restart();
    });
    for (const b of document.querySelectorAll('[data-pick-lang]')) b.addEventListener('click', () => {
      lang = b.dataset.pickLang; i = 0;
      for (const o of document.querySelectorAll('[data-pick-lang]')) o.setAttribute('aria-pressed', String(o === b));
      restart();
    });
    bud.addEventListener('click', () => { bud.classList.add('happy'); setTimeout(() => bud.classList.remove('happy'), 1200); });
    timer = setInterval(show, 4800);
  }

  // Enquiry forms send to our inbox through FormSubmit. If that fails, the
  // visitor's own email app opens with the message filled in instead.
  for (const form of document.querySelectorAll('form[data-mailto]')) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      if (data.get('_honey')) return;
      data.delete('_honey');
      const subject = (form.dataset.subject || 'Hello from mochicuddle.com') + (data.get('company') ? ` (${data.get('company')})` : '');
      const fields = Object.fromEntries([...data.entries()].filter(([, v]) => v));
      const note = form.querySelector('.form-status');
      const button = form.querySelector('button[type="submit"]');
      const tell = (msg) => { if (note) { note.textContent = msg; note.hidden = false; } };
      button.disabled = true;
      tell('Sending…');
      try {
        const res = await fetch(`https://formsubmit.co/ajax/${form.dataset.mailto}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ...fields, _subject: subject, _replyto: fields.email, _template: 'table', _captcha: 'false' }),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || String(out.success) !== 'true') throw new Error(out.message || res.status);
        form.reset();
        tell('Thanks! Your message is on its way. We reply within two working days.');
      } catch {
        const body = Object.entries(fields).map(([k, v]) => `${k[0].toUpperCase() + k.slice(1)}: ${v}`).join('\n');
        location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        tell(`We couldn't send that from here, so your email app should open instead. If it doesn't, write to ${form.dataset.mailto}.`);
      } finally {
        button.disabled = false;
      }
    });
  }

  // Copy buttons
  for (const b of document.querySelectorAll('[data-copy]')) b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied'; }
    catch { const sel = getSelection(); const r = document.createRange(); r.selectNodeContents(b.previousElementSibling); sel.removeAllRanges(); sel.addRange(r); }
    setTimeout(() => { b.textContent = 'Copy'; }, 1800);
  });

  for (const y of document.querySelectorAll('[data-year]')) y.textContent = new Date().getFullYear();

  // Emergency numbers for the visitor's country, guessed from the time zone
  // the browser already reports. No location permission, nothing sent anywhere.
  const HELP = {
    IN: ['India', '112', 'Tele-MANAS 14416'],
    US: ['the US', '911', 'Call or text 988'],
    CA: ['Canada', '911', 'Call or text 988'],
    GB: ['the UK', '999', 'Samaritans 116 123'],
    IE: ['Ireland', '112 or 999', 'Samaritans 116 123'],
    AU: ['Australia', '000', 'Lifeline 13 11 14'],
    NZ: ['New Zealand', '111', 'Call or text 1737'],
    SG: ['Singapore', '995', 'SOS 1767'],
    AE: ['the UAE', '999', null],
    PH: ['the Philippines', '911', 'NCMH 1553'],
    EU: ['Europe', '112', null],
  };
  const country = (() => {
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch {}
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return 'IN';
    if (tz === 'Europe/London') return 'GB';
    if (tz === 'Europe/Dublin') return 'IE';
    if (tz.startsWith('Australia/')) return 'AU';
    if (tz === 'Pacific/Auckland') return 'NZ';
    if (tz === 'Asia/Singapore') return 'SG';
    if (tz === 'Asia/Dubai') return 'AE';
    if (tz === 'Asia/Manila') return 'PH';
    if (/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Montreal|Moncton)$/.test(tz)) return 'CA';
    if (/^(America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Indiana\/.+|Kentucky\/.+)|Pacific\/Honolulu)$/.test(tz)) return 'US';
    if (tz.startsWith('Europe/')) return 'EU';
    return tz ? 'OTHER' : 'IN';
  })();
  const h = HELP[country];
  const line = h
    ? `In an emergency in ${h[0]}, call ${h[1]}.` + (h[2] ? ` Need to talk? ${h[2]}.` : '')
    : 'In an emergency, call your local emergency number. Free helplines: findahelpline.com.';
  for (const el of document.querySelectorAll('[data-emergency]')) el.textContent = line;
  const abroad = document.querySelector('[data-abroad]');
  if (abroad && country !== 'IN') {
    abroad.querySelector('[data-abroad-text]').textContent = line;
    abroad.hidden = false;
  }
})();
