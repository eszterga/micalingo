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
    }, (error) => {
      console.error('Error fetching vocabulary:', error);
      setWords([]);
    });

    return () => unsubscribe();
  }, [userId]);

  return words;
}

export const addCloudWord = (word: Omit<CloudVocabularyItem, 'id'>) => addDoc(collection(dbCloud, VOCAB_COLLECTION), word);
export const updateCloudWord = (id: string, data: Partial<CloudVocabularyItem>) => updateDoc(doc(dbCloud, VOCAB_COLLECTION, id), data);
export const deleteCloudWord = (id: string) => deleteDoc(doc(dbCloud, VOCAB_COLLECTION, id));

export const bulkAddCloudWords = async (words: Omit<CloudVocabularyItem, 'id'>[]) => {
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