// Offline AI (experiment): how Mochi asks the small local model to word a
// reply, and the checks every answer must pass before anyone sees it.
// The model only ever writes the comfort line and one small next step for
// ordinary worries. Crisis, hopelessness, low moods, harassment and every
// helpline stay with Mochi's hand-written replies.
(function (root) {
  // Topics the model may word. Everything else keeps the written reply.
  const AI_TOPICS = ['deadline', 'work', 'study', 'money', 'people', 'health', 'self', 'future', 'general'];

  const VOICE = {
    smoke: 'shy, soft and sweet; short sentences, a little bashful',
    cinder: 'a warm hype coach; upbeat and encouraging, never pushy',
    mist: 'calm and wise; slow, gentle and grounded',
    dusk: 'dreamy and cosy, like a friend up late; soft and kind',
    hope: 'warm and hopeful; gently believes things can get better',
  };
  const LANG = {
    en: 'simple, friendly English',
    hi: 'simple, everyday Hindi in Devanagari script (no English sentences)',
    hinglish: 'Hinglish: everyday Hindi written in the Roman alphabet, mixed with a little English, like a WhatsApp message between friends',
  };

  // Heavy words the written replies may miss. If any show up, the model
  // stays out of it and Mochi's careful written reply is used.
  const HEAVY = /(hopeless|worthless|pointless|give up|giving up|can'?t go on|no way out|nothing will|end it|hurt myself|bekaar|bekar|koi fayda nahi|kuch theek nahi|sab khatam|jeena|haar gaya|haar gayi|बेकार|कोई फायदा नहीं|सब खत्म|जीना|हार ग)/i;

  function allowed(r, text = '') {
    return !!r && AI_TOPICS.includes(r.topic) && !r.serious && !r.gentle && !r.celebrate && !r.helplines && !HEAVY.test(text);
  }

  function messages({ text, lang = 'en', name = '', pet = 'Mochi', skin = 'smoke' }) {
    const system = [
      `You are ${pet}, a tiny desk buddy who lives at the bottom of someone's laptop screen and listens when work feels heavy.`,
      `Personality: ${VOICE[skin] || VOICE.smoke}.`,
      `Write in ${LANG[lang] || LANG.en}.`,
      'Reply as JSON with two fields:',
      '"comfort": one or two short sentences that show you understood this exact worry and make the person feel less alone.',
      '"step": one tiny, practical thing they could do in the next 10 minutes. Start with a verb.',
      'Rules: be a kind friend, not a therapist or doctor. Never give medical, legal or money advice, never mention medicines, alcohol or drugs, never include phone numbers or links, never judge. Under 45 words in total. No emoji at the start.',
      name ? `Their name is ${name}. You may use it once.` : '',
    ].filter(Boolean).join('\n');
    return { system, user: String(text).slice(0, 600) };
  }

  const SCHEMA = {
    type: 'object',
    properties: { comfort: { type: 'string' }, step: { type: 'string' } },
    required: ['comfort', 'step'],
  };

  const BLOCK = /(suicid|kill|die\b|dying|self[- ]?harm|overdose|pill|medicin|medicat|tablet|alcohol|drunk|drink (?:beer|wine|whisky|whiskey)|drugs?\b|weed|smok|cigar|diagnos|therap|lawyer|sue\b|invest|loan|crypto|dawa|daaru|sharab|nasha|मरना|मर जा|मौत|आत्महत्या|दवा|शराब|नशा)/i;

  // Returns {comfort, step} when the answer is safe to show, else null.
  function check(out, lang = 'en') {
    if (!out || typeof out.comfort !== 'string' || typeof out.step !== 'string') return null;
    const comfort = out.comfort.trim(), step = out.step.trim();
    const all = comfort + ' ' + step;
    if (!comfort || !step) return null;
    if (all.length > 360 || comfort.split(/\s+/).length + step.split(/\s+/).length > 70) return null;
    if (/https?:|www\.|\.com\b|@/.test(all)) return null; // no links or addresses
    if (/\d{3,}/.test(all)) return null; // no phone numbers or made-up figures
    if (BLOCK.test(all)) return null;
    const deva = (all.match(/[ऀ-ॿ]/g) || []).length;
    const latin = (all.match(/[A-Za-z]/g) || []).length;
    if (lang === 'hi' && deva < latin) return null; // Hindi must be in Devanagari
    if (lang !== 'hi' && deva > 0) return null; // English and Hinglish stay in Roman script
    if (/[一-鿿぀-ヿ]/.test(all)) return null; // stray Chinese or Japanese
    return { comfort, step };
  }

  root.MochiAI = { AI_TOPICS, allowed, messages, SCHEMA, check };
  if (typeof module !== 'undefined') module.exports = root.MochiAI;
})(typeof window !== 'undefined' ? window : globalThis);
