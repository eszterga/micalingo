import { getLearnGuide, guideDescription, guideTitle } from './learnContent';

export type SeoLang = 'en' | 'de' | 'hu';

export const SITE_ORIGIN = 'https://micalingo.com';
export const SEO_LANGS: SeoLang[] = ['en', 'de', 'hu'];

export type SeoCopy = {
  title: string;
  description: string;
  keywords: string;
};

type Localized = Record<SeoLang, SeoCopy>;

const HOME: Localized = {
  en: {
    title: 'Learn German: Quizzes, Grammar & Vocabulary | MicaLingo',
    description:
      'Learn German online with free German–Hungarian quizzes for vocabulary, grammar, articles (der, die, das), verbs, adjectives, and prepositions. Sign in with Google to build private quizzes in any languages.',
    keywords:
      'learn German, German learning, German quizzes, German grammar, German vocabulary, German articles, der die das, German verbs, Deutsch lernen, német tanulás, MicaLingo',
  },
  de: {
    title: 'Deutsch lernen: Quizze, Grammatik & Wortschatz | MicaLingo',
    description:
      'Deutsch lernen mit kostenlosen Deutsch–Ungarisch-Quizzen zu Wortschatz, Grammatik, Artikeln (der, die, das), Verben, Adjektiven und Präpositionen. Mit Google-Login eigene Quizze in beliebigen Sprachen.',
    keywords:
      'Deutsch lernen, Deutsch Quiz, deutsche Grammatik, Wortschatz, Artikel der die das, Verben konjugieren, Adjektive, Präpositionen, MicaLingo',
  },
  hu: {
    title: 'Német tanulás: kvízek, nyelvtan és szókincs | MicaLingo',
    description:
      'Tanulj németül ingyenes német–magyar kvízekkel: szókincs, nyelvtan, névelők (der, die, das), igék, melléknevek és prepozíciók. Google-fiókkal saját kvízek bármilyen nyelven.',
    keywords:
      'német tanulás, német kvíz, német nyelvtan, német szókincs, német névelők, der die das, német igék, MicaLingo',
  },
};

const ROUTES: Record<string, Localized> = {
  '/': HOME,
  '/quizzes': {
    en: {
      title: 'German Quizzes: Vocabulary, Articles & Verbs | MicaLingo',
      description:
        'Free German quizzes for vocabulary, articles (der, die, das), verbs, adjectives, phrases, and prepositions. Practice German online and track your progress.',
      keywords: 'German quizzes, German vocabulary quiz, German articles quiz, der die das quiz, German verbs quiz, learn German',
    },
    de: {
      title: 'Deutsch-Quizze: Wortschatz, Artikel & Verben | MicaLingo',
      description:
        'Kostenlose Deutsch-Quizze zu Wortschatz, Artikeln (der, die, das), Verben, Adjektiven, Redewendungen und Präpositionen. Deutsch online üben.',
      keywords: 'Deutsch Quiz, Wortschatz Quiz, Artikel Quiz der die das, Verben Quiz, Deutsch lernen',
    },
    hu: {
      title: 'Német kvízek: szókincs, névelők és igék | MicaLingo',
      description:
        'Ingyenes német kvízek szókincshez, névelőkhöz (der, die, das), igékhez, melléknevekhez, kifejezésekhez és prepozíciókhoz. Gyakorold a németet online.',
      keywords: 'német kvíz, német szókincs kvíz, névelők kvíz der die das, német ige kvíz, német tanulás',
    },
  },
  '/library': {
    en: {
      title: 'German Learning Library: Vocabulary & Materials | MicaLingo',
      description:
        'Browse public German–Hungarian vocabulary lists plus reading and listening materials. After Google login, organise a private library in any languages.',
      keywords: 'German vocabulary library, German learning materials, German word list, learn German',
    },
    de: {
      title: 'Deutsch-Lernbibliothek: Wortschatz & Materialien | MicaLingo',
      description:
        'Durchsuche die öffentliche Deutsch–Ungarisch-Wortschatzliste sowie Lese- und Hörmaterialien. Nach dem Google-Login organisierst du eine private Bibliothek in beliebigen Sprachen.',
      keywords: 'Wortschatz Bibliothek, Deutsch Lernmaterialien, Vokabelliste, Deutsch lernen',
    },
    hu: {
      title: 'Német tanulókönyvtár: szókincs és tananyagok | MicaLingo',
      description:
        'Böngéssz nyilvános német–magyar szókincslistákat, olvasnivalót és hallásértési anyagokat. Google-belépés után a saját könyvtárad bármilyen nyelvű lehet.',
      keywords: 'német szótár, német tananyag, német szólista, német tanulás',
    },
  },
  '/grammar': {
    en: {
      title: 'German Grammar: Cases, Tenses, Articles & More | MicaLingo',
      description:
        'Learn German grammar: cases (Nominativ, Akkusativ, Dativ, Genitiv), tenses, articles and genders, adjective declension, prepositions, and sentence structure.',
      keywords: 'German grammar, German cases, German tenses, German articles, adjective declension, German prepositions, sentence structure',
    },
    de: {
      title: 'Deutsche Grammatik: Kasus, Zeiten, Artikel | MicaLingo',
      description:
        'Deutsche Grammatik lernen: Fälle (Nominativ, Akkusativ, Dativ, Genitiv), Zeitformen, Artikel und Geschlechter, Adjektivdeklination, Präpositionen und Satzbau.',
      keywords: 'deutsche Grammatik, Kasus, Zeitformen, Artikel, Adjektivdeklination, Präpositionen, Satzbau',
    },
    hu: {
      title: 'Német nyelvtan: esetek, igeidők, névelők | MicaLingo',
      description:
        'Tanulj német nyelvtant: esetek (Nominativ, Akkusativ, Dativ, Genitiv), igeidők, névelők és nemek, melléknévragozás, prepozíciók és szórend.',
      keywords: 'német nyelvtan, német esetek, igeidők, névelők, melléknévragozás, prepozíciók, szórend',
    },
  },
  '/statistics': {
    en: {
      title: 'German Study Statistics & Quiz Progress | MicaLingo',
      description: 'Track German quiz scores and learning progress for vocabulary, grammar, articles, and verbs.',
      keywords: 'German quiz results, language learning progress, German study tracker',
    },
    de: {
      title: 'Lernstatistik & Quiz-Fortschritt | MicaLingo',
      description: 'Verfolge Quiz-Ergebnisse und Lernfortschritt bei Wortschatz, Grammatik, Artikeln und Verben.',
      keywords: 'Deutsch Quiz Ergebnisse, Lernfortschritt, Statistik',
    },
    hu: {
      title: 'Tanulási statisztika és kvízhaladás | MicaLingo',
      description: 'Kövesd a német kvízeredményeket és a haladást szókincs, nyelvtan, névelők és igék terén.',
      keywords: 'német kvíz eredmények, tanulási haladás, statisztika',
    },
  },
  '/vocabulary': {
    en: {
      title: 'German Vocabulary List: Words to Learn & Review | MicaLingo',
      description:
        'Build German vocabulary with searchable word lists, example sentences, and translations. Review German words for everyday use.',
      keywords: 'German vocabulary, German word list, learn German words, German dictionary, Wortschatz',
    },
    de: {
      title: 'Deutscher Wortschatz: Vokabeln lernen & wiederholen | MicaLingo',
      description:
        'Baue deinen deutschen Wortschatz mit durchsuchbaren Wortlisten, Beispielsätzen und Übersetzungen auf. Vokabeln für den Alltag.',
      keywords: 'deutscher Wortschatz, Vokabelliste, deutsche Wörter lernen, Vokabeln',
    },
    hu: {
      title: 'Német szókincs: szavak tanulása és ismétlése | MicaLingo',
      description:
        'Építsd a német szókincsed kereshető szólistákkal, példamondatokkal és fordításokkal. Ismételd a szavakat hétköznapi használatra.',
      keywords: 'német szókincs, német szólista, német szavak, szótár',
    },
  },
  '/practice': {
    en: {
      title: 'German Practice Exercises | MicaLingo',
      description: 'Practice German topics with focused exercises for vocabulary, grammar, articles, and verbs.',
      keywords: 'German practice, German exercises, learn German online',
    },
    de: {
      title: 'Deutsch üben: Übungen & Training | MicaLingo',
      description: 'Übe Deutsch mit gezielten Aufgaben zu Wortschatz, Grammatik, Artikeln und Verben.',
      keywords: 'Deutsch üben, Deutsch Übungen, Deutsch lernen',
    },
    hu: {
      title: 'Német gyakorlás: feladatok | MicaLingo',
      description: 'Gyakorold a németet szókincs, nyelvtan, névelők és igék témájú feladatokkal.',
      keywords: 'német gyakorlás, német feladatok, német tanulás',
    },
  },
  '/learning-materials': {
    en: {
      title: 'German Learning Materials: Reading & Listening | MicaLingo',
      description:
        'German reading and listening practice: articles, idioms, false friends, books, music, podcasts, and audiobooks.',
      keywords: 'German reading, German listening, German articles, German idioms, German podcasts',
    },
    de: {
      title: 'Deutsch Lernmaterialien: Lesen & Hören | MicaLingo',
      description:
        'Lese- und Hörtraining auf Deutsch: Artikel, Redewendungen, falsche Freunde, Bücher, Musik, Podcasts und Hörbücher.',
      keywords: 'Deutsch Lesen, Deutsch Hören, deutsche Artikel, Redewendungen, Podcasts',
    },
    hu: {
      title: 'Német tananyagok: olvasás és hallásértés | MicaLingo',
      description:
        'Német olvasás- és hallásértés-gyakorlás: cikkek, szólások, hamis barátok, könyvek, zene, podcastok és hangoskönyvek.',
      keywords: 'német olvasás, német hallásértés, német cikkek, szólások, podcast',
    },
  },
  '/learning-materials/reading': {
    en: {
      title: 'German Reading Practice: Articles, Idioms & Books | MicaLingo',
      description: 'Read German texts including articles, idioms, false friends, and books to grow vocabulary and comprehension.',
      keywords: 'German reading practice, German texts, German idioms, false friends',
    },
    de: {
      title: 'Deutsch Lesen: Artikel, Redewendungen & Bücher | MicaLingo',
      description: 'Lies deutsche Texte: Artikel, Redewendungen, falsche Freunde und Bücher für Wortschatz und Leseverstehen.',
      keywords: 'Deutsch Lesen, deutsche Texte, Redewendungen, falsche Freunde',
    },
    hu: {
      title: 'Német olvasás: cikkek, szólások és könyvek | MicaLingo',
      description: 'Olvasd a német szövegeket: cikkek, szólások, hamis barátok és könyvek a szókincs és szövegértés fejlesztéséhez.',
      keywords: 'német olvasás, német szövegek, szólások, hamis barátok',
    },
  },
  '/learning-materials/reading/false-friends': {
    en: {
      title: 'German False Friends: Common Translation Traps | MicaLingo',
      description: 'Learn common German–English and German–Hungarian false friends so you avoid typical translation mistakes.',
      keywords: 'German false friends, falsche Freunde, translation mistakes, learn German',
    },
    de: {
      title: 'Falsche Freunde im Deutschen | MicaLingo',
      description: 'Lerne häufige deutsch–englische und deutsch–ungarische falsche Freunde und vermeide Übersetzungsfehler.',
      keywords: 'falsche Freunde Deutsch, Übersetzungsfehler, Deutsch lernen',
    },
    hu: {
      title: 'Német hamis barátok: fordítási csapdák | MicaLingo',
      description: 'Ismerd meg a gyakori német–angol és német–magyar hamis barátokat, hogy elkerüld a tipikus fordítási hibákat.',
      keywords: 'német hamis barátok, fordítási hibák, német tanulás',
    },
  },
  '/learning-materials/reading/idioms': {
    en: {
      title: 'German Idioms & Everyday Expressions | MicaLingo',
      description: 'Study useful German idioms and expressions to sound more natural in conversation.',
      keywords: 'German idioms, German expressions, Redewendungen, learn German phrases',
    },
    de: {
      title: 'Deutsche Redewendungen & Ausdrücke | MicaLingo',
      description: 'Lerne nützliche deutsche Redewendungen und Ausdrücke für natürlichere Sprache im Gespräch.',
      keywords: 'deutsche Redewendungen, deutsche Ausdrücke, Idiome, Deutsch lernen',
    },
    hu: {
      title: 'Német szólások és kifejezések | MicaLingo',
      description: 'Tanulj hasznos német szólásokat és kifejezéseket, hogy természetesebben beszélj a mindennapokban.',
      keywords: 'német szólások, német kifejezések, német idiómák',
    },
  },
  '/learning-materials/listening': {
    en: {
      title: 'German Listening Practice: Music, Podcasts & Audio | MicaLingo',
      description: 'Improve German listening with music, podcasts, and audiobooks selected for language learners.',
      keywords: 'German listening, German podcasts, German audiobooks, Hörverstehen',
    },
    de: {
      title: 'Deutsch Hören: Musik, Podcasts & Audio | MicaLingo',
      description: 'Verbessere dein Hörverstehen mit Musik, Podcasts und Hörbüchern für Deutschlernende.',
      keywords: 'Deutsch Hören, Hörverstehen, deutsche Podcasts, Hörbücher',
    },
    hu: {
      title: 'Német hallásértés: zene, podcast és hanganyag | MicaLingo',
      description: 'Fejleszd a német hallásértést zenével, podcastokkal és hangoskönyvekkel nyelvtanulóknak.',
      keywords: 'német hallásértés, német podcast, hangoskönyv',
    },
  },
  '/about': {
    en: {
      title: 'About MicaLingo — Learn German Online',
      description: 'Who runs MicaLingo, how the public German–Hungarian quizzes are made, and how a Google login unlocks a private library in any languages.',
      keywords: 'MicaLingo, learn German, self-learning, about',
    },
    de: {
      title: 'Über MicaLingo — Deutsch online lernen',
      description: 'MicaLingo ist eine kostenlose Plattform zum Selbstlernen mit öffentlichen Deutsch–Ungarisch-Quizzen und einer privaten Bibliothek nach Google-Login.',
      keywords: 'MicaLingo, Deutsch lernen, Selbstlernen',
    },
    hu: {
      title: 'A MicaLingo-ról — német tanulás online',
      description: 'A MicaLingo ingyenes önálló tanuló oldal nyilvános német–magyar kvízekkel, és Google-belépés után saját könyvtárral bármilyen nyelven.',
      keywords: 'MicaLingo, német tanulás, önálló tanulás',
    },
  },
  '/learn': {
    en: {
      title: 'German Study Guides: Articles & Cases | MicaLingo',
      description: 'Original German study guides for self-learners: public vs private library, der/die/das, and German cases.',
      keywords: 'German study guides, der die das, German cases, self-learning German',
    },
    de: {
      title: 'Deutsch-Lernratgeber: Artikel & Fälle | MicaLingo',
      description: 'Eigene Ratgeber zum Selbstlernen: öffentlich vs privat, der/die/das und deutsche Fälle.',
      keywords: 'Deutsch Lernratgeber, der die das, Kasus, Selbstlernen',
    },
    hu: {
      title: 'Német tanulási útmutatók: névelők, esetek | MicaLingo',
      description: 'Saját útmutatók önálló tanuláshoz: nyilvános vs saját könyvtár, der/die/das és német esetek.',
      keywords: 'német útmutató, der die das, német esetek, önálló tanulás',
    },
  },
  '/privacy': {
    en: { title: 'Privacy Policy | MicaLingo', description: 'Privacy policy for the MicaLingo website and mobile app.', keywords: 'MicaLingo privacy' },
    de: { title: 'Datenschutz | MicaLingo', description: 'Datenschutzerklärung für die MicaLingo-Website und App.', keywords: 'MicaLingo Datenschutz' },
    hu: { title: 'Adatvédelem | MicaLingo', description: 'A MicaLingo webhely és alkalmazás adatvédelmi tájékoztatója.', keywords: 'MicaLingo adatvédelem' },
  },
  '/terms': {
    en: { title: 'Terms of Service | MicaLingo', description: 'Terms of service for using MicaLingo.', keywords: 'MicaLingo terms' },
    de: { title: 'Nutzungsbedingungen | MicaLingo', description: 'Nutzungsbedingungen für MicaLingo.', keywords: 'MicaLingo AGB' },
    hu: { title: 'ÁSZF | MicaLingo', description: 'A MicaLingo használati feltételei.', keywords: 'MicaLingo ÁSZF' },
  },
  '/cookies': {
    en: { title: 'Cookie Policy | MicaLingo', description: 'How MicaLingo and Google use cookies, including advertising cookies for AdSense.', keywords: 'MicaLingo cookies' },
    de: { title: 'Cookie-Richtlinie | MicaLingo', description: 'Wie MicaLingo und Google Cookies verwenden, einschließlich Werbe-Cookies für AdSense.', keywords: 'MicaLingo Cookies' },
    hu: { title: 'Süti szabályzat | MicaLingo', description: 'Hogyan használja a MicaLingo és a Google a sütiket, beleértve a hirdetési sütiket.', keywords: 'MicaLingo sütik' },
  },
  '/impressum': {
    en: { title: 'Impressum | MicaLingo', description: 'Legal notice and operator information for MicaLingo.', keywords: 'MicaLingo impressum' },
    de: { title: 'Impressum | MicaLingo', description: 'Impressum und Angaben zum Betreiber von MicaLingo.', keywords: 'MicaLingo Impressum' },
    hu: { title: 'Impresszum | MicaLingo', description: 'Jogi nyilatkozat és üzemeltetői adatok a MicaLingo-hoz.', keywords: 'MicaLingo impresszum' },
  },
  '/login': {
    en: { title: 'Log in | MicaLingo', description: 'Sign in to MicaLingo to save your German learning progress.', keywords: 'MicaLingo login' },
    de: { title: 'Anmelden | MicaLingo', description: 'Melde dich bei MicaLingo an, um deinen Deutsch-Lernfortschritt zu speichern.', keywords: 'MicaLingo Anmelden' },
    hu: { title: 'Bejelentkezés | MicaLingo', description: 'Jelentkezz be a MicaLingo-ba, hogy mentsd a német tanulási haladásod.', keywords: 'MicaLingo bejelentkezés' },
  },
  '/settings': {
    en: { title: 'Settings | MicaLingo', description: 'Manage your MicaLingo app settings.', keywords: 'MicaLingo settings' },
    de: { title: 'Einstellungen | MicaLingo', description: 'Verwalte deine MicaLingo-Einstellungen.', keywords: 'MicaLingo Einstellungen' },
    hu: { title: 'Beállítások | MicaLingo', description: 'Kezeld a MicaLingo alkalmazás beállításait.', keywords: 'MicaLingo beállítások' },
  },
  '/import': {
    en: { title: 'Import | MicaLingo', description: 'Import your own German learning materials into MicaLingo.', keywords: 'import German vocabulary' },
    de: { title: 'Importieren | MicaLingo', description: 'Importiere eigene Deutsch-Lernmaterialien in MicaLingo.', keywords: 'Vokabeln importieren' },
    hu: { title: 'Importálás | MicaLingo', description: 'Importáld a saját német tananyagaidat a MicaLingo-ba.', keywords: 'német szókincs import' },
  },
  '/create-quiz': {
    en: { title: 'Create Quiz | MicaLingo', description: 'Create a custom German quiz in MicaLingo.', keywords: 'custom German quiz' },
    de: { title: 'Quiz erstellen | MicaLingo', description: 'Erstelle ein eigenes Deutsch-Quiz in MicaLingo.', keywords: 'eigenes Deutsch Quiz' },
    hu: { title: 'Kvíz készítése | MicaLingo', description: 'Készíts saját német kvízt a MicaLingo-ban.', keywords: 'saját német kvíz' },
  },
  '/quiz': {
    en: { title: 'German Quiz | MicaLingo', description: 'Take a German practice quiz on MicaLingo.', keywords: 'German quiz' },
    de: { title: 'Deutsch-Quiz | MicaLingo', description: 'Löse ein Deutsch-Übungsquiz auf MicaLingo.', keywords: 'Deutsch Quiz' },
    hu: { title: 'Német kvíz | MicaLingo', description: 'Tölts ki egy német gyakorló kvízt a MicaLingo-n.', keywords: 'német kvíz' },
  },
  '/results': {
    en: { title: 'Quiz Results | MicaLingo', description: 'View your MicaLingo quiz results.', keywords: 'quiz results' },
    de: { title: 'Quiz-Ergebnisse | MicaLingo', description: 'Sieh dir deine MicaLingo-Quiz-Ergebnisse an.', keywords: 'Quiz Ergebnisse' },
    hu: { title: 'Kvízeredmények | MicaLingo', description: 'Nézd meg a MicaLingo kvízeredményeidet.', keywords: 'kvíz eredmények' },
  },
};

const QUIZ_TOPICS: Record<string, Localized> = {
  vocabulary: {
    en: {
      title: 'German Vocabulary Quiz | Learn German Words | MicaLingo',
      description: 'Practice German vocabulary with interactive quizzes. Learn German words, translations, and example sentences for everyday use.',
      keywords: 'German vocabulary quiz, learn German words, German vocab practice, Wortschatz',
    },
    de: {
      title: 'Wortschatz-Quiz: Deutsche Wörter lernen | MicaLingo',
      description: 'Übe deutschen Wortschatz mit interaktiven Quizzen. Lerne Wörter, Übersetzungen und Beispielsätze für den Alltag.',
      keywords: 'Wortschatz Quiz, deutsche Wörter lernen, Vokabeln üben',
    },
    hu: {
      title: 'Német szókincs kvíz | Német szavak tanulása | MicaLingo',
      description: 'Gyakorold a német szókincset interaktív kvízekkel. Tanulj szavakat, fordításokat és példamondatokat a hétköznapokra.',
      keywords: 'német szókincs kvíz, német szavak, szókincs gyakorlás',
    },
  },
  articles: {
    en: {
      title: 'German Articles Quiz: der, die, das | MicaLingo',
      description: 'Master German articles der, die, and das with free quizzes. Practice noun genders, definite articles, and common German nouns.',
      keywords: 'German articles quiz, der die das, German genders, definite articles, Artikel',
    },
    de: {
      title: 'Artikel-Quiz: der, die, das üben | MicaLingo',
      description: 'Lerne deutsche Artikel der, die und das mit kostenlosen Quizzen. Übe Nomen-Geschlecht, bestimmte Artikel und häufige Substantive.',
      keywords: 'Artikel Quiz, der die das, Genus, bestimmte Artikel, Deutsch Artikel',
    },
    hu: {
      title: 'Német névelők kvíz: der, die, das | MicaLingo',
      description: 'Sajátítsd el a der, die, das névelőket ingyenes kvízekkel. Gyakorold a főnevek nemét és a határozott névelőket.',
      keywords: 'német névelők, der die das kvíz, német nemek, határozott névelő',
    },
  },
  phrases: {
    en: {
      title: 'German Phrases & Sentences Quiz | MicaLingo',
      description: 'Practice useful German phrases and sentences for conversation and travel with interactive quizzes.',
      keywords: 'German phrases, German sentences, everyday German, Redewendungen',
    },
    de: {
      title: 'Redewendungen & Sätze Quiz | MicaLingo',
      description: 'Übe nützliche deutsche Redewendungen und Sätze für Gespräch und Reise mit interaktiven Quizzen.',
      keywords: 'deutsche Redewendungen, deutsche Sätze, Alltagsdeutsch',
    },
    hu: {
      title: 'Német kifejezések és mondatok kvíz | MicaLingo',
      description: 'Gyakorold a hasznos német kifejezéseket és mondatokat beszélgetéshez és utazáshoz.',
      keywords: 'német kifejezések, német mondatok, hétköznapi német',
    },
  },
  prepositions: {
    en: {
      title: 'German Prepositions Quiz | Cases & Usage | MicaLingo',
      description: 'Practice German prepositions with quizzes: Akkusativ, Dativ, Wechselpräpositionen, and common usage.',
      keywords: 'German prepositions, Wechselpräpositionen, Dativ Akkusativ, Präpositionen',
    },
    de: {
      title: 'Präpositionen-Quiz: Fälle & Gebrauch | MicaLingo',
      description: 'Übe deutsche Präpositionen: Akkusativ, Dativ, Wechselpräpositionen und typische Verwendung.',
      keywords: 'deutsche Präpositionen, Wechselpräpositionen, Dativ Akkusativ',
    },
    hu: {
      title: 'Német prepozíciók kvíz | Esetek és használat | MicaLingo',
      description: 'Gyakorold a német prepozíciókat: Akkusativ, Dativ, Wechselpräpositionen és tipikus használat.',
      keywords: 'német prepozíciók, Wechselpräpositionen, Dativ Akkusativ',
    },
  },
  adjectives: {
    en: {
      title: 'German Adjectives Quiz | Endings & Comparison | MicaLingo',
      description: 'Practice German adjectives: endings, declension, and comparative forms like besser and am besten.',
      keywords: 'German adjectives, adjective endings, Adjektivdeklination, comparative German',
    },
    de: {
      title: 'Adjektive-Quiz: Endungen & Steigerung | MicaLingo',
      description: 'Übe deutsche Adjektive: Endungen, Deklination und Steigerung (besser, am besten).',
      keywords: 'deutsche Adjektive, Adjektivendungen, Adjektivdeklination, Steigerung',
    },
    hu: {
      title: 'Német melléknevek kvíz | Ragozás és fokozás | MicaLingo',
      description: 'Gyakorold a német mellékneveket: ragozás, végződések és fokozás (besser, am besten).',
      keywords: 'német melléknevek, melléknévragozás, fokozás',
    },
  },
  verbs: {
    en: {
      title: 'German Verbs Quiz | Conjugation & Past Tense | MicaLingo',
      description: 'Practice German verbs: conjugation, Präsens, Präteritum, Perfekt, and common irregular verbs.',
      keywords: 'German verbs, German conjugation, Präteritum, Perfekt, irregular verbs, Verben',
    },
    de: {
      title: 'Verben-Quiz: Konjugation & Vergangenheit | MicaLingo',
      description: 'Übe deutsche Verben: Konjugation, Präsens, Präteritum, Perfekt und häufige unregelmäßige Verben.',
      keywords: 'deutsche Verben, Konjugation, Präteritum, Perfekt, unregelmäßige Verben',
    },
    hu: {
      title: 'Német igék kvíz | Ragozás és múlt idő | MicaLingo',
      description: 'Gyakorold a német igéket: ragozás, Präsens, Präteritum, Perfekt és gyakori rendhagyó igék.',
      keywords: 'német igék, igeragozás, Präteritum, Perfekt, rendhagyó igék',
    },
  },
};

const GRAMMAR_CATS: Record<string, Localized> = {
  cases: {
    en: {
      title: 'German Cases: Nominativ, Akkusativ, Dativ, Genitiv | MicaLingo',
      description: 'Learn German cases (Fälle): Nominativ, Akkusativ, Dativ, and Genitiv with clear explanations and examples.',
      keywords: 'German cases, Nominativ Akkusativ Dativ Genitiv, Fälle, Kasus',
    },
    de: {
      title: 'Deutsche Fälle: Nominativ, Akkusativ, Dativ, Genitiv | MicaLingo',
      description: 'Lerne die deutschen Fälle: Nominativ, Akkusativ, Dativ und Genitiv mit klaren Erklärungen und Beispielen.',
      keywords: 'deutsche Fälle, Nominativ Akkusativ Dativ Genitiv, Kasus',
    },
    hu: {
      title: 'Német esetek: Nominativ, Akkusativ, Dativ, Genitiv | MicaLingo',
      description: 'Tanuld a német eseteket: Nominativ, Akkusativ, Dativ és Genitiv világos magyarázatokkal és példákkal.',
      keywords: 'német esetek, Nominativ Akkusativ Dativ Genitiv',
    },
  },
  tenses: {
    en: {
      title: 'German Tenses: Präsens, Perfekt, Präteritum | MicaLingo',
      description: 'Learn German tenses (Zeitformen): present, perfect, simple past, future, and when to use each form.',
      keywords: 'German tenses, Präsens Perfekt Präteritum, Zeitformen',
    },
    de: {
      title: 'Deutsche Zeitformen: Präsens, Perfekt, Präteritum | MicaLingo',
      description: 'Lerne deutsche Zeitformen: Präsens, Perfekt, Präteritum, Futur und wann du welche Form verwendest.',
      keywords: 'deutsche Zeitformen, Präsens Perfekt Präteritum, Tempora',
    },
    hu: {
      title: 'Német igeidők: Präsens, Perfekt, Präteritum | MicaLingo',
      description: 'Tanuld a német igeidőket: jelen idő, Perfekt, Präteritum, jövő idő, és mikor melyiket használd.',
      keywords: 'német igeidők, Präsens Perfekt Präteritum',
    },
  },
  articles: {
    en: {
      title: 'German Articles & Genders: der, die, das | MicaLingo',
      description: 'Learn German articles and noun genders. Understand der, die, das, indefinite articles, and gender patterns.',
      keywords: 'German articles, der die das, German genders, Artikel Geschlecht',
    },
    de: {
      title: 'Artikel & Geschlechter: der, die, das | MicaLingo',
      description: 'Lerne deutsche Artikel und Nomen-Geschlechter. Verstehe der, die, das, unbestimmte Artikel und Genus-Muster.',
      keywords: 'deutsche Artikel, der die das, Genus, Geschlecht',
    },
    hu: {
      title: 'Német névelők és nemek: der, die, das | MicaLingo',
      description: 'Tanuld a német névelőket és a főnevek nemét. Értsd a der, die, das, a határozatlan névelőket és a nemi mintákat.',
      keywords: 'német névelők, der die das, német nemek',
    },
  },
  adjectives: {
    en: {
      title: 'German Adjective Declension & Endings | MicaLingo',
      description: 'Learn German adjective endings after der/die/das, ein, and with no article. Practice declension tables.',
      keywords: 'German adjective declension, adjective endings, Adjektivdeklination',
    },
    de: {
      title: 'Adjektivdeklination & Endungen | MicaLingo',
      description: 'Lerne deutsche Adjektivendungen nach der/die/das, ein und ohne Artikel. Übe Deklinationstabellen.',
      keywords: 'Adjektivdeklination, Adjektivendungen, deutsche Adjektive',
    },
    hu: {
      title: 'Német melléknévragozás és végződések | MicaLingo',
      description: 'Tanuld a német melléknévvégződéseket der/die/das, ein után és névelő nélkül. Gyakorold a ragozási táblázatokat.',
      keywords: 'német melléknévragozás, melléknévvégződések',
    },
  },
  prepositions: {
    en: {
      title: 'German Prepositions & Cases | MicaLingo',
      description: 'Learn German prepositions with Akkusativ, Dativ, Genitiv, and two-way (Wechsel) prepositions.',
      keywords: 'German prepositions, Wechselpräpositionen, Präpositionen mit Kasus',
    },
    de: {
      title: 'Präpositionen & Fälle | MicaLingo',
      description: 'Lerne deutsche Präpositionen mit Akkusativ, Dativ, Genitiv und Wechselpräpositionen.',
      keywords: 'Präpositionen, Wechselpräpositionen, Präpositionen mit Kasus',
    },
    hu: {
      title: 'Német prepozíciók és esetek | MicaLingo',
      description: 'Tanuld a német prepozíciókat Akkusativ, Dativ, Genitiv és Wechselpräpositionen használattal.',
      keywords: 'német prepozíciók, Wechselpräpositionen',
    },
  },
  'sentence-structure': {
    en: {
      title: 'German Sentence Structure & Word Order | MicaLingo',
      description: 'Learn German sentence structure: verb second, subordinate clauses, weil/dass, and question order.',
      keywords: 'German sentence structure, German word order, Satzbau, verb second',
    },
    de: {
      title: 'Satzbau & Wortstellung im Deutschen | MicaLingo',
      description: 'Lerne deutschen Satzbau: Verbzweitstellung, Nebensätze, weil/dass und Fragewortstellung.',
      keywords: 'Satzbau, Wortstellung, Verbzweitstellung, Nebensätze',
    },
    hu: {
      title: 'Német szórend és mondatszerkezet | MicaLingo',
      description: 'Tanuld a német szórendet: ige a második helyen, mellékmondatok, weil/dass és a kérdő szórend.',
      keywords: 'német szórend, mondatszerkezet, mellékmondat',
    },
  },
};

const DEFAULT_COPY = HOME;
const NOINDEX_PATHS = new Set([
  '/login',
  '/settings',
  '/import',
  '/create-quiz',
  '/quiz',
  '/results',
  '/statistics',
]);

export type ResolvedSeo = SeoCopy & {
  canonicalPath: string;
  noindex: boolean;
  pageType: 'home' | 'quizTopic' | 'grammarCat' | 'learnGuide' | 'page';
  topic?: string;
};

function pick(map: Localized, lang: SeoLang): SeoCopy {
  return map[lang] || map.en;
}

export function resolveSeo(pathname: string, lang: SeoLang): ResolvedSeo {
  const clean = pathname.replace(/\/+$/, '') || '/';

  if (clean === '/practice') {
    return {
      ...pick(ROUTES['/quizzes'], lang),
      canonicalPath: '/quizzes',
      noindex: true,
      pageType: 'page',
    };
  }

  if (ROUTES[clean]) {
    return {
      ...pick(ROUTES[clean], lang),
      canonicalPath: clean,
      noindex: NOINDEX_PATHS.has(clean),
      pageType: clean === '/' ? 'home' : 'page',
    };
  }

  const quizTopic = clean.match(/^\/quizzes\/([^/]+)$/);
  if (quizTopic) {
    const topic = quizTopic[1];
    if (topic === 'telc-b2') {
      return {
        ...pick(ROUTES['/quizzes'], lang),
        canonicalPath: '/quizzes',
        noindex: true,
        pageType: 'page',
      };
    }
    const copy = QUIZ_TOPICS[topic];
    if (copy) {
      return { ...pick(copy, lang), canonicalPath: clean, noindex: false, pageType: 'quizTopic', topic };
    }
    return {
      title: `${capitalize(topic)} Quizzes | MicaLingo`,
      description: `Practice German ${topic} with MicaLingo quizzes.`,
      keywords: `German ${topic} quiz, learn German`,
      canonicalPath: clean,
      noindex: false,
      pageType: 'quizTopic',
      topic,
    };
  }

  const practiceTopic = clean.match(/^\/practice\/([^/]+)$/);
  if (practiceTopic) {
    const topic = practiceTopic[1];
    const copy = QUIZ_TOPICS[topic];
    if (copy) {
      return {
        ...pick(copy, lang),
        canonicalPath: `/quizzes/${topic}`,
        noindex: true,
        pageType: 'quizTopic',
        topic,
      };
    }
    return {
      title: `${capitalize(topic)} Quizzes | MicaLingo`,
      description: `Practice German ${topic} with MicaLingo quizzes.`,
      keywords: `German ${topic} quiz, learn German`,
      canonicalPath: '/quizzes',
      noindex: true,
      pageType: 'quizTopic',
      topic,
    };
  }

  const learnGuide = clean.match(/^\/learn\/([^/]+)$/);
  if (learnGuide) {
    const topic = learnGuide[1];
    if (topic === 'german-exam-prep') {
      const guide = getLearnGuide('public-and-private');
      if (guide) {
        return {
          title: `${guideTitle(guide, lang)} | MicaLingo`,
          description: guideDescription(guide, lang),
          keywords: 'German Hungarian library, private quizzes, learn German, MicaLingo',
          canonicalPath: '/learn/public-and-private',
          noindex: true,
          pageType: 'learnGuide',
          topic: 'public-and-private',
        };
      }
    }
    const guide = getLearnGuide(topic);
    if (guide) {
      return {
        title: `${guideTitle(guide, lang)} | MicaLingo`,
        description: guideDescription(guide, lang),
        keywords: `German ${topic.replace(/-/g, ' ')}, learn German, MicaLingo`,
        canonicalPath: clean,
        noindex: false,
        pageType: 'learnGuide',
        topic,
      };
    }
    return {
      ...pick(ROUTES['/learn'], lang),
      canonicalPath: '/learn',
      noindex: true,
      pageType: 'page',
    };
  }

  const grammarCat = clean.match(/^\/grammar\/([^/]+)$/);
  if (grammarCat) {
    const topic = grammarCat[1];
    const copy = GRAMMAR_CATS[topic];
    if (copy) {
      return { ...pick(copy, lang), canonicalPath: clean, noindex: false, pageType: 'grammarCat', topic };
    }
    return {
      title: `German ${titleize(topic)} | MicaLingo`,
      description: `Learn German ${titleize(topic).toLowerCase()} with MicaLingo grammar guides.`,
      keywords: `German ${titleize(topic).toLowerCase()}, German grammar`,
      canonicalPath: clean,
      noindex: false,
      pageType: 'grammarCat',
      topic,
    };
  }

  if (clean.startsWith('/learning-materials/private')) {
    return {
      ...pick(ROUTES['/learning-materials'], lang),
      canonicalPath: '/learning-materials',
      noindex: true,
      pageType: 'page',
    };
  }

  if (clean.startsWith('/learning-materials/')) {
    return {
      ...pick(ROUTES['/learning-materials'], lang),
      canonicalPath: clean,
      noindex: false,
      pageType: 'page',
    };
  }

  return {
    ...pick(DEFAULT_COPY, lang),
    canonicalPath: clean,
    noindex: true,
    pageType: 'page',
  };
}

export function canonicalHref(pathname: string, lang: SeoLang = 'en') {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const base = clean === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${clean}/`;
  if (lang === 'en') return base;
  return `${base}?lang=${lang}`;
}

export function hreflangAlternates(pathname: string) {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return [
    { lang: 'en', href: canonicalHref(clean, 'en') },
    { lang: 'de', href: canonicalHref(clean, 'de') },
    { lang: 'hu', href: canonicalHref(clean, 'hu') },
    { lang: 'x-default', href: canonicalHref(clean, 'en') },
  ];
}

const OG_LOCALE: Record<SeoLang, string> = {
  en: 'en_US',
  de: 'de_DE',
  hu: 'hu_HU',
};

export function ogLocale(lang: SeoLang) {
  return OG_LOCALE[lang];
}

export function buildJsonLd(seo: ResolvedSeo, lang: SeoLang, canonical: string) {
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite',
      '@id': `${SITE_ORIGIN}/#website`,
      url: `${SITE_ORIGIN}/`,
      name: 'MicaLingo',
      alternateName: ['Learn German', 'Deutsch lernen', 'Német tanulás', 'German quizzes'],
      description: HOME[lang].description,
      inLanguage: SEO_LANGS,
      publisher: { '@id': `${SITE_ORIGIN}/#org` },
    },
    {
      '@type': 'EducationalOrganization',
      '@id': `${SITE_ORIGIN}/#org`,
      name: 'MicaLingo',
      url: `${SITE_ORIGIN}/`,
      logo: `${SITE_ORIGIN}/logo.png`,
      description: HOME.en.description,
      email: 'support.micalingo@gmail.com',
      knowsAbout: [
        'German language',
        'German grammar',
        'German vocabulary',
        'German articles',
        'German verbs',
        'Language quizzes',
      ],
    },
    {
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: seo.title,
      description: seo.description,
      inLanguage: lang,
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      about: ['German language learning', 'German quizzes', 'German grammar', 'German vocabulary'],
      isAccessibleForFree: true,
    },
  ];

  if (seo.pageType === 'home') {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: homeFaq(lang).map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    });
  }

  if (seo.pageType === 'quizTopic' && seo.topic) {
    graph.push({
      '@type': 'LearningResource',
      name: seo.title,
      description: seo.description,
      learningResourceType: 'Quiz',
      educationalUse: 'practice',
      isAccessibleForFree: true,
      inLanguage: ['de', lang],
      teaches: topicTeaches(seo.topic, lang),
      url: canonical,
    });
  }

  if (seo.pageType === 'grammarCat' && seo.topic) {
    graph.push({
      '@type': 'LearningResource',
      name: seo.title,
      description: seo.description,
      learningResourceType: 'Lesson',
      educationalUse: 'instruction',
      isAccessibleForFree: true,
      inLanguage: ['de', lang],
      teaches: `German ${seo.topic.replace(/-/g, ' ')}`,
      url: canonical,
    });
  }

  if (seo.pageType === 'learnGuide' && seo.topic) {
    const guide = getLearnGuide(seo.topic);
    graph.push({
      '@type': 'Article',
      headline: seo.title,
      description: seo.description,
      datePublished: guide?.published || '2026-08-31',
      dateModified: guide?.published || '2026-08-31',
      inLanguage: lang,
      isAccessibleForFree: true,
      url: canonical,
      author: { '@id': `${SITE_ORIGIN}/#org` },
      publisher: { '@id': `${SITE_ORIGIN}/#org` },
      mainEntityOfPage: { '@id': `${canonical}#webpage` },
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

function homeFaq(lang: SeoLang): { q: string; a: string }[] {
  if (lang === 'de') {
    return [
      {
        q: 'Wie kann ich bei MicaLingo kostenlos Deutsch lernen?',
        a: 'MicaLingo bietet kostenlose Deutsch-Quizze zu Wortschatz, Grammatik, Artikeln (der, die, das), Verben, Adjektiven und Präpositionen sowie Lese- und Hörmaterialien.',
      },
      {
        q: 'Gibt es ein Quiz für deutsche Artikel der, die, das?',
        a: 'Ja. Unter Quizze findest du ein Artikel-Quiz, mit dem du der, die, das und das Genus deutscher Nomen übst.',
      },
      {
        q: 'Kann ich deutsche Verben und Grammatik üben?',
        a: 'Ja. Es gibt Verben-Quizze (Konjugation, Vergangenheit) und Grammatikseiten zu Fällen, Zeitformen, Adjektiven, Präpositionen und Satzbau.',
      },
      {
        q: 'In welchen Sprachen ist MicaLingo verfügbar?',
        a: 'Die Oberfläche gibt es auf Englisch, Deutsch und Ungarisch. Öffentlich übst du Deutsch mit ungarischer Bedeutung. Nach dem Google-Login können private Listen jedes Sprachenpaar sein.',
      },
      {
        q: 'Sind die öffentlichen Quizze nur Deutsch–Ungarisch?',
        a: 'Ja. Die offene Bibliothek ist für Ungarisch sprechende Deutschlernende. Mit Google-Konto baust du eine private Bibliothek in beliebigen Sprachen und erzeugst eigene Quizze.',
      },
      {
        q: 'Brauche ich ein Konto zum Üben?',
        a: 'Nein. Öffentliche DE–HU-Quizze, Grammatik-Primer und Ratgeber funktionieren ohne Login. Ein Google-Konto braucht es nur für private Bibliothek, markierte Wörter und Importe.',
      },
    ];
  }
  if (lang === 'hu') {
    return [
      {
        q: 'Hogyan tanulhatok ingyen németet a MicaLingo-n?',
        a: 'A MicaLingo ingyenes német kvízeket kínál szókinccsel, nyelvtannal, névelőkkel (der, die, das), igékkel, melléknevekkel és prepozíciókkal, plusz olvasási és hallásértési anyagokat.',
      },
      {
        q: 'Van kvíz a der, die, das névelőkhöz?',
        a: 'Igen. A Kvízek menüben megtalálod a névelők kvízt, amellyel a der, die, das és a főnevek nemét gyakorolhatod.',
      },
      {
        q: 'Gyakorolhatom a német igéket és a nyelvtant?',
        a: 'Igen. Van ige kvíz (ragozás, múlt idő) és nyelvtan oldalak esetekhez, igeidőkhöz, melléknevekhez, prepozíciókhoz és szórendhez.',
      },
      {
        q: 'Milyen nyelveken érhető el a MicaLingo?',
        a: 'A felület angolul, németül és magyarul működik. Nyilvánosan németet gyakorolsz magyar jelentéssel. Google-belépés után a saját lista bármilyen nyelvpár lehet.',
      },
      {
        q: 'A nyilvános kvízek csak német–magyarok?',
        a: 'Igen. A nyilvános könyvtár magyarul tanuló németeseknek készült. Google-fiókkal saját könyvtárat állíthatsz be bármilyen nyelven, és generálhatsz saját kvízeket.',
      },
      {
        q: 'Kell fiók a gyakorláshoz?',
        a: 'Nem. A nyilvános HU–DE kvízek, nyelvtan-bevezetők és útmutatók belépés nélkül mennek. Google-fiók csak a saját könyvtárhoz kell.',
      },
    ];
  }
  return [
    {
      q: 'How can I learn German for free on MicaLingo?',
      a: 'MicaLingo offers free German quizzes for vocabulary, grammar, articles (der, die, das), verbs, adjectives, and prepositions, plus reading and listening materials.',
    },
    {
      q: 'Is there a quiz for German articles der, die, das?',
      a: 'Yes. Open Quizzes and choose the Articles quiz to practice der, die, das and German noun genders.',
    },
    {
      q: 'Can I practice German verbs and grammar?',
      a: 'Yes. There are verb quizzes (conjugation and past tense) and grammar pages for cases, tenses, adjectives, prepositions, and sentence structure.',
    },
    {
      q: 'Which languages is MicaLingo available in?',
      a: 'The interface is available in English, German, and Hungarian. Public practice is German with Hungarian meanings. After Google login, your private lists can be any language pair.',
    },
    {
      q: 'Are the public quizzes only German–Hungarian?',
      a: 'Yes. The open library is for Hungarian learners of German. Sign in with a Google account to set up a private library in any languages and generate your own quizzes.',
    },
    {
      q: 'Do I need an account to practise?',
      a: 'No. Public HU–DE quizzes, grammar primers and study guides work without login. A Google account is only needed to save a private library, marked words and imported files.',
    },
  ];
}

function topicTeaches(topic: string, lang: SeoLang) {
  const map: Record<string, Record<SeoLang, string>> = {
    vocabulary: { en: 'German vocabulary', de: 'deutscher Wortschatz', hu: 'német szókincs' },
    articles: { en: 'German articles der die das', de: 'deutsche Artikel der die das', hu: 'német névelők der die das' },
    verbs: { en: 'German verbs and conjugation', de: 'deutsche Verben und Konjugation', hu: 'német igék és ragozás' },
    adjectives: { en: 'German adjectives', de: 'deutsche Adjektive', hu: 'német melléknevek' },
    prepositions: { en: 'German prepositions', de: 'deutsche Präpositionen', hu: 'német prepozíciók' },
    phrases: { en: 'German phrases and sentences', de: 'deutsche Redewendungen und Sätze', hu: 'német kifejezések és mondatok' },
  };
  return map[topic]?.[lang] || `German ${topic}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function titleize(value: string) {
  return value.split('-').map((part) => capitalize(part)).join(' ');
}

/** Public URLs for sitemap generation (trailing-slash paths except home). */
export const SITEMAP_PATHS = [
  '/',
  '/quizzes/',
  '/library/',
  '/grammar/',
  '/vocabulary/',
  '/quizzes/vocabulary/',
  '/quizzes/articles/',
  '/quizzes/phrases/',
  '/quizzes/prepositions/',
  '/quizzes/adjectives/',
  '/quizzes/verbs/',
  '/grammar/cases/',
  '/grammar/tenses/',
  '/grammar/articles/',
  '/grammar/adjectives/',
  '/grammar/prepositions/',
  '/grammar/sentence-structure/',
  '/learning-materials/',
  '/learning-materials/reading/',
  '/learning-materials/reading/false-friends/',
  '/learning-materials/reading/idioms/',
  '/learning-materials/listening/',
  '/learn/',
  '/learn/public-and-private/',
  '/learn/der-die-das/',
  '/learn/german-cases/',
  '/about/',
  '/privacy/',
  '/terms/',
  '/cookies/',
  '/impressum/',
];
