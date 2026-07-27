import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useI18n } from "../I18nContext";
import { useAuth } from "../AuthContext";
import { signInWithGoogle } from '../lib/googleAuth';

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

export default function Quizzes() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'library' | 'personal'>(
    searchParams.get('tab') === 'personal' ? 'personal' : 'library'
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'personal') setActiveTab('personal');
    else if (tab === 'library') setActiveTab('library');
  }, [searchParams]);

  const handleTabChange = (tab: 'library' | 'personal') => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
      alert(t('alert_login_failed'));
    }
  };

  return (
    <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
      <BackgroundBlobs />
      <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 px-4 md:px-8">
        <div className="flex items-center gap-4">
          <Link to="/" className="bg-white/70 backdrop-blur-md border border-white text-gray-700 hover:bg-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2">
            {t('back_button')}
          </Link>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 tracking-tight pb-2">{t('quizzes_title')}</h1>
            <p className="text-lg text-blue-900/70 font-medium mt-1">{t('quizzes_subtitle')}</p>
          </div>
        </div>

      {/* Navigation Tabs */}
        <div className="flex overflow-x-auto whitespace-nowrap border-b border-white/60">
          <button
            onClick={() => handleTabChange('library')}
            className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors ${activeTab === 'library' ? 'border-blue-600 text-blue-700' : 'border-transparent text-blue-900/50 hover:text-blue-900/80'}`}
          >
            {t('open_library')}
          </button>
          <button
            onClick={() => handleTabChange('personal')}
            className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors ${activeTab === 'personal' ? 'border-blue-600 text-blue-700' : 'border-transparent text-blue-900/50 hover:text-blue-900/80'}`}
          >
          {t('personalized_space')}
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
            <div className="bg-white/70 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h2 className="text-3xl font-extrabold text-blue-950 mb-3">{t('personalized_space')}</h2>
                <p className="text-blue-900/70 text-lg font-medium mb-8">
                  {t('personalized_space_description')}
                </p>
                <button onClick={handleGoogleLogin} className="inline-flex items-center gap-3 bg-white border border-white hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-md text-gray-800 font-bold py-3.5 px-6 rounded-xl shadow-sm transition-all duration-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  {t('login_with_google')}
                </button>
              </div>
            </div>
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
      </div>
    </div>
  );
}
