import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/api";
import {
  Shield,
  RefreshCw,
  Search,
  Download,
  Users,
  UserCheck,
  UserX,
  Crown,
  BadgeCheck,
} from "lucide-react";

function formatDate(dt) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt || "";
  }
}

function escapeCsv(val) {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function downloadCsv(filename, rows) {
  const headers = ["userId", "fullName", "email", "userRole", "userStatus", "credibilityScore", "createdAt"];
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escapeCsv(r?.[h])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm dark:border-white/10 dark:bg-white/5 lg:rounded-3xl">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-600 text-white">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-300/70">{label}</p>
          <p className="mt-1 text-2xl font-extrabold">{value}</p>
          {sub ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-300/70">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [role, setRole] = useState("ALL");

  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState("");

  async function loadOverview() {
    const res = await api.get("/admin/overview");
    setOverview(res.data?.overview || null);
  }

  async function loadUsers() {
    const res = await api.get(
      `/admin/users?q=${encodeURIComponent(q.trim())}&status=${status}&role=${role}`,
    );
    setUsers(res.data?.users || []);
  }

  async function loadAll() {
    try {
      setLoading(true);
      setErr("");
      await Promise.all([loadOverview(), loadUsers()]);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyFilters() {
    try {
      setErr("");
      setLoading(true);
      await loadUsers();
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(userId, newRole) {
    try {
      setSavingId(userId);
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setToast("Role updated ✅");
      await loadAll();
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to update role.");
    } finally {
      setSavingId(null);
      setTimeout(() => setToast(""), 1500);
    }
  }

  async function updateStatus(userId, newStatus) {
    try {
      setSavingId(userId);
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
      setToast("Status updated ✅");
      await loadAll();
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to update status.");
    } finally {
      setSavingId(null);
      setTimeout(() => setToast(""), 1500);
    }
  }

  async function updateCredibility(userId, score) {
    try {
      setSavingId(userId);
      await api.patch(`/admin/users/${userId}/credibility`, { credibilityScore: Number(score) });
      setToast("Credibility updated ✅");
      await loadAll();
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to update credibility.");
    } finally {
      setSavingId(null);
      setTimeout(() => setToast(""), 1500);
    }
  }

  const stats = useMemo(() => {
    const o = overview || {};
    return {
      totalUsers: Number(o.totalUsers || 0),
      activeUsers: Number(o.activeUsers || 0),
      suspendedUsers: Number(o.suspendedUsers || 0),
      moderatorsCount: Number(o.moderatorsCount || 0),
      adminsCount: Number(o.adminsCount || 0),
    };
  }, [overview]);

  function onDownloadUsers() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`users-${stamp}.csv`, users);
  }

  return (
    <div className="space-y-3 px-3 py-3 text-slate-900 dark:text-slate-100 sm:space-y-4 sm:px-4 md:px-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm dark:border-white/10 dark:bg-white/5 lg:rounded-3xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-600 text-white">
                <Shield className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-heading text-xl font-bold">Admin Dashboard</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                  Manage users, roles, and account status.
                </p>
              </div>
            </div>

            {toast ? (
              <div className="mt-3 inline-flex rounded-full bg-emerald-600/15 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                {toast}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              onClick={onDownloadUsers}
              disabled={users.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60
              dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 sm:w-auto"
              title="Download users as CSV (Excel)"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>

            <button
              onClick={loadAll}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50
              dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 sm:w-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {err ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            {err}
          </div>
        ) : null}
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={<Users className="h-5 w-5" />} label="Total users" value={stats.totalUsers} />
        <StatCard icon={<UserCheck className="h-5 w-5" />} label="Active" value={stats.activeUsers} />
        <StatCard icon={<UserX className="h-5 w-5" />} label="Suspended" value={stats.suspendedUsers} />
        <StatCard icon={<BadgeCheck className="h-5 w-5" />} label="Moderators" value={stats.moderatorsCount} />
        <StatCard icon={<Crown className="h-5 w-5" />} label="Admins" value={stats.adminsCount} />
      </div>

      {/* Users */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5 lg:rounded-3xl">
        <div className="border-b border-slate-200 p-3 sm:p-4 dark:border-white/10">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">User management</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300/70">
            Search, change roles, suspend accounts, and adjust credibility score.
          </p>

          {/* Filters */}
          <div className="mt-3 flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full lg:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, email, ID…"
                className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm outline-none
                focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:gap-3">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none
                hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 lg:w-[160px]"
              >
                <option value="ALL">All status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>

              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none
                hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 lg:w-[180px]"
              >
                <option value="ALL">All roles</option>
                <option value="USER">User</option>
                <option value="MODERATOR">Moderator</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <button
              onClick={applyFilters}
              className="w-full rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 lg:w-auto lg:min-w-[110px]"
            >
              Apply
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-slate-500 dark:text-slate-300/70">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-4 text-sm text-slate-500 dark:text-slate-300/70">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left">
              <thead className="bg-slate-50 dark:bg-white/5">
                <tr className="text-xs text-slate-500 dark:text-slate-300/70">
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Credibility</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {users.map((u) => {
                  const isSaving = savingId === u.userId;

                  return (
                    <tr key={u.userId} className="text-sm hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{u.fullName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-300/70">{u.email}</p>
                        <p className="text-[11px] text-slate-400">ID: {u.userId}</p>
                      </td>

                      <td className="px-4 py-3">
                        <select
                          value={u.userRole}
                          disabled={isSaving}
                          onChange={(e) => updateRole(u.userId, e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none
                          hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                        >
                          <option value="USER">USER</option>
                          <option value="MODERATOR">MODERATOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                            String(u.userStatus).toUpperCase() === "ACTIVE"
                              ? "bg-emerald-600/15 text-emerald-800 dark:text-emerald-200"
                              : "bg-rose-600/15 text-rose-800 dark:text-rose-200"
                          }`}
                        >
                          {u.userStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          defaultValue={Number(u.credibilityScore || 0)}
                          disabled={isSaving}
                          onBlur={(e) => {
                            const v = e.target.value;
                            updateCredibility(u.userId, v);
                          }}
                          className="w-[140px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                          focus:ring-2 focus:ring-emerald-400 disabled:opacity-60 dark:border-white/10 dark:bg-white/5"
                        />
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-300/70">
                        {formatDate(u.createdAt)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {String(u.userStatus).toUpperCase() === "ACTIVE" ? (
                            <button
                              disabled={isSaving}
                              onClick={() => updateStatus(u.userId, "SUSPENDED")}
                              className="rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              disabled={isSaving}
                              onClick={() => updateStatus(u.userId, "ACTIVE")}
                              className="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              Unsuspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
