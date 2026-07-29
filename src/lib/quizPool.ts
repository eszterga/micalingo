import {
  publicVocabulary,
  publicPhrases,
  publicArticles,
  publicPrepositions,
  publicAdjectives,
  type PublicWord,
} from './public-data';
import { vocabCategoryKey, isReadingVocabCategory, isMarkedVocabCategory } from './firestore';

export const WORDS_PER_QUIZ = 20;

const ARTICLE_LABELS = ['der', 'die', 'das'] as const;
export type ArticleLabel = (typeof ARTICLE_LABELS)[number];

export function isArticleLabel(value: string | undefined | null): value is ArticleLabel {
  const h = (value || '').toLowerCase().trim();
  return (ARTICLE_LABELS as readonly string[]).includes(h);
}

/** Correct article (column A): must be a der/die/das prefix on `german`. */
export function getArticleFromQuizWord(word: { german?: string }): ArticleLabel {
  const match = (word.german || '').match(/^(der|die|das)\b/i);
  if (match) return match[1].toLowerCase() as ArticleLabel;
  return 'der';
}

/** Question noun (column B) — text after the article prefix. */
export function getNounFromArticleQuizWord(word: { german?: string }): string {
  const match = (word.german || '').trim().match(/^(der|die|das)\s+(.+)/i);
  return match ? match[2].trim() : (word.german || '').trim();
}

/** Optional post-answer hint from column D (`example` only — not Hungarian in column C). */
export function getArticleQuizHint(word: { example?: string }): string | undefined {
  const ex = (word.example || '').trim();
  return ex || undefined;
}

function articleStoredHungarian(hungarian?: string): string {
  const h = (hungarian || '').trim();
  return isArticleLabel(h) ? '' : h;
}

/**
 * Canonical articles-quiz row: column A + B in `german`, optional C/D in example/note.
 * Legacy static rows (noun in german, article in hungarian) are upgraded here only — not in the UI.
 */
export function normalizeArticleQuizWord(word: {
  german?: string;
  hungarian?: string;
  example?: string;
  note?: string;
  category?: string;
  deleted?: boolean;
}): QuizWord | null {
  const match = (word.german || '').trim().match(/^(der|die|das)\s+(.+)/i);
  if (match) {
    const article = match[1].toLowerCase() as ArticleLabel;
    const noun = match[2].trim();
    if (!noun) return null;
    return {
      german: `${article} ${noun}`,
      hungarian: articleStoredHungarian(word.hungarian),
      example: word.example,
      note: word.note,
      category: word.category,
      deleted: word.deleted,
    };
  }
  const legacyNoun = (word.german || '').trim();
  if (legacyNoun && isArticleLabel(word.hungarian)) {
    const article = word.hungarian.toLowerCase() as ArticleLabel;
    return {
      german: `${article} ${legacyNoun}`,
      hungarian: '',
      example: word.example,
      note: word.note,
      category: word.category,
      deleted: word.deleted,
    };
  }
  return null;
}

function orderPoolForArticleQuizzes(pool: QuizWord[]): QuizWord[] {
  const buckets: Record<ArticleLabel, QuizWord[]> = { der: [], die: [], das: [] };
  for (const w of pool) {
    buckets[getArticleFromQuizWord(w)].push(w);
  }
  const mixed: QuizWord[] = [];
  const maxLen = Math.max(buckets.der.length, buckets.die.length, buckets.das.length);
  for (let i = 0; i < maxLen; i++) {
    for (const art of ARTICLE_LABELS) {
      const item = buckets[art][i];
      if (item) mixed.push(item);
    }
  }
  return mixed;
}

export const QUIZ_TOPICS = [
  'vocabulary',
  'phrases',
  'articles',
  'prepositions',
  'adjectives',
  'verbs',
] as const;

export type QuizTopic = (typeof QUIZ_TOPICS)[number];

export function isQuizTopic(topic: string | null | undefined): topic is QuizTopic {
  return !!topic && (QUIZ_TOPICS as readonly string[]).includes(topic);
}

export type QuizWord = {
  german: string;
  hungarian: string;
  example?: string;
  note?: string;
  category?: string;
  deleted?: boolean;
};

function germanKey(german?: string) {
  return (german || '').toLowerCase().trim();
}

/** Static seed words shipped with the app for a public quiz topic. */
export function getStaticSourceForTopic(topic: string): PublicWord[] {
  if (topic === 'vocabulary') return publicVocabulary;
  if (topic === 'phrases') return publicPhrases;
  if (topic === 'articles') return publicArticles;
  if (topic === 'adjectives') return publicAdjectives || [];
  if (topic === 'verbs') return [];
  if (topic === 'prepositions') return publicPrepositions;
  return [];
}

/**
 * Whether a word can actually power a multiple-choice quiz item.
 * Listing pages and the quiz runner MUST use the same rule, otherwise a level
 * can appear in the UI (e.g. vocabulary quiz 47) and then open empty.
 */
export function isQuizableWord(
  word: { german?: string; hungarian?: string; example?: string; note?: string },
  topic: string
) {
  const german = (word.german || '').trim();
  if (!german) return false;
  if (topic === 'articles') {
    return normalizeArticleQuizWord(word) !== null;
  }
  const hungarian = (word.hungarian || '').trim();
  if (!hungarian) return false;
  if (topic === 'vocabulary' && ['der', 'die', 'das'].includes(german.toLowerCase())) {
    return false;
  }
  return true;
}

function toQuizWord(word: QuizWord | PublicWord, topic: string): QuizWord | null {
  if (topic === 'articles') {
    return normalizeArticleQuizWord(word);
  }
  return {
    german: (word.german || '').trim(),
    hungarian: (word.hungarian || '').trim(),
    example: word.example,
    note: word.note,
    category: topic,
  };
}

function wordMatchesTopic(word: { category?: string }, topic: string) {
  // Static seed entries usually have no category — they already belong to the topic array.
  if (word.category === undefined || word.category === null || String(word.category).trim() === '') {
    return true;
  }
  if (isReadingVocabCategory(word.category)) return false;
  if (isMarkedVocabCategory(word.category)) return false;
  return vocabCategoryKey(word.category) === topic;
}

/**
 * Build the canonical public quiz word list for a topic.
 *
 * Used by the level list (TopicQuizzes), the quiz runner (Quiz), and Results
 * so every surface slices the same ordered pool into the same quiz IDs.
 *
 * Rules:
 * - Seed from static public data, then apply PUBLIC_LIBRARY adds/deletes
 * - Skip reading-library entries
 * - Keep only quizable rows (articles: der/die/das + noun; others: german + hungarian)
 * - Drop bare article tokens from vocabulary quizzes
 * - Sort alphabetically by german so level N is identical on web and app
 */
export function buildPublicQuizPool(
  topic: string,
  publicDbWords: Array<QuizWord | PublicWord & { category?: string; deleted?: boolean }> | null | undefined
): QuizWord[] {
  if (!isQuizTopic(topic)) return [];

  const staticSource = getStaticSourceForTopic(topic);
  const unique: QuizWord[] = [];
  const seen = new Set<string>();

  for (const word of staticSource) {
    const key = germanKey(word.german);
    if (!key || seen.has(key) || (word as QuizWord).deleted) continue;
    if (!isQuizableWord(word, topic)) continue;
    const entry = toQuizWord({ ...(word as QuizWord), category: topic }, topic);
    if (!entry) continue;
    const entryKey = germanKey(entry.german);
    if (!entryKey || seen.has(entryKey)) continue;
    seen.add(entryKey);
    unique.push(entry);
  }

  const dbSource = (publicDbWords || []).filter(
    (w) => wordMatchesTopic(w, topic)
  );

  for (const word of dbSource) {
    const key = germanKey(word.german);
    if (!key) continue;

    if (word.deleted) {
      const idx = unique.findIndex((w) => germanKey(w.german) === key);
      if (idx >= 0) unique.splice(idx, 1);
      seen.add(key);
      continue;
    }

    if (!isQuizableWord(word, topic)) continue;

    if (!seen.has(key)) {
      const entry = toQuizWord(
        {
          german: (word.german || '').trim(),
          hungarian: (word.hungarian || '').trim(),
          example: typeof word.example === 'string' ? word.example : undefined,
          note: typeof (word as QuizWord).note === 'string' ? (word as QuizWord).note : undefined,
          category: topic,
        },
        topic
      );
      if (!entry) continue;
      seen.add(key);
      unique.push(entry);
    }
  }

  unique.sort((a, b) => a.german.localeCompare(b.german, 'de'));
  return unique;
}

/** Slice one quiz level out of a pool (1-based quizId). Articles levels interleave der/die/das. */
export function getQuizLevelWords(pool: QuizWord[], quizId: number, topic?: string): QuizWord[] {
  if (!quizId || quizId < 1) return [];
  const ordered = topic === 'articles' ? orderPoolForArticleQuizzes(pool) : pool;
  const startIndex = (quizId - 1) * WORDS_PER_QUIZ;
  return ordered.slice(startIndex, startIndex + WORDS_PER_QUIZ);
}

export function getQuizLevelCount(poolLength: number): number {
  if (poolLength <= 0) return 0;
  return Math.ceil(poolLength / WORDS_PER_QUIZ);
}

export function getItemsInQuizLevel(poolLength: number, quizId: number): number {
  const total = getQuizLevelCount(poolLength);
  if (quizId < 1 || quizId > total) return 0;
  if (quizId === total && poolLength % WORDS_PER_QUIZ !== 0) {
    return poolLength % WORDS_PER_QUIZ;
  }
  return WORDS_PER_QUIZ;
}

/**
 * Private-library quiz pool for a topic. Sorted by german for stable levels.
 */
export function buildCustomQuizPool(
  topic: string,
  userVocabulary: Array<{
    german?: string;
    hungarian?: string;
    example?: string;
    category?: string;
    deleted?: boolean;
  }> | null | undefined
): QuizWord[] {
  if (!topic || !userVocabulary) return [];

  return userVocabulary
    .filter(
      (w) =>
        !w.deleted &&
        !isReadingVocabCategory(w.category) &&
        !isMarkedVocabCategory(w.category) &&
        vocabCategoryKey(w.category) === topic &&
        isQuizableWord(w, topic)
    )
    .map((w) => {
      if (topic === 'articles') {
        return normalizeArticleQuizWord({ ...w, category: w.category })!;
      }
      return {
        german: (w.german || '').trim(),
        hungarian: (w.hungarian || '').trim(),
        example: w.example,
        note: (w as { note?: string }).note,
        category: w.category,
      };
    })
    .sort((a, b) => a.german.localeCompare(b.german, 'de'));
}
