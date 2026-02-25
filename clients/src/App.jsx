// clients/src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PracticeDetailsPage from "./pages/app/PracticeDetailsPage";

import AppLayout from "./layouts/AppLayout";
import PracticesPage from "./pages/app/PracticesPage";
import BookmarksPage from "./pages/app/BookmarksPage";
import DiscoverPage from "./pages/app/DiscoverPage";
import DiscussionsPage from "./pages/app/DiscussionsPage";
import AboutPage from "./pages/app/AboutPage";
import ProfilePage from "./pages/app/ProfilePage";

// ✅ Moderator
import ModerationPage from "./pages/app/ModerationPage";
import ModerationAuditPage from "./pages/app/ModerationAuditPage";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* App shell */}
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="practices" replace />} />

        <Route path="practices" element={<PracticesPage />} />
        <Route path="practices/:id" element={<PracticeDetailsPage />} />
        <Route path="bookmarks" element={<BookmarksPage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="discussions" element={<DiscussionsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="profile" element={<ProfilePage />} />

        {/* ✅ Moderator routes */}
        <Route path="moderation" element={<ModerationPage />} />
        <Route path="moderation/audit" element={<ModerationAuditPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}