import { useEffect, useState } from 'react';
import { deleteField, doc, getDocFromServer, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { dbCloud } from './firebase';
import { localizedColumnLabel } from './localizedLabel';

/** Private quiz buckets. The stored category key stays fixed so existing imports keep working. */
export const PRIVATE_QUIZ_CARDS = [
  { topic: 'vocabulary', icon: '📖', titleKey: 'vocabulary_quiz', descKey: 'custom_vocab_desc', dropdownKey: 'dropdown_vocabulary', kind: 'match' },
  { topic: 'articles', icon: '🔤', titleKey: 'articles_quiz', descKey: 'custom_articles_desc', dropdownKey: 'dropdown_articles', kind: 'match' },
  { topic: 'phrases', icon: '💬', titleKey: 'phrases_quiz', descKey: 'custom_phrases_desc', dropdownKey: 'dropdown_phrases', kind: 'match' },
  { topic: 'prepositions', icon: '📍', titleKey: 'prepositions_quiz', descKey: 'custom_prepositions_desc', dropdownKey: 'dropdown_prepositions', kind: 'match' },
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

/** Stable 1-based slot number so empty cards read Téma1, Téma2, and so on. */
export function privateSlotNumber(topic?: string | null): number {
  const index = PRIVATE_QUIZ_CARDS.findIndex((card) => card.topic === topic);
  return index >= 0 ? index + 1 : 1;
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

/** Every private quiz slot stays unnamed until the user sets a title. */
export function isBlankUntilTitled(topic?: string | null): topic is PrivateQuizTopic {
  return isPrivateQuizCard(topic);
}

/** Translated built-in name for a quiz topic. Raw ids such as "verbs" are not shown. */
export function defaultQuizTopicTitle(
  topic: string | null | undefined,
  translate: (key: string) => string,
): string {
  const card = privateQuizCard(topic);
  if (card) return translate(card.titleKey);
  if (topic === 'reading') return translate('dropdown_reading');
  if (topic === 'false_friends') return translate('false_friends');
  if (topic === 'idioms') return translate('idioms');
  if (topic === 'telc-b2') return translate('telc_b2');
  if (topic === 'marked') return translate('marked_words');
  return topic || '';
}

/** The title the user saved. Anything they typed stays, including names that resemble a default category. */
function storedTitle(labels: QuizLabelMap, topic: string | null | undefined): string {
  if (!isPrivateQuizCard(topic)) return '';
  return labels[topic]?.title || '';
}

export function quizDisplayTitle(labels: QuizLabelMap, topic: string | null | undefined, fallback: string) {
  if (!isPrivateQuizCard(topic)) return fallback;
  return storedTitle(labels, topic) || fallback;
}

/** Private card title. Open slots use a fill-in label until the user names them. */
export function privateCardTitle(
  labels: QuizLabelMap,
  topic: string | null | undefined,
  namedFallback: string,
  blankLabel: string,
) {
  if (!isPrivateQuizCard(topic)) return namedFallback;
  return storedTitle(labels, topic) || blankLabel;
}

export function privateCardIsBlank(labels: QuizLabelMap, topic?: string | null) {
  return isBlankUntilTitled(topic) && !storedTitle(labels, topic);
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
  return localizedColumnLabel(custom || '', fallback);
}

const LABEL_CACHE_PREFIX = 'micalingo_quiz_labels_';
const restoredTopicKeys = new Set<string>();

function labelCacheKey(userId: string) {
  return LABEL_CACHE_PREFIX + userId;
}

function readCachedLabels(userId: string): QuizLabelMap {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(labelCacheKey(userId));
    return sanitizeQuizLabels(raw ? JSON.parse(raw) : null);
  } catch {
    return {};
  }
}

function writeCachedLabels(userId: string, labels: QuizLabelMap) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(labelCacheKey(userId), JSON.stringify(labels));
  } catch {
    /* private mode or a full disk should not block the account write */
  }
}

/** Cloud titles win. A title that exists only in this browser is filled back in. */
function mergeQuizLabels(cloud: QuizLabelMap, local: QuizLabelMap) {
  const labels: QuizLabelMap = {};
  const missing: PrivateQuizTopic[] = [];
  for (const card of PRIVATE_QUIZ_CARDS) {
    if (cloud[card.topic]?.title) labels[card.topic] = cloud[card.topic];
    else if (local[card.topic]?.title) {
      labels[card.topic] = local[card.topic];
      missing.push(card.topic);
    }
  }
  return { labels, missing };
}

function firestoreCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: string }).code) : '';
}

/** Writes one topic title without touching the other topics or the rest of the settings document. */
async function writeTopicTitle(userId: string, topic: PrivateQuizTopic, title: string) {
  const ref = doc(dbCloud, 'user_settings', userId);
  const field = `quizLabels.${topic}.title`;
  try {
    await updateDoc(ref, title ? { [field]: title } : { [`quizLabels.${topic}`]: deleteField() });
  } catch (error) {
    if (firestoreCode(error) !== 'not-found') throw error;
    if (!title) return;
    await setDoc(ref, { quizLabels: { [topic]: { title } } }, { merge: true });
  }
  try {
    const snap = await getDocFromServer(ref);
    const stored = sanitizeQuizLabels(snap.exists() ? snap.data().quizLabels : null)[topic]?.title || '';
    if (stored !== title) throw new Error('Quiz name was not stored on the account');
  } catch (error) {
    if (error instanceof Error && error.message === 'Quiz name was not stored on the account') throw error;
    console.error('Could not confirm quiz name from the server', error);
  }
}

export function useQuizLabels(userId: string | undefined) {
  const [labels, setLabels] = useState<QuizLabelMap>({});

  useEffect(() => {
    if (!userId) {
      setLabels({});
      return;
    }
    let cancelled = false;
    let unsub = () => {};
    let attempt = 0;
    const cached = readCachedLabels(userId);
    setLabels(cached);
    const ref = doc(dbCloud, 'user_settings', userId);

    const apply = (raw: unknown) => {
      if (cancelled) return;
      const cloud = sanitizeQuizLabels(raw);
      const { labels: merged, missing } = mergeQuizLabels(cloud, readCachedLabels(userId));
      setLabels(merged);
      writeCachedLabels(userId, merged);
      const pending = missing.filter((topic) => !restoredTopicKeys.has(`${userId}:${topic}`));
      if (!pending.length) return;
      pending.forEach((topic) => restoredTopicKeys.add(`${userId}:${topic}`));
      void (async () => {
        for (const topic of pending) {
          const title = merged[topic]?.title;
          if (!title) continue;
          try {
            await writeTopicTitle(userId, topic, title);
          } catch (error) {
            console.error('Failed to restore quiz label', topic, error);
          }
        }
      })();
    };

    const listen = () => {
      unsub();
      unsub = onSnapshot(
        ref,
        (snap) => {
          attempt = 0;
          apply(snap.exists() ? snap.data().quizLabels : null);
        },
        (error) => {
          console.error('Failed to load quiz labels', error);
          if (cancelled) return;
          setLabels(readCachedLabels(userId));
          if (attempt >= 3) return;
          attempt += 1;
          window.setTimeout(() => {
            if (!cancelled) listen();
          }, 400 * attempt);
        }
      );
    };
    listen();

    return () => {
      cancelled = true;
      unsub();
    };
  }, [userId]);

  const saveTopic = async (topic: PrivateQuizTopic, next: QuizLabelOverride | null) => {
    if (!userId) throw new Error('Not signed in');
    const title = cleanOverride(next)?.title || '';
    const optimistic = mergeQuizLabels(labels, readCachedLabels(userId)).labels;
    if (title) optimistic[topic] = { ...(optimistic[topic] || {}), title };
    else delete optimistic[topic];
    setLabels(optimistic);
    writeCachedLabels(userId, optimistic);
    await writeTopicTitle(userId, topic, title);
    restoredTopicKeys.add(`${userId}:${topic}`);
  };

  return { labels, saveTopic };
}
