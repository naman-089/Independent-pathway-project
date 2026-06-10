import { LANGUAGES, useLanguage } from "../hooks/useLanguage";

export default function LanguageSwitcher({ onLight = false }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`lang-select-wrap${onLight ? " on-light" : ""}`}>
      <select
        className="lang-select"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label="Choose language"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
      <span className="lang-select-arrow">▾</span>
    </div>
  );
}
