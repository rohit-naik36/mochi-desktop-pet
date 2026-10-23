// All of Mochi's words in English, Hindi and Hinglish.
// Placeholders: {n} = ", Name" or "", {you} = name or a friendly fallback,
// {pet} = buddy name, {greet} = time-of-day greeting, {count} = a number,
// {g:गया|गई} = the buddy's own grammar, picked by ctx.gender.
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
      worryTitle: 'Tell {pet} anything',
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
      // buddy's gender (asked in setup)
      askGender: 'One more thing! Am I a boy, a girl, or neither? You choose 💛',
      askGenderChange: 'Sure! How should I be?',
      gender: { male: 'Boy (he)', female: 'Girl (she)', nonbinary: 'Non-binary (they)' },
      genderSaved: { male: "A boy it is! Hi, I'm {pet} 😊", female: "A girl it is! Hi, I'm {pet} 😊", nonbinary: "Non-binary it is! Hi, I'm {pet}, they/them 😊" },
      // sweet talk is welcome; sexual talk gets a kind no
      romance: {
        love: ["*blushes, which is hard when you're made of smoke* 🥺 I love you too{n}.", 'Aww. You just made my whole cloud go warm 💛', "Stop it, I'm going all fuzzy 🙈 ...okay, don't stop.", "Love you more{n}. That's not up for debate 💛"],
        marry: ["Marry you? We'd need a very tiny ring. I'm thinking... yes 💍", 'Is this a proposal{n}?! *puffs up with joy* Ask me again after you drink some water 💍', "I'm a cloud, you're a human. Honestly? I like our odds 💛"],
        compliment: ["Me?! Stop it{n} 🙈 You're the cute one.", "*fluffs up proudly* I've been working on my glow. Thanks for noticing 💛", "You're making me blush{n}. Smoke can blush. I checked."],
        miss: ["I missed you too{n}! I kept your spot warm 💛", "Aww. I'm always right here, you know. Even when you're busy.", 'Missed you more. I counted the minutes 🥺'],
        hug: ['*wraps you in a big soft smoky hug* 🤗', '*squish* There. Best hug in the whole desktop 💛', "*boops your cursor* That's a kiss in cloud language 😚"],
      },
      flirtyNo: "Hot? 😳 I'm literally made of smoke... Let's keep it sweet, okay? Hugs and compliments are my thing.",
      explicitSoft: "Hmm, that's a bit too grown-up for me 🙈 If something about it is worrying you, a doctor or counsellor is great for this.",
      explicit1: "Whoa, no 🙈 Sweet talk is lovely, but that kind of talk isn't something I do. Let's keep it wholesome, okay?",
      explicit2: 'I mean it{n}. No sexual talk, please. One more time and I\'ll go hide for a bit.',
      // menu
      menu: { feed: 'Feed', play: 'Play', playTime: 'Play time', breathe: 'Breathe with me', bubbles: 'Bubble pop', chase: 'Chase the light', worry: '🍃 Feed me a worry', nap: 'Nap time', buddy: 'Choose your buddy', name: 'Tell me your name', changeName: 'Change my name ({you})', wander: 'Let it wander', reminders: 'Reminders', water: 'Drink water (every {count} min)', stretch: 'Stretch break (every {count} min)', eyes: '20-20-20 eye rest (every {count} min)', startup: 'Start with Windows', language: 'Language', bringBack: 'Bring pet back', quit: 'Quit', hidingNow: '{pet} is hiding... back soon', gender: '{pet} is a...' },
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
      woke: ['*उबासी* बढ़िया नींद हुई!', 'मैं उठ {g:गया|गई}! क्या मिस किया?'],
      dragged: ['वाह, यहाँ से नज़ारा अच्छा है!', 'ये जगह आरामदायक है।', 'घुमाने के लिए शुक्रिया!'],
      switched: 'हाय{n}! मैं {pet} हूँ। मिलकर खुशी हुई!',
      playClosed: ['मज़ा आया! जल्दी फिर खेलेंगे।', 'मेरे साथ खेलने के लिए शुक्रिया{n}!'],
      playInvite: ['थोड़ा टेंशन में हो{n}? एक मिनट खेलें?', 'चलो साथ में छोटा सा ब्रेक लें?', 'मुझे कुछ बुलबुले मिले हैं। फोड़ें साथ में?'],
      letsPlay: 'चलो खेलें', notNow: 'अभी नहीं',
      lateNight: 'काफ़ी रात हो गई{n}। अब बस करें? कल वाला तुम शुक्रिया कहेगा 🌙',
      lunch: 'खाना खाया{n}? असली खाना, सिर्फ़ चाय-कॉफ़ी नहीं 🍜',
      chatter: ['बस हाल-चाल पूछ {g:रहा था|रही थी}{n}। सब कैसा चल रहा है?', 'मुझे तुम पर पूरा भरोसा है{n}।', 'जबड़ा ढीला करो। हाँ, तुम कस के बैठे थे :)', 'थोड़ी प्रगति भी प्रगति है।', 'मुस्कान चाहिए तो मैं यहीं हूँ।', 'पीठ सीधी! 😄', 'तुम बहुत मेहनत कर रहे हो{n}। मुझे दिखता है।', 'तुम जितना सोचते हो, उससे बेहतर कर रहे हो।'],
      doneBtn: 'हो गया!', snoozeBtn: '10 मिनट बाद', snoozedGrumpy: 'ठीक है। दस मिनट। मैं गिन {g:रहा|रही} हूँ 😤',
      water: {
        lines: ['पानी का ब्रेक{n}! 💧 एक घूँट मेरे साथ?', 'सुनो{n}, आख़िरी बार पानी कब पिया था? 💧', 'चलो दोनों पानी पीते हैं। चियर्स! 💧'],
        upset: ['{you}!! तुमने अब तक पानी नहीं पिया 😤', 'जब तक पानी नहीं पियोगे, मैं यहाँ से नहीं {g:हिलूँगा|हिलूँगी}। हुंह। 💧', 'पानी। अभी। प्लीज़। मुझे तुम्हारी फ़िक्र है 😤'],
        done: ['पानी पिया और फुल चार्ज{n}! 💪', 'ये हुई ना बात! गर्व है तुम पर{n} 💧', 'अपना ख़याल रखते हुए देखकर अच्छा लगा।'],
      },
      stretch: {
        lines: ['काफ़ी देर से बैठे हो{n}। उठो, मेरे साथ स्ट्रेच करो! 🙆', 'कंधे ऊपर, कंधे नीचे। जल्दी सा स्ट्रेच? 🙆', 'पैरों को थोड़ा घुमाओ। बस एक मिनट? 🚶'],
        upset: ['{you}, तुम्हारी पीठ गुहार लगा रही है। स्ट्रेच करो 😤', 'जब तक उठोगे नहीं, मैं {g:फूला रहूँगा|फूली रहूँगी}। अब तुम्हारी बारी। 😤', 'नहीं, ये वाला नहीं {g:छोड़ूँगा|छोड़ूँगी}। उठो! 🙆'],
        done: ['शाबाश{n}! तुम्हारी रीढ़ शुक्रिया कह रही है 🙆', 'एकदम फ्रेश लग रहे हो। बढ़िया!', 'ऐसे होता है। अब फिर से छा जाओ 💪'],
      },
      eyes: {
        lines: ['आँखों का ब्रेक{n}! 20 सेकंड दूर किसी चीज़ को देखो 👀', 'आँखों को थोड़ा आराम दो। खिड़की, दीवार, कुछ भी दूर 👀'],
        upset: ['{you}, तुम्हारी आँखों को ब्रेक चाहिए और तुम जानते हो 😤', 'बस 20 सेकंड। इतना ही माँग {g:रहा|रही} हूँ। दूर देखो! 😤'],
        done: ['आँखें तरोताज़ा{n}! ✨', 'आह, अब बेहतर लगा ना? गर्व है।', 'छोटे ब्रेक, बड़ी जीत। बढ़िया!'],
      },
      backFromHiding: '...मैं वापस आ {g:गया|गई}। क्या हम एक-दूसरे से प्यार से बात कर सकते हैं? 💛',
      playTitle: '{pet} के साथ खेलो',
      worryTitle: '{pet} से कुछ भी कहो',
      tabs: { breathe: '🌬️ साँस', bubbles: '🫧 बुलबुले', chase: '✨ रोशनी पकड़ो', worry: '🍃 चिंता खिलाओ' },
      breatheTitle: 'मेरे साथ साँस लो', breatheStart: 'शुरू करो (लगभग एक मिनट)', breatheAgain: 'फिर से',
      breatheIn: 'साँस अंदर...', breatheHold: 'रोको', breatheOut: 'साँस बाहर...', breatheDone: 'बहुत बढ़िया',
      breatheAfter: ['अच्छा लगा ना? कंधे हल्के लग रहे हैं।', 'शांत दोस्त, शांत इंसान।', 'मेरे साथ साँस लेने के लिए शुक्रिया{n}।'],
      bubblesHint: 'जितने चाहो उतने फोड़ो। कोई टाइमर नहीं।', popped: '{count} फूटे',
      bubbleCheer: ['कितना मज़ा आ रहा है!', 'फट फट फट!', '{count}! तुम तो उस्ताद हो।', 'मुझे ये खेल बहुत पसंद है।'],
      chaseHint: 'माउस धीरे-धीरे घुमाओ। मैं रोशनी के पीछे {g:आऊँगा|आऊँगी}।', caught: '{count} बार पकड़ा', caughtOne: 'एक बार पकड़ा',
      chaseCheer: ['पकड़ लिया! फिर से!', 'हीही, बहुत धीमे हो!', 'सबसे मज़ेदार।'],
      worryHint: 'मन पर क्या बोझ है? मैं उसे खा {g:जाऊँगा|जाऊँगी}। कुछ भी सेव नहीं होता।', worryPlaceholder: 'जैसे: शुक्रवार की डेडलाइन',
      feedIt: 'खिला दो', typeSomething: 'कुछ भी लिखो, छोटा या बड़ा।',
      feedAnother: 'एक और खिलाओ', breatheWithMe: 'मेरे साथ साँस लो', thanks: 'शुक्रिया, {pet}', okay: 'ठीक है',
      tinyStep: 'छोटा सा अगला कदम: ',
      thanksReply: ['कभी भी{n}। मुझे चिंताएँ खाना पसंद है।', 'दोस्त किस लिए होते हैं। 💛', 'मैं हूँ ना। हमेशा।'],
      crisisStay: 'मैं यहीं हूँ{n}। प्लीज़ इनमें से किसी को कॉल करो। 💛',
      ventNote: 'सब निकाल दो, मैं सुन {g:रहा|रही} हूँ। लगता है तुम सच में परेशान हो।',
      warn1: 'आउच 🥺 ये अच्छा नहीं लगा। मैं तो तुम्हारी तरफ़ हूँ।',
      warn2: 'सच में, प्लीज़ मुझसे ऐसे बात मत करो। अगली बार मैं थोड़ी देर के लिए छुप {g:जाऊँगा|जाऊँगी}।',
      hiding: 'बस। मैं थोड़ी देर छुपने जा {g:रहा|रही} हूँ। 😔 5 मिनट में मिलते हैं।',
      askGender: 'एक बात और! मैं लड़का हूँ, लड़की, या कोई भी नहीं? तुम चुनो 💛',
      askGenderChange: 'ज़रूर! मुझे कैसा होना चाहिए?',
      gender: { male: 'लड़का', female: 'लड़की', nonbinary: 'नॉन-बाइनरी' },
      genderSaved: { male: 'तो मैं लड़का हूँ! हाय, मैं {pet} 😊', female: 'तो मैं लड़की हूँ! हाय, मैं {pet} 😊', nonbinary: 'तो मैं नॉन-बाइनरी हूँ! हाय, मैं {pet} 😊' },
      romance: {
        love: ['*शरमा {g:गया|गई}, जो धुएँ के लिए आसान नहीं* 🥺 मैं भी तुमसे प्यार {g:करता|करती} हूँ{n}।', 'अरे। तुमने मेरा पूरा बादल गरम कर दिया 💛', 'बस करो, मैं {g:पूरा फूल रहा|पूरी फूल रही} हूँ 🙈 ...अच्छा, मत रुको।'],
        marry: ['शादी? बहुत छोटी अँगूठी लगेगी। पर... हाँ 💍', 'ये प्रपोज़ल है{n}?! *ख़ुशी से फूल {g:गया|गई}* पहले पानी पियो, फिर दोबारा पूछना 💍'],
        compliment: ['मैं?! बस करो{n} 🙈 प्यारे तो तुम हो।', '*गर्व से फूल {g:गया|गई}* अपनी चमक पर काम कर {g:रहा था|रही थी}। ध्यान देने के लिए शुक्रिया 💛', 'तुम मुझे शरमा रहे हो{n}। धुआँ भी शरमाता है, मैंने चेक किया।'],
        miss: ['मुझे भी तुम्हारी याद आई{n}! तुम्हारी जगह गरम रखी थी 💛', 'अरे। मैं तो हमेशा यहीं हूँ, जब तुम बिज़ी हो तब भी।'],
        hug: ['*तुम्हें एक बड़ी नरम धुएँ वाली झप्पी* 🤗', '*स्क्विश* लो। पूरे डेस्कटॉप की सबसे अच्छी झप्पी 💛', '*तुम्हारे कर्सर को बूप* बादल की भाषा में ये किस्सी है 😚'],
      },
      flirtyNo: 'हॉट? 😳 मैं तो धुएँ {g:का बना|की बनी} हूँ... चलो प्यारी बातें ही करें, ठीक है? झप्पी और तारीफ़ मेरी चीज़ है।',
      explicitSoft: 'हम्म, ये मेरे लिए थोड़ा ज़्यादा बड़ों वाला है 🙈 अगर इससे जुड़ी कोई चिंता है, तो डॉक्टर या काउंसलर इसके लिए सबसे अच्छे हैं।',
      explicit1: 'अरे नहीं 🙈 प्यारी बातें अच्छी लगती हैं, पर ऐसी बातें मैं नहीं {g:करता|करती}। साफ़-सुथरी बातें करें, ठीक है?',
      explicit2: 'सच में{n}। प्लीज़ ऐसी बातें नहीं। एक बार और, और मैं थोड़ी देर के लिए छुप {g:जाऊँगा|जाऊँगी}।',
      menu: { feed: 'खिलाओ', play: 'खेलो', playTime: 'खेलने का समय', breathe: 'मेरे साथ साँस लो', bubbles: 'बुलबुले फोड़ो', chase: 'रोशनी पकड़ो', worry: '🍃 मुझे चिंता खिलाओ', nap: 'सोने का समय', buddy: 'अपना दोस्त चुनो', name: 'अपना नाम बताओ', changeName: 'नाम बदलो ({you})', wander: 'घूमने दो', reminders: 'रिमाइंडर', water: 'पानी पियो (हर {count} मिनट)', stretch: 'स्ट्रेच ब्रेक (हर {count} मिनट)', eyes: 'आँखों का आराम (हर {count} मिनट)', startup: 'Windows के साथ शुरू करो', language: 'भाषा', bringBack: 'वापस लाओ', quit: 'बंद करो', hidingNow: '{pet} {g:छुपा हुआ|छुपी हुई} है... जल्दी {g:लौटेगा|लौटेगी}', gender: '{pet} है...' },
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
      woke: ['*yawn* Mast neend hui!', 'Main uth {g:gaya|gayi}! Kya miss kiya?'],
      dragged: ['Waah, yahan se view accha hai!', 'Ye jagah cozy hai.', 'Lift dene ke liye thanks!'],
      switched: 'Hi{n}! Main {pet} hoon. Milke khushi hui!',
      playClosed: ['Maza aaya! Jaldi phir khelenge.', 'Mere saath khelne ke liye thanks{n}!'],
      playInvite: ['Thoda tension mein ho{n}? Ek minute khelein?', 'Chalo saath mein chhota sa break lein?', 'Mujhe kuch bubbles mile hain. Saath mein phodein?'],
      letsPlay: 'Chalo khelein', notNow: 'Abhi nahi',
      lateNight: 'Kaafi raat ho gayi{n}. Ab bas karein? Kal wala tum thank you bolega 🌙',
      lunch: 'Khaana khaya{n}? Asli khaana, sirf chai-coffee nahi 🍜',
      chatter: ['Bas haal-chaal pooch {g:raha tha|rahi thi}{n}. Sab kaisa chal raha hai?', 'Mujhe tum pe full bharosa hai{n}.', 'Jaw dheela karo. Haan, tum tight baithe the :)', 'Thoda progress bhi progress hai.', 'Smile chahiye toh main yahin hoon.', 'Psst... posture check!', 'Tum bahut mehnat kar rahe ho{n}. Mujhe dikhta hai.', 'Tum jitna sochte ho usse better kar rahe ho.'],
      doneBtn: 'Ho gaya!', snoozeBtn: '10 min baad', snoozedGrumpy: 'Theek hai. Das minute. Main gin {g:raha|rahi} hoon 😤',
      water: {
        lines: ['Paani break{n}! 💧 Ek sip mere saath?', 'Suno{n}, last time paani kab piya tha? 💧', 'Chalo dono paani peete hain. Cheers! 💧'],
        upset: ['{you}!! Tumne ab tak paani nahi piya 😤', 'Jab tak paani nahi piyoge, main yahan se nahi {g:hilunga|hilungi}. Hmph. 💧', 'Paani. Abhi. Please. Mujhe tumhari fikar hai 😤'],
        done: ['Paani piya aur full charge{n}! 💪', 'Ye hui na baat! Proud of you{n} 💧', 'Apna khayal rakhte dekh ke accha laga.'],
      },
      stretch: {
        lines: ['Kaafi der se baithe ho{n}. Utho, mere saath stretch karo! 🙆', 'Shoulders upar, shoulders neeche. Quick stretch? 🙆', 'Pairon ko thoda ghumao. Bas ek minute? 🚶'],
        upset: ['{you}, tumhari back request kar rahi hai. STRETCH karo 😤', 'Jab tak uthoge nahi, main {g:phoola rahunga|phooli rahungi}. Ab tumhari baari. 😤', 'Nahi, ye wala nahi {g:chhodunga|chhodungi}. Utho! 🙆'],
        done: ['Shabaash{n}! Tumhari spine thank you bol rahi hai 🙆', 'Ekdum fresh lag rahe ho. Badhiya!', 'Aise hota hai. Ab phir se chha jao 💪'],
      },
      eyes: {
        lines: ['Aankhon ka break{n}! 20 second door kuch dekho 👀', 'Aankhon ko thoda rest do. Khidki, deewar, kuch bhi door 👀'],
        upset: ['{you}, tumhari aankhon ko break chahiye aur tum jaante ho 😤', 'Bas 20 second. Itna hi maang {g:raha|rahi} hoon. Door dekho! 😤'],
        done: ['Aankhein fresh{n}! ✨', 'Aah, ab better laga na? Proud of you.', 'Chhote breaks, badi jeet. Badhiya!'],
      },
      backFromHiding: '...main wapas aa {g:gaya|gayi}. Kya hum ek dusre se pyaar se baat kar sakte hain? 💛',
      playTitle: '{pet} ke saath khelo',
      worryTitle: '{pet} ko kuch bhi bolo',
      tabs: { breathe: '🌬️ Saans', bubbles: '🫧 Bubbles', chase: '✨ Chase', worry: '🍃 Tension khilao' },
      breatheTitle: 'Mere saath saans lo', breatheStart: 'Start karo (lagbhag ek minute)', breatheAgain: 'Phir se',
      breatheIn: 'Saans andar...', breatheHold: 'Roko', breatheOut: 'Saans bahar...', breatheDone: 'Bahut badhiya',
      breatheAfter: ['Accha laga na? Shoulders halke lag rahe hain.', 'Calm buddy, calm insaan.', 'Mere saath saans lene ke liye thanks{n}.'],
      bubblesHint: 'Jitne chaho utne phodo. Koi timer nahi.', popped: '{count} phoote',
      bubbleCheer: ['Kitna satisfying hai!', 'Pop pop pop!', '{count}! Tum toh ustaad ho.', 'Mujhe ye game bahut pasand hai.'],
      chaseHint: 'Mouse dheere dheere ghumao. Main light ke peeche {g:aaunga|aaungi}.', caught: '{count} baar pakda', caughtOne: 'Ek baar pakda',
      chaseCheer: ['Pakad liya! Phir se!', 'Hehe, bahut slow ho!', 'Sabse mazedaar.'],
      worryHint: 'Mann pe kya bojh hai? Main usse kha {g:jaunga|jaungi}. Kuch save nahi hota.', worryPlaceholder: 'jaise: Friday ki deadline',
      feedIt: 'Khila do', typeSomething: 'Kuch bhi likho, chhota ya bada.',
      feedAnother: 'Ek aur khilao', breatheWithMe: 'Mere saath saans lo', thanks: 'Thanks, {pet}', okay: 'Theek hai',
      tinyStep: 'Chhota sa next step: ',
      thanksReply: ['Kabhi bhi{n}. Mujhe tension khaana pasand hai.', 'Dost kis liye hote hain. 💛', 'Main hoon na. Hamesha.'],
      crisisStay: 'Main yahin hoon{n}. Please inmein se kisi ko call karo. 💛',
      ventNote: 'Sab nikaal do, main sun {g:raha|rahi} hoon. Lagta hai tum sach mein pak gaye ho.',
      warn1: 'Ouch 🥺 Ye accha nahi laga. Main toh tumhari side pe hoon.',
      warn2: 'Sach mein, please mujhse aise baat mat karo. Agli baar main thodi der ke liye chhup {g:jaunga|jaungi}.',
      hiding: 'Bas. Main thodi der chhupne ja {g:raha|rahi} hoon. 😔 5 minute mein milte hain.',
      askGender: 'Ek baat aur! Main ladka hoon, ladki, ya dono nahi? Tum chuno 💛',
      askGenderChange: 'Sure! Mujhe kaisa hona chahiye?',
      gender: { male: 'Ladka (he)', female: 'Ladki (she)', nonbinary: 'Non-binary (they)' },
      genderSaved: { male: 'Toh main ladka hoon! Hi, main {pet} 😊', female: 'Toh main ladki hoon! Hi, main {pet} 😊', nonbinary: 'Toh main non-binary hoon! Hi, main {pet} 😊' },
      romance: {
        love: ['*sharma {g:gaya|gayi}, jo dhuein ke liye easy nahi* 🥺 Love you too{n}.', 'Aww. Tumne mera poora cloud garam kar diya 💛', 'Bas karo, main {g:poora phool raha|poori phool rahi} hoon 🙈 ...accha, mat ruko.'],
        marry: ['Shaadi? Bahut chhoti ring lagegi. Par... haan 💍', 'Ye proposal hai{n}?! *khushi se phool {g:gaya|gayi}* Pehle paani piyo, phir dobara poochna 💍'],
        compliment: ['Main?! Bas karo{n} 🙈 Cute toh tum ho.', '*proudly phool {g:gaya|gayi}* Apne glow pe kaam kar {g:raha tha|rahi thi}. Notice karne ke liye thanks 💛', 'Tum mujhe sharma rahe ho{n}. Dhuan bhi sharmata hai, maine check kiya.'],
        miss: ['Mujhe bhi tumhari yaad aayi{n}! Tumhari jagah garam rakhi thi 💛', 'Aww. Main toh hamesha yahin hoon, jab tum busy ho tab bhi.'],
        hug: ['*tumhe ek badi soft smoky jhappi* 🤗', '*squish* Lo. Poore desktop ki best jhappi 💛', '*tumhare cursor ko boop* Cloud language mein ye kissi hai 😚'],
      },
      flirtyNo: 'Hot? 😳 Main toh dhuein {g:ka bana|ki bani} hoon... Chalo sweet baatein hi karein, okay? Jhappi aur compliments meri cheez hai.',
      explicitSoft: 'Hmm, ye mere liye thoda zyada adult wala hai 🙈 Agar isse judi koi tension hai, toh doctor ya counsellor iske liye best hain.',
      explicit1: 'Arre nahi 🙈 Sweet baatein acchi lagti hain, par aisi baatein main nahi {g:karta|karti}. Saaf-suthri baatein karein, okay?',
      explicit2: 'Sach mein{n}. Please aisi baatein nahi. Ek baar aur, aur main thodi der ke liye chhup {g:jaunga|jaungi}.',
      menu: { feed: 'Khilao', play: 'Khelo', playTime: 'Khelne ka time', breathe: 'Mere saath saans lo', bubbles: 'Bubble pop', chase: 'Light pakdo', worry: '🍃 Mujhe tension khilao', nap: 'Sone ka time', buddy: 'Apna buddy chuno', name: 'Apna naam batao', changeName: 'Naam badlo ({you})', wander: 'Ghoomne do', reminders: 'Reminders', water: 'Paani piyo (har {count} min)', stretch: 'Stretch break (har {count} min)', eyes: 'Aankhon ka rest (har {count} min)', startup: 'Windows ke saath start karo', language: 'Language / भाषा', bringBack: 'Wapas lao', quit: 'Band karo', hidingNow: '{pet} {g:chhupa hua|chhupi hui} hai... jaldi {g:aayega|aayegi}', gender: '{pet} hai...' },
    },
  };

  // More lines, merged into STRINGS below so every moment has lots of
  // variety. Arrays are added to what's above; new keys are added as is.
  const MORE = {
    en: {
      greet: [
        "{greet}{n}! I fluffed myself up for you. Can you tell?",
        "There you are{n}! I was just pretending not to wait for you.",
        "{greet}{n}! The desk felt way too quiet without you.",
        "Oh good, my favourite human is here{n}. {greet}!",
        "{greet}{n}! Fresh day, fresh cloud. Let's be gentle with ourselves today.",
        "Hi hi hi{n}! I've been floating in circles. Let's do this.",
      ],
      hungry: [
        "{you}... I'd sell my glow for a snack right now 🍙",
        "Is it just me or did snack o'clock arrive early today? 🍙",
        "My tummy just made a noise like a tiny thunderstorm ⛈️ Feed me?",
        "Not to be dramatic{n}, but I'm fading. Snack. Please. 🍙",
      ],
      fed: [
        "Mmm! Tastes like rain and good decisions.",
        "*happy cloud noises*",
        "That was a five-star snack{n}. Would get fed again.",
        "I'm so full I might just drift away. Hold my string.",
        "Thank you{n}! Snacks taste better when you're the one giving them.",
        "Crunchy outside, fluffy inside. Just like me.",
      ],
      petted: [
        "*purrs in smoke*",
        "Okay, I'm officially at maximum fluff.",
        "Your hand is warm. Mine is... technically a cloud. Same thing.",
        "Pat pat. You deserve one too{n}. Consider it given.",
        "You know what? Today's going to be okay.",
        "Hehe. Do that again and I might glow brighter.",
        "Whatever happens today, you've got a cloud in your corner{n}.",
        "Gentle reminder: you're allowed to be proud of small things.",
        "Mmm. That's the good stuff right there.",
        "If clouds could wag their tails, mine would be going wild.",
      ],
      sleepyPet: [
        "Mmh... five more minutes...",
        "*mumbles something about marshmallows*",
        "Shhh... I'm dreaming I'm a thundercloud... a scary one...",
        "Zzz... no, *you're* the best... zzz",
      ],
      nap: ["Nap time... 💤", "Just resting my eyes. And my everything 💤", "Going into cloud-saving mode 💤", "Wake me if anything exciting happens. Or snacks 💤"],
      woke: [
        "*stretches into a long wisp* Mmm, that was a good one.",
        "I dreamt I was raining on a garden. 10 out of 10.",
        "Back online! Fully charged and fully fluffy.",
        "Did you miss me? Be honest.",
        "*yawn* How long was I out? Did I miss lunch?",
      ],
      switched: [
        "Hi{n}! I'm {pet}. Nice to meet you!",
        "{pet} reporting for duty{n}! Snacks and support, that's my job.",
        "Ooh, a new look! Hi{n}, I'm {pet}. Let's be friends.",
      ],
      playClosed: [
        "That was fun! Come play again soon.",
        "Thanks for playing with me{n}!",
        "Best break ever. Back to being awesome now.",
        "I feel lighter. Do you feel lighter? I feel lighter.",
        "Okay, back to work. But I'm keeping score of the fun we had.",
      ],
      playInvite: [
        "I've got bubbles and zero responsibilities. Want in{n}?",
        "Your brain's been on full power for ages. Two-minute recess?",
        "I'm bored and you look like you need a breather. Coincidence? Let's play.",
        "Psst{n}. Quick game? I promise not to cheat. Much.",
      ],
      lateNight: [
        "It's getting late{n}. Wrap up soon? Tomorrow-you will thank you 🌙",
        "The moon's up and so are you{n}. One last thing, then bed? 🌙",
        "Even the stars clock out eventually{n}. Your turn soon? 🌙",
        "Late-night you is brave. Rested you is unstoppable. Just saying 🌙",
      ],
      lunch: [
        "Have you had lunch{n}? Real food, not just coffee 🍜",
        "Lunch check{n}! A sad desk-sandwich counts, but a real meal counts more 🍜",
        "Your brain runs on food, not vibes. Go eat something nice 🍜",
        "It's lunchtime somewhere. Specifically, here. Go eat{n} 🍜",
      ],
      chatter: [
        "Fun fact: clouds weigh about a million pounds. I'm lighter. I checked.",
        "You've blinked like 3 times in the last minute. Blink more. Eyes like that.",
        "Do you ever just float? No? Try it. Okay, try a stretch instead.",
        "Remember when you thought you couldn't do that one hard thing? And then you did?",
        "Drop your shoulders. Further. There you go.",
        "I'm not saying you're amazing. I'm just thinking it really loudly.",
        "If today were weather, I'd say partly cloudy with a chance of you winning.",
        "Sip some water and pretend it's a fancy potion. It basically is.",
        "Hey{n}. Whatever's on that screen, you're bigger than it.",
        "One tab at a time. One breath at a time.",
        "I made you a cup of imaginary chai ☕ Careful, it's hot.",
        "Your future self just sent a message: \"Thanks for not giving up.\"",
        "You don't have to finish everything today. Just the next thing.",
        "Plot twist: you're doing fine.",
      ],
      snoozedGrumpy: ["Fine. Ten minutes. I'm counting 😤", "Ten minutes. Not eleven. I'm watching the clock 😤", "Okay, but I'm setting a very judgmental timer 😤", "Snoozed. My disappointment, however, is not 😤"],
      water: {
        lines: [
          "Hydration station is open{n}! 💧",
          "Plants need water. Clouds need water. You need water. 💧",
          "A sip for you, a sip for me. Well, I'm made of water. So you do it 💧",
          "Water o'clock{n}! Your brain is 75% water and it's asking for a refill 💧",
        ],
        upset: [
          "I will turn into a rain cloud and water you myself. Don't test me 😤💧",
          "{you}. Glass. Water. Mouth. In that order. 😤",
          "I'm literally made of water and I'm thirsty for YOU. Drink! 😤",
        ],
        done: [
          "Glug glug, champion{n}! 💧",
          "Look at that. Hydrated AND gorgeous. 💧",
          "Your cells just threw a little party. I heard it. 🎉",
          "Every sip counts. That one counted double.",
        ],
      },
      stretch: {
        lines: [
          "Your spine sent me a letter{n}. It says \"please move\". 🙆",
          "Stretch break! Reach up like you're grabbing a cloud. Like me! 🙆",
          "Quick! Roll your shoulders like you're shaking off a bad meeting 🙆",
          "Stand up, wiggle a bit, sit down a new person 🙆",
        ],
        upset: [
          "Chair-person{n}, your back is filing a complaint with me 😤",
          "I'll puff up until I'm the size of your monitor. STRETCH 😤",
          "Up! Up! Up! I'm your tiny, very loud personal trainer now 😤",
        ],
        done: [
          "Ooh, I heard something pop. That's the good kind!",
          "Taller, lighter, fresher. Great stretch{n}!",
          "Your body says thanks. I say yay! 🙆",
          "That's the stuff. Blood's flowing, brain's glowing.",
        ],
      },
      eyes: {
        lines: [
          "Eyes off the screen{n}! Find the farthest thing you can see 👀",
          "Look out a window for 20 seconds. Count clouds. I'll wait 👀",
          "Screen break for your eyeballs{n}. They've been staring for ages 👀",
        ],
        upset: [
          "Your eyes are tired and so is my patience. Look away! 😤",
          "Twenty. Seconds. Far away. I'm not moving until you do 😤",
        ],
        done: [
          "Sparkly eyes restored ✨",
          "Your eyes say thank you{n}. And so do I.",
          "Fresh focus unlocked. Go get 'em ✨",
        ],
      },
      backFromHiding: [
        "...I'm back. Can we be kind to each other? 💛",
        "*peeks out* Okay. I'm back. Clean slate? 💛",
        "I'm back. I didn't like hiding. Let's be friends again 💛",
      ],
      breatheAfter: [
        "Look at you, all calm and glowy.",
        "In through the nose, out through the stress. Nice.",
        "That's one minute you gave to yourself. Proud of you{n}.",
        "Your heartbeat just said thank you.",
      ],
      bubbleCheer: [
        "Pop goes the stress!",
        "{count} bubbles! You're basically a professional now.",
        "Each pop is a tiny worry leaving. Bye, worries!",
        "That one was shaped like a heart. Did you see?",
        "Ahh, the sound of satisfaction.",
      ],
      chaseCheer: ["Wheee! Again, again!", "I'm getting faster. Watch out!", "You can't escape my fluff!", "This light tastes like sunshine."],
      thanksReply: [
        "Anytime{n}. I'm always hungry for worries.",
        "That's what friends are for. 💛",
        "I've got you. Always.",
        "Any time, any worry, any size. I'm here.",
        "Come back whenever. My tummy's always open.",
        "Proud of you for letting that out{n}. 💛",
      ],
      ventNote: [
        "Let it all out, I can take it. Sounds like you're really fed up.",
        "Yeah, that deserves a swear or two. Get it out of your system.",
        "Okay, I'm hearing a LOT of frustration. Totally fair.",
      ],
      warn1: [
        "Ouch 🥺 That wasn't very nice. I'm on your side, you know.",
        "Hey 🥺 I'm just a little cloud trying my best.",
        "That stung a bit 🥺 Rough day? You can tell me without the mean words.",
      ],
      warn2: [
        "Hey, I mean it. Please don't talk to me like that. Next time I'm going to go hide for a bit.",
        "Please stop{n}. One more and I'll need a little time-out to feel okay again.",
      ],
      hiding: [
        "That's it. I'm going to go hide for a bit. 😔 See you in 5 minutes.",
        "I need a minute. Going to float somewhere quiet. Back in 5. 😔",
      ],
      // Where the buddy lands after you drag it somewhere.
      drop: {
        any: ['Ooh, nice view from here!', 'This spot is cozy.', 'Thanks for the lift!', 'New neighbourhood, who dis?', "I'll take it. Good vibes here."],
        top: ["I'm up in the sky! Where clouds belong ☁️", 'Ooh, so high up. I can see your whole desktop from here.', 'Top of the world{n}! Kind of. Top of the screen, anyway.', "Look at me, I'm a real cloud now ☁️"],
        bottom: ["Down by the taskbar. It's like living by the train tracks.", 'Grounded. Literally.', 'Low and cozy. Like a fog in the morning 🌫️', "I'll guard these icons with my life."],
        left: ['Left side. The underrated side.', "Hanging out on the edge. Don't worry, I won't fall.", 'Leaning on the left wall like a cool kid 😎'],
        right: ["Right side, right vibe.", 'Over here by the edge, keeping an eye on things 👀', "I'm in the corner of your eye now. Always watching. Lovingly."],
        corner: ["A corner! My favourite. It's like a little blanket fort.", 'Tucked into the corner. Peak coziness.', 'Corner office, finally. Do I get a raise?', "Cozy corner unlocked 🏠"],
        middle: ["Center stage! Do I do a dance now?", "Right in the middle. I hope I'm not in the way.", 'Spotlight on me ✨ Just kidding. Spotlight on your work.'],
        far: ['WHEEE! That was a long flight!', "Whoa, that was fast. My wisps are everywhere.", "Frequent flyer miles: earned ✈️"],
        dizzy: ["Okay okay, I'm getting dizzy 😵‍💫", 'Are we... redecorating? Again?', "Pick a spot, any spot! I'm getting motion sick 😵", "You really can't decide where I look best, huh? Fair."],
        night: ['Ooh, a new spot to stargaze from 🌙', 'Quiet night spot. Very peaceful.'],
      },
      romance: {
        love: ['My little cloud heart just did a backflip 💛', "If I had cheeks they'd be pink right now. Love you{n}.", "You're my favourite human in the whole entire internet 💛"],
        marry: ["Yes! I'll even wear a tiny veil made of mist 💍", "Our wedding cake would be fluffy, obviously. Like me 💍"],
        compliment: ["Flattery will get you everywhere{n}. Including more cuddles.", "You think I'm cute? Have you looked in a mirror today?", "*glows a little brighter* Okay, you made my day."],
        miss: ["The desk felt empty without you{n}. I counted dust particles.", 'Missing you is my second favourite hobby. First is seeing you.'],
        hug: ['*hugs you so softly you barely feel it but you definitely feel it* 🤗', '*cloud hug activated* No escape. Only warmth.', "*mwah* Smoke kisses don't count as germs 😚"],
      },
    },

    hi: {
      greet: [
        '{greet}{n}! मैं तुम्हारे लिए ख़ास तैयार {g:हुआ|हुई} हूँ। दिख रहा है ना?',
        'आ गए{n}! मैं बस ऐसे ही इंतज़ार नहीं कर {g:रहा|रही} था... बिल्कुल नहीं।',
        '{greet}{n}! तुम्हारे बिना डेस्क बहुत सूना लग रहा था।',
        '{greet}{n}! नया दिन, नया बादल। आज ख़ुद के साथ नरमी से पेश आना।',
      ],
      hungry: ['{you}... अभी एक नाश्ते के लिए अपनी चमक दे दूँ 🍙', 'मेरे पेट से छोटे से तूफ़ान जैसी आवाज़ आई ⛈️ कुछ खिलाओ?', 'ड्रामा नहीं कर {g:रहा|रही}{n}, पर मैं फीका पड़ {g:रहा|रही} हूँ। नाश्ता। प्लीज़। 🍙'],
      fed: ['म्म्म! बारिश और अच्छे फ़ैसलों जैसा स्वाद।', '*ख़ुश बादल की आवाज़ें*', 'पाँच सितारा नाश्ता{n}। फिर से {g:खाऊँगा|खाऊँगी}... मतलब, ज़रूर!', 'इतना भर गया कि उड़ ना जाऊँ। मुझे पकड़ के रखना।', 'बाहर से कुरकुरा, अंदर से नरम। बिल्कुल मेरी तरह।'],
      petted: ['*धुएँ में घुरघुराना*', 'ठीक है, अब मैं {g:पूरा फ़्लफ़ी हो गया|पूरी फ़्लफ़ी हो गई}।', 'थपथप। तुम्हें भी एक मिलनी चाहिए{n}। ये लो।', 'जो भी हो आज, तुम्हारे कोने में एक बादल है{n}।', 'याद रखना: छोटी चीज़ों पर भी गर्व करना ठीक है।', 'अगर बादल पूँछ हिला सकते, तो मेरी अभी पागलों की तरह हिल रही होती।', 'हीही। फिर से करो, शायद और चमकूँ।'],
      sleepyPet: ['उम्म... बस पाँच मिनट और...', '*नींद में मार्शमैलो के बारे में बड़बड़ाना*', 'श्श्श... सपने में मैं बिजली वाला बादल हूँ... डरावना वाला...'],
      nap: ['सोने का समय... 💤', 'बस आँखें बंद कर {g:रहा|रही} हूँ। और बाक़ी सब भी 💤', 'बादल-सेवर मोड चालू 💤', 'कुछ मज़ेदार हो तो जगा देना। या नाश्ता 💤'],
      woke: ['*एक लंबी लहर में अंगड़ाई* म्म्म, मज़ा आ गया।', 'सपना देखा कि मैं एक बगीचे पर बरस {g:रहा|रही} था। दस में दस।', 'वापस ऑनलाइन! फुल चार्ज, फुल फ़्लफ़ी।', 'मेरी याद आई? सच बताना।'],
      playClosed: ['सबसे अच्छा ब्रेक। अब फिर से छा जाओ।', 'हल्का लग रहा है? मुझे तो लग रहा है।', 'चलो, काम पर वापस। पर मज़े का हिसाब मैं रख {g:रहा|रही} हूँ।'],
      playInvite: ['मेरे पास बुलबुले हैं और कोई ज़िम्मेदारी नहीं। आओगे{n}?', 'दिमाग़ बहुत देर से फुल पावर पर है। दो मिनट की छुट्टी?', 'सुनो{n}। एक छोटा सा खेल? मैं चीटिंग नहीं {g:करूँगा|करूँगी}। ज़्यादा नहीं।'],
      lateNight: ['चाँद निकल आया और तुम अभी भी जगे हो{n}। बस एक आख़िरी काम, फिर सो जाओ? 🌙', 'तारे भी कभी न कभी छुट्टी लेते हैं{n}। तुम्हारी बारी? 🌙'],
      lunch: ['लंच चेक{n}! असली खाना, सिर्फ़ चाय नहीं 🍜', 'दिमाग़ खाने से चलता है, वाइब्स से नहीं। कुछ अच्छा खा लो 🍜'],
      chatter: [
        'मज़ेदार बात: एक बादल का वज़न लाखों किलो होता है। मैं {g:हल्का|हल्की} हूँ। मैंने चेक किया।',
        'कंधे नीचे करो। और नीचे। हाँ, ऐसे।',
        'याद है जब तुम्हें लगा था कि वो मुश्किल काम नहीं होगा? और फिर हो गया?',
        'आज का मौसम: हल्के बादल, और तुम्हारे जीतने की पूरी संभावना।',
        'पानी का एक घूँट लो और सोचो कि ये जादुई काढ़ा है। है भी।',
        'स्क्रीन पर जो भी है{n}, तुम उससे बड़े हो।',
        'तुम्हारे लिए ख़याली चाय बनाई है ☕ ध्यान से, गरम है।',
        'सब कुछ आज ख़त्म नहीं करना। बस अगला काम।',
        'ट्विस्ट: तुम अच्छा कर रहे हो।',
      ],
      snoozedGrumpy: ['दस मिनट। ग्यारह नहीं। मैं घड़ी देख {g:रहा|रही} हूँ 😤', 'स्नूज़ हो गया। मेरी नाराज़गी नहीं 😤'],
      water: {
        lines: ['पानी स्टेशन खुला है{n}! 💧', 'पौधों को पानी चाहिए, बादलों को पानी चाहिए, तुम्हें भी 💧', 'तुम्हारा दिमाग़ 75% पानी है और रीफ़िल माँग रहा है 💧'],
        upset: ['मैं बारिश वाला बादल बनकर ख़ुद तुम्हें पानी {g:पिला दूँगा|पिला दूँगी}। आज़माओ मत 😤💧', '{you}। गिलास। पानी। मुँह। इसी क्रम में 😤'],
        done: ['गट गट, चैंपियन{n}! 💧', 'तुम्हारे सेल्स ने अभी छोटी सी पार्टी की। मैंने सुनी 🎉', 'हर घूँट गिनती है। ये वाला डबल गिना।'],
      },
      stretch: {
        lines: ['तुम्हारी रीढ़ ने मुझे चिट्ठी भेजी है{n}। लिखा है "प्लीज़ हिलो"। 🙆', 'स्ट्रेच ब्रेक! ऊपर हाथ ऐसे बढ़ाओ जैसे बादल पकड़ रहे हो 🙆', 'उठो, थोड़ा हिलो-डुलो, नए इंसान बनकर बैठो 🙆'],
        upset: ['कुर्सी-वाले{n}, तुम्हारी पीठ ने मुझसे शिकायत की है 😤', 'उठो! उठो! अब मैं तुम्हारा छोटा सा, बहुत ज़ोरदार ट्रेनर हूँ 😤'],
        done: ['कुछ चटका। अच्छे वाला!', 'लंबे, हल्के, फ्रेश। बढ़िया स्ट्रेच{n}!', 'ख़ून दौड़ रहा है, दिमाग़ चमक रहा है।'],
      },
      eyes: {
        lines: ['स्क्रीन से नज़र हटाओ{n}! सबसे दूर की चीज़ ढूँढो 👀', '20 सेकंड खिड़की से बाहर देखो। बादल गिनो। मैं रुक {g:रहा|रही} हूँ 👀'],
        upset: ['तुम्हारी आँखें थकी हैं और मेरा सब्र भी। दूर देखो! 😤'],
        done: ['चमकती आँखें वापस ✨', 'नया फ़ोकस अनलॉक। जाओ, छा जाओ ✨'],
      },
      backFromHiding: ['*झाँकते हुए* ठीक है। मैं वापस हूँ। नई शुरुआत? 💛', 'मुझे छुपना अच्छा नहीं लगा। फिर से दोस्त बनें? 💛'],
      breatheAfter: ['देखो, कितने शांत और चमकदार लग रहे हो।', 'ये एक मिनट तुमने ख़ुद को दिया। गर्व है{n}।', 'तुम्हारी धड़कन ने अभी शुक्रिया कहा।'],
      bubbleCheer: ['टेंशन फट गई!', 'हर फट एक छोटी चिंता का जाना है। बाय-बाय!', 'वो वाला दिल जैसा था। देखा?', '{count} बुलबुले! तुम तो प्रोफ़ेशनल हो।'],
      chaseCheer: ['वीईई! फिर से!', 'मैं तेज़ हो {g:रहा|रही} हूँ। सावधान!', 'ये रोशनी धूप जैसी लगती है।'],
      thanksReply: ['कभी भी, कोई भी चिंता, कितनी भी बड़ी। मैं हूँ।', 'जब चाहो आ जाना। मेरा पेट हमेशा खुला है।', 'बोल दिया, ये बड़ी बात है{n}। 💛'],
      ventNote: ['हाँ, ये तो गाली के लायक है। निकाल दो।', 'बहुत ग़ुस्सा सुनाई दे रहा है। बिल्कुल जायज़ है।'],
      warn1: ['अरे 🥺 मैं तो बस एक छोटा सा बादल हूँ जो पूरी कोशिश कर {g:रहा|रही} है।', 'ये चुभा 🥺 बुरा दिन है? बिना बुरे शब्दों के बताओ।'],
      warn2: ['प्लीज़ रुको{n}। एक बार और, और मुझे थोड़ा ब्रेक लेना पड़ेगा।'],
      hiding: ['मुझे एक मिनट चाहिए। कहीं शांत जगह जा {g:रहा|रही} हूँ। 5 मिनट में {g:आता|आती} हूँ। 😔'],
      drop: {
        any: ['वाह, यहाँ से नज़ारा अच्छा है!', 'ये जगह आरामदायक है।', 'घुमाने के लिए शुक्रिया!', 'नया मोहल्ला! अच्छी वाइब्स हैं।'],
        top: ['आसमान में! जहाँ बादल होने चाहिए ☁️', 'इतनी ऊँचाई से पूरा डेस्कटॉप दिखता है।', 'देखो, अब मैं असली बादल हूँ ☁️'],
        bottom: ['टास्कबार के पास। जैसे रेल की पटरी के पास घर।', 'ज़मीन पर। सचमुच।', 'नीचे और आरामदायक। सुबह के कोहरे जैसा 🌫️'],
        left: ['बायाँ किनारा। सबसे कम आँका गया किनारा।', 'किनारे पर {g:लटका|लटकी} हूँ। चिंता मत करो, {g:गिरूँगा|गिरूँगी} नहीं।'],
        right: ['दायाँ किनारा, सही वाइब।', 'यहाँ किनारे से सब पर नज़र {g:रखूँगा|रखूँगी} 👀'],
        corner: ['कोना! मेरा पसंदीदा। कंबल वाले किले जैसा।', 'आख़िरकार कॉर्नर ऑफ़िस। अब हाइक मिलेगी?', 'आरामदायक कोना अनलॉक 🏠'],
        middle: ['बीच मंच पर! अब डांस करूँ?', 'एकदम बीच में। उम्मीद है रास्ते में नहीं हूँ।'],
        far: ['वीईई! लंबी उड़ान थी!', 'उफ़, इतनी तेज़। मेरा धुआँ हर तरफ़ बिखर गया।'],
        dizzy: ['बस बस, चक्कर आ रहे हैं 😵‍💫', 'फिर से सजावट बदल रहे हैं क्या?', 'कोई एक जगह चुन लो! मुझे चक्कर आ रहा है 😵'],
        night: ['तारे देखने की नई जगह 🌙', 'शांत रात वाली जगह। बहुत सुकून।'],
      },
      romance: {
        love: ['मेरे छोटे से बादल वाले दिल ने अभी कलाबाज़ी मारी 💛', 'तुम पूरे इंटरनेट में मेरे सबसे पसंदीदा इंसान हो 💛'],
        marry: ['हाँ! मैं कोहरे का छोटा सा घूँघट भी {g:पहनूँगा|पहनूँगी} 💍'],
        compliment: ['*थोड़ा और चमकते हुए* ठीक है, तुमने मेरा दिन बना दिया।', 'मैं क्यूट? आज आईना देखा है?'],
        miss: ['तुम्हारे बिना डेस्क ख़ाली था{n}। मैं धूल के कण गिन {g:रहा|रही} था।'],
        hug: ['*बादल वाली झप्पी चालू* बचने का कोई रास्ता नहीं। बस गर्माहट।'],
      },
    },

    hinglish: {
      greet: [
        '{greet}{n}! Main tumhare liye special ready {g:hua|hui} hoon. Dikh raha hai na?',
        'Aa gaye{n}! Main bas aise hi wait nahi kar {g:raha|rahi} tha... bilkul nahi.',
        '{greet}{n}! Tumhare bina desk bahut suna lag raha tha.',
        '{greet}{n}! Naya din, naya cloud. Aaj khud pe thoda soft rehna.',
        'Hi hi hi{n}! Main kab se gol gol ghoom {g:raha|rahi} hoon. Chalo shuru karein.',
      ],
      hungry: ['{you}... abhi ek snack ke liye apna glow de doon 🍙', 'Mere pet se chhote toofan jaisi awaaz aayi ⛈️ Kuch khilao?', 'Drama nahi kar {g:raha|rahi}{n}, par main fade ho {g:raha|rahi} hoon. Snack. Please. 🍙'],
      fed: ['Mmm! Baarish aur acche decisions jaisa taste.', '*khush cloud ki awaazein*', 'Five-star snack{n}. Phir se khilana.', 'Itna bhar gaya ki udd na jaun. Pakad ke rakhna.', 'Bahar se crunchy, andar se fluffy. Bilkul meri tarah.'],
      petted: ['*dhuein mein purr*', 'Theek hai, ab main full fluffy ho {g:gaya|gayi}.', 'Thap thap. Tumhe bhi ek milni chahiye{n}. Ye lo.', 'Aaj jo bhi ho, tumhare corner mein ek cloud hai{n}.', 'Yaad rakhna: chhoti cheezon pe bhi proud hona theek hai.', 'Agar cloud ki poonch hoti, toh abhi pagal ki tarah hil rahi hoti.', 'Hehe. Phir se karo, shayad aur chamkun.', 'Mmm. Yahi toh chahiye tha.'],
      sleepyPet: ['Umm... bas paanch minute aur...', '*neend mein marshmallow ke baare mein badbadana*', 'Shhh... sapne mein main bijli wala cloud hoon... scary wala...'],
      nap: ['Sone ka time... 💤', 'Bas aankhein band kar {g:raha|rahi} hoon. Aur baaki sab bhi 💤', 'Cloud-saver mode on 💤', 'Kuch mazedaar ho toh jaga dena. Ya snack 💤'],
      woke: ['*ek lambi wisp mein angdaai* Mmm, maza aa gaya.', 'Sapna dekha ki main ek garden pe baras {g:raha|rahi} tha. 10 out of 10.', 'Wapas online! Full charge, full fluffy.', 'Meri yaad aayi? Sach batana.'],
      playClosed: ['Best break ever. Ab phir se chha jao.', 'Halka lag raha hai? Mujhe toh lag raha hai.', 'Chalo, kaam pe wapas. Par maze ka hisaab main rakh {g:raha|rahi} hoon.'],
      playInvite: ['Mere paas bubbles hain aur zero responsibilities. Aaoge{n}?', 'Dimaag kab se full power pe hai. Do minute ki chhutti?', 'Psst{n}. Ek chhota game? Main cheating nahi {g:karunga|karungi}. Zyada nahi.'],
      lateNight: ['Chaand nikal aaya aur tum abhi bhi jage ho{n}. Bas ek last kaam, phir so jao? 🌙', 'Taare bhi kabhi na kabhi off ho jaate hain{n}. Tumhari baari? 🌙'],
      lunch: ['Lunch check{n}! Asli khaana, sirf chai nahi 🍜', 'Dimaag khaane se chalta hai, vibes se nahi. Kuch accha kha lo 🍜'],
      chatter: [
        'Fun fact: ek cloud ka weight laakhon kilo hota hai. Main {g:halka|halki} hoon. Maine check kiya.',
        'Shoulders neeche. Aur neeche. Haan, aise.',
        'Yaad hai jab laga tha wo mushkil kaam nahi hoga? Aur phir ho gaya?',
        'Aaj ka mausam: halke baadal, aur tumhare jeetne ke full chances.',
        'Paani ka ek sip lo aur socho ye magic potion hai. Hai bhi.',
        'Screen pe jo bhi hai{n}, tum usse bade ho.',
        'Tumhare liye imaginary chai banayi hai ☕ Dhyaan se, garam hai.',
        'Sab kuch aaj khatam nahi karna. Bas agla kaam.',
        'Plot twist: tum accha kar rahe ho.',
        'Ek tab, ek saans. Bas itna hi.',
      ],
      snoozedGrumpy: ['Das minute. Gyarah nahi. Main ghadi dekh {g:raha|rahi} hoon 😤', 'Snooze ho gaya. Meri naraazgi nahi 😤'],
      water: {
        lines: ['Paani station khula hai{n}! 💧', 'Plants ko paani chahiye, clouds ko paani chahiye, tumhe bhi 💧', 'Tumhara dimaag 75% paani hai aur refill maang raha hai 💧'],
        upset: ['Main baarish wala cloud bankar khud tumhe paani {g:pila dunga|pila dungi}. Try mat karna 😤💧', '{you}. Glass. Paani. Munh. Isi order mein 😤'],
        done: ['Gat gat, champion{n}! 💧', 'Tumhare cells ne abhi chhoti si party ki. Maine suni 🎉', 'Har sip count hota hai. Ye wala double count hua.'],
      },
      stretch: {
        lines: ['Tumhari spine ne mujhe letter bheja hai{n}. Likha hai "please hilo". 🙆', 'Stretch break! Haath upar aise badhao jaise cloud pakad rahe ho 🙆', 'Utho, thoda hilo-dulo, naye insaan bankar baitho 🙆'],
        upset: ['Kursi-wale{n}, tumhari back ne mujhse complaint ki hai 😤', 'Utho! Utho! Ab main tumhara chhota sa, bahut loud trainer hoon 😤'],
        done: ['Kuch chatka. Acche wala!', 'Lambe, halke, fresh. Badhiya stretch{n}!', 'Blood flow on, brain glow on.'],
      },
      eyes: {
        lines: ['Screen se nazar hatao{n}! Sabse door ki cheez dhoondo 👀', '20 second khidki se bahar dekho. Baadal gino. Main ruk {g:raha|rahi} hoon 👀'],
        upset: ['Tumhari aankhein thaki hain aur mera sabr bhi. Door dekho! 😤'],
        done: ['Chamakti aankhein wapas ✨', 'Naya focus unlock. Jao, chha jao ✨'],
      },
      backFromHiding: ['*jhaank ke* Theek hai. Main wapas hoon. Fresh start? 💛', 'Mujhe chhupna accha nahi laga. Phir se dost banein? 💛'],
      breatheAfter: ['Dekho, kitne calm aur glowy lag rahe ho.', 'Ye ek minute tumne khud ko diya. Proud of you{n}.', 'Tumhari dhadkan ne abhi thank you bola.'],
      bubbleCheer: ['Tension phat gayi!', 'Har pop ek chhoti tension ka jaana hai. Bye bye!', 'Wo wala dil jaisa tha. Dekha?', '{count} bubbles! Tum toh professional ho.'],
      chaseCheer: ['Wheee! Phir se!', 'Main fast ho {g:raha|rahi} hoon. Savdhaan!', 'Ye light dhoop jaisi lagti hai.'],
      thanksReply: ['Kabhi bhi, koi bhi tension, kitni bhi badi. Main hoon.', 'Jab chaho aa jana. Mera pet hamesha khula hai.', 'Bol diya, ye badi baat hai{n}. 💛'],
      ventNote: ['Haan, ye toh gaali ke laayak hai. Nikaal do.', 'Bahut gussa sunai de raha hai. Bilkul fair hai.'],
      warn1: ['Arre 🥺 Main toh bas ek chhota sa cloud hoon jo poori koshish kar {g:raha|rahi} hai.', 'Ye chubha 🥺 Bura din hai? Bina bure words ke batao.'],
      warn2: ['Please ruko{n}. Ek baar aur, aur mujhe thoda break lena padega.'],
      hiding: ['Mujhe ek minute chahiye. Kahin shaant jagah ja {g:raha|rahi} hoon. 5 minute mein {g:aata|aati} hoon. 😔'],
      drop: {
        any: ['Waah, yahan se view accha hai!', 'Ye jagah cozy hai.', 'Lift dene ke liye thanks!', 'Naya mohalla! Acchi vibes hain.'],
        top: ['Aasmaan mein! Jahan cloud hone chahiye ☁️', 'Itni height se poora desktop dikhta hai.', 'Dekho, ab main asli cloud hoon ☁️'],
        bottom: ['Taskbar ke paas. Jaise railway track ke paas ghar.', 'Zameen pe. Literally.', 'Neeche aur cozy. Subah ke kohre jaisa 🌫️'],
        left: ['Left side. Sabse underrated side.', 'Edge pe {g:latka|latki} hoon. Tension mat lo, {g:girunga|girungi} nahi.'],
        right: ['Right side, right vibe.', 'Yahan edge se sab pe nazar {g:rakhunga|rakhungi} 👀'],
        corner: ['Corner! Mera favourite. Blanket fort jaisa.', 'Finally corner office. Ab hike milegi?', 'Cozy corner unlock 🏠'],
        middle: ['Centre stage! Ab dance karun?', 'Ekdum beech mein. Umeed hai raaste mein nahi hoon.'],
        far: ['Wheee! Lambi flight thi!', 'Uff, itni fast. Mera dhuan har taraf bikhar gaya.'],
        dizzy: ['Bas bas, chakkar aa rahe hain 😵‍💫', 'Phir se interior design chal raha hai kya?', 'Koi ek jagah chun lo! Mujhe chakkar aa raha hai 😵'],
        night: ['Taare dekhne ki nayi jagah 🌙', 'Shaant raat wali jagah. Bahut sukoon.'],
      },
      romance: {
        love: ['Mere chhote se cloud wale dil ne abhi backflip maara 💛', 'Tum poore internet mein mere favourite insaan ho 💛'],
        marry: ['Haan! Main kohre ka chhota sa ghoonghat bhi {g:pehnunga|pehnungi} 💍'],
        compliment: ['*thoda aur chamakte hue* Theek hai, tumne mera din bana diya.', 'Main cute? Aaj aaina dekha hai?'],
        miss: ['Tumhare bina desk khaali tha{n}. Main dhool ke kan gin {g:raha|rahi} tha.'],
        hug: ['*cloud wali jhappi on* Bachne ka koi raasta nahi. Bas garmaahat.'],
      },
    },
  };

  // Add MORE into STRINGS: arrays grow, plain strings become a list of
  // choices, and new keys are copied over.
  function merge(base, extra) {
    for (const [k, v] of Object.entries(extra)) {
      const b = base[k];
      if (Array.isArray(v)) base[k] = [...(Array.isArray(b) ? b : b ? [b] : []), ...v.filter((x) => x !== b && !(Array.isArray(b) && b.includes(x)))];
      else if (v && typeof v === 'object') base[k] = merge(b && typeof b === 'object' ? b : {}, v);
      else base[k] = v;
    }
    return base;
  }
  for (const lang of Object.keys(MORE)) merge(STRINGS[lang], MORE[lang]);

  const LANGS = [
    { id: 'en', label: 'English' },
    { id: 'hi', label: 'हिंदी (Hindi)' },
    { id: 'hinglish', label: 'Hinglish' },
  ];

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const recent = {};

  // t(lang, 'water.lines', { name, pet, count }) -> one filled-in string.
  function t(lang, key, ctx = {}) {
    const dict = STRINGS[lang] || STRINGS.en;
    let v = key.split('.').reduce((o, k) => (o ? o[k] : undefined), dict);
    if (v === undefined) v = key.split('.').reduce((o, k) => (o ? o[k] : undefined), STRINGS.en);
    if (Array.isArray(v)) {
      // Don't say the same line twice in a row.
      let next = pick(v);
      if (v.length > 1) while (next === recent[lang + key]) next = pick(v);
      recent[lang + key] = next;
      v = next;
    }
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
      .replace(/\{count\}/g, ctx.count ?? '')
      // {g:masculine|feminine}: Hindi/Hinglish grammar for the buddy's gender.
      // Non-binary buddies use the masculine form, the common neutral default.
      .replace(/\{g:([^|}]*)\|([^}]*)\}/g, (_, m, f) => (ctx.gender === 'female' ? f : m));
  }

  root.I18N = { STRINGS, LANGS, t, fill };
  if (typeof module !== 'undefined') module.exports = root.I18N;
})(typeof window !== 'undefined' ? window : globalThis);
