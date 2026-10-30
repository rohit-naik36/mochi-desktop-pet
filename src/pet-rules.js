// Small rules the pet page uses, kept apart so they can be tested without a
// window. Pure functions, no screen, no timers.
(function (root) {
  const STILL_AFTER_MS = 4000; // how long Mochi stays put after an answer, so a second click still lands

  // Mochi must not drift away while it is waiting for a reply (a reminder, a
  // question), while the pointer is over it or its bubble, or just after an
  // answer. calmUntil is the time (ms) before which it stays put.
  function shouldStayStill({ bubbleSticky = false, pointerOver = false, upset = false, calmUntil = 0, now = Date.now() } = {}) {
    return !!(bubbleSticky || pointerOver || upset || now < calmUntil);
  }

  // The buttons for the company's weekly question: its options, then Skip.
  // Only a sane question (2 to 5 short options) produces buttons.
  // onAnswer(index) is called with the option number, or -1 for Skip.
  function questionActions(q, skipLabel, onAnswer) {
    const options = q && Array.isArray(q.options) ? q.options : [];
    if (options.length < 2 || options.length > 5) return [];
    return [
      ...options.map((label, i) => ({ label: String(label), run: () => onAnswer(i) })),
      { label: skipLabel, run: () => onAnswer(-1) },
    ];
  }

  // What the question bubble says: who is asking, then the question.
  function questionLine(intro, text) {
    return `${String(intro).trim()} ${String(text).trim()}`.trim();
  }

  root.PetRules = { shouldStayStill, questionActions, questionLine, STILL_AFTER_MS };
  if (typeof module !== 'undefined') module.exports = root.PetRules;
})(typeof window !== 'undefined' ? window : globalThis);
