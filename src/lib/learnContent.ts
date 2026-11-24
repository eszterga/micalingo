import { publicPrivateGuide } from './publicPrivateGuide';

export type LearnLang = 'en' | 'de' | 'hu';

export type LearnGuide = {
  slug: string;
  published: string;
  minutes: number;
  title: Record<LearnLang, string>;
  description: Record<LearnLang, string>;
  body: Record<LearnLang, string>;
};

function pick<T>(map: Record<LearnLang, T>, lang: LearnLang): T {
  return map[lang] || map.en;
}

/** Only pages that describe how the site actually works. */
export const LEARN_GUIDES: LearnGuide[] = [
  publicPrivateGuide as LearnGuide,
];

export function getLearnGuide(slug: string): LearnGuide | undefined {
  const mapped = slug === 'german-exam-prep' ? 'public-and-private' : slug;
  return LEARN_GUIDES.find((g) => g.slug === mapped);
}

export function guideTitle(guide: LearnGuide, lang: LearnLang) {
  return pick(guide.title, lang);
}

export function guideDescription(guide: LearnGuide, lang: LearnLang) {
  return pick(guide.description, lang);
}

export function guideBody(guide: LearnGuide, lang: LearnLang) {
  return pick(guide.body, lang);
}
