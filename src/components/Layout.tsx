import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useI18n } from '../I18nContext';

export default function Layout() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isMobileLangMenuOpen, setIsMobileLangMenuOpen] = useState(false);

  const languages = [
    { code: 'en', label: 'English', flag: 'EN' },
    { code: 'de', label: 'Deutsch', flag: 'DE' },
    { code: 'hu', label: 'Magyar', flag: 'HU' }
  ];

  const navLinks = [
    { path: '/', label: t('home') },
    { path: '/quizzes', label: t('quizzes') },
    { path: '/library', label: t('library') },
    { path: '/grammar', label: t('grammar') },
    { path: '/statistics', label: t('statistics') },
    { path: '/import', label: t('import') },
    { path: '/settings', label: t('settings') }
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-200 via-blue-50 to-white text-gray-800 flex-col">

      {/* Mobile Top Header */}
      <div className="md:hidden bg-blue-900 text-white p-4 flex justify-between items-center shadow-md z-50 relative">
        <div className="flex items-center gap-3">
          {location.pathname !== '/' && (
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 -ml-1 text-gray-300 hover:text-white" title="Menu">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          )}
          <h1 className="text-xl font-bold tracking-wider">
            <Link to="/">MicaLingo</Link>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Mobile Language Selector */}
          <div className="relative">
            <button onClick={() => setIsMobileLangMenuOpen(!isMobileLangMenuOpen)} className="flex items-center gap-1.5 p-2 text-white transition-colors rounded-lg hover:bg-blue-800" title={t('language_preferences')}>
              <span className="leading-none flex items-center justify-center w-6 h-6 text-sm font-medium">{languages.find(l => l.code === language)?.flag || 'EN'}</span>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isMobileLangMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMobileLangMenuOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code as 'en' | 'de' | 'hu');
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
            <Link to="/login" className="text-xs text-gray-400 hover:text-white border border-gray-600 px-2 py-1.5 rounded">{t('login')}</Link>
          )}
        </div>
      </div>

      {/* Mobile Hamburger Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}></div>

          {/* Drawer */}
          <div className="relative flex flex-col w-64 max-w-xs bg-blue-900 text-blue-100 h-full shadow-xl">
            <div className="p-6 flex items-center justify-between">
              <h1 className="text-xl font-bold text-white tracking-wider">
                MicaLingo
              </h1>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-blue-300 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-1 px-4 flex-1 overflow-y-auto pb-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded transition-colors ${
                    location.pathname === link.path ? 'bg-blue-800 text-white font-medium' : 'hover:bg-blue-800 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Top Header & Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="hidden md:flex justify-between items-center px-8 py-4 bg-white/40 backdrop-blur-md border-b border-white/50 shadow-sm z-50 relative">
          <h1 className="text-2xl font-extrabold text-blue-900 tracking-wider hover:scale-105 transition-transform">
            <Link to="/">MicaLingo</Link>
          </h1>
          <div className="flex items-center gap-6">
          {/* Desktop Language Selector */}
          <div className="relative">
            <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="flex items-center gap-2 p-2 text-gray-700 hover:text-gray-900 transition-colors rounded-lg hover:bg-white/60 font-medium" title={t('language_preferences')}>
              <span className="leading-none flex items-center justify-center w-6 h-6 text-sm font-medium">{languages.find(l => l.code === language)?.flag || 'EN'}</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isLangMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsLangMenuOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code as 'en' | 'de' | 'hu');
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors ${language === lang.code ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}
                    >
                      <span className="w-6 h-6 flex items-center justify-center text-sm font-medium">{lang.flag}</span>
                      {lang.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="h-6 border-l border-gray-300"></div>

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
                {t('sign_out')}
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
              {t('login')}
            </Link>
          )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
