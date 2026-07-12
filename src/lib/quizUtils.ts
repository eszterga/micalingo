import { publicVocabulary, publicPhrases, publicArticles, publicPrepositions } from './public-data';

export const WORDS_PER_QUIZ = 20;
export const PUBLIC_TOPICS = ['vocabulary', 'phrases', 'articles', 'prepositions'];

/**
 * Returns a deduplicated list of words for a given public topic, combining
 * cloud DB words and the static public data. Mirrors the same logic used
 * across Quiz.tsx and Results.tsx so total quiz counts are always consistent.
 */
export function getCleanedPublicTopicWords(topicName: string, cloudWords: any[]): any[] {
  if (!PUBLIC_TOPICS.includes(topicName)) return [];

  let staticSource: any[] = [];
  if (topicName === 'vocabulary') staticSource = publicVocabulary;
  else if (topicName === 'phrases') staticSource = publicPhrases;
  else if (topicName === 'articles') staticSource = publicArticles;
  else if (topicName === 'prepositions') staticSource = publicPrepositions;

  const dbSource = cloudWords.filter(w => w.category === topicName);
  const combined = [...dbSource, ...staticSource];
  const seen = new Set<string>();

  return combined.filter(word => {
    const german = (word?.german || '').trim();
    const hungarian = (word?.hungarian || '').trim();
    if (!german || !hungarian) return false;
    if (word?.deleted) return false;
    const germanKey = german.toLowerCase();
    if (seen.has(germanKey)) return false;
    seen.add(germanKey);
    return true;
  });
}

/**
 * Returns the total number of quizzes available for a given public topic.
 * This is flexible: as new words are added to the static data or cloud library,
 * the count updates automatically.
 */
export function getTotalQuizzesForTopic(topicName: string, cloudWords: any[]): number {
  const words = getCleanedPublicTopicWords(topicName, cloudWords);
  return Math.ceil(words.length / WORDS_PER_QUIZ);
}
