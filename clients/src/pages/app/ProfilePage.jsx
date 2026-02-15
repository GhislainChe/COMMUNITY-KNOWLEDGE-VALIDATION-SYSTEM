import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/api";
import {
  LogOut,
  User,
  ShieldCheck,
  MessageSquareText,
  Bookmark,
  Star,
} from "lucide-react";

export default function ProfilePage() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, []);

  const [me, setMe] = useState(null); // optional: from /api/me if you want
  const [loading, setLoading] = useState(true);

  const [appliedCount, setAppliedCount] = useState(0);
  const [threadsCount, setThreadsCount] = useState(0);

  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        // if no user in localStorage, redirect
        if (!user) {
          navigate("/login", { replace: true });
          return;
        }

        // Optional: confirm auth
        // /api/me exists in your backend
        const meRes = await api.get("/me");
        setMe(meRes.data?.user || null);

        // Applied practices count
        const appliedRes = await api.get("/practices/applied");
        const applied =
          (Array.isArray(appliedRes.data) && appliedRes.data) ||
          appliedRes.data?.applied ||
          [];
        setAppliedCount(Array.isArray(applied) ? applied.length : 0);

        // My discussions threads count (you built /discussions/mine)
        const threadsRes = await api.get("/discussions/mine");
        const threads =
          (Array.isArray(threadsRes.data) && threadsRes.data) ||
          threadsRes.data?.threads ||
          threadsRes.data?.results ||
          [];
        setThreadsCount(Array.isArray(threads) ? threads.length : 0);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [navigate, user]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  if (loading) return <p className="text-slate-500 p-3">Loading profile...</p>;
  if (error) return <p className="text-red-600 p-3">{error}</p>;

  // Prefer local user object, fallback to /me
  const fullName = user?.fullName || me?.fullName || "User";
  const email = user?.email || me?.email || "";
  const role = user?.userRole || me?.userRole || "USER";
  const credibilityScore =
    user?.credibilityScore ?? me?.credibilityScore ?? 0;

  return (
    <div className="p-3 sm:p-4 space-y-4">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/10">
              <User className="h-6 w-6" />
            </div>

            <div>
              <h1 className="font-heading text-xl font-bold">{fullName}</h1>
              {email && (
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300/70">
                  {email}
                </p>
              )}

              <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-100">
                  <ShieldCheck className="h-4 w-4" />
                  Role: {role}
                </span>

                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/15 px-3 py-1 text-emerald-800 dark:text-emerald-200">
                  <Star className="h-4 w-4" />
                  Credibility: {Number(credibilityScore).toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          type="button"
          onClick={() => navigate("/app/bookmarks")}
          className="rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Bookmark className="h-5 w-5" />
            <p className="font-semibold">Bookmarks</p>
          </div>
          <p className="mt-2 text-2xl font-extrabold">{appliedCount}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
            Practices you applied.
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate("/app/discussions")}
          className="rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <MessageSquareText className="h-5 w-5" />
            <p className="font-semibold">Discussions</p>
          </div>
          <p className="mt-2 text-2xl font-extrabold">{threadsCount}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
            Threads you participated in.
          </p>
        </button>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Account
          </p>
          <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300/70">
            <p>
              <span className="font-semibold text-slate-800 dark:text-white">
                Status:
              </span>{" "}
              Active
            </p>
            <p>
              <span className="font-semibold text-slate-800 dark:text-white">
                Security:
              </span>{" "}
              JWT Authentication
            </p>
            <p>
              <span className="font-semibold text-slate-800 dark:text-white">
                Tip:
              </span>{" "}
              Keep submitting outcomes to improve credibility.
            </p>
          </div>
        </div>
      </div>

      {/* Profile actions */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
        <h2 className="font-heading text-lg font-bold">Profile Actions</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => navigate("/app/bookmarks")}
            className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            View Bookmarks
          </button>

          <button
            onClick={() => navigate("/app/discussions")}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Open Discussions
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-300/70">
          Next upgrade (optional): edit profile (name, location) + change password.
        </p>
      </div>
    </div>
  );
}
