// Spots sweet talk aimed at the buddy, and sexual talk, which it politely
// turns down. Returns one of:
//   { kind: 'explicit', atPet }  sexual content (atPet = aimed at / asked of the buddy)
//   { kind: 'flirty' }           "you're hot/sexy": too much, but no harm meant
//   { kind: 'romantic', mood }   light romance: love | marry | compliment | miss | hug
//   { kind: null }               anything else
(function (root) {
  // Someone describing harm done to them is a worry, never "explicit talk".
  const HARM = /harass|assault|abuse|molest|\brap(e|ed|ist)\b|groped|touched me|stalk|blackmail|छेड़|उत्पीड़न|बलात्कार|chhed|chhedkhani|zabardasti|जबरदस्ती/i;

  const EXPLICIT = [
    /\b(sex|sexual|sexting|nude|nudes|naked|horny|porn|porno|boobs?|tits|titties|penis|vagina|pussy|cock|blowjob|handjob|orgasm|masturbat\w*|erection|cum|cumming|nsfw|lewd|fap)\b/,
    /\b(chudai|chodna|chod(o|unga|ungi|enge)?|nanga|nangi|sambhog|kapde utaar\w*|sex kar\w*)\b/,
    /सेक्स|नंगा|नंगी|चुदाई|संभोग|कपड़े उतार|पोर्न|स्तन/,
  ];
  // Requests or remarks aimed at the buddy itself.
  const AT_PET = /\b(you|u|ur|your|yours|you're|youre|with me|me your|tu|tum|tujhe|tumhe|tere|tera|teri|tumhare|tumhara|tumhari|tumse|tujhse|mere saath|mochi|cinder|mist|dusk)\b|तुम|तुझे|तुम्हें|तेरे|तेरा|तेरी|तुम्हारे|मेरे साथ/;
  const REQUEST = /\b(send|show|let'?s|lets|wanna|want to|take off|strip|sleep with|have sex|make love|do it|karo|karein|karte hain|bhejo|dikhao)\b|भेजो|दिखाओ|करें|करो/;

  const FLIRTY = /\b(you'?re|you are|ur|u r|u are|so)\s+(so\s+)?(hot|sexy|seductive)\b|\b(sexy|hottie)\b|\btum\s+(bahut\s+|bohot\s+)?(hot|sexy)\b|तुम\s+(बहुत\s+)?(हॉट|सेक्सी)/;

  const ROMANCE = {
    marry: /marry me|will you marry|wanna marry|be my (wife|husband)|shaadi karo(ge|gi)?|mujhse shaadi|शादी करो(गे|गी)?|मुझसे शादी/,
    love: /\b(i\s+)?(love|luv|lub)\s+(you|u|ya)\b|\bily\b|\bi\s+(really\s+)?(like|adore)\s+(you|u)\b|crush on (you|u)|be mine|be my (girlfriend|boyfriend|gf|bf|valentine|partner|bae)|\b(tumse|tujhse|aapse) (bahut |bohot )?pyaa?r\b|pyaa?r (karta|karti|karte) (hu|hoon|hun|hu)\b.*\b(tum|tujh)|meri? (girlfriend|boyfriend|gf|bf) ban|(तुमसे|तुझसे|आपसे) (बहुत )?प्यार|आई लव यू/,
    miss: /\b(i\s+)?miss(ed)?\s+(you|u|ya)\b|(tumhari|teri|aapki) yaad|miss kar (raha|rahi|rhi|rha)|(तुम्हारी|तेरी|आपकी) याद/,
    hug: /\b(hug|hugs|cuddle|kiss|kisses|smooch)\b.*\b(me|you|u)\b|\b(hug|cuddle|kiss) me\b|\bmwah+\b|\bkissi\b|\bchumma\b|\bjhappi\b|gale lag|गले लग|झप्पी|चुम्मा/,
    compliment: /\b(you'?re|you are|ur|u r|u are)\s+(so\s+|really\s+|very\s+|such a\s+)?(cute|adorable|beautiful|handsome|pretty|lovely|sweet|gorgeous|cutie|sweetheart)\b|\b(cutie|sweetheart|darling|my love|babe|jaanu|meri jaan)\b|\btum\s+(bahut\s+|bohot\s+|kitne\s+|kitni\s+|kitna\s+)?(cute|pyaa?re|pyaa?ri|sundar|handsome|sweet)\b|तुम\s+(बहुत\s+|कितने\s+|कितनी\s+)?(प्यारे|प्यारी|सुंदर|क्यूट)|जानू|मेरी जान/,
  };

  function analyse(text, petName = 'mochi') {
    const t = ' ' + text.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ') + ' ';
    const words = t.trim().split(' ').length;
    if (HARM.test(t)) return { kind: null };
    if (EXPLICIT.some((re) => re.test(t))) {
      const pet = petName.toLowerCase();
      const atPet = AT_PET.test(t) || t.includes(' ' + pet + ' ') || REQUEST.test(t) || words <= 3;
      return { kind: 'explicit', atPet };
    }
    if (FLIRTY.test(t)) return { kind: 'flirty' };
    // Romance only counts when it's short and aimed at the buddy, so
    // "my girlfriend and I fought" stays a worry.
    if (words <= 14) {
      for (const [mood, re] of Object.entries(ROMANCE)) if (re.test(t)) return { kind: 'romantic', mood };
    }
    return { kind: null };
  }

  root.Affection = { analyse };
  if (typeof module !== 'undefined') module.exports = root.Affection;
})(typeof window !== 'undefined' ? window : globalThis);
