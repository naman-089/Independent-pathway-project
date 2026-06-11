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

    // Load Noto script fonts on demand — only when the user actually picks that language
    const NOTO_FONTS = {
      he: "Noto+Sans+Hebrew:wght@400;700",
      hi: "Noto+Sans+Devanagari:wght@400;700",
      zh: "Noto+Sans+SC:wght@400;700",
    };
    if (NOTO_FONTS[lang]) {
      const id = `noto-font-${lang}`;
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${NOTO_FONTS[lang]}&display=swap`;
        document.head.appendChild(link);
      }
    }
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
