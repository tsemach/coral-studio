export interface Dictionary {
  header: {
    navAbout: string
    navWorkshops: string
    navCommunity: string
    navScripts: string
    navContact: string
    login: string
    toggleMenu: string
    menu: string
  }
  userMenu: {
    accountMenu: string
    settings: string
    logout: string
  }
  languageToggle: {
    switchTo: string
  }
  hero: {
    eyebrow: string
    title: string
    body: string
    ctaClasses: string
    ctaTeacher: string
    tagline: string
  }
  about: {
    eyebrow: string
    title: string
    intro: string
    body1: string
    body2: string
    body3: string
    quote: string
  }
  disciplines: {
    eyebrow: string
    title: string
    body: string
    items: { title: string; body: string }[]
  }
  approach: {
    eyebrow: string
    title: string
    body: string
    hagenTitle: string
    hagenBody: string
    meisnerTitle: string
    meisnerBody: string
    closing: string
  }
  classes: {
    eyebrow: string
    title: string
    body1: string
    tagline: string
    body2: string
    infoTitle: string
    detailLabels: {
      day: string
      time: string
      break: string
      frequency: string
      monthlyFee: string
      language: string
      age: string
      location: string
    }
    detailValues: {
      day: string
      time: string
      break: string
      frequency: string
      monthlyFee: string
      language: string
      age: string
      location: string
    }
    footnote: string
  }
  workshop: {
    eyebrow: string
    title: string
    body1: string
    body2: string
    quote: string
    instagram: string
  }
  teacher: {
    eyebrow: string
    name: string
    role: string
    body1: string
    body2: string
    creditsLabel: string
    credits: { work: string; note: string }[]
  }
  community: {
    eyebrow: string
    title: string
    body1: string
    body2: string
    tagline: string
  }
  faq: {
    eyebrow: string
    title: string
    items: { q: string; a: string }[]
  }
  finalCta: {
    eyebrow: string
    title: string
    body: string
    ctaClasses: string
    ctaLogin: string
    footerTagline: string
    instagram: string
  }
  login: {
    metaTitle: string
    backToSite: string
    title: string
    subtitle: string
    emailLabel: string
    passwordLabel: string
    submit: string
    submitLoading: string
    newToStudio: string
    createAccount: string
    oauthPendingError: string
    invalidCredentialsError: string
  }
  register: {
    metaTitle: string
    backToSite: string
    title: string
    subtitle: string
    nameLabel: string
    emailLabel: string
    passwordLabel: string
    confirmPasswordLabel: string
    submit: string
    submitLoading: string
    alreadyHaveAccount: string
    logIn: string
    invalidEmailError: string
    invalidPasswordError: string
    passwordMismatchError: string
    registrationFailedError: string
    genericError: string
    checkEmailPrefix: string
    checkEmailSuffix: string
  }
  oauth: {
    orContinueWith: string
    google: string
    facebook: string
  }
  verifyEmail: {
    metaTitle: string
    missingParamsError: string
    confirmedTitle: string
    confirmedBody: string
    failedTitle: string
    invalidError: string
    expiredError: string
    backToSite: string
  }
}

export const en: Dictionary = {
  header: {
    navAbout: 'About',
    navWorkshops: 'Workshops',
    navCommunity: 'Communities',
    navScripts: 'Scripts',
    navContact: 'Contact',
    login: 'Log in',
    toggleMenu: 'Toggle menu',
    menu: 'Menu',
  },
  userMenu: {
    accountMenu: 'Account menu',
    settings: 'Settings',
    logout: 'Log out',
  },
  languageToggle: {
    switchTo: 'Switch language',
  },
  hero: {
    eyebrow: 'Professional acting studio · Belgrade',
    title: 'Serious acting training. A place to grow.',
    body: 'A professional, technique-based acting studio offering practical training in English for actors at every level — with a particular focus on the approaches of Uta Hagen and Sanford Meisner.',
    ctaClasses: 'Explore our classes',
    ctaTeacher: 'Meet the teacher',
    tagline: 'Train your craft. Find your voice. Work with others. Keep growing.',
  },
  about: {
    eyebrow: 'About the studio',
    title: 'Acting is a craft. We treat it like one.',
    intro:
      'Glumački Studio is a non-profit acting studio in Belgrade dedicated to the serious study and practice of acting — a consistent space to train technique, explore different approaches and develop the practical skills of a contemporary actor.',
    body1:
      'Our classes focus on doing rather than simply discussing acting. Students work through exercises, scene study, monologues, repetition, script analysis, voice and movement — concrete tools they can continue to develop and apply independently.',
    body2:
      'We draw from several traditions, with particular emphasis on Uta Hagen and Sanford Meisner. Rather than asking every actor to fit one prescribed method, we explore different tools and encourage students to understand how and when to use them effectively.',
    body3:
      'The studio is open to beginners and working actors aged 18 and over. Classes are conducted in English, making it a space where international and local actors can train together.',
    quote:
      'A high standard of professional practice, and an environment in which actors feel comfortable enough to take creative risks.',
  },
  disciplines: {
    eyebrow: 'What we work on',
    title: 'Practical actor training, from many directions',
    body: 'Acting is made up of many interconnected skills. Our classes approach the work from multiple angles rather than relying on a single exercise or type of training.',
    items: [
      {
        title: 'Scene Study',
        body: 'Work with scenes from real scripts to explore character, circumstances, relationships, objectives, actions and behavior — putting technique to the test.',
      },
      {
        title: 'Monologue Work',
        body: 'Develop the ability to sustain a character’s circumstances, objective and emotional life independently, staying grounded and truthful.',
      },
      {
        title: 'Meisner Repetition',
        body: 'Build listening, presence, spontaneity and truthful response — moving away from planned performance toward what is happening in the moment.',
      },
      {
        title: 'Script Analysis',
        body: 'Read between the lines to identify circumstances, relationships, objectives, actions and obstacles, so choices are informed rather than generic.',
      },
      {
        title: 'Voice',
        body: 'Explore vocal awareness, clarity, breath and intention — and the relationship between voice and emotional or physical action.',
      },
      {
        title: 'Movement',
        body: 'Develop awareness of physical choices, presence and impulse, and the relationship between the body and the character.',
      },
    ],
  },
  approach: {
    eyebrow: 'Our approach',
    title: 'Technique is a tool — not a formula',
    body: 'Studying technique should give an actor more freedom, not more rules. We expose students to practical tools and the principles behind them, so they can build a process that is their own.',
    hagenTitle: 'Uta Hagen',
    hagenBody:
      "Hagen's approach places significant emphasis on truthful behavior, circumstances, relationships and the actor's ability to fully engage with the world of the character — practical ways to investigate a scene and make choices specific and grounded.",
    meisnerTitle: 'Sanford Meisner',
    meisnerBody:
      "Meisner's work emphasizes living truthfully under imaginary circumstances, listening and responding authentically to your scene partner. Repetition and related practices build presence and responsiveness rather than pre-planned choices.",
    closing:
      'The purpose is not to make actors perform "a Meisner scene" or "a Hagen scene." It is to give actors a broader understanding of the craft and a greater range of tools with which to approach their work.',
  },
  classes: {
    eyebrow: 'The weekly class',
    title: 'The core of the studio',
    body1:
      'Rather than treating training as a one-time experience, the weekly class lets actors train consistently and develop over time. Each three-hour session combines practical exercises and acting work — enough time to work, receive direction, adjust your choices and try again.',
    tagline: 'Work, observe, adjust, repeat.',
    body2:
      'The class is designed for both beginners and experienced actors, with exercises and material adapted to the needs and level of the students.',
    infoTitle: 'Current class information',
    detailLabels: {
      day: 'Day',
      time: 'Time',
      break: 'Break',
      frequency: 'Frequency',
      monthlyFee: 'Monthly fee',
      language: 'Language',
      age: 'Age',
      location: 'Location',
    },
    detailValues: {
      day: 'Every Sunday',
      time: '11:00 AM – 2:00 PM',
      break: '15 minutes',
      frequency: '4 classes / month',
      monthlyFee: '€40',
      language: 'English',
      age: '18+',
      location: 'Auditoria Bookstore',
    },
    footnote: 'Auditoria Bookstore, Belgrade · Beginners and working actors welcome.',
  },
  workshop: {
    eyebrow: 'Special workshops',
    title: 'Weekly classes build the foundation. Workshops expand the toolbox.',
    body1:
      'Alongside our ongoing weekly classes, Glumački Studio hosts special workshops with guest teachers, coaches and professionals. They offer a concentrated period to explore a particular technique, discipline or aspect of the profession with a specialist.',
    body2:
      'This keeps the studio connected to a broader acting community and gives students opportunities to encounter teachers with different experiences and areas of expertise.',
    quote: "Upcoming workshops are announced through the studio's website and social media.",
    instagram: 'Follow on Instagram',
  },
  teacher: {
    eyebrow: 'The teacher',
    name: 'Coral Mizrachi',
    role: 'Actress & Acting Coach',
    body1:
      'Coral is an internationally working actress whose career spans film, television and theatre, and a graduate of the American Academy of Dramatic Arts in New York. She teaches in English and works with a variety of techniques, with particular emphasis on Uta Hagen and Sanford Meisner.',
    body2:
      'Her experience across mediums gives her a practical understanding of the demands placed on actors beyond the classroom — from working with text and scene partners to approaching auditions and performing for camera or stage.',
    creditsLabel: 'Selected credits',
    credits: [
      { work: 'The Ark', note: 'Syfy series' },
      { work: 'Shutafim', note: 'Comedy Central' },
      { work: 'Block Boys Behind the Light', note: 'Netflix pilot' },
      { work: 'Foreign Form', note: 'Feature film' },
      { work: 'New Love', note: 'Madlenianum Opera & Theatre' },
    ],
  },
  community: {
    eyebrow: 'Community',
    title: 'Serious training. Supportive community.',
    body1:
      'Acting is collaborative by nature. You cannot learn to listen without another person to listen to, or develop the ability to respond truthfully without taking risks in front of others. For that reason, community is an important part of the studio — but it exists alongside the training, not instead of it.',
    body2:
      "A beginner might learn from a working actor's experience. A working actor might discover something unexpected from someone who approaches a scene without years of habitual technique. Students share knowledge, exchange tips and build relationships within the acting community in Belgrade.",
    tagline: 'We train seriously. We work together. We grow together.',
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Frequently asked questions',
    items: [
      {
        q: 'Do I need previous acting experience?',
        a: 'No. Glumački Studio welcomes both complete beginners and working actors. The classes are designed to provide serious training regardless of where you are starting from.',
      },
      {
        q: 'Is this a professional acting school?',
        a: 'It is a professional acting training studio focused on practical actor development rather than a formal degree. Classes are technique-based and led by a professionally trained, working actress.',
      },
      {
        q: 'What acting techniques do you teach?',
        a: 'The studio explores a variety of acting techniques, with a particular focus on Uta Hagen and Sanford Meisner.',
      },
      {
        q: 'What do you do during class?',
        a: 'Classes can include scene study, monologues, Meisner repetition exercises, script analysis, and voice and movement work, among other practical acting exercises.',
      },
      {
        q: 'Can working actors join?',
        a: 'Absolutely. Working actors can use the weekly class as ongoing training — to maintain their technique, explore new approaches and keep working between professional projects.',
      },
      {
        q: 'What language are classes taught in, and what age?',
        a: 'Weekly classes are taught entirely in English, and students must be 18 or older.',
      },
      {
        q: 'When and where are classes, and how much do they cost?',
        a: 'Every Sunday from 11:00 AM to 2:00 PM at Auditoria Bookstore in Belgrade, with a 15-minute break. The monthly fee is €40, which includes four classes per month.',
      },
      {
        q: 'Are there workshops as well?',
        a: 'Yes. In addition to the weekly class, the studio organizes special workshops with guest teachers and professionals, announced separately with their own prices, schedules and focus.',
      },
    ],
  },
  finalCta: {
    eyebrow: 'Ready to work?',
    title: 'There is always another level of the craft to explore.',
    body: 'Join us for weekly training, challenge your instincts, develop your technique and work alongside other actors who are committed to improving.',
    ctaClasses: 'See class details',
    ctaLogin: 'Log in',
    footerTagline: 'Serious acting training, in a supportive community. Auditoria Bookstore, Belgrade.',
    instagram: 'Instagram · @glumacki.studio.bg',
  },
  login: {
    metaTitle: 'Log in — Glumački Studio',
    backToSite: '← Back to site',
    title: 'Welcome back',
    subtitle: 'Log in to access your classes and studio updates.',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    submit: 'Log in',
    submitLoading: 'Logging in…',
    newToStudio: 'New to the studio?',
    createAccount: 'Create an account',
    oauthPendingError:
      "Your account was created and is waiting on admin approval. You'll be able to log in once it's approved.",
    invalidCredentialsError: 'Invalid email or password, or your account is not active yet.',
  },
  register: {
    metaTitle: 'Register — Glumački Studio',
    backToSite: '← Back to site',
    title: 'Create an account',
    subtitle:
      'Register to access your classes and studio updates. New accounts need admin approval before you can log in.',
    nameLabel: 'Full name',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    confirmPasswordLabel: 'Confirm password',
    submit: 'Create account',
    submitLoading: 'Creating account…',
    alreadyHaveAccount: 'Already have an account?',
    logIn: 'Log in',
    invalidEmailError: 'Please enter a valid email address.',
    invalidPasswordError: 'Password must be between 6 and 48 characters long.',
    passwordMismatchError: 'Passwords do not match.',
    registrationFailedError: 'Registration failed. Please try again.',
    genericError: 'Something went wrong. Please try again.',
    checkEmailPrefix: 'Check',
    checkEmailSuffix:
      'for a confirmation link. Once you confirm, your registration is sent to the studio admins for approval before you can log in.',
  },
  oauth: {
    orContinueWith: 'Or continue with',
    google: 'Google',
    facebook: 'Facebook',
  },
  verifyEmail: {
    metaTitle: 'Verify email — Glumački Studio',
    missingParamsError: 'This verification link is missing required parameters.',
    confirmedTitle: 'Email confirmed',
    confirmedBody:
      "Your registration has been sent to the studio admins for approval. You'll be able to log in once an admin approves your account.",
    failedTitle: 'Verification failed',
    invalidError: 'This verification link is invalid or has already been used.',
    expiredError: 'This verification link has expired. Please register again.',
    backToSite: '← Back to site',
  },
}
