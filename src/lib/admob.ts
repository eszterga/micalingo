import { Capacitor } from '@capacitor/core';
import { setBannerOffset } from './adsPlacement';

/**
 * Native AdMob display is wired from AdController. The plugin is loaded only on
 * device so the website build does not depend on it at compile time.
 */
async function loadPlugin(): Promise<null | {
  AdMob: {
    initialize: (opts?: Record<string, unknown>) => Promise<void>;
    trackingAuthorizationStatus: () => Promise<{ status: string }>;
    requestTrackingAuthorization: () => Promise<void>;
    requestConsentInfo: () => Promise<{ canRequestAds?: boolean; isConsentFormAvailable?: boolean; status?: string }>;
    showConsentForm: () => Promise<{ canRequestAds?: boolean; isConsentFormAvailable?: boolean; status?: string }>;
    showBanner: (opts: Record<string, unknown>) => Promise<void>;
    hideBanner: () => Promise<void>;
    showPrivacyOptionsForm: () => Promise<void>;
    addListener: (event: string, cb: (size: { height?: number }) => void) => Promise<unknown>;
  };
  BannerAdSize: { ADAPTIVE_BANNER: string; BANNER: string };
  BannerAdPosition: { BOTTOM_CENTER: string };
  BannerAdPluginEvents: { SizeChanged: string };
  AdmobConsentStatus: { REQUIRED: string };
}> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const spec = '@capacitor-community/admob';
    return await import(/* @vite-ignore */ spec);
  } catch {
    return null;
  }
}

const TEST_BANNER = {
  android: 'ca-app-pub-3940256099942544/6300978111',
  ios: 'ca-app-pub-3940256099942544/2934735716',
};

let initialized = false;
let bannerVisible = false;
let initPromise: Promise<boolean> | null = null;

export async function initializeAdMob(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (initialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const plugin = await loadPlugin();
    if (!plugin) {
      initPromise = null;
      return false;
    }
    try {
      await plugin.AdMob.initialize({ initializeForTesting: true });
      try {
        const tracking = await plugin.AdMob.trackingAuthorizationStatus();
        if (tracking.status === 'notDetermined') {
          await plugin.AdMob.requestTrackingAuthorization();
        }
      } catch {
        // Android / older iOS
      }
      try {
        let consentInfo = await plugin.AdMob.requestConsentInfo();
        if (!consentInfo.canRequestAds && consentInfo.isConsentFormAvailable) {
          consentInfo = await plugin.AdMob.showConsentForm();
        }
        if (consentInfo.status === plugin.AdmobConsentStatus.REQUIRED && consentInfo.isConsentFormAvailable) {
          consentInfo = await plugin.AdMob.showConsentForm();
        }
        if (!consentInfo.canRequestAds) {
          initialized = true;
          return false;
        }
      } catch {
        // UMP optional until configured in AdMob
      }
      initialized = true;
      return true;
    } catch (error) {
      console.warn('AdMob initialize skipped', error);
      initPromise = null;
      return false;
    }
  })();

  return initPromise;
}

export async function showAdMobBanner(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const canShow = await initializeAdMob();
  if (!canShow || bannerVisible) return;
  const plugin = await loadPlugin();
  if (!plugin) return;
  try {
    await plugin.AdMob.addListener(plugin.BannerAdPluginEvents.SizeChanged, (size) => {
      setBannerOffset(size?.height ?? 50);
    });
    await plugin.AdMob.showBanner({
      adId: Capacitor.getPlatform() === 'ios' ? TEST_BANNER.ios : TEST_BANNER.android,
      adSize: plugin.BannerAdSize.ADAPTIVE_BANNER || plugin.BannerAdSize.BANNER,
      position: plugin.BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: true,
    });
    bannerVisible = true;
    setBannerOffset(50);
  } catch (error) {
    console.warn('AdMob banner skipped', error);
  }
}

export async function hideAdMobBanner(): Promise<void> {
  setBannerOffset(0);
  if (!Capacitor.isNativePlatform() || (!bannerVisible && !initialized)) return;
  try {
    const plugin = await loadPlugin();
    await plugin?.AdMob.hideBanner();
  } catch {
    // not showing
  }
  bannerVisible = false;
}

export async function openAdMobPrivacyOptions(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const plugin = await loadPlugin();
    await plugin?.AdMob.showPrivacyOptionsForm();
  } catch {
    // form unavailable until UMP is set up
  }
}
