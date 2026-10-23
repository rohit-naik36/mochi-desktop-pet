// Feed-a-worry replies. Runs fully offline: it works out what the worry is
// about and answers like a friend would, using the person's name.
(function (root) {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Free, confidential support lines in India.
  const HELPLINES_IN = [
    { name: 'Tele-MANAS (Govt. of India, free, 24/7)', number: '14416' },
    { name: 'KIRAN mental health helpline (free, 24/7)', number: '1800-599-0019' },
    { name: 'Vandrevala Foundation (call or WhatsApp, 24/7)', number: '+91 9999 666 555' },
    { name: 'Emergency', number: '112' },
  ];

  const TOPICS = [
    {
      id: 'crisis',
      words: ['kill myself', 'killing myself', 'suicide', 'suicidal', 'end it all', 'end my life', 'want to die', 'wanna die', 'hurt myself', 'self harm', 'self-harm', 'cut myself',
        'no reason to live', "don't want to live", 'dont want to live', 'not worth living', 'better off without me', 'better off dead',
        'khudkushi', 'aatmahatya', 'atmahatya', 'marna chahta', 'marna chahti', 'jeena nahi', 'mar jaana', 'mar jana'],
      serious: true,
    },
    {
      id: 'deadline',
      words: ['deadline', 'due', 'submit', 'submission', 'late', 'behind', 'overdue', 'by friday', 'by monday', 'tomorrow', 'tonight', 'running out of time', 'no time'],
      comfort: [
        "Ugh, deadlines are the worst, {name}. Your brain's probably replaying the whole to-do list on loop right now.",
        "Okay, that's real pressure. But you've pulled off tight ones before, and the only reason it feels this loud is because you care.",
        "Oof, I get it. The clock feels like it's yelling at you. It's not as hopeless as it feels in this exact minute though, promise.",
      ],
      steps: [
        "Pick the smallest piece of it and do just that for 10 minutes. Not the whole thing. Just one bite.",
        "Decide what 'good enough' looks like for this one. Perfect can wait for a day when you're not drowning.",
        "If it honestly won't fit, send a quick heads-up now. People are way nicer about early warnings than late surprises.",
      ],
      asks: ["What's the very first bit you could knock out?", 'Want to do a quick breathe with me before you dive in?'],
    },
    {
      id: 'work',
      words: ['work', 'job', 'boss', 'manager', 'meeting', 'client', 'project', 'presentation', 'review', 'appraisal', 'promotion', 'fired', 'layoff', 'laid off', 'coworker', 'colleague', 'team', 'emails', 'inbox', 'workload', 'office', 'hike'],
      comfort: [
        "Work stuff has a sneaky way of following you everywhere, huh {name}? No wonder it's stuck in your head.",
        "That sounds genuinely draining. You're allowed to find this hard. It doesn't mean you're bad at your job.",
        "Honestly? That would get to anyone. You're not overreacting.",
      ],
      steps: [
        "Write down the one thing that would make tomorrow 10% easier and do only that first.",
        "Close every tab you don't need for the next 20 minutes. Less stuff in view, less stuff shouting at you.",
        "If someone else is part of this, a short, honest message usually helps more than another hour of worrying.",
      ],
      asks: ['Is it the work itself or the people around it?', 'Want me to remind you to take a proper break later?'],
    },
    {
      id: 'study',
      words: ['exam', 'exams', 'test', 'grade', 'grades', 'marks', 'result', 'results', 'study', 'studying', 'assignment', 'homework', 'college', 'university', 'school', 'thesis', 'interview', 'placement', 'placements'],
      comfort: [
        "Exams and stuff that 'decides things' are so stressful, {name}. Of course it's on your mind.",
        "Hey, one result doesn't get to decide how smart or capable you are. Seriously.",
        "You've gotten through hard ones before. Past you would totally vouch for you right now.",
      ],
      steps: [
        'Pick one topic, give it 25 focused minutes, then take a real break. I\'ll keep watch.',
        'Try explaining one idea out loud like you\'re teaching me. It sticks better, and I\'m a great listener.',
      ],
      asks: ["What's the topic that scares you most?", 'Want to do one round of breathing first?'],
    },
    {
      id: 'money',
      words: ['money', 'rent', 'bill', 'bills', 'debt', 'loan', 'emi', 'salary', 'pay', 'paid', 'broke', 'afford', 'expenses', 'savings', 'bank', 'credit card'],
      comfort: [
        "Money worries are heavy, {name}, because they feel like they touch everything. That's a lot to carry around.",
        "Ugh, yeah. Money stress is the kind that sits in your chest. You're not dumb for worrying about it.",
      ],
      steps: [
        'Write down the one number that scares you most. Seeing it plainly is usually less scary than the fog around it.',
        'Pick one small, concrete thing for this week: one call, one email, or one bill to check. Just one.',
      ],
      asks: ['Is it more of a this-month thing or a long-term thing?'],
    },
    {
      id: 'people',
      words: ['friend', 'friends', 'partner', 'boyfriend', 'girlfriend', 'wife', 'husband', 'relationship', 'breakup', 'broke up', 'fight', 'argument', 'mom', 'dad', 'mother', 'father', 'parents', 'family', 'brother', 'sister', 'ignored', 'lonely', 'alone', 'nobody', 'no one'],
      comfort: [
        "Stuff with people we love hurts the most, {name}. It's okay that it's sitting with you.",
        "Feeling disconnected is really hard. For what it's worth, I'm right here and I'm not going anywhere.",
        "That sounds painful. You don't have to have it all figured out right now.",
      ],
      steps: [
        "If there's something you wish you could say, try writing it out first. You don't have to send it.",
        'Think of one person who usually makes you feel lighter, and send them a tiny hello. Even just a meme.',
      ],
      asks: ['Do you want to talk to them about it, or just let it out here?'],
    },
    {
      id: 'health',
      words: ['sick', 'ill', 'fever', 'health', 'doctor', 'hospital', 'pain', 'headache', 'tired', 'exhausted', 'sleep', 'insomnia', "can't sleep", 'cant sleep', 'burnout', 'burned out', 'burnt out', 'anxious', 'anxiety', 'panic', 'overwhelmed', 'stressed'],
      comfort: [
        "Hey {name}, running on empty makes literally everything harder. Of course you're struggling.",
        "Your body and brain are waving a little flag at you. Being this tired or on edge is real, not weakness.",
        "That sounds exhausting. Be a bit gentle with yourself today, okay?",
      ],
      steps: [
        'Drink a glass of water and drop your shoulders. Tiny, I know, but it helps.',
        'Try 5-4-3-2-1 with me: 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.',
        "If this has been going on for a while, it's really worth talking to a doctor. You deserve proper support.",
      ],
      asks: ['When did you last take a real break?', 'Want to breathe with me for a minute?'],
    },
    {
      id: 'self',
      words: ['not good enough', 'failure', 'failed', 'stupid', 'useless', 'worthless', 'imposter', 'impostor', 'behind everyone', 'hate myself', "can't do", 'cant do', 'cannot do', 'mess up', 'messed up', 'mistake', 'embarrassed', 'loser'],
      comfort: [
        "Hey. That voice in your head is being really mean to you, {name}. You'd never talk to a friend like that.",
        "Messing up is just proof you're actually trying things. It doesn't make you any less.",
        "I've seen you show up every day. That counts for way more than you're giving yourself credit for.",
      ],
      steps: [
        'Write down one thing you handled well this week. Small totally counts.',
        "Ask yourself what you'd tell a friend who said this, and then say that to yourself. I'll wait.",
      ],
      asks: ['What would you tell me if I said that about myself?'],
    },
    {
      id: 'future',
      words: ['future', 'what if', 'career', 'decision', 'decide', 'choice', 'uncertain', 'uncertainty', 'scared', 'afraid', 'worried', 'nervous', 'confused', 'lost'],
      comfort: [
        "Not knowing how things will turn out is one of the hardest feelings, {name}. You don't have to solve the whole future today.",
        "It's okay to not have it all mapped out. Pretty much nobody does, they're just better at hiding it.",
      ],
      steps: [
        'Make two quick lists: stuff you can control and stuff you can\'t. Let the second list go for tonight.',
        'Just decide the very next step. Future you can figure out the rest when they get there.',
      ],
      asks: ['What feels like the scariest "what if" right now?'],
    },
  ];

  const GENERAL = {
    comfort: [
      "That's been sitting on you, huh {name}? Thanks for letting me have it.",
      "Big or small, if it's bugging you, it matters. I'm glad you said it out loud.",
      "You're carrying more than people can see. It makes total sense to feel this way.",
    ],
    steps: [
      'Take one slow breath with me and pick the smallest thing you can do about it today.',
      "Jot it down somewhere and give yourself permission to come back to it later. It'll keep, I promise.",
      'Stand up, stretch, look at something far away for a sec. Then come back. Fresh eyes help.',
    ],
    asks: ['Got another one for me? I\'m still hungry.', 'Want to breathe with me for a minute?'],
  };

  const OPENERS = ['*munch munch*', '*gulp*', '*crunch crunch*', '*nom nom*', '*chomp*'];
  const REFLECTS = [
    '"{q}"... gone. I ate it.',
    'Okay, "{q}" is officially in my tummy now.',
    '"{q}"? Not your problem for the next few minutes. It\'s mine now.',
  ];

  function shorten(text) {
    const t = text.trim().replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
    return t.length > 60 ? t.slice(0, 57).trimEnd() + '...' : t;
  }

  function classify(text) {
    const t = ' ' + text.toLowerCase().replace(/[’']/g, "'") + ' ';
    let best = null;
    let bestScore = 0;
    for (const topic of TOPICS) {
      let score = 0;
      for (const w of topic.words) {
        const hit = w.includes(' ') ? t.includes(w) : new RegExp(`[^a-z]${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^a-z]`).test(t);
        if (hit) score += w.includes(' ') ? 2 : 1;
      }
      if (topic.serious && score > 0) return topic; // safety always wins
      if (score > bestScore) { best = topic; bestScore = score; }
    }
    return best;
  }

  function intensity(text) {
    let n = 0;
    if (/!{2,}/.test(text)) n++;
    if (/\b(so|really|very|too|extremely|always|never|everything|nothing|can't|cant)\b/i.test(text)) n++;
    if (text.length > 120) n++;
    if (text === text.toUpperCase() && /[A-Z]{4,}/.test(text)) n++;
    return n;
  }

  function respond(text, name) {
    const who = (name || '').trim() || 'friend';
    const fill = (s) => s.replace(/\{name\}/g, who).replace(/ friend,? friend/, ' friend');
    const topic = classify(text);
    if (topic && topic.serious) {
      return {
        topic: 'crisis',
        serious: true,
        opener: '',
        reflect: fill("{name}, I'm really, really glad you told me."),
        comfort: fill("I care about you, and I don't want you to go through this alone. Please talk to someone right now. These are free and confidential, and they're there for exactly this:"),
        helplines: HELPLINES_IN,
        step: 'If you feel like you might act on it, call 112 or go to the nearest hospital. And if you can, tell someone near you how you feel.',
        ask: "I'll stay right here with you.",
        followups: ['breathe', 'thanks'],
      };
    }
    const src = topic || GENERAL;
    const heavy = intensity(text) >= 2;
    return {
      topic: topic ? topic.id : 'general',
      opener: pick(OPENERS),
      reflect: pick(REFLECTS).replace('{q}', shorten(text)),
      comfort: fill((heavy ? 'Okay, that sounds like a LOT. ' : '') + pick(src.comfort)),
      step: fill(pick(src.steps)),
      ask: fill(pick(src.asks)),
      followups: heavy ? ['breathe', 'another', 'thanks'] : ['another', 'breathe', 'thanks'],
    };
  }

  root.WorryEater = { respond, classify, HELPLINES_IN };
  if (typeof module !== 'undefined') module.exports = root.WorryEater;
})(typeof window !== 'undefined' ? window : globalThis);
