import { BlogPost } from "../types";

export const blogPosts: BlogPost[] = [
  {
    slug: "congratulations-graduates-2026",
    publishedAt: "2026-06-23",
    author: "Tanzania Sharing Association",
    coverImage: "/images/graduates/class-of-2026-floral.jpg",
    category: {
      en: "Announcement",
      sw: "Tangazo",
    },
    readTime: {
      en: "1 min read",
      sw: "Dk 1 kusoma",
    },
    title: {
      en: "Congratulations to Our 2026 Graduates!",
      sw: "Pongezi kwa Wahitimu Wetu wa Mwaka 2026!",
    },
    excerpt: {
      en: "TSA family celebrates and congratulates the graduating class of 2026! Read our special announcement and view graduation certificates.",
      sw: "Familia ya TSA inawapongeza na kuwasherehekea wahitimu wa darasa la 2026! Soma tangazo maalum na utazame vyeti vyao vya mahafali.",
    },
    content: {
      en: [
        {
          type: "paragraph",
          value: "Today, the Tanzania Sharing Association (TSA) on behalf of the TSA family proudly congratulates all of our beloved graduates of the Class of 2026! We celebrate your hard work, dedication, and incredible academic milestones as you close this chapter and step into a world of new possibilities.",
        },
        {
          type: "paragraph",
          value: "We also extend our special congratulations and deep appreciation to the proud parents and families: Mr. Emmanuel Lukuwi & Ms. Rose Mhibira (parents of Dwayne Mulamula), Mr. Henry Geoffrey Pyanilla & Ms. Suma Mande (parents of Chris-Lumuli Pyanilla), and Mr. Nickson Mlay & Ms. Salome Mlay & Ms. Mary Mwang'ombe (parents of Isaria Mlay). The TSA family is very proud of the splendid job you did as parents in raising successful graduates!",
        },
        {
          type: "quote",
          value: '"Elimu ni ufunguo wa maisha" (Education is the key to life). May your paths be filled with success, joy, and exciting discoveries. We wish you all the best in every step you take. Your future has just begun!',
        },
        {
          type: "heading",
          value: "Community Greetings & Parent Honors"
        },
        {
          type: "gallery",
          value: [
            "/images/graduates/class-of-2026-floral.jpg",
            "/images/graduates/tsa-congratulations-card.jpg"
          ]
        },
        {
          type: "heading",
          value: "Individual Graduate Milestones"
        },
        {
          type: "gallery",
          value: [
            "/images/graduates/dwayne-hs-diploma.jpg",
            "/images/graduates/dwayne-associates-degree.jpg",
            "/images/graduates/dwayne-diploma-blue.jpg"
          ]
        }
      ],
      sw: [
        {
          type: "paragraph",
          value: "Leo, Tanzania Sharing Association (TSA) kwa niaba ya familia ya TSA inawapongeza kwa dhati na kwa fahari kubwa wahitimu wetu wote wapendwa wa Darasa la 2026! Tunasherehekea juhudi zenu, kujitolea, na mafanikio yenu makubwa ya kitaaluma mnapofunga ukurasa huu na kuanza safari mpya yenye fursa zisizo na kikomo.",
        },
        {
          type: "paragraph",
          value: "Pia tunatoa pongezi za dhati na shukrani za kipekee kwa wazazi na familia zao wenye fahari kubwa: Bw. Emmanuel Lukuwi & Bi. Rose Mhibira (wazazi wa Dwayne Mulamula), Bw. Henry Geoffrey Pyanilla & Bi. Suma Mande (wazazi wa Chris-Lumuli Pyanilla), na Bw. Nickson Mlay & Bi. Salome Mlay & Bi. Mary Mwang'ombe (wazazi wa Isaria Mlay). Familia ya TSA inajivunia sana kazi nzuri mliyofanya kama wazazi katika kulea wahitimu hawa wenye mafanikio!",
        },
        {
          type: "quote",
          value: '"Elimu ni ufunguo wa maisha". Njia zenu na ziongozwe na mafanikio, furaha, na uvumbuzi wa kusisimua. Tunawatakia kila la heri katika kila hatua mnayopiga. Maisha yenu ya baadaye yameanza rasmi!',
        },
        {
          type: "heading",
          value: "Salamu za Jumuiya na Pongezi za Wazazi"
        },
        {
          type: "gallery",
          value: [
            "/images/graduates/class-of-2026-floral.jpg",
            "/images/graduates/tsa-congratulations-card.jpg"
          ]
        },
        {
          type: "heading",
          value: "Hatua na Mafanikio ya Wahitimu"
        },
        {
          type: "gallery",
          value: [
            "/images/graduates/dwayne-hs-diploma.jpg",
            "/images/graduates/dwayne-associates-degree.jpg",
            "/images/graduates/dwayne-diploma-blue.jpg"
          ]
        }
      ]
    }
  }
];
