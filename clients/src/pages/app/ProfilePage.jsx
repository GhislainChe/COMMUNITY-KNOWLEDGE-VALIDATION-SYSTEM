// clients/src/pages/app/ProfilePage.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/api";
import { useNavigate } from "react-router-dom";
import defaultPracticeImg from "../../assets/practice-default.jpg";
import {
  Bookmark,
  MessageCircle,
  Leaf,
  ShieldCheck,
  LogOut,
  Plus,
  ArrowRight,
  Pencil,
  X,
  Mail,
  User as UserIcon,
} from "lucide-react";

const API_BASE = "http://localhost:5000";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function scoreLabel(score) {
  if (score >= 80) return { label: "Very trusted", tone: "emerald" };
  if (score >= 60) return { label: "Trusted", tone: "emerald" };
  if (score >= 40) return { label: "Growing", tone: "amber" };
  return { label: "New", tone: "slate" };
}

export default function ProfilePage() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [created, setCreated] = useState([]);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [discussionsCount, setDiscussionsCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [editMsg, setEditMsg] = useState("");
  const [editForm, setEditForm] = useState({ fullName: "", email: "" });

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      // ✅ 1) Real user from DB (includes fullName, email, credibilityScore)
      const meRes = await api.get("/users/me");
      const u = meRes.data?.user || null;
      setMe(u);

      // 2) My created practices
      const mineRes = await api.get("/practices/mine");
      const myList = mineRes.data?.practices || [];
      setCreated(myList);

      // 3) Bookmarks count (applied)
      const appliedRes = await api.get("/practices/applied");
      const appliedList = Array.isArray(appliedRes.data)
        ? appliedRes.data
        : appliedRes.data?.applied || appliedRes.data?.practices || [];
      setBookmarksCount(appliedList.length);

      // 4) Discussions count (optional)
      try {
        const dRes = await api.get("/discussions/mine");
        const dList = dRes.data?.discussions || dRes.data?.results || [];
        setDiscussionsCount(Array.isArray(dList) ? dList.length : 0);
      } catch {
        setDiscussionsCount(0);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  // ✅ Credibility: support both 0–1 and 0–100 values
  const credibility = useMemo(() => {
    const raw = Number(me?.credibilityScore ?? 0);
    const percent = raw <= 1 ? raw * 100 : raw;
    return clamp(percent, 0, 100);
  }, [me]);

  const cred = useMemo(() => scoreLabel(credibility), [credibility]);

  const fullName = me?.fullName || "User";
  const email = me?.email || "";
  const role = me?.userRole || "USER";

  function openEdit() {
    setEditErr("");
    setEditMsg("");
    setEditLoading(false);
    setEditForm({
      fullName: me?.fullName || "",
      email: me?.email || "",
    });
    setEditOpen(true);
  }

  function closeEdit() {
    if (editLoading) return;
    setEditOpen(false);
  }

  async function submitEdit(e) {
    e.preventDefault();
    setEditErr("");
    setEditMsg("");

    if (!editForm.fullName.trim()) {
      setEditErr("Full name is required.");
      return;
    }
    if (!editForm.email.trim()) {
      setEditErr("Email is required.");
      return;
    }

    try {
      setEditLoading(true);

      const res = await api.patch("/users/me", {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
      });

      const updated = res.data?.user || null;
      setMe(updated);
      setEditMsg("Profile updated successfully ✅");

      // close after small delay
      setTimeout(() => {
        setEditOpen(false);
      }, 600);
    } catch (err) {
      setEditErr(err?.response?.data?.message || "Failed to update profile.");
    } finally {
      setEditLoading(false);
    }
  }

  if (loading) return <p className="p-3 text-slate-500">Loading profile...</p>;
  if (error) return <p className="p-3 text-red-600">{error}</p>;

  return (
    <div className="p-3 space-y-4 text-slate-900 dark:text-slate-100">
      {/* Header card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-600 text-white font-extrabold">
                {fullName?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-heading text-xl font-bold">
                  {fullName}
                </h1>
                <p className="truncate text-sm text-slate-600 dark:text-slate-300/70">
                  {email}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                <ShieldCheck className="h-4 w-4" />
                Role: {role}
              </span>

              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                  cred.tone === "emerald"
                    ? "bg-emerald-600/15 text-emerald-800 dark:text-emerald-200"
                    : cred.tone === "amber"
                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                    : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-100"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Credibility: {credibility.toFixed(0)}/100 • {cred.label}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              onClick={openEdit}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              title="Edit profile"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>

            <button
              onClick={() => navigate("/app/practices")}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <Leaf className="h-4 w-4" />
              Practices
            </button>

            <button
              onClick={() => navigate("/logout")}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Credibility explanation + progress */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-semibold">Credibility Score</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/80">
            Your score increases when your practices are used and when outcomes
            confirm they work. It helps users trust reliable contributors.
          </p>

          <div className="mt-3">
            <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-emerald-600"
                style={{ width: `${credibility}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-300/70">
              <span>New</span>
              <span>Trusted</span>
              <span>Very trusted</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button
            onClick={() => navigate("/app/bookmarks")}
            className="rounded-2xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Bookmarks</p>
              <Bookmark className="h-4 w-4 text-slate-500 dark:text-slate-300/70" />
            </div>
            <p className="mt-2 text-2xl font-extrabold">{bookmarksCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-300/70">
              Practices you applied/saved
            </p>
          </button>

          <button
            onClick={() => navigate("/app/discussions")}
            className="rounded-2xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Discussions</p>
              <MessageCircle className="h-4 w-4 text-slate-500 dark:text-slate-300/70" />
            </div>
            <p className="mt-2 text-2xl font-extrabold">{discussionsCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-300/70">
              Your activity & replies
            </p>
          </button>

          <button
            onClick={() => navigate("/app/practices")}
            className="rounded-2xl bg-emerald-600 p-3 text-left text-white hover:bg-emerald-700"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Create practice</p>
              <Plus className="h-4 w-4" />
            </div>
            <p className="mt-2 text-sm text-white/90">
              Share a practice to help the community validate.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold">
              Open Practices <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      </div>

      {/* Created Practices */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold">
              My Created Practices ({created.length})
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
              Your contributions to the community validation system.
            </p>
          </div>

          <button
            onClick={loadProfile}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        {created.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300/80">
            You have not created any practice yet. Click <b>Create practice</b>{" "}
            to add one.
          </div>
        ) : (
          <div className="mt-4 divide-y divide-slate-200 dark:divide-white/10">
            {created.map((p) => {
              const imgSrc = p.imageUrl
                ? p.imageUrl.startsWith("http")
                  ? p.imageUrl
                  : `${API_BASE}${p.imageUrl}`
                : defaultPracticeImg;

              const createdAt = p.createdAt
                ? new Date(p.createdAt).toLocaleString()
                : "";

              return (
                <button
                  key={p.practiceId}
                  type="button"
                  onClick={() => navigate(`/app/practices/${p.practiceId}`)}
                  className="w-full text-left hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <div className="flex gap-3 p-3">
                    <img
                      src={imgSrc}
                      alt={p.title}
                      className="h-14 w-14 flex-shrink-0 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold">{p.title}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-100">
                          {p.status || "ACTIVE"}
                        </span>
                      </div>

                      <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300/80">
                        {p.description}
                      </p>

                      {createdAt && (
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-300/70">
                          Created: {createdAt}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ✅ EDIT PROFILE MODAL */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeEdit}
          />

          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#0b1220]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4 dark:border-white/10">
              <div>
                <h2 className="font-heading text-lg font-bold">Edit profile</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                  Update your name and email.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50
                dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-4">
              {editErr && (
                <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                  {editErr}
                </div>
              )}
              {editMsg && (
                <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {editMsg}
                </div>
              )}

              <form onSubmit={submitEdit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                    Full name
                  </label>
                  <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
                    <UserIcon className="h-4 w-4 text-slate-500 dark:text-slate-300/70" />
                    <input
                      value={editForm.fullName}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, fullName: e.target.value }))
                      }
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="Your full name"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                    Email
                  </label>
                  <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
                    <Mail className="h-4 w-4 text-slate-500 dark:text-slate-300/70" />
                    <input
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, email: e.target.value }))
                      }
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeEdit}
                    disabled={editLoading}
                    className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50
                    disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="w-full sm:w-auto rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                  >
                    {editLoading ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>

              <p className="mt-4 text-[11px] text-slate-500 dark:text-slate-300/70">
                Note: If you want password change later, we’ll add a separate secure
                endpoint.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
