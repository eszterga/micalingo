import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { CONSENT_CHANGED_EVENT, readConsent } from '../lib/consent';
import { disableAdSense, enableAdSense } from '../lib/adsense';
import { hideAdMobBanner, showAdMobBanner } from '../lib/admob';
import { isNativeApp, shouldShowNativeAds, shouldShowWebAds } from '../lib/adsPlacement';

function syncAds(pathname: string, search: string, adminMode: boolean, isAdmin: boolean) {
  const advertisingConsent = readConsent()?.advertising === true;
  const adminPromptShown = sessionStorage.getItem('adminPromptShown') === 'true';

  if (isNativeApp()) {
    disableAdSense();
    const show = shouldShowNativeAds(pathname, search, { adminMode, isAdmin, adminPromptShown });
    if (show) {
      void showAdMobBanner();
    } else {
      void hideAdMobBanner();
    }
    return;
  }

  void hideAdMobBanner();
  if (shouldShowWebAds(pathname, search, advertisingConsent)) {
    enableAdSense();
  } else {
    disableAdSense();
  }
}

export default function AdController() {
  const { pathname, search } = useLocation();
  const { adminMode, isAdmin } = useAuth();

  useEffect(() => {
    syncAds(pathname, search, adminMode, isAdmin);
    const onConsent = () => syncAds(pathname, search, adminMode, isAdmin);
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onConsent);
  }, [pathname, search, adminMode, isAdmin]);

  return null;
}
