import { createContext, useContext, useEffect, useState } from "react";
import { translations } from "../i18n/translations";

const LanguageContext = createContext(null);
const STORAGE_KEY = "ipp_lang";

export const LANGUAGES = [
  { code: "en", label: "English",  short: "EN"  },
  { code: "fr", label: "Français", short: "FR"  },
  { code: "zh", label: "中文",      short: "中文" },
  { code: "he", label: "עברית",    short: "עב"  },
  { code: "hi", label: "हिन्दी",   short: "हि"  },
];

function lookup(dict, key) {
  return key.split(".").reduce((node, part) => node?.[part], dict);
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(STORAGE_KEY) || "en");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  }, [lang]);

  // Looks up a dotted key (e.g. "auth.welcomeBack") in the active language,
  // falling back to English so a missing translation never shows a raw key.
  // `vars` substitutes {{placeholders}} inside the string with dynamic values.
  function t(key, vars) {
    let str = lookup(translations[lang], key);
    if (str === undefined) str = lookup(translations.en, key);
    if (str === undefined) return key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        str = str.replaceAll(`{{${name}}}`, value);
      }
    }
    return str;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
