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
          {t('personalized_space') || 'Private Space'}
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
                <div
                  key={quizId}
                  className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border-2 transition-all gap-4 ${
                    isPerfect ? "bg-green-50 border-green-500" : "bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-white shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <div className="w-6 flex justify-center flex-shrink-0">
                      {isFinished && !hasProgress && (
                        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${
                      isPerfect ? "bg-green-500 text-white" : "bg-white text-blue-600 border border-blue-100"
                    }`}>
                      {quizId}
                    </div>
                    <div className="flex-1">
                      <span className={`block font-bold text-lg ${isPerfect ? 'text-green-900' : 'text-gray-800'}`}>{t('level_id', { id: quizId }) || `Level ${quizId}`}</span>
                      <span className={`text-sm ${isPerfect ? 'text-green-700' : 'text-gray-500'}`}>
                        {t('items_count', { count: itemsInThisQuiz }) || `${itemsInThisQuiz} items`}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
                    {isFinished && !hasProgress && (
                      <span className={`font-bold text-lg mr-2 ${isPerfect ? 'text-green-700' : 'text-gray-600'}`}>
                        {score} / {itemsInThisQuiz}
                      </span>
                    )}
                    {hasProgress ? (
                      <>
                        <Link
                          to={`/quiz?topic=${topic}&quizId=${quizId}&redo=true`}
                          className="flex-1 sm:flex-none text-center bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold px-4 py-2 rounded-lg shadow-sm transition-colors"
                        >
                          {t('redo_button') || 'Restart'}
                        </Link>
                        <Link
                          to={`/quiz?topic=${topic}&quizId=${quizId}`}
                          className="flex-1 sm:flex-none text-center bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition-colors"
                        >
                          {t('continue_button') || 'Continue →'}
                        </Link>
                      </>
                    ) : isPerfect ? (
                      <Link
                        to={`/quiz?topic=${topic}&quizId=${quizId}&redo=true`}
                        className="flex-1 sm:flex-none text-center bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                        {t('redo_button') || 'Restart'}
                      </Link>
                    ) : isFinished ? (
                      <Link
                        to={`/quiz?topic=${topic}&quizId=${quizId}&redo=true`}
                        className="flex-1 sm:flex-none text-center bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold px-4 py-2 rounded-lg shadow-sm transition-colors"
                      >
                        {t('retry_quiz') || 'Retry'}
                      </Link>
                    ) : (
                      <Link
                        to={`/quiz?topic=${topic}&quizId=${quizId}`}
                        className="flex-1 sm:flex-none text-center bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg shadow-sm transition-colors"
                      >
                        {t('start_button') || 'Start →'}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'custom' && (
        <div className="space-y-4">
          {!user ? (
            <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('personalized_space')}</h2>
                <p className="text-gray-600 mb-8">
                  {t('personalized_space_description')}
                </p>
                <button onClick={handleGoogleLogin} className="inline-flex items-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold py-3 px-6 rounded-xl shadow-sm transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  {t('login_with_google')}
                </button>
              </div>
            </div>
          ) : customQuizzes.length === 0 ? (
            <div className="text-center text-gray-500 py-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('not_enough_words')}</h3>
              <p className="mb-4">{t('not_enough_words_desc', { topic: pageTitle })}</p>
              <Link to={`/import?destination=${topic}`} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700">{t('import_more_words') || 'Import Data'}</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
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
                  <div
                    key={quizId}
                    className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border-2 transition-all gap-4 ${
                      isPerfect ? "bg-green-50 border-green-500" : "bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-white shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                      <div className="w-6 flex justify-center flex-shrink-0">
                        {isFinished && !hasProgress && (
                          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${
                        isPerfect ? "bg-green-500 text-white" : "bg-white text-blue-600 border border-blue-100"
                      }`}>
                        {quizId}
                      </div>
                      <div className="flex-1">
                        <span className={`block font-bold text-lg ${isPerfect ? 'text-green-900' : 'text-gray-800'}`}>{t('level_id', { id: quizId }) || `Level ${quizId}`}</span>
                        <span className={`text-sm ${isPerfect ? 'text-green-700' : 'text-gray-500'}`}>
                          {t('items_count', { count: itemsInThisQuiz }) || `${itemsInThisQuiz} items`}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
                      {isFinished && !hasProgress && (
                        <span className={`font-bold text-lg mr-2 ${isPerfect ? 'text-green-700' : 'text-gray-600'}`}>
                          {score} / {itemsInThisQuiz}
                        </span>
                      )}
                      {hasProgress ? (
                        <>
                          <Link
                            to={`/quiz?topic=${topic}&quizId=${quizId}&custom=true&redo=true`}
                            className="flex-1 sm:flex-none text-center bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold px-4 py-2 rounded-lg shadow-sm transition-colors"
                          >
                            {t('redo_button') || 'Restart'}
                          </Link>
                          <Link
                            to={`/quiz?topic=${topic}&quizId=${quizId}&custom=true`}
                            className="flex-1 sm:flex-none text-center bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition-colors"
                          >
                            {t('continue_button') || 'Continue →'}
                          </Link>
                        </>
                      ) : isPerfect ? (
                        <Link
                          to={`/quiz?topic=${topic}&quizId=${quizId}&custom=true&redo=true`}
                          className="flex-1 sm:flex-none text-center bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                          </svg>
                          {t('redo_button') || 'Restart'}
                        </Link>
                      ) : isFinished ? (
                        <Link
                          to={`/quiz?topic=${topic}&quizId=${quizId}&custom=true&redo=true`}
                          className="flex-1 sm:flex-none text-center bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold px-4 py-2 rounded-lg shadow-sm transition-colors"
                        >
                          {t('retry_quiz') || 'Retry'}
                        </Link>
                      ) : (
                        <Link
                          to={`/quiz?topic=${topic}&quizId=${quizId}&custom=true`}
                          className="flex-1 sm:flex-none text-center bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg shadow-sm transition-colors"
                        >
                          {t('start_button') || 'Start →'}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}