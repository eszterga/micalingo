import { collection, getDocsFromServer, query, where } from 'firebase/firestore';
import { dbCloud } from './firebase';

/** Older uploads used category ids that no longer have their own UI tiles. */
const CATEGORY_ALIASES: Record<string, string[]> = {
  culture: ['art'],
};

function isVisibleToViewer(item: { userId?: string }, userId?: string): boolean {
  if (item.userId === 'PUBLIC_LIBRARY' || !item.userId) return true;
  if (userId && item.userId === userId) return true;
  return false;
}

/**
 * Load public (+ own) materials for a category from the server.
 * Bypasses IndexedDB cache so Android/WebView does not stick on stale empty results.
 */
export async function fetchVisibleLibraryItems(
  collectionName: string,
  categoryId: string | undefined,
  userId?: string
): Promise<any[]> {
  if (!categoryId) return [];

  const aliases = CATEGORY_ALIASES[categoryId] || [];
  const categoryIds = [categoryId, ...aliases];
  const byId = new Map<string, any>();

  const ingest = (docs: { id: string; data: () => any }[]) => {
    docs.forEach((d) => {
      const item = { id: d.id, ...d.data() };
      if (!isVisibleToViewer(item, userId)) return;
      byId.set(d.id, item);
    });
  };

  // One server query per category id (usually just one) — much faster than scanning the whole library.
  try {
    const snaps = await Promise.all(
      categoryIds.map((id) =>
        getDocsFromServer(query(collection(dbCloud, collectionName), where('categoryId', '==', id)))
      )
    );
    snaps.forEach((snap) => ingest(snap.docs));
  } catch (primaryError) {
    console.warn('Category query failed, falling back to PUBLIC_LIBRARY:', primaryError);
    try {
      const publicSnap = await getDocsFromServer(
        query(collection(dbCloud, collectionName), where('userId', '==', 'PUBLIC_LIBRARY'))
      );
      publicSnap.docs.forEach((d) => {
        const item: any = { id: d.id, ...d.data() };
        if (!categoryIds.includes(item.categoryId)) return;
        byId.set(d.id, item);
      });

      if (userId) {
        const ownSnap = await getDocsFromServer(
          query(collection(dbCloud, collectionName), where('userId', '==', userId))
        );
        ownSnap.docs.forEach((d) => {
          const item: any = { id: d.id, ...d.data() };
          if (!categoryIds.includes(item.categoryId)) return;
          byId.set(d.id, item);
        });
      }
    } catch (fallbackError) {
      console.error('Error fetching library items:', fallbackError);
      throw fallbackError;
    }
  }

  return Array.from(byId.values()).sort(
    (a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0)
  );
}
