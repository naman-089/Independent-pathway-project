import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import SkeletonPage from "./Skeleton";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <SkeletonPage />;
  if (!user)   return <Navigate to="/auth" replace />;

  // User is authenticated but profile doc was deleted — show skeleton while
  // useAuth's onAuthStateChanged auto-signs them out
  if (!profile) return <SkeletonPage />;

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    if (profile.role === "caseworker") return <Navigate to="/caseworker" replace />;
    if (profile.role === "admin")      return <Navigate to="/admin" replace />;
    return <Navigate to="/family" replace />;
  }
  return children;
}
