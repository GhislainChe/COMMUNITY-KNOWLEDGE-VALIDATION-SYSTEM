import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/api";
import { BarChart3, RefreshCw, Download } from "lucide-react";

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-300/70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      {sub ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-300/70">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function BarList({ title, items }) {
  const max = Math.max(1, ...items.map((x) => Number(x.count || 0)));

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{title}</p>
        <BarChart3 className="h-4 w-4 text-slate-400" />
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-300/70">
            No data
          </p>
        ) : (
          items.map((x, idx) => {
            const pct = Math.round((Number(x.count || 0) / max) * 100);
            return (
              <div key={`${x.label || x.reason || x.targetType || idx}`}>
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300/70">
                  <span className="font-semibold">
                    {x.label || x.reason || x.targetType || "Item"}
                  </span>
                  <span className="font-bold">{x.count}</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-slate-100 dark:bg-white/10">
                  <div
                    className="h-2 rounded-full bg-emerald-600"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [downloading, setDownloading] = useState("");

  const [data, setData] = useState(null);

  const stamp = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const res = await api.get(`/admin/analytics?days=${days}`);
      setData(res.data || null);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  // ✅ EXPORTS
  async function exportAnalytics() {
    try {
      setDownloading("analytics");
      await downloadCsvFromApi(
        `/admin/exports/analytics.csv?days=${days}`,
        `admin-analytics-${days}d-${stamp}.csv`,
      );
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to download analytics CSV");
    } finally {
      setDownloading("");
    }
  }

  async function exportAudit() {
    try {
      setDownloading("audit");
      await downloadCsvFromApi(
        `/admin/exports/moderation-audit.csv?days=${days}`,
        `moderation-audit-${days}d-${stamp}.csv`,
      );
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to download audit CSV");
    } finally {
      setDownloading("");
    }
  }

  async function exportUsers() {
    try {
      setDownloading("users");
      await downloadCsvFromApi(
        `/admin/exports/users.csv`,
        `users-${stamp}.csv`,
      );
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to download users CSV");
    } finally {
      setDownloading("");
    }
  }

  const totals = useMemo(() => {
    const u = data?.usersOverview || {};
    const f = data?.flagsTotals || {};
    const c = data?.content || {};
    return {
      totalUsers: Number(u.totalUsers || 0),
      newUsers: Number(u.newUsers || 0),
      activeUsers: Number(u.activeUsers || 0),
      suspendedUsers: Number(u.suspendedUsers || 0),

      flagsTotal: Number(f.totalFlags || 0),
      flagsPending: Number(f.pendingFlags || 0),
      flagsResolved: Number(f.resolvedFlags || 0),
      avgResolutionHours: f.avgResolutionHours ?? "—",
      resolvedUnder24hPct: f.resolvedUnder24hPct ?? "—",

      newPractices: Number(c.newPractices || 0),
      newComments: Number(c.newComments || 0),
      newOutcomes: Number(c.newOutcomes || 0),
    };
  }, [data]);

  return (
    <div className="p-3 space-y-4 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-xl font-bold">Admin Analytics</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
              System activity, moderation health, and exportable reports.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none
              hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 sm:w-[160px]"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last 365 days</option>
            </select>

            <button
              onClick={load}
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

        {/* Exports */}
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button
            onClick={exportAnalytics}
            disabled={downloading === "analytics"}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
          >
            <Download className="h-4 w-4" />
            {downloading === "analytics"
              ? "Downloading…"
              : "Download Analytics CSV"}
          </button>

          <button
            onClick={exportAudit}
            disabled={downloading === "audit"}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-70
            dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <Download className="h-4 w-4" />
            {downloading === "audit" ? "Downloading…" : "Download Audit CSV"}
          </button>

          <button
            onClick={exportUsers}
            disabled={downloading === "users"}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-70
            dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <Download className="h-4 w-4" />
            {downloading === "users" ? "Downloading…" : "Download Users CSV"}
          </button>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-sm text-slate-500 dark:text-slate-300/70">
            Loading…
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Total users"
              value={totals.totalUsers}
              sub={`New users (${days}d): ${totals.newUsers}`}
            />
            <Stat label="Active users" value={totals.activeUsers} />
            <Stat label="Suspended users" value={totals.suspendedUsers} />
            <Stat
              label="Flags (total)"
              value={totals.flagsTotal}
              sub={`Pending: ${totals.flagsPending} • Resolved: ${totals.flagsResolved}`}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Stat
              label="Avg resolution time"
              value={`${totals.avgResolutionHours}h`}
              sub={`Resolved < 24h: ${totals.resolvedUnder24hPct}%`}
            />
            <Stat
              label={`New practices (${days}d)`}
              value={totals.newPractices}
            />
            <Stat
              label={`New comments (${days}d)`}
              value={totals.newComments}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <BarList
              title="Flags by target type"
              items={(data?.byTargetType || []).map((x) => ({
                targetType: x.targetType,
                count: x.count,
              }))}
            />
            <BarList
              title="Flags by reason"
              items={(data?.byReason || []).map((x) => ({
                reason: x.reason,
                count: x.count,
              }))}
            />
            <BarList
              title="Top reporters"
              items={(data?.topReporters || []).map((x) => ({
                label: x.fullName || x.email || `User ${x.userId}`,
                count: x.count,
              }))}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <BarList
              title="Most flagged content owners"
              items={(data?.topFlaggedOwners || []).map((x) => ({
                label: x.fullName || x.email || `User ${x.userId}`,
                count: x.count,
              }))}
            />

            <BarList
              title="Top flagged targets"
              items={(data?.topTargets || []).map((x) => ({
                label: `${x.targetType} #${x.targetId}`,
                count: x.count,
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}
