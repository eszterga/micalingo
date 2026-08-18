/**
 * Public, indexable routes for GitHub Pages SPA fallback + sitemap generation.
 * Keep in sync with App.tsx public routes that should appear in Google Search.
 */
export const SITE_ORIGIN = 'https://micalingo.com';

/** Routes that must return HTTP 200 on GitHub Pages (copied as dist/<path>/index.html). */
export const PUBLIC_SPA_ROUTES = [
  '/',
  '/quizzes',
  '/quizzes/vocabulary',
  '/quizzes/articles',
  '/quizzes/phrases',
  '/quizzes/prepositions',
  '/quizzes/adjectives',
  '/quizzes/verbs',
  '/library',
  '/grammar',
  '/grammar/cases',
  '/grammar/tenses',
  '/grammar/articles',
  '/grammar/adjectives',
  '/grammar/prepositions',
  '/grammar/sentence-structure',
  '/statistics',
  '/vocabulary',
  '/practice',
  '/practice/vocabulary',
  '/practice/articles',
  '/practice/phrases',
  '/practice/prepositions',
  '/practice/adjectives',
  '/practice/verbs',
  '/learning-materials',
  '/learning-materials/reading',
  '/learning-materials/reading/false-friends',
  '/learning-materials/reading/idioms',
  '/learning-materials/listening',
  '/about',
  '/privacy',
  '/terms',
  '/cookies',
  '/impressum',
  '/settings',
  '/login',
];

/** Sitemap entries: path → SEO hints (only crawlable, unique public pages). */
export const SITEMAP_ENTRIES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/quizzes', changefreq: 'weekly', priority: '0.9' },
  { path: '/library', changefreq: 'daily', priority: '0.9' },
  { path: '/grammar', changefreq: 'monthly', priority: '0.8' },
  { path: '/statistics', changefreq: 'weekly', priority: '0.7' },
  { path: '/vocabulary', changefreq: 'weekly', priority: '0.8' },
  { path: '/practice', changefreq: 'weekly', priority: '0.8' },
  { path: '/quizzes/vocabulary', changefreq: 'weekly', priority: '0.8' },
  { path: '/quizzes/articles', changefreq: 'weekly', priority: '0.8' },
  { path: '/quizzes/phrases', changefreq: 'weekly', priority: '0.8' },
  { path: '/quizzes/prepositions', changefreq: 'weekly', priority: '0.8' },
  { path: '/quizzes/adjectives', changefreq: 'weekly', priority: '0.8' },
  { path: '/quizzes/verbs', changefreq: 'weekly', priority: '0.8' },
  { path: '/practice/vocabulary', changefreq: 'weekly', priority: '0.75' },
  { path: '/practice/articles', changefreq: 'weekly', priority: '0.75' },
  { path: '/practice/phrases', changefreq: 'weekly', priority: '0.75' },
  { path: '/practice/prepositions', changefreq: 'weekly', priority: '0.75' },
  { path: '/practice/adjectives', changefreq: 'weekly', priority: '0.75' },
  { path: '/practice/verbs', changefreq: 'weekly', priority: '0.75' },
  { path: '/grammar/cases', changefreq: 'monthly', priority: '0.7' },
  { path: '/grammar/tenses', changefreq: 'monthly', priority: '0.7' },
  { path: '/grammar/articles', changefreq: 'monthly', priority: '0.7' },
  { path: '/grammar/adjectives', changefreq: 'monthly', priority: '0.7' },
  { path: '/grammar/prepositions', changefreq: 'monthly', priority: '0.7' },
  { path: '/grammar/sentence-structure', changefreq: 'monthly', priority: '0.7' },
  { path: '/learning-materials', changefreq: 'weekly', priority: '0.75' },
  { path: '/learning-materials/reading', changefreq: 'weekly', priority: '0.7' },
  { path: '/learning-materials/reading/false-friends', changefreq: 'monthly', priority: '0.65' },
  { path: '/learning-materials/reading/idioms', changefreq: 'monthly', priority: '0.65' },
  { path: '/learning-materials/listening', changefreq: 'weekly', priority: '0.7' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/cookies', changefreq: 'yearly', priority: '0.3' },
  { path: '/impressum', changefreq: 'yearly', priority: '0.3' },
];

export function absoluteUrl(path) {
  if (!path || path === '/') return `${SITE_ORIGIN}/`;
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  const trimmed = withSlash.replace(/\/+$/, '');
  // GitHub Pages 301s /quizzes → /quizzes/, so canonicals must use the slash.
  return `${SITE_ORIGIN}${trimmed}/`;
}
