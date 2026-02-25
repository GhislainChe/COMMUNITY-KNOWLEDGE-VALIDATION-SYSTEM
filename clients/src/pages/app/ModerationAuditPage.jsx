// clients/src/pages/app/ModerationAuditPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/api";
import { ShieldCheck, RefreshCw, ArrowLeft, Search } from "lucide-react";

function formatDate(dt) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt || "";
  }
}

function pillClass(value) {
  const v = String(value || "").toUpperCase();
  if (v === "PRACTICE") return "bg-emerald-600/15 text-emerald-800 dark:text-emerald-200";
  if (v === "COMMENT") return "bg-indigo-600/15 text-indigo-800 dark:text-indigo-200";
  if (v === "OUTCOME") return "bg-amber-600/15 text-amber-800 dark:text-amber-200";
  if (v === "SPAM") return "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-100";
  if (v === "ABUSIVE") return "bg-red-500/15 text-red-800 dark:text-red-200";
  if (v === "FALSE_INFO") return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
  if (v.includes("HIDE") || v.includes("REMOVE") || v.includes("REJECT"))
    return "bg-emerald-600/15 text-emerald-800 dark:text-emerald-200";
  return "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-100";
}

export default function ModerationAuditPage() {
  const navigate = useNavigate();
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  async function loadAudit() {
    try {
      setLoading(true);
      setPageErr("");
      const res = await api.get("/moderation/audit");
      setAudit(res.data?.audit || []);
    } catch (err) {
      setPageErr(err?.response?.data?.message || "Failed to load audit history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAudit();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return (audit || []).filter((a) => {
      const t = String(a.targetType || "").toUpperCase();
      if (typeFilter !== "ALL" && t !== typeFilter) return false;

      if (!qq) return true;

      const hay = [
        a.flagId,
        a.targetId,
        a.reason,
        a.actionTaken,
        a.reviewNote,
        a.moderatorName,
        a.reporterName,
      ]
        .map((x) => String(x || "").toLowerCase())
        .join(" ");

      return hay.includes(qq);
    });
  }, [audit, q, typeFilter]);

  return (
    <div className="p-3 space-y-4 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/app/moderation")}
                className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50
                dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                title="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-600 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h1 className="truncate font-heading text-xl font-bold">Moderation Audit</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                  History of resolved reports (audit trail).
                </p>
              </div>
            </div>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-600/15 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              Total resolved: {audit.length}
            </div>
          </div>

          <button
            onClick={loadAudit}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50
            dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by flagId, targetId, action, reason, moderator, reporter..."
              className="w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none
              focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
            focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
          >
            <option value="ALL">All types</option>
            <option value="PRACTICE">Practice</option>
            <option value="COMMENT">Comment</option>
            <option value="OUTCOME">Outcome</option>
          </select>
        </div>
      </div>

      {/* Body */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Resolved flags
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-300/70">
            Showing {filtered.length} result(s)
          </p>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-slate-500">Loading audit...</div>
        ) : pageErr ? (
          <div className="p-4 text-sm text-red-600">{pageErr}</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-slate-600 dark:text-slate-300/80">
            No resolved flags found.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {filtered.map((a) => (
              <div key={a.flagId} className="p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${pillClass(a.targetType)}`}>
                    {a.targetType}
                  </span>

                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${pillClass(a.reason)}`}>
                    {a.reason}
                  </span>

                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${pillClass(a.actionTaken)}`}>
                    {a.actionTaken}
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-100">
                    Flag #{a.flagId} • Target {a.targetId}
                  </span>

                  <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-300/70">
                    {formatDate(a.reviewedAt)}
                  </span>
                </div>

                {a.reviewNote ? (
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-semibold">Note:</span> {a.reviewNote}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-300/70">
                    No review note.
                  </p>
                )}

                <p className="text-xs text-slate-500 dark:text-slate-300/70">
                  Moderator: <span className="font-semibold">{a.moderatorName || "—"}</span> • Reporter:{" "}
                  <span className="font-semibold">{a.reporterName || "—"}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}