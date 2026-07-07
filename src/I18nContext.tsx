import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { en } from './en';
import { de } from './de';
import { hu } from './hu';

type Language = 'en' | 'de' | 'hu';

const translations: Record<string, any> = { en, de, hu };

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof en, replacements?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const storedLang = localStorage.getItem('micalingo_language');
    return (storedLang && ['en', 'de', 'hu'].includes(storedLang)) ? storedLang as Language : 'en';
  });

  const setLanguage = (lang: Language) => {
    localStorage.setItem('micalingo_language', lang);
    setLanguageState(lang);
  };

  const t = useCallback((key: keyof typeof en, replacements?: Record<string, string | number>): string => {
    let translation = translations[language]?.[key] || translations['en'][key] || key;
    if (replacements) {
      Object.keys(replacements).forEach(rKey => {
        translation = translation.replace(`{${rKey}}`, String(replacements[rKey]));
      });
    }
    return translation;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};