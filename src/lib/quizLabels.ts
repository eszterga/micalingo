import { useEffect, useRef, useState } from 'react';
import { doc, getDocFromServer, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
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
const columnMemory = new Map<string, QuizLabelMap>();
const repairKeys = new Set<string>();
const ensureDocTasks = new Map<string, Promise<void>>();
const writeTails = new Map<string, Promise<void>>();
const serverLoads = new Map<string, Promise<Record<string, unknown> | null>>();

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

function asMillis(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (value && typeof value === 'object') {
    const stamp = value as { toMillis?: () => number; seconds?: number };
    if (typeof stamp.toMillis === 'function') {
      const ms = stamp.toMillis();
      if (typeof ms === 'number' && Number.isFinite(ms) && ms > 0) return ms;
    }
    if (typeof stamp.seconds === 'number' && stamp.seconds > 0) return Math.round(stamp.seconds * 1000);
  }
  return 0;
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
    const updatedAt = asMillis(record.updatedAt);
    if (!title && (!keepBlanks || updatedAt <= 0)) continue;
    book[card.topic] = { title, updatedAt };
  }
  return book;
}

/** Newer stamp wins. A missing incoming value keeps the current one, so a blank cache cannot erase a name. */
function preferStamp(current: TitleStamp | undefined, incoming: TitleStamp | undefined): TitleStamp | undefined {
  if (!incoming || (!incoming.title && incoming.updatedAt <= 0)) return current;
  if (!current) return incoming;
  if (incoming.updatedAt > current.updatedAt) return incoming;
  if (incoming.updatedAt < current.updatedAt) return current;
  if (current.title) return current;
  if (incoming.title) return incoming;
  return current;
}

function mergeBooks(...books: TitleBook[]): TitleBook {
  const next: TitleBook = {};
  for (const book of books) {
    for (const card of PRIVATE_QUIZ_CARDS) {
      const picked = preferStamp(next[card.topic], book[card.topic]);
      if (picked) next[card.topic] = picked;
    }
  }
  return next;
}

function sameBook(left: TitleBook, right: TitleBook): boolean {
  return PRIVATE_QUIZ_CARDS.every((card) => {
    const a = left[card.topic];
    const b = right[card.topic];
    return (a?.title || '') === (b?.title || '') && (a?.updatedAt || 0) === (b?.updatedAt || 0);
  });
}

/** Titles saved on the account. An absent slot is not a deletion; a blank title with a timestamp is. */
function cloudBook(data: Record<string, unknown> | null): TitleBook {
  if (!data) return {};
  const primary = readTitleBook(data.quizTitles, true);
  const legacy = readTitleBook(data.quizLabels, true);
  const next: TitleBook = {};
  for (const card of PRIVATE_QUIZ_CARDS) {
    const fromPrimary = primary[card.topic];
    const fromLegacy = legacy[card.topic];
    if (fromPrimary && (fromPrimary.title || fromPrimary.updatedAt > 0)) {
      if (!fromLegacy || fromPrimary.updatedAt >= fromLegacy.updatedAt) next[card.topic] = fromPrimary;
      else if (fromLegacy.title) next[card.topic] = fromLegacy;
      else next[card.topic] = fromPrimary;
    } else if (fromLegacy?.title) {
      next[card.topic] = fromLegacy;
    }
  }
  return next;
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
 * An empty title stays on the document as a timestamped blank, so "missing" never means "deleted".
 */
async function writeTopicTitle(userId: string, topic: PrivateQuizTopic, title: string, updatedAt: number) {
  const ref = doc(dbCloud, 'user_settings', userId);
  const payload = {
    [`quizTitles.${topic}.title`]: title,
    [`quizTitles.${topic}.updatedAt`]: updatedAt,
    [`quizLabels.${topic}.title`]: title,
    [`quizLabels.${topic}.updatedAt`]: updatedAt,
  };
  try {
    await updateDoc(ref, payload);
  } catch (error) {
    if (firestoreCode(error) !== 'not-found') throw error;
    await ensureSettingsDoc(userId);
    await updateDoc(ref, payload);
  }
}

type TitleSource = 'cache' | 'server' | 'listen';

/**
 * Keeps every saved name.
 * The direct server read can rename or clear a slot.
 * A live listener can apply a newer save.
 * A cache snapshot can fill a hole, and cannot erase a name it simply does not contain.
 */
function resolveTitles(userId: string, cloud: TitleBook, source: TitleSource): TitleBook {
  const next: TitleBook = mergeBooks(rememberedTitles.get(userId) || {}, readIntent(userId));
  for (const card of PRIVATE_QUIZ_CARDS) {
    const remote = cloud[card.topic];
    if (!remote || (!remote.title && remote.updatedAt <= 0)) continue;
    const local = next[card.topic];
    if (!local) {
      next[card.topic] = remote;
      continue;
    }
    if (source === 'server') {
      if (local.updatedAt > remote.updatedAt) continue;
      next[card.topic] = remote;
      continue;
    }
    if (source === 'listen') {
      if (remote.updatedAt > local.updatedAt) next[card.topic] = remote;
      continue;
    }
    const picked = preferStamp(local, remote);
    if (picked) next[card.topic] = picked;
  }
  const persisted = mergeBooks(readIntent(userId), next);
  if (!sameBook(readIntent(userId), persisted)) writeIntent(userId, persisted);
  for (const card of PRIVATE_QUIZ_CARDS) {
    const entry = persisted[card.topic];
    if (!entry) continue;
    if (entry.title) rememberTitles(userId, { [card.topic]: entry });
    else if (entry.updatedAt > 0) forgetTitle(userId, card.topic);
  }
  return persisted;
}

function rememberColumns(userId: string, incoming: QuizLabelMap, source: TitleSource): QuizLabelMap {
  const prev = columnMemory.get(userId) || {};
  if (source !== 'server' && Object.keys(incoming).length === 0) return prev;
  const next: QuizLabelMap = { ...prev };
  for (const card of PRIVATE_QUIZ_CARDS) {
    const found = incoming[card.topic];
    if (found) next[card.topic] = { ...(prev[card.topic] || {}), ...found };
  }
  columnMemory.set(userId, next);
  return next;
}

/** One network read per account, shared by every page that shows the names. */
function loadSettingsFromServer(userId: string): Promise<Record<string, unknown> | null> {
  const existing = serverLoads.get(userId);
  if (existing) return existing;
  const task = getDocFromServer(doc(dbCloud, 'user_settings', userId))
    .then((snap) => (snap.exists() ? snap.data() as Record<string, unknown> : null));
  serverLoads.set(userId, task);
  void task.then(
    () => {
      window.setTimeout(() => {
        if (serverLoads.get(userId) === task) serverLoads.delete(userId);
      }, 1500);
    },
    () => {
      if (serverLoads.get(userId) === task) serverLoads.delete(userId);
    },
  );
  return task;
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
    let held = mergeBooks(rememberedTitles.get(userId) || {}, intent);
    setLabels(labelsFromBook(held, columnMemory.get(userId) || {}));
    hydrated.current = true;
    const ref = doc(dbCloud, 'user_settings', userId);

    const apply = (data: Record<string, unknown> | null, source: TitleSource) => {
      if (cancelled) return;
      const cloud = cloudBook(data);
      held = mergeBooks(held, resolveTitles(userId, cloud, source));
      const columns = rememberColumns(userId, columnMap(data?.quizTitles, data?.quizLabels), source);
      setLabels(labelsFromBook(held, columns));
      if (source === 'server') void repairChosen(userId, held, cloud);
    };

    const listen = () => {
      unsub();
      unsub = onSnapshot(
        ref,
        (snap) => {
          attempt = 0;
          const source: TitleSource = snap.metadata.fromCache || snap.metadata.hasPendingWrites ? 'cache' : 'listen';
          apply(snap.exists() ? snap.data() as Record<string, unknown> : null, source);
        },
        (error) => {
          console.error('Failed to load quiz labels', error);
          if (cancelled) return;
          setLabels(labelsFromBook(mergeBooks(held, readIntent(userId), rememberedTitles.get(userId) || {}), columnMemory.get(userId) || {}));
          if (attempt >= 3) return;
          attempt += 1;
          window.setTimeout(() => {
            if (!cancelled) listen();
          }, 400 * attempt);
        }
      );
    };
    listen();

    // Desktop keeps a persistent Firestore cache. After login or a deploy that cache can be a
    // blank copy of the settings doc, and the live listener will not replace it until something
    // writes. Read the account directly so the saved names show without editing one of them.
    void loadSettingsFromServer(userId).then((data) => {
      apply(data, 'server');
    }).catch((error) => {
      console.error('Failed to refresh quiz labels from server', error);
    });

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

function repairChosen(userId: string, chosen: TitleBook, cloud: TitleBook) {
  for (const card of PRIVATE_QUIZ_CARDS) {
    const winner = chosen[card.topic];
    const stored = cloud[card.topic];
    if (!winner || (!winner.title && winner.updatedAt <= 0)) continue;
    if (stored && stored.updatedAt > winner.updatedAt) continue;
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
