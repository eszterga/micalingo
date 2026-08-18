import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useI18n } from '../I18nContext';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { openCookieSettings } from '../lib/consent';

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
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopLangMenuOpen, setIsDesktopLangMenuOpen] = useState(false);
  const [isMobileLangMenuOpen, setIsMobileLangMenuOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [showConsiderSupport, setShowConsiderSupport] = useState(false);

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
    ...(user ? [{ path: '/import', label: t('import') || 'Import' }] : []),
    { path: '/settings', label: t('settings') || 'Settings' }
  ];

  const currentLanguageFlag = languages.find(l => l.code === language)?.flag || 'EN';

  useEffect(() => {
    const handleShowSupportPrompt = () => {
      const dismissed = sessionStorage.getItem('micalingo_support_prompt_dismissed');
      if (!dismissed) {
        setShowConsiderSupport(true);
      }
    };

    const handleOpenSupportModal = () => {
      setIsSupportModalOpen(true);
    };
  
    window.addEventListener('showSupportPrompt', handleShowSupportPrompt);
    window.addEventListener('openSupportModal', handleOpenSupportModal);
  
    return () => {
      window.removeEventListener('showSupportPrompt', handleShowSupportPrompt);
      window.removeEventListener('openSupportModal', handleOpenSupportModal);
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener: any = CapacitorApp.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
      // Let the Quiz page handle its own quit-confirm trap
      if (location.pathname === '/quiz') return;

      // Prefer SPA history so private-space tabs (?tab=custom / personal / private) are restored
      if (canGoBack || window.history.length > 1) {
        window.history.back();
      } else if (location.pathname !== '/') {
        // Deep link / cold start on a subpage with empty history → go home instead of exiting
        navigate('/', { replace: true });
      } else {
        if (window.confirm(t('confirm_exit_app') || 'Are you sure you want to exit the app?')) {
          CapacitorApp.exitApp();
        }
      }
    });

    return () => {
      if (listener && listener.then) {
        listener.then((handle: any) => handle.remove());
      } else if (listener) {
        listener.remove();
      }
    };
  }, [t, location.pathname, navigate]);

  const isNativeApp = Capacitor.isNativePlatform();
  // Clear phone status bar (clock / wifi / notch) on mobile browser + Capacitor
  const mobileTopInset = isNativeApp
    ? 'max(2.5rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))'
    : 'max(2rem, calc(env(safe-area-inset-top, 0px) + 0.5rem))';

  const supportTiers = [
    { href: 'https://donate.stripe.com/5kQ6oAcYegUV77K5GQ4Ja00', label: t('support_tier_1') || 'Coffee Tier', amount: '€2', featured: false },
    { href: 'https://donate.stripe.com/28EcMYcYecEFcs4d9i4Ja01', label: t('support_tier_2') || 'Snack Tier', amount: '€5', featured: false },
    { href: 'https://donate.stripe.com/9B6bIU8HYeMN1Nq0mw4Ja02', label: t('support_tier_3') || 'Lunch Tier', amount: '€8', featured: false },
    { href: 'https://donate.stripe.com/9B67sE5vMawxfEgb1a4Ja03', label: t('support_tier_4') || 'Hero Tier 🚀', amount: '€10', featured: true },
  ];

  // On Capacitor, target=_blank often no-ops. Top-level navigation to a non-allowlisted
  // host is handed off to the system browser, matching desktop "open Stripe" behavior.
  const openDonateUrl = (url: string) => {
    setIsSupportModalOpen(false);
    if (Capacitor.isNativePlatform()) {
      window.location.href = url;
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-white text-gray-800 flex-col relative overflow-hidden">
      <BackgroundBlobs />
      {/* Mobile Header */}
      <div
        className="md:hidden bg-blue-900/70 backdrop-blur-lg text-white px-4 pb-4 flex justify-between items-center shadow-sm border-b border-white/10 z-50 relative"
        style={{ paddingTop: mobileTopInset }}
      >
        <div className="flex items-center gap-3">
          {location.pathname !== '/' && (
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 -ml-1 text-gray-300 hover:text-white" title="Menu">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="MicaLingo Logo" className="w-10 h-10 object-contain mt-1" width="40" height="40" />
            <h1 className="text-2xl font-extrabold tracking-wider">MicaLingo</h1>
          </Link>
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
          <div
            className="relative flex flex-col w-64 max-w-xs bg-blue-900 text-blue-100 h-full shadow-xl animate-fade-in-left"
            style={{ paddingTop: mobileTopInset }}
          >
            <div className="px-6 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="MicaLingo Logo" className="w-10 h-10 object-contain bg-white/90 rounded-full p-1 mt-1" width="40" height="40" />
                <h1 className="text-2xl font-extrabold text-white tracking-wider">MicaLingo</h1>
              </div>
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

              {!Capacitor.isNativePlatform() && (
                <div className="mt-4 pt-4 border-t border-blue-800">
                  <a 
                    href="/MicaLingo_v7.apk" 
                    download="MicaLingo_v7.apk"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-600/20 text-purple-200 hover:bg-purple-600/40 transition-colors border border-purple-500/30"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0004.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0004.5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0218 3.503c-1.4359-.6581-3.1371-1.0375-4.9458-1.0375-1.8088 0-3.51.3794-4.9458 1.0375L5.2235 5.447a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3436-4.1021-2.6892-7.5743-6.1185-9.4396"/>
                    </svg>
                    <span className="font-bold text-sm">{t("download_android") || "Get the Android App"}</span>
                  </a>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-blue-800 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsSupportModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded text-sm text-left text-pink-200 hover:bg-pink-600/30 hover:text-white transition-colors font-bold"
                >
                  💖 {t('support_micalingo') || 'Support MicaLingo'}
                </button>
                <Link to="/privacy" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-2.5 rounded text-sm text-blue-200 hover:bg-blue-800 hover:text-white transition-colors">
                  {t('footer_privacy') || 'Privacy Policy'}
                </Link>
                <Link to="/terms" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-2.5 rounded text-sm text-blue-200 hover:bg-blue-800 hover:text-white transition-colors">
                  {t('footer_terms') || 'Terms of Service'}
                </Link>
                <Link to="/cookies" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-2.5 rounded text-sm text-blue-200 hover:bg-blue-800 hover:text-white transition-colors">
                  {t('footer_cookies') || 'Cookie Policy'}
                </Link>
                <Link to="/impressum" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-2.5 rounded text-sm text-blue-200 hover:bg-blue-800 hover:text-white transition-colors">
                  {t('footer_impressum') || 'Impressum'}
                </Link>
                <Link to="/about" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-2.5 rounded text-sm text-blue-200 hover:bg-blue-800 hover:text-white transition-colors">
                  {t('footer_about') || 'About & Contact'}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openCookieSettings();
                  }}
                  className="px-4 py-2.5 rounded text-sm text-left text-blue-200 hover:bg-blue-800 hover:text-white transition-colors"
                >
                  {t('footer_cookie_settings') || 'Cookie settings'}
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center px-8 py-4 bg-white/30 backdrop-blur-lg border-b border-white/40 shadow-sm z-50 relative">
          <Link to="/" className="flex items-center gap-3 hover:scale-105 transition-transform">
            <img src="/logo.png" alt="MicaLingo Logo" className="w-12 h-12 object-contain drop-shadow-sm mt-1.5" width="48" height="48" />
            <h1 className="text-3xl font-extrabold text-blue-900 tracking-wider">MicaLingo</h1>
          </Link>
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
          <div className="max-w-6xl mx-auto h-full flex flex-col min-h-full">
            <div className="flex-1">
              <Outlet />
            </div>
            <footer className="mt-10 pt-6 pb-20 md:pb-8 border-t border-blue-200/40 text-center relative z-10">
              <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-bold text-blue-800/80 mb-3">
                <Link to="/privacy" className="hover:text-blue-950 transition-colors">{t('footer_privacy') || 'Privacy Policy'}</Link>
                <Link to="/terms" className="hover:text-blue-950 transition-colors">{t('footer_terms') || 'Terms of Service'}</Link>
                <Link to="/cookies" className="hover:text-blue-950 transition-colors">{t('footer_cookies') || 'Cookie Policy'}</Link>
                <Link to="/impressum" className="hover:text-blue-950 transition-colors">{t('footer_impressum') || 'Impressum'}</Link>
                <Link to="/about" className="hover:text-blue-950 transition-colors">{t('footer_about') || 'About & Contact'}</Link>
                <button
                  type="button"
                  onClick={openCookieSettings}
                  className="hover:text-blue-950 transition-colors"
                >
                  {t('footer_cookie_settings') || 'Cookie settings'}
                </button>
              </nav>
              <p className="text-xs text-blue-900/50 font-medium">
                © {new Date().getFullYear()} MicaLingo · {t('footer_rights') || 'All rights reserved.'}
              </p>
            </footer>
          </div>
        </main>
      </div>

      <button
        type="button"
        onClick={() => setIsSupportModalOpen(true)}
        aria-label={t('support_micalingo') || 'Support MicaLingo'}
        className="fixed z-40 flex items-center gap-2 px-4 py-2.5 max-w-[calc(100vw-2rem)] bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-full shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300 text-sm md:text-base"
        style={{
          bottom: 'max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))',
          right: 'max(1rem, calc(env(safe-area-inset-right, 0px) + 0.75rem))',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
        </svg>
        <span className="truncate">{t('support_micalingo') || 'Support MicaLingo'}</span>
      </button>

      {isSupportModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-blue-950/40 backdrop-blur-sm transition-opacity"
          style={{
            paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
          }}
          onClick={() => setIsSupportModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-modal-title"
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm max-h-full overflow-y-auto flex flex-col animate-fade-in-up border border-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-start gap-3 bg-gray-50/50 sticky top-0 z-10">
              <h2 id="support-modal-title" className="text-lg sm:text-xl font-extrabold text-blue-950 flex items-center gap-2 min-w-0">
                <span className="text-2xl shrink-0" aria-hidden="true">💖</span>
                <span className="leading-tight">{t('support_micalingo') || 'Support MicaLingo'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsSupportModalOpen(false)}
                className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-200"
                aria-label={t('close') || 'Close'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 sm:p-6 flex flex-col gap-3">
              <p className="text-gray-600 text-center font-medium mb-1 sm:mb-3 text-sm">
                {t('support_desc') || 'Choose an amount to support our project. Every contribution helps!'}
              </p>
              {supportTiers.map((tier) => (
                <a
                  key={tier.href}
                  href={tier.href}
                  target={isNativeApp ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.preventDefault();
                    openDonateUrl(tier.href);
                  }}
                  className={
                    tier.featured
                      ? 'w-full flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.98]'
                      : 'w-full flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-xl transition-colors border border-blue-200 active:scale-[0.98]'
                  }
                >
                  <span className="min-w-0 text-left leading-snug">{tier.label}</span>
                  <span className="shrink-0">{tier.amount}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {showConsiderSupport && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-blue-950/40 backdrop-blur-sm transition-opacity"
          style={{
            paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
          }}
          onClick={() => setShowConsiderSupport(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm max-h-full overflow-y-auto flex flex-col animate-fade-in-up border border-white text-center p-6 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              💖
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-blue-950 mb-2">
              {t('enjoying_micalingo_title') || 'Enjoying MicaLingo?'}
            </h2>
            <p className="text-gray-600 mb-8 font-medium text-sm sm:text-base">
              {t('consider_donation_desc') || 'Please consider supporting the project to keep it running and ad-free.'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowConsiderSupport(false);
                  setIsSupportModalOpen(true);
                }}
                className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all active:scale-[0.98]"
              >
                {t('yes_support') || 'Yes, show me how!'}
              </button>
              <button
                type="button"
                onClick={() => { setShowConsiderSupport(false); sessionStorage.setItem('micalingo_support_prompt_dismissed', 'true'); }}
                className="w-full py-3.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
              >
                {t('maybe_later') || 'Maybe later'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}