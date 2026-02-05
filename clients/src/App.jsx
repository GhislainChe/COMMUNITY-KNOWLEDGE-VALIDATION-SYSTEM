import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

function AppHomePlaceholder() {
  return (
    <div className="min-h-screen bg-slate-50 p-10 text-slate-900">
      <h1 className="text-2xl font-semibold">App Home (Practices) — coming next</h1>
      <p className="mt-2 text-slate-600">
        After we build route protection and sidebar layout, this becomes the Practices page.
      </p>
    </div>
  );
}

function AppPlaceholder() {
  return (
    <div className="min-h-screen bg-slate-50 p-10">
      <h1 className="text-2xl font-semibold">Welcome to CKVS App ✅</h1>
      <p className="mt-2 text-slate-600">
        Next we will build the sidebar layout and real pages.
      </p>
    </div>
  );
}


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/app/practices" element={<AppHomePlaceholder />} />
      <Route path="/app" element={<AppPlaceholder />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}


