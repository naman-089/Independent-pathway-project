import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import Splash from "./components/Splash";
import Nav from "./components/Nav";

// Pages
import AuthPage            from "./pages/AuthPage";
import FamilyHome          from "./pages/family/FamilyHome";
import IntakePage          from "./pages/family/IntakePage";
import TimelinePage        from "./pages/family/TimelinePage";
import PortfolioPage       from "./pages/family/PortfolioPage";
import ResourcesPage       from "./pages/family/ResourcesPage";
import CaseworkerDashboard from "./pages/caseworker/CaseworkerDashboard";
import FamiliesList        from "./pages/caseworker/FamiliesList";
import FamilyDetail        from "./pages/caseworker/FamilyDetail";
import MatchesOverview     from "./pages/caseworker/MatchesOverview";
import AdminDashboard      from "./pages/admin/AdminDashboard";
import ResourceDirectory   from "./pages/admin/ResourceDirectory";
import UsersPage           from "./pages/admin/UsersPage";

function AppShell() {
  const [splashDone, setSplashDone] = useState(false);

  // Skip splash if already visited this session
  useEffect(() => {
    if (sessionStorage.getItem("splashDone")) setSplashDone(true);
  }, []);

  function handleSplashExit() {
    sessionStorage.setItem("splashDone", "1");
    setSplashDone(true);
  }

  return (
    <>
      {!splashDone && <Splash onEnter={handleSplashExit} />}

      <Routes>
        {/* Public */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/"     element={<Navigate to="/auth" replace />} />

        {/* Family routes */}
        <Route path="/family/*" element={
          <ProtectedRoute allowedRoles={["family"]}>
            <Nav />
            <Routes>
              <Route index       element={<FamilyHome />} />
              <Route path="intake"    element={<IntakePage />} />
              <Route path="timeline"  element={<TimelinePage />} />
              <Route path="portfolio" element={<PortfolioPage />} />
              <Route path="resources" element={<ResourcesPage />} />
            </Routes>
          </ProtectedRoute>
        } />

        {/* Caseworker routes */}
        <Route path="/caseworker/*" element={
          <ProtectedRoute allowedRoles={["caseworker"]}>
            <Nav />
            <Routes>
              <Route index              element={<CaseworkerDashboard />} />
              <Route path="families"    element={<FamiliesList />} />
              <Route path="families/:uid" element={<FamilyDetail />} />
              <Route path="matches"     element={<MatchesOverview />} />
            </Routes>
          </ProtectedRoute>
        } />

        {/* Admin routes */}
        <Route path="/admin/*" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Nav />
            <Routes>
              <Route index             element={<AdminDashboard />} />
              <Route path="resources"  element={<ResourceDirectory />} />
              <Route path="users"      element={<UsersPage />} />
            </Routes>
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
