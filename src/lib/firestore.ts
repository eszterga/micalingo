import { collection, addDoc, deleteDoc, doc, updateDoc, query, where, onSnapshot, writeBatch } from 'firebase/firestore';
import { dbCloud } from './firebase';
import { useEffect, useState } from 'react';

export interface CloudVocabularyItem {
  id?: string;
  userId: string;
  german: string;
  hungarian: string;
  example?: string;
  dateAdded: number;
  category?: string;
  sourceFile?: string;
  sourceType?: string;
  deleted?: boolean;
  note?: string;
}

const VOCAB_COLLECTION = 'vocabulary';
const VOCAB_SESSION_PREFIX = 'micalingo_vocab_v1_';

/** In-memory snapshot so remounts (Quiz ↔ TopicQuizzes) paint instantly. */
const vocabMemoryCache = new Map<string, CloudVocabularyItem[]>();
const vocabSubscribers = new Map<string, Set<(words: CloudVocabularyItem[]) => void>>();
const vocabUnsubscribers = new Map<string, () => void>();

function readVocabSessionCache(userId: string): CloudVocabularyItem[] | null {
  try {
    const raw = sessionStorage.getItem(VOCAB_SESSION_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CloudVocabularyItem[]) : null;
  } catch {
    return null;
  }
}

function writeVocabSessionCache(userId: string, words: CloudVocabularyItem[]) {
  try {
    sessionStorage.setItem(VOCAB_SESSION_PREFIX + userId, JSON.stringify(words));
  } catch {
    // Quota / private mode — in-memory cache still helps within the session.
  }
}

function getCachedVocabulary(userId: string): CloudVocabularyItem[] | null {
  if (vocabMemoryCache.has(userId)) return vocabMemoryCache.get(userId)!;
  const sessionCached = readVocabSessionCache(userId);
  if (sessionCached) {
    vocabMemoryCache.set(userId, sessionCached);
    return sessionCached;
  }
  return null;
}

function publishVocabulary(userId: string, words: CloudVocabularyItem[]) {
  vocabMemoryCache.set(userId, words);
  writeVocabSessionCache(userId, words);
  const listeners = vocabSubscribers.get(userId);
  if (listeners) {
    listeners.forEach((cb) => cb(words));
  }
}

function ensureVocabSubscription(userId: string) {
  if (vocabUnsubscribers.has(userId)) return;

  const q = query(
    collection(dbCloud, VOCAB_COLLECTION),
    where('userId', '==', userId)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as CloudVocabularyItem[];
      // Do not sort by german — quiz pools mix themselves. Keep a stable recency order.
      data.sort((a, b) => (a.dateAdded || 0) - (b.dateAdded || 0) || (a.id || '').localeCompare(b.id || ''));
      publishVocabulary(userId, data);
    },
    (error) => {
      console.error('Error fetching vocabulary:', error);
      // Keep a prior warm cache if we have one; only fall back to empty on first failure.
      if (!vocabMemoryCache.has(userId)) {
        publishVocabulary(userId, []);
      }
    }
  );

  vocabUnsubscribers.set(userId, unsubscribe);
}

/**
 * Live Firestore vocabulary for a userId (or PUBLIC_LIBRARY).
 * Hydrates immediately from memory/session cache so quiz pages don't flicker
 * while waiting for the first snapshot on tablet/mobile.
 * Returns `null` only when this id has never been loaded in the session.
 */
export function useCloudVocabulary(userId: string | undefined) {
  const [words, setWords] = useState<CloudVocabularyItem[] | null>(() =>
    userId ? getCachedVocabulary(userId) : null
  );

  useEffect(() => {
    if (!userId) {
      setWords(null);
      return;
    }

    const cached = getCachedVocabulary(userId);
    setWords(cached);

    let listeners = vocabSubscribers.get(userId);
    if (!listeners) {
      listeners = new Set();
      vocabSubscribers.set(userId, listeners);
    }
    const onUpdate = (data: CloudVocabularyItem[]) => setWords(data);
    listeners.add(onUpdate);
    ensureVocabSubscription(userId);

    return () => {
      listeners!.delete(onUpdate);
      if (listeners!.size === 0) {
        vocabSubscribers.delete(userId);
        const unsub = vocabUnsubscribers.get(userId);
        if (unsub) {
          unsub();
          vocabUnsubscribers.delete(userId);
        }
        // Keep memory + session caches warm for the next mount.
      }
    };
  }, [userId]);

  return words;
}

export const addCloudWord = (word: Omit<CloudVocabularyItem, 'id'>) => addDoc(collection(dbCloud, VOCAB_COLLECTION), word);
export const updateCloudWord = (id: string, data: Partial<CloudVocabularyItem>) => updateDoc(doc(dbCloud, VOCAB_COLLECTION, id), data);
export const deleteCloudWord = (id: string) => deleteDoc(doc(dbCloud, VOCAB_COLLECTION, id));

export const vocabGermanKey = (german?: string) =>
  (german || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

/** Quiz topic categories (never includes reading / to-read library). */
export const QUIZ_VOCAB_CATEGORIES = [
  'vocabulary',
  'articles',
  'phrases',
  'prepositions',
  'adjectives',
  'verbs',
] as const;

export const READING_VOCAB_CATEGORY = 'reading';

/** Words starred after wrong answers — mixed practice pool, separate from topic quizzes. */
export const MARKED_VOCAB_CATEGORY = 'marked';

/**
 * Normalize a stored category. Missing/blank only defaults to vocabulary (quiz).
 * Explicit "reading" / "marked" always stay in their own libraries — never mixed with topic quizzes.
 */
export const vocabCategoryKey = (category?: string | null) => {
  const c = (category || '').trim();
  return c || 'vocabulary';
};

export const isReadingVocabCategory = (category?: string | null) =>
  vocabCategoryKey(category) === READING_VOCAB_CATEGORY;

export const isMarkedVocabCategory = (category?: string | null) =>
  vocabCategoryKey(category) === MARKED_VOCAB_CATEGORY;

export const isQuizVocabCategory = (category?: string | null) =>
  (QUIZ_VOCAB_CATEGORIES as readonly string[]).includes(vocabCategoryKey(category));

export const isActiveVocabItem = (w: { deleted?: boolean } | null | undefined) => !!w && !w.deleted;

/** Same german + same library topic (reading vs vocabulary quiz stay distinct). */
export const isSameVocabEntry = (
  a: { german?: string; category?: string },
  german: string,
  category?: string
) =>
  vocabGermanKey(a.german) === vocabGermanKey(german) &&
  vocabCategoryKey(a.category) === vocabCategoryKey(category);

/** Find an active duplicate in the SAME topic library only. */
export function findVocabDuplicate(
  words: Array<{ id?: string; german?: string; category?: string; deleted?: boolean }>,
  german: string,
  category: string,
  excludeId?: string | null
) {
  const key = vocabGermanKey(german);
  const cat = vocabCategoryKey(category);
  if (!key) return undefined;
  return words.find((w) => {
    if (!isActiveVocabItem(w)) return false;
    if (excludeId && w.id && w.id === excludeId) return false;
    if (vocabGermanKey(w.german) !== key) return false;
    return vocabCategoryKey(w.category) === cat;
  });
}

/**
 * Hard-delete soft-deleted leftovers for a german+category key.
 * Keeps active siblings (e.g. the remaining copy after deleting one duplicate).
 */
export async function purgeSoftDeletedVocabSiblings(
  words: CloudVocabularyItem[],
  german: string,
  category?: string,
  keepId?: string | null
) {
  const ids = words
    .filter(
      (w) =>
        !!w.id &&
        w.id !== keepId &&
        !!w.deleted &&
        isSameVocabEntry(w, german, category)
    )
    .map((w) => w.id!) as string[];
  if (ids.length === 0) return 0;
  await bulkDeleteCloudWords(ids);
  return ids.length;
}

/**
 * After save: hard-delete every other doc with the same german+category
 * (soft-deleted tombstones AND extra active duplicates), keeping keepId.
 */
export async function purgeVocabDuplicatesKeeping(
  words: CloudVocabularyItem[],
  german: string,
  category: string | undefined,
  keepId: string
) {
  const ids = words
    .filter(
      (w) =>
        !!w.id &&
        w.id !== keepId &&
        isSameVocabEntry(w, german, category)
    )
    .map((w) => w.id!) as string[];
  if (ids.length === 0) return 0;
  await bulkDeleteCloudWords(ids);
  return ids.length;
}

/** Delete one cloud word and scrub soft-deleted siblings so they can't block future edits. */
export async function deleteCloudWordPurgingSoftDeleted(
  word: { id?: string; german?: string; category?: string },
  words: CloudVocabularyItem[]
) {
  if (word.id) {
    await deleteCloudWord(word.id);
  }
  if (word.german) {
    await purgeSoftDeletedVocabSiblings(words, word.german, word.category, null);
  }
}

export const bulkAddCloudWords = async (words: Omit<CloudVocabularyItem, 'id'>[]): Promise<string[]> => {
  if (!words || words.length === 0) {
    throw new Error('No words to add');
  }

  // Validate each word has required fields
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word.german?.trim() || !word.hungarian?.trim() || !word.userId) {
      console.error(`Invalid word at index ${i}:`, word);
      throw new Error(`Invalid word data at row ${i + 1}: german and hungarian are required. Got: ${JSON.stringify(word)}`);
    }
    if (typeof word.dateAdded !== 'number') {
      throw new Error(`Invalid word at index ${i}: dateAdded must be a number`);
    }
  }

  const createdIds: string[] = [];
  try {
    const chunkSize = 450; // Stay well below Firestore's 500 operation limit
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize);
      const batch = writeBatch(dbCloud);
      
      chunk.forEach(word => {
        const newRef = doc(collection(dbCloud, VOCAB_COLLECTION));
        batch.set(newRef, {
          ...word,
          german: word.german.trim(),
          hungarian: word.hungarian.trim(),
          example: word.example?.trim() || '',
          dateAdded: word.dateAdded
        });
        createdIds.push(newRef.id);
      });
      
      await batch.commit();
    }
  } catch (error) {
    console.error('Firestore bulk add error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('permission-denied')) {
      throw new Error('Database permission denied. Please check Firestore security rules.');
    } else if (errorMessage.includes('unauthenticated')) {
      throw new Error('Not authenticated. Please log in again.');
    }
    throw new Error(`Database error: ${errorMessage}`);
  }
  return createdIds;
};

export const bulkDeleteCloudWords = async (ids: string[]) => {
  if (!ids || ids.length === 0) {
    throw new Error('No words to delete');
  }

  try {
    const chunkSize = 500; // Firestore allows max 500 operations per batch
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const batch = writeBatch(dbCloud);
      chunk.forEach(id => {
        batch.delete(doc(dbCloud, VOCAB_COLLECTION, id));
      });
      await batch.commit();
    }
  } catch (error) {
    console.error('Firestore bulk delete error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('permission-denied')) {
      throw new Error('Database permission denied. Please check Firestore security rules.');
    } else if (errorMessage.includes('unauthenticated')) {
      throw new Error('Not authenticated. Please log in again.');
    }
    throw new Error(`Database error: ${errorMessage}`);
  }
};