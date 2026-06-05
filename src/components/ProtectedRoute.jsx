import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!user)   return <Navigate to="/auth" replace />;
  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    // redirect to correct dashboard
    if (profile?.role === "caseworker") return <Navigate to="/caseworker" replace />;
    if (profile?.role === "admin")      return <Navigate to="/admin" replace />;
    return <Navigate to="/family" replace />;
  }
  return children;
}
