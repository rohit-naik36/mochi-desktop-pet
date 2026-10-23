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
      words: ['मरना चाहता', 'मरना चाहती', 'जीना नहीं', 'खुदकुशी', 'ख़ुदकुशी', 'आत्महत्या', 'जान दे', 'mar jaunga', 'mar jaungi', 'jaan de dunga', 'jaan de dungi', 'zindagi khatam', 'জীবন শেষ', 'আত্মহত্যা', 'தற்கொலை', 'ఆత్మహత్య', 'ಆತ್ಮಹತ್ಯೆ', 'ആത്മഹത്യ', 'આત્મહત્યા', 'ਖੁਦਕੁਸ਼ੀ', 'ਆਤਮਹੱਤਿਆ', 'kill myself', 'killing myself', 'suicide', 'suicidal', 'end it all', 'end my life', 'want to die', 'wanna die', 'hurt myself', 'self harm', 'self-harm', 'cut myself',
        'no reason to live', "don't want to live", 'dont want to live', 'not worth living', 'better off without me', 'better off dead',
        'khudkushi', 'aatmahatya', 'atmahatya', 'marna chahta', 'marna chahti', 'jeena nahi', 'mar jaana', 'mar jana'],
      serious: true,
    },
    {
      // Someone hurt or harassed them. Comes before work/people so it isn't
      // brushed off as ordinary office stress.
      id: 'harm',
      words: ['harass', 'harassed', 'harassing', 'harassment', 'sexually', 'assault', 'assaulted', 'molest', 'molested', 'abuse', 'abused', 'abusive', 'groped', 'touched me', 'stalking', 'stalker', 'blackmail', 'blackmailing', 'rape', 'raped', 'hits me', 'hit me', 'beats me',
        'chhedkhani', 'chhed', 'chhedta', 'chhedti', 'zabardasti', 'maarta hai', 'marta hai', 'छेड़', 'छेड़छाड़', 'उत्पीड़न', 'बलात्कार', 'जबरदस्ती', 'मारता है'],
      priority: true,
      comfort: [
        "{name}, I'm so sorry. What happened is not okay, and it is not your fault. Not even a little.",
        "That's serious, and you didn't deserve it. I'm really glad you told someone, even if that someone is a little cloud.",
      ],
      steps: [
        'If you are in danger right now, call 112. The Women Helpline 181 is free and 24/7 too. At work, the Internal Committee (POSH) is there exactly for this.',
        'Write down what happened, with dates, while it\'s fresh. You don\'t have to do anything with it yet. It just keeps your options open.',
        'Tell one person you trust. You shouldn\'t have to carry this alone.',
      ],
      asks: ['Are you somewhere safe right now?', 'Want to breathe with me for a minute first?'],
    },
    {
      id: 'deadline',
      words: ['kal tak', 'aaj tak', 'time nahi', 'samay nahi', 'डेडलाइन', 'कल तक', 'समय नहीं', 'टाइम नहीं', 'देर', 'deadline', 'due', 'submit', 'submission', 'late', 'behind', 'overdue', 'by friday', 'by monday', 'tomorrow', 'tonight', 'running out of time', 'no time'],
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
      words: ['kaam', 'naukri', 'office', 'boss', 'sir', 'काम', 'नौकरी', 'ऑफिस', 'बॉस', 'मीटिंग', 'work', 'job', 'boss', 'manager', 'meeting', 'client', 'project', 'presentation', 'review', 'appraisal', 'promotion', 'fired', 'layoff', 'laid off', 'coworker', 'colleague', 'team', 'emails', 'inbox', 'workload', 'office', 'hike'],
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
      words: ['padhai', 'pariksha', 'पढ़ाई', 'परीक्षा', 'एग्ज़ाम', 'नंबर', 'रिज़ल्ट', 'exam', 'exams', 'test', 'grade', 'grades', 'marks', 'result', 'results', 'study', 'studying', 'assignment', 'homework', 'college', 'university', 'school', 'thesis', 'interview', 'placement', 'placements'],
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
      words: ['paisa', 'paise', 'paison', 'kiraya', 'udhaar', 'karza', 'पैसा', 'पैसे', 'किराया', 'उधार', 'कर्ज़', 'कर्ज', 'सैलरी', 'money', 'rent', 'bill', 'bills', 'debt', 'loan', 'emi', 'salary', 'pay', 'paid', 'broke', 'afford', 'expenses', 'savings', 'bank', 'credit card'],
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
      words: ['dost', 'ghar', 'ghar wale', 'gharwale', 'mummy', 'papa', 'maa', 'bhai', 'behen', 'jhagda', 'akela', 'akeli', 'दोस्त', 'घर', 'घरवाले', 'मम्मी', 'पापा', 'माँ', 'भाई', 'बहन', 'झगड़ा', 'अकेला', 'अकेली', 'friend', 'friends', 'partner', 'boyfriend', 'girlfriend', 'wife', 'husband', 'relationship', 'breakup', 'broke up', 'fight', 'argument', 'mom', 'dad', 'mother', 'father', 'parents', 'family', 'brother', 'sister', 'ignored', 'lonely', 'alone', 'nobody', 'no one'],
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
      words: ['neend', 'thak', 'thaka', 'thaki', 'bimar', 'dard', 'tension', 'नींद', 'थका', 'थकी', 'थकान', 'बीमार', 'दर्द', 'टेंशन', 'घबराहट', 'sick', 'ill', 'fever', 'health', 'doctor', 'hospital', 'pain', 'headache', 'tired', 'exhausted', 'sleep', 'insomnia', "can't sleep", 'cant sleep', 'burnout', 'burned out', 'burnt out', 'anxious', 'anxiety', 'panic', 'overwhelmed', 'stressed'],
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
      words: ['bekaar hoon', 'kuch nahi kar sakta', 'kuch nahi kar sakti', 'nalayak', 'बेकार हूँ', 'नालायक', 'कुछ नहीं कर सकता', 'कुछ नहीं कर सकती', 'not good enough', 'failure', 'failed', 'stupid', 'useless', 'worthless', 'imposter', 'impostor', 'behind everyone', 'hate myself', "can't do", 'cant do', 'cannot do', 'mess up', 'messed up', 'mistake', 'embarrassed', 'loser'],
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
      words: ['bhavishya', 'aage kya', 'darr', 'dar lag', 'डर', 'भविष्य', 'आगे क्या', 'future', 'what if', 'career', 'decision', 'decide', 'choice', 'uncertain', 'uncertainty', 'scared', 'afraid', 'worried', 'nervous', 'confused', 'lost'],
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
    asks: ["Got another one for me? I'm still hungry.", 'Want to breathe with me for a minute?'],
  };

  // Hindi and Hinglish versions of every topic. English lives in TOPICS above.
  const LOCAL = {
    hi: {
      harm: {
        comfort: ['{name}, मुझे बहुत अफ़सोस है। जो हुआ वो ठीक नहीं है, और इसमें तुम्हारी कोई ग़लती नहीं है। ज़रा भी नहीं।', 'ये गंभीर है, और तुम्हारे साथ ऐसा नहीं होना चाहिए था। अच्छा किया जो तुमने किसी को बताया।'],
        steps: ['अगर अभी ख़तरा है, तो 112 पर कॉल करो। महिला हेल्पलाइन 181 भी मुफ़्त और 24/7 है। ऑफ़िस में, इंटरनल कमेटी (POSH) ठीक इसी के लिए है।', 'जो हुआ उसे तारीख़ों के साथ लिख लो। अभी कुछ करना ज़रूरी नहीं, बस रास्ते खुले रहते हैं।', 'किसी एक भरोसेमंद इंसान को बताओ। ये अकेले उठाना ज़रूरी नहीं।'],
        asks: ['क्या तुम अभी सुरक्षित जगह पर हो?', 'पहले एक मिनट मेरे साथ साँस लोगे?'],
      },
      deadline: {
        comfort: ['उफ़, डेडलाइन सबसे बुरी चीज़ है, {name}। दिमाग़ में पूरी लिस्ट बार-बार घूम रही होगी ना।', 'हाँ, ये सच में प्रेशर वाली बात है। पर तुमने पहले भी ऐसे मुश्किल वाले निकाले हैं, और ये इतना भारी इसलिए लग रहा है क्योंकि तुम्हें फ़र्क पड़ता है।'],
        steps: ['सबसे छोटा हिस्सा चुनो और बस 10 मिनट उस पर काम करो। पूरा नहीं, बस एक टुकड़ा।', 'तय करो कि इस बार "काफ़ी अच्छा" कैसा दिखेगा। परफ़ेक्ट किसी और दिन।', 'अगर सच में नहीं हो पाएगा, तो अभी एक छोटा सा मैसेज भेज दो। पहले बताना हमेशा बेहतर है।'],
        asks: ['सबसे पहले कौन सा छोटा हिस्सा निपटा सकते हो?', 'शुरू करने से पहले एक बार साथ में साँस लें?'],
      },
      work: {
        comfort: ['काम की टेंशन हर जगह पीछे-पीछे आ जाती है ना, {name}? कोई हैरानी नहीं कि ये दिमाग़ में अटका है।', 'ये सच में थका देने वाला लगता है। मुश्किल लगना ठीक है, इसका मतलब ये नहीं कि तुम अपने काम में अच्छे नहीं हो।', 'सच कहूँ? ये किसी को भी परेशान कर देता। तुम ज़्यादा नहीं सोच रहे।'],
        steps: ['वो एक चीज़ लिखो जो कल को 10% आसान बना दे, और सबसे पहले बस वही करो।', 'अगले 20 मिनट के लिए फ़ालतू टैब बंद कर दो। कम चीज़ें सामने, कम शोर।', 'अगर इसमें कोई और शामिल है, तो एक छोटा सा सच्चा मैसेज अक्सर एक घंटे की चिंता से ज़्यादा मदद करता है।'],
        asks: ['काम ख़ुद भारी है या आसपास के लोग?', 'बाद में ठीक से ब्रेक लेने की याद दिलाऊँ?'],
      },
      study: {
        comfort: ['परीक्षा और ऐसी चीज़ें जो "सब तय करती हैं" बहुत टेंशन देती हैं, {name}। दिमाग़ में होना स्वाभाविक है।', 'सुनो, एक रिज़ल्ट ये तय नहीं करता कि तुम कितने काबिल हो। सच में।'],
        steps: ['एक टॉपिक चुनो, 25 मिनट पूरा ध्यान दो, फिर असली ब्रेक लो। मैं नज़र {g:रखूँगा|रखूँगी}।', 'एक कॉन्सेप्ट मुझे ज़ोर से समझाओ जैसे मैं स्टूडेंट हूँ। याद भी रहेगा, और मैं {g:अच्छा सुनने वाला|अच्छी सुनने वाली} हूँ।'],
        asks: ['कौन सा टॉपिक सबसे ज़्यादा डराता है?'],
      },
      money: {
        comfort: ['पैसों की चिंता भारी होती है, {name}, क्योंकि लगता है ये हर चीज़ को छूती है।', 'हाँ, पैसों की टेंशन सीने पर बैठ जाती है। इसकी फ़िक्र करना बेवकूफ़ी नहीं है।'],
        steps: ['वो एक नंबर लिख दो जो सबसे ज़्यादा डराता है। साफ़ देखना अक्सर धुंधले डर से कम डरावना होता है।', 'इस हफ़्ते के लिए एक छोटा सा काम चुनो: एक कॉल, एक ईमेल, या एक बिल चेक करना। बस एक।'],
        asks: ['ये इस महीने की बात है या लंबे समय की?'],
      },
      people: {
        comfort: ['जिनसे प्यार करते हैं, उनसे जुड़ी बातें सबसे ज़्यादा चुभती हैं, {name}। इसका मन में रहना ठीक है।', 'अकेला महसूस करना बहुत मुश्किल है। मैं यहीं हूँ, कहीं नहीं जा {g:रहा|रही}।'],
        steps: ['जो कहना चाहते हो, पहले लिख के देखो। भेजना ज़रूरी नहीं।', 'किसी एक इंसान के बारे में सोचो जिससे मन हल्का होता है, और उसे एक छोटा सा हाय भेज दो।'],
        asks: ['उनसे बात करना चाहोगे, या बस यहाँ मन हल्का करना है?'],
      },
      health: {
        comfort: ['सुनो {name}, ख़ाली टंकी पर चलना हर चीज़ मुश्किल बना देता है। परेशान होना स्वाभाविक है।', 'इतना थकना या बेचैन होना असली है, कमज़ोरी नहीं। आज ख़ुद के साथ थोड़ा नरम रहना, ठीक है?'],
        steps: ['एक गिलास पानी पियो और कंधे ढीले छोड़ो। छोटा है, पर मदद करता है।', 'मेरे साथ 5-4-3-2-1 करो: 5 चीज़ें देखो, 4 छुओ, 3 सुनो, 2 सूँघो, 1 चखो।', 'अगर ये काफ़ी समय से चल रहा है, तो डॉक्टर से बात ज़रूर करना। तुम्हें सही मदद मिलनी चाहिए।'],
        asks: ['आख़िरी बार असली ब्रेक कब लिया था?', 'एक मिनट मेरे साथ साँस लोगे?'],
      },
      self: {
        comfort: ['सुनो। तुम्हारे दिमाग़ की वो आवाज़ तुम्हारे साथ बहुत बुरा बर्ताव कर रही है, {name}। तुम किसी दोस्त से ऐसे बात कभी नहीं करते।', 'ग़लतियाँ करना बस ये दिखाता है कि तुम कोशिश कर रहे हो। इससे तुम कम नहीं हो जाते।'],
        steps: ['इस हफ़्ते की एक चीज़ लिखो जो तुमने अच्छे से संभाली। छोटी भी चलेगी।', 'सोचो अगर कोई दोस्त यही कहता तो तुम उसे क्या कहते, और फिर वही ख़ुद से कहो।'],
        asks: ['अगर मैं अपने बारे में ऐसा {g:कहता|कहती}, तो तुम मुझे क्या कहते?'],
      },
      future: {
        comfort: ['आगे क्या होगा ये न जानना सबसे मुश्किल एहसासों में से है, {name}। पूरा भविष्य आज ही नहीं सुलझाना है।', 'सब कुछ तय न होना ठीक है। सच में किसी के पास पूरा नक्शा नहीं होता।'],
        steps: ['दो लिस्ट बनाओ: जो तुम्हारे हाथ में है और जो नहीं। आज रात दूसरी वाली को जाने दो।', 'बस अगला एक कदम तय करो। बाक़ी आगे वाला तुम देख लेगा।'],
        asks: ['अभी सबसे डरावना "अगर ऐसा हुआ तो" क्या है?'],
      },
      general: {
        comfort: ['ये काफ़ी समय से मन पर था ना, {name}? मुझे देने के लिए शुक्रिया।', 'छोटी हो या बड़ी, अगर परेशान कर रही है तो मायने रखती है। अच्छा किया जो बोल दिया।', 'तुम जितना दिखता है उससे ज़्यादा उठा रहे हो। ऐसा महसूस करना बिल्कुल ठीक है।'],
        steps: ['मेरे साथ एक धीमी साँस लो और आज इसके लिए सबसे छोटा कदम चुनो।', 'इसे कहीं लिख लो और ख़ुद को इजाज़त दो कि बाद में देखोगे। ये कहीं नहीं भागेगी।'],
        asks: ['एक और है मेरे लिए? मुझे अभी भी भूख है।', 'एक मिनट मेरे साथ साँस लोगे?'],
      },
      openers: ['*नम नम*', '*गप*', '*कुरकुर*', '*चप चप*'],
      reflects: ['"{q}"... गायब। मैंने खा लिया।', 'ठीक है, "{q}" अब मेरे पेट में है।', '"{q}"? अगले कुछ मिनट ये तुम्हारी नहीं, मेरी टेंशन है।'],
      heavy: 'अरे, ये तो बहुत ज़्यादा लग रहा है। ',
      crisis: {
        reflect: '{name}, मुझे सच में बहुत अच्छा लगा कि तुमने मुझे बताया।',
        comfort: 'मुझे तुम्हारी परवाह है, और मैं नहीं {g:चाहता|चाहती} कि तुम ये अकेले झेलो। प्लीज़ अभी किसी से बात करो। ये मुफ़्त और गोपनीय हैं, और ठीक इसी के लिए हैं:',
        step: 'अगर लगे कि तुम कुछ कर बैठोगे, तो 112 पर कॉल करो या नज़दीकी अस्पताल जाओ। और हो सके तो पास में किसी को बताओ कि तुम कैसा महसूस कर रहे हो।',
        ask: 'मैं यहीं तुम्हारे साथ हूँ।',
      },
      otherLang: 'मैं अभी ये भाषा सीख {g:रहा|रही} हूँ, पर मैं सुन {g:रहा|रही} हूँ। ',
    },
    hinglish: {
      harm: {
        comfort: ['{name}, mujhe bahut afsos hai. Jo hua wo theek nahi hai, aur isme tumhari koi galti nahi hai. Zara bhi nahi.', 'Ye serious hai, aur tumhare saath aisa nahi hona chahiye tha. Accha kiya jo tumne kisi ko bataya.'],
        steps: ['Agar abhi khatra hai, toh 112 pe call karo. Women Helpline 181 bhi free aur 24/7 hai. Office mein, Internal Committee (POSH) bilkul isi ke liye hai.', 'Jo hua use dates ke saath likh lo. Abhi kuch karna zaroori nahi, bas options khule rehte hain.', 'Kisi ek trusted insaan ko batao. Ye akele uthana zaroori nahi.'],
        asks: ['Kya tum abhi safe jagah pe ho?', 'Pehle ek minute mere saath saans loge?'],
      },
      deadline: {
        comfort: ['Uff, deadlines sabse bekaar cheez hai, {name}. Dimaag mein poori list baar baar ghoom rahi hogi na.', 'Haan, ye sach mein pressure wali baat hai. Par tumne pehle bhi aise tight wale nikaale hain, aur ye itna heavy isliye lag raha kyunki tumhe farak padta hai.'],
        steps: ['Sabse chhota part chuno aur bas 10 minute uspe kaam karo. Poora nahi, bas ek tukda.', 'Decide karo ki is baar "good enough" kaisa dikhega. Perfect kisi aur din.', 'Agar sach mein nahi ho payega, toh abhi ek chhota sa heads-up bhej do. Pehle batana hamesha better hai.'],
        asks: ['Sabse pehle kaunsa chhota part nipta sakte ho?', 'Start karne se pehle ek baar saath mein saans lein?'],
      },
      work: {
        comfort: ['Kaam ki tension har jagah peeche peeche aa jaati hai na, {name}? Koi surprise nahi ki dimaag mein atka hai.', 'Ye sach mein draining lagta hai. Mushkil lagna theek hai, iska matlab ye nahi ki tum apne kaam mein acche nahi ho.', 'Sach bolun? Ye kisi ko bhi pareshaan kar deta. Tum overthink nahi kar rahe.'],
        steps: ['Wo ek cheez likho jo kal ko 10% easy bana de, aur sabse pehle bas wahi karo.', 'Agle 20 minute ke liye faltu tabs band kar do. Kam cheezein saamne, kam shor.', 'Agar isme koi aur involved hai, toh ek chhota honest message aksar ek ghante ki tension se zyada help karta hai.'],
        asks: ['Kaam khud heavy hai ya aas paas ke log?', 'Baad mein proper break lene ka reminder doon?'],
      },
      study: {
        comfort: ['Exams aur aisi cheezein jo "sab decide karti hain" bahut tension deti hain, {name}. Dimaag mein hona normal hai.', 'Suno, ek result ye decide nahi karta ki tum kitne capable ho. Seriously.'],
        steps: ['Ek topic chuno, 25 minute full focus, phir asli break. Main nazar {g:rakhunga|rakhungi}.', 'Ek concept mujhe zor se samjhao jaise main student hoon. Yaad bhi rahega, aur main accha listener hoon.'],
        asks: ['Kaunsa topic sabse zyada darata hai?'],
      },
      money: {
        comfort: ['Paison ki tension heavy hoti hai, {name}, kyunki lagta hai ye har cheez ko touch karti hai.', 'Haan yaar, paison ka stress seene pe baith jaata hai. Iski fikar karna bewakoofi nahi hai.'],
        steps: ['Wo ek number likh do jo sabse zyada darata hai. Saaf dekhna aksar dhundhle darr se kam scary hota hai.', 'Is hafte ke liye ek chhota kaam chuno: ek call, ek email, ya ek bill check karna. Bas ek.'],
        asks: ['Ye is mahine ki baat hai ya long term ki?'],
      },
      people: {
        comfort: ['Jinse pyaar karte hain unse judi baatein sabse zyada chubhti hain, {name}. Iska mann mein rehna theek hai.', 'Akela feel karna bahut mushkil hai. Main yahin hoon, kahin nahi ja {g:raha|rahi}.'],
        steps: ['Jo kehna chahte ho, pehle likh ke dekho. Bhejna zaroori nahi.', 'Kisi ek insaan ke baare mein socho jisse mann halka hota hai, aur usse ek chhota sa hi bhej do. Ek meme bhi chalega.'],
        asks: ['Unse baat karna chahoge, ya bas yahan mann halka karna hai?'],
      },
      health: {
        comfort: ['Suno {name}, khaali tanki pe chalna har cheez mushkil bana deta hai. Pareshaan hona normal hai.', 'Itna thakna ya bechain hona real hai, kamzori nahi. Aaj khud ke saath thoda soft rehna, okay?'],
        steps: ['Ek glass paani piyo aur shoulders dheele chhodo. Chhota hai, par help karta hai.', 'Mere saath 5-4-3-2-1 karo: 5 cheezein dekho, 4 chhuo, 3 suno, 2 sungho, 1 chakho.', 'Agar ye kaafi time se chal raha hai, toh doctor se baat zaroor karna. Tumhe sahi support milna chahiye.'],
        asks: ['Last time proper break kab liya tha?', 'Ek minute mere saath saans loge?'],
      },
      self: {
        comfort: ['Suno. Tumhare dimaag ki wo awaaz tumhare saath bahut bura behave kar rahi hai, {name}. Tum kisi dost se aise kabhi baat nahi karte.', 'Galtiyan karna bas ye dikhata hai ki tum try kar rahe ho. Isse tum kam nahi ho jaate.'],
        steps: ['Is hafte ki ek cheez likho jo tumne acche se handle ki. Chhoti bhi chalegi.', 'Socho agar koi dost yahi kehta toh tum use kya kehte, aur phir wahi khud se kaho.'],
        asks: ['Agar main apne baare mein aisa {g:kehta|kehti}, toh tum mujhe kya kehte?'],
      },
      future: {
        comfort: ['Aage kya hoga ye na jaanna sabse mushkil feelings mein se hai, {name}. Poora future aaj hi solve nahi karna.', 'Sab kuch figure out na hona theek hai. Sach mein kisi ke paas poora map nahi hota.'],
        steps: ['Do list banao: jo tumhare haath mein hai aur jo nahi. Aaj raat doosri wali ko jaane do.', 'Bas agla ek step decide karo. Baaki aage wala tum dekh lega.'],
        asks: ['Abhi sabse scary "agar aisa hua toh" kya hai?'],
      },
      general: {
        comfort: ['Ye kaafi time se mann pe tha na, {name}? Mujhe dene ke liye thanks.', 'Chhoti ho ya badi, agar pareshaan kar rahi hai toh matter karti hai. Accha kiya jo bol diya.', 'Tum jitna dikhta hai usse zyada utha rahe ho. Aisa feel karna bilkul theek hai.'],
        steps: ['Mere saath ek slow saans lo aur aaj iske liye sabse chhota step chuno.', 'Ise kahin likh lo aur khud ko permission do ki baad mein dekhoge. Ye kahin nahi bhaagegi.'],
        asks: ['Ek aur hai mere liye? Mujhe abhi bhi bhookh hai.', 'Ek minute mere saath saans loge?'],
      },
      openers: ['*nom nom*', '*gulp*', '*kurkur*', '*chomp*'],
      reflects: ['"{q}"... gayab. Maine kha liya.', 'Theek hai, "{q}" ab mere pet mein hai.', '"{q}"? Agle kuch minute ye tumhari nahi, meri tension hai.'],
      heavy: 'Arre, ye toh bahut zyada lag raha hai. ',
      crisis: {
        reflect: '{name}, mujhe sach mein bahut accha laga ki tumne mujhe bataya.',
        comfort: 'Mujhe tumhari parwah hai, aur main nahi {g:chahta|chahti} ki tum ye akele jhelo. Please abhi kisi se baat karo. Ye free aur confidential hain, aur bilkul isi ke liye hain:',
        step: 'Agar lage ki tum kuch kar baithoge, toh 112 pe call karo ya nazdeeki hospital jao. Aur ho sake toh paas mein kisi ko batao ki tum kaisa feel kar rahe ho.',
        ask: 'Main yahin tumhare saath hoon.',
      },
      otherLang: 'Main abhi ye language seekh {g:raha|rahi} hoon, par main sun {g:raha|rahi} hoon. ',
    },
  };

  const OPENERS = ['*munch munch*', '*gulp*', '*crunch crunch*', '*nom nom*', '*chomp*'];
  const REFLECTS = [
    '"{q}"... gone. I ate it.',
    'Okay, "{q}" is officially in my tummy now.',
    '"{q}"? Not your problem for the next few minutes. It\'s mine now.',
  ];
  const EN_CRISIS = {
    reflect: "{name}, I'm really, really glad you told me.",
    comfort: "I care about you, and I don't want you to go through this alone. Please talk to someone right now. These are free and confidential, and they're there for exactly this:",
    step: 'If you feel like you might act on it, call 112 or go to the nearest hospital. And if you can, tell someone near you how you feel.',
    ask: "I'll stay right here with you.",
  };
  const FALLBACK_NAME = { en: 'friend', hi: 'दोस्त', hinglish: 'dost' };


  // Extra replies for every topic, so feeding Mochi never feels repetitive.
  const MORE = {
    en: {
      deadline: {
        comfort: [
          "Deadlines are just dates someone typed into a calendar, {name}. You're a whole person. You'll outlast this one.",
          "The panic is loud, but it's not in charge. You are. And you've got more time than the panic says.",
        ],
        steps: ["Set a 25-minute timer and only work on the part that scares you least. Momentum first, bravery later.", "Write the three things that actually HAVE to be done. Cross off anything that's just 'nice to have'."],
        asks: ['Is it the amount of work, or not knowing where to start?', "What would 'done for today' look like?"],
      },
      work: {
        comfort: ["You give that job a lot of yourself, {name}. Make sure you're keeping some for you too.", "Some days work feels like pushing a cloud uphill. Trust me, I'd know. It's not you, it's the hill."],
        steps: ["Pick the one task you've been avoiding and just open it. Opening counts. Then close your eyes for five seconds.", 'Step away from the desk for 3 minutes. Literally walk. Problems shrink a little when you come back.'],
        asks: ['If a friend told you this about their job, what would you tell them?'],
      },
      study: {
        comfort: ["Your brain isn't a hard drive, {name}. It's allowed to need breaks to save things.", "Studying is just future-you collecting tiny gifts from present-you. And you're doing it."],
        steps: ['Explain one topic out loud to me in under a minute. Whatever you can explain, you know.', 'Do a practice question you can definitely get right first. Warm-up wins count.'],
        asks: ['How long have you been studying without a real break?'],
      },
      money: {
        comfort: ["Money stress makes everything feel urgent, {name}. But one step at a time still gets you there.", "Your worth isn't your bank balance. Not even a little bit."],
        steps: ["Open your banking app, look at the real number, then close it. Facing it is half the battle.", 'Pick one small expense you can pause this month. Little leaks matter.'],
        asks: ['Is there someone you trust you could talk this through with?'],
      },
      people: {
        comfort: ["People can be complicated, {name}. Caring about them is what makes it hurt, and that's a good thing about you.", "You can't control how they act. But you get to decide how much space they get in your head today."],
        steps: ["Write the message you wish you could send, then sleep on it before sending anything.", 'Do one kind thing for yourself tonight. Exactly what you would do for a friend going through this.'],
        asks: ['What do you need from them that you\'re not getting?'],
      },
      health: {
        comfort: ["Your body has been carrying you through all of this, {name}. It's okay if it's asking for a break.", "Rest isn't lazy. Rest is maintenance. Even clouds need to drift sometimes."],
        steps: ['Breathe in for 4, hold for 4, out for 6. Three times. I\'ll do it with you.', 'Close your eyes for 60 seconds. No phone, no screen. Just dark and quiet.'],
        asks: ['When did you last sleep properly?'],
      },
      self: {
        comfort: ["Imagine I said that about myself. You'd hug me and tell me to stop. Let me do the same for you, {name}.", "You're judging your behind-the-scenes against everyone else's highlight reel. That's not a fair fight."],
        steps: ['Write down one compliment someone gave you that you secretly kept. Read it twice.', 'Swap "I should have" for "next time I\'ll try". Same lesson, way less weight.'],
        asks: ['What would you say if your best friend felt this way about themselves?'],
      },
      future: {
        comfort: ["The future is a fog, {name}. And hey, I'm basically fog. It's not as scary up close.", "You've survived every single hard day so far. That's a 100% record."],
        steps: ['Write the worst case, the best case, and the most likely case. The most likely one is usually pretty okay.', 'Do one thing today that future-you will thank you for. Even something tiny.'],
        asks: ['What part of the future do you actually get to shape this week?'],
      },
      general: {
        comfort: ["You don't have to have it all figured out, {name}. You just have to get through today, and you're doing it.", "That sounds heavy. Thanks for handing a bit of it to me. I've got room."],
        steps: ['Put on one song you love and do nothing else for its whole length.', 'Write it down in one sentence. Problems in one sentence look smaller than problems in your head.'],
        asks: ['Is this a today-worry or a someday-worry?'],
      },
      openers: ['*slurp*', '*om nom nom*', '*crunch*', '*gobble gobble*', '*chews thoughtfully*'],
      reflects: ['"{q}"? Delicious. Spicy, but delicious.', 'Mmm, "{q}". Tastes like stress. Gone now.', 'I took "{q}" off your plate. Literally. Into my tummy.', '"{q}"... chewed, swallowed, filed under "not your problem right now".'],
    },
    hi: {
      deadline: { comfort: ['डेडलाइन बस कैलेंडर की एक तारीख़ है, {name}। तुम पूरे इंसान हो। तुम इससे आगे निकल जाओगे।'], steps: ['25 मिनट का टाइमर लगाओ और सबसे कम डरावने हिस्से पर काम करो। पहले रफ़्तार, हिम्मत बाद में।'], asks: ['काम ज़्यादा है, या समझ नहीं आ रहा कहाँ से शुरू करें?'] },
      work: { comfort: ['तुम इस काम को अपना बहुत कुछ देते हो, {name}। थोड़ा अपने लिए भी बचा के रखना।'], steps: ['3 मिनट के लिए डेस्क से उठ जाओ। सच में चलो। वापस आओगे तो मुश्किल थोड़ी छोटी लगेगी।'], asks: ['अगर दोस्त अपने काम के बारे में ये कहता, तो तुम उसे क्या कहते?'] },
      study: { comfort: ['तुम्हारा दिमाग़ हार्ड ड्राइव नहीं है, {name}। उसे भी सेव करने के लिए ब्रेक चाहिए।'], steps: ['एक टॉपिक मुझे एक मिनट में समझाओ। जो समझा सको, वो आता है।'], asks: ['कब से बिना ब्रेक के पढ़ रहे हो?'] },
      money: { comfort: ['तुम्हारी क़ीमत तुम्हारे बैंक बैलेंस से नहीं है। ज़रा भी नहीं।'], steps: ['इस महीने एक छोटा ख़र्चा चुनो जिसे रोक सकते हो। छोटे रिसाव मायने रखते हैं।'], asks: ['कोई भरोसेमंद है जिससे इस बारे में बात कर सको?'] },
      people: { comfort: ['लोग उलझे हुए होते हैं, {name}। तुम्हें फ़र्क पड़ता है, इसीलिए दुखता है, और ये तुम्हारी अच्छी बात है।'], steps: ['जो मैसेज भेजना चाहते हो वो लिखो, और भेजने से पहले एक रात सो जाओ।'], asks: ['उनसे तुम्हें क्या चाहिए जो मिल नहीं रहा?'] },
      health: { comfort: ['आराम आलस नहीं है। आराम देखभाल है। बादलों को भी कभी-कभी बहना पड़ता है।'], steps: ['4 गिनती साँस अंदर, 4 रोको, 6 में बाहर। तीन बार। मैं साथ हूँ।'], asks: ['आख़िरी बार ठीक से कब सोए थे?'] },
      self: { comfort: ['तुम अपने पर्दे के पीछे की ज़िंदगी को दूसरों की हाइलाइट रील से तौल रहे हो। ये बराबर की लड़ाई नहीं है।'], steps: ['"मुझे करना चाहिए था" को "अगली बार कोशिश करूँगा" से बदलो। वही सीख, बहुत कम बोझ।'], asks: ['अगर तुम्हारा सबसे अच्छा दोस्त ख़ुद के बारे में ऐसा सोचता, तो तुम क्या कहते?'] },
      future: { comfort: ['भविष्य एक कोहरा है, {name}। और मैं तो ख़ुद कोहरा हूँ। पास से इतना डरावना नहीं।', 'तुम अब तक हर मुश्किल दिन से निकले हो। सौ प्रतिशत रिकॉर्ड।'], steps: ['सबसे बुरा, सबसे अच्छा और सबसे मुमकिन नतीजा लिखो। सबसे मुमकिन वाला अक्सर ठीक-ठाक होता है।'], asks: ['इस हफ़्ते भविष्य का कौन सा हिस्सा तुम्हारे हाथ में है?'] },
      general: { comfort: ['सब कुछ आज ही सुलझाना ज़रूरी नहीं, {name}। बस आज निकालना है, और तुम निकाल रहे हो।'], steps: ['अपना पसंदीदा एक गाना लगाओ और उसके ख़त्म होने तक कुछ मत करो।'], asks: ['ये आज की चिंता है या किसी दिन की?'] },
      openers: ['*सुड़प*', '*गटक*', '*चबा-चबा के*'],
      reflects: ['"{q}"? स्वादिष्ट। तीखा, पर स्वादिष्ट।', 'म्म्म, "{q}"। टेंशन जैसा स्वाद। अब गायब।', '"{q}" तुम्हारी प्लेट से हटा दिया। सीधा मेरे पेट में।'],
    },
    hinglish: {
      deadline: { comfort: ['Deadline bas calendar ki ek date hai, {name}. Tum poore insaan ho. Tum isse aage nikal jaoge.'], steps: ['25 minute ka timer lagao aur sabse kam scary part pe kaam karo. Pehle momentum, himmat baad mein.'], asks: ['Kaam zyada hai, ya samajh nahi aa raha kahan se shuru karein?'] },
      work: { comfort: ['Tum is kaam ko apna bahut kuch dete ho, {name}. Thoda apne liye bhi bacha ke rakhna.'], steps: ['3 minute ke liye desk se uth jao. Sach mein chalo. Wapas aaoge toh problem thodi chhoti lagegi.'], asks: ['Agar dost apne kaam ke baare mein ye kehta, toh tum use kya kehte?'] },
      study: { comfort: ['Tumhara dimaag hard drive nahi hai, {name}. Use bhi save karne ke liye break chahiye.'], steps: ['Ek topic mujhe ek minute mein samjhao. Jo samjha sako, wo aata hai.'], asks: ['Kab se bina break ke padh rahe ho?'] },
      money: { comfort: ['Tumhari value tumhare bank balance se nahi hai. Zara bhi nahi.'], steps: ['Is mahine ek chhota kharcha chuno jo rok sakte ho. Chhote leaks matter karte hain.'], asks: ['Koi trusted hai jisse is baare mein baat kar sako?'] },
      people: { comfort: ['Log complicated hote hain, {name}. Tumhe farak padta hai, isliye dukhta hai, aur ye tumhari acchi baat hai.'], steps: ['Jo message bhejna chahte ho wo likho, aur bhejne se pehle ek raat so jao.'], asks: ['Unse tumhe kya chahiye jo mil nahi raha?'] },
      health: { comfort: ['Aaram aalas nahi hai. Aaram maintenance hai. Clouds ko bhi kabhi kabhi behna padta hai.'], steps: ['4 count saans andar, 4 roko, 6 mein bahar. Teen baar. Main saath hoon.'], asks: ['Last time theek se kab soye the?'] },
      self: { comfort: ['Tum apni behind-the-scenes life ko doosron ki highlight reel se compare kar rahe ho. Ye fair fight nahi hai.'], steps: ['"Mujhe karna chahiye tha" ko "agli baar try karunga" se badlo. Wahi seekh, bahut kam bojh.'], asks: ['Agar tumhara best friend khud ke baare mein aisa sochta, toh tum kya kehte?'] },
      future: { comfort: ['Future ek kohra hai, {name}. Aur main toh khud kohra hoon. Paas se itna scary nahi.', 'Tum ab tak har mushkil din se nikle ho. 100% record.'], steps: ['Worst case, best case aur most likely case likho. Most likely wala aksar theek-thaak hota hai.'], asks: ['Is hafte future ka kaunsa part tumhare haath mein hai?'] },
      general: { comfort: ['Sab kuch aaj hi solve karna zaroori nahi, {name}. Bas aaj nikalna hai, aur tum nikal rahe ho.'], steps: ['Apna favourite ek gaana lagao aur uske khatam hone tak kuch mat karo.'], asks: ['Ye aaj ki tension hai ya kisi din ki?'] },
      openers: ['*slurp*', '*gatak*', '*chaba chaba ke*'],
      reflects: ['"{q}"? Tasty. Teekha, par tasty.', 'Mmm, "{q}". Tension jaisa taste. Ab gayab.', '"{q}" tumhari plate se hata diya. Seedha mere pet mein.'],
    },
  };
  for (const t of TOPICS) if (MORE.en[t.id]) for (const k of ['comfort', 'steps', 'asks']) t[k] = [...t[k], ...MORE.en[t.id][k]];
  for (const k of ['comfort', 'steps', 'asks']) GENERAL[k] = [...GENERAL[k], ...MORE.en.general[k]];
  for (const lang of ['hi', 'hinglish']) {
    for (const [id, extra] of Object.entries(MORE[lang])) {
      if (Array.isArray(extra)) LOCAL[lang][id] = [...LOCAL[lang][id], ...extra];
      else for (const k of ['comfort', 'steps', 'asks']) LOCAL[lang][id][k] = [...LOCAL[lang][id][k], ...extra[k]];
    }
  }

  function shorten(text) {
    const t = text.trim().replace(/\s+/g, ' ').replace(/[.!?।]+$/, '');
    return t.length > 60 ? t.slice(0, 57).trimEnd() + '...' : t;
  }

  function classify(text) {
    const t = ' ' + text.toLowerCase().replace(/[’']/g, "'") + ' ';
    let best = null;
    let bestScore = 0;
    for (const topic of TOPICS) {
      let score = 0;
      for (const w of topic.words) {
        const hit = w.includes(' ') || /[^\x00-\x7F]/.test(w)
          ? t.includes(w)
          : new RegExp(`[^a-z]${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^a-z]`).test(t);
        if (hit) score += w.includes(' ') ? 2 : 1;
      }
      if ((topic.serious || topic.priority) && score > 0) return topic; // safety always wins
      if (score > bestScore) { best = topic; bestScore = score; }
    }
    return best;
  }

  function intensity(text) {
    let n = 0;
    if (/!{2,}/.test(text)) n++;
    if (/\b(so|really|very|too|extremely|always|never|everything|nothing|can't|cant|bahut|bohot)\b/i.test(text) || /बहुत|हमेशा|कभी नहीं|सब कुछ/.test(text)) n++;
    if (text.length > 120) n++;
    if (text === text.toUpperCase() && /[A-Z]{4,}/.test(text)) n++;
    return n;
  }

  // Which language is this worry written in?
  const HINGLISH = ['hai', 'hain', 'nahi', 'nahin', 'mujhe', 'mera', 'meri', 'mere', 'kya', 'yaar', 'bahut', 'bohot', 'kaise', 'kyun', 'kyu', 'karna', 'kar', 'raha', 'rahi', 'ho', 'hoon', 'hu', 'tha', 'thi', 'aur', 'lekin', 'par', 'bhi', 'kuch', 'sab', 'ye', 'wo', 'koi', 'ghar', 'kaam', 'dimaag', 'pareshan', 'tension', 'abhi', 'main', 'mai', 'ne', 'mein', 'me', 'aaj', 'se', 'ko', 'ka', 'ki', 'ke', 'diya', 'gaya', 'gayi', 'kal', 'bhai', 'accha', 'theek', 'chahta', 'chahti', 'lag', 'lagta', 'lagti', 'hoga', 'karu', 'karun', 'samajh', 'toh', 'na', 'tu', 'tum', 'tera', 'teri', 'tujhe', 'tumhe', 'hu', 'yeh', 'woh'];
  const ENGLISH = ['i', 'my', 'the', 'is', 'am', 'are', 'was', 'and', 'at', 'to', 'of', 'it', 'this', 'that', 'with', 'have', 'feel', 'what', 'why', 'you', 'your', 'can', 'not', 'so', 'just', 'about', 'me', 'scared', 'scares', 'worried', 'tired', 'sad', 'stressed', 'anxious', 'exam', 'future', 'life', 'today', 'tomorrow', 'love', 'miss', 'hug'];
  function detectLang(text, fallback = 'en') {
    if (/[ऀ-ॿ]/.test(text)) return 'hi';
    if (/[ঀ-෿਀-੿]/.test(text)) return 'other';
    const words = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
    const hits = words.filter((w) => HINGLISH.includes(w)).length;
    const english = words.filter((w) => ENGLISH.includes(w)).length;
    if (english > hits) return 'en';
    if (hits >= 2 || (hits === 1 && (words.length <= 4 || fallback !== 'en'))) return 'hinglish';
    return fallback === 'hinglish' && words.length <= 3 ? 'hinglish' : 'en';
  }

  function respond(text, name, prefLang = 'en', gender = null) {
    const detected = detectLang(text, prefLang);
    const otherScript = detected === 'other';
    const lang = otherScript ? prefLang : detected;
    const who = (name || '').trim() || FALLBACK_NAME[lang] || 'friend';
    // {g:masculine|feminine} picks the buddy's grammar; non-binary uses the masculine default.
    const fill = (str) => str.replace(/\{g:([^|}]*)\|([^}]*)\}/g, (_, m, f) => (gender === 'female' ? f : m)).replace(/\{name\}/g, who);
    const topic = classify(text);
    const L = LOCAL[lang];
    if (topic && topic.serious) {
      const c = L ? L.crisis : EN_CRISIS;
      return { topic: 'crisis', lang, serious: true, opener: '', reflect: fill(c.reflect), comfort: fill(c.comfort), helplines: HELPLINES_IN, step: fill(c.step), ask: fill(c.ask), followups: ['breathe', 'thanks'] };
    }
    const id = topic ? topic.id : 'general';
    const src = L ? L[id] : (topic || GENERAL);
    const heavy = intensity(text) >= 2;
    // Someone was hurt: no munching or jokes, just believe them and point to help.
    if (id === 'harm') {
      const thanks = { en: 'Thank you for telling me, {name}. I believe you.', hi: 'मुझे बताने के लिए शुक्रिया, {name}। मुझे तुम पर भरोसा है।', hinglish: 'Mujhe batane ke liye thank you, {name}. Mujhe tum pe bharosa hai.' };
      return { topic: id, lang, gentle: true, opener: '', reflect: fill(thanks[lang] || thanks.en), comfort: fill(pick(src.comfort)), step: fill(src.steps[0]), ask: fill(pick(src.asks)), followups: ['breathe', 'thanks'] };
    }
    const heavyLead = L ? L.heavy : 'Okay, that sounds like a LOT. ';
    const prefix = otherScript ? (L ? L.otherLang : "I'm still learning that language, but I'm listening. ") : '';
    return {
      topic: id,
      lang,
      opener: pick(L ? L.openers : [...OPENERS, ...MORE.en.openers]),
      reflect: pick(L ? L.reflects : [...REFLECTS, ...MORE.en.reflects]).replace('{q}', shorten(text)),
      comfort: fill(prefix) + fill((heavy ? heavyLead : '') + pick(src.comfort)),
      step: fill(pick(src.steps)),
      ask: fill(pick(src.asks)),
      followups: heavy ? ['breathe', 'another', 'thanks'] : ['another', 'breathe', 'thanks'],
    };
  }

  root.WorryEater = { respond, classify, detectLang, HELPLINES_IN };
  if (typeof module !== 'undefined') module.exports = root.WorryEater;
})(typeof window !== 'undefined' ? window : globalThis);
