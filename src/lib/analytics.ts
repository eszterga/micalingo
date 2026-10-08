import { Capacitor } from '@capacitor/core';
import { CONSENT_CHANGED_EVENT, readConsent } from './consent';

/**
 * Google Analytics 4 measurement ID from analytics.google.com
 * (Admin → Data streams → Web → Measurement ID, looks like G-XXXXXXXX).
 * Tracking stays off until this is set.
 */
export const GA_MEASUREMENT_ID = '';

type EventParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let started = false;

function platform(): 'android_app' | 'web' {
  return Capacitor.isNativePlatform() ? 'android_app' : 'web';
}

function allowed(): boolean {
  return GA_MEASUREMENT_ID.startsWith('G-') && readConsent()?.analytics === true;
}

function loadGa() {
  if (!GA_MEASUREMENT_ID.startsWith('G-') || started) return;
  started = true;

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
  }

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

export function installAnalytics(): () => void {
  const onConsent = () => {
    if (allowed()) loadGa();
  };
  onConsent();
  window.addEventListener(CONSENT_CHANGED_EVENT, onConsent);
  return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onConsent);
}

export function trackPageView(pagePath: string) {
  if (!allowed() || typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_location: `${window.location.origin}${pagePath}`,
    page_title: document.title,
    app_platform: platform(),
  });
}

export function trackEvent(name: string, params: EventParams = {}) {
  if (!allowed() || typeof window.gtag !== 'function') return;
  window.gtag('event', name, {
    ...params,
    app_platform: platform(),
  });
}
