import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useI18n } from "../I18nContext";
import { useAuth } from "../AuthContext";
import ArticleBody from "../components/ArticleBody";
import { quizIndexArticle } from "../lib/learnContent";
import type { LearnLang } from "../lib/learnContent";
import { isUserCancelledAuthError, signInWithGoogle } from '../lib/googleAuth';
import { useCloudVocabulary } from "../lib/firestore";
import {
  filterMarkedWords,
  getMarkedQuizLevels,
  MARKED_WORDS_PER_QUIZ,
  unmarkWord,
} from "./markedWordsQuizEngine";

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

type QuizTab = 'library' | 'personal' | 'marked';

export default function Quizzes() {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userVocabulary = useCloudVocabulary(user?.uid);
  const [activeTab, setActiveTab] = useState<QuizTab>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'personal' || tab === 'marked') return tab;
    return 'library';
  });
  const [manageOpen, setManageOpen] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const markedWords = useMemo(
    () => filterMarkedWords(userVocabulary || []),
    [userVocabulary]
  );
  const markedLevels = getMarkedQuizLevels(markedWords);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'personal' || tab === 'marked' || tab === 'library') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: QuizTab) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      if (isUserCancelledAuthError(error)) return;
      console.error("Login failed:", error);
      alert(t('alert_login_failed'));
    }
  };

  const handleRemoveMarked = async (id: string | undefined, german: string) => {
    if (!id) return;
    if (!window.confirm(t('alert_confirm_delete_word') || `Remove "${german}"?`)) return;
    setRemovingId(id);
    try {
      await unmarkWord(id);
    } catch (e) {
      console.error(e);
    } finally {
      setRemovingId(null);
    }
  };

  const LoginGate = ({ title }: { title: string }) => (
    <div className="bg-white/70 backdrop-blur-xl p-6 sm:p-10 md:p-12 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white text-center">
      <div className="max-w-md mx-auto">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 mb-3">{title}</h2>
        <p className="text-blue-900/70 text-base sm:text-lg font-medium mb-6 sm:mb-8">
          {t('personalized_space_description')}
        </p>
        <button onClick={handleGoogleLogin} className="inline-flex items-center justify-center gap-3 w-full sm:w-auto bg-white border border-white hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-md text-gray-800 font-bold py-3.5 px-6 rounded-xl shadow-sm transition-all duration-300 active:scale-[0.98] touch-manipulation">
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {t('login_with_google')}
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8"
      style={{ paddingBottom: 'max(3rem, calc(1.5rem + env(safe-area-inset-bottom, 0px)))' }}
    >
      <BackgroundBlobs />
      <div className="relative z-10 w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 px-4 md:px-8">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <Link to="/" className="flex-shrink-0 bg-white/70 backdrop-blur-md border border-white text-gray-700 hover:bg-white font-bold px-4 sm:px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-[0.98] touch-manipulation">
            {t('back_button')}
          </Link>
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 tracking-tight pb-1 sm:pb-2">{t('quizzes_title')}</h1>
            <p className="text-base sm:text-lg text-blue-900/70 font-medium mt-0.5 sm:mt-1">{t('quizzes_subtitle')}</p>
            <p className="text-sm text-blue-900/55 font-medium mt-2 max-w-2xl">{t('seo_intro_quizzes')}</p>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[1.5rem] p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <ArticleBody markdown={quizIndexArticle(language as LearnLang)} />
        </div>

      {/* Navigation Tabs — scrollable on phone / tablet */}
        <div className="flex overflow-x-auto overscroll-x-contain whitespace-nowrap border-b border-white/60 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-thin" style={{ WebkitOverflowScrolling: 'touch' }}>
          <button
            onClick={() => handleTabChange('library')}
            className={`flex-shrink-0 py-3 px-4 sm:px-6 font-bold text-sm border-b-2 transition-colors touch-manipulation ${activeTab === 'library' ? 'border-blue-600 text-blue-700' : 'border-transparent text-blue-900/50 hover:text-blue-900/80'}`}
          >
            {t('open_library')}
          </button>
          <button
            onClick={() => handleTabChange('personal')}
            className={`flex-shrink-0 py-3 px-4 sm:px-6 font-bold text-sm border-b-2 transition-colors touch-manipulation ${activeTab === 'personal' ? 'border-blue-600 text-blue-700' : 'border-transparent text-blue-900/50 hover:text-blue-900/80'}`}
          >
          {t('personalized_space')}
          </button>
          <button
            onClick={() => handleTabChange('marked')}
            className={`flex-shrink-0 py-3 px-4 sm:px-6 font-bold text-sm border-b-2 transition-colors touch-manipulation ${activeTab === 'marked' ? 'border-blue-600 text-blue-700' : 'border-transparent text-blue-900/50 hover:text-blue-900/80'}`}
          >
            {t('marked_words') || 'Marked words'}
          </button>
        </div>

      {/* Public Quizzes */}
      {activeTab === 'library' && (
        <div className="bg-white/60 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold text-blue-950">{t('test_your_knowledge')}</h2>
            <p className="text-lg text-blue-900/70 font-medium">{t('test_your_knowledge_subtitle')}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link to="/quizzes/vocabulary" className="group relative flex flex-col items-start p-6 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-blue-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:border-blue-200 hover:-translate-y-2 transition-all duration-500">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-500">📖</div>
              <h3 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors text-xl mb-1">{t('vocabulary')}</h3>
              <p className="text-gray-600 font-medium text-sm">{t('vocabulary_quiz_subtitle')}</p>
            </Link>
            <Link to="/quizzes/articles" className="group relative flex flex-col items-start p-6 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-blue-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:border-blue-200 hover:-translate-y-2 transition-all duration-500">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-500">🔤</div>
              <h3 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors text-xl mb-1">{t('articles_quiz')}</h3>
              <p className="text-gray-600 font-medium text-sm">{t('articles_quiz_subtitle')}</p>
            </Link>
            <Link to="/quizzes/phrases" className="group relative flex flex-col items-start p-6 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-blue-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:border-blue-200 hover:-translate-y-2 transition-all duration-500">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-500">💬</div>
              <h3 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors text-xl mb-1">{t('phrases_quiz')}</h3>
              <p className="text-gray-600 font-medium text-sm">{t('phrases_quiz_subtitle')}</p>
            </Link>
            <Link to="/quizzes/prepositions" className="group relative flex flex-col items-start p-6 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-blue-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:border-blue-200 hover:-translate-y-2 transition-all duration-500">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-500">📍</div>
              <h3 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors text-xl mb-1">{t('prepositions_quiz')}</h3>
              <p className="text-gray-600 font-medium text-sm">{t('prepositions_quiz_subtitle')}</p>
            </Link>
            <Link to="/quizzes/adjectives" className="group relative flex flex-col items-start p-6 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-blue-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:border-blue-200 hover:-translate-y-2 transition-all duration-500">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-500">✨</div>
              <h3 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors text-xl mb-1">{t('adjectives_quiz') || 'Adjectives'}</h3>
              <p className="text-gray-600 font-medium text-sm">{t('adjectives_quiz_subtitle') || 'Practice German adjectives.'}</p>
            </Link>
            <Link to="/quizzes/verbs" className="group relative flex flex-col items-start p-6 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-blue-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:border-blue-200 hover:-translate-y-2 transition-all duration-500">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-500">🏃</div>
              <h3 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors text-xl mb-1">{t('verbs_quiz') || 'Verbs'}</h3>
              <p className="text-gray-600 font-medium text-sm">{t('verbs_quiz_subtitle') || 'Practice German verbs and past forms.'}</p>
            </Link>
          </div>
        </div>
      )}

      {/* Custom Quizzes */}
      {activeTab === 'personal' && (
        <div className="space-y-4">
          {!user ? (
            <LoginGate title={t('personalized_space')} />
          ) : (
            <div className="bg-white/60 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold text-blue-950">{t('create_your_own_quizzes')}</h2>
                <p className="text-lg text-blue-900/70 font-medium">{t('create_your_own_quizzes_subtitle_loggedin')}</p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link to="/quizzes/vocabulary?tab=custom" className="group relative flex flex-col items-start p-6 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-blue-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:border-blue-200 hover:-translate-y-2 transition-all duration-500">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-500">📖</div>
                  <h3 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors text-xl mb-1">{t('vocabulary_quiz')}</h3>
                  <p className="text-gray-600 font-medium text-sm">{t('custom_vocab_desc')}</p>
                </Link>
                <Link to="/quizzes/articles?tab=custom" className="group relative flex flex-col items-start p-6 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-blue-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:border-blue-200 hover:-translate-y-2 transition-all duration-500">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-500">🔤</div>
                  <h3 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors text-xl mb-1">{t('articles_quiz')}</h3>
                  <p className="text-gray-600 font-medium text-sm">{t('custom_articles_desc')}</p>
                </Link>
                <Link to="/quizzes/phrases?tab=custom" className="group relative flex flex-col items-start p-6 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-blue-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:border-blue-200 hover:-translate-y-2 transition-all duration-500">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-500">💬</div>
                  <h3 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors text-xl mb-1">{t('phrases_quiz')}</h3>
                  <p className="text-gray-600 font-medium text-sm">{t('custom_phrases_desc')}</p>
                </Link>
                <Link to="/quizzes/prepositions?tab=custom" className="group relative flex flex-col items-start p-6 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-blue-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:border-blue-200 hover:-translate-y-2 transition-all duration-500">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-500">📍</div>
                  <h3 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors text-xl mb-1">{t('prepositions_quiz')}</h3>
                  <p className="text-gray-600 font-medium text-sm">{t('custom_prepositions_desc')}</p>
                </Link>
                <Link to="/quizzes/adjectives?tab=custom" className="group relative flex flex-col items-start p-6 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-blue-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:border-blue-200 hover:-translate-y-2 transition-all duration-500">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-500">✨</div>
                  <h3 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors text-xl mb-1">{t('adjectives_quiz') || 'Adjectives'}</h3>
                  <p className="text-gray-600 font-medium text-sm">{t('custom_adjectives_desc') || 'Your personal adjectives.'}</p>
                </Link>
                <Link to="/quizzes/verbs?tab=custom" className="group relative flex flex-col items-start p-6 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-blue-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:border-blue-200 hover:-translate-y-2 transition-all duration-500">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-500">🏃</div>
                  <h3 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors text-xl mb-1">{t('verbs_quiz') || 'Verbs'}</h3>
                  <p className="text-gray-600 font-medium text-sm">{t('custom_verbs_desc') || 'Your personal verbs.'}</p>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Marked Words */}
      {activeTab === 'marked' && (
        <div className="space-y-4">
          {!user ? (
            <LoginGate title={t('marked_words') || 'Marked words'} />
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white/60 backdrop-blur-xl p-5 sm:p-6 md:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-blue-950">{t('marked_words') || 'Marked words'}</h2>
                  <p className="text-base sm:text-lg text-blue-900/70 font-medium leading-snug">{t('marked_words_description') || t('marked_words_subtitle')}</p>
                </div>

                {userVocabulary === null ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-blue-900/70 font-medium">{t('loading_vocabulary') || 'Loading...'}</p>
                  </div>
                ) : markedWords.length < 4 ? (
                  <div className="text-center py-8 sm:py-10 px-2 sm:px-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl sm:text-3xl">⭐</div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-blue-950 mb-2">{t('marked_words_empty') || 'No marked words yet'}</h3>
                    <p className="text-blue-900/70 font-medium max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
                      {markedWords.length === 0
                        ? (t('marked_words_empty_desc') || 'Miss a question, then tap the star to save it here.')
                        : (t('not_enough_words_desc', { topic: t('marked_words') || 'marked' }) || 'Mark a few more words to start a quiz.')}
                    </p>
                    {markedWords.length > 0 && (
                      <p className="text-sm text-blue-900/50 font-medium mt-2">
                        {t('words_count', { count: markedWords.length })}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <p className="text-blue-900/60 font-medium text-sm">
                      {t('words_count', { count: markedWords.length })} · {markedLevels} {t('quizzes_title') || 'Quizzes'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {Array.from({ length: markedLevels }, (_, i) => i + 1).map((quizId) => {
                      const itemsInLevel =
                        quizId === markedLevels && markedWords.length % MARKED_WORDS_PER_QUIZ !== 0
                          ? markedWords.length % MARKED_WORDS_PER_QUIZ
                          : MARKED_WORDS_PER_QUIZ;
                      return (
                        <Link
                          key={quizId}
                          to={`/quiz?topic=marked&quizId=${quizId}`}
                          className="group flex items-center justify-between gap-3 min-h-[4.25rem] p-4 sm:p-5 rounded-2xl bg-white/90 border border-blue-50 hover:border-blue-200 hover:shadow-md active:scale-[0.99] transition-all touch-manipulation"
                        >
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                            <div className="w-11 h-11 flex-shrink-0 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">⭐</div>
                            <div className="min-w-0">
                              <h3 className="font-extrabold text-blue-950 group-hover:text-blue-700 transition-colors text-base sm:text-lg truncate">
                                {t('quiz_title_marked', { id: quizId }) || `Marked words quiz ${quizId}`}
                              </h3>
                              <p className="text-sm text-gray-500 font-medium">{t('words_count', { count: itemsInLevel })}</p>
                            </div>
                          </div>
                          <span className="text-blue-600 font-bold text-lg flex-shrink-0 group-hover:translate-x-1 transition-transform" aria-hidden>→</span>
                        </Link>
                      );
                    })}
                    </div>
                  </div>
                )}
              </div>

              {/* Manage library — cards on phone, table on tablet+ */}
              <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setManageOpen((o) => !o)}
                  className="w-full flex items-center justify-between gap-3 p-5 sm:p-6 md:px-8 hover:bg-white/40 transition-colors outline-none touch-manipulation active:bg-white/50"
                >
                  <div className="text-left min-w-0">
                    <h3 className="text-lg sm:text-xl font-extrabold text-blue-950">{t('marked_words_manage') || 'Manage library'}</h3>
                    <p className="text-xs sm:text-sm text-blue-900/60 font-medium mt-0.5 leading-snug">
                      {t('marked_words_manage_desc') || 'Remove words one by one from your marked list only. Public library quizzes are never changed.'}
                    </p>
                  </div>
                  <div className={`w-10 h-10 flex-shrink-0 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600 transition-transform duration-500 ${manageOpen ? 'rotate-180' : ''}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </button>

                {manageOpen && (
                  <div className="border-t border-blue-50/50">
                    {markedWords.length === 0 ? (
                      <p className="p-6 sm:p-8 text-center text-blue-900/60 font-medium">{t('marked_words_empty')}</p>
                    ) : (
                      <>
                        {/* Mobile / narrow tablet: stacked cards */}
                        <ul className="md:hidden divide-y divide-blue-50/50">
                          {markedWords.map((word) => (
                            <li key={word.id} className="flex items-start gap-3 p-4">
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-blue-950 break-words leading-snug">{word.german}</p>
                                <p className="text-gray-600 text-sm mt-1 break-words leading-snug">{word.hungarian}</p>
                              </div>
                              <button
                                type="button"
                                disabled={removingId === word.id}
                                onClick={() => handleRemoveMarked(word.id, word.german)}
                                className="flex-shrink-0 min-w-[2.75rem] min-h-[2.75rem] inline-flex items-center justify-center text-red-500 hover:text-red-700 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-40 touch-manipulation"
                                title={t('delete_word') || 'Delete word'}
                                aria-label={t('delete_word') || 'Delete word'}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                              </button>
                            </li>
                          ))}
                        </ul>

                        {/* Tablet / desktop: table */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full min-w-[480px] text-left border-collapse">
                            <thead className="bg-blue-50/30">
                              <tr>
                                <th className="p-3 sm:p-5 font-bold text-sm text-blue-900/60 uppercase tracking-wider">{t('german')}</th>
                                <th className="p-3 sm:p-5 font-bold text-sm text-blue-900/60 uppercase tracking-wider">{t('hungarian')}</th>
                                <th className="p-2 sm:p-4 w-16"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-50/50">
                              {markedWords.map((word) => (
                                <tr key={word.id} className="hover:bg-white/60 transition-colors">
                                  <td className="p-3 sm:p-5 font-bold text-blue-950 break-words">{word.german}</td>
                                  <td className="p-3 sm:p-5 text-gray-700 break-words">{word.hungarian}</td>
                                  <td className="p-2 sm:p-4 text-center">
                                    <button
                                      type="button"
                                      disabled={removingId === word.id}
                                      onClick={() => handleRemoveMarked(word.id, word.german)}
                                      className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40 touch-manipulation"
                                      title={t('delete_word') || 'Delete word'}
                                      aria-label={t('delete_word') || 'Delete word'}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
