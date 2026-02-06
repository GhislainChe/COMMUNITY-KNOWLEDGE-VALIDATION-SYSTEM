import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PracticeDetailsPage from "./pages/app/PracticeDetailsPage";


import AppLayout from "./layouts/AppLayout";
import PracticesPage from "./pages/app/PracticesPage";
import DiscoverPage from "./pages/app/DiscoverPage";
import DiscussionsPage from "./pages/app/DiscussionsPage";
import AboutPage from "./pages/app/AboutPage";
import ProfilePage from "./pages/app/ProfilePage";

// function AppHomePlaceholder() {
//   return (
//     <div className="min-h-screen bg-slate-50 p-10 text-slate-900">
//       <h1 className="text-2xl font-semibold">App Home (Practices) — coming next</h1>
//       <p className="mt-2 text-slate-600">
//         After we build route protection and sidebar layout, this becomes the Practices page.
//       </p>
//     </div>
//   );
// }

// function AppPlaceholder() {
//   return (
//     <div className="min-h-screen bg-slate-50 p-10">
//       <h1 className="text-2xl font-semibold">Welcome to CKVS App ✅</h1>
//       <p className="mt-2 text-slate-600">
//         Next we will build the sidebar layout and real pages.
//       </p>
//     </div>
//   );
// }


export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="practices/:id" element={<PracticeDetailsPage />} />


      {/* App shell */}
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="practices" replace />} />
        <Route path="practices" element={<PracticesPage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="discussions" element={<DiscussionsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}


