import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import en from '../locales/en.json';
import hi from '../locales/hi.json';

type Lang = 'en' | 'hi';
const translations: Record<Lang, any> = { en, hi };

interface LanguageContextType {
  language: Lang;
  setLanguage: (lang: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Lang>(
    () => (localStorage.getItem('kisanlens_lang') as Lang) || 'en'
  );

  const setLanguage = useCallback((lang: Lang) => {
    setLang(lang);
    localStorage.setItem('kisanlens_lang', lang);
  }, []);

  const t = useCallback(
    (key: string): string => {
      const keys = key.split('.');
      let value: any = translations[language];
      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) {
          // Fallback to English
          let fallback: any = translations.en;
          for (const fk of keys) fallback = fallback?.[fk];
          return fallback ?? key;
        }
      }
      return typeof value === 'string' ? value : key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
