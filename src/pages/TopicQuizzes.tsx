import { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { publicVocabulary, publicPhrases, publicArticles, publicPrepositions } from "../lib/public-data";
import { useAuth } from "../AuthContext";
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useCloudVocabulary } from "../lib/firestore";
import { useI18n } from "../I18nContext";

const WORDS_PER_QUIZ = 20;

export default function TopicQuizzes() {
  const { topic } = useParams<{ topic: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const userVocabulary = useCloudVocabulary(user?.uid);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'default' | 'custom'>(searchParams.get('tab') === 'custom' ? 'custom' : 'default');

  useEffect(() => {
    const key = user ? `micalingo_scores_${user.uid}` : 'micalingo_guest_scores';
    setScores(JSON.parse(localStorage.getItem(key) || '{}'));

    const progressKey = user ? `micalingo_quiz_progress_${user.uid}` : 'micalingo_quiz_progress_guest';
    setProgress(JSON.parse(localStorage.getItem(progressKey) || '{}'));
  }, [user]);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  let sourceData: any[] = [];
  let pageTitle = "";

  if (topic === 'vocabulary') {
    sourceData = publicVocabulary;
    pageTitle = t('vocabulary') || "Vocabulary";
  } else if (topic === 'phrases') {
    sourceData = publicPhrases;
    pageTitle = t('phrases_quiz') || "Phrases";
  } else if (topic === 'articles') {
    sourceData = publicArticles;
    pageTitle = t('articles_quiz') || "Articles";
  } else if (topic === 'prepositions') {
    sourceData = publicPrepositions;
    pageTitle = t('prepositions_quiz') || "Prepositions";
  } else {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-gray-800">{t('topic_not_found') || 'Topic not found'}</h1>
        <button onClick={() => navigate('/quizzes')} className="mt-4 text-blue-600 hover:underline">Return to Quizzes</button>
      </div>
    );
  }

  const totalQuizzes = Math.ceil(sourceData.length / WORDS_PER_QUIZ);
  const quizzes = Array.from({ length: totalQuizzes }, (_, i) => i + 1);

  const customSourceData = (userVocabulary || []).filter((word: any) => word.category === topic && word.german && word.hungarian);
  const totalCustomQuizzes = Math.ceil(customSourceData.length / WORDS_PER_QUIZ);
  const customQuizzes = Array.from({ length: totalCustomQuizzes }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/quizzes" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2">
            {t('back_button')}
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{pageTitle} {t('quizzes_title') || 'Quizzes'}</h1>
            <p className="text-gray-600 mt-1">{t('select_level_to_start') || 'Select a level to start practicing.'}</p>
          </div>
        </div>
        <Link to="/results" className="bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold px-4 py-2 rounded-lg shadow-sm transition-colors whitespace-nowrap">
          {t('review_answers') || 'Review Answers'}
        </Link>
      </div>

      <div className="flex overflow-x-auto whitespace-nowrap border-b border-gray-200">
        <button
          onClick={() => setActiveTab('default')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'default' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          {t('open_library') || 'Open Library'}
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'custom' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          {t('personalized_space') || 'Personalized Space'}
        </button>
      </div>

      {activeTab === 'default' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col gap-3">
            {quizzes.map((quizId) => {
              const scoreKey = `${topic}_${quizId}`;
              const score = scores[scoreKey];
              const isFinished = score !== undefined;
              const hasProgress = !!progress[scoreKey];
              const itemsInThisQuiz = quizId === totalQuizzes && sourceData.length % WORDS_PER_QUIZ !== 0 ? sourceData.length % WORDS_PER_QUIZ : WORDS_PER_QUIZ;
              const isPerfect = score === itemsInThisQuiz;

              return (
                <Link
                  key={quizId}
                  to={`/quiz?topic=${topic}&quizId=${quizId}`}
                  className={`group flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    isPerfect ? "bg-green-50 border-green-500 hover:bg-green-100" : "bg-gray-50 border-gray-200 hover:border-blue-400 hover:bg-white shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${
                      isPerfect ? "bg-green-500 text-white" : "bg-white text-blue-600 border border-blue-100"
                    }`}>
                      {quizId}
                    </div>
                    <div>
                      <span className={`block font-bold text-lg ${isPerfect ? 'text-green-900' : 'text-gray-800'}`}>Level {quizId}</span>
                      <span className={`text-sm ${isPerfect ? 'text-green-700' : 'text-gray-500'}`}>
                        {t('items_count', { count: itemsInThisQuiz }) || `${itemsInThisQuiz} items`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {isFinished && (
                      <span className={`font-bold text-lg ${isPerfect ? 'text-green-700' : 'text-gray-600'}`}>
                        {score} / {itemsInThisQuiz}
                      </span>
                    )}
            {hasProgress ? (
              <span className="text-blue-600 font-bold">{t('continue_button') || 'Continue →'}</span>
            ) : isPerfect ? (
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                ) : isFinished ? (
                  <span className="text-blue-500 font-medium">{t('retry_quiz') || 'Retry'}</span>
                    ) : (
                      <span className="text-gray-400 font-medium">{t('start_button') || 'Start'}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'custom' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          {!user ? (
            <div className="text-center text-gray-500 py-8">
              <p className="mb-4">{t('to_create_new_quizzes_login_required') || 'Log in to create custom quizzes.'}</p>
              <button onClick={handleGoogleLogin} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700">{t('login_with_google') || 'Log in with Google'}</button>
            </div>
          ) : customQuizzes.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('not_enough_words')}</h3>
              <p className="mb-4">{t('not_enough_words_desc', { topic: pageTitle })}</p>
              <Link to={`/import?destination=${topic}`} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700">{t('import_more_words') || 'Import Data'}</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {customQuizzes.map((quizId) => {
                const scoreKey = `custom_${topic}_${quizId}`;
                const score = scores[scoreKey];
                const isFinished = score !== undefined;
                const hasProgress = !!progress[scoreKey];
                
                const itemsInThisQuiz = quizId === totalCustomQuizzes && customSourceData.length % WORDS_PER_QUIZ !== 0 
                  ? customSourceData.length % WORDS_PER_QUIZ 
                  : WORDS_PER_QUIZ;
                
                const isPerfect = score === itemsInThisQuiz;

                return (
                  <Link
                    key={quizId}
                    to={`/quiz?topic=${topic}&quizId=${quizId}&custom=true`}
                    className={`group flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      isPerfect ? "bg-green-50 border-green-500 hover:bg-green-100" : "bg-gray-50 border-gray-200 hover:border-blue-400 hover:bg-white shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${
                        isPerfect ? "bg-green-500 text-white" : "bg-white text-blue-600 border border-blue-100"
                      }`}>
                        {quizId}
                      </div>
                      <div>
                        <span className={`block font-bold text-lg ${isPerfect ? 'text-green-900' : 'text-gray-800'}`}>{t('level_id', { id: quizId }) || `Level ${quizId}`}</span>
                        <span className={`text-sm ${isPerfect ? 'text-green-700' : 'text-gray-500'}`}>
                          {t('items_count', { count: itemsInThisQuiz }) || `${itemsInThisQuiz} items`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {isFinished && (
                        <span className={`font-bold text-lg ${isPerfect ? 'text-green-700' : 'text-gray-600'}`}>
                          {score} / {itemsInThisQuiz}
                        </span>
                      )}
              {hasProgress ? (
                <span className="text-blue-600 font-bold">{t('continue_button') || 'Continue →'}</span>
              ) : isPerfect ? (
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-sm">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                  ) : isFinished ? (
                    <span className="text-blue-500 font-medium">{t('retry_quiz') || 'Retry'}</span>
                      ) : (
                        <span className="text-gray-400 font-medium">{t('start_button') || 'Start'}</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}