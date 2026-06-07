import { useState, useEffect } from "react";

export default function Splash({ onEnter }) {
  const [show, setShow] = useState(true);

  function handleEnter() {
    setShow(false);
    setTimeout(onEnter, 850);
  }

  return (
    <div className={`splash${show ? "" : " exit"}`}>
      <div className="splash-deco splash-deco-1" />
      <div className="splash-deco splash-deco-2" />
      <p className="splash-eyebrow">Reena × York University · C4 Design Lab</p>
      <h1 className="splash-title">
        <span className="splash-word">Independence</span>{" "}
        <span className="splash-word">Pathway</span>{" "}
        <span className="splash-word">Platform</span>
      </h1>
      <p className="splash-sub">
        A proactive roadmap for every family navigating transition
      </p>
      <div className="splash-bar">
        <div className="splash-bar-fill" />
      </div>
      <button className="splash-btn" onClick={handleEnter}>
        Enter Platform →
      </button>
    </div>
  );
}
