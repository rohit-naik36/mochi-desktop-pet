// Feed-a-worry replies. Runs fully offline: it picks up what the worry is
// about, reflects it back, offers comfort and one tiny next step.
(function (root) {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const TOPICS = [
    {
      id: 'crisis',
      words: ['kill myself', 'suicide', 'end it all', 'end my life', 'want to die', 'hurt myself', 'self harm', 'self-harm', 'no reason to live', 'better off without me'],
      comfort: [
        "I'm really glad you told me. What you're carrying sounds incredibly heavy, and you shouldn't have to hold it alone.",
      ],
      steps: [
        'Please reach out to someone right now: a friend, family member, or a crisis line. findahelpline.com lists free, confidential lines for your country. If you are in danger, call your local emergency number.',
      ],
      followups: ['breathe'],
      serious: true,
    },
    {
      id: 'deadline',
      words: ['deadline', 'due', 'submit', 'submission', 'late', 'behind', 'overdue', 'by friday', 'by monday', 'tomorrow', 'tonight', 'time', 'running out'],
      comfort: [
        'Deadlines make everything feel louder than it is. The fact that it bothers you means you care about doing it well.',
        "Time pressure is exhausting. You don't need to finish it all right now, just the next piece.",
      ],
      steps: [
        'Write down the very next 10-minute task, just one, and start only that.',
        "Pick what 'good enough' looks like for this one, and aim there instead of perfect.",
        'If it truly cannot fit, send a short heads-up message now. Early is always kinder than late.',
      ],
    },
    {
      id: 'work',
      words: ['work', 'job', 'boss', 'manager', 'meeting', 'client', 'project', 'presentation', 'review', 'promotion', 'fired', 'layoff', 'laid off', 'coworker', 'colleague', 'team', 'email', 'emails', 'inbox', 'workload', 'office'],
      comfort: [
        "Work stress has a way of following you everywhere. It makes sense that it's on your mind.",
        "That sounds like a lot to carry at work. You're allowed to find it hard.",
      ],
      steps: [
        'Jot down the one thing that would make tomorrow 10% easier, and do only that first.',
        "Close every tab you don't need for the next 20 minutes. Fewer things in view, fewer things shouting.",
        'If someone else is part of this, a short honest message often helps more than more worrying.',
      ],
    },
    {
      id: 'study',
      words: ['exam', 'exams', 'test', 'grade', 'grades', 'marks', 'study', 'studying', 'assignment', 'homework', 'college', 'university', 'school', 'thesis', 'interview'],
      comfort: [
        "Preparing for something that matters is stressful. You've gotten through hard ones before.",
        'One result does not get to decide how capable you are.',
      ],
      steps: [
        'Pick one topic and give it 25 focused minutes, then take a real break.',
        'Explain one idea out loud as if teaching it. It sticks better and feels less scary.',
      ],
    },
    {
      id: 'money',
      words: ['money', 'rent', 'bill', 'bills', 'debt', 'loan', 'emi', 'salary', 'pay', 'paid', 'broke', 'afford', 'expenses', 'savings', 'bank'],
      comfort: [
        'Money worries sit heavy because they feel like they touch everything. It makes sense this is weighing on you.',
      ],
      steps: [
        'Write down the one number that worries you most. Seeing it plainly is often less scary than the fog.',
        'Pick one small, concrete action for this week, like one call, one email, or one bill to check.',
      ],
    },
    {
      id: 'people',
      words: ['friend', 'friends', 'partner', 'boyfriend', 'girlfriend', 'wife', 'husband', 'relationship', 'breakup', 'broke up', 'fight', 'argument', 'mom', 'dad', 'mother', 'father', 'parents', 'family', 'brother', 'sister', 'ignored', 'lonely', 'alone'],
      comfort: [
        "Things with people we care about hurt the most. It's okay that this is staying with you.",
        "Feeling disconnected is hard. I'm right here, for what it's worth.",
      ],
      steps: [
        "If there's something you wish you could say, try writing it out first. You don't have to send it.",
        'Think of one person who usually makes you feel lighter, and send them a tiny hello.',
      ],
    },
    {
      id: 'health',
      words: ['sick', 'ill', 'health', 'doctor', 'hospital', 'pain', 'headache', 'tired', 'exhausted', 'sleep', 'insomnia', "can't sleep", 'cant sleep', 'burnout', 'burned out', 'burnt out', 'anxious', 'anxiety', 'panic'],
      comfort: [
        'Your body and mind are telling you something. Being this tired or on edge is real, not weakness.',
        "Running on empty makes everything harder. Of course you're struggling.",
      ],
      steps: [
        'Drink a glass of water and drop your shoulders. Small, but it helps.',
        'Try the 5-4-3-2-1: notice 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.',
        'If this has gone on a while, it is worth talking to a doctor. You deserve support.',
      ],
    },
    {
      id: 'self',
      words: ['not good enough', 'failure', 'failed', 'stupid', 'useless', 'worthless', 'imposter', 'impostor', 'behind everyone', 'hate myself', "can't do", 'cant do', 'cannot do', 'mess up', 'messed up', 'mistake', 'embarrassed'],
      comfort: [
        "That voice is being really harsh with you. You wouldn't talk to a friend like that, and you don't deserve it either.",
        "Making mistakes is part of doing real things. It doesn't make you less.",
      ],
      steps: [
        'Write down one thing you handled well this week, however small.',
        'Ask yourself what you would say to a friend who told you this, then say it to yourself.',
      ],
    },
    {
      id: 'future',
      words: ['future', 'what if', 'career', 'decision', 'decide', 'choice', 'uncertain', 'uncertainty', 'scared', 'afraid', 'worried', 'nervous'],
      comfort: [
        "Not knowing how something will turn out is one of the hardest feelings. You don't have to solve the whole future today.",
      ],
      steps: [
        'Split it into two lists: what you can control and what you cannot. Let the second list go for tonight.',
        'Decide the very next step only. The rest can wait until you get there.',
      ],
    },
  ];

  const GENERAL = {
    comfort: [
      "That sounds like it's been sitting on you. Thank you for letting it out.",
      "Whatever size it is, if it's bothering you, it matters.",
      'It makes sense to feel this way. You are carrying more than people can see.',
    ],
    steps: [
      'Take one slow breath and pick the smallest thing you can do about it today.',
      "Write it down somewhere and give yourself permission to come back to it later. It'll keep.",
      'Stand up, stretch for a moment, and look at something far away. Then come back to it.',
    ],
  };

  const OPENERS = ['*munch munch*', '*gulp*', '*crunch*', '*nom*'];

  function shorten(text) {
    const t = text.trim().replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
    return t.length > 60 ? t.slice(0, 57).trimEnd() + '...' : t;
  }

  function classify(text) {
    const t = ' ' + text.toLowerCase() + ' ';
    let best = null;
    let bestScore = 0;
    for (const topic of TOPICS) {
      let score = 0;
      for (const w of topic.words) if (t.includes(w.includes(' ') ? w : ' ' + w) || t.includes(w + ' ')) score += w.includes(' ') ? 2 : 1;
      if (topic.serious && score > 0) return topic; // safety first
      if (score > bestScore) { best = topic; bestScore = score; }
    }
    return best;
  }

  function intensity(text) {
    let n = 0;
    if (/!{2,}/.test(text)) n++;
    if (/\b(so|really|very|too|extremely|always|never|everything|nothing)\b/i.test(text)) n++;
    if (text.length > 120) n++;
    if (text === text.toUpperCase() && /[A-Z]{4,}/.test(text)) n++;
    return n;
  }

  function respond(text) {
    const topic = classify(text);
    const src = topic || GENERAL;
    const quote = shorten(text);
    const heavy = intensity(text) >= 2;
    if (topic && topic.serious) {
      return { topic: topic.id, serious: true, opener: '', reflect: '', comfort: src.comfort[0], step: src.steps[0], followups: ['breathe'] };
    }
    return {
      topic: topic ? topic.id : 'general',
      opener: pick(OPENERS),
      reflect: `"${quote}" is gone now. I ate it.`,
      comfort: (heavy ? 'That sounds like a lot. ' : '') + pick(src.comfort),
      step: pick(src.steps),
      followups: heavy ? ['breathe', 'another', 'thanks'] : ['another', 'breathe', 'thanks'],
    };
  }

  root.WorryEater = { respond, classify };
  if (typeof module !== 'undefined') module.exports = root.WorryEater;
})(typeof window !== 'undefined' ? window : globalThis);
