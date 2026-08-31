import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useI18n } from '../I18nContext';
import {
  buildJsonLd,
  canonicalHref,
  hreflangAlternates,
  ogLocale,
  resolveSeo,
  type SeoLang,
} from '../lib/seo';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertJsonLd(data: object) {
  let el = document.getElementById('micalingo-jsonld') as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = 'micalingo-jsonld';
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function upsertHreflang(alternates: { lang: string; href: string }[]) {
  document.head.querySelectorAll('link[data-seo-hreflang]').forEach((node) => node.remove());
  for (const alt of alternates) {
    const link = document.createElement('link');
    link.setAttribute('rel', 'alternate');
    link.setAttribute('hreflang', alt.lang);
    link.setAttribute('href', alt.href);
    link.setAttribute('data-seo-hreflang', '1');
    document.head.appendChild(link);
  }
}

/**
 * Keeps title, description, robots, canonical, hreflang, and JSON-LD in sync
 * with the current route and UI language.
 */
export default function SeoManager() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { language } = useI18n();
  const lang = language as SeoLang;

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    const params = new URLSearchParams(search);
    const current = params.get('lang');
    const desired = lang === 'en' ? null : lang;
    if (current === desired || (!current && !desired)) return;
    if (desired) params.set('lang', desired);
    else params.delete('lang');
    const next = params.toString();
    navigate({ pathname, search: next ? `?${next}` : '' }, { replace: true });
  }, [lang, pathname, search, navigate]);

  useEffect(() => {
    const seo = resolveSeo(pathname, lang);
    const canonical = canonicalHref(seo.canonicalPath, lang);
    const robots = seo.noindex ? 'noindex, follow' : 'index, follow';

    document.title = seo.title;
    document.documentElement.lang = lang;

    upsertMeta('name', 'description', seo.description);
    document.head.querySelector('meta[name="keywords"]')?.remove();
    upsertMeta('name', 'robots', robots);
    upsertMeta('name', 'googlebot', robots);
    upsertMeta('property', 'og:title', seo.title);
    upsertMeta('property', 'og:description', seo.description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'MicaLingo');
    upsertMeta('property', 'og:image', 'https://micalingo.com/logo.png');
    upsertMeta('property', 'og:locale', ogLocale(lang));
    upsertMeta('name', 'twitter:card', 'summary');
    upsertMeta('name', 'twitter:title', seo.title);
    upsertMeta('name', 'twitter:description', seo.description);
    upsertMeta('name', 'twitter:image', 'https://micalingo.com/logo.png');

    const otherLocales = (['en_US', 'de_DE', 'hu_HU'] as const).filter((loc) => loc !== ogLocale(lang));
    document.head.querySelectorAll('meta[property="og:locale:alternate"]').forEach((node) => node.remove());
    for (const loc of otherLocales) {
      const el = document.createElement('meta');
      el.setAttribute('property', 'og:locale:alternate');
      el.setAttribute('content', loc);
      document.head.appendChild(el);
    }

    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);

    upsertHreflang(hreflangAlternates(seo.canonicalPath));
    upsertJsonLd(buildJsonLd(seo, lang, canonical));
  }, [pathname, lang]);

  return null;
}
