import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_ORIGIN = 'https://micalingo.com';
const DEFAULT_TITLE = 'MicaLingo - German Exam Preparation';
const DEFAULT_DESCRIPTION =
  'Improve your German skills with MicaLingo. Create custom quizzes, practice vocabulary, learn grammar, and prepare for your German exams effectively.';

type SeoConfig = {
  title: string;
  description: string;
  /** When true, ask crawlers not to index (login, sessions, private tools). */
  noindex?: boolean;
};

const ROUTE_SEO: Record<string, SeoConfig> = {
  '/': {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  '/quizzes': {
    title: 'German Quizzes | MicaLingo',
    description: 'Practice German with vocabulary, articles, phrases, prepositions, adjectives, and verb quizzes.',
  },
  '/library': {
    title: 'German Learning Library | MicaLingo',
    description: 'Browse your German learning library and organize vocabulary and study materials.',
  },
  '/grammar': {
    title: 'German Grammar | MicaLingo',
    description: 'Learn German grammar: cases, tenses, articles, adjectives, prepositions, and sentence structure.',
  },
  '/statistics': {
    title: 'Study Statistics | MicaLingo',
    description: 'Track your German quiz results and study progress with MicaLingo statistics.',
  },
  '/vocabulary': {
    title: 'German Vocabulary | MicaLingo',
    description: 'Build and review German vocabulary for exam preparation with MicaLingo.',
  },
  '/practice': {
    title: 'German Practice | MicaLingo',
    description: 'Practice German topics with focused exercises for vocabulary, grammar, and more.',
  },
  '/learning-materials': {
    title: 'German Learning Materials | MicaLingo',
    description: 'Reading and listening materials to improve your German for exams.',
  },
  '/learning-materials/reading': {
    title: 'German Reading Materials | MicaLingo',
    description: 'German reading practice including articles, idioms, false friends, and books.',
  },
  '/learning-materials/reading/false-friends': {
    title: 'German False Friends | MicaLingo',
    description: 'Learn common German–English false friends and avoid translation mistakes.',
  },
  '/learning-materials/reading/idioms': {
    title: 'German Idioms | MicaLingo',
    description: 'Study useful German idioms and expressions for more natural language.',
  },
  '/learning-materials/listening': {
    title: 'German Listening Materials | MicaLingo',
    description: 'Improve German listening with music, podcasts, and audiobooks.',
  },
  '/about': {
    title: 'About MicaLingo',
    description: 'About MicaLingo — German exam preparation with quizzes, vocabulary, and grammar practice.',
  },
  '/privacy': {
    title: 'Privacy Policy | MicaLingo',
    description: 'Privacy policy for the MicaLingo website and mobile application.',
  },
  '/terms': {
    title: 'Terms of Service | MicaLingo',
    description: 'Terms of service for using MicaLingo.',
  },
  '/login': {
    title: 'Log in | MicaLingo',
    description: 'Sign in to MicaLingo to save your German learning progress.',
    noindex: true,
  },
  '/settings': {
    title: 'Settings | MicaLingo',
    description: 'Manage your MicaLingo app settings.',
    noindex: true,
  },
  '/import': {
    title: 'Import | MicaLingo',
    description: 'Import your own learning materials into MicaLingo.',
    noindex: true,
  },
  '/create-quiz': {
    title: 'Create Quiz | MicaLingo',
    description: 'Create a custom German quiz in MicaLingo.',
    noindex: true,
  },
  '/quiz': {
    title: 'Quiz | MicaLingo',
    description: 'Take a German practice quiz on MicaLingo.',
    noindex: true,
  },
  '/results': {
    title: 'Quiz Results | MicaLingo',
    description: 'View your MicaLingo quiz results.',
    noindex: true,
  },
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function resolveSeo(pathname: string): SeoConfig & { canonicalPath: string } {
  const clean = pathname.replace(/\/+$/, '') || '/';

  if (ROUTE_SEO[clean]) {
    return { ...ROUTE_SEO[clean], canonicalPath: clean === '/' ? '/' : clean };
  }

  // Topic / category pages: keep a stable canonical without query strings.
  const quizTopic = clean.match(/^\/quizzes\/([^/]+)$/);
  if (quizTopic) {
    return {
      title: `${capitalize(quizTopic[1])} Quizzes | MicaLingo`,
      description: `Practice German ${quizTopic[1]} with MicaLingo quizzes.`,
      canonicalPath: clean,
    };
  }

  const practiceTopic = clean.match(/^\/practice\/([^/]+)$/);
  if (practiceTopic) {
    return {
      title: `${capitalize(practiceTopic[1])} Practice | MicaLingo`,
      description: `Practice German ${practiceTopic[1]} with MicaLingo.`,
      canonicalPath: clean,
    };
  }

  const grammarCat = clean.match(/^\/grammar\/([^/]+)$/);
  if (grammarCat) {
    return {
      title: `German ${titleize(grammarCat[1])} | MicaLingo`,
      description: `Learn German ${titleize(grammarCat[1]).toLowerCase()} with MicaLingo grammar guides.`,
      canonicalPath: clean,
    };
  }

  if (clean.startsWith('/learning-materials/private') || clean.startsWith('/learning-materials/')) {
    return {
      title: 'Learning Materials | MicaLingo',
      description: DEFAULT_DESCRIPTION,
      canonicalPath: clean.startsWith('/learning-materials/private') ? '/learning-materials' : clean,
      noindex: clean.startsWith('/learning-materials/private'),
    };
  }

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonicalPath: clean,
    noindex: true,
  };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function titleize(value: string) {
  return value
    .split('-')
    .map((part) => capitalize(part))
    .join(' ');
}

function canonicalHref(pathname: string) {
  if (!pathname || pathname === '/') return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}${pathname}`;
}

/**
 * Keeps title, description, robots, and canonical in sync with the current route.
 * Critical for SPAs: without this, every URL shares the homepage canonical.
 */
export default function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = resolveSeo(pathname);
    const canonical = canonicalHref(seo.canonicalPath);

    document.title = seo.title;

    upsertMeta('name', 'description', seo.description);
    upsertMeta('name', 'robots', seo.noindex ? 'noindex, follow' : 'index, follow');
    upsertMeta('name', 'googlebot', seo.noindex ? 'noindex, follow' : 'index, follow');
    upsertMeta('property', 'og:title', seo.title);
    upsertMeta('property', 'og:description', seo.description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'MicaLingo');

    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);
  }, [pathname]);

  return null;
}
