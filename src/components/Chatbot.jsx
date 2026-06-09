import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../hooks/useLanguage";

const ENABLED = import.meta.env.VITE_AI_CHATBOT_ENABLED === "true";

export default function Chatbot() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(null); // null until first open
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (!messages) {
        setMessages([{ role: "assistant", content: t("chatbot.welcome") }]);
      }
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!ENABLED) return null;

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...(messages || []), { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const apiMessages = next
        .filter((m, i) => !(i === 0 && m.role === "assistant"))
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.text || t("chatbot.error") },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("chatbot.error") },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("chatbot.toggle")}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: open ? 20 : 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 18px rgba(0,0,0,0.2)",
          zIndex: 1000,
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 88,
            right: 24,
            width: 340,
            maxHeight: 500,
            background: "var(--card)",
            borderRadius: 16,
            boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            zIndex: 999,
            overflow: "hidden",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              padding: "13px 16px",
              background: "var(--navy)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 14 }}>🤖 {t("chatbot.title")}</span>
            <span style={{ fontSize: 11, opacity: 0.65 }}>{t("chatbot.subtitle")}</span>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {(messages || []).map((msg, i) => (
              <div
                key={i}
                style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}
              >
                <div
                  style={{
                    maxWidth: "82%",
                    padding: "8px 12px",
                    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: msg.role === "user" ? "var(--accent)" : "var(--bg)",
                    color: msg.role === "user" ? "#fff" : "var(--text)",
                    fontSize: 13,
                    lineHeight: 1.55,
                    border: msg.role === "user" ? "none" : "1px solid var(--border)",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: "8px 12px",
                    background: "var(--bg)",
                    borderRadius: "14px 14px 14px 4px",
                    fontSize: 13,
                    color: "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {t("chatbot.typing")}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <input
              className="field"
              style={{ flex: 1, height: 38, padding: "0 12px", fontSize: 13, margin: 0 }}
              placeholder={t("chatbot.placeholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              autoFocus
            />
            <button
              className="btn btn-primary"
              onClick={send}
              disabled={loading || !input.trim()}
              style={{ flexShrink: 0, height: 38, padding: "0 14px", fontSize: 16 }}
            >
              →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
