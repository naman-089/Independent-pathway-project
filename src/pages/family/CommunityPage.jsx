import { useState, useEffect, useRef } from "react";
import {
  collection, addDoc, onSnapshot, orderBy,
  query, serverTimestamp, limit,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";

function getConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

export default function CommunityPage() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  // activeChannel: "community" | uid-of-DM-partner
  const [activeChannel, setActiveChannel]   = useState("community");
  const [messages, setMessages]             = useState([]);
  const [communityUsers, setCommunityUsers] = useState([]);
  const [text, setText]                     = useState("");
  const [sending, setSending]               = useState(false);
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const messagesRef = useRef(null);

  // Derive the Firestore collection ref for the active channel
  function colRef() {
    if (activeChannel === "community") {
      return collection(db, "communityMessages");
    }
    const convId = getConversationId(user.uid, activeChannel);
    return collection(db, "dms", convId, "messages");
  }

  // Subscribe to messages in the active channel
  useEffect(() => {
    const q = query(colRef(), orderBy("createdAt", "asc"), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [activeChannel]);

  // Track unique users from community messages for the DM sidebar list
  useEffect(() => {
    const q = query(
      collection(db, "communityMessages"),
      orderBy("createdAt", "desc"),
      limit(60)
    );
    const unsub = onSnapshot(q, (snap) => {
      const seen = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.uid && data.uid !== user.uid) {
          seen[data.uid] = data.displayName || "Family";
        }
      });
      setCommunityUsers(Object.entries(seen).map(([uid, displayName]) => ({ uid, displayName })));
    });
    return unsub;
  }, [user.uid]);

  // Auto-scroll to latest message within the messages container only
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await addDoc(colRef(), {
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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function selectChannel(ch) {
    setActiveChannel(ch);
    setSidebarOpen(false);
  }

  const activeName = activeChannel === "community"
    ? t("community.communityChannel")
    : communityUsers.find((u) => u.uid === activeChannel)?.displayName || "Chat";

  const activeIsChannel = activeChannel === "community";

  return (
    <div className="community-layout">
      {/* ── Sidebar ── */}
      <div className={`community-sidebar${sidebarOpen ? " mobile-open" : ""}`}>
        <div className="community-sidebar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: "0.9375rem", color: "var(--navy)", fontFamily: "'Nunito', sans-serif" }}>
            {t("community.title")}
          </span>
          <button
            className="pencil-btn"
            onClick={() => setSidebarOpen(false)}
            style={{ display: "none" }}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <div className="community-sidebar-section">
          <div className="community-sidebar-label">{t("community.channels")}</div>
          <button
            className={`community-channel-btn${activeChannel === "community" ? " active" : ""}`}
            onClick={() => selectChannel("community")}
          >
            <div className="channel-icon">#</div>
            <div>
              <div className="channel-name">{t("community.communityChannel")}</div>
              <div className="channel-sub">{t("community.subtitle")}</div>
            </div>
          </button>
        </div>

        {communityUsers.length > 0 && (
          <div className="community-sidebar-section">
            <div className="community-sidebar-label">{t("community.directMessages")}</div>
            {communityUsers.map((u) => (
              <button
                key={u.uid}
                className={`community-channel-btn${activeChannel === u.uid ? " active" : ""}`}
                onClick={() => selectChannel(u.uid)}
              >
                <div className="dm-avatar">{u.displayName?.charAt(0).toUpperCase() || "?"}</div>
                <div>
                  <div className="channel-name">{u.displayName}</div>
                  <div className="channel-sub">Direct message</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Main chat area ── */}
      <div className="community-main">
        {/* Header */}
        <div className="community-chat-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="pencil-btn"
              style={{ display: "none" }}
              onClick={() => setSidebarOpen(true)}
              aria-label="Open conversations"
            >
              ☰
            </button>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--navy)", fontFamily: "'Nunito', sans-serif" }}>
                {activeIsChannel ? `# ${activeName}` : `@ ${activeName}`}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {activeIsChannel ? t("community.subtitle") : "Private message"}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="community-messages" ref={messagesRef}>
          {messages.length === 0 && (
            <div className="empty-state">
              <p style={{ fontSize: "0.9375rem" }}>{t("community.empty")}</p>
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.uid === user.uid;
            return (
              <div key={msg.id} className={`msg-row ${isMe ? "msg-me" : "msg-other"}`}>
                {!isMe && (
                  <div className="msg-avatar">
                    {msg.displayName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="msg-content">
                  {!isMe && (
                    <div className="msg-sender">{msg.displayName}</div>
                  )}
                  <div className={`msg-bubble ${isMe ? "bubble-me" : "bubble-other"}`}>
                    {msg.text}
                  </div>
                  {msg.createdAt && (
                    <div className={`msg-time ${isMe ? "time-me" : "time-other"}`}>
                      {msg.createdAt.toDate?.()?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="community-input-row">
          <textarea
            className="community-input"
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
    </div>
  );
}
