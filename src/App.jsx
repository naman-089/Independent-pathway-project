import { lazy, Suspense, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { LanguageProvider } from "./hooks/useLanguage";
import ProtectedRoute from "./components/ProtectedRoute";
import Splash from "./components/Splash";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import SkeletonPage from "./components/Skeleton";
import Chatbot from "./components/Chatbot";
import TextToSpeech from "./components/TextToSpeech";

const AuthPage            = lazy(() => import("./pages/AuthPage"));
const ProfilePage         = lazy(() => import("./pages/ProfilePage"));

const FamilyHome          = lazy(() => import("./pages/family/FamilyHome"));
const IntakePage          = lazy(() => import("./pages/family/IntakePage"));
const TimelinePage        = lazy(() => import("./pages/family/TimelinePage"));
const PortfolioPage       = lazy(() => import("./pages/family/PortfolioPage"));
const ResourcesPage       = lazy(() => import("./pages/family/ResourcesPage"));
const CommunityPage       = lazy(() => import("./pages/family/CommunityPage"));

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
                <Route path="community"   element={<CommunityPage />} />
                <Route path="profile"     element={<ProfilePage />} />
              </Routes>
              <Footer />
              <Chatbot />
              <TextToSpeech />
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
              <Footer />
              <TextToSpeech />
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
              <Footer />
              <TextToSpeech />
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
