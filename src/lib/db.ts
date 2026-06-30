import Dexie, { type EntityTable } from 'dexie';

export interface VocabularyItem {
  id?: number;
  german: string;
  hungarian: string;
  example?: string;
  dateAdded: number;
  category?: string;
}

const db = new Dexie('MicaLingoDB') as Dexie & {
  vocabulary: EntityTable<VocabularyItem, 'id'>;
};

db.version(1).stores({
  vocabulary: '++id, german, hungarian, dateAdded'
});

// Add version 2 to smoothly upgrade the database schema with the new category field
db.version(2).stores({
  vocabulary: '++id, german, hungarian, dateAdded, category'
});

export { db };