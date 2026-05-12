import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "hi" | "kn";
export const LANG_ORDER: Lang[] = ["en", "hi", "kn"];
export const LANG_LABEL: Record<Lang, string> = { en: "EN", hi: "हिं", kn: "ಕನ್ನಡ" };
const KEY = "pds.lang";

type Dict = Record<string, Record<Lang, string>>;
const DICT: Dict = {
  signOut: { en: "Sign Out", hi: "साइन आउट", kn: "ಸೈನ್ ಔಟ್" },
  back: { en: "Back", hi: "वापस", kn: "ಹಿಂತಿರುಗಿ" },
  pds: { en: "PDS", hi: "पीडीएस", kn: "ಪಿಡಿಎಸ್" },
  adminPanel: { en: "Admin Panel", hi: "व्यवस्थापक पैनल", kn: "ನಿರ್ವಾಹಕ ಫಲಕ" },
  distributorPanel: { en: "Distributor Panel", hi: "वितरक पैनल", kn: "ವಿತರಕ ಫಲಕ" },
  customerPanel: { en: "Customer Panel", hi: "ग्राहक पैनल", kn: "ಗ್ರಾಹಕ ಫಲಕ" },
  publicComplaint: { en: "Public Complaint", hi: "सार्वजनिक शिकायत", kn: "ಸಾರ್ವಜನಿಕ ದೂರು" },
  language: { en: "Language", hi: "भाषा", kn: "ಭಾಷೆ" },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; cycle: () => void; t: (key: keyof typeof DICT) => string };
const LangCtx = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as Lang | null;
      if (saved && LANG_ORDER.includes(saved)) setLangState(saved);
    } catch {}
  }, []);
  function setLang(l: Lang) {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch {}
  }
  function cycle() {
    const i = LANG_ORDER.indexOf(lang);
    setLang(LANG_ORDER[(i + 1) % LANG_ORDER.length]);
  }
  function t(key: keyof typeof DICT) { return DICT[key]?.[lang] ?? DICT[key]?.en ?? String(key); }
  return <LangCtx.Provider value={{ lang, setLang, cycle, t }}>{children}</LangCtx.Provider>;
}

export function useLang(): Ctx {
  const ctx = useContext(LangCtx);
  if (!ctx) return { lang: "en", setLang: () => {}, cycle: () => {}, t: (k: any) => DICT[k]?.en ?? String(k) };
  return ctx;
}

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, cycle } = useLang();
  return (
    <button
      onClick={cycle}
      title={`Language: ${LANG_LABEL[lang]}`}
      aria-label="Change language"
      className={`rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-soft transition-colors hover:bg-accent ${className}`}
    >
      {LANG_ORDER.map((l, i) => (
        <span key={l} className={l === lang ? "text-primary" : "text-muted-foreground"}>
          {LANG_LABEL[l]}{i < LANG_ORDER.length - 1 ? " | " : ""}
        </span>
      ))}
    </button>
  );
}
