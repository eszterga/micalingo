import { useEffect, useRef, useState } from 'react';
import { deleteField, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
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

/** Browser copy of names the user saved. A reload must not replace this with an empty cloud snapshot. */
const INTENT_PREFIX = 'micalingo_quiz_label_intent_';
/** Older builds stored the same names here, without a timestamp. */
const LEGACY_CACHE_PREFIX = 'micalingo_quiz_labels_';

type TitleStamp = { title: string; updatedAt: number };
type TitleBook = Partial<Record<PrivateQuizTopic, TitleStamp>>;

const rememberedTitles = new Map<string, TitleBook>();
const repairKeys = new Set<string>();
const ensureDocTasks = new Map<string, Promise<void>>();
const writeTails = new Map<string, Promise<void>>();

function readStorage(key: string): unknown {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or a full disk should not block the account write */
  }
}

function readTitleBook(raw: unknown, keepBlanks: boolean): TitleBook {
  if (!raw || typeof raw !== 'object') return {};
  const source = raw as Record<string, unknown>;
  const book: TitleBook = {};
  for (const card of PRIVATE_QUIZ_CARDS) {
    const value = source[card.topic];
    if (!value || typeof value !== 'object') continue;
    const record = value as Record<string, unknown>;
    const title = clip(record.title, LIMITS.title);
    const updatedAt = typeof record.updatedAt === 'number' && record.updatedAt > 0 ? record.updatedAt : 0;
    if (!title && (!keepBlanks || updatedAt <= 0)) continue;
    book[card.topic] = { title, updatedAt };
  }
  return book;
}

function readIntent(userId: string): TitleBook {
  const stored = readStorage(INTENT_PREFIX + userId);
  if (stored) return readTitleBook(stored, true);
  const seeded = readTitleBook(readStorage(LEGACY_CACHE_PREFIX + userId), false);
  if (Object.keys(seeded).length) writeStorage(INTENT_PREFIX + userId, seeded);
  return seeded;
}

function writeIntent(userId: string, book: TitleBook) {
  writeStorage(INTENT_PREFIX + userId, book);
}

function rememberTitles(userId: string, found: TitleBook) {
  const prev = rememberedTitles.get(userId) || {};
  const next: TitleBook = { ...prev };
  let changed = false;
  for (const card of PRIVATE_QUIZ_CARDS) {
    const entry = found[card.topic];
    if (!entry?.title) continue;
    const current = next[card.topic];
    if (current?.title && current.updatedAt > entry.updatedAt) continue;
    next[card.topic] = entry;
    changed = true;
  }
  if (changed) rememberedTitles.set(userId, next);
}

function forgetTitle(userId: string, topic: PrivateQuizTopic) {
  const prev = rememberedTitles.get(userId);
  if (!prev?.[topic]) return;
  const next = { ...prev };
  delete next[topic];
  rememberedTitles.set(userId, next);
}

/**
 * A newer explicit rename wins. An empty cloud snapshot does not.
 * An unstamped browser copy fills a missing cloud name, and does not replace one that is still stored.
 */
function chooseTitle(intent: TitleStamp | undefined, primary: TitleStamp | undefined, legacy: TitleStamp | undefined, remembered: TitleStamp | undefined): TitleStamp | null {
  const options: { title: string; updatedAt: number; rank: number }[] = [];
  if (intent && (intent.title || intent.updatedAt > 0)) {
    const stamped = intent.updatedAt > 0;
    options.push({ title: intent.title, updatedAt: intent.updatedAt, rank: intent.title ? (stamped ? 4 : 1) : 4 });
  }
  if (primary?.title) options.push({ title: primary.title, updatedAt: primary.updatedAt, rank: 3 });
  if (legacy?.title) options.push({ title: legacy.title, updatedAt: legacy.updatedAt, rank: 2 });
  if (remembered?.title) options.push({ title: remembered.title, updatedAt: remembered.updatedAt, rank: 0 });
  let winner: { title: string; updatedAt: number; rank: number } | null = null;
  for (const option of options) {
    if (!winner || option.updatedAt > winner.updatedAt || (option.updatedAt === winner.updatedAt && option.rank > winner.rank)) {
      winner = option;
    }
  }
  return winner ? { title: winner.title, updatedAt: winner.updatedAt } : null;
}

function labelsFromBook(book: TitleBook, columns: QuizLabelMap): QuizLabelMap {
  const labels: QuizLabelMap = {};
  for (const card of PRIVATE_QUIZ_CARDS) {
    const title = book[card.topic]?.title;
    if (!title) continue;
    labels[card.topic] = { ...(columns[card.topic] || {}), title };
  }
  return labels;
}

function columnMap(primary: unknown, legacy: unknown): QuizLabelMap {
  const columns: QuizLabelMap = {};
  const primaryBook = primary && typeof primary === 'object' ? primary as Record<string, unknown> : {};
  const legacyBook = legacy && typeof legacy === 'object' ? legacy as Record<string, unknown> : {};
  for (const card of PRIVATE_QUIZ_CARDS) {
    const cleaned = cleanOverride(primaryBook[card.topic]) || cleanOverride(legacyBook[card.topic]);
    if (cleaned) columns[card.topic] = cleaned;
  }
  return columns;
}

function firestoreCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: string }).code) : '';
}

function enqueueWrite(userId: string, task: () => Promise<void>) {
  const prev = writeTails.get(userId) || Promise.resolve();
  const next = prev.then(task, task);
  writeTails.set(userId, next);
  return next;
}

/** Creates the settings doc without touching any quiz name map. */
function ensureSettingsDoc(userId: string) {
  let task = ensureDocTasks.get(userId);
  if (!task) {
    task = setDoc(doc(dbCloud, 'user_settings', userId), { quizTitlesUpdatedAt: Date.now() }, { merge: true }).then(() => undefined);
    ensureDocTasks.set(userId, task);
  }
  return task;
}

/**
 * Writes one topic through dotted fields. A nested set() would replace every other name,
 * which is how a reload used to wipe the private library.
 */
async function writeTopicTitle(userId: string, topic: PrivateQuizTopic, title: string, updatedAt: number) {
  const ref = doc(dbCloud, 'user_settings', userId);
  const payload = title
    ? {
        [`quizTitles.${topic}.title`]: title,
        [`quizTitles.${topic}.updatedAt`]: updatedAt,
        [`quizLabels.${topic}.title`]: title,
        [`quizLabels.${topic}.updatedAt`]: updatedAt,
      }
    : {
        [`quizTitles.${topic}`]: deleteField(),
        [`quizLabels.${topic}`]: deleteField(),
      };
  try {
    await updateDoc(ref, payload);
  } catch (error) {
    if (firestoreCode(error) !== 'not-found') throw error;
    if (!title) return;
    await ensureSettingsDoc(userId);
    await updateDoc(ref, payload);
  }
}

export function useQuizLabels(userId: string | undefined) {
  const [labels, setLabels] = useState<QuizLabelMap>({});
  const hydrated = useRef(false);

  useEffect(() => {
    if (!userId) {
      hydrated.current = false;
      setLabels({});
      return;
    }
    let cancelled = false;
    let unsub = () => {};
    let attempt = 0;
    hydrated.current = false;
    const intent = readIntent(userId);
    rememberTitles(userId, intent);
    setLabels(labelsFromBook(intent, {}));
    hydrated.current = true;
    const ref = doc(dbCloud, 'user_settings', userId);

    const apply = (data: Record<string, unknown> | null, fromCache: boolean) => {
      if (cancelled) return;
      const primary = readTitleBook(data?.quizTitles, false);
      const legacy = readTitleBook(data?.quizLabels, false);
      if (fromCache) rememberTitles(userId, { ...legacy, ...primary });
      const remembered = rememberedTitles.get(userId) || {};
      const intentNow = readIntent(userId);
      const chosen: TitleBook = {};
      let intentChanged = false;
      const nextIntent: TitleBook = { ...intentNow };
      for (const card of PRIVATE_QUIZ_CARDS) {
        let winner = chooseTitle(intentNow[card.topic], primary[card.topic], legacy[card.topic], remembered[card.topic]);
        if (!fromCache && winner?.title && winner.updatedAt <= 0) {
          winner = { title: winner.title, updatedAt: Date.now() };
        }
        if (winner) chosen[card.topic] = winner;
        const previous = nextIntent[card.topic];
        if (!winner) {
          if (previous) {
            delete nextIntent[card.topic];
            intentChanged = true;
          }
          continue;
        }
        if (!previous || previous.title !== winner.title || previous.updatedAt !== winner.updatedAt) {
          nextIntent[card.topic] = winner;
          intentChanged = true;
        }
      }
      if (!fromCache) {
        const latest = readIntent(userId);
        for (const card of PRIVATE_QUIZ_CARDS) {
          const fresh = latest[card.topic];
          const decided = nextIntent[card.topic];
          if (fresh && (!decided || fresh.updatedAt > decided.updatedAt)) {
            nextIntent[card.topic] = fresh;
            chosen[card.topic] = fresh;
            intentChanged = true;
          }
        }
      }
      setLabels(labelsFromBook(chosen, columnMap(data?.quizTitles, data?.quizLabels)));
      if (fromCache) return;
      if (intentChanged) writeIntent(userId, nextIntent);
      void repairChosen(userId, chosen, primary);
    };

    const listen = () => {
      unsub();
      unsub = onSnapshot(
        ref,
        (snap) => {
          attempt = 0;
          apply(snap.exists() ? snap.data() as Record<string, unknown> : null, snap.metadata.fromCache);
        },
        (error) => {
          console.error('Failed to load quiz labels', error);
          if (cancelled) return;
          setLabels(labelsFromBook(readIntent(userId), {}));
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
    const existing = readIntent(userId)[topic];
    if (!title && existing?.title && !hydrated.current) throw new Error('Quiz name is still loading');
    const updatedAt = Date.now();
    const intent = readIntent(userId);
    intent[topic] = { title, updatedAt };
    writeIntent(userId, intent);
    if (title) rememberTitles(userId, { [topic]: { title, updatedAt } });
    else forgetTitle(userId, topic);
    setLabels((prev) => {
      const optimistic = { ...prev };
      if (title) optimistic[topic] = { ...(prev[topic] || {}), title };
      else delete optimistic[topic];
      return optimistic;
    });
    const key = `${userId}:${topic}:${title}:${updatedAt}`;
    repairKeys.add(key);
    await enqueueWrite(userId, () => writeTopicTitle(userId, topic, title, updatedAt));
  };

  return { labels, saveTopic };
}

function repairChosen(userId: string, chosen: TitleBook, primary: TitleBook) {
  for (const card of PRIVATE_QUIZ_CARDS) {
    const winner = chosen[card.topic];
    const stored = primary[card.topic];
    if (!winner) continue;
    if ((stored?.title || '') === winner.title && (stored?.updatedAt || 0) === winner.updatedAt) continue;
    const key = `${userId}:${card.topic}:${winner.title}:${winner.updatedAt}`;
    if (repairKeys.has(key)) continue;
    repairKeys.add(key);
    void enqueueWrite(userId, async () => {
      const latest = readIntent(userId)[card.topic];
      if (!latest || latest.updatedAt > winner.updatedAt || latest.title !== winner.title) return;
      try {
        await writeTopicTitle(userId, card.topic, winner.title, winner.updatedAt);
      } catch (error) {
        repairKeys.delete(key);
        console.error('Failed to restore quiz label', card.topic, error);
      }
    });
  }
}
