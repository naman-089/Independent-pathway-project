import { createContext, useContext, useEffect, useState } from "react";
import { translations } from "../i18n/translations";

const LanguageContext = createContext(null);
const STORAGE_KEY = "ipp_lang";
const ZOOM_KEY    = "ipp_zoom";

export const LANGUAGES = [
  { code: "en", label: "English",   short: "EN"  },
  { code: "fr", label: "Français",  short: "FR"  },
  { code: "zh", label: "中文",       short: "中文" },
  { code: "he", label: "עברית",     short: "עב"  },
  { code: "hi", label: "हिन्दी",    short: "हि"  },
  { code: "ru", label: "Русский",   short: "РУ"  },
];

function lookup(dict, key) {
  return key.split(".").reduce((node, part) => node?.[part], dict);
}

export function LanguageProvider({ children }) {
  const [lang, setLang]   = useState(() => localStorage.getItem(STORAGE_KEY) || "en");
  const [zoom, setZoom]   = useState(() => parseInt(localStorage.getItem(ZOOM_KEY) || "1", 10));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  }, [lang]);

  useEffect(() => {
    localStorage.setItem(ZOOM_KEY, zoom);
    document.documentElement.dataset.zoom = zoom;
  }, [zoom]);

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
    <LanguageContext.Provider value={{ lang, setLang, t, zoom, setZoom }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
