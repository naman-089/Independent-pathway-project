import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

export default function UsersPage() {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, "users"));
      setUsers(snap.docs.map((d) => d.data()).sort((a, b) => a.role.localeCompare(b.role)));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const roleColor = { family: "tag-teal", caseworker: "tag-warn", admin: "tag-danger" };

  return (
    <div className="page-wide">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--navy)" }}>Registered Users</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>{users.length} total users</p>
      </div>
      <div className="card">
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Registered</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid}>
                <td style={{ fontWeight: 500 }}>{u.displayName}</td>
                <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{u.email}</td>
                <td><span className={`tag ${roleColor[u.role] || "tag-navy"}`} style={{ fontSize: 11, textTransform: "capitalize" }}>{u.role}</span></td>
                <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-CA") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
