import { useState, useEffect, useRef } from "react";
import {
  collection, addDoc, onSnapshot, orderBy,
  query, serverTimestamp, limit, getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { checkMessage } from "../../utils/moderate";

function getConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

export default function CaseworkerCommunityPage() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  const [families, setFamilies]       = useState([]);
  const [activeFamily, setActiveFamily] = useState(null);
  const [messages, setMessages]       = useState([]);
  const [text, setText]               = useState("");
  const [sending, setSending]         = useState(false);
  const [blocked, setBlocked]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const messagesRef                   = useRef(null);

  // Load all families from intakes
  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, "intakes"));
      const list = snap.docs
        .map((d) => ({
          uid:            d.id,
          individualName: d.data().individualName || "",
          caregiverName:  d.data().caregiverName  || "",
        }))
        .filter((f) => f.individualName || f.caregiverName);
      setFamilies(list);
      if (list.length > 0) setActiveFamily(list[0]);
      setLoading(false);
    }
    load();
  }, []);

  // Subscribe to DM thread with the selected family
  useEffect(() => {
    if (!activeFamily) return;
    const convId = getConversationId(user.uid, activeFamily.uid);
    const q = query(
      collection(db, "dms", convId, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [activeFamily, user.uid]);

  // Scroll to bottom on new messages
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || sending || !activeFamily) return;
    setSending(true);
    setBlocked(false);
    try {
      const flagged = await checkMessage(trimmed);
      if (flagged) { setBlocked(true); return; }
      const convId = getConversationId(user.uid, activeFamily.uid);
      await addDoc(collection(db, "dms", convId, "messages"), {
        text:        trimmed,
        uid:         user.uid,
        displayName: profile?.displayName || "Caseworker",
        createdAt:   serverTimestamp(),
      });
      setText("");
    } finally {
      setSending(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const displayName = activeFamily
    ? (activeFamily.individualName || activeFamily.caregiverName)
    : null;

  return (
    <div className="community-layout">
      {/* ── Sidebar ── */}
      <div className="community-sidebar">
        <div className="community-sidebar-header">
          <span style={{ fontWeight: 800, fontSize: "0.9375rem", color: "var(--navy)", fontFamily: "'Nunito', sans-serif" }}>
            Families
          </span>
        </div>

        <div className="community-sidebar-section">
          <div className="community-sidebar-label">Direct Messages</div>

          {loading && (
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", padding: "0 12px" }}>Loading…</p>
          )}

          {!loading && families.length === 0 && (
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", padding: "0 12px" }}>No families yet.</p>
          )}

          {families.map((f) => {
            const label = f.individualName || f.caregiverName;
            const sub   = f.individualName && f.caregiverName ? `Caregiver: ${f.caregiverName}` : "Family";
            return (
              <button
                key={f.uid}
                className={`community-channel-btn${activeFamily?.uid === f.uid ? " active" : ""}`}
                onClick={() => setActiveFamily(f)}
              >
                <div className="dm-avatar">{label.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="channel-name">{label}</div>
                  <div className="channel-sub">{sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main chat ── */}
      <div className="community-main">
        <div className="community-chat-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--navy)", fontFamily: "'Nunito', sans-serif" }}>
              {displayName ? `@ ${displayName}` : "Select a family"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {activeFamily?.individualName && activeFamily?.caregiverName
                ? `Caregiver: ${activeFamily.caregiverName}`
                : "Direct message"}
            </div>
          </div>
        </div>

        {/* Moderation notice */}
        <div className="community-moderation-notice">
          🤖 Messages are reviewed by AI to keep this space safe and respectful.
        </div>

        <div className="community-messages" ref={messagesRef}>
          {!activeFamily && (
            <div className="empty-state">
              <p>Select a family from the sidebar to start a conversation.</p>
            </div>
          )}
          {activeFamily && messages.length === 0 && (
            <div className="empty-state">
              <p>No messages yet. Send a message to get started.</p>
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
                  {!isMe && <div className="msg-sender">{msg.displayName}</div>}
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

        {blocked && (
          <div className="community-blocked-msg">
            ⚠️ Your message was flagged and not sent. Please keep conversations respectful.
          </div>
        )}

        <div className="community-input-row">
          <textarea
            className="community-input"
            placeholder={activeFamily ? `Message ${displayName}…` : "Select a family first"}
            value={text}
            onChange={(e) => { setText(e.target.value); setBlocked(false); }}
            onKeyDown={handleKey}
            rows={1}
            disabled={!activeFamily}
          />
          <button
            className="btn btn-primary"
            onClick={send}
            disabled={sending || !text.trim() || !activeFamily}
            style={{ flexShrink: 0, alignSelf: "flex-end", height: 44 }}
          >
            {sending ? "…" : t("community.send")}
          </button>
        </div>
      </div>
    </div>
  );
}
