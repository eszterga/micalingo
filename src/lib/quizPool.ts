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
export function isQuizableWord(word: { german?: string; hungarian?: string }, topic: string) {
  const german = (word.german || '').trim();
  const hungarian = (word.hungarian || '').trim();
  if (!german || !hungarian) return false;
  if (topic === 'vocabulary' && ['der', 'die', 'das'].includes(german.toLowerCase())) {
    return false;
  }
  return true;
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
 * - Keep only words with both german + hungarian (needed for questions)
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
    seen.add(key);
    unique.push({
      german: (word.german || '').trim(),
      hungarian: (word.hungarian || '').trim(),
      example: word.example,
      category: topic,
    });
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
      seen.add(key);
      unique.push({
        german: (word.german || '').trim(),
        hungarian: (word.hungarian || '').trim(),
        example: typeof word.example === 'string' ? word.example : undefined,
        category: topic,
      });
    }
  }

  unique.sort((a, b) => a.german.localeCompare(b.german, 'de'));
  return unique;
}

/** Slice one quiz level out of a pool (1-based quizId). */
export function getQuizLevelWords(pool: QuizWord[], quizId: number): QuizWord[] {
  if (!quizId || quizId < 1) return [];
  const startIndex = (quizId - 1) * WORDS_PER_QUIZ;
  return pool.slice(startIndex, startIndex + WORDS_PER_QUIZ);
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
        (w.german || '').trim() !== '' &&
        (w.hungarian || '').trim() !== ''
    )
    .map((w) => ({
      german: (w.german || '').trim(),
      hungarian: (w.hungarian || '').trim(),
      example: w.example,
      category: w.category,
    }))
    .sort((a, b) => a.german.localeCompare(b.german, 'de'));
}
