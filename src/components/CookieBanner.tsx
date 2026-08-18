import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../I18nContext';
import {
  OPEN_COOKIE_SETTINGS_EVENT,
  applyGoogleConsent,
  readConsent,
  saveConsent,
  type CookieConsent,
} from '../lib/consent';

export default function CookieBanner() {
  const { t } = useI18n();
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [visible, setVisible] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readConsent();
    setConsent(stored);
    setAdsEnabled(stored?.advertising ?? false);
    setVisible(!stored);
    setReady(true);
    if (stored) applyGoogleConsent(stored.advertising);

    const reopen = () => {
      const current = readConsent();
      setConsent(current);
      setAdsEnabled(current?.advertising ?? false);
      setCustomize(true);
      setVisible(true);
    };

    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  if (!ready || !visible) return null;

  const apply = (advertising: boolean) => {
    const next = saveConsent(advertising);
    setConsent(next);
    setAdsEnabled(advertising);
    setCustomize(false);
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] p-3 md:p-5 pointer-events-none"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-banner-title"
        className="pointer-events-auto mx-auto max-w-3xl rounded-[1.75rem] border border-white/80 bg-white/95 backdrop-blur-xl shadow-[0_12px_40px_rgb(15,23,42,0.18)] p-5 md:p-6"
      >
        <h2 id="cookie-banner-title" className="text-lg md:text-xl font-extrabold text-blue-950 mb-2">
          {t('cookie_banner_title')}
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          {t('cookie_banner_body')}{' '}
          <Link to="/privacy" className="font-bold text-blue-700 underline underline-offset-2">
            {t('footer_privacy')}
          </Link>
          {' · '}
          <Link to="/cookies" className="font-bold text-blue-700 underline underline-offset-2">
            {t('footer_cookies')}
          </Link>
        </p>

        {customize && (
          <div className="space-y-3 mb-4">
            <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-blue-50/80 border border-blue-100">
              <div>
                <p className="font-extrabold text-blue-950">{t('cookie_banner_necessary')}</p>
                <p className="text-xs text-blue-900/70 mt-1 font-medium">{t('cookie_banner_necessary_desc')}</p>
              </div>
              <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-blue-700 bg-white px-2.5 py-1 rounded-full border border-blue-100">
                {t('cookie_banner_always_on')}
              </span>
            </div>
            <label className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-white border border-blue-100 cursor-pointer">
              <div>
                <p className="font-extrabold text-blue-950">{t('cookie_banner_ads')}</p>
                <p className="text-xs text-blue-900/70 mt-1 font-medium">{t('cookie_banner_ads_desc')}</p>
              </div>
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-blue-600"
                checked={adsEnabled}
                onChange={(event) => setAdsEnabled(event.target.checked)}
              />
            </label>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
          <button
            type="button"
            onClick={() => apply(true)}
            className="sm:flex-1 px-4 py-2.5 rounded-xl bg-blue-700 text-white font-bold hover:bg-blue-800 transition-colors"
          >
            {t('cookie_banner_accept')}
          </button>
          <button
            type="button"
            onClick={() => apply(false)}
            className="sm:flex-1 px-4 py-2.5 rounded-xl bg-white border border-blue-200 text-blue-900 font-bold hover:bg-blue-50 transition-colors"
          >
            {t('cookie_banner_reject')}
          </button>
          {customize ? (
            <button
              type="button"
              onClick={() => apply(adsEnabled)}
              className="sm:flex-1 px-4 py-2.5 rounded-xl bg-blue-100 text-blue-950 font-bold hover:bg-blue-200 transition-colors"
            >
              {t('cookie_banner_save')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAdsEnabled(consent?.advertising ?? false);
                setCustomize(true);
              }}
              className="sm:flex-1 px-4 py-2.5 rounded-xl bg-blue-100 text-blue-950 font-bold hover:bg-blue-200 transition-colors"
            >
              {t('cookie_banner_customize')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
