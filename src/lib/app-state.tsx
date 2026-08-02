import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "bn";

type AppState = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (en: string, bn: string) => string;
  dark: boolean;
  setDark: (dark: boolean) => void;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [dark, setDarkState] = useState(false);

  useEffect(() => {
    const storedLang = window.localStorage.getItem("wafi.lang");
    if (storedLang === "bn" || storedLang === "en") setLangState(storedLang);
    setDarkState(window.localStorage.getItem("wafi.dark") === "1");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem("wafi.lang", next);
  }, []);

  const setDark = useCallback((next: boolean) => {
    setDarkState(next);
    window.localStorage.setItem("wafi.dark", next ? "1" : "0");
  }, []);

  const value = useMemo<AppState>(
    () => ({
      lang,
      setLang,
      toggleLang: () => setLang(lang === "en" ? "bn" : "en"),
      t: (en, bn) => (lang === "bn" ? bn : en),
      dark,
      setDark,
    }),
    [lang, dark, setLang, setDark],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}