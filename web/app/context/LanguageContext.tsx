"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { Language, TranslationDictionary, translations } from "../i18n/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: TranslationDictionary;
  tr: (es: string, en: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("es");
  const [mounted, setMounted] = useState(false);

  // Initialize language from localStorage on client mount
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("tfm_language") as Language | null;
      if (saved === "es" || saved === "en") {
        setLanguageState(saved);
        document.documentElement.lang = saved;
      } else {
        // Detect browser preference
        const browserLang = navigator.language.startsWith("es") ? "es" : "en";
        setLanguageState(browserLang);
        document.documentElement.lang = browserLang;
      }
    } catch {
      // Fallback to Spanish
      setLanguageState("es");
    }
  }, []);

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem("tfm_language", newLang);
      document.documentElement.lang = newLang;
    } catch (e) {
      console.error("Failed to save language preference:", e);
    }
  };

  const toggleLanguage = () => {
    const nextLang: Language = language === "es" ? "en" : "es";
    setLanguage(nextLang);
  };

  // Inline translation helper: tr("Español", "English")
  const tr = (esText: string, enText: string) => {
    return language === "en" ? enText : esText;
  };

  const t = useMemo(() => {
    return translations[language];
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
      tr,
    }),
    [language, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
