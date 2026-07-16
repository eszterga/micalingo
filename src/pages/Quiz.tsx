import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useI18n } from "../I18nContext";
import { useCloudVocabulary } from "../lib/firestore";
import { publicVocabulary, publicPhrases, publicArticles, publicPrepositions, publicAdjectives } from "../lib/public-data";
import { doc, setDoc } from 'firebase/firestore';
import { dbCloud } from '../lib/firebase';

interface Question {
  questionText: string;
  options: string[];
  correctAnswer: string;
  example?: string;
  german?: string;
  hungarian?: string;
}

const QUIZ_TOPICS = ["vocabulary", "phrases", "articles", "prepositions", "adjectives"] as const;
const WORDS_PER_QUIZ = 20;

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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const topic = searchParams.get("topic");
  const quizId = parseInt(searchParams.get("quizId") || "1", 10);
  const isCustom = searchParams.get("custom") === 'true';
  const isRedo = searchParams.get("redo") === 'true';
  const userVocabulary = useCloudVocabulary(user?.uid);
  const publicDbWords = useCloudVocabulary("PUBLIC_LIBRARY") || [];

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizState, setQuizState] = useState<'loading' | 'ongoing' | 'finished' | 'no_data'>('loading');
  const [showQuitModal, setShowQuitModal] = useState(false);

  const [showExamples] = useState(() => {
    const stored = localStorage.getItem('micalingo_show_examples');
    return stored !== null ? JSON.parse(stored) : true;
  });

  const translatedTopic = topic === 'vocabulary' ? t('vocabulary')
    : topic === 'articles' ? t('articles_quiz')
    : topic === 'phrases' ? t('phrases_quiz')
    : topic === 'prepositions' ? t('prepositions_quiz')
    : topic === 'adjectives' ? (t('adjectives_quiz') || 'Adjectives')
    : t('personalized_space');

  const totalQuizzes = useMemo(() => {
    if (!topic || !QUIZ_TOPICS.includes(topic as any)) return 0;

    const staticSource =
      topic === 'vocabulary' ? publicVocabulary :
      topic === 'phrases' ? publicPhrases :
      topic === 'articles' ? publicArticles :
      topic === 'adjectives' ? (publicAdjectives || []) :
      publicPrepositions;

    return Math.max(1, Math.ceil(staticSource.length / WORDS_PER_QUIZ));
  }, [topic]);

  const isLastQuiz = !!topic && !isCustom && totalQuizzes > 0 && quizId >= totalQuizzes;
  const hasNextQuiz = !!topic && !isCustom && quizId > 0 && quizId < totalQuizzes;

  let pageTitle = "";
  if (isCustom) {
    pageTitle = t('quiz_title_custom', { topic: translatedTopic, id: quizId || '' }).trim();
  } else if (topic) {
    pageTitle = t('quiz_title_public', { topic: translatedTopic, id: quizId || '' }).trim();
  } else {
    pageTitle = t('quiz_title_personal');
  }

  const generateQuestions = (words: any[]) => {
    const selectedWords = [...words];

    return selectedWords.map(word => {
      if (topic === 'articles') {
        const match = word.german.match(/^(der|die|das)\s+(.*)/i);
        const baseArticle = match ? match[1].toLowerCase() : "der";
        const baseNoun = match ? match[2].trim() : word.german;

        const correctAnswer = baseArticle;
        const allowedArticles = ["der", "die", "das"];
        const distractors = allowedArticles.filter(a => a !== correctAnswer);
        const options = [...distractors, correctAnswer].sort(() => 0.5 - Math.random());

        return {
          questionText: `___ ${baseNoun} (${word.hungarian})`,
          options,
          correctAnswer,
          example: word.example,
          german: word.german,
          hungarian: word.hungarian
        };
      } else if (topic === 'prepositions' || (isCustom && topic === 'prepositions')) {
        const correctAnswer = word.case || "Akkusativ";
        const allCases = ["Akkusativ", "Dativ", "Genitiv", "Akkusativ oder Dativ"];

        let distractorPool = allCases.filter(c => c !== correctAnswer);
        distractorPool.sort(() => 0.5 - Math.random());
        const distractors = distractorPool.slice(0, 3);

        const options = [...distractors, correctAnswer].sort(() => 0.5 - Math.random());

        return {
          questionText: `${word.german} (${word.hungarian})`,
          options,
          correctAnswer,
          example: word.example,
          german: word.german,
          hungarian: word.hungarian
        };
      } else {
        const correctAnswer = word.hungarian;
        const isValidDistractor = (str: string) => typeof str === 'string' && str.trim().length > 1 && !str.trim().startsWith('-');

        let distractorPool = Array.from(new Set(words.map(w => w.hungarian))).filter(h => h !== correctAnswer && isValidDistractor(h));

        if (distractorPool.length < 3) {
          const fallbackSource = topic === 'phrases' ? publicPhrases : publicVocabulary;
          const fallbackPool = Array.from(new Set(fallbackSource.map(w => w.hungarian))).filter(h => h !== correctAnswer && isValidDistractor(h));
          distractorPool = Array.from(new Set([...distractorPool, ...fallbackPool]));
        }

        distractorPool.sort(() => 0.5 - Math.random());
        const distractors = distractorPool.slice(0, 3);

        const options = [...distractors, correctAnswer].sort(() => 0.5 - Math.random());

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
  };

  useEffect(() => {
    const progressKey = user ? `micalingo_quiz_progress_${user.uid}` : 'micalingo_quiz_progress_guest';
    const progressMap = JSON.parse(localStorage.getItem(progressKey) || '{}');
    const quizKey = isCustom ? `custom_${topic || 'general'}_${quizId}` : `${topic || 'custom'}_${quizId}`;
    const savedProgress = progressMap[quizKey];

    if (isRedo && savedProgress) {
      delete progressMap[quizKey];
      localStorage.setItem(progressKey, JSON.stringify(progressMap));
    } else if (savedProgress && savedProgress.questions && savedProgress.questions.length > 0) {
      setQuestions(savedProgress.questions);
      setCurrentQuestionIndex(savedProgress.index);
      setScore(savedProgress.score);
      setUserAnswers(savedProgress.userAnswers || []);
      setQuizState('ongoing');
      return;
    }

    let sourceData: any[] = [];
    let wordsForQuiz: any[] = [];

    if (isCustom) {
      if (!userVocabulary) {
        setQuizState('loading');
        return;
      }
      const customSource = (userVocabulary || []).filter((word: any) =>
        word.category === topic &&
        (word.german || '').trim() !== '' &&
        (word.hungarian || '').trim() !== ''
      );
      wordsForQuiz = [...customSource].sort(() => 0.5 - Math.random()).slice(0, WORDS_PER_QUIZ);
    } else if (topic) {
      let staticSource: any[] = [];
      if (topic === 'vocabulary') staticSource = publicVocabulary;
      else if (topic === 'phrases') staticSource = publicPhrases;
      else if (topic === 'articles') staticSource = publicArticles;
      else if (topic === 'adjectives') staticSource = publicAdjectives || [];
      else if (topic === 'prepositions') staticSource = publicPrepositions;

      const dbSource = publicDbWords.filter((w: any) => w.category === topic);
      const combined = [...dbSource, ...staticSource];
      const unique: any[] = [];
      const seen = new Set<string>();

      for (const word of combined) {
        const wordKey = ((word as any).german || '').toLowerCase().trim();
        if (!seen.has(wordKey)) {
          seen.add(wordKey);
          if (!(word as any).deleted) unique.push(word);
        }
      }

      sourceData = unique.filter((word: any) =>
        (word.german || '').trim() !== '' &&
        (word.hungarian || '').trim() !== ''
      );

      const startIndex = (quizId - 1) * WORDS_PER_QUIZ;
      const endIndex = startIndex + WORDS_PER_QUIZ;
      wordsForQuiz = sourceData.slice(startIndex, endIndex).sort(() => 0.5 - Math.random());
    } else if (userVocabulary) {
      wordsForQuiz = [...userVocabulary].filter((word: any) =>
        (word.german || '').trim() !== '' &&
        (word.hungarian || '').trim() !== ''
      ).sort(() => 0.5 - Math.random()).slice(0, WORDS_PER_QUIZ);
    }

    if ((isCustom || (!topic && userVocabulary)) && wordsForQuiz.length < 4) {
      setQuizState('finished');
      setQuestions([]);
      return;
    }

    if (wordsForQuiz.length > 0) {
      const newQuestions = generateQuestions(wordsForQuiz);
      setQuestions(newQuestions);
      setQuizState(newQuestions.length > 0 ? 'ongoing' : 'no_data');
    } else if (isCustom) {
      setQuizState('finished');
      setQuestions([]);
    } else {
      setQuizState('no_data');
      setQuestions([]);
    }
  }, [topic, userVocabulary, quizId, isCustom, publicDbWords]);

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
  }, [currentQuestionIndex, score, questions, quizState, topic, quizId, user, isCustom, userAnswers]);

  const finishQuiz = async (finalScore: number) => {
    const key = user ? `micalingo_scores_${user.uid}` : 'micalingo_guest_scores';
    const scores = JSON.parse(localStorage.getItem(key) || '{}');
    const quizKey = isCustom ? `custom_${topic || 'general'}_${quizId}` : `${topic || 'custom'}_${quizId}`;
    const previousScore = scores[quizKey] || 0;

    if (finalScore >= previousScore) {
      scores[quizKey] = finalScore;
      localStorage.setItem(key, JSON.stringify(scores));

      const historyKey = user ? `micalingo_history_${user.uid}` : `micalingo_guest_history`;
      const historyMap = JSON.parse(localStorage.getItem(historyKey) || '{}');
      historyMap[quizKey] = {
        questions,
        userAnswers,
        score: finalScore
      };
      localStorage.setItem(historyKey, JSON.stringify(historyMap));

      if (user) {
        try {
          const statsRef = doc(dbCloud, 'user_stats', user.uid);
          await setDoc(statsRef, {
            scores: { [quizKey]: finalScore },
            history: { [quizKey]: { questions, userAnswers, score: finalScore } }
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

    setQuizState('finished');
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
      const delay = (showExamples && currentExample) ? (currentExample.length > 20 ? 10000 : 3500) : 1000;
      setTimeout(() => {
        setIsAnswered(false);
        setSelectedAnswer(null);
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(i => i + 1);
        } else {
          finishQuiz(score + 1);
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
    if (!hasNextQuiz) return;
    navigate(`/quiz?topic=${topic || ''}&quizId=${quizId + 1}`);
    setQuizState('loading');
    setScore(0);
    setCurrentQuestionIndex(0);
    setIsAnswered(false);
    setSelectedAnswer(null);
    setUserAnswers([]);
  };

  const handleBackClick = () => {
    if (quizState === 'ongoing') {
      setShowQuitModal(true);
    } else {
      navigate(topic && QUIZ_TOPICS.includes(topic as any) ? `/quizzes/${topic}` : '/quizzes');
    }
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
              <button onClick={() => navigate(topic && QUIZ_TOPICS.includes(topic as any) ? `/quizzes/${topic}` : '/quizzes')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors">
                {t('back_to_quizzes')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (quizState === 'finished' || !currentQuestion) {
    if (questions.length === 0 && (isCustom || (!topic && userVocabulary))) {
      return (
        <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
          <BackgroundBlobs />
          <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 px-4 md:px-8">
            <div className="text-center bg-white/70 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white mx-4 sm:mx-0">
              <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
              <h2 className="text-3xl font-extrabold text-blue-950 mb-4">{t('not_enough_words')}</h2>
              <p className="text-lg text-blue-900/70 font-medium max-w-md mx-auto break-words">
                {t('not_enough_words_desc', { topic: translatedTopic })}
              </p>
              <p className="text-gray-500 mt-2 font-medium">{t('need_more_items', { topic: topic || 'custom' })}</p>
              <div className="mt-8">
                <button onClick={() => navigate(`/import?destination=${topic}`)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors">
                  {t('import_more_words')}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
        <BackgroundBlobs />
        <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 px-4 md:px-8">
          <div className="text-center bg-white/70 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white mx-4 sm:mx-0">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🏁</div>
            <h2 className="text-3xl font-extrabold text-blue-950 mb-4">{t('quiz_complete')}</h2>
            <p className="text-xl text-blue-900/70 font-medium">{t('your_score')} <span className="font-bold text-blue-600 text-2xl">{score}</span> / {questions.length}</p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 flex-wrap">
              <button onClick={() => navigate(topic && QUIZ_TOPICS.includes(topic as any) ? `/quizzes/${topic}` : '/quizzes')} className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 font-bold py-3 px-8 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                {t('back_to_quizzes')}
              </button>
              <button onClick={() => window.location.reload()} className="w-full sm:w-auto bg-blue-100 text-blue-700 font-bold py-3 px-8 rounded-xl hover:bg-blue-200 transition-colors shadow-sm">
                {t('retry_quiz')}
              </button>
              <button onClick={() => {
                const quizKey = isCustom ? `custom_${topic || 'general'}_${quizId}` : `${topic || 'custom'}_${quizId}`;
                let csv = `German,Hungarian,Example,${t('csv_question') || 'Question'},${t('your_answer') || 'Your Answer'},${t('correct_answer') || 'Correct Answer'},${t('csv_result') || 'Result'}\n`;
                questions.forEach((q, i) => {
                  const userAnswer = userAnswers[i] || '';
                  const isCorrect = userAnswer === q.correctAnswer;
                  const statusText = isCorrect ? '✅' : '❌';
                  csv += `"${q.german || ''}","${q.hungarian || ''}","${q.example || ''}","${q.questionText}","${userAnswer}","${q.correctAnswer}","${statusText}"\n`;
                });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${quizKey}_results.csv`;
                a.click();
              }} className="w-full sm:w-auto bg-green-100 text-green-700 font-bold py-3 px-8 rounded-xl hover:bg-green-200 transition-colors shadow-sm">
                {t('download_button') || 'Download CSV'}
              </button>
              {hasNextQuiz && (
                <button onClick={handleNextQuiz} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors">
                  {t('go_to_level', { level: quizId + 1 })}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
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
        
        <div className="bg-white/80 backdrop-blur-xl p-6 sm:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
          <div className="text-center mb-8 sm:mb-10">
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
              <button onClick={handleNext} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-extrabold px-8 sm:px-10 py-3 sm:py-4 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all text-lg sm:text-xl transform hover:scale-105 active:scale-95">
                {currentQuestionIndex < questions.length - 1 ? t('next_question') : t('finish_quiz')}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pt-2">
          <button 
            onClick={handleBackClick} 
            className="w-full sm:w-auto justify-center bg-white/70 backdrop-blur-md border border-white text-gray-700 font-bold px-6 py-3 rounded-xl shadow-sm hover:bg-white transition-colors flex items-center gap-2"
          >
            {t('back_to_quizzes')}
          </button>
          {hasNextQuiz && (
            <button onClick={handleNextQuiz} className="w-full sm:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-sm transition-colors flex items-center gap-2">
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
                  onClick={() => navigate(topic && QUIZ_TOPICS.includes(topic as any) ? `/quizzes/${topic}` : '/quizzes')} 
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
