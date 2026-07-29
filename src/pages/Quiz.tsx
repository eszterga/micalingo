import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useI18n } from "../I18nContext";
import { useCloudVocabulary, vocabCategoryKey, isReadingVocabCategory, isMarkedVocabCategory } from "../lib/firestore";
import { publicVocabulary, publicPhrases, publicArticles, publicPrepositions, publicAdjectives } from "../lib/public-data";
import {
  WORDS_PER_QUIZ,
  isQuizTopic,
  buildPublicQuizPool,
  buildCustomQuizPool,
  getQuizLevelWords,
  getArticleFromQuizWord,
  getNounFromArticleQuizWord,
  getArticleQuizHint,
  isArticleLabel,
} from "../lib/quizPool";
import { doc, setDoc } from 'firebase/firestore';
import { dbCloud } from '../lib/firebase';
import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import {
  filterMarkedWords,
  generateMarkedQuestions,
  getMarkedQuizLevels,
  getMarkedWordsForQuiz,
  isWordMarked,
  markWrongWord,
  unmarkWord,
} from "./markedWordsQuizEngine";

interface Question {
  questionText: string;
  options: string[];
  correctAnswer: string;
  example?: string;
  german?: string;
  hungarian?: string;
}

/** Module-level cache — building this from ~1k static words is expensive on mobile. */
let staticGermanTermsCache: Set<string> | null = null;

function addGermanTerm(set: Set<string>, german?: string) {
  if (!german) return;
  const lower = german.toLowerCase().trim();
  set.add(lower);
  set.add(lower.replace(/^(der|die|das)\s+/i, '').trim());
  set.add(lower.replace(/^sich\s+/i, '').trim());
}

function getStaticGermanTerms(): Set<string> {
  if (staticGermanTermsCache) return staticGermanTermsCache;
  const set = new Set<string>();
  publicVocabulary.forEach((w) => addGermanTerm(set, w.german));
  publicPhrases.forEach((w) => addGermanTerm(set, w.german));
  publicArticles.forEach((w) => addGermanTerm(set, w.german));
  publicPrepositions.forEach((w) => addGermanTerm(set, w.german));
  if (publicAdjectives) publicAdjectives.forEach((w) => addGermanTerm(set, w.german));
  set.add('verhalten');
  staticGermanTermsCache = set;
  return set;
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const BackgroundBlobs = () => (
  <>
    <style>{`
      @keyframes blob {
        0% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
        100% { transform: translate(0px, 0px) scale(1); }
      }
      .animate-blob { animation: blob 15s infinite alternate; }
      .animation-delay-2000 { animation-delay: 2s; }
      .animation-delay-4000 { animation-delay: 4s; }
    `}</style>
    <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-blue-300 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-40 animate-blob pointer-events-none z-0"></div>
    <div className="fixed top-[10%] right-[-5%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-purple-300 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-40 animate-blob animation-delay-2000 pointer-events-none z-0"></div>
    <div className="fixed bottom-[-10%] left-[20%] w-[45vw] h-[45vw] max-w-[550px] max-h-[550px] bg-pink-200 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-40 animate-blob animation-delay-4000 pointer-events-none z-0"></div>
  </>
);

export default function Quiz() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const topic = searchParams.get("topic");
  const quizId = parseInt(searchParams.get("quizId") || "1", 10);
  const isCustom = searchParams.get("custom") === 'true';
  const isMarked = topic === 'marked';
  const isRedo = searchParams.get("redo") === 'true';
  const userVocabulary = useCloudVocabulary(user?.uid);
  const publicDbWordsRaw = useCloudVocabulary("PUBLIC_LIBRARY");
  const publicDbWords = publicDbWordsRaw || [];

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizState, setQuizState] = useState<'loading' | 'ongoing' | 'finished' | 'no_data'>('loading');
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [markBusy, setMarkBusy] = useState(false);
  /** germanKey → firestore id (empty string = pending / known marked without id yet) */
  const [localMarkedIds, setLocalMarkedIds] = useState<Record<string, string | null>>({});
  /** Prevents regenerating (and flickering) when cloud vocab arrives after questions are ready. */
  const builtQuizKeyRef = useRef<string | null>(null);

  const [showExamples] = useState(() => {
    const stored = localStorage.getItem('micalingo_show_examples');
    return stored !== null ? JSON.parse(stored) : true;
  });

  const translatedTopic = topic === 'vocabulary' ? t('vocabulary')
    : topic === 'articles' ? t('articles_quiz')
    : topic === 'phrases' ? (t('phrases_sentences_quiz') || 'Phrases and sentences')
    : topic === 'prepositions' ? t('prepositions_quiz')
    : topic === 'adjectives' ? (t('adjectives_quiz') || 'Adjectives')
    : topic === 'verbs' ? (t('verbs_quiz') || 'Verbs')
    : topic === 'marked' ? (t('marked_words') || 'Marked words')
    : t('personalized_space');

  const markedWords = useMemo(
    () => filterMarkedWords(userVocabulary || []),
    [userVocabulary]
  );

  const publicQuizPool = useMemo(() => {
    if (!topic || !isQuizTopic(topic)) return [];
    // Merge static seed with whatever cloud data we have (cache or live).
    // Higher levels that need PUBLIC_LIBRARY stay empty until it arrives — see quiz effect.
    return buildPublicQuizPool(topic, publicDbWords);
  }, [topic, publicDbWords]);

  const totalQuizzes = useMemo(() => {
    if (isMarked) {
      return Math.max(1, getMarkedQuizLevels(markedWords));
    }
    if (!topic || !isQuizTopic(topic)) return 0;
    return Math.max(1, Math.ceil(publicQuizPool.length / WORDS_PER_QUIZ));
  }, [topic, publicQuizPool, isMarked, markedWords]);

  const customTopicWords = useMemo(() => {
    if (!isCustom || !topic) return [];
    return buildCustomQuizPool(topic, userVocabulary || undefined);
  }, [isCustom, topic, userVocabulary]);

  const hasNextQuiz = useMemo(() => {
    if (!topic || quizId <= 0) return false;

    if (isMarked) {
      if (!userVocabulary) return true;
      return quizId < getMarkedQuizLevels(markedWords);
    }

    if (isCustom) {
      // Vocab still loading on Capacitor — don't hide Next (same idea as public undercount safeguard).
      if (!userVocabulary) return true;
      const customTotal = Math.max(1, Math.ceil(customTopicWords.length / WORDS_PER_QUIZ));
      // If cloud/cache undercounts to 1, still offer Next; past the end shows "all completed".
      if (customTotal <= 1) return true;
      return quizId < customTotal;
    }

    // Public quizzes: if cloud data undercounts (totalQuizzes === 1), still offer Next.
    // Navigating past the last quiz shows the existing "all completed" screen.
    if (totalQuizzes <= 1) return true;
    return quizId < totalQuizzes;
  }, [topic, quizId, isCustom, isMarked, userVocabulary, customTopicWords, markedWords, totalQuizzes]);

  // Return to the same library the user started from (private custom / marked / public)
  const quizzesBackPath = isMarked
    ? '/quizzes?tab=marked'
    : topic && isQuizTopic(topic)
      ? `/quizzes/${topic}${isCustom ? '?tab=custom' : ''}`
      : isCustom
        ? '/quizzes?tab=personal'
        : '/quizzes';
  let pageTitle = "";
  if (isMarked) {
    pageTitle = t('quiz_title_marked', { id: quizId || '' }).trim();
  } else if (isCustom) {
    pageTitle = t('quiz_title_custom', { topic: translatedTopic, id: quizId || '' }).trim();
  } else if (topic) {
    pageTitle = t('quiz_title_public', { topic: translatedTopic, id: quizId || '' }).trim();
  } else {
    pageTitle = t('quiz_title_personal');
  }

  const germanTermsLookup = useMemo(() => {
    const set = new Set(getStaticGermanTerms());
    publicDbWords.forEach((w: any) => addGermanTerm(set, w.german));
    if (userVocabulary) userVocabulary.forEach((w: any) => addGermanTerm(set, w.german));
    return set;
  }, [publicDbWords, userVocabulary]);

  const generateQuestions = useCallback((words: any[]) => {
    const selectedWords = [...words];
    const allGermanTerms = germanTermsLookup;
    return selectedWords.map(word => {
      if (topic === 'articles') {
        const baseArticle = getArticleFromQuizWord(word);
        const baseNoun = getNounFromArticleQuizWord(word);
        const hint = getArticleQuizHint(word);
        const translation = (word.hungarian || '').trim();
        const meaning =
          translation && !isArticleLabel(translation) ? ` (${translation})` : '';

        const correctAnswer = baseArticle;
        const allowedArticles = ['der', 'die', 'das'];
        const distractors = allowedArticles.filter((a) => a !== correctAnswer);
        const options = shuffleInPlace([...distractors, correctAnswer]);

        return {
          questionText: `___ ${baseNoun}${meaning}`,
          options,
          correctAnswer,
          example: hint,
          german: word.german,
          hungarian: translation && !isArticleLabel(translation) ? translation : undefined,
        };
      } else if (topic === 'prepositions') {
        const correctAnswer = word.hungarian || '';
        const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
        const normalizedCorrect = normalize(correctAnswer);

        // Strictly filter the user's pool to ONLY allow valid preposition formats as distractors
        let distractorPool = words
          .map(w => w.hungarian)
          .filter(h => h && typeof h === 'string' && (h.includes('+') || /akk|dat|gen/i.test(h)));

        const fallbackPool = [
          "auf + Akk.", "auf + Dat.", "an + Akk.", "an + Dat.", 
          "in + Akk.", "in + Dat.", "mit + Dat.", "für + Akk.", 
          "über + Akk.", "über + Dat.", "von + Dat.", "zu + Dat.", 
          "bei + Dat.", "aus + Dat.", "nach + Dat.", "um + Akk.", 
          "durch + Akk.", "ohne + Akk.", "gegen + Akk.", "wegen + Akk.", 
          "unter + Akk.", "unter + Dat.", "vor + Akk.", "vor + Dat.", 
          "hinter + Akk.", "hinter + Dat.", "neben + Akk.", "neben + Dat.", 
          "zwischen + Akk.", "zwischen + Dat.", "trotz + Gen.", 
          "wegen + Gen.", "während + Gen.", "aufgrund + Gen.",
          "ab + Dat.", "seit + Dat.", "entgegen + Dat.", "gegenüber + Dat."
        ];
        
        distractorPool = [...distractorPool, ...fallbackPool];

        const uniqueDistractors: string[] = [];
        const seenNormalized = new Set<string>([normalizedCorrect]);

        shuffleInPlace(distractorPool);
        
        for (const d of distractorPool) {
          const normD = normalize(d);
          if (!seenNormalized.has(normD)) {
            seenNormalized.add(normD);
            uniqueDistractors.push(d);
          }
          if (uniqueDistractors.length === 3) break;
        }

        const options = shuffleInPlace([...uniqueDistractors, correctAnswer]);

        return {
          questionText: word.german, // Column A (Verb + Hungarian meaning)
          options, // Column B (Preposition + Case) + Distractors
          correctAnswer, // Column B
          example: word.example, // Column C (Additional explanation)
          german: word.german,
          hungarian: word.hungarian
        };
      } else {
        const correctAnswer = word.hungarian;
        const isValidDistractor = (str: string) => {
          if (typeof str !== 'string' || str.trim().length <= 1 || str.trim().startsWith('-')) return false;
          const lowerStr = str.toLowerCase().trim();
          // Allow if it's the correct answer itself
          if (lowerStr === (correctAnswer || '').toLowerCase().trim()) return true;
          // Otherwise, reject if it's a known German word (prevents data entry errors leaking into Hungarian options)
          return !allGermanTerms.has(lowerStr);
        };

        let distractorPool = Array.from(new Set(words.map(w => w.hungarian))).filter(h => h !== correctAnswer && isValidDistractor(h));

        if (distractorPool.length < 3) {
          let fallbackSource = isCustom
            ? (userVocabulary || []).filter((w: any) => !isReadingVocabCategory(w.category) && !isMarkedVocabCategory(w.category) && vocabCategoryKey(w.category) === topic)
            : (topic === 'phrases' ? publicPhrases : publicVocabulary);
          // Filter out invalid vocabulary entries (like articles) from being used as distractors.
          if (topic === 'vocabulary') {
            fallbackSource = fallbackSource.filter((w: any) => !['der', 'die', 'das'].includes((w.german || '').trim().toLowerCase()));
          }
          const fallbackPool = Array.from(new Set(fallbackSource.map((w: any) => w.hungarian))).filter((h: any) => h !== correctAnswer && isValidDistractor(h));
          distractorPool = Array.from(new Set([...distractorPool, ...fallbackPool]));
        }

        shuffleInPlace(distractorPool);
        const distractors = distractorPool.slice(0, 3);

        const options = shuffleInPlace([...distractors, correctAnswer]);

        return {
          questionText: word.german,
          options,
          correctAnswer,
          example: word.example,
          german: word.german,
          hungarian: word.hungarian
        };
      }
    }).filter(Boolean) as Question[];
  }, [topic, isCustom, germanTermsLookup, userVocabulary]);

  useEffect(() => {
    const quizKey = isCustom ? `custom_${topic || 'general'}_${quizId}` : `${topic || 'custom'}_${quizId}`;

    const isFinished = searchParams.get('finished') === 'true';
    if (isFinished) {
      const historyKey = user ? `micalingo_history_${user.uid}` : 'micalingo_guest_history';
      const historyMap = JSON.parse(localStorage.getItem(historyKey) || '{}');
      const savedHistory = historyMap[quizKey];
      if (savedHistory) {
        setQuestions(savedHistory.questions || []);
        setScore(savedHistory.score || 0);
        setUserAnswers(savedHistory.userAnswers || []);
        setQuizState('finished');
        builtQuizKeyRef.current = quizKey;
        return;
      }
      // finished=true but no history yet — keep in-memory completion UI (next/review/download)
      return;
    }

    // Already built this quiz — don't rebuild when cloud vocab updates (avoids mobile flicker).
    if (builtQuizKeyRef.current === quizKey) {
      return;
    }

    // Marked / custom quizzes only need the user's vocabulary.
    if ((isMarked || isCustom) && userVocabulary === null) {
      setQuizState('loading');
      return;
    }

    const progressKey = user ? `micalingo_quiz_progress_${user.uid}` : 'micalingo_quiz_progress_guest';
    const progressMap = JSON.parse(localStorage.getItem(progressKey) || '{}');
    const savedProgress = progressMap[quizKey];

    if (isRedo && savedProgress) {
      delete progressMap[quizKey];
      localStorage.setItem(progressKey, JSON.stringify(progressMap));
    } else if (savedProgress && savedProgress.questions && savedProgress.questions.length > 0) {
      // Marked pool can grow after an early partial load saved a short quiz (e.g. 4 Qs).
      // Drop stale progress when it no longer matches the current level size.
      if (isMarked) {
        const expectedCount = getMarkedWordsForQuiz(markedWords, quizId).length;
        const savedCount = savedProgress.questions.length;
        if (expectedCount > 0 && savedCount !== expectedCount) {
          delete progressMap[quizKey];
          localStorage.setItem(progressKey, JSON.stringify(progressMap));
        } else {
          setQuestions(savedProgress.questions);
          setCurrentQuestionIndex(savedProgress.index);
          setScore(savedProgress.score);
          setUserAnswers(savedProgress.userAnswers || []);
          setQuizState('ongoing');
          builtQuizKeyRef.current = quizKey;
          return;
        }
      } else {
        setQuestions(savedProgress.questions);
        setCurrentQuestionIndex(savedProgress.index);
        setScore(savedProgress.score);
        setUserAnswers(savedProgress.userAnswers || []);
        setQuizState('ongoing');
        builtQuizKeyRef.current = quizKey;
        return;
      }
    }

    let wordsForQuiz: any[] = [];

    if (isMarked) {
      if (markedWords.length < 4) {
        // userVocabulary resolved — truly not enough marked words
        setQuizState('finished');
        setQuestions([]);
        builtQuizKeyRef.current = quizKey;
        return;
      }
      wordsForQuiz = shuffleInPlace([...getMarkedWordsForQuiz(markedWords, quizId)]);
      if (wordsForQuiz.length === 0) {
        setQuizState('no_data');
        setQuestions([]);
        builtQuizKeyRef.current = quizKey;
        return;
      }
      const newQuestions = generateMarkedQuestions(wordsForQuiz, markedWords);
      setQuestions(newQuestions);
      setCurrentQuestionIndex(0);
      setScore(0);
      setUserAnswers([]);
      setQuizState(newQuestions.length > 0 ? 'ongoing' : 'no_data');
      builtQuizKeyRef.current = quizKey;
      return;
    } else if (isCustom) {
      const sortedSource = customTopicWords;

      // Truly not enough material in the private library to run any quiz
      if (sortedSource.length < 4) {
        setQuizState('finished');
        setQuestions([]);
        builtQuizKeyRef.current = quizKey;
        return;
      }

      wordsForQuiz = shuffleInPlace([...getQuizLevelWords(sortedSource, quizId, topic ?? undefined)]);

      // Past the last private level — same "all completed" screen as public
      if (wordsForQuiz.length === 0) {
        setQuizState('no_data');
        setQuestions([]);
        builtQuizKeyRef.current = quizKey;
        return;
      }
    } else if (topic && isQuizTopic(topic)) {
      // Same pool / same slice as TopicQuizzes — keeps level N identical on web + app
      wordsForQuiz = shuffleInPlace([...getQuizLevelWords(publicQuizPool, quizId, topic ?? undefined)]);

      // Level not in static seed yet and PUBLIC_LIBRARY still loading — keep spinner,
      // do NOT flash "all completed" / empty.
      if (wordsForQuiz.length === 0 && publicDbWordsRaw === null) {
        setQuizState('loading');
        return;
      }
    } else if (userVocabulary) {
      // Never pull "reading" (to-read) or marked words into generic quiz pools
      wordsForQuiz = shuffleInPlace(
        [...userVocabulary].filter((word: any) =>
          !isReadingVocabCategory(word.category) &&
          !isMarkedVocabCategory(word.category) &&
          (word.german || '').trim() !== '' &&
          (word.hungarian || '').trim() !== ''
        )
      ).slice(0, WORDS_PER_QUIZ);
    } else if (userVocabulary === null) {
      setQuizState('loading');
      return;
    }

    if (!isCustom && !topic && userVocabulary && wordsForQuiz.length < 4) {
      setQuizState('finished');
      setQuestions([]);
      builtQuizKeyRef.current = quizKey;
      return;
    }

    if (wordsForQuiz.length > 0) {
      const newQuestions = generateQuestions(wordsForQuiz);
      setQuestions(newQuestions);
      setCurrentQuestionIndex(0);
      setScore(0);
      setUserAnswers([]);
      setQuizState(newQuestions.length > 0 ? 'ongoing' : 'no_data');
      builtQuizKeyRef.current = quizKey;
    } else if (isCustom || isMarked) {
      setQuizState('no_data');
      setQuestions([]);
      builtQuizKeyRef.current = quizKey;
    } else if (publicDbWordsRaw === null) {
      setQuizState('loading');
    } else {
      setQuizState('no_data');
      setQuestions([]);
      builtQuizKeyRef.current = quizKey;
    }
  }, [topic, userVocabulary, customTopicWords, markedWords, quizId, isCustom, isMarked, publicDbWordsRaw, publicQuizPool, isRedo, user?.uid, generateQuestions, searchParams]);
  useEffect(() => {
    if (quizState === 'ongoing' && questions.length > 0) {
      const progressKey = user ? `micalingo_quiz_progress_${user.uid}` : 'micalingo_quiz_progress_guest';
      const progressMap = JSON.parse(localStorage.getItem(progressKey) || '{}');
      const quizKey = isCustom ? `custom_${topic || 'general'}_${quizId}` : `${topic || 'custom'}_${quizId}`;

      progressMap[quizKey] = {
        index: currentQuestionIndex,
        score: score,
        questions: questions,
        userAnswers: userAnswers
      };

      localStorage.setItem(progressKey, JSON.stringify(progressMap));
    }
  }, [currentQuestionIndex, score, questions, quizState, topic, quizId, user?.uid, isCustom, userAnswers]);

  // Intercept browser back button and page reloads during an active quiz
  useEffect(() => {
    if (quizState === 'ongoing') {
      // Push a dummy state to trap the back button without changing the URL
      if (!window.history.state?.quizTrap) {
        window.history.pushState({ ...window.history.state, quizTrap: true }, '', window.location.href);
      }

      const handlePopState = () => {
        setShowQuitModal(true);
        // Push the state again to ensure the user remains trapped on the page if they cancel
        window.history.pushState({ ...window.history.state, quizTrap: true }, '', window.location.href);
      };

      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = ''; // Triggers the standard browser "Leave Site?" prompt
      };

      window.addEventListener('popstate', handlePopState);
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [quizState]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener: any = CapacitorApp.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
      if (quizState === 'ongoing') {
        setShowQuitModal(true);
      } else if (canGoBack || window.history.length > 1) {
        window.history.back();
      } else {
        navigate(quizzesBackPath, { replace: true });
      }
    });

    return () => {
      if (listener && listener.then) {
        listener.then((handle: any) => handle.remove());
      } else if (listener) {
        listener.remove();
      }
    };
  }, [quizState, quizzesBackPath, navigate]);

  const finishQuiz = async (finalScore: number, answersOverride?: string[]) => {
    const key = user ? `micalingo_scores_${user.uid}` : 'micalingo_guest_scores';
    const scores = JSON.parse(localStorage.getItem(key) || '{}');
    const quizKey = isCustom ? `custom_${topic || 'general'}_${quizId}` : `${topic || 'custom'}_${quizId}`;
    const previousScore = scores[quizKey] || 0;
    const answersForHistory = answersOverride ?? userAnswers;

    // Always store latest attempt so review/download work on the finished screen
    const historyKey = user ? `micalingo_history_${user.uid}` : `micalingo_guest_history`;
    const historyMap = JSON.parse(localStorage.getItem(historyKey) || '{}');
    historyMap[quizKey] = {
      questions,
      userAnswers: answersForHistory,
      score: finalScore
    };
    localStorage.setItem(historyKey, JSON.stringify(historyMap));

    if (finalScore >= previousScore) {
      scores[quizKey] = finalScore;
      localStorage.setItem(key, JSON.stringify(scores));

      if (user) {
        try {
          const statsRef = doc(dbCloud, 'user_stats', user.uid);
          await setDoc(statsRef, {
            scores: { [quizKey]: finalScore },
            history: { [quizKey]: { questions, userAnswers: answersForHistory, score: finalScore } }
          }, { merge: true });
        } catch (error) {
          console.error("Error saving to cloud:", error);
        }
      }
    }

    const progressKey = user ? `micalingo_quiz_progress_${user.uid}` : 'micalingo_quiz_progress_guest';
    const progressMap = JSON.parse(localStorage.getItem(progressKey) || '{}');
    if (progressMap[quizKey]) {
      delete progressMap[quizKey];
      localStorage.setItem(progressKey, JSON.stringify(progressMap));
    }

    // Trigger support prompt after 2nd quiz completion in a session
    const completions = parseInt(sessionStorage.getItem('micalingo_session_quiz_completions') || '0', 10) + 1;
    sessionStorage.setItem('micalingo_session_quiz_completions', completions.toString());

    if (completions === 2) {
      const dismissed = sessionStorage.getItem('micalingo_support_prompt_dismissed');
      if (!dismissed) {
        window.dispatchEvent(new CustomEvent('showSupportPrompt'));
      }
    }

    setQuizState('finished');
    setSearchParams(prev => {
      prev.set('finished', 'true');
      return prev;
    }, { replace: true });
  };

  const handleAnswer = (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);

    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentQuestionIndex] = answer;
    setUserAnswers(newUserAnswers);

    const isCorrect = answer === questions[currentQuestionIndex].correctAnswer;

    
    if (isCorrect) {
      setScore(s => s + 1);

      const currentExample = questions[currentQuestionIndex].example;
      const delay = (showExamples && currentExample) ? (currentExample.length > 20 ? 3300 : 2500) : 1000;
      setTimeout(() => {
        setIsAnswered(false);
        setSelectedAnswer(null);
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(i => i + 1);
        } else {
          finishQuiz(score + 1, newUserAnswers);
        }
      }, delay);
    }
  };

  const handleNext = () => {
    setIsAnswered(false);
    setSelectedAnswer(null);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
    } else {
      finishQuiz(score);
    }
  };

  const handleNextQuiz = () => {
    if (!topic || !hasNextQuiz) return;
    const nextId = quizId + 1;
    builtQuizKeyRef.current = null;
    navigate(
      `/quiz?topic=${encodeURIComponent(topic)}&quizId=${nextId}${isCustom ? '&custom=true' : ''}`
    );
    setQuizState('loading');
    setScore(0);
    setCurrentQuestionIndex(0);
    setIsAnswered(false);
    setSelectedAnswer(null);
    setUserAnswers([]);
    setQuestions([]);
  };

  const currentGermanKey = (questions[currentQuestionIndex]?.german || '').toLowerCase().trim();
  const existingMarked = isWordMarked(markedWords, questions[currentQuestionIndex]?.german);
  const localMarkId = currentGermanKey ? localMarkedIds[currentGermanKey] : undefined;
  const isCurrentMarked =
    localMarkId !== undefined ? localMarkId !== null : !!existingMarked;

  const handleToggleMark = async () => {
    if (!user || markBusy || !questions[currentQuestionIndex]) return;
    const q = questions[currentQuestionIndex];
    const key = (q.german || '').toLowerCase().trim();
    if (!key) return;

    setMarkBusy(true);
    try {
      if (isCurrentMarked) {
        const id = (localMarkId && localMarkId.length > 0 ? localMarkId : existingMarked?.id) || undefined;
        setLocalMarkedIds((prev) => ({ ...prev, [key]: null }));
        if (id) await unmarkWord(id);
      } else {
        setLocalMarkedIds((prev) => ({ ...prev, [key]: '' }));
        const saved = await markWrongWord(user.uid, markedWords, {
          german: q.german,
          hungarian: q.hungarian || q.correctAnswer,
          example: q.example,
          sourceTopic: isMarked ? undefined : (topic || undefined),
        });
        setLocalMarkedIds((prev) => ({ ...prev, [key]: saved?.id || '' }));
      }
    } catch (e) {
      console.error('Failed to toggle marked word:', e);
      setLocalMarkedIds((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } finally {
      setMarkBusy(false);
    }
  };

  const handleBackClick = () => {
    if (quizState === 'ongoing') {
      setShowQuitModal(true);
    } else {
      navigate(quizzesBackPath);
    }
  };

  const confirmQuitQuiz = () => {
    setShowQuitModal(false);
    navigate(quizzesBackPath, { replace: true });
  };

  const currentQuestion = questions[currentQuestionIndex];

  if (quizState === 'loading') {
    return (
      <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
        <BackgroundBlobs />
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[50vh] space-y-4 px-4 md:px-8">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-blue-900/70 font-medium">{t('loading_questions')}</p>
        </div>
      </div>
    );
  }

  if (quizState === 'no_data') {
    return (
      <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
        <BackgroundBlobs />
        <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 px-4 md:px-8">
          <div className="text-center bg-white/70 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white mx-4 sm:mx-0">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🎉</div>
            <h2 className="text-3xl font-extrabold text-blue-950 mb-4">{t('quiz_complete') || 'All Quizzes Completed!'}</h2>
            <p className="text-lg text-blue-900/70 font-medium max-w-md mx-auto break-words">
              {t('no_more_quizzes') || `You have completed all available ${topic || 'quiz'} quizzes!`}
            </p>
            <p className="text-blue-600 mt-2 font-medium">{t('great_job') || 'Great job with your progress!'}</p>
            <div className="mt-8">
              <button onClick={() => navigate(quizzesBackPath)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors">
                {t('back_to_quizzes')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (quizState === 'finished') {
    if (questions.length === 0 && (isCustom || isMarked || (!topic && userVocabulary))) {
      return (
        <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
          <BackgroundBlobs />
          <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 px-4 md:px-8">
            <div className="text-center bg-white/70 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white mx-4 sm:mx-0">
              <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
              <h2 className="text-3xl font-extrabold text-blue-950 mb-4">{t('not_enough_words')}</h2>
              <p className="text-lg text-blue-900/70 font-medium max-w-md mx-auto break-words">
                {isMarked
                  ? (t('marked_words_empty_desc') || t('not_enough_words_desc', { topic: translatedTopic }))
                  : t('not_enough_words_desc', { topic: translatedTopic })}
              </p>
              {!isMarked && (
                <p className="text-gray-500 mt-2 font-medium">{t('need_more_items', { topic: topic || 'custom' })}</p>
              )}
              {user && (
                <div className="mt-8">
                  <button
                    onClick={() => navigate(isMarked ? '/quizzes?tab=marked' : `/import?destination=${topic}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors"
                  >
                    {isMarked ? (t('back_to_quizzes') || 'Back') : t('import_more_words')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    const quizKey = isCustom ? `custom_${topic || 'general'}_${quizId}` : `${topic || 'custom'}_${quizId}`;

    return (
      <div
        className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8"
        style={{ paddingBottom: 'max(3rem, calc(1.5rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        <BackgroundBlobs />
        <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 px-4 md:px-8">
          <div className="text-center bg-white/70 backdrop-blur-xl p-8 sm:p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white mx-4 sm:mx-0">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🏁</div>
            <h2 className="text-3xl font-extrabold text-blue-950 mb-4">{t('quiz_complete')}</h2>
            <p className="text-xl text-blue-900/70 font-medium">{t('your_score')} <span className="font-bold text-blue-600 text-2xl">{score}</span> / {questions.length}</p>

            <div
              className={`mt-8 grid gap-3 w-full max-w-5xl mx-auto ${
                hasNextQuiz
                  ? 'grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-5'
                  : 'grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4'
              }`}
            >
              {hasNextQuiz && (
                <button
                  type="button"
                  onClick={handleNextQuiz}
                  className="w-full min-h-[3rem] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-colors text-sm sm:text-base touch-manipulation active:scale-[0.98]"
                >
                  {t('next_quiz_button') || t('go_to_level', { level: quizId + 1 })}
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(quizzesBackPath)}
                className="w-full min-h-[3rem] bg-white border border-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm sm:text-base touch-manipulation active:scale-[0.98]"
              >
                {t('back_to_quizzes')}
              </button>
              <button
                type="button"
                onClick={() => {
                  builtQuizKeyRef.current = null;
                  navigate(`/quiz?topic=${encodeURIComponent(topic || '')}&quizId=${quizId}${isCustom ? '&custom=true' : ''}&redo=true`, { replace: true });
                  setQuizState('loading');
                  setScore(0);
                  setCurrentQuestionIndex(0);
                  setIsAnswered(false);
                  setSelectedAnswer(null);
                  setUserAnswers([]);
                  setQuestions([]);
                }}
                className="w-full min-h-[3rem] bg-blue-100 text-blue-700 font-bold py-3 px-4 rounded-xl hover:bg-blue-200 transition-colors shadow-sm text-sm sm:text-base touch-manipulation active:scale-[0.98]"
              >
                {t('retry_quiz')}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/results?quizKey=${quizKey}`)}
                className="w-full min-h-[3rem] bg-purple-100 text-purple-700 font-bold py-3 px-4 rounded-xl hover:bg-purple-200 transition-colors shadow-sm text-sm sm:text-base touch-manipulation active:scale-[0.98]"
              >
                {t('review_answers') || 'Review Answers'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const exportData = questions.map((q: any, i: number) => {
                    const userAnswer = userAnswers[i] || '';
                    const isCorrect = userAnswer === q.correctAnswer;
                    return {
                      [t('csv_question') || 'Question']: q.questionText || '',
                      [t('your_answer') || 'Your Answer']: userAnswer,
                      [t('correct_answer') || 'Correct Answer']: isCorrect ? '' : (q.correctAnswer || ''),
                      [t('csv_result') || 'Result']: isCorrect ? '✅' : '❌',
                    };
                  });

                  const worksheet = XLSX.utils.json_to_sheet(exportData);
                  worksheet['!cols'] = [{ wch: 50 }, { wch: 30 }, { wch: 30 }, { wch: 15 }];
                  const workbook = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
                  XLSX.writeFile(workbook, `${quizKey}_results.xlsx`);
                }}
                className="w-full min-h-[3rem] bg-green-100 text-green-700 font-bold py-3 px-4 rounded-xl hover:bg-green-200 transition-colors shadow-sm text-sm sm:text-base touch-manipulation active:scale-[0.98]"
              >
                {t('download_button') || 'Download Excel'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
        <BackgroundBlobs />
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[50vh] space-y-4 px-4 md:px-8">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8"
      style={{ paddingBottom: 'max(3rem, calc(1.5rem + env(safe-area-inset-bottom, 0px)))' }}
    >
      <BackgroundBlobs />
      <div className="relative z-10 w-full max-w-4xl mx-auto space-y-6 px-4 md:px-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 tracking-tight break-words leading-tight">{pageTitle}</h1>
          <p className="text-blue-900/70 font-medium mt-1 text-sm sm:text-base">{t('question_of', { current: currentQuestionIndex + 1, total: questions.length })}</p>
          <div className="w-full bg-white/50 backdrop-blur-sm rounded-full h-2.5 mt-3 overflow-hidden border border-white">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-6 md:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white relative">
          {user && isAnswered && selectedAnswer !== currentQuestion.correctAnswer && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleToggleMark();
              }}
              disabled={markBusy}
              title={isCurrentMarked ? (t('unmark_word') || 'Remove mark') : (t('mark_word') || 'Mark word')}
              aria-label={isCurrentMarked ? (t('unmark_word') || 'Remove mark') : (t('mark_word') || 'Mark word')}
              className={`absolute top-3 right-3 sm:top-5 sm:right-5 z-20 min-w-[2.75rem] min-h-[2.75rem] w-12 h-12 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shadow-md border touch-manipulation active:scale-95 ${
                isCurrentMarked
                  ? 'bg-amber-100 border-amber-300 text-amber-500 scale-105'
                  : 'bg-white border-blue-100 text-gray-300 hover:text-amber-400 hover:border-amber-200'
              } disabled:opacity-50`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7 sm:w-6 sm:h-6" fill={isCurrentMarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </button>
          )}
          <div className={`text-center mb-8 sm:mb-10 ${user && isAnswered && selectedAnswer !== currentQuestion.correctAnswer ? 'pr-12 sm:pr-14' : ''}`}>
            <p className="text-base sm:text-lg text-blue-900/60 font-bold uppercase tracking-wider mb-2 sm:mb-3">{t('choose_correct_one')}</p>
            <p className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-blue-950 break-words leading-snug sm:leading-tight">
              {currentQuestion.questionText}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestion.options.map((option, index) => {
              const isCorrect = option === currentQuestion.correctAnswer;
              const isSelected = option === selectedAnswer;
              let buttonClass = "p-4 sm:p-5 border-2 rounded-2xl text-lg sm:text-xl text-left transition-all duration-300 font-bold break-words leading-snug shadow-sm outline-none ";
              
              if (isAnswered) {
                if (isCorrect) buttonClass += "bg-green-50 border-green-400 text-green-800 shadow-[0_0_20px_rgba(74,222,128,0.2)]";
                else if (isSelected) buttonClass += "bg-red-50 border-red-400 text-red-800 shadow-[0_0_20px_rgba(248,113,113,0.2)]";
                else buttonClass += "border-white bg-white/50 opacity-50 text-gray-500";
              } else {
                buttonClass += "bg-white border-blue-50 text-gray-800 hover:border-blue-400 hover:shadow-md hover:-translate-y-1 hover:text-blue-700";
              }
              return (
                <button key={index} onClick={() => handleAnswer(option)} disabled={isAnswered} className={buttonClass}>
                  {option}
                </button>
              );
            })}
          </div>

          {isAnswered && showExamples && currentQuestion.example && (
            <div className="mt-6 sm:mt-8 p-5 bg-blue-50/80 border border-blue-100 rounded-2xl text-left transition-all animate-fade-in-up">
              <p className="text-xs sm:text-sm font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="text-lg">💡</span> {t('example_label')}
              </p>
              <p className="text-base sm:text-lg text-blue-900 font-medium italic break-words leading-relaxed">"{currentQuestion.example}"</p>
            </div>
          )}

          {isAnswered && selectedAnswer !== currentQuestion.correctAnswer && (
            <div className="text-center mt-8 sm:mt-10 animate-fade-in-up">
              <button onClick={handleNext} className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 text-white font-extrabold px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all text-lg sm:text-xl transform hover:scale-105 active:scale-95 touch-manipulation">
                {currentQuestionIndex < questions.length - 1 ? t('next_question') : t('finish_quiz')}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
          <button 
            onClick={handleBackClick} 
            className="w-full sm:w-auto justify-center bg-white/70 backdrop-blur-md border border-white text-gray-700 font-bold px-6 py-3.5 rounded-xl shadow-sm hover:bg-white transition-colors flex items-center gap-2 touch-manipulation active:scale-[0.98]"
          >
            {t('back_to_quizzes')}
          </button>
          {hasNextQuiz && (
            <button onClick={handleNextQuiz} className="w-full sm:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-sm transition-colors flex items-center gap-2 touch-manipulation active:scale-[0.98]">
              {t('next_quiz_button')}
            </button>
          )}
        </div>

        {showQuitModal && (
          <div className="fixed inset-0 bg-blue-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-white">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
              <h3 className="text-2xl font-extrabold text-blue-950 mb-2 text-center">{t('quit_quiz_title')}</h3>
              <p className="text-gray-600 mb-8 text-center font-medium">{t('quit_quiz_desc')}</p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmQuitQuiz} 
                  className="w-full py-3.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-sm"
                >
                  {t('quit')}
                </button>
                <button 
                  onClick={() => setShowQuitModal(false)} 
                  className="w-full py-3.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
