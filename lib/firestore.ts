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
}

const VOCAB_COLLECTION = 'vocabulary';

// Hook to fetch live data from Firestore for a specific user
export function useCloudVocabulary(userId: string | undefined) {
  const [words, setWords] = useState<CloudVocabularyItem[] | null>(null);

  useEffect(() => {
    if (!userId) {
      setWords(null);
      return;
    }

    const q = query(
      collection(dbCloud, VOCAB_COLLECTION),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CloudVocabularyItem[];
      
      // Sort alphabetically in memory
      data.sort((a, b) => a.german.localeCompare(b.german));
      setWords(data);
    });

    return () => unsubscribe();
  }, [userId]);

  return words;
}

export const addCloudWord = (word: Omit<CloudVocabularyItem, 'id'>) => addDoc(collection(dbCloud, VOCAB_COLLECTION), word);
export const updateCloudWord = (id: string, data: Partial<CloudVocabularyItem>) => updateDoc(doc(dbCloud, VOCAB_COLLECTION, id), data);
export const deleteCloudWord = (id: string) => deleteDoc(doc(dbCloud, VOCAB_COLLECTION, id));

export const bulkAddCloudWords = async (words: Omit<CloudVocabularyItem, 'id'>[]) => {
  const batch = writeBatch(dbCloud);
  words.forEach(word => {
    const newRef = doc(collection(dbCloud, VOCAB_COLLECTION));
    batch.set(newRef, word);
  });
  await batch.commit();
};