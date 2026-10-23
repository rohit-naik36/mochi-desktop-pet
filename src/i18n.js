// All of Mochi's words in English, Hindi and Hinglish.
// Placeholders: {n} = ", Name" or "", {you} = name or a friendly fallback,
// {pet} = buddy name, {greet} = time-of-day greeting, {count} = a number.
(function (root) {
  const STRINGS = {
    en: {
      you: 'friend',
      timeGreet: ['Good morning', 'Good afternoon', 'Good evening'],
      greet: ['{greet}{n}! Missed you.', '{greet}{n}! Ready to take on the day together?', 'Hey{n}! {greet}. I saved you a spot.'],
      askName: "Hey there! I'm {pet}, your new desk buddy. What should I call you?",
      askNameChange: 'Sure! What should I call you?',
      namePlaceholder: 'Your name',
      nameSaved: "{you}! Love it. Nice to meet you, {you}. Click me for pets, double-click to feed me, and right-click for games. 💛",
      nameSavedChange: 'Got it, {you}!',
      notAName: "Hmm, I don't think that's your name 😅 Try again?",
      save: 'Save', skip: 'Skip', cancel: 'Cancel',
      hungry: 'Psst{n}... my tummy is rumbling 🍙', feedBtn: 'Feed', laterBtn: 'Later',
      fed: ['Yum! Thank you{n}!', 'Nom nom nom. Best snack ever.', "Okay that hit the spot. You're the best."],
      petted: ['Hehe, that tickles!', "You're doing great today{n}.", 'Mmm, more of that please.', 'I like it when you visit{n}.', "Hey, don't forget to breathe :)", 'One thing at a time. You got this.', "Have I told you you're my favourite human{n}?"],
      sleepyPet: 'Mmh... five more minutes...',
      nap: 'Nap time... 💤',
      woke: ['*yawn* Good nap!', "I'm awake! What did I miss?"],
      dragged: ['Ooh, nice view from here!', 'This spot is cozy.', 'Thanks for the lift!'],
      switched: "Hi{n}! I'm {pet}. Nice to meet you!",
      playClosed: ['That was fun! Come play again soon.', 'Thanks for playing with me{n}!'],
      playInvite: ['Feeling tense{n}? Want to play for a minute?', "Let's take a tiny break together?", 'I found some bubbles. Want to pop them with me?'],
      letsPlay: "Let's play", notNow: 'Not now',
      lateNight: "It's getting late{n}. Wrap up soon? Tomorrow-you will thank you 🌙",
      lunch: 'Have you had lunch{n}? Real food, not just coffee 🍜',
      chatter: ["Just checking in{n}. How's it going?", 'I believe in you{n}. Like, a lot.', 'Unclench your jaw. Yep, you were doing it :)', 'Small progress is still progress.', "I'm right here if you need a smile.", 'Psst... posture check!', "You've been working hard{n}. I see you.", "Whatever you're working on, you're doing better than you think."],
      doneBtn: 'Done!', snoozeBtn: 'Snooze 10m', snoozedGrumpy: "Fine. Ten minutes. I'm counting 😤",
      water: {
        lines: ['Water break{n}! 💧 Grab a sip with me?', 'Hey{n}, when did you last drink water? 💧', "Let's both drink some water. Cheers! 💧"],
        upset: ["{you}!! You STILL haven't had water 😤", "I'm not moving until you drink some water. Hmph. 💧", 'Water. Now. Please. I worry about you 😤'],
        done: ['Hydrated and unstoppable{n}! 💪', "That's my human! Proud of you{n} 💧", 'Look at you taking care of yourself. Love that.'],
      },
      stretch: {
        lines: ["You've been at it a while{n}. Stand up and stretch with me! 🙆", 'Shoulders up, shoulders down. Quick stretch? 🙆', 'Legs need a little walk. Just a minute? 🚶'],
        upset: ['{you}, your back is begging you. STRETCH 😤', "I'm puffing up until you stand up. Your move. 😤", 'Nope, not letting this one slide. Up you get! 🙆'],
        done: ['Yesss{n}! Your spine says thank you 🙆', 'Look at you, all stretchy and fresh. Love it!', "That's how it's done. Back to crushing it 💪"],
      },
      eyes: {
        lines: ['Eye break{n}! Look at something far away for 20 seconds 👀', 'Rest those eyes for a sec. Window, wall, anything far 👀'],
        upset: ['{you}, your eyes need a break and you know it 😤', "20 seconds. That's all I'm asking. Look away! 😤"],
        done: ['Eyes refreshed{n}! ✨', 'Ahh, much better, right? Proud of you.', 'Tiny breaks, big wins. Nice one!'],
      },
      backFromHiding: "...I'm back. Can we be kind to each other? 💛",
      // play mode
      playTitle: 'Play with {pet}',
      tabs: { breathe: '🌬️ Breathe', bubbles: '🫧 Bubbles', chase: '✨ Chase', worry: '🍃 Feed a worry' },
      breatheTitle: 'Breathe with me', breatheStart: 'Start (about a minute)', breatheAgain: 'Again',
      breatheIn: 'Breathe in...', breatheHold: 'Hold', breatheOut: 'Breathe out...', breatheDone: 'Nicely done',
      breatheAfter: ['That felt good. Your shoulders look lighter.', 'Calm buddy, calm human.', 'Thanks for breathing with me{n}.'],
      bubblesHint: 'Pop as many or as few as you like. No timer.', popped: '{count} popped',
      bubbleCheer: ['So satisfying!', 'Pop pop pop!', "{count}! You're a natural.", 'I love this game.'],
      chaseHint: "Move your mouse slowly. I'll follow the light.", caught: 'Caught it {count} times', caughtOne: 'Caught it once',
      chaseCheer: ['Got it! Again!', 'Hehe, too slow!', 'This is the best.'],
      worryHint: "What's weighing on you? I'll eat it. Nothing is saved.", worryPlaceholder: 'e.g. the deadline on Friday',
      feedIt: 'Feed it', typeSomething: 'Type anything, big or small.',
      feedAnother: 'Feed another', breatheWithMe: 'Breathe with me', thanks: 'Thanks, {pet}', okay: 'Okay',
      tinyStep: 'Tiny next step: ',
      thanksReply: ["Anytime{n}. I'm always hungry for worries.", "That's what friends are for. 💛", "I've got you. Always."],
      crisisStay: "I'm right here{n}. Please reach out to one of them. 💛",
      // profanity
      ventNote: "Let it all out, I can take it. Sounds like you're really fed up.",
      warn1: "Ouch 🥺 That wasn't very nice. I'm on your side, you know.",
      warn2: "Hey, I mean it. Please don't talk to me like that. Next time I'm going to go hide for a bit.",
      hiding: "That's it. I'm going to go hide for a bit. 😔 See you in 5 minutes.",
      // menu
      menu: { feed: 'Feed', play: 'Play', playTime: 'Play time', breathe: 'Breathe with me', bubbles: 'Bubble pop', chase: 'Chase the light', worry: 'Feed it a worry', nap: 'Nap time', buddy: 'Choose your buddy', name: 'Tell me your name', changeName: 'Change my name ({you})', wander: 'Let it wander', reminders: 'Reminders', water: 'Drink water (every {count} min)', stretch: 'Stretch break (every {count} min)', eyes: '20-20-20 eye rest (every {count} min)', startup: 'Start with Windows', language: 'Language', bringBack: 'Bring pet back', quit: 'Quit', hidingNow: '{pet} is hiding... back soon' },
    },

    hi: {
      you: 'दोस्त',
      timeGreet: ['सुप्रभात', 'नमस्ते', 'शुभ संध्या'],
      greet: ['{greet}{n}! तुम्हारी याद आ रही थी।', '{greet}{n}! चलो, आज का दिन साथ में संभालते हैं।', 'अरे{n}! {greet}। मैंने तुम्हारे लिए जगह बचा के रखी थी।'],
      askName: 'नमस्ते! मैं {pet} हूँ, तुम्हारा नया डेस्क दोस्त। तुम्हें क्या बुलाऊँ?',
      askNameChange: 'ज़रूर! तुम्हें क्या बुलाऊँ?',
      namePlaceholder: 'तुम्हारा नाम',
      nameSaved: '{you}! बहुत प्यारा नाम है। मिलकर अच्छा लगा, {you}। मुझे सहलाने के लिए क्लिक करो, खिलाने के लिए डबल-क्लिक, और खेलने के लिए राइट-क्लिक। 💛',
      nameSavedChange: 'ठीक है, {you}!',
      notAName: 'हम्म, मुझे नहीं लगता ये तुम्हारा नाम है 😅 फिर से बताओ?',
      save: 'सेव करो', skip: 'छोड़ो', cancel: 'रहने दो',
      hungry: 'सुनो{n}... मेरे पेट में चूहे दौड़ रहे हैं 🍙', feedBtn: 'खिलाओ', laterBtn: 'बाद में',
      fed: ['वाह! शुक्रिया{n}!', 'नम नम नम। सबसे बढ़िया नाश्ता।', 'मज़ा आ गया। तुम सबसे अच्छे हो।'],
      petted: ['हीही, गुदगुदी होती है!', 'आज तुम बहुत अच्छा कर रहे हो{n}।', 'म्म्म, और करो ना।', 'जब तुम आते हो तो अच्छा लगता है{n}।', 'साँस लेना मत भूलना :)', 'एक-एक करके। तुम कर लोगे।', 'मैंने बताया कि तुम मेरे सबसे प्यारे इंसान हो{n}?'],
      sleepyPet: 'उम्म... बस पाँच मिनट और...',
      nap: 'सोने का समय... 💤',
      woke: ['*उबासी* बढ़िया नींद हुई!', 'मैं उठ गया! क्या मिस किया?'],
      dragged: ['वाह, यहाँ से नज़ारा अच्छा है!', 'ये जगह आरामदायक है।', 'घुमाने के लिए शुक्रिया!'],
      switched: 'हाय{n}! मैं {pet} हूँ। मिलकर खुशी हुई!',
      playClosed: ['मज़ा आया! जल्दी फिर खेलेंगे।', 'मेरे साथ खेलने के लिए शुक्रिया{n}!'],
      playInvite: ['थोड़ा टेंशन में हो{n}? एक मिनट खेलें?', 'चलो साथ में छोटा सा ब्रेक लें?', 'मुझे कुछ बुलबुले मिले हैं। फोड़ें साथ में?'],
      letsPlay: 'चलो खेलें', notNow: 'अभी नहीं',
      lateNight: 'काफ़ी रात हो गई{n}। अब बस करें? कल वाला तुम शुक्रिया कहेगा 🌙',
      lunch: 'खाना खाया{n}? असली खाना, सिर्फ़ चाय-कॉफ़ी नहीं 🍜',
      chatter: ['बस हाल-चाल पूछ रहा था{n}। सब कैसा चल रहा है?', 'मुझे तुम पर पूरा भरोसा है{n}।', 'जबड़ा ढीला करो। हाँ, तुम कस के बैठे थे :)', 'थोड़ी प्रगति भी प्रगति है।', 'मुस्कान चाहिए तो मैं यहीं हूँ।', 'पीठ सीधी! 😄', 'तुम बहुत मेहनत कर रहे हो{n}। मुझे दिखता है।', 'तुम जितना सोचते हो, उससे बेहतर कर रहे हो।'],
      doneBtn: 'हो गया!', snoozeBtn: '10 मिनट बाद', snoozedGrumpy: 'ठीक है। दस मिनट। मैं गिन रहा हूँ 😤',
      water: {
        lines: ['पानी का ब्रेक{n}! 💧 एक घूँट मेरे साथ?', 'सुनो{n}, आख़िरी बार पानी कब पिया था? 💧', 'चलो दोनों पानी पीते हैं। चियर्स! 💧'],
        upset: ['{you}!! तुमने अब तक पानी नहीं पिया 😤', 'जब तक पानी नहीं पियोगे, मैं यहाँ से नहीं हिलूँगा। हुंह। 💧', 'पानी। अभी। प्लीज़। मुझे तुम्हारी फ़िक्र है 😤'],
        done: ['पानी पिया और फुल चार्ज{n}! 💪', 'ये हुई ना बात! गर्व है तुम पर{n} 💧', 'अपना ख़याल रखते हुए देखकर अच्छा लगा।'],
      },
      stretch: {
        lines: ['काफ़ी देर से बैठे हो{n}। उठो, मेरे साथ स्ट्रेच करो! 🙆', 'कंधे ऊपर, कंधे नीचे। जल्दी सा स्ट्रेच? 🙆', 'पैरों को थोड़ा घुमाओ। बस एक मिनट? 🚶'],
        upset: ['{you}, तुम्हारी पीठ गुहार लगा रही है। स्ट्रेच करो 😤', 'जब तक उठोगे नहीं, मैं फूला रहूँगा। अब तुम्हारी बारी। 😤', 'नहीं, ये वाला नहीं छोड़ूँगा। उठो! 🙆'],
        done: ['शाबाश{n}! तुम्हारी रीढ़ शुक्रिया कह रही है 🙆', 'एकदम फ्रेश लग रहे हो। बढ़िया!', 'ऐसे होता है। अब फिर से छा जाओ 💪'],
      },
      eyes: {
        lines: ['आँखों का ब्रेक{n}! 20 सेकंड दूर किसी चीज़ को देखो 👀', 'आँखों को थोड़ा आराम दो। खिड़की, दीवार, कुछ भी दूर 👀'],
        upset: ['{you}, तुम्हारी आँखों को ब्रेक चाहिए और तुम जानते हो 😤', 'बस 20 सेकंड। इतना ही माँग रहा हूँ। दूर देखो! 😤'],
        done: ['आँखें तरोताज़ा{n}! ✨', 'आह, अब बेहतर लगा ना? गर्व है।', 'छोटे ब्रेक, बड़ी जीत। बढ़िया!'],
      },
      backFromHiding: '...मैं वापस आ गया। क्या हम एक-दूसरे से प्यार से बात कर सकते हैं? 💛',
      playTitle: '{pet} के साथ खेलो',
      tabs: { breathe: '🌬️ साँस', bubbles: '🫧 बुलबुले', chase: '✨ रोशनी पकड़ो', worry: '🍃 चिंता खिलाओ' },
      breatheTitle: 'मेरे साथ साँस लो', breatheStart: 'शुरू करो (लगभग एक मिनट)', breatheAgain: 'फिर से',
      breatheIn: 'साँस अंदर...', breatheHold: 'रोको', breatheOut: 'साँस बाहर...', breatheDone: 'बहुत बढ़िया',
      breatheAfter: ['अच्छा लगा ना? कंधे हल्के लग रहे हैं।', 'शांत दोस्त, शांत इंसान।', 'मेरे साथ साँस लेने के लिए शुक्रिया{n}।'],
      bubblesHint: 'जितने चाहो उतने फोड़ो। कोई टाइमर नहीं।', popped: '{count} फूटे',
      bubbleCheer: ['कितना मज़ा आ रहा है!', 'फट फट फट!', '{count}! तुम तो उस्ताद हो।', 'मुझे ये खेल बहुत पसंद है।'],
      chaseHint: 'माउस धीरे-धीरे घुमाओ। मैं रोशनी के पीछे आऊँगा।', caught: '{count} बार पकड़ा', caughtOne: 'एक बार पकड़ा',
      chaseCheer: ['पकड़ लिया! फिर से!', 'हीही, बहुत धीमे हो!', 'सबसे मज़ेदार।'],
      worryHint: 'मन पर क्या बोझ है? मैं उसे खा जाऊँगा। कुछ भी सेव नहीं होता।', worryPlaceholder: 'जैसे: शुक्रवार की डेडलाइन',
      feedIt: 'खिला दो', typeSomething: 'कुछ भी लिखो, छोटा या बड़ा।',
      feedAnother: 'एक और खिलाओ', breatheWithMe: 'मेरे साथ साँस लो', thanks: 'शुक्रिया, {pet}', okay: 'ठीक है',
      tinyStep: 'छोटा सा अगला कदम: ',
      thanksReply: ['कभी भी{n}। मुझे चिंताएँ खाना पसंद है।', 'दोस्त किस लिए होते हैं। 💛', 'मैं हूँ ना। हमेशा।'],
      crisisStay: 'मैं यहीं हूँ{n}। प्लीज़ इनमें से किसी को कॉल करो। 💛',
      ventNote: 'सब निकाल दो, मैं सुन रहा हूँ। लगता है तुम सच में परेशान हो।',
      warn1: 'आउच 🥺 ये अच्छा नहीं लगा। मैं तो तुम्हारी तरफ़ हूँ।',
      warn2: 'सच में, प्लीज़ मुझसे ऐसे बात मत करो। अगली बार मैं थोड़ी देर के लिए छुप जाऊँगा।',
      hiding: 'बस। मैं थोड़ी देर छुपने जा रहा हूँ। 😔 5 मिनट में मिलते हैं।',
      menu: { feed: 'खिलाओ', play: 'खेलो', playTime: 'खेलने का समय', breathe: 'मेरे साथ साँस लो', bubbles: 'बुलबुले फोड़ो', chase: 'रोशनी पकड़ो', worry: 'चिंता खिलाओ', nap: 'सोने का समय', buddy: 'अपना दोस्त चुनो', name: 'अपना नाम बताओ', changeName: 'नाम बदलो ({you})', wander: 'घूमने दो', reminders: 'रिमाइंडर', water: 'पानी पियो (हर {count} मिनट)', stretch: 'स्ट्रेच ब्रेक (हर {count} मिनट)', eyes: 'आँखों का आराम (हर {count} मिनट)', startup: 'Windows के साथ शुरू करो', language: 'भाषा', bringBack: 'वापस लाओ', quit: 'बंद करो', hidingNow: '{pet} छुपा हुआ है... जल्दी लौटेगा' },
    },

    hinglish: {
      you: 'dost',
      timeGreet: ['Good morning', 'Hello', 'Good evening'],
      greet: ['{greet}{n}! Tumhari yaad aa rahi thi.', '{greet}{n}! Chalo aaj ka din saath mein sambhalte hain.', 'Arre{n}! {greet}. Maine tumhare liye jagah bacha ke rakhi thi.'],
      askName: 'Hey! Main {pet} hoon, tumhara naya desk buddy. Tumhe kya bulaun?',
      askNameChange: 'Sure! Tumhe kya bulaun?',
      namePlaceholder: 'Tumhara naam',
      nameSaved: '{you}! Kya mast naam hai. Milke accha laga, {you}. Pet karne ke liye click karo, khilane ke liye double-click, aur games ke liye right-click. 💛',
      nameSavedChange: 'Done, {you}!',
      notAName: 'Hmm, mujhe nahi lagta ye tumhara naam hai 😅 Phir se batao?',
      save: 'Save karo', skip: 'Skip', cancel: 'Rehne do',
      hungry: 'Suno{n}... pet mein chuhe daud rahe hain 🍙', feedBtn: 'Khilao', laterBtn: 'Baad mein',
      fed: ['Yum! Thank you{n}!', 'Nom nom nom. Best snack ever.', 'Maza aa gaya. Tum best ho.'],
      petted: ['Hehe, gudgudi hoti hai!', 'Aaj tum full form mein ho{n}.', 'Mmm, aur karo na.', 'Tum aate ho toh accha lagta hai{n}.', 'Saans lena mat bhoolna :)', 'Ek ek karke. Tum kar loge.', 'Maine bataya ki tum mere favourite insaan ho{n}?'],
      sleepyPet: 'Umm... bas paanch minute aur...',
      nap: 'Sone ka time... 💤',
      woke: ['*yawn* Mast neend hui!', 'Main uth gaya! Kya miss kiya?'],
      dragged: ['Waah, yahan se view accha hai!', 'Ye jagah cozy hai.', 'Lift dene ke liye thanks!'],
      switched: 'Hi{n}! Main {pet} hoon. Milke khushi hui!',
      playClosed: ['Maza aaya! Jaldi phir khelenge.', 'Mere saath khelne ke liye thanks{n}!'],
      playInvite: ['Thoda tension mein ho{n}? Ek minute khelein?', 'Chalo saath mein chhota sa break lein?', 'Mujhe kuch bubbles mile hain. Saath mein phodein?'],
      letsPlay: 'Chalo khelein', notNow: 'Abhi nahi',
      lateNight: 'Kaafi raat ho gayi{n}. Ab bas karein? Kal wala tum thank you bolega 🌙',
      lunch: 'Khaana khaya{n}? Asli khaana, sirf chai-coffee nahi 🍜',
      chatter: ['Bas haal-chaal pooch raha tha{n}. Sab kaisa chal raha hai?', 'Mujhe tum pe full bharosa hai{n}.', 'Jaw dheela karo. Haan, tum tight baithe the :)', 'Thoda progress bhi progress hai.', 'Smile chahiye toh main yahin hoon.', 'Psst... posture check!', 'Tum bahut mehnat kar rahe ho{n}. Mujhe dikhta hai.', 'Tum jitna sochte ho usse better kar rahe ho.'],
      doneBtn: 'Ho gaya!', snoozeBtn: '10 min baad', snoozedGrumpy: 'Theek hai. Das minute. Main gin raha hoon 😤',
      water: {
        lines: ['Paani break{n}! 💧 Ek sip mere saath?', 'Suno{n}, last time paani kab piya tha? 💧', 'Chalo dono paani peete hain. Cheers! 💧'],
        upset: ['{you}!! Tumne ab tak paani nahi piya 😤', 'Jab tak paani nahi piyoge, main yahan se nahi hilunga. Hmph. 💧', 'Paani. Abhi. Please. Mujhe tumhari fikar hai 😤'],
        done: ['Paani piya aur full charge{n}! 💪', 'Ye hui na baat! Proud of you{n} 💧', 'Apna khayal rakhte dekh ke accha laga.'],
      },
      stretch: {
        lines: ['Kaafi der se baithe ho{n}. Utho, mere saath stretch karo! 🙆', 'Shoulders upar, shoulders neeche. Quick stretch? 🙆', 'Pairon ko thoda ghumao. Bas ek minute? 🚶'],
        upset: ['{you}, tumhari back request kar rahi hai. STRETCH karo 😤', 'Jab tak uthoge nahi, main phoola rahunga. Ab tumhari baari. 😤', 'Nahi, ye wala nahi chhodunga. Utho! 🙆'],
        done: ['Shabaash{n}! Tumhari spine thank you bol rahi hai 🙆', 'Ekdum fresh lag rahe ho. Badhiya!', 'Aise hota hai. Ab phir se chha jao 💪'],
      },
      eyes: {
        lines: ['Aankhon ka break{n}! 20 second door kuch dekho 👀', 'Aankhon ko thoda rest do. Khidki, deewar, kuch bhi door 👀'],
        upset: ['{you}, tumhari aankhon ko break chahiye aur tum jaante ho 😤', 'Bas 20 second. Itna hi maang raha hoon. Door dekho! 😤'],
        done: ['Aankhein fresh{n}! ✨', 'Aah, ab better laga na? Proud of you.', 'Chhote breaks, badi jeet. Badhiya!'],
      },
      backFromHiding: '...main wapas aa gaya. Kya hum ek dusre se pyaar se baat kar sakte hain? 💛',
      playTitle: '{pet} ke saath khelo',
      tabs: { breathe: '🌬️ Saans', bubbles: '🫧 Bubbles', chase: '✨ Chase', worry: '🍃 Tension khilao' },
      breatheTitle: 'Mere saath saans lo', breatheStart: 'Start karo (lagbhag ek minute)', breatheAgain: 'Phir se',
      breatheIn: 'Saans andar...', breatheHold: 'Roko', breatheOut: 'Saans bahar...', breatheDone: 'Bahut badhiya',
      breatheAfter: ['Accha laga na? Shoulders halke lag rahe hain.', 'Calm buddy, calm insaan.', 'Mere saath saans lene ke liye thanks{n}.'],
      bubblesHint: 'Jitne chaho utne phodo. Koi timer nahi.', popped: '{count} phoote',
      bubbleCheer: ['Kitna satisfying hai!', 'Pop pop pop!', '{count}! Tum toh ustaad ho.', 'Mujhe ye game bahut pasand hai.'],
      chaseHint: 'Mouse dheere dheere ghumao. Main light ke peeche aaunga.', caught: '{count} baar pakda', caughtOne: 'Ek baar pakda',
      chaseCheer: ['Pakad liya! Phir se!', 'Hehe, bahut slow ho!', 'Sabse mazedaar.'],
      worryHint: 'Mann pe kya bojh hai? Main usse kha jaunga. Kuch save nahi hota.', worryPlaceholder: 'jaise: Friday ki deadline',
      feedIt: 'Khila do', typeSomething: 'Kuch bhi likho, chhota ya bada.',
      feedAnother: 'Ek aur khilao', breatheWithMe: 'Mere saath saans lo', thanks: 'Thanks, {pet}', okay: 'Theek hai',
      tinyStep: 'Chhota sa next step: ',
      thanksReply: ['Kabhi bhi{n}. Mujhe tension khaana pasand hai.', 'Dost kis liye hote hain. 💛', 'Main hoon na. Hamesha.'],
      crisisStay: 'Main yahin hoon{n}. Please inmein se kisi ko call karo. 💛',
      ventNote: 'Sab nikaal do, main sun raha hoon. Lagta hai tum sach mein pak gaye ho.',
      warn1: 'Ouch 🥺 Ye accha nahi laga. Main toh tumhari side pe hoon.',
      warn2: 'Sach mein, please mujhse aise baat mat karo. Agli baar main thodi der ke liye chhup jaunga.',
      hiding: 'Bas. Main thodi der chhupne ja raha hoon. 😔 5 minute mein milte hain.',
      menu: { feed: 'Khilao', play: 'Khelo', playTime: 'Khelne ka time', breathe: 'Mere saath saans lo', bubbles: 'Bubble pop', chase: 'Light pakdo', worry: 'Tension khilao', nap: 'Sone ka time', buddy: 'Apna buddy chuno', name: 'Apna naam batao', changeName: 'Naam badlo ({you})', wander: 'Ghoomne do', reminders: 'Reminders', water: 'Paani piyo (har {count} min)', stretch: 'Stretch break (har {count} min)', eyes: 'Aankhon ka rest (har {count} min)', startup: 'Windows ke saath start karo', language: 'Language / भाषा', bringBack: 'Wapas lao', quit: 'Band karo', hidingNow: '{pet} chhupa hua hai... jaldi aayega' },
    },
  };

  const LANGS = [
    { id: 'en', label: 'English' },
    { id: 'hi', label: 'हिंदी (Hindi)' },
    { id: 'hinglish', label: 'Hinglish' },
  ];

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // t(lang, 'water.lines', { name, pet, count }) -> one filled-in string.
  function t(lang, key, ctx = {}) {
    const dict = STRINGS[lang] || STRINGS.en;
    let v = key.split('.').reduce((o, k) => (o ? o[k] : undefined), dict);
    if (v === undefined) v = key.split('.').reduce((o, k) => (o ? o[k] : undefined), STRINGS.en);
    if (Array.isArray(v)) v = pick(v);
    if (typeof v !== 'string') return v;
    return fill(lang, v, ctx);
  }

  function fill(lang, s, ctx = {}) {
    const dict = STRINGS[lang] || STRINGS.en;
    const name = (ctx.name || '').trim();
    return s
      .replace(/\{n\}/g, name ? ', ' + name : '')
      .replace(/\{you\}/g, name || dict.you)
      .replace(/\{pet\}/g, ctx.pet || 'Mochi')
      .replace(/\{greet\}/g, ctx.greet || '')
      .replace(/\{count\}/g, ctx.count ?? '');
  }

  root.I18N = { STRINGS, LANGS, t, fill };
  if (typeof module !== 'undefined') module.exports = root.I18N;
})(typeof window !== 'undefined' ? window : globalThis);
