import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useI18n } from "../I18nContext";
import { useCloudVocabulary } from "../lib/firestore";
import { publicVocabulary, publicPhrases, publicArticles, publicPrepositions } from "../lib/public-data";
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
  const [quizState, setQuizState] = useState<'loading' | 'ongoing' | 'finished'>('loading');
  const [showQuitModal, setShowQuitModal] = useState(false);

  const WORDS_PER_QUIZ = 20;

  const [showExamples] = useState(() => {
    const stored = localStorage.getItem('micalingo_show_examples');
    return stored !== null ? JSON.parse(stored) : true;
  });

  const translatedTopic = topic === 'vocabulary' ? t('vocabulary')
    : topic === 'articles' ? t('articles_quiz')
    : topic === 'phrases' ? t('phrases_quiz')
    : topic === 'prepositions' ? t('prepositions_quiz')
    : t('personalized_space');

  let totalQuizzes = 0;
  if (topic === 'vocabulary') totalQuizzes = Math.ceil((publicVocabulary.length + publicDbWords.filter((w: any) => w.category === 'vocabulary').length) / WORDS_PER_QUIZ);
  else if (topic === 'phrases') totalQuizzes = Math.ceil((publicPhrases.length + publicDbWords.filter((w: any) => w.category === 'phrases').length) / WORDS_PER_QUIZ);
  else if (topic === 'articles') totalQuizzes = Math.ceil((publicArticles.length + publicDbWords.filter((w: any) => w.category === 'articles').length) / WORDS_PER_QUIZ);
  else if (topic === 'prepositions') totalQuizzes = Math.ceil((publicPrepositions.length + publicDbWords.filter((w: any) => w.category === 'prepositions').length) / WORDS_PER_QUIZ);

  const hasNextQuiz = !isCustom && topic ? quizId < totalQuizzes : false;

  let pageTitle = "";
  if (isCustom) {
    pageTitle = t('quiz_title_custom', { topic: translatedTopic, id: quizId || '' }).trim();
  } else if (topic) {
    pageTitle = t('quiz_title_public', { topic: translatedTopic, id: quizId || '' }).trim();
  } else {
    pageTitle = t('quiz_title_personal');
  }

  const generateQuestions = (words: any[]) => {
    // For structured topics, we don't shuffle the outer array, we just take the chunk.
    // We only shuffle the actual question options.
    const selectedWords = [...words];

    return selectedWords.map(word => {
      if (topic === 'articles') { 
        // Extract the article and base noun from the german string (e.g., "der Mann, die Männer" -> "der" and "Mann, die Männer")
        const match = word.german.match(/^(der|die|das)\s+(.*)/i);
        const baseArticle = match ? match[1].toLowerCase() : "der";
        const baseNoun = match ? match[2].trim() : word.german;

        const correctAnswer = baseArticle;

        // Use ONLY 'der', 'die', 'das'
        const allowedArticles = ["der", "die", "das"];

        // Filter out the correct answer to form the distractor pool
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
        // Standard logic for vocabulary and phrases
        const correctAnswer = word.hungarian;

        // Ensure proper wrong answers: exclude empty, short fragments, or those starting with hyphens like "-en"
        const isValidDistractor = (str: string) => typeof str === 'string' && str.trim().length > 1 && !str.trim().startsWith('-');

        let distractorPool = Array.from(new Set(words.map(w => w.hungarian))).filter(h => h !== correctAnswer && isValidDistractor(h));

        // If the current batch doesn't have enough unique distractors, pull from the appropriate public database
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
    // Check for saved progress first
    const progressKey = user ? `micalingo_quiz_progress_${user.uid}` : 'micalingo_quiz_progress_guest';
    const progressMap = JSON.parse(localStorage.getItem(progressKey) || '{}');
    const quizKey = isCustom ? `custom_${topic || 'general'}_${quizId}` : `${topic || 'custom'}_${quizId}`;
    const savedProgress = progressMap[quizKey];

    if (isRedo && savedProgress) {
      // Clear saved progress if user explicitly clicked Redo
      delete progressMap[quizKey];
      localStorage.setItem(progressKey, JSON.stringify(progressMap));
    } else if (savedProgress && savedProgress.questions && savedProgress.questions.length > 0) {
      setQuestions(savedProgress.questions);
      setCurrentQuestionIndex(savedProgress.index);
      setScore(savedProgress.score);
      setUserAnswers(savedProgress.userAnswers || []);
      setQuizState('ongoing');
      return; // Skip new question generation, resume old one instead
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
      else if (topic === 'prepositions') staticSource = publicPrepositions;

      const dbSource = publicDbWords.filter((w: any) => w.category === topic);

      const combined = [...dbSource, ...staticSource];
      const unique: any[] = [];
      const seen = new Set<string>();

      for (const word of combined) {
        const wordKey = ((word as any).german || "").toLowerCase().trim();
        if (!seen.has(wordKey)) {
          seen.add(wordKey);
          if (!(word as any).deleted) unique.push(word);
        }
      }

      // Ensure we don't include any empty words that might have been saved in the public/private db
      sourceData = unique.filter((word: any) => 
        (word.german || '').trim() !== '' && 
        (word.hungarian || '').trim() !== ''
      );

      // Slice the exact 20 words for the current quiz level
      const startIndex = (quizId - 1) * WORDS_PER_QUIZ;
      const endIndex = startIndex + WORDS_PER_QUIZ;
      wordsForQuiz = sourceData.slice(startIndex, endIndex).sort(() => 0.5 - Math.random());
    } else if (userVocabulary) {
      // Default custom quiz (e.g. from Home page "Start Practice")
      wordsForQuiz = [...userVocabulary].filter((word: any) => 
        (word.german || '').trim() !== '' && 
        (word.hungarian || '').trim() !== ''
      ).sort(() => 0.5 - Math.random()).slice(0, WORDS_PER_QUIZ);
    }

    if ((isCustom || (!topic && userVocabulary)) && wordsForQuiz.length < 4) {
      setQuizState('finished');
      setQuestions([]); // Clear questions to trigger the special message
      return;
    }

    if (wordsForQuiz.length > 0) {
      const newQuestions = generateQuestions(wordsForQuiz);
      setQuestions(newQuestions);
      setQuizState(newQuestions.length > 0 ? 'ongoing' : 'loading');
    } else if (isCustom) {
      setQuizState('finished');
      setQuestions([]);
    }
  }, [topic, userVocabulary, quizId, isCustom]);

  // Auto-save progress whenever the user advances in the quiz
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
  }, [currentQuestionIndex, score, questions, quizState, topic, quizId, user, isCustom]);

  const finishQuiz = async (finalScore: number) => {
    // Save progress so the Topic Lists checkmarks update correctly
    const key = user ? `micalingo_scores_${user.uid}` : 'micalingo_guest_scores';
    const scores = JSON.parse(localStorage.getItem(key) || '{}');
    const quizKey = isCustom ? `custom_${topic || 'general'}_${quizId}` : `${topic || 'custom'}_${quizId}`;
    const previousScore = scores[quizKey] || 0;

    // Only update and save history if they tied or got a better score!
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

      // ---> CLOUD SYNC FOR LOGGED IN USERS <---
      if (user) {
        const statsRef = doc(dbCloud, 'user_stats', user.uid);
        // Use setDoc with merge:true to handle both creation of the document
        // and updating/adding fields to the nested maps without overwriting them.
        await setDoc(statsRef, {
          scores: { [quizKey]: finalScore },
          history: { [quizKey]: { questions, userAnswers, score: finalScore } }
        }, { merge: true });
      }
    }

    // Clear saved partial progress for this quiz as it is now fully completed
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

    // Record the user's answer into history
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentQuestionIndex] = answer;
    setUserAnswers(newUserAnswers);

    const isCorrect = answer === questions[currentQuestionIndex].correctAnswer;

    if (isCorrect) {
      setScore(s => s + 1);

        // Auto-advance: Wait 3 seconds, or 10 seconds if there's an example sentence longer than 20 characters.
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
      finishQuiz(score); // Called manually only on wrong answers, so the score is unchanged
    }
  };

  const handleNextQuiz = () => {
    // Instantly navigate and reset state for the next chunk
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
      navigate(topic && ['vocabulary', 'phrases', 'articles', 'prepositions'].includes(topic || '') ? `/quizzes/${topic}` : '/quizzes');
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  if (quizState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-gray-500">{t('loading_questions')}</p>
      </div>
    );
  }

  if (quizState === 'finished' || !currentQuestion) {
    if (questions.length === 0 && (isCustom || (!topic && userVocabulary))) {
      return (
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-2xl font-bold mb-4">{t('not_enough_words')}</h2>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            {t('not_enough_words_desc', { topic: translatedTopic })}
          </p>
          <p className="text-gray-500 mt-2">{t('need_more_items', { topic: topic || 'custom' })}</p>
          <div className="mt-8">
            <button onClick={() => navigate(`/import?destination=${topic}`)} className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
              {t('import_more_words')}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold mb-4">{t('quiz_complete')}</h2>
        <p className="text-lg">{t('your_score')} <span className="font-bold text-blue-600">{score}</span> / {questions.length}</p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 flex-wrap">
          <button onClick={() => navigate(topic && ['vocabulary', 'phrases', 'articles', 'prepositions'].includes(topic || '') ? `/quizzes/${topic}` : '/quizzes')} className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 font-bold px-6 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
            {t('back_to_quizzes')}
          </button>
          <button onClick={() => window.location.reload()} className="w-full sm:w-auto bg-gray-100 text-gray-700 font-bold px-6 py-2.5 rounded-lg hover:bg-gray-200 transition-colors">
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
          }} className="w-full sm:w-auto bg-blue-100 text-blue-700 font-bold px-6 py-2.5 rounded-lg hover:bg-blue-200 transition-colors">
            {t('download_button') || 'Download CSV'}
          </button>
          {hasNextQuiz && (
            <button onClick={handleNextQuiz} className="w-full sm:w-auto bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
              {t('go_to_level', { level: quizId + 1 })}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{pageTitle}</h1>
        <p className="text-gray-600 mt-1">{t('question_of', { current: currentQuestionIndex + 1, total: questions.length })}</p>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3 overflow-hidden">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="text-center mb-8">
          <p className="text-lg text-gray-500 mb-2">{t('choose_correct_one')}</p>
          <p className="text-4xl font-bold text-gray-900">{currentQuestion.questionText}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentQuestion.options.map((option, index) => {
            const isCorrect = option === currentQuestion.correctAnswer;
            const isSelected = option === selectedAnswer;
            let buttonClass = "p-4 border-2 rounded-lg text-lg text-left transition-colors font-medium ";
            if (isAnswered) {
              if (isCorrect) buttonClass += "bg-green-100 border-green-500 text-green-800";
              else if (isSelected) buttonClass += "bg-red-100 border-red-500 text-red-800";
              else buttonClass += "border-gray-200 opacity-60";
            } else {
              buttonClass += "border-gray-300 hover:border-blue-500 hover:bg-blue-50";
            }
            return (
              <button key={index} onClick={() => handleAnswer(option)} disabled={isAnswered} className={buttonClass}>
                {option}
              </button>
            );
          })}
        </div>

        {isAnswered && showExamples && currentQuestion.example && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left transition-all">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-1">{t('example_label')}</p>
            <p className="text-lg text-blue-900 italic">"{currentQuestion.example}"</p>
          </div>
        )}

        {isAnswered && selectedAnswer !== currentQuestion.correctAnswer && (
          <div className="text-center mt-8">
            <button onClick={handleNext} className="bg-blue-600 text-white font-bold px-8 py-3 rounded-lg shadow-md hover:bg-blue-700 transition-all animate-pulse hover:animate-none">
              {currentQuestionIndex < questions.length - 1 ? t('next_question') : t('finish_quiz')}
            </button>
          </div>
        )}
      </div>

      {/* Global Quiz Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
        <button 
          onClick={handleBackClick} 
          className="w-full sm:w-auto justify-center bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          {t('back_to_quizzes')}
        </button>
        {hasNextQuiz && (
          <button onClick={handleNextQuiz} className="w-full sm:w-auto justify-center bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
            {t('next_quiz_button')}
          </button>
        )}
      </div>

      {/* Quit Confirmation Modal */}
      {showQuitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('quit_quiz_title')}</h3>
            <p className="text-gray-600 mb-6">{t('quit_quiz_desc')}</p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button 
                onClick={() => setShowQuitModal(false)} 
                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={() => navigate(topic && ['vocabulary', 'phrases', 'articles', 'prepositions'].includes(topic || '') ? `/quizzes/${topic}` : '/quizzes')} 
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
              >
                {t('quit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}