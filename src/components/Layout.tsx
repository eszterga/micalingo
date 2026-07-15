import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useI18n } from '../I18nContext';

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

export default function Layout() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopLangMenuOpen, setIsDesktopLangMenuOpen] = useState(false);
  const [isMobileLangMenuOpen, setIsMobileLangMenuOpen] = useState(false);

  const languages = [
    { code: 'en', label: 'English', flag: 'EN' },
    { code: 'de', label: 'Deutsch', flag: 'DE' },
    { code: 'hu', label: 'Magyar', flag: 'HU' }
  ];

  const navLinks = [
    { path: '/', label: t('home') || 'Home' },
    { path: '/quizzes', label: t('quizzes') || 'Quizzes' },
    { path: '/library', label: t('library') || 'Library' },
    { path: '/grammar', label: t('grammar') || 'Grammar' },
    { path: '/statistics', label: t('statistics') || 'Statistics' },
    { path: '/import', label: t('import') || 'Import' },
    { path: '/settings', label: t('settings') || 'Settings' }
  ];

  const currentLanguageFlag = languages.find(l => l.code === language)?.flag || 'EN';

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-white text-gray-800 flex-col relative overflow-hidden">
      <BackgroundBlobs />
      {/* Mobile Header */}
      <div className="md:hidden bg-blue-900/70 backdrop-blur-lg text-white p-4 flex justify-between items-center shadow-sm border-b border-white/10 z-50 relative">
        <div className="flex items-center gap-3">
          {location.pathname !== '/' && (
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 -ml-1 text-gray-300 hover:text-white" title="Menu">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <h1 className="text-xl font-bold tracking-wider">
            <Link to="/">MicaLingo</Link>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setIsMobileLangMenuOpen(!isMobileLangMenuOpen)} className="flex items-center gap-1.5 p-2 text-white transition-colors rounded-lg hover:bg-blue-800" title={t('language_preferences') || 'Language Preferences'}>
              <span className="leading-none flex items-center justify-center w-6 h-6 text-sm font-medium">{currentLanguageFlag}</span>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isMobileLangMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMobileLangMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-40 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg z-50 overflow-hidden">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code as any);
                        setIsMobileLangMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-gray-700 transition-colors ${language === lang.code ? 'bg-gray-700 text-white font-semibold' : 'text-gray-300'}`}
                    >
                      <span className="w-6 h-6 flex items-center justify-center text-sm font-medium">{lang.flag}</span>
                      {lang.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {user ? (
            <button onClick={signOut} title={t('sign_out')} className="flex items-center">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-7 h-7 rounded-full border border-gray-700" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-700 text-white flex items-center justify-center font-bold text-xs border border-gray-600">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          ) : (
            <Link to="/login" className="text-xs text-gray-400 hover:text-white border border-gray-600 px-2 py-1.5 rounded">
              {t('login') || 'Log in'}
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative flex flex-col w-64 max-w-xs bg-blue-900 text-blue-100 h-full shadow-xl">
            <div className="p-6 flex items-center justify-between">
              <h1 className="text-xl font-bold text-white tracking-wider">MicaLingo</h1>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-blue-300 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-1 px-4 flex-1 overflow-y-auto pb-6">
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded transition-colors ${location.pathname === link.path ? 'bg-blue-800 text-white font-medium' : 'hover:bg-blue-800 hover:text-white'}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center px-8 py-4 bg-white/30 backdrop-blur-lg border-b border-white/40 shadow-sm z-50 relative">
          <h1 className="text-2xl font-extrabold text-blue-900 tracking-wider hover:scale-105 transition-transform">
            <Link to="/">MicaLingo</Link>
          </h1>
          <div className="flex items-center gap-6">
            <div className="relative">
              <button onClick={() => setIsDesktopLangMenuOpen(!isDesktopLangMenuOpen)} className="flex items-center gap-2 p-2 text-gray-700 hover:text-gray-900 transition-colors rounded-lg hover:bg-white/60 font-medium" title={t('language_preferences') || 'Language Preferences'}>
                <span className="leading-none flex items-center justify-center w-6 h-6 text-sm font-medium">{currentLanguageFlag}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isDesktopLangMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDesktopLangMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-40 bg-white/80 backdrop-blur-xl border border-white/60 rounded-xl shadow-lg z-50 overflow-hidden">
                    {languages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code as any);
                          setIsDesktopLangMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-white/50 transition-colors ${language === lang.code ? 'bg-blue-50/50 text-blue-700 font-bold' : 'text-gray-700 font-medium'}`}
                      >
                        <span className="w-6 h-6 flex items-center justify-center text-sm font-medium">{lang.flag}</span>
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="h-6 border-l border-gray-300" />
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200 shadow-sm" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 hidden lg:block">{user.displayName || user.email}</span>
                </div>
                <button onClick={signOut} className="text-sm font-medium text-gray-500 hover:text-gray-900 border-l pl-4 border-gray-300 transition-colors">
                  {t('sign_out') || 'Sign Out'}
                </button>
              </div>
            ) : (
              <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
                {t('login') || 'Log in'}
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}