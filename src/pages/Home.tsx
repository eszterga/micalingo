import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useI18n } from '../I18nContext';

export default function Home() {
  const { user, isAdmin, setAdminMode } = useAuth();
  const { t } = useI18n();
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);

  useEffect(() => {
    if (isAdmin && !sessionStorage.getItem('adminPromptShown')) {
      setShowAdminPrompt(true);
    }
  }, [isAdmin]);

  const handleAdminChoice = (isDev: boolean) => {
    setAdminMode(isDev);
    sessionStorage.setItem('adminPromptShown', 'true');
    setShowAdminPrompt(false);
  };

  const flyingWords = [
    { text: "der Hund", left: "10%", delay: "0s", duration: "12s" },
    { text: "sprechen", left: "30%", delay: "2s", duration: "15s" },
    { text: "das Haus", left: "70%", delay: "1s", duration: "10s" },
    { text: "schnell", left: "85%", delay: "4s", duration: "14s" },
    { text: "die Frau", left: "50%", delay: "6s", duration: "11s" },
    { text: "lernen", left: "20%", delay: "5s", duration: "16s" },
    { text: "wunderschön", left: "60%", delay: "8s", duration: "13s" },
    { text: "das Auto", left: "80%", delay: "10s", duration: "12s" },
    { text: "die Katze", left: "5%", delay: "7s", duration: "12s" },
    { text: "fliegen", left: "90%", delay: "3s", duration: "10s" },
  ];

  return (
    <div className="relative min-h-[85vh] w-full overflow-hidden p-4 md:p-8 flex flex-col items-center justify-center">
      <style>{`
        @keyframes float-up {
          0% { top: 110%; transform: rotate(-10deg) scale(0.8); opacity: 0; }
          10% { opacity: 0.4; }
          90% { opacity: 0.4; }
          100% { top: -10%; transform: rotate(10deg) scale(1.2); opacity: 0; }
        }
        @keyframes rocket-fly {
          0% { transform: translate(-100px, 100px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate(120vw, -120vh); opacity: 0; }
        }
        @keyframes float-1 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes float-2 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-18px); } }
        @keyframes float-3 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        .flying-word {
          position: absolute;
          color: rgba(30, 58, 138, 0.4);
          font-weight: 800;
          font-size: 1.2rem;
          animation: float-up linear infinite;
          white-space: nowrap;
          pointer-events: none;
          z-index: 0;
        }
        @media (min-width: 768px) {
          .flying-word { font-size: 1.8rem; }
        }
        .rocket {
          animation: rocket-fly 18s linear infinite;
        }
      `}</style>

      {/* Sun SVG */}
      <div className="absolute top-8 right-8 md:top-12 md:right-16 z-0">
         <div className="absolute inset-0 bg-yellow-300 rounded-full blur-2xl opacity-50 animate-pulse"></div>
         <svg className="relative w-24 h-24 md:w-32 md:h-32 text-yellow-400 drop-shadow-lg animate-[spin_40s_linear_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
           <circle cx="12" cy="12" r="5" fill="currentColor" />
           <line x1="12" y1="1" x2="12" y2="4" />
           <line x1="12" y1="20" x2="12" y2="23" />
           <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
           <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
           <line x1="1" y1="12" x2="4" y2="12" />
           <line x1="20" y1="12" x2="23" y2="12" />
           <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
           <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
         </svg>
      </div>

      {/* Flying Words Background */}
      {flyingWords.map((word, i) => (
        <div
          key={i}
          className="flying-word"
          style={{
            left: word.left,
            animationDelay: word.delay,
            animationDuration: word.duration,
          }}
        >
          {word.text}
        </div>
      ))}

      {/* Rocket SVG */}
      <div className="absolute bottom-10 left-4 md:bottom-20 md:left-20 z-10 rocket pointer-events-none">
         <div className="relative w-16 h-16 md:w-24 md:h-24">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-blue-600 drop-shadow-2xl relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
             <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
             <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
             <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
             <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
          </svg>
         </div>
      </div>

      {/* Header */}
      <div className="text-center z-10 mb-16 relative">
        <div className="absolute inset-0 bg-white/40 blur-3xl rounded-full"></div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-blue-900 drop-shadow-md relative px-4">{t('welcome_back')}</h1>
        <p className="text-lg md:text-xl lg:text-2xl text-blue-800 mt-4 font-bold drop-shadow-sm relative max-w-3xl mx-auto px-4">{t('ready_to_learn')}</p>
      </div>

      {/* Clouds Grid */}
      <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 z-10 max-w-5xl relative">
         <CloudLink to="/quizzes" title={t('quizzes')} t={t} sizeClass="w-48 h-32 md:w-60 md:h-40" animationStyle={{ animation: 'float-1 5s ease-in-out infinite' }} />
         <CloudLink to="/library" title={t('library')} t={t} sizeClass="w-44 h-28 md:w-52 md:h-36" animationStyle={{ animation: 'float-2 7s ease-in-out infinite' }} />
         <CloudLink to="/grammar" title={t('grammar')} t={t} sizeClass="w-40 h-28 md:w-48 md:h-32" animationStyle={{ animation: 'float-3 6s ease-in-out infinite' }} />
         <CloudLink to="/statistics" title={t('statistics')} t={t} sizeClass="w-44 h-28 md:w-56 md:h-36" animationStyle={{ animation: 'float-1 8s ease-in-out infinite' }} />
         <CloudLink to="/import" title={t('import_data')} locked={!user} t={t} sizeClass="w-40 h-28 md:w-48 md:h-32" animationStyle={{ animation: 'float-2 6.5s ease-in-out infinite' }} />
         <CloudLink to="/settings" title={t('settings')} t={t} sizeClass="w-36 h-24 md:w-44 md:h-28" animationStyle={{ animation: 'float-3 5.5s ease-in-out infinite' }} />
      </div>

      {/* Admin Mode Prompt Modal */}
      {showAdminPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('admin_prompt_title')}</h2>
            <p className="text-gray-600 mb-8">{t('admin_prompt_desc')}</p>
            <div className="flex flex-col gap-4">
              <button onClick={() => handleAdminChoice(true)} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition-colors text-lg">
                {t('admin_mode_dev')}
              </button>
              <button onClick={() => handleAdminChoice(false)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-xl transition-colors">
                {t('admin_mode_normal')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function CloudLink({ to, title, locked, isComingSoon, t, sizeClass, animationStyle }: any) {
  return (
    <div style={animationStyle}>
      <Link 
        to={to} 
        className={`relative group flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform duration-300 ${sizeClass || 'w-40 h-28 md:w-48 md:h-32'} ${locked ? 'opacity-90' : ''}`}
      >
        {/* Authentic Smooth Cloud Shape */}
        <svg className="absolute inset-0 w-full h-full text-white group-hover:text-green-400 drop-shadow-xl transition-colors duration-300" viewBox="0 0 120 80" preserveAspectRatio="none" fill="currentColor">
          <path d="M 30,70 Q 10,70 10,50 Q 10,35 25,30 Q 30,10 55,10 Q 75,10 85,25 Q 105,25 105,45 Q 105,70 80,70 Z" />
        </svg>

        <div className="relative z-10 flex flex-col items-center text-center px-4 pt-2">
          <span className="font-extrabold text-blue-900 group-hover:text-white transition-colors text-lg md:text-xl drop-shadow-sm">{title}</span>
          {isComingSoon && (
             <span className="text-[10px] font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full uppercase tracking-wider mt-2 shadow-sm">{t('coming_soon')}</span>
          )}
          {locked && (
             <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase mt-2 shadow-sm flex items-center gap-1">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
               {t('login_required')}
             </span>
          )}
        </div>
      </Link>
    </div>
  );
}
