import { useState, useRef, useEffect } from "react";
import { auth } from "../firebase";
import { useLanguage } from "../hooks/useLanguage";

const ENABLED = import.meta.env.VITE_AI_CHATBOT_ENABLED === "true";

export default function Chatbot() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (!messages) {
        setMessages([{ role: "assistant", content: t("chatbot.welcome") }]);
      }
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 60);
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
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
      {/* Toggle button */}
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
          background: "#02C39A",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: open ? 18 : 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 18px rgba(0,0,0,0.25)",
          zIndex: 9999,
          transition: "transform 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        {open ? "✕" : "💬"}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 88,
            right: 24,
            width: 340,
            height: 480,           /* fixed height so flex children can scroll */
            background: "#ffffff", /* explicit white — no CSS var dependency */
            borderRadius: 16,
            boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9998,
            overflow: "hidden",
            border: "1px solid rgba(0,0,0,0.1)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "13px 16px",
              background: "#0D1B2A",
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

          {/* Messages — fixed height, scrolls */}
          <div
            style={{
              flex: 1,
              minHeight: 0,        /* critical: lets flex child scroll instead of overflow */
              overflowY: "auto",
              padding: "14px 14px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background: "#ffffff",
            }}
          >
            {(messages || []).map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "82%",
                    padding: "9px 13px",
                    borderRadius: msg.role === "user"
                      ? "14px 14px 4px 14px"
                      : "14px 14px 14px 4px",
                    background: msg.role === "user" ? "#02C39A" : "#f4f9f8",
                    color: msg.role === "user" ? "#ffffff" : "#1a2f3a",
                    fontSize: 13,
                    lineHeight: 1.6,
                    border: msg.role === "user" ? "none" : "1px solid rgba(0,0,0,0.08)",
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
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
                    padding: "9px 13px",
                    background: "#f4f9f8",
                    borderRadius: "14px 14px 14px 4px",
                    fontSize: 13,
                    color: "#5a7a88",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  {t("chatbot.typing")}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid rgba(0,0,0,0.08)",
              display: "flex",
              gap: 8,
              flexShrink: 0,
              background: "#ffffff",
            }}
          >
            <input
              ref={inputRef}
              style={{
                flex: 1,
                height: 38,
                padding: "0 12px",
                fontSize: 13,
                border: "1px solid rgba(0,0,0,0.15)",
                borderRadius: 8,
                outline: "none",
                fontFamily: "inherit",
                background: "#ffffff",
                color: "#1a2f3a",
              }}
              placeholder={t("chatbot.placeholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                flexShrink: 0,
                height: 38,
                padding: "0 14px",
                fontSize: 16,
                background: input.trim() && !loading ? "#02C39A" : "#ccc",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: input.trim() && !loading ? "pointer" : "default",
                transition: "background 0.15s",
              }}
            >
              →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
