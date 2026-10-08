import { useEffect, useState } from 'react';
import { deleteField, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { dbCloud } from './firebase';

/** Private quiz buckets. The stored category key stays fixed so existing imports keep working. */
export const PRIVATE_QUIZ_CARDS = [
  { topic: 'vocabulary', icon: '📖', titleKey: 'vocabulary_quiz', descKey: 'custom_vocab_desc', dropdownKey: 'dropdown_vocabulary', kind: 'match' },
  { topic: 'articles', icon: '🔤', titleKey: 'articles_quiz', descKey: 'custom_articles_desc', dropdownKey: 'dropdown_articles', kind: 'articles' },
  { topic: 'phrases', icon: '💬', titleKey: 'phrases_quiz', descKey: 'custom_phrases_desc', dropdownKey: 'dropdown_phrases', kind: 'match' },
  { topic: 'prepositions', icon: '📍', titleKey: 'prepositions_quiz', descKey: 'custom_prepositions_desc', dropdownKey: 'dropdown_prepositions', kind: 'prepositions' },
  { topic: 'adjectives', icon: '✨', titleKey: 'adjectives_quiz', descKey: 'custom_adjectives_desc', dropdownKey: 'dropdown_adjectives', kind: 'match' },
  { topic: 'verbs', icon: '🏃', titleKey: 'verbs_quiz', descKey: 'custom_verbs_desc', dropdownKey: 'dropdown_verbs', kind: 'match' },
] as const;

export type PrivateQuizTopic = (typeof PRIVATE_QUIZ_CARDS)[number]['topic'];
export type PrivateQuizKind = (typeof PRIVATE_QUIZ_CARDS)[number]['kind'];

export type QuizLabelOverride = {
  title?: string;
  description?: string;
  columnA?: string;
  columnB?: string;
  columnC?: string;
};

export type QuizLabelMap = Partial<Record<PrivateQuizTopic, QuizLabelOverride>>;

const LIMITS = { title: 48, description: 140, columnA: 40, columnB: 40, columnC: 40 } as const;

export function isPrivateQuizCard(topic?: string | null): topic is PrivateQuizTopic {
  return PRIVATE_QUIZ_CARDS.some((card) => card.topic === topic);
}

export function privateQuizCard(topic?: string | null) {
  return PRIVATE_QUIZ_CARDS.find((card) => card.topic === topic);
}

export function isMatchQuizTopic(topic?: string | null): topic is PrivateQuizTopic {
  return privateQuizCard(topic)?.kind === 'match';
}

function clip(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanOverride(raw: unknown): QuizLabelOverride | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const next: QuizLabelOverride = {
    title: clip(source.title, LIMITS.title),
    description: clip(source.description, LIMITS.description),
    columnA: clip(source.columnA, LIMITS.columnA),
    columnB: clip(source.columnB, LIMITS.columnB),
    columnC: clip(source.columnC, LIMITS.columnC),
  };
  if (!next.title) delete next.title;
  if (!next.description) delete next.description;
  if (!next.columnA) delete next.columnA;
  if (!next.columnB) delete next.columnB;
  if (!next.columnC) delete next.columnC;
  return Object.keys(next).length ? next : null;
}

export function sanitizeQuizLabels(raw: unknown): QuizLabelMap {
  if (!raw || typeof raw !== 'object') return {};
  const source = raw as Record<string, unknown>;
  const labels: QuizLabelMap = {};
  for (const card of PRIVATE_QUIZ_CARDS) {
    const cleaned = cleanOverride(source[card.topic]);
    if (cleaned) labels[card.topic] = cleaned;
  }
  return labels;
}

/** Articles and phrases stay unnamed on a private account until the user sets a title. */
export function isBlankUntilTitled(topic?: string | null): topic is 'articles' | 'phrases' {
  return topic === 'articles' || topic === 'phrases';
}

export function quizDisplayTitle(labels: QuizLabelMap, topic: string | null | undefined, fallback: string) {
  if (!isPrivateQuizCard(topic)) return fallback;
  return labels[topic]?.title || fallback;
}

/** Private card title. Open slots use a fill-in label until the user names them. */
export function privateCardTitle(
  labels: QuizLabelMap,
  topic: string | null | undefined,
  namedFallback: string,
  blankLabel: string,
) {
  if (!isPrivateQuizCard(topic)) return namedFallback;
  const custom = labels[topic]?.title;
  if (custom) return custom;
  if (isBlankUntilTitled(topic)) return blankLabel;
  return namedFallback;
}

export function privateCardIsBlank(labels: QuizLabelMap, topic?: string | null) {
  return isBlankUntilTitled(topic) && !labels[topic]?.title;
}

/** Custom column header for match quizzes. Other formats keep their own headers. */
export function matchColumnLabel(
  labels: QuizLabelMap,
  topic: string | null | undefined,
  which: 'a' | 'b' | 'c',
  fallback: string
) {
  if (!isMatchQuizTopic(topic)) return fallback;
  const custom = which === 'a' ? labels[topic]?.columnA : which === 'b' ? labels[topic]?.columnB : labels[topic]?.columnC;
  return custom || fallback;
}

export function useQuizLabels(userId: string | undefined) {
  const [labels, setLabels] = useState<QuizLabelMap>({});

  useEffect(() => {
    if (!userId) {
      setLabels({});
      return;
    }
    const ref = doc(dbCloud, 'user_settings', userId);
    return onSnapshot(
      ref,
      (snap) => {
        setLabels(sanitizeQuizLabels(snap.exists() ? snap.data().quizLabels : null));
      },
      (error) => {
        console.error('Failed to load quiz labels', error);
      }
    );
  }, [userId]);

  const saveTopic = async (topic: PrivateQuizTopic, next: QuizLabelOverride | null) => {
    if (!userId) return;
    const cleaned = cleanOverride(next);
    const ref = doc(dbCloud, 'user_settings', userId);
    await setDoc(
      ref,
      {
        quizLabels: {
          [topic]: cleaned ? { ...cleaned, description: deleteField() } : deleteField(),
        },
      },
      { merge: true }
    );
  };

  return { labels, saveTopic };
}
