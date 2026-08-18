export const CONSENT_STORAGE_KEY = 'micalingo_cookie_consent';
export const CONSENT_VERSION = 1;
export const CONSENT_CHANGED_EVENT = 'micalingo-consent-changed';
export const OPEN_COOKIE_SETTINGS_EVENT = 'openCookieSettings';

export type CookieConsent = {
  version: number;
  necessary: true;
  advertising: boolean;
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
    if (parsed.version !== CONSENT_VERSION || typeof parsed.advertising !== 'boolean') {
      return null;
    }
    return {
      version: CONSENT_VERSION,
      necessary: true,
      advertising: parsed.advertising,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function applyGoogleConsent(advertising: boolean) {
  const state = advertising ? 'granted' : 'denied';
  const payload = {
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
    analytics_storage: 'denied',
  };

  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', payload);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(['consent', 'update', payload]);
}

export function saveConsent(advertising: boolean): CookieConsent {
  const consent: CookieConsent = {
    version: CONSENT_VERSION,
    necessary: true,
    advertising,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  applyGoogleConsent(advertising);
  notifyConsentChanged();
  return consent;
}

export function openCookieSettings() {
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
}
