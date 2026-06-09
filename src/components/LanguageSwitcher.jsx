import { LANGUAGES, useLanguage } from "../hooks/useLanguage";

export default function LanguageSwitcher({ onLight = false }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`lang-switch${onLight ? " on-light" : ""}`} role="group" aria-label="Choose language / Choisir la langue">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          className={`lang-switch-btn${lang === l.code ? " active" : ""}`}
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          title={l.label}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
