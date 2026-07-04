"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  detectBrowserLocale,
  getQuizCopy,
  LOCALE_HTML_LANG,
  readStoredLocale,
  writeStoredLocale,
  type AppLocale,
  type QuizCopy,
} from "@/lib/i18n";

interface QuizLocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  copy: QuizCopy;
}

const QuizLocaleContext = createContext<QuizLocaleContextValue | null>(null);

function initialLocale(): AppLocale {
  return readStoredLocale() ?? detectBrowserLocale();
}

export function QuizLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    writeStoredLocale(next);
  }, []);

  const copy = useMemo(() => getQuizCopy(locale), [locale]);

  useEffect(() => {
    document.documentElement.lang = LOCALE_HTML_LANG[locale];
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, copy }),
    [locale, setLocale, copy],
  );

  return (
    <QuizLocaleContext.Provider value={value}>{children}</QuizLocaleContext.Provider>
  );
}

export function useQuizLocale(): QuizLocaleContextValue {
  const ctx = useContext(QuizLocaleContext);
  if (!ctx) {
    throw new Error("useQuizLocale must be used within QuizLocaleProvider");
  }
  return ctx;
}
