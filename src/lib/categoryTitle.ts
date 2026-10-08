/** Route ids whose translation key is not the same string. */
const CATEGORY_TITLE_KEYS: Record<string, string> = {
  classics: 'classic_literature',
  'short-stories': 'short_stories',
  'other-music': 'other_music',
  'other-podcasts': 'other_podcasts',
  'non-fiction': 'non_fiction',
  'other-audiobooks': 'other_audiobooks',
};

export function categoryTitleKey(categoryId?: string | null) {
  if (!categoryId) return '';
  return CATEGORY_TITLE_KEYS[categoryId] || categoryId;
}
