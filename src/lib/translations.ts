export type Language = 'en' | 'sw';

export interface TranslationSchema {
  nav: {
    about: string;
    programs: string;
    events: string;
    forms: string;
    contact: string;
    joinUs: string;
    switchTo: string;
  };
  hero: {
    badge: string;
    title: string;
    description: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  about: {
    badge: string;
    title: string;
    description: string;
    values: {
      mutualAid: { title: string; description: string };
      community: { title: string; description: string };
      heritage: { title: string; description: string };
      support: { title: string; description: string };
    };
  };
  impact: {
    badge: string;
    title: string;
    description: string;
    stats: {
      activeMembers: { value: string; label: string };
      distributed: { value: string; label: string };
      families: { value: string; label: string };
      cities: { value: string; label: string };
    };
  };
  membershipSection: {
    badge: string;
    title: string;
    description: string;
    benefits: string[];
    ctaPrimary: string;
    ctaSecondary: string;
  };
  membership: {
    title: string;
    subtitle: string;
    noticeTitle: string;
    notice: string;
    fullName: string;
    address: string;
    email: string;
    phone: string;
    dob: string;
    spouse: string;
    children: string;
    father: string;
    mother: string;
    siblings: string;
    funeralCommittee: string;
    contract: string;
    promise: string;
    witnesses: string;
    signature: string;
    date: string;
    idUpload: string;
    submit: string;
    sending: string;
    success: string;
    error: string;
  };
  renewal: {
    title: string;
    subtitle: string;
    personalSection: string;
    fullName: string;
    address: string;
    phone: string;
    witnessesSection: string;
    witnessName: string;
    witnessPhone: string;
    adminSection: string;
    adminName: string;
    adminRelationship: string;
    adminPhone: string;
    adminNote: string;
    agreementSection: string;
    agreementTextEn: string;
    agreementTextSw: string;
    signature: string;
    date: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
  };
  constitution: {
    title: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    readUnderstand: string;
    agreeObey: string;
    signature: string;
    submit: string;
    success: string;
    viewDocument: string;
    documentDescription: string;
  };
  programs: {
    badge: string;
    title: string;
    description: string;
    list: {
      bereavement: { title: string; description: string };
      education: { title: string; description: string };
      health: { title: string; description: string };
      cultural: { title: string; description: string };
      civic: { title: string; description: string };
      newArrivals: { title: string; description: string };
    };
  };
  events: {
    badge: string;
    title: string;
    cta: string;
    comingSoon: string;
    list: {
      agm: { title: string; description: string; location: string };
      independence: { title: string; description: string; location: string };
      cookout: { title: string; description: string; location: string };
    };
  };
  formsSelection: {
    title: string;
    description: string;
    membership: {
      title: string;
      description: string;
      cta: string;
    };
    constitution: {
      title: string;
      description: string;
      cta: string;
    };
    funeralNotice: {
      title: string;
      description: string;
      cta: string;
    };
    renewal: {
      title: string;
      description: string;
      cta: string;
    };
    help: {
      title: string;
      email: string;
    };
  };
  common: {
    orgName: string;
    orgFullName: string;
  };
  footer: {
    description: string;
    location: { title: string; text: string };
    email: { title: string };
    phone: { title: string };
    contributions: { title: string; zelle: string; cashapp: string };
    contact: {
      title: string;
      firstName: string;
      lastName: string;
      email: string;
      message: string;
      submit: string;
      success: string;
      successText: string;
      anotherMessage: string;
    };
    copyright: string;
    privacy: string;
    constitution: string;
    bylaws: string;
  };
}

export const translations: Record<Language, TranslationSchema> = {
  en: {
    nav: {
      about: "About",
      programs: "Programs",
      events: "Events",
      forms: "Forms",
      contact: "Contact",
      joinUs: "Become a Member",
      switchTo: "SW",
    },
    hero: {
      badge: "Tanzanian Diaspora Mutual-Aid Society",
      title: "Together We Uplift Our Community",
      description: "The Tanzania Sharing Association unites Tanzanians across the United States, providing mutual aid, cultural connection, and a bridge between home and the diaspora.",
      ctaPrimary: "Join Our Community",
      ctaSecondary: "Learn More",
    },
    about: {
      badge: "Who We Are",
      title: "Rooted in Tanzanian Values, Growing across the United States",
      description: "Founded by Tanzanian immigrants in the heart of Texas, the Tanzania Sharing Association (TSA) is a nonprofit mutual-aid society dedicated to strengthening the bonds within our diaspora community. We provide a safety net of support, cultural enrichment, and shared prosperity.",
      values: {
        mutualAid: {
          title: "Mutual Aid",
          description: "We believe in lifting each other up. Our members contribute to a shared fund that supports families through life's challenges and celebrations.",
        },
        community: {
          title: "Community",
          description: "We foster a strong sense of belonging among Tanzanians in the United States, creating spaces where our culture thrives and our bonds deepen.",
        },
        heritage: {
          title: "Cultural Heritage",
          description: "We preserve and celebrate Tanzanian traditions, language, and customs, ensuring our children carry forward the richness of our heritage.",
        },
        support: {
          title: "Support & Advocacy",
          description: "We stand together during times of need, offering practical support, guidance, and a network of care for every member.",
        },
      },
    },
    impact: {
      badge: "Our Impact",
      title: "Building a Stronger Diaspora, One Family at a Time",
      description: "Since our founding, the Tanzania Sharing Association has been a lifeline for Tanzanian families across the United States. We have supported dozens of families through difficult times and celebrated countless milestones together.",
      stats: {
        activeMembers: { value: "100+", label: "Active Members" },
        distributed: { value: "$50K+", label: "Distributed in mutual aid" },
        families: { value: "25+", label: "Families supported" },
        cities: { value: "10+", label: "US states represented" },
      },
    },
    membershipSection: {
      badge: "Membership",
      title: "Become Part of Something Greater",
      description: "Membership in the Tanzania Sharing Association is open to all individuals of Tanzanian heritage living in the United States. Together, we build a safety net that protects and uplifts every family.",
      benefits: [
        "Access to the mutual-aid emergency fund",
        "Bereavement and medical support coverage",
        "Invitation to all community events and celebrations",
        "Voting rights in association elections",
        "Scholarship eligibility for member families",
        "Connection to the broader Tanzanian-American network",
      ],
      ctaPrimary: "Apply for Membership",
      ctaSecondary: "Constitution Agreement",
    },
    membership: {
      title: "TANZANIA SHARING ASSOCIATION (TSA)",
      subtitle: "Membership Agreement Between Member and Group (TSA)",
      noticeTitle: "ATTENTION:",
      notice: "Please fill this form with integrity and care. Ensure all information is accurate. TSA has the right to terminate membership or take legal action if information is found to be fraudulent.",
      fullName: "Full Name",
      address: "Address",
      email: "Email",
      phone: "Phone Number",
      dob: "Date and Place of Birth",
      spouse: "Spouse",
      children: "Children (Names and DOB)",
      father: "Father (Name, Age, Residence)",
      mother: "Mother (Name, Age, Residence)",
      siblings: "Siblings (Names, Age, Residence)",
      funeralCommittee: "Funeral Supervisor (Name, Phone, Residence - one in USA)",
      contract: "I confirm joining TSA for a five-year contract (2025 - 2030). I understand if I leave before completion, I must return all contributed funds.",
      promise: "I promise to follow all TSA rules and procedures starting 2025. Failure to do so gives TSA the right to revoke membership without refund.",
      witnesses: "Witnesses (Names and Phone Numbers)",
      signature: "Name and Signature",
      date: "Date of Agreement",
      idUpload: "Upload Your ID",
      submit: "Submit Membership Form",
      sending: "Sending...",
      success: "Form submitted successfully!",
      error: "Something went wrong. Please try again.",
    },
    renewal: {
      title: "TSA Renewal Form (2025-2030)",
      subtitle: "Membership Renewal Agreement",
      personalSection: "1. Personal Information",
      fullName: "Full Name",
      address: "Physical Address",
      phone: "Phone Number",
      witnessesSection: "2. Witnesses",
      witnessName: "Witness Name",
      witnessPhone: "Phone",
      adminSection: "3. Next of Kin (Administrators)",
      adminName: "Administrator Name",
      adminRelationship: "Relationship",
      adminPhone: "Phone Number",
      adminNote: "Note: One administrator must reside in the USA.",
      agreementSection: "4. Membership Agreement",
      agreementTextEn: "I agree to join the Tanzania Sharing Association (TSA) for a five (5) year contract from April 2025 to March 2030. If I choose to terminate my membership before the agreed period, I am obligated to refund all the contributions I received during my time as a member. I promise to be faithful and follow all rules according to the TSA constitution (2025-2030). If I violate these rules, the TSA leadership has the right to take legal action against me.",
      agreementTextSw: "Nimekubali kujiunga na Tanzania Sharing Association (TSA) kwa mkataba wa miaka mitano (5) kuanzia Aprili 2025 hadi Machi 2030. Endapo nitaamua kuvunja mkataba (kutoka) kabla ya muda tuliokubaliana, nitalazimika kurudisha pesa zote nilizochangiwa kipindi nilipokuwa mwanachama. Ninaahidi kuwa mwaminifu na kufuata sheria zote za katiba ya TSA (2025-2030). Nikikiuka kanuni hizi, uongozi una haki ya kunichukulia hatua za kisheria.",
      signature: "Digital Signature (Full Name)",
      date: "Date of Agreement",
      submit: "Submit Renewal Form",
      submitting: "Submitting...",
      success: "Renewal form submitted successfully!",
      error: "Submission failed. Please try again.",
    },
    constitution: {
      title: "Constitution Agreement",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email",
      phone: "Phone",
      readUnderstand: "I have read and understood the TSA Constitution.",
      agreeObey: "I agree to all terms and promise to obey all TSA laws and regulations.",
      signature: "Member Signature and Date",
      submit: "Submit Agreement",
      success: "Agreement submitted successfully!",
      viewDocument: "Read TSA Constitution (2025-2030)",
      documentDescription: "Please review the official TSA Constitution document below before signing your agreement.",
    },
    programs: {
      badge: "Our Programs",
      title: "How We Support Each Other",
      description: "Through structured programs and collective resources, we ensure no member of our community faces hardship alone.",
      list: {
        bereavement: {
          title: "Bereavement Support",
          description: "Financial and emotional support for families dealing with loss, including assistance with funeral arrangements.",
        },
        education: {
          title: "Education Fund",
          description: "Scholarships and educational support for the children of our members, investing in the next generation.",
        },
        health: {
          title: "Health & Wellness",
          description: "Support during medical emergencies and health education initiatives to keep our community healthy.",
        },
        cultural: {
          title: "Cultural Celebrations",
          description: "Annual events celebrating Tanzanian independence, cultural festivals, and community gatherings.",
        },
        civic: {
          title: "Civic Engagement",
          description: "Empowering our members to participate in American civic life while maintaining strong ties to Tanzania.",
        },
        newArrivals: {
          title: "New Arrivals Support",
          description: "Welcoming and assisting newly arrived Tanzanians with settlement, orientation, and integration.",
        },
      },
    },
    events: {
      badge: "Upcoming Events",
      title: "Come Together With Us",
      cta: "View All Events",
      comingSoon: "Our community events are currently being planned. Please check back soon for the full 2026 schedule of cultural celebrations, community meetings, and mutual-aid gatherings.",
      list: {
        agm: {
          title: "Annual General Meeting",
          description: "Join us for our annual meeting to review the year's activities, elect new officers, and plan for the future.",
          location: "Dallas Community Center, TX",
        },
        independence: {
          title: "Tanzanian Independence Celebration",
          description: "Celebrate Tanzania's Union Day with traditional food, music, dance performances, and cultural exhibitions.",
          location: "Riverside Park, Houston, TX",
        },
        cookout: {
          title: "Community Cookout & Fundraiser",
          description: "A family-friendly gathering featuring Tanzanian cuisine, games for children, and a fundraiser for the education fund.",
          location: "Oak Grove Park, Austin, TX",
        },
      },
    },
    formsSelection: {
      title: "Association Forms",
      description: "Please select the appropriate form to continue your application or agreement.",
      membership: {
        title: "Membership Form",
        description: "Complete your application to join the Tanzania Sharing Association.",
        cta: "Start Application",
      },
      constitution: {
        title: "Constitution Agreement",
        description: "Read the official TSA Constitution (2025-2030) and sign the agreement to finalize your affiliation.",
        cta: "Sign Agreement",
      },
      funeralNotice: {
        title: "Funeral Notice Form",
        description: "Submit a notification for a funeral.",
        cta: "Submit Notice",
      },
      renewal: {
        title: "Renewal Form",
        description: "Renew your membership for the 2025-2030 period.",
        cta: "Start Renewal",
      },
      help: {
        title: "Need Assistance?",
        email: "Contact us at",
      },
    },
    common: {
      orgName: "TSA",
      orgFullName: "Tanzania Sharing Association",
    },
    footer: {
      description: "Empowering Tanzanians in the diaspora through solidarity, mutual aid, and cultural preservation. Together, we are stronger.",
      location: {
        title: "Location",
        text: "Serving the Tanzanian diaspora across the United States",
      },
      email: { title: "Email" },
      phone: { title: "Phone" },
      contributions: {
        title: "Send Contributions",
        zelle: "Zelle",
        cashapp: "CashApp",
      },
      contact: {
        title: "Contact Us",
        firstName: "First Name",
        lastName: "Last Name",
        email: "Email",
        message: "Message",
        submit: "Send Message",
        success: "Message Sent!",
        successText: "We'll get back to you shortly.",
        anotherMessage: "Send another message",
      },
      copyright: "Tanzania Sharing Association. All rights reserved.",
      privacy: "Privacy Policy",
      constitution: "Constitution",
      bylaws: "Bylaws",
    },
  },
  sw: {
    nav: {
      about: "Kuhusu",
      programs: "Mipango",
      events: "Matukio",
      forms: "Fomu",
      contact: "Wasiliana",
      joinUs: "Kuwa Mwanachama",
      switchTo: "EN",
    },
    hero: {
      badge: "Jumuiya ya Kusaidiana ya Watanzania Marekani",
      title: "Kwa Pamoja Tunainua Jumuiya Yetu",
      description: "Tanzania Sharing Association inaunganisha Watanzania kote Marekani, ikitoa msaada wa pande zote, unganisho la kitamaduni, na daraja kati ya nyumbani na ughaibuni.",
      ctaPrimary: "Jiunge na Jumuiya Yetu",
      ctaSecondary: "Jifunze Zaidi",
    },
    about: {
      badge: "Sisi ni Nani",
      title: "Maadili ya Kitanzania, Maisha ya Marekani",
      description: "Ilianzishwa na Watanzania waishio katikati ya Texas, Tanzania Sharing Association (TSA) ni umoja wa kusaidiana usio wa kifaida unaolenga kuimarisha undugu wetu hapa ughaibuni. Tunajenga mazingira ya kusaidiana, kuthamini utamaduni wetu, na kusonga mbele pamoja.",
      values: {
        mutualAid: {
          title: "Kusaidiana kwa dhati",
          description: "Tunaamini katika kuinua kila mmoja. Kupitia mfuko wetu wa pamoja, tunashikana mikono kwenye shida na raha.",
        },
        community: {
          title: "Umoja na Undugu",
          description: "Tunajenga umoja thabiti kwa Watanzania waishio Marekani, tukitengeneza mazingira ambapo utamaduni wetu unathaminiwa na urafiki unastawi.",
        },
        heritage: {
          title: "Urithi wa Utamaduni",
          description: "Tunatunza na kusherehekea mila, lugha, na desturi zetu za Kitanzania, ili kuhakikisha watoto wetu wanaufahamu na kuuishi urithi wetu.",
        },
        support: {
          title: "Msaada na Mwongozo",
          description: "Tunasimama pamoja kwenye kila hali, tukitoa msaada wa hali na mali, ushauri, na ushirikiano kwa kila mwanachama.",
        },
      },
    },
    impact: {
      badge: "Matokeo Yetu",
      title: "Kujenga Diaspora Imara, Familia Moja Baada ya Nyingine",
      description: "Tangu kuanzishwa kwetu, Tanzania Sharing Association imekuwa msaada kwa familia za Kitanzania kote Marekani. Tumesaidia makumi ya familia kupitia nyakati ngumu na kusherehekea hatua nyingi pamoja.",
      stats: {
        activeMembers: { value: "100+", label: "Wanachama Hai" },
        distributed: { value: "$50K+", label: "Zilizosambazwa katika msaada wa pamoja" },
        families: { value: "25+", label: "Familia zilizosaidiwa" },
        cities: { value: "10+", label: "Majimbo ya Marekani yanayowakilishwa" },
      },
    },
    membershipSection: {
      badge: "Uanachama",
      title: "Kuwa Sehemu ya Kitu Kikubwa Zaidi",
      description: "Uanachama katika Tanzania Sharing Association uko wazi kwa watu wote wenye asili ya Kitanzania wanaoishi Marekani. Pamoja, tunajenga wavu wa usalama unaolinda na kuinua kila familia.",
      benefits: [
        "Upatikanaji wa mfuko wa dharura wa msaada wa pamoja",
        "Msaada wa msiba na matibabu",
        "Mwaliko wa matukio yote ya jumuiya na sherehe",
        "Haki za kupiga kura katika uchaguzi wa chama",
        "Kustahiki scholarship kwa familia za wanachama",
        "Kuunganishwa na mtandao mpana wa Watanzania-Wamarekani",
      ],
      ctaPrimary: "Omba Uanachama",
      ctaSecondary: "Makubaliano ya Katiba",
    },
    membership: {
      title: "TANZANIA SHARING ASSOCIATION (TSA)",
      subtitle: "Makubaliano Kati ya Mwanachama na Kikundi (TSA)",
      noticeTitle: "ANGALIZO:",
      notice: "Tafadhali jaza fomu hii kwa uadilifu, uangalifu na umakini mkubwa. Hakikisha taarifa zote unazoandika ni sahihi bila kupindisha. TSA itakuwa na haki ya kukufuta uanachama, au kukuchukulia hatua za kisheria wakati wowote endapo itabainika taarifa ulizozitoa ni za udanganyifu, au ulizitoa kwa lengo la kukihujumu kikundi.",
      fullName: "Jina Kamili",
      address: "Anuani",
      email: "Barua Pepe",
      phone: "Namba ya Simu",
      dob: "Tarehe na Mahali pa Kuzaliwa",
      spouse: "Mwenza wa Ndoa",
      children: "Watoto - Orodhesha majina na Tarehe ya kuzaliwa",
      father: "Mzazi/Mlezi (Baba) Jina, Umri na Makazi",
      mother: "Mzazi/Mlezi (Mama) Jina, Umri na Makazi",
      siblings: "Ndugu/ Kaka na Dada - Orodhesha Majina ya Ndugu, Umri na Makazi",
      funeralCommittee: "Jina la Msimamizi/Wasimamizi wa Msiba, Namba ya simu na Makazi (Mmoja aishie USA)",
      contract: "Mimi mwenye jina na sahihi iliyowekwa hapa chini, nathibitisha kujiunga na TSA kwa mkataba wa miaka mitano (2025 - 2030). Nafahamu kwamba, kama nikiamua kujitoa kwenye chama kabla ya mkataba kuisha nitalazimika kurudisha fedha zote nilizochangiwa.",
      promise: "Naahidi kufuata sheria, kanuni na taratibu zote zilizowekwa na TSA kuanzia mwaka 2025. Endapo nitakiuka kanuni na taratibu hizo TSA itakuwa na haki ya kunivua uanachama bila kunirudishia pesa nilizochangia.",
      witnesses: "Mashahidi -Majina kamili na Namba za Simu",
      signature: "Sahihi ya Muomba Uanachama",
      date: "Tarehe ya Makubaliano",
      idUpload: "Tuma Kitambulisho",
      submit: "Tuma Fomu ya Uanachama",
      sending: "Inatuma...",
      success: "Fomu imetwa kwa mafanikio!",
      error: "Kuna tatizo limetokea. Tafadhali jaribu tena.",
    },
    renewal: {
      title: "Fomu ya Kuendeleza Uanachama (2025-2030)",
      subtitle: "Makubaliano ya Kuendeleza Uanachama",
      personalSection: "1. Taarifa Binafsi",
      fullName: "Jina Kamili",
      address: "Anuani ya Makazi",
      phone: "Namba ya Simu",
      witnessesSection: "2. Mashahidi",
      witnessName: "Jina la Shahidi",
      witnessPhone: "Simu",
      adminSection: "3. Wasimamizi",
      adminName: "Jina la Msimamizi",
      adminRelationship: "Uhusiano",
      adminPhone: "Namba ya Simu",
      adminNote: "Angalizo: Msimamizi mmoja lazima awe Marekani.",
      agreementSection: "4. Makubaliano ya Uanachama",
      agreementTextEn: "I agree to join the Tanzania Sharing Association (TSA) for a five (5) year contract from April 2025 to March 2030. If I choose to terminate my membership before the agreed period, I am obligated to refund all the contributions I received during my time as a member. I promise to be faithful and follow all rules according to the TSA constitution (2025-2030). If I violate these rules, the TSA leadership has the right to take legal action against me.",
      agreementTextSw: "Nimekubali kujiunga na Tanzania Sharing Association (TSA) kwa mkataba wa miaka mitano (5) kuanzia Aprili 2025 hadi Machi 2030. Endapo nitaamua kuvunja mkataba (kutoka) kabla ya muda tuliokubaliana, nitalazimika kurudisha pesa zote nilizochangiwa kipindi nilipokuwa mwanachama. Ninaahidi kuwa mwaminifu na kufuata sheria zote za katiba ya TSA (2025-2030). Nikikiuka kanuni hizi, uongozi una haki ya kunichukulia hatua za kisheria.",
      signature: "Sahihi ya Kidijitali (Jina Kamili)",
      date: "Tarehe ya Makubaliano",
      submit: "Tuma Fomu ya Renewal",
      submitting: "Inatuma...",
      success: "Fomu ya renewal imetumwa kwa mafanikio!",
      error: "Imeshindikana kutuma. Tafadhali jaribu tena.",
    },
    constitution: {
      title: "Makubaliano ya Katiba",
      firstName: "Jina la kwanza",
      lastName: "Jina la ukoo",
      email: "Email",
      phone: "Phone",
      readUnderstand: "Nimeisoma na kuielewa Katiba ya TSA.",
      agreeObey: "Nakubali masharti yote na naahidi kuitii Katiba na sheria zote za TSA.",
      signature: "Sahihi ya Mwanachama na Tarehe",
      submit: "Tuma Makubaliano",
      success: "Makubaliano yametuma kwa mafanikio!",
      viewDocument: "Soma Katiba ya TSA (2025-2030)",
      documentDescription: "Tafadhali kagua hati rasmi ya Katiba ya TSA hapa chini kabla ya kusaini makubaliano yako.",
    },
    programs: {
      badge: "Mipango Yetu",
      title: "Jinsi Tunavyosaidiana",
      description: "Kupitia mipango iliyopangwa na rasilimali za pamoja, tunahakikisha hakuna mwanachama wa jumuiya yetu anayekabiliwa na ugumu peke yake.",
      list: {
        bereavement: {
          title: "Msaada wa Msiba",
          description: "Msaada wa kifedha na kihisia kwa familia zinazokabiliwa na upotevu, ikiwa ni pamoja na msaada wa mipango ya mazishi.",
        },
        education: {
          title: "Mfuko wa Elimu",
          description: "Scholarships na msaada wa kielimu kwa watoto wa wanachama wetu, tukiwekeza katika kizazi kijacho.",
        },
        health: {
          title: "Afya na Ustawi",
          description: "Msaada wakati wa dharura za matibabu na mipango ya elimu ya afya ili kuweka jumuiya yetu yenye afya.",
        },
        cultural: {
          title: "Serehe za Kitamaduni",
          description: "Matukio ya kila mwaka yanayosherehekea uhuru wa Tanzania, tamasha za kitamaduni, na mikutano ya jumuiya.",
        },
        civic: {
          title: "Ushiriki wa Kiraia",
          description: "Kuwezesha wanachama wetu kushiriki katika maisha ya kiraia ya Marekani huku wakidumisha uhusiano mkubwa na Tanzania.",
        },
        newArrivals: {
          title: "Msaada kwa Wageni",
          description: "Kuwakaribisha na kuwasaidia Watanzania wapya waliowasili kwa makazi, mwelekeo, na ushirikiano.",
        },
      },
    },
    events: {
      badge: "Matukio Yajayo",
      title: "Ungana Nasi",
      cta: "Ona Matukio Yote",
      comingSoon: "Matukio ya jumuiya yetu yanapangwa hivi sasa. Tafadhali rudi hivi karibuni kwa ratiba kamili ya mwaka 2026 ya sherehe za kitamaduni, mikutano ya jumuiya, na mikutano ya msaada wa pamoja.",
      list: {
        agm: {
          title: "Mkutano Mkuu wa Mwaka",
          description: "Jiunge nasi kwa mkutano wetu wa kila mwaka kupitia shughuli za mwaka, kuchagua viongozi wapya, na kupanga maisha ya baadaye.",
          location: "Dallas Community Center, TX",
        },
        independence: {
          title: "Sherehe za Uhuru wa Tanzania",
          description: "Sherehekea Siku ya Muungano wa Tanzania kwa chakula cha asili, muziki, maonyesho ya densi, na maonyesho ya kitamaduni.",
          location: "Riverside Park, Houston, TX",
        },
        cookout: {
          title: "Mapishi ya Jumuiya na Kuchangisha Fedha",
          description: "Mkusanyiko wa kifamilia unaoonyesha vyakula vya Kitanzania, michezo kwa watoto, na kuchangisha fedha kwa mfuko wa elimu.",
          location: "Oak Grove Park, Austin, TX",
        },
      },
    },
    formsSelection: {
      title: "Fomu za Chama",
      description: "Tafadhali chagua fomu inayofaa ili kuendelea na maombi yako au makubaliano.",
      membership: {
        title: "Fomu ya Uanachama",
        description: "Kamilisha maombi yako kujiunga na Tanzania Sharing Association.",
        cta: "Anza Maombi",
      },
      constitution: {
        title: "Makubaliano ya Katiba",
        description: "Soma Katiba rasmi ya TSA (2025-2030) na usaini makubaliano ili kukamilisha ushirika wako.",
        cta: "Saini Makubaliano",
      },
      funeralNotice: {
        title: "Fomu ya Taarifa ya Msiba",
        description: "Tuma taarifa ya msiba.",
        cta: "Tuma Taarifa",
      },
      renewal: {
        title: "Fomu ya Renewal",
        description: "Endeleza uanachama wako kwa kipindi cha 2025-2030.",
        cta: "Anza Renewal",
      },
      help: {
        title: "Unahitaji Msaada?",
        email: "Wasiliana nasi kwa",
      },
    },
    common: {
      orgName: "TSA",
      orgFullName: "Tanzania Sharing Association",
    },
    footer: {
      description: "Kuwezesha Watanzania katika ughaibuni kupitia mshikamano, msaada wa pamoja, na uhifadhi wa kitamaduni. Pamoja, sisi ni wenye nguvu.",
      location: {
        title: "Mahali",
        text: "Kuhudumia diaspora ya Kitanzania kote Marekani",
      },
      email: { title: "Barua Pepe" },
      phone: { title: "Simu" },
      contributions: {
        title: "Tuma Michango",
        zelle: "Zelle",
        cashapp: "CashApp",
      },
      contact: {
        title: "Wasiliana Nasi",
        firstName: "Jina la Kwanza",
        lastName: "Jina la Ukoo",
        email: "Barua Pepe",
        message: "Ujumbe",
        submit: "Tuma Ujumbe",
        success: "Ujumbe Umetumwa!",
        successText: "Tutakujibu hivi karibuni.",
        anotherMessage: "Tuma ujumbe mwingine",
      },
      copyright: "Tanzania Sharing Association. Haki zote zimehifadhiwa.",
      privacy: "Sera ya Faragha",
      constitution: "Katiba",
      bylaws: "Sheria Ndogo",
    },
  },
};


