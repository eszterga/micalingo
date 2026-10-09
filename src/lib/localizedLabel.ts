import { de } from '../de';
import { en } from '../en';
import { hu } from '../hu';

type Dict = Record<string, string>;

const DICTS: Dict[] = [en as Dict, de as Dict, hu as Dict];

/** Quiz / kvíz / Quizze — stripped so "Igék kvíz" and "Verbs" name the same topic. */
const QUIZ_WORD = /^(quiz|quizzes|quizze|kviz|kvizek)$/;

const TOPIC_TITLE_KEYS: Record<string, string[]> = {
  vocabulary: ['vocabulary', 'vocabulary_quiz', 'dropdown_vocabulary', 'vocab_title'],
  articles: ['articles_quiz', 'dropdown_articles', 'articles_quiz_label'],
  phrases: ['phrases_quiz', 'phrases_sentences_quiz', 'dropdown_phrases'],
  prepositions: ['prepositions_quiz', 'dropdown_prepositions', 'prepositions_quiz_format_title'],
  adjectives: ['adjectives_quiz', 'dropdown_adjectives', 'adjectives_quiz_label', 'adjective'],
  verbs: ['verbs_quiz', 'dropdown_verbs', 'verbs_quiz_format_title'],
};

const COLUMN_KEYS = ['german', 'hungarian', 'adjective', 'hint', 'levels', 'note', 'example', 'article'];

function dictValue(dict: Dict, key: string): string {
  const value = dict[key];
  return typeof value === 'string' ? value : '';
}

/** Compare labels ignoring case, accents, and a trailing "quiz" word. */
export function foldLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((part) => part && !QUIZ_WORD.test(part))
    .join(' ');
}

function tokenBag(value: string): string {
  return foldLabel(value).split(' ').filter(Boolean).sort().join(' ');
}

export function labelsMatch(left: string, right: string): boolean {
  const a = foldLabel(left);
  const b = foldLabel(right);
  if (!a || !b) return false;
  if (a === b || tokenBag(left) === tokenBag(right)) return true;
  const aHead = a.split(' ')[0];
  const bHead = b.split(' ')[0];
  if (aHead.length < 3 || bHead.length < 3 || aHead !== bHead) return false;
  return a === aHead || b === bHead;
}

export function matchesAnyLabel(value: string, variants: string[]): boolean {
  return variants.some((variant) => variant && labelsMatch(value, variant));
}

function variantsFor(keys: string[]): string[] {
  const variants: string[] = [];
  for (const key of keys) {
    for (const dict of DICTS) {
      const value = dictValue(dict, key);
      if (value) variants.push(value);
    }
  }
  return variants;
}

function conceptKey(value: string, keys: string[]): string | null {
  for (const key of keys) {
    if (matchesAnyLabel(value, variantsFor([key]))) return key;
  }
  return null;
}

/** Saved fill-in names such as Téma6 / Thema6 / Topic6 follow the current interface language. */
export function isQuizSlotPlaceholder(slotNumber: number, title: string): boolean {
  const variants = DICTS.map((dict) =>
    dictValue(dict, 'quiz_slot_title_placeholder').replace(/\{n\}/g, String(slotNumber)),
  );
  return matchesAnyLabel(title, variants);
}

/** Saved name is the built-in topic label in English, German, or Hungarian. */
export function isBuiltinTopicTitle(topic: string | null | undefined, title: string): boolean {
  if (!topic || !TOPIC_TITLE_KEYS[topic]) return false;
  return matchesAnyLabel(title, variantsFor(TOPIC_TITLE_KEYS[topic]));
}

/**
 * A saved column header that is just "Magyar" / "Deutsch" / "Hungarian"
 * follows the current interface language. A name the user invented stays.
 */
export function localizedColumnLabel(saved: string, fallback: string): string {
  if (!saved) return fallback;
  const savedKey = conceptKey(saved, COLUMN_KEYS);
  const fallbackKey = conceptKey(fallback, COLUMN_KEYS);
  if (savedKey && savedKey === fallbackKey) return fallback;
  return saved;
}

/** Default private categories (Category 1 / 1. Kategória / Kategorie 1) follow the interface language. */
export function localizedPrivateCategoryTitle(
  categoryId: string,
  storedTitle: string,
  translate: (key: string) => string,
): string {
  const slot = /^cat([1-5])$/.exec(categoryId || '');
  if (!slot) return storedTitle;
  const key = `private_category_${slot[1]}`;
  const current = translate(key);
  if (!storedTitle || matchesAnyLabel(storedTitle, variantsFor([key]))) return current || storedTitle;
  return storedTitle;
}
