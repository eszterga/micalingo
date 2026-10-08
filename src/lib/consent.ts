export const CONSENT_STORAGE_KEY = 'micalingo_cookie_consent';
export const CONSENT_VERSION = 2;
export const CONSENT_CHANGED_EVENT = 'micalingo-consent-changed';
export const OPEN_COOKIE_SETTINGS_EVENT = 'openCookieSettings';

export type CookieConsent = {
  version: number;
  necessary: true;
  advertising: boolean;
  analytics: boolean;
  updatedAt: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function notifyConsentChanged() {
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT));
}

export function readConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (
      parsed.version !== CONSENT_VERSION ||
      typeof parsed.advertising !== 'boolean' ||
      typeof parsed.analytics !== 'boolean'
    ) {
      return null;
    }
    return {
      version: CONSENT_VERSION,
      necessary: true,
      advertising: parsed.advertising,
      analytics: parsed.analytics,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function applyGoogleConsent(advertising: boolean, analytics: boolean) {
  const ads = advertising ? 'granted' : 'denied';
  const stats = analytics ? 'granted' : 'denied';
  const payload = {
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
    analytics_storage: stats,
  };

  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', payload);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(['consent', 'update', payload]);
}

export function saveConsent(advertising: boolean, analytics: boolean): CookieConsent {
  const consent: CookieConsent = {
    version: CONSENT_VERSION,
    necessary: true,
    advertising,
    analytics,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  applyGoogleConsent(advertising, analytics);
  notifyConsentChanged();
  return consent;
}

export function openCookieSettings() {
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
}
