import SkeletonPage from "../../components/Skeleton";
import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null); // uid currently being deleted
  const [error, setError]     = useState("");

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, "users"));
      setUsers(snap.docs.map((d) => d.data()).sort((a, b) => a.role.localeCompare(b.role)));
      setLoading(false);
    }
    load();
  }, []);

  async function handleDelete(u) {
    if (u.uid === currentUser?.uid) return;
    const confirmed = window.confirm(t("usersPage.deleteConfirm", { name: u.displayName || u.email }));
    if (!confirmed) return;

    setError("");
    setDeleting(u.uid);
    try {
      // Delete all data associated with this user
      await Promise.all([
        deleteDoc(doc(db, "users",   u.uid)),
        deleteDoc(doc(db, "intakes", u.uid)),
        deleteDoc(doc(db, "matches", u.uid)),
      ]);
      setUsers((prev) => prev.filter((x) => x.uid !== u.uid));
    } catch (err) {
      setError(t("usersPage.deleteError", { message: err.message }));
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <SkeletonPage />;

  const roleColor = { family: "tag-teal", caseworker: "tag-warn", admin: "tag-danger" };

  return (
    <div className="page-wide">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--navy)" }}>{t("usersPage.title")}</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
          {t("usersPage.subtitle", { count: users.length })}
        </p>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("usersPage.colName")}</th>
              <th>{t("usersPage.colEmail")}</th>
              <th>{t("usersPage.colRole")}</th>
              <th>{t("usersPage.colRegistered")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf    = u.uid === currentUser?.uid;
              const isDeleting = deleting === u.uid;
              return (
                <tr key={u.uid} style={{ opacity: isDeleting ? 0.5 : 1, transition: "opacity 0.2s" }}>
                  <td style={{ fontWeight: 500 }}>
                    {u.displayName}
                    {isSelf && (
                      <span style={{ fontSize: 10, marginLeft: 6, color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
                        {t("usersPage.you")}
                      </span>
                    )}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{u.email}</td>
                  <td>
                    <span className={`tag ${roleColor[u.role] || "tag-navy"}`}
                      style={{ fontSize: 11, textTransform: "capitalize" }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-CA") : t("common.dash")}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(u)}
                      disabled={isSelf || isDeleting}
                      title={isSelf ? t("usersPage.cannotDeleteSelf") : t("usersPage.deleteUser")}
                      style={{ opacity: isSelf ? 0.35 : 1 }}
                    >
                      {isDeleting ? t("usersPage.deleting") : t("usersPage.delete")}
                    </button>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>
                  {t("usersPage.noneFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
        {t("usersPage.footerNote")}
      </p>
    </div>
  );
}
