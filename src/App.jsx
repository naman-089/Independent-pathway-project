import { lazy, Suspense, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { LanguageProvider } from "./hooks/useLanguage";
import ProtectedRoute from "./components/ProtectedRoute";
import Splash from "./components/Splash";
import Nav from "./components/Nav";
import SkeletonPage from "./components/Skeleton";

// Lazy-loaded pages — each page is its own JS chunk downloaded on first visit
const AuthPage            = lazy(() => import("./pages/AuthPage"));
const ProfilePage         = lazy(() => import("./pages/ProfilePage"));

const FamilyHome          = lazy(() => import("./pages/family/FamilyHome"));
const IntakePage          = lazy(() => import("./pages/family/IntakePage"));
const TimelinePage        = lazy(() => import("./pages/family/TimelinePage"));
const PortfolioPage       = lazy(() => import("./pages/family/PortfolioPage"));
const ResourcesPage       = lazy(() => import("./pages/family/ResourcesPage"));
const WaitlistPage        = lazy(() => import("./pages/family/WaitlistPage"));

const CaseworkerDashboard = lazy(() => import("./pages/caseworker/CaseworkerDashboard"));
const FamiliesList        = lazy(() => import("./pages/caseworker/FamiliesList"));
const FamilyDetail        = lazy(() => import("./pages/caseworker/FamilyDetail"));
const MatchesOverview     = lazy(() => import("./pages/caseworker/MatchesOverview"));

const AdminDashboard      = lazy(() => import("./pages/admin/AdminDashboard"));
const ResourceDirectory   = lazy(() => import("./pages/admin/ResourceDirectory"));
const UsersPage           = lazy(() => import("./pages/admin/UsersPage"));

function AppShell() {
  const [splashDone, setSplashDone] = useState(() => sessionStorage.getItem("splashDone") === "1");

  useEffect(() => {
    if (splashDone) return;
    // Match the splash background behind it and warm up the auth chunk while it
    // plays, so the handoff is instant — the auth form (and its password field)
    // only mounts once the splash is gone, instead of sitting hidden underneath
    // it where mobile browsers can prematurely trigger the keyboard/autofill.
    document.body.classList.add("splash-active");
    import("./pages/AuthPage");
    return () => document.body.classList.remove("splash-active");
  }, [splashDone]);

  function handleSplashExit() {
    sessionStorage.setItem("splashDone", "1");
    setSplashDone(true);
  }

  if (!splashDone) {
    return <Splash onEnter={handleSplashExit} />;
  }

  return (
    <>
      <Suspense fallback={<SkeletonPage />}>
        <Routes>
          {/* Public */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/"     element={<Navigate to="/auth" replace />} />

          {/* Family */}
          <Route path="/family/*" element={
            <ProtectedRoute allowedRoles={["family"]}>
              <Nav />
              <Routes>
                <Route index              element={<FamilyHome />} />
                <Route path="intake"      element={<IntakePage />} />
                <Route path="timeline"    element={<TimelinePage />} />
                <Route path="portfolio"   element={<PortfolioPage />} />
                <Route path="resources"   element={<ResourcesPage />} />
                <Route path="waitlist"    element={<WaitlistPage />} />
                <Route path="profile"     element={<ProfilePage />} />
              </Routes>
            </ProtectedRoute>
          } />

          {/* Caseworker */}
          <Route path="/caseworker/*" element={
            <ProtectedRoute allowedRoles={["caseworker"]}>
              <Nav />
              <Routes>
                <Route index                element={<CaseworkerDashboard />} />
                <Route path="families"      element={<FamiliesList />} />
                <Route path="families/:uid" element={<FamilyDetail />} />
                <Route path="matches"       element={<MatchesOverview />} />
                <Route path="profile"       element={<ProfilePage />} />
              </Routes>
            </ProtectedRoute>
          } />

          {/* Admin */}
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Nav />
              <Routes>
                <Route index             element={<AdminDashboard />} />
                <Route path="resources"  element={<ResourceDirectory />} />
                <Route path="users"      element={<UsersPage />} />
                <Route path="profile"    element={<ProfilePage />} />
              </Routes>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
