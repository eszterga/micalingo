import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { isUserCancelledAuthError, signInWithGoogle } from '../lib/googleAuth';
import { useCloudVocabulary } from "../lib/firestore";
import { useI18n } from "../I18nContext";
import {
  buildPublicQuizPool,
  buildCustomQuizPool,
  getQuizLevelCount,
  getItemsInQuizLevel,
} from "../lib/quizPool";

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

export default function TopicQuizzes() {
  const { topic } = useParams<{ topic: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const publicDbWordsRaw = useCloudVocabulary("PUBLIC_LIBRARY");
  const publicDbWords = publicDbWordsRaw || [];
  const userVocabulary = useCloudVocabulary(user?.uid);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'default' | 'custom'>(searchParams.get('tab') === 'custom' ? 'custom' : 'default');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'custom') setActiveTab('custom');
    else if (tab === 'default') setActiveTab('default');
  }, [searchParams]);

  const handleTabChange = (tab: 'default' | 'custom') => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  useEffect(() => {
    const key = user ? `micalingo_scores_${user.uid}` : 'micalingo_guest_scores';
    setScores(JSON.parse(localStorage.getItem(key) || '{}'));

    const progressKey = user ? `micalingo_quiz_progress_v2_${user.uid}` : 'micalingo_quiz_progress_v2_guest';
    setProgress(JSON.parse(localStorage.getItem(progressKey) || '{}'));
  }, [user?.uid]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      if (isUserCancelledAuthError(error)) return;
      console.error("Login failed:", error);
    }
  };

  const sourceData = useMemo(() => {
    if (!topic) return [];
    // Show static levels immediately; cloud merges in when cache/network arrives.
    return buildPublicQuizPool(topic, publicDbWords);
  }, [topic, publicDbWords]);

  const pageTitle = useMemo(() => {
    if (!topic) return "";
    return topic === 'vocabulary' ? t('vocabulary') || "Vocabulary"
      : topic === 'phrases' ? t('phrases_sentences_quiz') || "Phrases and sentences quiz"
      : topic === 'articles' ? t('articles_quiz') || "Articles"
      : topic === 'prepositions' ? t('prepositions_quiz') || "Prepositions"
      : topic === 'adjectives' ? t('adjectives_quiz') || "Adjectives"
      : topic === 'verbs' ? t('verbs_quiz') || "Verbs"
      : "";
  }, [topic, t]);

  const totalQuizzes = getQuizLevelCount(sourceData.length);
  const quizzes = Array.from({ length: totalQuizzes }, (_, i) => i + 1);

  const customSourceData = useMemo(
    () => buildCustomQuizPool(topic || '', userVocabulary || undefined),
    [topic, userVocabulary]
  );
  const totalCustomQuizzes = getQuizLevelCount(customSourceData.length);
  const customQuizzes = Array.from({ length: totalCustomQuizzes }, (_, i) => i + 1);

  if (!topic || !pageTitle) {
    return (
      <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
        <BackgroundBlobs />
        <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 px-4 md:px-8">
            <div className="text-center bg-white/70 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
                <h1 className="text-3xl font-extrabold text-blue-950 mb-3">{t('topic_not_found') || 'Topic not found'}</h1>
                <button onClick={() => navigate(activeTab === 'custom' ? '/quizzes?tab=personal' : '/quizzes')} className="mt-4 text-blue-600 hover:underline font-bold">{t('return_to_quizzes') || 'Return to Quizzes'}</button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
      <BackgroundBlobs />
      <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 px-4 md:px-8">
        <div className="flex items-center gap-4">
          <Link
            to={activeTab === 'custom' ? '/quizzes?tab=personal' : '/quizzes'}
            className="bg-white/70 backdrop-blur-md border border-white text-gray-700 hover:bg-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            {t('back_button')}
          </Link>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 tracking-tight pb-2">{pageTitle} {t('quizzes_title') || 'Quizzes'}</h1>
            <p className="text-lg text-blue-900/70 font-medium mt-1">{t('select_level_to_start') || 'Select a level to start practicing.'}</p>
          </div>
        </div>

      <div className="flex overflow-x-auto whitespace-nowrap border-b border-white/60">
        <button
          onClick={() => handleTabChange('default')}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors ${activeTab === 'default' ? 'border-blue-600 text-blue-700' : 'border-transparent text-blue-900/50 hover:text-blue-900/80'}`}
        >
          {t('open_library') || 'Open Library'}
        </button>
        <button
          onClick={() => handleTabChange('custom')}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors ${activeTab === 'custom' ? 'border-blue-600 text-blue-700' : 'border-transparent text-blue-900/50 hover:text-blue-900/80'}`}
        >
          {t('personalized_space') || 'Private Space'}
        </button>
      </div>

      {activeTab === 'default' && (
        <div className="bg-white/60 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
          {quizzes.length === 0 && publicDbWordsRaw === null ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-blue-900/70 font-medium">{t('loading') || 'Loading...'}</p>
            </div>
          ) : (
          <div className="flex flex-col gap-4">
            {quizzes.map((quizId) => {
              const scoreKey = `${topic}_${quizId}`;
              const score = scores[scoreKey];
              const isFinished = score !== undefined;
              const hasProgress = !!progress[scoreKey];
              const itemsInThisQuiz = getItemsInQuizLevel(sourceData.length, quizId);
              const isPerfect = score === itemsInThisQuiz;

              return (
                <div
                  key={quizId}
                  className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all duration-300 gap-4 ${
                    isPerfect ? "bg-green-50/80 border-green-300 shadow-sm" : "bg-white/80 border-blue-50 hover:border-blue-200 hover:shadow-md shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-6 flex justify-center flex-shrink-0">
                      {isFinished && !hasProgress && (
                        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm ${
                      isPerfect ? "bg-green-500 text-white" : "bg-white text-blue-600 border border-blue-100"
                    }`}>
                      {quizId}
                    </div>
                    <div className="flex-1">
                      <span className={`block font-extrabold text-lg ${isPerfect ? 'text-green-900' : 'text-gray-900'}`}>{t('level_id', { id: quizId }) || `Level ${quizId}`}</span>
                      <span className={`text-sm font-medium ${isPerfect ? 'text-green-700' : 'text-gray-500'}`}>
                        {t('items_count', { count: itemsInThisQuiz }) || `${itemsInThisQuiz} items`}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
                    {isFinished && !hasProgress && (
                      <span className={`font-bold text-lg mr-2 ${isPerfect ? 'text-green-700' : 'text-gray-700'}`}>
                        {score} / {itemsInThisQuiz}
                      </span>
                    )}
                    {hasProgress ? (
                      <>
                        <Link
                          to={`/quiz?topic=${topic}&quizId=${quizId}&redo=true`}
                          className="flex-1 sm:flex-none text-center bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors"
                        >
                          {t('redo_button') || 'Restart'}
                        </Link>
                        <Link
                          to={`/quiz?topic=${topic}&quizId=${quizId}`}
                          className="flex-1 sm:flex-none text-center bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors"
                        >
                          {t('continue_button') || 'Continue →'}
                        </Link>
                      </>
                    ) : isPerfect ? (
                      <Link
                        to={`/quiz?topic=${topic}&quizId=${quizId}&redo=true`}
                        className="flex-1 sm:flex-none text-center bg-green-500 hover:bg-green-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {t('redo_button') || 'Restart'}
                      </Link>
                    ) : isFinished ? (
                      <Link
                        to={`/quiz?topic=${topic}&quizId=${quizId}&redo=true`}
                        className="flex-1 sm:flex-none text-center bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors"
                      >
                        {t('retry_quiz') || 'Retry'}
                      </Link>
                    ) : (
                      <Link
                        to={`/quiz?topic=${topic}&quizId=${quizId}`}
                        className="flex-1 sm:flex-none text-center bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm transition-colors"
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

      {activeTab === 'custom' && (
        <div className="space-y-4">
          {!user ? (
            <div className="bg-white/70 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h2 className="text-3xl font-extrabold text-blue-950 mb-3">{t('personalized_space')}</h2>
                <p className="text-blue-900/70 text-lg font-medium mb-8">
                  {t('personalized_space_description')}
                </p>
                <button onClick={handleGoogleLogin} className="inline-flex items-center gap-3 bg-white border border-white hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-md text-gray-800 font-bold py-3.5 px-6 rounded-xl shadow-sm transition-all duration-300"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  {t('login_with_google')}
                </button>
              </div>
            </div>
          ) : userVocabulary === null ? (
            <div className="bg-white/70 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white text-center">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-blue-900/70 font-medium">{t('loading') || 'Loading...'}</p>
            </div>
          ) : customQuizzes.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white text-center">
              <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
              <h3 className="text-3xl font-extrabold text-blue-950 mb-3">{t('not_enough_words')}</h3>
              <p className="text-blue-900/70 text-lg font-medium mb-8">{t('not_enough_words_desc', { topic: pageTitle })}</p>
              <Link to={`/import?destination=${topic}`} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-sm">{t('import_more_words') || 'Import Data'}</Link>
            </div>
          ) : (
            <div className="bg-white/60 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
              <div className="flex flex-col gap-4">
              {customQuizzes.map((quizId) => {
                const scoreKey = `custom_${topic}_${quizId}`;
                const score = scores[scoreKey];
                const isFinished = score !== undefined;
                const hasProgress = !!progress[scoreKey];
                
                const itemsInThisQuiz = getItemsInQuizLevel(customSourceData.length, quizId);
                
                const isPerfect = score === itemsInThisQuiz;

                return (
                  <div
                    key={quizId}
                    className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all duration-300 gap-4 ${
                      isPerfect ? "bg-green-50/80 border-green-300 shadow-sm" : "bg-white/80 border-blue-50 hover:border-blue-200 hover:shadow-md shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="w-6 flex justify-center flex-shrink-0">
                        {isFinished && !hasProgress && (
                          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm ${
                        isPerfect ? "bg-green-500 text-white" : "bg-white text-blue-600 border border-blue-100"
                      }`}>
                        {quizId}
                      </div>
                      <div className="flex-1">
                        <span className={`block font-extrabold text-lg ${isPerfect ? 'text-green-900' : 'text-gray-900'}`}>{t('level_id', { id: quizId }) || `Level ${quizId}`}</span>
                        <span className={`text-sm font-medium ${isPerfect ? 'text-green-700' : 'text-gray-500'}`}>
                          {t('items_count', { count: itemsInThisQuiz }) || `${itemsInThisQuiz} items`}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
                      {isFinished && !hasProgress && (
                        <span className={`font-bold text-lg mr-2 ${isPerfect ? 'text-green-700' : 'text-gray-700'}`}>
                          {score} / {itemsInThisQuiz}
                        </span>
                      )}
                      {hasProgress ? (
                        <>
                          <Link
                            to={`/quiz?topic=${topic}&quizId=${quizId}&custom=true&redo=true`}
                            className="flex-1 sm:flex-none text-center bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors"
                          >
                            {t('redo_button') || 'Restart'}
                          </Link>
                          <Link
                            to={`/quiz?topic=${topic}&quizId=${quizId}&custom=true`}
                            className="flex-1 sm:flex-none text-center bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors"
                          >
                            {t('continue_button') || 'Continue →'}
                          </Link>
                        </>
                      ) : isPerfect ? (
                        <Link
                          to={`/quiz?topic=${topic}&quizId=${quizId}&custom=true&redo=true`}
                          className="flex-1 sm:flex-none text-center bg-green-500 hover:bg-green-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {t('redo_button') || 'Restart'}
                        </Link>
                      ) : isFinished ? (
                        <Link
                          to={`/quiz?topic=${topic}&quizId=${quizId}&custom=true&redo=true`}
                          className="flex-1 sm:flex-none text-center bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors"
                        >
                          {t('retry_quiz') || 'Retry'}
                        </Link>
                      ) : (
                        <Link
                          to={`/quiz?topic=${topic}&quizId=${quizId}&custom=true`}
                          className="flex-1 sm:flex-none text-center bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm transition-colors"
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
        </div>
      )}
      </div>
    </div>
  );
}
