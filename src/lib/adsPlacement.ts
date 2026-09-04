import { Capacitor } from '@capacitor/core';

export const ADSENSE_PUBLISHER_ID = 'ca-pub-6028052812355797';
export const ADMOB_BANNER_HEIGHT_VAR = '--admob-banner-height';

const DEV_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);

export function isDevRuntime(): boolean {
  if (import.meta.env.DEV) return true;
  const host = window.location.hostname;
  return DEV_HOSTS.has(host) || host.endsWith('.local');
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Quiz-taking, private library, and marked-words surfaces — never show ads here. */
export function isAdExcludedLocation(pathname: string, search: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const tab = (params.get('tab') || '').toLowerCase();
  const topic = (params.get('topic') || '').toLowerCase();
  const custom = (params.get('custom') || '').toLowerCase();

  if (path === '/quiz' || path.startsWith('/quiz/')) return true;
  if (path === '/results' || path.startsWith('/results/')) return true;
  if (path === '/login' || path.startsWith('/login/')) return true;
  if (path === '/settings' || path.startsWith('/settings/')) return true;
  if (path === '/statistics' || path.startsWith('/statistics/')) return true;
  if (path === '/practice' || path.startsWith('/practice/')) return true;
  if (path.startsWith('/learning-materials/private')) return true;
  if (path === '/import' || path.startsWith('/import/')) return true;
  if (path === '/create-quiz') return true;
  if (path === '/quizzes/telc-b2' || path.startsWith('/quizzes/telc-b2/')) return true;
  if (tab === 'private' || tab === 'personal' || tab === 'custom' || tab === 'marked' || tab === 'telc') return true;
  if (topic === 'marked' || topic === 'telc-b2') return true;
  if (custom === 'true' || custom === '1') return true;
  return false;
}

export function shouldShowWebAds(pathname: string, search: string, advertisingConsent: boolean): boolean {
  if (isNativeApp()) return false;
  if (isDevRuntime()) return false;
  if (!advertisingConsent) return false;
  if (isAdExcludedLocation(pathname, search)) return false;
  return true;
}

export function shouldShowNativeAds(
  pathname: string,
  search: string,
  options: { adminMode: boolean; isAdmin: boolean; adminPromptShown: boolean }
): boolean {
  if (!isNativeApp()) return false;
  if (isDevRuntime()) return false;
  if (options.adminMode) return false;
  if (options.isAdmin && !options.adminPromptShown) return false;
  if (isAdExcludedLocation(pathname, search)) return false;
  return true;
}

export function setBannerOffset(px: number) {
  document.documentElement.style.setProperty(ADMOB_BANNER_HEIGHT_VAR, `${Math.max(0, px)}px`);
}
