"""Builds the static mochicuddle.com site into ../docs (served by GitHub Pages).

Every page shares one header and footer. Edit the settings below, then run
`python3 build.py`. The output is plain HTML that any static host serves.
"""
import html
import json
from pathlib import Path

SITE = 'https://mochicuddle.com'
EMAIL = 'hello@mochicuddle.com'
# Web3Forms access key for the enquiry forms (emailed to EMAIL by web3forms.com).
# Empty means the forms use FormSubmit instead.
FORM_KEY = ''
FORM_ATTR = f' data-key="{FORM_KEY}"' if FORM_KEY else ''
STORE = 'https://apps.microsoft.com/detail/9P81ZJPTQ47Q'
RELEASES = 'https://github.com/rohit-naik36/mochi-desktop-pet/releases/latest'
STUDIO = 'Little Smoke Studio'
OWNER = 'Rohit Naik'
COMPANY = 'Unorthologic LLP'
# Fill these in when the accounts exist. Empty ones are left out of the footer.
SOCIAL = {
    'instagram': '',
    'youtube': '',
    'linkedin': '',
    'x': '',
}

OUT = Path(__file__).resolve().parent.parent / 'docs'

NAV = [
    ('features.html', 'Features'),
    ('buddies.html', 'Buddies'),
    ('teams.html', 'For teams'),
    ('pricing.html', 'Pricing'),
    ('faq.html', 'FAQ'),
]

ICONS = {
    'instagram': '<svg viewBox="0 0 24 24"><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM12 2c-2.7 0-3 0-4.1.1C4.6 2.2 2.2 4.6 2.1 7.9 2 9 2 9.3 2 12s0 3 .1 4.1c.1 3.3 2.5 5.7 5.8 5.8 1.1.1 1.4.1 4.1.1s3 0 4.1-.1c3.3-.1 5.7-2.5 5.8-5.8.1-1.1.1-1.4.1-4.1s0-3-.1-4.1c-.1-3.3-2.5-5.7-5.8-5.8C15 2 14.7 2 12 2Zm0 1.8c2.7 0 3 0 4 .1 2.4.1 3.9 1.6 4 4 .1 1 .1 1.3.1 4s0 3-.1 4c-.1 2.4-1.6 3.9-4 4-1 .1-1.3.1-4 .1s-3 0-4-.1c-2.4-.1-3.9-1.6-4-4C3.9 15 3.8 14.7 3.8 12s0-3 .1-4c.1-2.4 1.6-3.9 4-4 1-.1 1.3-.1 4.1-.1Z"/></svg>',
    'youtube': '<svg viewBox="0 0 24 24"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.7 15V9l5.8 3-5.8 3Z"/></svg>',
    'linkedin': '<svg viewBox="0 0 24 24"><path d="M20.4 2H3.6A1.6 1.6 0 0 0 2 3.6v16.8A1.6 1.6 0 0 0 3.6 22h16.8a1.6 1.6 0 0 0 1.6-1.6V3.6A1.6 1.6 0 0 0 20.4 2ZM8 19H5V9.5h3V19ZM6.5 8.2a1.7 1.7 0 1 1 0-3.5 1.7 1.7 0 0 1 0 3.5ZM19 19h-3v-4.6c0-1.1 0-2.5-1.5-2.5S12.7 13 12.7 14.3V19h-3V9.5h2.9v1.3a3.2 3.2 0 0 1 2.8-1.6c3 0 3.6 2 3.6 4.6V19Z"/></svg>',
    'x': '<svg viewBox="0 0 24 24"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z"/></svg>',
}
WIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5.5 10.4 4.5v7H3Zm8.3-1.1L21 3v8.5h-9.7ZM3 12.5h7.4v7L3 18.5Zm8.3 0H21V21l-9.7-1.4Z"/></svg>'


def store_btn(label='Get it free on Microsoft Store', cls='btn btn-primary'):
    return f'<a class="{cls}" href="{STORE}" rel="noopener">{WIN}{label}</a>'


def page(path, title, desc, body, current=None, og_image='assets/img/og-image.png'):
    nav = ''.join(
        f'<a href="{h}"{" aria-current=page" if h == current else ""}>{t}</a>' for h, t in NAV
    )
    social = ''.join(
        f'<a href="{html.escape(u)}" rel="noopener" aria-label="Mochi on {k.title()}">{ICONS[k]}</a>'
        for k, u in SOCIAL.items() if u
    )
    social = f'<div class="social">{social}</div>' if social else ''
    full_title = title if path == 'index.html' else f'{title} · Mochi'
    canonical = SITE + '/' + ('' if path == 'index.html' else path)
    org = json.dumps({
        '@context': 'https://schema.org', '@type': 'SoftwareApplication', 'name': 'Mochi - Desk Buddy',
        'operatingSystem': 'Windows 10, Windows 11', 'applicationCategory': 'LifestyleApplication',
        'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'INR'},
        'publisher': {'@type': 'Organization', 'name': STUDIO, 'url': SITE}, 'url': SITE, 'downloadUrl': STORE,
    }) if path == 'index.html' else ''
    ld = f'<script type="application/ld+json">{org}</script>' if org else ''
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{html.escape(full_title)}</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{canonical}">
<meta name="theme-color" content="#eaf1fb">
<meta name="color-scheme" content="light only">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Mochi">
<meta property="og:title" content="{html.escape(full_title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{SITE}/{og_image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Mukta:wght@400;600;700&display=swap">
<link rel="stylesheet" href="assets/css/site.css">
{ld}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="index.html" aria-label="Mochi home"><span class="buddy brand-mark no-shadow" data-skin="smoke" data-still></span>Mochi</a>
    <button class="nav-toggle" aria-expanded="false" aria-controls="nav">Menu</button>
    <nav class="nav" id="nav" aria-label="Main">{nav}<a class="btn btn-primary btn-small" href="download.html">Download</a></nav>
  </div>
</header>
<main id="main">
{body}
</main>
<footer class="site-footer">
  <div class="footer-buddies" aria-hidden="true">
    <span class="buddy no-shadow" data-skin="smoke" data-still></span><span class="buddy no-shadow" data-skin="cinder" data-still></span><span class="buddy no-shadow" data-skin="mist" data-still></span><span class="buddy no-shadow" data-skin="dusk" data-still></span><span class="buddy no-shadow" data-skin="hope" data-still></span>
  </div>
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a class="brand" href="index.html">Mochi</a>
        <p>A desk buddy for Windows that reminds you to drink water, stretch and rest your eyes, and listens when work gets heavy. Made in India by {STUDIO}.</p>
        {social}
      </div>
      <div><h2>Product</h2><ul><li><a href="features.html">Features</a></li><li><a href="buddies.html">Meet the buddies</a></li><li><a href="download.html">Download</a></li><li><a href="changelog.html">What's new</a></li></ul></div>
      <div><h2>Company</h2><ul><li><a href="about.html">About</a></li><li><a href="teams.html">Mochi for teams</a></li><li><a href="press.html">Press kit</a></li><li><a href="contact.html">Contact</a></li></ul></div>
      <div><h2>Help</h2><ul><li><a href="faq.html">FAQ</a></li><li><a href="safety.html">Safety and helplines</a></li><li><a href="privacy.html">Privacy</a></li><li><a href="terms.html">Terms</a></li></ul></div>
    </div>
    <div class="foot-base"><span>© <span data-year>2026</span> {COMPANY}. Mochi is made by {STUDIO}. All rights reserved.</span><span>Mochi is a companion, not a medical service. <span data-emergency>In an emergency in India, call 112. Need to talk? Tele-MANAS 14416.</span></span></div>
  </div>
</footer>
<script src="assets/js/site.js" defer></script>
</body>
</html>
'''


def hero(eyebrow, title, lede, extra=''):
    return f'''<section class="page-hero"><div class="wrap"><p class="eyebrow">{eyebrow}</p><h1>{title}</h1><p class="lede measure">{lede}</p>{extra}</div></section>'''


def shot(name, alt):
    return f'<img class="shot" src="assets/img/{name}.webp" width="1600" height="900" loading="lazy" alt="{html.escape(alt)}">'


BUDDIES = [
    ('smoke', 'Mochi', 'Shy and sweet', 'The original black mochi with glowing white eyes. Speaks softly, blushes when you pet it, and when you skip a reminder it quietly turns away and pouts instead of making a scene.',
     'Um... would you drink some water? For me? 💧', '#000'),
    ('cinder', 'Cinder', 'Fiery hype coach', 'A toasty charcoal mochi with ember eyes and drifting sparks. Bouncy, loud and all heart. Spins when you win and flares up red if you ignore a water break.',
     'WATER BREAK! Champions hydrate! 💧🔥', '#3a1a0c'),
    ('mist', 'Mist', 'Calm and wise', 'Silver fog with dark eyes, the easiest to see on dark wallpapers. Drifts slowly, glows when it is happy, and sighs and fades instead of fuming.',
     'Rivers need rain. So do you 💧', '#d9e1ea'),
    ('dusk', 'Dusk', 'Dreamy night owl', 'An indigo mochi full of tiny twinkling stars and space facts. Groggy in the morning, lively at night, twirls when happy and dims its stars when it sulks.',
     'Water break! Earth is 71% water. You should be at least a bit 💧', '#231d55'),
    ('hope', 'Hope', 'Warm and hopeful', 'A pink mochi with warm rosy eyes. Always finds the bright side, floats little hearts when you take a break, and when you skip one it just looks at you, hopefully, until you do.',
     "You've got this 💗 One sip of water first?", '#f4a9c4'),
]
SOON = {'hope'}  # on the site before it is in the app
soon = lambda k: ' <span class="tag">Coming soon</span>' if k in SOON else ''

# ---------------------------------------------------------------- pages
pages = {}

pages['index.html'] = page('index.html', 'Mochi, your desk buddy for long work days',
    'Mochi is a squishy little desk buddy that lives at the bottom of your Windows screen. It reminds you to drink water, stretch and rest your eyes, eats your worries and speaks English, Hindi and Hinglish.',
f'''
<section class="hero"><div class="wrap split">
  <div>
    <p class="eyebrow">Desk buddy for Windows</p>
    <h1>Soft, squishy and always on your side</h1>
    <p class="lede">Mochi lives at the bottom of your screen. It nudges you to drink water, stretch and rest your eyes, keeps you company through long days and night shifts, and listens when work gets heavy.</p>
    <div class="cta-row">{store_btn()}<a class="btn btn-ghost" href="teams.html">Mochi for teams</a></div>
    <p class="hero-note">Free for Windows 10 and 11. No account, no ads, and nothing leaves your computer.</p>
  </div>
  <div data-hero>
    <div class="screen" role="img" aria-label="Mochi floating above the taskbar on a Windows desktop, saying a reminder in a speech bubble">
      <div class="window"><i style="top:40px;width:60%"></i><i style="top:58px;width:72%"></i><i style="top:76px;width:44%"></i><i style="top:94px;width:66%"></i></div>
      <div class="on-screen"><p class="bubble" aria-live="polite">Um... would you drink some water? For me? 💧</p><span class="buddy" data-skin="smoke"></span></div>
      <div class="taskbar"><b></b><b></b><b></b><b></b><b></b></div>
    </div>
    <div class="picker" role="group" aria-label="Try a buddy">
      {''.join(f'<button data-pick-skin="{k}" aria-pressed="{str(k == "smoke").lower()}"><span class="dot" style="background:{c}"></span>{n}</button>' for k, n, *_rest, c in [(b[0], b[1], b[5]) for b in BUDDIES])}
    </div>
    <div class="lang-pick" role="group" aria-label="Language"><button data-pick-lang="en" aria-pressed="true">English</button><button data-pick-lang="hi" aria-pressed="false" lang="hi">हिंदी</button><button data-pick-lang="hinglish" aria-pressed="false">Hinglish</button></div>
  </div>
</div></section>

<section><div class="wrap">
  <div class="section-head"><p class="eyebrow">A day with Mochi</p><h2>It keeps the small, healthy habits going so you don't have to remember them</h2></div>
  <ol class="day">
    <li><span class="when">Morning</span><h3>Says hello</h3><p>Greets you by name and asks how you're feeling with five little faces.</p></li>
    <li><span class="when">20 min</span><h3>Rests your eyes</h3><p>The 20-20-20 rule: look 20 feet away for 20 seconds, every 20 minutes.</p></li>
    <li><span class="when">45 min</span><h3>Water</h3><p>A sip every 45 minutes. Ignore it and your buddy floats to the middle of the screen and sulks.</p></li>
    <li><span class="when">60 min</span><h3>Stretch</h3><p>Every hour it stretches with you, then cheers when you click Done.</p></li>
    <li><span class="when">25 / 50</span><h3>Focus</h3><p>Start a focus session and it goes quiet, holds the reminders and celebrates when you finish.</p></li>
    <li><span class="when">11 pm</span><h3>Bedtime</h3><p>It yawns and goes to sleep. Work nights? It learns your shift and sleeps when you do.</p></li>
  </ol>
</div></section>

<section><div class="wrap split">
  <div class="stack">
    <p class="eyebrow">Feed me a worry</p>
    <h2>Type what's bothering you. Your buddy eats it, letter by letter</h2>
    <p class="lede">Then it says something kind that fits the worry, whether it's a deadline, money, people or self-doubt, and suggests one tiny next step. Share good news and it throws you a confetti party instead.</p>
    <ul class="ticks"><li>Runs fully offline and nothing you type is saved</li><li>Replies in the language you wrote in</li><li>If someone is struggling, it gently shares free helplines like Tele-MANAS 14416</li></ul>
  </div>
  {shot('4-worry', 'Feed me a worry: the buddy eats a typed worry and replies with comfort')}
</div></section>

<section><div class="wrap">
  <div class="section-head"><p class="eyebrow">Meet the buddies</p><h2>Five mochis, five personalities</h2><p class="lede">Each one moves, talks and pouts its own way. Pick the one that feels like you, and switch any time.</p></div>
  <div class="grid-5">
    {''.join(f'<article class="buddy-card"><div class="stage"><span class="buddy" data-skin="{k}"></span></div><p class="trait">{t}</p><h3>{n}{soon(k)}</h3><p class="quote">{q}</p></article>' for k, n, t, _d, q, _c in BUDDIES)}
  </div>
  <p style="margin-top:28px"><a href="buddies.html">See how each buddy behaves →</a></p>
</div></section>

<section><div class="wrap">
  <div class="section-head"><p class="eyebrow">Speaks your language</p><h2>English, हिंदी or Hinglish</h2><p class="lede">About 950 lines across three languages, and it never says the same thing twice in a row. In Hindi it even uses the right grammar for the buddy you picked.</p></div>
  <div class="langs">
    <figure style="margin:0"><p class="bubble">Stretch with me? I'll go first... *stretches* 🙆</p><figcaption>English</figcaption></figure>
    <figure style="margin:0"><p class="bubble" lang="hi">उम्म... थोड़ा पानी पियोगे? मेरे लिए? 💧</p><figcaption>हिंदी</figcaption></figure>
    <figure style="margin:0"><p class="bubble">PAANI BREAK! Champions paani peete hain! 💧🔥</p><figcaption>Hinglish</figcaption></figure>
  </div>
</div></section>

<section><div class="wrap split flip">
  <div class="stack">
    <p class="eyebrow">Small wins add up</p>
    <h2>Points, streaks and 26 badges</h2>
    <p class="lede">Every glass of water, stretch and focus session earns points. Keep your streak, unlock badges from First Snack to Focus Legend, and fill a gratitude jar with one good thing a day.</p>
    <p><a href="features.html">Everything Mochi can do →</a></p>
  </div>
  {shot('8-board', 'The achievement board with level, streak, badges and gratitude jar')}
</div></section>

<section><div class="wrap"><div class="band"><span class="stars"></span>
  <div class="split">
    <div class="stack">
      <p class="eyebrow">Mochi for teams</p>
      <h2>A wellbeing buddy for every desk in your company</h2>
      <p class="lede">Give your people a friendly nudge to take breaks, with your own helplines and HR contacts built in. Team insights stay anonymous, and nobody's worries or moods ever reach a dashboard.</p>
      <div class="cta-row"><a class="btn btn-primary" href="teams.html">See Mochi for teams</a><a class="btn btn-ghost" href="teams.html#enquire">Talk to us</a></div>
    </div>
    <ul class="ticks">
      <li>Healthier break habits across the team</li>
      <li>Your company's helplines and POSH contacts shown in the app</li>
      <li>Private by design: everything personal stays on each laptop</li>
      <li>Hindi and Hinglish for teams across India</li>
    </ul>
  </div>
</div></div></section>

<section><div class="wrap split">
  <div class="stack">
    <p class="eyebrow">Private by design</p>
    <h2>Your buddy never phones home</h2>
    <p class="lede">Mochi makes no network requests. No account, no analytics, no ads and no cloud. Your name, moods and gratitude notes live in one file on your own computer, and worries are never saved at all.</p>
    <p><a href="privacy.html">Read the privacy policy →</a></p>
  </div>
  <div class="panel stack">
    <h3>Get Mochi</h3>
    <p class="muted">Free on the Microsoft Store for Windows 10 and Windows 11.</p>
    <div class="cta-row">{store_btn()}</div>
  </div>
</div></section>
''')

feat = [
    ('Healthy reminders', '3-remind', 'A water, stretch and eye-rest reminder with a speech bubble',
     'Water every 45 minutes, a stretch every hour and an eye rest every 20 minutes. Click Done and your buddy cheers. Ignore a reminder for 3 minutes and it floats to the middle of your screen and sulks until you take the break, or snooze it.',
     ['Turn each reminder on or off from the menu', 'Reminders wait while you focus, sleep or step away', 'Your buddy gets hungry too, so feed it a snack now and then']),
    ('Feed me a worry', '4-worry', 'Typing a worry for the buddy to eat',
     'Type what is on your mind. Your buddy eats it letter by letter, reflects back what you said, gives comfort that fits the topic and suggests one small next step. It runs fully offline and nothing is saved.',
     ['Understands deadlines, work, study, money, people, health and self-doubt', 'Sad feelings get a soft, quiet reply with no jokes', 'Harassment worries point to 112, the Women Helpline 181 and your POSH committee']),
    ('Celebrates your good news', '5-goodnews', 'Confetti after sharing good news',
     'Not everything is a worry. Type "I got promoted!" or "promotion mil gaya!" and your buddy throws a confetti party, gives you bonus points and offers to keep it in your gratitude jar.',
     ['Wins earn their own badges', 'Good news goes in the jar so you can find it on a rough day']),
    ('Focus with me', '6-focus', 'The focus timer under the buddy',
     'Pick 25 or 50 minutes. A small timer appears under your buddy and it goes quiet: no chatter, no hunger and no reminders until your break. When time is up it celebrates and offers a 5-minute break.',
     ['Pet it during focus and it whispers "shh"', 'Asks if you want another round after the break']),
    ('Sleeps when you sleep', '7-sleep', 'The buddy asleep at night',
     'Your buddy goes to bed at 11 pm, or 10, 12 or 1 if you prefer. If you are still working a while later, it asks whether you work night shifts, then keeps your hours instead. It dozes off when you are away for 30 minutes, and asks how you slept when you come back.',
     ['Made for night shifts and late deadlines', 'Reminders never pile up while you are away']),
    ('Play room', '9-play', 'Bubble pop game across the desktop',
     'Turn your desktop into a play area for a short break. Breathe with me (4 seconds in, 4 hold, 6 out), pop soft bubbles with no timer or score, or chase a warm light around the screen.',
     ['Every game makes your buddy happier', 'Press Esc and you are back at work']),
    ('Points, badges and the achievement board', '8-board', 'Achievement board',
     'Every healthy habit earns points, with a daily cap so it stays honest. Level up, keep your streak alive and collect 26 badges. The board shows your mood for the week and your gratitude jar. Shake it for a random good memory.',
     ['Daily mood check-in with five faces', 'One good thing a day in the gratitude jar']),
]
feat_html = ''.join(
    f'''<article class="feature"><div class="wrap split{' flip' if i % 2 else ''}"><div class="stack"><h2>{t}</h2><p class="lede">{d}</p><ul class="ticks">{''.join(f'<li>{x}</li>' for x in li)}</ul></div>{shot(img, alt)}</div></article>'''
    for i, (t, img, alt, d, li) in enumerate(feat))
pages['features.html'] = page('features.html', 'Features', 'Everything Mochi does: water, stretch and eye reminders, Feed me a worry, focus timer, sleep schedule, play room, badges and three languages.',
    hero('Features', 'Everything your buddy can do', 'Mochi is small, but it does a lot. Here is the full tour.', f'<div class="cta-row">{store_btn()}</div>') + feat_html +
    f'''<section><div class="wrap grid-3">
      <div class="panel stack"><h3>Three languages</h3><p class="muted">English, Hindi and Hinglish everywhere: menus, reminders, chatter and play. In Feed me a worry, your buddy replies in the language you wrote in.</p></div>
      <div class="panel stack"><h3>Boy, girl or non-binary</h3><p class="muted">Choose who your buddy is. In Hindi and Hinglish it changes how your buddy talks about itself.</p></div>
      <div class="panel stack"><h3>Kind, with limits</h3><p class="muted">Venting with a swear word gets empathy. Being rude to your buddy gets two warnings, then it hides for five minutes. Light sweet talk gets blushes, explicit talk gets a firm no.</p></div>
    </div></section>''', current='features.html')

pages['buddies.html'] = page('buddies.html', 'Meet the buddies', 'Mochi, Cinder, Mist, Dusk and Hope: five squishy desk buddies, each with its own personality, animations and lines.',
    hero('Meet the buddies', 'Pick the buddy that feels like you', 'Every buddy cares about the same things: your water, your back, your eyes and how you are really doing. They just show it differently.') +
    ''.join(f'''<section style="padding-block:40px"><div class="wrap split{' flip' if i % 2 else ''}">
      <div class="stage" style="display:grid;place-items:center;gap:18px;padding:40px 0;border-radius:var(--radius);background:var(--paper);border:1px solid var(--line)"><p class="bubble" style="max-width:320px">{q}</p><span class="buddy" data-skin="{k}" style="max-width:200px"></span></div>
      <div class="stack"><p class="trait">{t}</p><h2>{n}{soon(k)}</h2><p class="lede">{d}</p></div>
    </div></section>''' for i, (k, n, t, d, q, _c) in enumerate(BUDDIES)) +
    '''<section><div class="wrap"><div class="panel stack measure"><h3>The serious things stay the same</h3><p class="muted">Every buddy has its own voice for reminders, greetings and jokes. When someone shares something heavy, like sadness, harm or a crisis, every buddy answers with the same careful words and the same helplines. Personality never gets in the way of safety.</p><p><a href="safety.html">How Mochi handles hard moments →</a></p></div></div></section>''',
    current='buddies.html')

pages['teams.html'] = page('teams.html', 'Mochi for teams', 'Mochi for teams brings a friendly wellbeing buddy to every desk, with company helplines, healthy break habits and anonymous team insights. Built for companies in India.',
    hero('Mochi for teams', 'A wellbeing buddy for every desk in your company', 'Long hours, deadlines and night shifts wear people down quietly. Mochi gives every employee a small, friendly reason to drink water, stretch, rest their eyes and talk about what is heavy, without anyone watching over their shoulder.',
         '<div class="cta-row"><a class="btn btn-primary" href="#enquire">Book a demo</a><a class="btn btn-ghost" href="pricing.html">How pricing works</a></div><p class="tag" style="justify-self:start">Now taking early partners</p>') +
    '''<section><div class="wrap">
      <div class="section-head"><p class="eyebrow">What your company gets</p><h2>Everything in the free app, set up for your people</h2></div>
      <div class="grid-3">
        <div class="panel stack"><h3>Your helplines, built in</h3><p class="muted">Show your Employee Assistance Programme, HR contact and Internal Committee (POSH) details right where people need them, next to the national helplines.</p></div>
        <div class="panel stack"><h3>Licensed for every seat</h3><p class="muted">One licence key for the whole company, easy rollout to every laptop, and the reminders and schedule set to match your shifts.</p></div>
        <div class="panel stack"><h3>Anonymous team insights</h3><p class="muted">See, as team totals only, whether break habits and focus time are improving. Never anyone's worries, moods or name.</p></div>
        <div class="panel stack"><h3>Made for shift work</h3><p class="muted">Night-shift aware out of the box, so support, operations and BPO teams get reminders on their own hours.</p></div>
        <div class="panel stack"><h3>Three languages</h3><p class="muted">English, Hindi and Hinglish, so it feels natural for teams across India.</p></div>
        <div class="panel stack"><h3>Your branding</h3><p class="muted">A welcome message from your company and your wellbeing programme named in the app.</p></div>
      </div>
    </div></section>
    <section><div class="wrap"><div class="band"><span class="stars"></span><div class="split">
      <div class="stack"><p class="eyebrow">Privacy first</p><h2>Employees trust it because it doesn't report on them</h2><p class="lede">Mochi was built to keep everything personal on the employee's own laptop. That stays true for companies.</p></div>
      <ul class="ticks"><li>Worries typed into Mochi are never saved or sent anywhere</li><li>Moods and gratitude notes stay on the device</li><li>Team insights are anonymous totals, with a minimum group size</li><li>No screen monitoring, no keystroke logging, no tracking of what people work on</li></ul>
    </div></div></div></section>
    <section><div class="wrap">
      <div class="section-head"><p class="eyebrow">How a pilot works</p><h2>Start small with one team</h2></div>
      <ol class="day" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        <li><span class="when">Week 0</span><h3>Talk to us</h3><p>A short call about your teams, shifts and wellbeing goals.</p></li>
        <li><span class="when">Week 1</span><h3>Set up</h3><p>We add your helplines and branding and set the schedule for your shifts.</p></li>
        <li><span class="when">Weeks 2 to 5</span><h3>Pilot</h3><p>One team uses Mochi for a month.</p></li>
        <li><span class="when">Week 6</span><h3>Review</h3><p>Look at the anonymous totals and the team's feedback together, then decide.</p></li>
      </ol>
    </div></section>
    ''' + f'''<section id="enquire"><div class="wrap split">
      <div class="stack"><p class="eyebrow">Enquire</p><h2>Bring Mochi to your team</h2><p class="lede">Tell us a little about your company and we will get back to you within two working days.</p><p class="muted">Prefer email? Write to <a href="mailto:{EMAIL}">{EMAIL}</a>.</p></div>
      <form class="panel enquiry" data-mailto="{EMAIL}"{FORM_ATTR} data-subject="Mochi for teams enquiry">
        <div class="two"><div class="field"><label for="t-name">Your name</label><input id="t-name" name="name" required autocomplete="name"></div><div class="field"><label for="t-email">Work email</label><input id="t-email" name="email" type="email" required autocomplete="email"></div></div>
        <div class="two"><div class="field"><label for="t-company">Company</label><input id="t-company" name="company" required autocomplete="organization"></div><div class="field"><label for="t-size">Team size</label><select id="t-size" name="size"><option>Under 50</option><option>50 to 250</option><option>250 to 1,000</option><option>Over 1,000</option></select></div></div>
        <div class="field"><label for="t-msg">What would you like Mochi to help with?</label><textarea id="t-msg" name="message" placeholder="For example: break habits for our night-shift support team"></textarea></div>
        <button class="btn btn-primary" type="submit">Send enquiry</button>
        <input type="text" name="_honey" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="form-note">Your message comes straight to {EMAIL}. We reply within two working days.</p>
        <p class="form-status form-note" role="status" hidden></p>
      </form>
    </div></section>''', current='teams.html')

pages['pricing.html'] = page('pricing.html', 'Pricing', 'Mochi is free for individuals on the Microsoft Store. Mochi for teams is licensed per seat for companies.',
    hero('Pricing', 'Free for you. Licensed for companies.', 'Everyone can use the full Mochi app for free. Companies that want Mochi on every desk, with their own helplines and anonymous team insights, get a company licence.') +
    f'''<section style="padding-top:24px"><div class="wrap plans">
      <div class="panel plan"><span class="tag" style="justify-self:start">Personal</span><p class="price">Free</p><p class="muted">For anyone on Windows 10 or 11.</p>
        <ul class="ticks"><li>All the buddies</li><li>Water, stretch and eye reminders</li><li>Feed me a worry and good-news parties</li><li>Focus timer, sleep schedule and play room</li><li>Points, streaks, 26 badges and the gratitude jar</li><li>English, Hindi and Hinglish</li><li>No ads and no account</li></ul>
        {store_btn()}</div>
      <div class="panel plan dark"><span class="tag" style="justify-self:start">Mochi for teams</span><p class="price">Per seat <small>billed yearly</small></p><p class="muted">For companies that want a wellbeing buddy on every desk.</p>
        <ul class="ticks"><li>Everything in Personal</li><li>One licence key for the whole company</li><li>Your EAP, HR and POSH contacts in the app</li><li>Schedules set for your shifts</li><li>Anonymous team insights</li><li>Your company's welcome message</li><li>Help with rollout and a 4-week pilot</li></ul>
        <a class="btn btn-primary" href="teams.html#enquire">Ask for a quote</a></div>
    </div></section>
    <section><div class="wrap faq measure" style="max-width:780px">
      <h2>Pricing questions</h2>
      <details><summary>Will the free app always be free?</summary><div><p>Yes. The personal app on the Microsoft Store stays free, with no ads and no paid upgrades inside it.</p></div></details>
      <details><summary>How is Mochi for teams priced?</summary><div><p>Per employee per year, based on team size. Tell us about your company and we will send a quote.</p></div></details>
      <details><summary>Can we try it first?</summary><div><p>Yes. We start with a pilot for one team so you can see how people use it before rolling it out.</p></div></details>
    </div></section>''', current='pricing.html')

pages['download.html'] = page('download.html', 'Download Mochi', 'Download Mochi free from the Microsoft Store for Windows 10 and Windows 11.',
    hero('Download', 'Get your buddy', 'Mochi is free on the Microsoft Store. It installs in a few seconds and updates itself.', f'<div class="cta-row">{store_btn()}</div>') +
    f'''<section style="padding-top:24px"><div class="wrap grid-3">
      <div class="panel stack"><h3>System requirements</h3><dl class="kv"><dt>Windows</dt><dd>Windows 10 or 11, 64-bit</dd><dt>Space</dt><dd>About 400 MB</dd><dt>Internet</dt><dd>Only to install. Mochi runs offline.</dd></dl></div>
      <div class="panel stack"><h3>After you install</h3><p class="muted">Mochi appears near the bottom of your screen and asks what to call you. Right-click it, or the tray icon, for the menu.</p></div>
      <div class="panel stack"><h3>Direct download</h3><p class="muted">Can't use the Store? Get the installer from our <a href="{RELEASES}" rel="noopener">releases page</a>. Windows may show an "unknown publisher" warning for it, because only the Store version is signed.</p></div>
    </div></section>
    <section><div class="wrap split">
      <div class="stack"><h2>How to play with your buddy</h2><dl class="kv"><dt>Click</dt><dd>Pet it</dd><dt>Double-click</dt><dd>Give it a snack</dd><dt>Drag</dt><dd>Carry it anywhere on screen</dd><dt>Right-click</dt><dd>Open the menu: buddies, play, focus, reminders, language and more</dd></dl></div>
      {shot('1-hello', 'Mochi saying hello on a Windows desktop')}
    </div></section>''')

pages['safety.html'] = page('safety.html', 'Safety and helplines', 'How Mochi responds when someone is struggling, and free helplines in India. Mochi is a companion, not a medical or crisis service.',
    hero('Safety', 'Mochi cares, and knows when to point you to people who can help', 'Mochi is a friendly companion. It is not a therapist, a doctor or a crisis service. When someone shares something heavy, it stops joking and shows free helplines.') +
    '''<section style="padding-top:24px"><div class="wrap stack">
      <h2>If you need to talk to someone now</h2>
      <p class="muted">These are free in India. If you are in danger right now, call 112.</p>
      <div class="lines">
        <div class="panel line-card"><a class="num" href="tel:14416">14416</a><span class="who">Tele-MANAS</span><span class="muted">Government of India mental health helpline, 24×7, many languages</span></div>
        <div class="panel line-card"><a class="num" href="tel:18005990019">1800-599-0019</a><span class="who">KIRAN</span><span class="muted">Mental health rehabilitation helpline, 24×7</span></div>
        <div class="panel line-card"><a class="num" href="tel:+919999666555">+91 9999 666 555</a><span class="who">Vandrevala Foundation</span><span class="muted">Free counselling by phone and WhatsApp, 24×7</span></div>
        <div class="panel line-card"><a class="num" href="tel:181">181</a><span class="who">Women Helpline</span><span class="muted">For women facing violence or harassment</span></div>
        <div class="panel line-card"><a class="num" href="tel:112">112</a><span class="who">Emergency</span><span class="muted">Police, fire and ambulance</span></div>
      </div>
      <div class="panel stack" data-abroad hidden><h3>Outside India?</h3><p class="muted" data-abroad-text></p><p class="muted">Find a free helpline in your country at <a href="https://findahelpline.com" rel="noopener">findahelpline.com</a>.</p></div>
    </div></section>
    <section><div class="wrap grid-2">
      <div class="panel stack"><h3>How Mochi responds</h3><ul class="ticks"><li>Words about suicide or self-harm get a caring reply and the helplines above</li><li>Hopeless feelings like "what's the point" get a gentle reply and the helplines</li><li>Sadness gets a soft, quiet reply with no jokes</li><li>Harassment or abuse gets "I believe you", plus 112, 181 and your workplace POSH committee</li></ul></div>
      <div class="panel stack"><h3>What Mochi is not</h3><p class="muted">Mochi does not diagnose, treat or monitor anyone. It does not contact anyone on your behalf and it does not send what you type anywhere. It is a small, kind nudge toward real help.</p><p class="muted">Every buddy uses the same careful words in these moments, whatever its personality.</p></div>
    </div></section>''')

pages['about.html'] = page('about.html', 'About', f'Mochi is made by {STUDIO} in India. The story behind the desk buddy.',
    hero('About', 'Made for people who forget to look after themselves at work', f'Mochi started with a simple wish: something on the screen that makes long work hours a little less lonely and a little more healthy. It is made in India by {STUDIO}.') +
    f'''<section style="padding-top:24px"><div class="wrap split">
      <div class="prose">
        <h2>Why "Mochi"?</h2>
        <p>Mochi is the soft, round rice cake from Japan: squishy, sweet and comforting. That is exactly how we wanted a desk buddy to feel. So every buddy is a little mochi, each with its own flavour of personality.</p>
        <h2>Why a buddy?</h2>
        <p>Most of us spend the day staring at a screen, skipping water and holding our shoulders up near our ears. Reminder apps help for a week and then get ignored. A buddy is different. It is harder to ignore someone who is quietly pouting at you because you haven't had water since lunch.</p>
        <p>So Mochi became a small, soft character instead of a notification. It lives at the bottom of the screen, reacts when you pet it, sleeps when you sleep and listens when work is heavy.</p>
        <h2>What we care about</h2>
        <ul><li><b>Kindness first.</b> Mochi talks like a friend, never like a nagging app.</li><li><b>Your secrets are safe.</b> What you share with your buddy stays with your buddy. Mochi never shares anything with anyone.</li><li><b>Built for India.</b> Hindi and Hinglish, Indian helplines and night shifts are part of the design, not afterthoughts.</li><li><b>Safety over cleverness.</b> When someone is struggling, the jokes stop.</li></ul>
        <h2>Who makes Mochi</h2>
        <p>{STUDIO} is the studio of {COMPANY} and {OWNER}. Mochi is our first product: free for everyone, and coming to companies as <a href="teams.html">Mochi for teams</a>.</p>
      </div>
      <div class="panel" style="display:grid;place-items:center;gap:14px;padding:40px 20px"><p class="bubble">Thank you for reading about us 🥺 I saved you a spot 👉👈</p><span class="buddy happy" data-skin="smoke" style="max-width:220px"></span></div>
    </div></section>''')

faqs = [
    ('The app', [
        ('Is Mochi free?', 'Yes. The personal app is free on the Microsoft Store, with no ads and no account.'),
        ('Which computers does it run on?', 'Windows 10 and Windows 11, 64-bit. Mac and phone versions are not available yet.'),
        ('Will Mochi get in the way of my work?', 'It sits at the bottom of your screen and you can drag it anywhere. Turn off wandering, turn off any reminder, or start a focus session and it stays quiet until your break.'),
        ('How do I change buddies, language or my name?', 'Right-click your buddy, or the tray icon, and use the menu.'),
        ('How do I uninstall it?', 'Open Windows Settings, go to Apps, find Mochi and choose Uninstall.'),
    ]),
    ('Privacy and safety', [
        ('Does Mochi send my data anywhere?', 'No. Mochi makes no network requests. Everything it remembers stays in one file on your computer, and worries are never saved.'),
        ('Is Mochi a therapist?', 'No. Mochi is a friendly companion. When someone is struggling it shares free helplines like Tele-MANAS 14416. <a href="safety.html">Read more about safety.</a>'),
        ('Can my employer see what I type into Mochi?', 'No. Even with Mochi for teams, worries, moods and gratitude notes stay on your laptop. Companies only see anonymous team totals.'),
    ]),
    ('Companies', [
        ('Can my company buy Mochi for everyone?', 'Yes, through <a href="teams.html">Mochi for teams</a>. It adds a company licence, your own helplines and anonymous team insights.'),
        ('Do you offer a pilot?', 'Yes. We usually start with one team for four weeks.'),
    ]),
]
pages['faq.html'] = page('faq.html', 'FAQ', 'Answers to common questions about Mochi: price, Windows versions, privacy, safety and Mochi for teams.',
    hero('FAQ', 'Questions, answered', f'Can\'t find what you need? <a href="contact.html">Get in touch</a>.') +
    '<section style="padding-top:12px"><div class="wrap faq" style="max-width:820px">' +
    ''.join(f'<h2>{g}</h2>' + ''.join(f'<details><summary>{q}</summary><div><p>{a}</p></div></details>' for q, a in qs) for g, qs in faqs) +
    '</div></section>', current='faq.html')

pages['contact.html'] = page('contact.html', 'Contact', 'Contact the Mochi team for support, company enquiries, press and partnerships.',
    hero('Contact', 'Say hello', 'Questions, ideas, bugs or a kind word for your buddy. We read everything.') +
    f'''<section style="padding-top:24px"><div class="wrap split">
      <div class="stack">
        <h2>Email us</h2>
        <div class="copy-row"><code>{EMAIL}</code><button class="btn btn-ghost btn-small" type="button" data-copy="{EMAIL}">Copy</button></div>
        <p class="muted">We usually reply within two working days.</p>
        <dl class="kv"><dt>Companies</dt><dd><a href="teams.html#enquire">Mochi for teams enquiry</a></dd><dt>Press</dt><dd><a href="press.html">Press kit</a></dd><dt>In crisis?</dt><dd>Please don't wait for an email. Call Tele-MANAS on 14416 or 112. <a href="safety.html">More helplines</a></dd></dl>
      </div>
      <form class="panel enquiry" data-mailto="{EMAIL}"{FORM_ATTR} data-subject="Hello from mochicuddle.com">
        <div class="two"><div class="field"><label for="c-name">Your name</label><input id="c-name" name="name" required autocomplete="name"></div><div class="field"><label for="c-email">Email</label><input id="c-email" name="email" type="email" required autocomplete="email"></div></div>
        <div class="field"><label for="c-topic">Topic</label><select id="c-topic" name="topic"><option>Help with the app</option><option>Mochi for teams</option><option>Press</option><option>Partnership</option><option>Something else</option></select></div>
        <div class="field"><label for="c-msg">Message</label><textarea id="c-msg" name="message" required></textarea></div>
        <button class="btn btn-primary" type="submit">Send message</button>
        <input type="text" name="_honey" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="form-note">Your message comes straight to {EMAIL}. We reply within two working days.</p>
        <p class="form-status form-note" role="status" hidden></p>
      </form>
    </div></section>''')

press_assets = [
    ('boxart-1x1-2160x2160.png', 'Square logo, 2160 × 2160', 'boxart-1x1-2160x2160.png'),
    ('poster-2x3-1440x2160.png', 'Poster, 1440 × 2160', 'poster-2x3-1440x2160.png'),
] + [(f'{n}.png', t, f'{n}.png') for n, t in [('1-hello', 'Screenshot: hello'), ('2-skins', 'Screenshot: the four buddies'), ('3-remind', 'Screenshot: reminders'), ('4-worry', 'Screenshot: Feed me a worry'), ('6-focus', 'Screenshot: focus timer'), ('8-board', 'Screenshot: achievement board')]]
pages['press.html'] = page('press.html', 'Press kit', 'Mochi press kit: description, facts, logos, screenshots and brand colours.',
    hero('Press kit', 'Writing about Mochi?', f'Everything you need is here. For interviews or more material, email <a href="mailto:{EMAIL}">{EMAIL}</a>.') +
    f'''<section style="padding-top:24px"><div class="wrap grid-2">
      <div class="prose"><h2>About Mochi</h2><p><b>Short:</b> Mochi is a free desk buddy for Windows that reminds you to drink water, stretch and rest your eyes, and listens when work gets heavy.</p><p><b>Longer:</b> Mochi is a squishy little buddy with glowing eyes that lives at the bottom of your Windows screen. It nudges you to take healthy breaks, keeps you company through long days and night shifts, eats your worries and celebrates your wins. It speaks English, Hindi and Hinglish, shares Indian helplines when someone is struggling, and keeps everything private on your own computer. Mochi is made in India by {STUDIO}.</p></div>
      <div class="panel"><dl class="kv"><dt>Product</dt><dd>Mochi - Desk Buddy</dd><dt>Maker</dt><dd>{STUDIO} ({COMPANY}), India</dd><dt>Founder</dt><dd>{OWNER}</dd><dt>Platform</dt><dd>Windows 10 and 11</dd><dt>Price</dt><dd>Free; company licences for teams</dd><dt>Languages</dt><dd>English, Hindi, Hinglish</dd><dt>Get it</dt><dd><a href="{STORE}" rel="noopener">Microsoft Store</a></dd><dt>Website</dt><dd>mochicuddle.com</dd></dl></div>
    </div></section>
    <section style="padding-top:0"><div class="wrap stack">
      <h2>Logos and screenshots</h2><p class="muted">Click to open the full-size image. Please don't change the buddy's look or colours.</p>
      <div class="assets">{''.join(f'<a class="asset" href="assets/press/{f}"><img src="assets/{"press/" + f if "x" in f else "img/" + f[:-4] + ".webp"}" loading="lazy" alt="{t}"><span>{t}</span></a>' for f, t, _ in press_assets)}</div>
      <h2 style="margin-top:32px">Colours</h2>
      <div class="swatches">
        <div class="swatch"><span style="background:#000"></span><p><b>Mochi black</b>#000000</p></div>
        <div class="swatch"><span style="background:#1b2a44"></span><p><b>Navy</b>#1B2A44</p></div>
        <div class="swatch"><span style="background:#eaf1fb"></span><p><b>Sky</b>#EAF1FB</p></div>
        <div class="swatch"><span style="background:#ffb36b"></span><p><b>Ember</b>#FFB36B</p></div>
        <div class="swatch"><span style="background:#141b33"></span><p><b>Night</b>#141B33</p></div>
      </div>
    </div></section>''')

releases = [
    ('0.10', '24 Oct 2026', ['Every buddy now has its own personality, lines and animations', 'Mochi is shy, Cinder is a hype coach, Mist is calm and Dusk is a dreamy night owl', 'Available on the Microsoft Store']),
    ('0.9', '24 Oct 2026', ['Sleep schedule: your buddy goes to bed at night and asks how you slept', 'Night-shift mode keeps your hours instead', 'Good news gets a confetti party and a place in the gratitude jar', 'Gentler replies for sadness and hopeless feelings']),
    ('0.8', '23 Oct 2026', ['Focus timer for 25 or 50 minutes', 'Daily mood check-in and gratitude jar', 'Points, levels, streaks, 26 badges and the achievement board', 'Security hardening and privacy policy']),
    ('0.7', '23 Oct 2026', ['Feed me a worry gets its own space', 'About 950 lines, with no repeats in a row', 'Your buddy reacts to where you drop it']),
    ('0.6', '23 Oct 2026', ['Choose whether your buddy is a boy, a girl or non-binary', 'Sweet replies to sweet talk, a kind no to anything explicit']),
    ('0.5', '23 Oct 2026', ['Hindi and Hinglish', 'Understands venting versus rudeness']),
    ('0.4', '23 Oct 2026', ['Ignored reminders make your buddy upset until you take the break', 'Your buddy learns your name', 'Indian helplines for hard moments']),
    ('0.2', '23 Oct 2026', ['Play room: breathe with me, bubble pop and chase the light']),
    ('0.1', '23 Oct 2026', ['Mochi is born, with water, stretch and eye reminders']),
]
pages['changelog.html'] = page('changelog.html', "What's new", "What's new in Mochi: every release and what it added.",
    hero("What's new", 'Every version of Mochi', 'Your buddy keeps learning new things. Store users get each update automatically.') +
    '<section style="padding-top:12px"><div class="wrap"><ol class="releases">' +
    ''.join(f'<li><div><p class="ver">v{v}</p><p class="date">{d}</p></div><ul>{"".join(f"<li>{x}</li>" for x in items)}</ul></li>' for v, d, items in releases) +
    '</ol></div></section>')

pages['privacy.html'] = page('privacy.html', 'Privacy policy', 'How Mochi and mochicuddle.com handle your information. In short: the app keeps everything on your computer.',
    hero('Privacy', 'Privacy policy', 'In short: the Mochi app keeps everything on your computer, and this website does not track you.') +
    f'''<section style="padding-top:12px"><div class="wrap prose">
      <p class="updated">Last updated 24 October 2026</p>
      <h2>Who we are</h2><p>Mochi is made by {STUDIO}, the studio of {COMPANY} and {OWNER}, India. Contact: {EMAIL}.</p>
      <h2>The Mochi app</h2>
      <p>Mochi makes no network requests. It has no account, analytics, advertising or cloud storage, and nothing is sent to us or anyone else.</p>
      <p>To work, Mochi saves a small file on your computer at <code>%APPDATA%\\Mochi\\pet-state.json</code>. It holds:</p>
      <ul><li>the name you give yourself and your buddy, and your choice of buddy, language and gender</li><li>your settings, such as reminders and sleep schedule</li><li>points, badges, streaks and activity counts</li><li>your daily mood faces and the good things you add to the gratitude jar</li><li>the times you usually go to sleep, so your buddy can follow a night-shift schedule</li></ul>
      <p>What you type into Feed me a worry is never saved. Mochi also reads how long your computer has been idle (a number of seconds) so it can pause reminders and fall asleep while you are away, and where the mouse pointer is so its eyes can follow it (never saved or sent). It does not read what you type in other apps or what is on your screen.</p>
      <p>To delete everything, uninstall Mochi or delete that file.</p>
      <h2>This website</h2>
      <p>mochicuddle.com uses no cookies, analytics or trackers. Fonts are loaded from Google Fonts, which receives your IP address to deliver them. The site is hosted on a static host, which may keep standard server logs for security.</p>
      <p>If you use a form on this site, your message is passed to our inbox by FormSubmit (formsubmit.co), a form delivery service. If you email us, it comes straight to our inbox. We receive only what you send and use it only to reply.</p>
      <h2>Mochi for teams</h2>
      <p>The company edition keeps the same rule: worries, moods and gratitude notes stay on each employee's device. Any team insights are anonymous totals. Each company agreement describes exactly what is collected.</p>
      <h2>Children</h2><p>Mochi is rated for everyone, but it is made for working adults and does not knowingly collect information from anyone.</p>
      <h2>Changes</h2><p>If this policy changes, we will update this page and the date at the top.</p>
    </div></section>''')

pages['terms.html'] = page('terms.html', 'Terms of use', 'Terms for using the Mochi app and mochicuddle.com.',
    hero('Terms', 'Terms of use', 'The short version: enjoy your buddy, don\'t copy or resell it, and remember it is a companion, not medical help.') +
    f'''<section style="padding-top:12px"><div class="wrap prose">
      <p class="updated">Last updated 24 October 2026</p>
      <h2>Using Mochi</h2><p>You may install and use the free Mochi app for your own personal use. When you install it from the Microsoft Store, Microsoft's Standard Application License Terms also apply. Company use on many devices needs a <a href="teams.html">Mochi for teams</a> licence.</p>
      <h2>Ownership</h2><p>Mochi, its characters (Mochi, Cinder, Mist, Dusk and Hope), artwork, text and code are © {COMPANY}. All rights reserved. You may not copy, modify, redistribute or sell the app or its characters without written permission. The source code is published for transparency only.</p>
      <h2>Not medical advice</h2><p>Mochi offers friendly reminders and kind words. It is not a medical, mental health or emergency service and does not replace professional help. If you are in danger, call 112. Free helplines are listed on our <a href="safety.html">safety page</a>.</p>
      <h2>No warranty</h2><p>Mochi is provided as it is. We work hard to make it reliable, but we can't promise it will always be free of bugs, and we are not liable for losses from using it, to the extent the law allows.</p>
      <h2>This website</h2><p>You may share links to this site and use the <a href="press.html">press kit</a> to write about Mochi.</p>
      <h2>Contact</h2><p>Questions about these terms: {EMAIL}.</p>
      <h2>Governing law</h2><p>These terms are governed by the laws of India.</p>
    </div></section>''')

pages['404.html'] = page('404.html', 'Page not found', 'This page drifted away.',
    '''<section class="wrap lost"><span class="buddy" data-skin="mist"></span><h1>This page drifted away</h1><p class="lede">It must have rolled off somewhere. Let's get you back.</p><div class="cta-row" style="justify-content:center"><a class="btn btn-primary" href="index.html">Go home</a><a class="btn btn-ghost" href="faq.html">Read the FAQ</a></div></section>''')

for name, content in pages.items():
    (OUT / name).write_text(content, encoding='utf-8')

# 404 is served from any folder depth, so it needs absolute asset paths.
p404 = OUT / '404.html'
t = p404.read_text(encoding='utf-8')
for a in ['href="assets/', 'src="assets/', 'href="index.html', 'href="faq.html', 'href="favicon', 'href="apple']:
    t = t.replace(a, a.replace('"', '"/', 1))
p404.write_text(t, encoding='utf-8')

urls = [p for p in pages if p != '404.html']
(OUT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    ''.join(f'  <url><loc>{SITE}/{"" if p == "index.html" else p}</loc></url>\n' for p in urls) + '</urlset>\n')
(OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n')
(OUT / 'CNAME').write_text('mochicuddle.com\n')
(OUT / '.nojekyll').write_text('')
print('built', len(pages), 'pages')
