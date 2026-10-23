// Spots swearing and works out who it's aimed at: venting about a situation
// is fine (Mochi empathises), swearing or insults aimed at Mochi is not.
(function (root) {
  // Strong words in English, Hinglish and Hindi. Mild ones (damn, hell, crap)
  // are deliberately left out.
  const PROFANE = [
    'fuck', 'fucking', 'fucked', 'fucker', 'motherfucker', 'mf', 'wtf', 'stfu', 'shit', 'shitty', 'bullshit', 'bitch', 'bastard', 'asshole', 'arsehole', 'dick', 'dickhead', 'cunt', 'prick', 'slut', 'whore',
    'bc', 'mc', 'bkl', 'bsdk', 'bhosdike', 'bhosdi', 'bhosda', 'behenchod', 'bhenchod', 'bhanchod', 'madarchod', 'maderchod', 'chutiya', 'chutiye', 'chutia', 'chut', 'gandu', 'gaandu', 'gand', 'gaand', 'lauda', 'lavda', 'lode', 'lavde', 'lund', 'randi', 'harami', 'haramkhor', 'kamina', 'kamine', 'kutta', 'kutte', 'kutiya', 'tatti', 'jhatu', 'chodu',
    'चूतिया', 'चुतिया', 'भेनचोद', 'बहनचोद', 'मादरचोद', 'गांडू', 'गांड', 'भोसडी', 'भोसड़ी', 'भोसडीके', 'लौड़ा', 'लौडा', 'लंड', 'रंडी', 'हरामी', 'हरामखोर', 'कमीना', 'कमीने', 'कुत्ता', 'कुत्ते', 'कुतिया', 'चोदू',
  ];
  // Rude but not swearing; only counted when aimed at Mochi.
  const INSULTS = ['stupid', 'idiot', 'dumb', 'useless', 'shut up', 'annoying', 'hate you', 'ugly', 'loser', 'pagal', 'bewakoof', 'bevkoof', 'ullu', 'bakwas', 'bekaar', 'nikamma', 'chup', 'पागल', 'बेवकूफ़', 'बेवकूफ', 'उल्लू', 'बकवास', 'बेकार', 'निकम्मा', 'चुप'];
  // Words that point at the listener (Mochi).
  const AT_YOU = ['you', 'u', 'ur', 'your', "you're", 'youre', 'yourself', 'mochi', 'cinder', 'mist', 'dusk', 'tu', 'tum', 'tujhe', 'tumhe', 'tera', 'teri', 'tere', 'tumhara', 'tumhari', 'tujhse', 'तू', 'तुम', 'तुझे', 'तुम्हें', 'तेरा', 'तेरी', 'तेरे', 'तुम्हारा', 'तुम्हारी'];
  // Words that point at someone or something else, which means it's venting.
  const OTHERS = ['he', 'she', 'they', 'him', 'her', 'them', 'boss', 'manager', 'client', 'team', 'colleague', 'coworker', 'work', 'job', 'deadline', 'traffic', 'life', 'this', 'that', 'it', 'wo', 'woh', 'uska', 'uski', 'usne', 'unhone', 'वो', 'उसका', 'उसकी', 'उसने', 'उन्होंने'];

  const tokenize = (text) => text.toLowerCase().replace(/[’']/g, "'").split(/[^\p{L}\p{M}']+/u).filter(Boolean);

  function analyse(text, petName = 'mochi') {
    const tokens = tokenize(text);
    const joined = ' ' + tokens.join(' ') + ' ';
    const isProfane = (tok) => PROFANE.some((w) => tok === w || (w.length > 4 && tok.startsWith(w)));
    const hits = [];
    tokens.forEach((tok, i) => { if (isProfane(tok)) hits.push(i); });
    INSULTS.forEach((w) => {
      if (w.includes(' ')) { const at = joined.indexOf(' ' + w + ' '); if (at >= 0) hits.push(joined.slice(0, at).split(' ').length - 1); }
      else tokens.forEach((tok, i) => { if (tok === w) hits.push(i); });
    });
    const profane = tokens.some(isProfane);
    if (!hits.length) return { profane: false, atPet: false };

    const you = new Set([...AT_YOU, petName.toLowerCase()]);
    const youIdx = tokens.map((tok, i) => (you.has(tok) ? i : -1)).filter((i) => i >= 0);
    const mentionsOthers = tokens.some((tok) => OTHERS.includes(tok));
    const near = hits.some((h) => youIdx.some((y) => Math.abs(h - y) <= 3));
    // Very short bursts like "fuck off" or "chutiya" with no situation are aimed at Mochi.
    const shortBurst = tokens.length <= 3 && profane && !mentionsOthers;
    const atPet = (near && !mentionsOthers) || shortBurst || /\b(fuck|screw) (you|u|off)\b|wrong with (you|u)\b/.test(joined);
    // Insults alone, not aimed at Mochi, are just self-talk or venting.
    return { profane: profane || atPet, atPet };
  }

  root.Profanity = { analyse };
  if (typeof module !== 'undefined') module.exports = root.Profanity;
})(typeof window !== 'undefined' ? window : globalThis);
