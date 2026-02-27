// clients/src/layouts/AppLayout.jsx
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Leaf,
  Compass,
  MessageSquareText,
  Info,
  User,
  LogOut,
  Sun,
  Moon,
  Bookmark,
  ShieldAlert,
  ShieldCheck,
  LayoutDashboard,
  BarChart3
} from "lucide-react";
import { logout } from "../utils/auth";
import { getTheme, toggleTheme, applyTheme } from "../utils/theme";
import { useEffect, useMemo, useState } from "react";

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [theme, setTheme] = useState(getTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function handleLogout() {
    logout();
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  }

  // NOTE: Your app currently stores a "user" in localStorage.
  // We use it only for role-based nav visibility.
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, []);

  const isModerator = useMemo(() => {
    const role = (user?.userRole || user?.role || "").toUpperCase();
    return role === "MODERATOR" || role === "ADMIN";
  }, [user]);

  const isAdmin = useMemo(() => {
    const role = (user?.userRole || user?.role || "").toUpperCase();
    return role === "ADMIN";
  }, [user]);

  const currentTab = useMemo(() => {
    const path = location.pathname;
    if (path.includes("/app/practices")) return "Practices";
    if (path.includes("/app/bookmarks")) return "Bookmarks";
    if (path.includes("/app/discover")) return "Discover";
    if (path.includes("/app/discussions")) return "Discussions";
    if (path.includes("/app/about")) return "About";
    if (path.includes("/app/profile")) return "Profile";
    if (path.includes("/app/moderation/audit")) return "Moderation Audit";
    if (path.includes("/app/moderation")) return "Moderation";
    return "AdminDashboard";
  }, [location.pathname]);

  const linkBase =
    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition";
  const linkActive =
    "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20";
  const linkInactive =
    "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300/80 dark:hover:bg-white/10 dark:hover:text-white";

  function NavLinks({ onClick }) {
    return (
      <>
        <NavLink
          to="practices"
          onClick={onClick}
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkInactive}`
          }
        >
          <Leaf className="h-5 w-5" /> Practices
        </NavLink>

        <NavLink
          to="bookmarks"
          onClick={onClick}
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkInactive}`
          }
        >
          <Bookmark className="h-5 w-5" /> Bookmarks
        </NavLink>

        <NavLink
          to="discover"
          onClick={onClick}
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkInactive}`
          }
        >
          <Compass className="h-5 w-5" /> Discover
        </NavLink>

        <NavLink
          to="discussions"
          onClick={onClick}
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkInactive}`
          }
        >
          <MessageSquareText className="h-5 w-5" /> Discussions
        </NavLink>

        <NavLink
          to="about"
          onClick={onClick}
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkInactive}`
          }
        >
          <Info className="h-5 w-5" /> About
        </NavLink>

        <NavLink
          to="profile"
          onClick={onClick}
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkInactive}`
          }
        >
          <User className="h-5 w-5" /> Profile
        </NavLink>

        {/* ✅ Only for MODERATOR / ADMIN */}
        {isModerator && (
          <>
            <NavLink
              to="moderation"
              onClick={onClick}
              end
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              <ShieldAlert className="h-5 w-5" /> Moderation
            </NavLink>

            {/* ✅ NEW: Audit */}
            <NavLink
              to="moderation/audit"
              onClick={onClick}
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              <ShieldCheck className="h-5 w-5" /> Audit
            </NavLink>
          </>
        )}
        {isAdmin && (
          <>
            <NavLink
              to="admin"
              onClick={onClick}
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              <LayoutDashboard className="h-5 w-5" /> Admin
            </NavLink>
            <NavLink
              to="admin-analytics"
              onClick={onClick}
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              <BarChart3 className="h-5 w-5" /> Admin Analytics
            </NavLink>
          </>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100">
      {/* TOP NAVBAR */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-[#0b1220]/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          {/* Left: Brand */}
          <div className="flex items-center gap-4">
            <div className="text-lg tracking-wide">
              <span className="font-brand font-semibold">CKVS</span>
            </div>

            {/* optional: show tab */}
            <div className="hidden md:block">
              <span className="text-sm text-slate-400"></span>{" "}
              <span className="font-heading text-lg font-semibold">
                {currentTab}
              </span>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-3">
            {/* hamburger menu for mobile */}
            <button
              onClick={() => setMobileNavOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50
              dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 md:hidden"
              title="Open menu"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(toggleTheme())}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              title="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {/* User mini card */}
            <div className="hidden sm:flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                <User className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <p className="text-xs text-slate-500 dark:text-slate-300/70">
                  Signed in
                </p>
                <p className="text-sm font-semibold">
                  {user?.email || "user@example.com"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
            onClick={() => setMobileNavOpen(false)}
          />

          <div className="absolute left-0 top-0 h-full w-[85%] max-w-[320px] animate-[slideIn_220ms_ease-out]">
            <div className="h-full rounded-r-3xl border border-slate-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#0b1220]">
              <div className="flex items-center justify-between">
                <div className="text-lg tracking-wide">
                  <span className="font-brand font-semibold">CKVS</span>
                </div>

                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50
                  dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  title="Close"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" d="M6 6l12 12M18 6l-12 12" />
                  </svg>
                </button>
              </div>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300/70">
                Preserving and validating knowledge
              </p>

              <nav className="mt-5 space-y-2">
                <NavLinks onClick={() => setMobileNavOpen(false)} />
              </nav>

              <div className="mt-6 border-t border-slate-200 pt-4 dark:border-white/10">
                <button
                  onClick={() => {
                    setMobileNavOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900
                  dark:text-slate-300/80 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BODY */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-1 py-3 md:grid-cols-[260px_1fr] h-[calc(100vh-72px)]">
        {/* Sidebar */}
        <aside className="hidden md:block h-full sticky top-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <nav className="space-y-2">
            <NavLinks />
          </nav>

          <div className="mt-6 border-t border-slate-200 pt-4 dark:border-white/10">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900
              dark:text-slate-300/80 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="h-full overflow-y-auto rounded-3xl border border-slate-200 bg-white p-0 shadow-sm dark:border-white/10 dark:bg-white/5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}