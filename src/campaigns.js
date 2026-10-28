// Mochi for Teams: wellness campaigns. A company picks a theme and dates
// (set up with Little Smoke Studio, see server/ADMIN.md); during those days
// Mochi says one of these lines once a day, and the company's short note
// the first time. Only Mochi's own words, so a campaign can never put
// something odd in the buddy's mouth.
//
// action: what the bubble's button does, if anything.
const THEMES = {
  hydration: {
    name: 'Hydration week',
    action: null,
    en: [
      "It's hydration week! I've been sipping all morning. Have you? 💧",
      'Water check! A glass now keeps the 4 pm slump away.',
      'Fun fact for hydration week: even a little thirsty makes focus harder. Sip sip!',
    ],
    hi: [
      'इस हफ़्ते पानी वाला हफ़्ता है! एक गिलास पानी हो जाए? 💧',
      'पानी पिया? अभी एक गिलास, और शाम की थकान दूर।',
      'थोड़ी सी प्यास भी ध्यान भटका देती है। चलो, एक घूँट!',
    ],
    hinglish: [
      'Is hafte hydration week hai! Ek glass paani ho jaaye? 💧',
      'Paani check! Abhi ek glass, aur 4 baje ki thakaan gayab.',
      'Thodi si pyaas bhi focus khraab karti hai. Chalo, sip sip!',
    ],
  },
  movement: {
    name: 'Move more week',
    action: 'stretch',
    en: [
      "Move more week! Stand up, reach for the ceiling, and I'll cheer. 🙆",
      'Your chair will miss you for one minute. Go on, a quick walk!',
      'A two-minute stretch now is worth more than a long one never.',
    ],
    hi: [
      'इस हफ़्ते थोड़ा ज़्यादा चलना है! खड़े होकर एक अंगड़ाई लो। 🙆',
      'कुर्सी एक मिनट इंतज़ार कर लेगी। चलो, थोड़ा टहल आओ!',
      'अभी दो मिनट की स्ट्रेचिंग, कभी नहीं वाली लंबी से बेहतर है।',
    ],
    hinglish: [
      'Move more week! Khade ho jao, haath upar, main cheer {g:karunga|karungi}. 🙆',
      'Chair ek minute wait kar legi. Chalo, chhota sa walk!',
      'Abhi do minute ka stretch, kabhi nahi wale lambe stretch se better hai.',
    ],
  },
  eyes: {
    name: 'Screen break week',
    action: null,
    en: [
      'Screen break week! Look at something far away for 20 seconds. I’ll wait. 👀',
      'Your eyes work so hard. Give them a window to look out of for a moment.',
      'Blink, blink! Screens make us forget. Little breaks help a lot.',
    ],
    hi: [
      'इस हफ़्ते आँखों को आराम! 20 सेकंड दूर कुछ देखो। 👀',
      'तुम्हारी आँखें बहुत मेहनत करती हैं। एक पल खिड़की से बाहर देख लो।',
      'पलकें झपकाओ! स्क्रीन पर हम भूल जाते हैं।',
    ],
    hinglish: [
      'Screen break week! 20 second door kuch dekho, main wait {g:karunga|karungi}. 👀',
      'Aankhein itni mehnat karti hain. Ek pal window ke bahar dekh lo.',
      'Blink blink! Screen pe hum bhool jaate hain, chhote breaks bahut help karte hain.',
    ],
  },
  sleep: {
    name: 'Sleep well week',
    action: null,
    en: [
      "Sleep well week! Tonight, let's both log off a little earlier. 🌙",
      "Good sleep makes everything easier tomorrow. What's one thing you can finish tomorrow instead?",
      'Screens off half an hour before bed is the sleep week challenge. Are you in?',
    ],
    hi: [
      'इस हफ़्ते अच्छी नींद! आज रात थोड़ा जल्दी लॉग ऑफ़ करें? 🌙',
      'अच्छी नींद से कल सब आसान लगेगा। कौन सा काम कल पर छोड़ सकते हैं?',
      'सोने से आधा घंटा पहले स्क्रीन बंद, यही इस हफ़्ते की चुनौती है।',
    ],
    hinglish: [
      'Sleep well week! Aaj raat thoda jaldi log off karein? 🌙',
      'Achhi neend se kal sab easy lagega. Kaunsa kaam kal pe chhod sakte hain?',
      'Sone se aadha ghanta pehle screen off, yahi is week ka challenge hai. In?',
    ],
  },
  gratitude: {
    name: 'Gratitude week',
    action: 'gratitude',
    en: [
      "It's gratitude week! What's one small good thing from today? Let's put it in the jar. 🫙",
      "Thank-you week: who made your day a bit easier lately? Maybe tell them!",
      'Little good things count too. Add one to the jar?',
    ],
    hi: [
      'इस हफ़्ते शुक्रिया वाला हफ़्ता है! आज की एक अच्छी बात जार में डालें? 🫙',
      'हाल में किसने तुम्हारा दिन आसान बनाया? उन्हें बता दो!',
      'छोटी अच्छी बातें भी गिनती हैं। एक जार में डालें?',
    ],
    hinglish: [
      'Gratitude week hai! Aaj ki ek achhi baat jar mein daalein? 🫙',
      'Haal mein kisne tumhara din easy banaya? Unhe bata do!',
      'Chhoti achhi baatein bhi count hoti hain. Ek jar mein daalein?',
    ],
  },
  'mental-health': {
    name: 'Mental health week',
    action: 'worry',
    en: [
      "It's mental health week. However you're feeling is okay, and I'm here if you want to talk. 💛",
      'Checking on you: how are you, really? You can feed me a worry any time.',
      'Asking for help is a strong thing to do. Your support contacts are in Mochi for Teams.',
    ],
    hi: [
      'इस हफ़्ते मन की सेहत की बात। तुम जैसा भी महसूस करो, ठीक है, मैं यहीं हूँ। 💛',
      'सच में, कैसे हो? कोई चिंता हो तो मुझे खिला दो।',
      'मदद माँगना हिम्मत की बात है। तुम्हारे सपोर्ट नंबर Mochi for Teams में हैं।',
    ],
    hinglish: [
      'Mental health week hai. Tum jaisa bhi feel karo, theek hai, main yahin hoon. 💛',
      'Sach mein, kaise ho? Koi worry ho toh mujhe khila do.',
      'Help maangna strong cheez hai. Tumhare support contacts Mochi for Teams mein hain.',
    ],
  },
  breathe: {
    name: 'Calm week',
    action: 'breathe',
    en: [
      'Calm week! Want to breathe with me for one minute? 🌬️',
      'Shoulders down, jaw loose, one slow breath out. Better?',
      "Busy day? A minute of slow breathing is a tiny holiday.",
    ],
    hi: [
      'इस हफ़्ते सुकून! एक मिनट मेरे साथ साँस लोगे? 🌬️',
      'कंधे ढीले, जबड़ा ढीला, एक लंबी साँस बाहर। अब बेहतर?',
      'भागदौड़ वाला दिन? एक मिनट की धीमी साँस छोटी सी छुट्टी है।',
    ],
    hinglish: [
      'Calm week! Ek minute mere saath saans loge? 🌬️',
      'Shoulders down, jaw loose, ek lambi saans bahar. Better?',
      'Busy din? Ek minute ki slow breathing chhoti si holiday hai.',
    ],
  },
  kindness: {
    name: 'Kindness week',
    action: null,
    en: [
      "Kindness week! A quick 'thanks for your help' message can make someone's whole day. 💌",
      'Who on your team could use a kind word today?',
      'Be kind to yourself too. You are doing better than you think.',
    ],
    hi: [
      'इस हफ़्ते दया और अपनापन! एक छोटा सा धन्यवाद किसी का पूरा दिन बना सकता है। 💌',
      'आज टीम में किसे एक अच्छे शब्द की ज़रूरत है?',
      'खुद के साथ भी नरमी रखो। तुम सोच से बेहतर कर रहे हो।',
    ],
    hinglish: [
      "Kindness week! Ek chhota sa 'thanks for your help' message kisi ka poora din bana sakta hai. 💌",
      'Aaj team mein kise ek achhe word ki zaroorat hai?',
      'Khud ke saath bhi kind raho. Tum soch se better kar rahe ho.',
    ],
  },
};

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// The campaign running today, if any (local date, 'YYYY-MM-DD').
function active(campaigns, today) {
  return (campaigns || []).find((c) => THEMES[c.theme] && c.start <= today && today <= c.end) || null;
}

function line(theme, lang) {
  const t = THEMES[theme];
  return t ? pick(t[lang] || t.en) : '';
}

module.exports = { THEMES, active, line };
