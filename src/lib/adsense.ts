import { ADSENSE_PUBLISHER_ID } from './adsPlacement';

const SCRIPT_ID = 'micalingo-adsense';
const SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`;

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>> & {
      pauseAdRequests?: number;
      loaded?: boolean;
    };
  }
}

function adsQueue() {
  window.adsbygoogle = window.adsbygoogle || [];
  return window.adsbygoogle;
}

function pauseAutoAds(paused: boolean) {
  const queue = adsQueue();
  queue.pauseAdRequests = paused ? 1 : 0;
}

function stripInjectedAds() {
  const selectors = [
    'ins.adsbygoogle',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="googleads"]',
    'iframe[id^="aswift"]',
    'div[id^="google_ads_"]',
    '#google_vignette',
    'div[id="google_vignette"]',
  ];
  document.querySelectorAll(selectors.join(',')).forEach((el) => {
    el.remove();
  });
}

function ensureScript() {
  if (document.getElementById(SCRIPT_ID)) return;
  if (document.querySelector(`script[src*="adsbygoogle.js"][src*="${ADSENSE_PUBLISHER_ID}"]`)) return;
  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = SCRIPT_SRC;
  document.head.appendChild(script);
}

export function enableAdSense() {
  pauseAutoAds(false);
  ensureScript();
}

export function disableAdSense() {
  pauseAutoAds(true);
  stripInjectedAds();
}
