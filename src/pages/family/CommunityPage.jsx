import { useState, useEffect, useRef } from "react";
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, limit } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";

export default function CommunityPage() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const q = query(
      collection(db, "communityMessages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, "communityMessages"), {
        text: trimmed,
        uid: user.uid,
        displayName: profile?.displayName || user.email?.split("@")[0] || "Family",
        createdAt: serverTimestamp(),
      });
      setText("");
    } finally {
      setSending(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)", paddingBottom: 0 }}>
      <div style={{ marginBottom: 20, flexShrink: 0 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>{t("community.title")}</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>{t("community.subtitle")}</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 8 }}>
        {messages.length === 0 && (
          <div className="empty-state">
            <p>{t("community.empty")}</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.uid === user.uid;
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
              {!isMe && (
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3, marginLeft: 6 }}>
                  {msg.displayName}
                </span>
              )}
              <div
                style={{
                  maxWidth: "72%",
                  padding: "10px 14px",
                  borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isMe ? "var(--accent)" : "var(--card)",
                  color: isMe ? "#fff" : "var(--text)",
                  fontSize: 14,
                  lineHeight: 1.55,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                  border: isMe ? "none" : "1px solid var(--border)",
                  wordBreak: "break-word",
                }}
              >
                {msg.text}
              </div>
              {msg.createdAt && (
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    marginTop: 3,
                    [isMe ? "marginRight" : "marginLeft"]: 6,
                  }}
                >
                  {msg.createdAt.toDate?.()?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 10, paddingTop: 12, borderTop: "1px solid var(--border)", flexShrink: 0, paddingBottom: 16 }}>
        <textarea
          className="field"
          style={{ flex: 1, resize: "none", minHeight: 44, maxHeight: 120, lineHeight: 1.5, padding: "10px 14px", margin: 0 }}
          placeholder={t("community.inputPlaceholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
        />
        <button
          className="btn btn-primary"
          onClick={send}
          disabled={sending || !text.trim()}
          style={{ flexShrink: 0, alignSelf: "flex-end", height: 44 }}
        >
          {sending ? "…" : t("community.send")}
        </button>
      </div>
    </div>
  );
}
