import SkeletonPage from "../../components/Skeleton";
import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
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
    const confirmed = window.confirm(
      `Delete "${u.displayName || u.email}"?\n\nThis removes their profile, intake, and match data. They will be signed out automatically.`
    );
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
      setError("Failed to delete user: " + err.message);
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <SkeletonPage />;

  const roleColor = { family: "tag-teal", caseworker: "tag-warn", admin: "tag-danger" };

  return (
    <div className="page-wide">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--navy)" }}>Registered Users</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
          {users.length} total users
        </p>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Registered</th>
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
                        you
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
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-CA") : "—"}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(u)}
                      disabled={isSelf || isDeleting}
                      title={isSelf ? "You cannot delete your own account" : "Delete user"}
                      style={{ opacity: isSelf ? 0.35 : 1 }}
                    >
                      {isDeleting ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
        Deleting a user removes their profile, intake, and match data from the platform.
        Their sign-in account is revoked automatically on their next page load.
      </p>
    </div>
  );
}
