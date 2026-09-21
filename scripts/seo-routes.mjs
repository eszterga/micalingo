/**
 * Public routes for GitHub Pages SPA fallback + sitemap generation.
 * Keep in sync with App.tsx public routes and src/lib/seo.ts SITEMAP_PATHS.
 */
export const SITE_ORIGIN = 'https://micalingo.com';

const QUIZ_TOPICS = ['vocabulary', 'articles', 'phrases', 'prepositions', 'adjectives', 'verbs'];
const GRAMMAR_CATS = ['cases', 'tenses', 'articles', 'adjectives', 'prepositions', 'sentence-structure'];
const ARTICLE_CATS = ['history', 'animals', 'music', 'culture', 'politics', 'science', 'celebrities'];
const BOOK_CATS = ['classics', 'short-stories'];
const MUSIC_CATS = ['pop', 'rock', 'other-music'];
const PODCAST_CATS = ['politics', 'travel', 'psychology', 'other-podcasts'];
const AUDIOBOOK_CATS = ['fiction', 'non-fiction', 'other-audiobooks'];

/** Old URLs that must not redirect in JS. Serve content + point canonical at the live page. */
export const LEGACY_CANONICAL = {
  '/practice': '/quizzes',
  ...Object.fromEntries(QUIZ_TOPICS.map((topic) => [`/practice/${topic}`, `/quizzes/${topic}`])),
  '/learn/german-exam-prep': '/learn/public-and-private',
  '/learn/weekly-german-practice': '/learn',
};

export const INDEXABLE_ROUTES = [
  '/',
  '/quizzes',
  ...QUIZ_TOPICS.map((topic) => `/quizzes/${topic}`),
  '/library',
  '/grammar',
  ...GRAMMAR_CATS.map((cat) => `/grammar/${cat}`),
  '/vocabulary',
  '/statistics',
  '/learning-materials',
  '/learning-materials/reading',
  '/learning-materials/reading/false-friends',
  '/learning-materials/reading/idioms',
  ...ARTICLE_CATS.map((cat) => `/learning-materials/reading/articles/${cat}`),
  ...BOOK_CATS.map((cat) => `/learning-materials/reading/books/${cat}`),
  '/learning-materials/listening',
  ...MUSIC_CATS.map((cat) => `/learning-materials/listening/music/${cat}`),
  ...PODCAST_CATS.map((cat) => `/learning-materials/listening/podcasts/${cat}`),
  ...AUDIOBOOK_CATS.map((cat) => `/learning-materials/listening/audiobooks/${cat}`),
  '/learn',
  '/learn/public-and-private',
  '/learn/der-die-das',
  '/learn/german-cases',
  '/about',
  '/privacy',
  '/terms',
  '/cookies',
  '/impressum',
];

/** Routes that must return HTTP 200 on GitHub Pages (copied as dist/<path>/index.html). */
export const PUBLIC_SPA_ROUTES = [
  ...INDEXABLE_ROUTES,
  '/settings',
  '/login',
  ...Object.keys(LEGACY_CANONICAL),
];

/** Sitemap entries: one loc per page (no ?lang= duplicates). */
export const SITEMAP_ENTRIES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/quizzes', changefreq: 'weekly', priority: '0.9' },
  { path: '/library', changefreq: 'daily', priority: '0.9' },
  { path: '/grammar', changefreq: 'monthly', priority: '0.8' },
  { path: '/vocabulary', changefreq: 'weekly', priority: '0.8' },
  { path: '/statistics', changefreq: 'weekly', priority: '0.5' },
  ...QUIZ_TOPICS.map((topic) => ({ path: `/quizzes/${topic}`, changefreq: 'weekly', priority: '0.8' })),
  ...GRAMMAR_CATS.map((cat) => ({ path: `/grammar/${cat}`, changefreq: 'monthly', priority: '0.7' })),
  { path: '/learning-materials', changefreq: 'weekly', priority: '0.75' },
  { path: '/learning-materials/reading', changefreq: 'weekly', priority: '0.7' },
  { path: '/learning-materials/reading/false-friends', changefreq: 'monthly', priority: '0.65' },
  { path: '/learning-materials/reading/idioms', changefreq: 'monthly', priority: '0.65' },
  ...ARTICLE_CATS.map((cat) => ({
    path: `/learning-materials/reading/articles/${cat}`,
    changefreq: 'weekly',
    priority: '0.55',
  })),
  ...BOOK_CATS.map((cat) => ({
    path: `/learning-materials/reading/books/${cat}`,
    changefreq: 'weekly',
    priority: '0.55',
  })),
  { path: '/learning-materials/listening', changefreq: 'weekly', priority: '0.7' },
  ...MUSIC_CATS.map((cat) => ({
    path: `/learning-materials/listening/music/${cat}`,
    changefreq: 'weekly',
    priority: '0.5',
  })),
  ...PODCAST_CATS.map((cat) => ({
    path: `/learning-materials/listening/podcasts/${cat}`,
    changefreq: 'weekly',
    priority: '0.5',
  })),
  ...AUDIOBOOK_CATS.map((cat) => ({
    path: `/learning-materials/listening/audiobooks/${cat}`,
    changefreq: 'weekly',
    priority: '0.5',
  })),
  { path: '/learn', changefreq: 'weekly', priority: '0.9' },
  { path: '/learn/public-and-private', changefreq: 'monthly', priority: '0.85' },
  { path: '/learn/der-die-das', changefreq: 'monthly', priority: '0.85' },
  { path: '/learn/german-cases', changefreq: 'monthly', priority: '0.85' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/cookies', changefreq: 'yearly', priority: '0.3' },
  { path: '/impressum', changefreq: 'yearly', priority: '0.3' },
];

export function routeCanonicalPath(route) {
  return LEGACY_CANONICAL[route] || route;
}

export function routeNoindex(_route) {
  return false;
}

export function absoluteUrl(path) {
  if (!path || path === '/') return `${SITE_ORIGIN}/`;
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  const trimmed = withSlash.replace(/\/+$/, '');
  // Slashless canonical: dist/quizzes.html makes /quizzes HTTP 200 on GitHub Pages.
  return `${SITE_ORIGIN}${trimmed}`;
}

export const SEO_LANGS = ['en', 'de', 'hu'];

export function languageUrl(path, lang) {
  const base = absoluteUrl(path);
  return lang === 'en' ? base : `${base}?lang=${lang}`;
}

export const HREFLANG_TAGS = (path) =>
  [
    { lang: 'en', href: languageUrl(path, 'en') },
    { lang: 'de', href: languageUrl(path, 'de') },
    { lang: 'hu', href: languageUrl(path, 'hu') },
    { lang: 'x-default', href: languageUrl(path, 'en') },
  ];

/** English first-crawl titles/descriptions for static GitHub Pages shells. */
export const PAGE_META = {
  '/': {
    title: 'Learn German: Quizzes, Grammar & Vocabulary | MicaLingo',
    description:
      'Learn German online with free German–Hungarian quizzes for vocabulary, grammar, articles (der, die, das), verbs, adjectives, and prepositions. Sign in with Google to build private quizzes in any languages.',
  },
  '/quizzes': {
    title: 'German Quizzes: Vocabulary, Articles & Verbs | MicaLingo',
    description:
      'Free German quizzes for vocabulary, articles (der, die, das), verbs, adjectives, phrases, and prepositions. Practice German online and track your progress.',
  },
  '/quizzes/vocabulary': {
    title: 'German Vocabulary Quiz | Learn German Words | MicaLingo',
    description: 'Practice German vocabulary with interactive quizzes. Learn German words, translations, and example sentences for everyday use.',
  },
  '/quizzes/articles': {
    title: 'German Articles Quiz: der, die, das | MicaLingo',
    description: 'Master German articles der, die, and das with free quizzes. Practice noun genders, definite articles, and common German nouns.',
  },
  '/quizzes/phrases': {
    title: 'German Phrases & Sentences Quiz | MicaLingo',
    description: 'Practice useful German phrases and sentences for conversation and travel with interactive quizzes.',
  },
  '/quizzes/prepositions': {
    title: 'German Prepositions Quiz | Cases & Usage | MicaLingo',
    description: 'Practice German prepositions with quizzes: Akkusativ, Dativ, Wechselpräpositionen, and common usage.',
  },
  '/quizzes/adjectives': {
    title: 'German Adjectives Quiz | Endings & Comparison | MicaLingo',
    description: 'Practice German adjectives: endings, declension, and comparative forms like besser and am besten.',
  },
  '/quizzes/verbs': {
    title: 'German Verbs Quiz | Conjugation & Past Tense | MicaLingo',
    description: 'Practice German verbs: conjugation, Präsens, Präteritum, Perfekt, and common irregular verbs.',
  },
  '/library': {
    title: 'German Learning Library: Vocabulary & Materials | MicaLingo',
    description: 'Browse public German–Hungarian vocabulary lists plus reading and listening materials. After Google login, organise a private library in any languages.',
  },
  '/grammar': {
    title: 'German Grammar: Cases, Tenses, Articles & More | MicaLingo',
    description: 'Learn German grammar: cases (Nominativ, Akkusativ, Dativ, Genitiv), tenses, articles and genders, adjective declension, prepositions, and sentence structure.',
  },
  '/grammar/cases': {
    title: 'German Cases: Nominativ, Akkusativ, Dativ, Genitiv | MicaLingo',
    description: 'Learn German cases (Fälle): Nominativ, Akkusativ, Dativ, and Genitiv with clear explanations and examples.',
  },
  '/grammar/tenses': {
    title: 'German Tenses: Präsens, Perfekt, Präteritum | MicaLingo',
    description: 'Learn German tenses (Zeitformen): present, perfect, simple past, future, and when to use each form.',
  },
  '/grammar/articles': {
    title: 'German Articles & Genders: der, die, das | MicaLingo',
    description: 'Learn German articles and noun genders. Understand der, die, das, indefinite articles, and gender patterns.',
  },
  '/grammar/adjectives': {
    title: 'German Adjective Declension & Endings | MicaLingo',
    description: 'Learn German adjective endings after der/die/das, ein, and with no article. Practice declension tables.',
  },
  '/grammar/prepositions': {
    title: 'German Prepositions & Cases | MicaLingo',
    description: 'Learn German prepositions with Akkusativ, Dativ, Genitiv, and two-way (Wechsel) prepositions.',
  },
  '/grammar/sentence-structure': {
    title: 'German Sentence Structure & Word Order | MicaLingo',
    description: 'Learn German sentence structure: verb second, subordinate clauses, weil/dass, and question order.',
  },
  '/statistics': {
    title: 'German Study Statistics & Quiz Progress | MicaLingo',
    description: 'Track German quiz scores and learning progress for vocabulary, grammar, articles, and verbs.',
  },
  '/vocabulary': {
    title: 'German Vocabulary List: Words to Learn & Review | MicaLingo',
    description: 'Build German vocabulary with searchable word lists, example sentences, and translations. Review German words for everyday use.',
  },
  '/practice': {
    title: 'German Practice Exercises | MicaLingo',
    description: 'Practice German topics with focused exercises for vocabulary, grammar, articles, and verbs.',
  },
  '/practice/vocabulary': {
    title: 'German Vocabulary Practice | MicaLingo',
    description: 'Practice German vocabulary with focused exercises and quizzes.',
  },
  '/practice/articles': {
    title: 'German Articles Practice: der, die, das | MicaLingo',
    description: 'Practice German articles der, die, das and noun genders.',
  },
  '/practice/phrases': {
    title: 'German Phrases Practice | MicaLingo',
    description: 'Practice German phrases and sentences for conversation.',
  },
  '/practice/prepositions': {
    title: 'German Prepositions Practice | MicaLingo',
    description: 'Practice German prepositions with Akkusativ, Dativ, and Wechselpräpositionen.',
  },
  '/practice/adjectives': {
    title: 'German Adjectives Practice | MicaLingo',
    description: 'Practice German adjective endings, declension, and comparison.',
  },
  '/practice/verbs': {
    title: 'German Verbs Practice | MicaLingo',
    description: 'Practice German verb conjugation, Präsens, Präteritum, and Perfekt.',
  },
  '/learning-materials': {
    title: 'German Learning Materials: Reading & Listening | MicaLingo',
    description: 'German reading and listening practice: articles, idioms, false friends, books, music, podcasts, and audiobooks.',
  },
  '/learning-materials/reading': {
    title: 'German Reading Practice: Articles, Idioms & Books | MicaLingo',
    description: 'Read German texts including articles, idioms, false friends, and books to grow vocabulary and comprehension.',
  },
  '/learning-materials/reading/false-friends': {
    title: 'German False Friends: Common Translation Traps | MicaLingo',
    description: 'Learn common German–English and German–Hungarian false friends so you avoid typical translation mistakes.',
  },
  '/learning-materials/reading/idioms': {
    title: 'German Idioms & Everyday Expressions | MicaLingo',
    description: 'Study useful German idioms and expressions to sound more natural in conversation.',
  },
  '/learning-materials/listening': {
    title: 'German Listening Practice: Music, Podcasts & Audio | MicaLingo',
    description: 'Improve German listening with music, podcasts, and audiobooks selected for language learners.',
  },
  '/learn': {
    title: 'German Study Guides: Articles & Cases | MicaLingo',
    description: 'Original German study guides for self-learners: public vs private library, der/die/das, and German cases.',
  },
  '/learn/public-and-private': {
    title: 'Public German–Hungarian library vs your own quizzes | MicaLingo',
    description: 'How MicaLingo works for self-learners: public quizzes are German–Hungarian; a Google login lets you build a private library in any languages.',
  },
  '/learn/der-die-das': {
    title: 'How to learn German articles der, die, das | MicaLingo',
    description: 'A method for German noun gender: learn the article with the noun, use ending patterns, and quiz the rest.',
  },
  '/learn/german-cases': {
    title: 'German cases without panic | MicaLingo',
    description: 'Nominativ, Akkusativ, Dativ and Genitiv for self-learners, plus Wechselpräpositionen for location vs direction.',
  },
  '/about': {
    title: 'About MicaLingo — Learn German Online',
    description: 'Who runs MicaLingo, how the German quizzes and grammar notes are made, and how to contact the project.',
  },
  '/privacy': {
    title: 'Privacy Policy | MicaLingo',
    description: 'Privacy policy for the MicaLingo website and mobile app.',
  },
  '/terms': {
    title: 'Terms of Service | MicaLingo',
    description: 'Terms of service for using MicaLingo.',
  },
  '/cookies': {
    title: 'Cookie Policy | MicaLingo',
    description: 'How MicaLingo and Google use cookies, including advertising cookies for AdSense.',
  },
  '/impressum': {
    title: 'Impressum | MicaLingo',
    description: 'Legal notice and operator information for MicaLingo.',
  },
  '/settings': {
    title: 'Settings | MicaLingo',
    description: 'Manage your MicaLingo app settings.',
  },
  '/login': {
    title: 'Log in | MicaLingo',
    description: 'Sign in to MicaLingo to save your German learning progress.',
  },
};

const CATEGORY_PAGE_META = {
  '/learning-materials/reading/articles/history': ['German History Reading Practice', 'Read German articles about history to grow vocabulary and comprehension.'],
  '/learning-materials/reading/articles/animals': ['German Articles About Animals', 'Read German texts about animals and wildlife for vocabulary practice.'],
  '/learning-materials/reading/articles/music': ['German Articles About Music', 'Read German texts about music, composers, and genres.'],
  '/learning-materials/reading/articles/culture': ['German Culture Reading Practice', 'Read German articles about art, concerts, and cultural life.'],
  '/learning-materials/reading/articles/politics': ['German Politics Reading Practice', 'Read German articles about government and society.'],
  '/learning-materials/reading/articles/science': ['German Science Reading Practice', 'Read German articles about discoveries and research.'],
  '/learning-materials/reading/articles/celebrities': ['German Celebrity Articles', 'Read German texts about famous people and pop culture.'],
  '/learning-materials/reading/books/classics': ['Classic German Literature', 'Read classic literature selections for German learners.'],
  '/learning-materials/reading/books/short-stories': ['German Short Stories', 'Short German stories for daily reading practice.'],
  '/learning-materials/listening/music/pop': ['German Pop Music Listening', 'Practice German listening with pop music.'],
  '/learning-materials/listening/music/rock': ['German Rock Music Listening', 'Practice German listening with rock and alternative music.'],
  '/learning-materials/listening/music/other-music': ['German Music Listening Practice', 'Practice German listening with songs across genres.'],
  '/learning-materials/listening/podcasts/politics': ['German Politics Podcasts', 'Listen to German podcasts about government and society.'],
  '/learning-materials/listening/podcasts/travel': ['German Travel Podcasts', 'Listen to German travel stories and tips.'],
  '/learning-materials/listening/podcasts/psychology': ['German Psychology Podcasts', 'Listen to German podcasts about mind and behaviour.'],
  '/learning-materials/listening/podcasts/other-podcasts': ['German Podcasts for Learners', 'Practice German listening with podcasts on mixed topics.'],
  '/learning-materials/listening/audiobooks/fiction': ['German Fiction Audiobooks', 'Listen to German fiction for comprehension practice.'],
  '/learning-materials/listening/audiobooks/non-fiction': ['German Non-Fiction Audiobooks', 'Listen to German non-fiction for learners.'],
  '/learning-materials/listening/audiobooks/other-audiobooks': ['German Audiobooks for Learners', 'Practice German listening with audiobooks.'],
};

for (const [path, [title, description]] of Object.entries(CATEGORY_PAGE_META)) {
  PAGE_META[path] = { title: `${title} | MicaLingo`, description };
}

export const NOT_FOUND_META = {
  title: 'Page not found | MicaLingo',
  description: 'This page does not exist. Open MicaLingo to learn German with quizzes, grammar, and vocabulary.',
};

