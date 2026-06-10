import { useEffect, useState } from "react";
import { IconVolume, IconPlayerStop } from "@tabler/icons-react";
import { useLanguage } from "../hooks/useLanguage";

const LANG_MAP = {
  en: "en-US", fr: "fr-FR", zh: "zh-CN",
  he: "he-IL", hi: "hi-IN", ru: "ru-RU",
};

export default function TextToSpeech() {
  const { lang } = useLanguage();
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  useEffect(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, [lang]);

  if (!window.speechSynthesis) return null;

  function getPageText() {
    const main = document.querySelector(".page, .page-wide");
    if (!main) return document.body.innerText || "";
    const nodes = main.querySelectorAll(
      "h1,h2,h3,h4,p,label,.pcard-value,.pcard-note,.m-info h4,.m-info p"
    );
    return Array.from(nodes)
      .map((n) => n.innerText?.trim())
      .filter(Boolean)
      .join(". ");
  }

  function speak() {
    const synth = window.speechSynthesis;
    synth.cancel();
    const text = getPageText();
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = LANG_MAP[lang] || "en-US";
    utter.rate = 0.9;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    synth.speak(utter);
    setSpeaking(true);
  }

  function stop() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  return (
    <button
      className={`tts-btn${speaking ? " speaking" : ""}`}
      onClick={speaking ? stop : speak}
      title={speaking ? "Stop reading" : "Read page aloud"}
      aria-label={speaking ? "Stop reading aloud" : "Read page aloud"}
    >
      {speaking ? <IconPlayerStop size={20} /> : <IconVolume size={20} />}
    </button>
  );
}
