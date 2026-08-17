/**
 * Marked-words quiz engine.
 * Builds mixed practice quizzes from words the user starred after wrong answers.
 * Kept separate from public/static quizEngine seed data and topic quiz libraries.
 */
import {
  addCloudWord,
  deleteCloudWord,
  findVocabDuplicate,
  isActiveVocabItem,
  isMarkedVocabCategory,
  MARKED_VOCAB_CATEGORY,
  type CloudVocabularyItem,
  vocabGermanKey,
} from '../lib/firestore';
import { mixPoolStable, shuffleArray } from '../lib/quizPool';

export const MARKED_WORDS_PER_QUIZ = 20;

export interface MarkedWordInput {
  german?: string;
  hungarian?: string;
  example?: string;
  /** Original quiz topic the word came from (vocabulary, articles, …). */
  sourceTopic?: string;
}

export function filterMarkedWords(words: CloudVocabularyItem[] | null | undefined): CloudVocabularyItem[] {
  if (!words) return [];
  return words.filter(
    (w) =>
      isActiveVocabItem(w) &&
      isMarkedVocabCategory(w.category) &&
      (w.german || '').trim() !== '' &&
      (w.hungarian || '').trim() !== ''
  );
}

export function getMarkedQuizLevels(markedWords: CloudVocabularyItem[]): number {
  return Math.max(0, Math.ceil(markedWords.length / MARKED_WORDS_PER_QUIZ));
}

/** Mixed slice for a marked-words quiz level (then shuffled again by the caller/UI). */
export function getMarkedWordsForQuiz(
  markedWords: CloudVocabularyItem[],
  quizId: number
): CloudVocabularyItem[] {
  const mixed = mixPoolStable(markedWords);
  const start = (Math.max(1, quizId) - 1) * MARKED_WORDS_PER_QUIZ;
  return mixed.slice(start, start + MARKED_WORDS_PER_QUIZ);
}

export function isWordMarked(
  markedWords: CloudVocabularyItem[],
  german?: string
): CloudVocabularyItem | undefined {
  const key = vocabGermanKey(german);
  if (!key) return undefined;
  return markedWords.find((w) => vocabGermanKey(w.german) === key);
}

/**
 * Star a wrongly answered word into the user's marked-words library.
 * Works for public AND private quizzes: always creates/copies into the user's
 * own `marked` category — never mutates the public library.
 * No-ops if already marked or missing german/hungarian.
 */
export async function markWrongWord(
  userId: string,
  markedWords: CloudVocabularyItem[],
  word: MarkedWordInput
): Promise<CloudVocabularyItem | null> {
  const german = (word.german || '').trim();
  const hungarian = (word.hungarian || '').trim();
  if (!userId || !german || !hungarian) return null;

  const existing = findVocabDuplicate(markedWords, german, MARKED_VOCAB_CATEGORY);
  if (existing) return existing as CloudVocabularyItem;

  const docRef = await addCloudWord({
    userId,
    german,
    hungarian,
    example: (word.example || '').trim(),
    note: word.sourceTopic ? `source:${word.sourceTopic}` : '',
    category: MARKED_VOCAB_CATEGORY,
    dateAdded: Date.now(),
    sourceType: 'marked_quiz',
  } as Omit<CloudVocabularyItem, 'id'>);

  return {
    id: docRef.id,
    userId,
    german,
    hungarian,
    example: (word.example || '').trim(),
    note: word.sourceTopic ? `source:${word.sourceTopic}` : '',
    category: MARKED_VOCAB_CATEGORY,
    dateAdded: Date.now(),
    sourceType: 'marked_quiz',
  };
}

/** Remove only the user's marked copy (by its own doc id). Never touches public library entries. */
export async function unmarkWord(wordId: string | undefined): Promise<void> {
  if (!wordId) return;
  await deleteCloudWord(wordId);
}

/** Mixed MCQ: German prompt → Hungarian options (works across all source topics). */
export function generateMarkedQuestions(
  words: Array<{ german?: string; hungarian?: string; example?: string }>,
  distractorPool: Array<{ hungarian?: string }> = []
) {
  const allHungarians = Array.from(
    new Set(
      [...words, ...distractorPool]
        .map((w) => (w.hungarian || '').trim())
        .filter((h) => h.length > 1)
    )
  );

  const questions = words
    .map((word) => {
      const correctAnswer = (word.hungarian || '').trim();
      const german = (word.german || '').trim();
      if (!correctAnswer || !german) return null;

      const distractors = shuffleArray(
        allHungarians.filter((h) => h.toLowerCase() !== correctAnswer.toLowerCase())
      ).slice(0, 3);

      while (distractors.length < 3) {
        distractors.push(`—${distractors.length + 1}`);
      }

      const options = shuffleArray([...distractors, correctAnswer]);

      return {
        questionText: german,
        options,
        correctAnswer,
        example: word.example,
        german,
        hungarian: correctAnswer,
      };
    })
    .filter(Boolean) as Array<{
    questionText: string;
    options: string[];
    correctAnswer: string;
    example?: string;
    german: string;
    hungarian: string;
  }>;

  return shuffleArray(questions);
}
