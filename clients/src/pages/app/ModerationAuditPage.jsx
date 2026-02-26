import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/api";
import { ShieldCheck, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

function formatDate(dt) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt || "";
  }
}

function pill(cls, text) {
  return (
    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${cls}`}>
      {text}
    </span>
  );
}

function typePill(type) {
  const t = String(type || "").toUpperCase();
  if (t === "PRACTICE") return "bg-emerald-600/15 text-emerald-800 dark:text-emerald-200";
  if (t === "COMMENT") return "bg-indigo-600/15 text-indigo-800 dark:text-indigo-200";
  if (t === "OUTCOME") return "bg-amber-600/15 text-amber-800 dark:text-amber-200";
  return "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-100";
}

function actionPill(action) {
  const a = String(action || "").toUpperCase();
  if (a === "HIDE_COMMENT") return "bg-indigo-600/15 text-indigo-800 dark:text-indigo-200";
  if (a === "HIDE_PRACTICE") return "bg-rose-600/15 text-rose-800 dark:text-rose-200";
  if (a === "REJECT_OUTCOME") return "bg-amber-600/15 text-amber-800 dark:text-amber-200";
  if (a === "NO_ACTION") return "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-100";
  return "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-100";
}

export default function ModerationAuditPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  const [q, setQ] = useState("");
  const [days, setDays] = useState(30);
  const [targetType, setTargetType] = useState("ALL");
  const [actionTaken, setActionTaken] = useState("ALL");

  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const page = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);
  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  async function load() {
    try {
      setLoading(true);
      setErr("");

      const res = await api.get(
        `/moderation/audit?limit=${limit}&offset=${offset}&days=${days}&targetType=${targetType}&actionTaken=${actionTaken}&q=${encodeURIComponent(
          q.trim(),
        )}`,
      );

      setRows(res.data?.audit || []);
      setTotal(Number(res.data?.pagination?.total || 0));
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load audit log.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, days, targetType, actionTaken]);

  function applySearch() {
    setOffset(0);
    load();
  }

  return (
    <div className="p-3 space-y-4 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-600 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-heading text-xl font-bold">Audit Log</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                  View resolved moderation actions (with filters).
                </p>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500 dark:text-slate-300/70">
              Showing <b>{rows.length}</b> of <b>{total}</b> results
            </div>
          </div>

          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50
            dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_150px_160px_180px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by note, moderator, reporter, IDs…"
              className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm outline-none
              focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
            />
          </div>

          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none
            hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 365 days</option>
          </select>

          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none
            hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <option value="ALL">All types</option>
            <option value="PRACTICE">Practice</option>
            <option value="COMMENT">Comment</option>
            <option value="OUTCOME">Outcome</option>
          </select>

          <select
            value={actionTaken}
            onChange={(e) => setActionTaken(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none
            hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <option value="ALL">All actions</option>
            <option value="NO_ACTION">No action</option>
            <option value="HIDE_COMMENT">Hide comment</option>
            <option value="HIDE_PRACTICE">Hide practice</option>
            <option value="REJECT_OUTCOME">Reject outcome</option>
          </select>

          <button
            onClick={applySearch}
            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5 overflow-hidden">
        {loading ? (
          <div className="p-4 text-sm text-slate-500 dark:text-slate-300/70">Loading…</div>
        ) : err ? (
          <div className="p-4 text-sm text-red-600">{err}</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-slate-500 dark:text-slate-300/70">No results.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left">
              <thead className="bg-slate-50 dark:bg-white/5">
                <tr className="text-xs text-slate-500 dark:text-slate-300/70">
                  <th className="px-4 py-3 font-semibold">Flag</th>
                  <th className="px-4 py-3 font-semibold">Target</th>
                  <th className="px-4 py-3 font-semibold">Reason</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Moderator</th>
                  <th className="px-4 py-3 font-semibold">Reporter</th>
                  <th className="px-4 py-3 font-semibold">Reviewed at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {rows.map((r) => (
                  <tr key={r.flagId} className="text-sm hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold">#{r.flagId}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {pill(typePill(r.targetType), r.targetType)}
                        {pill("bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-100", `ID: ${r.targetId}`)}
                      </div>
                      {r.reviewNote ? (
                        <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-300/80 line-clamp-2">
                          Note: {r.reviewNote}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{r.reason || "—"}</td>
                    <td className="px-4 py-3">{pill(actionPill(r.actionTaken), r.actionTaken || "—")}</td>
                    <td className="px-4 py-3">{r.moderatorName || "—"}</td>
                    <td className="px-4 py-3">{r.reporterName || "—"}</td>
                    <td className="px-4 py-3">{formatDate(r.reviewedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !err && total > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm dark:border-white/10">
            <p className="text-xs text-slate-500 dark:text-slate-300/70">
              Page <b>{page}</b> of <b>{pages}</b>
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - limit))}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60
                dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              <button
                disabled={offset + limit >= total}
                onClick={() => setOffset((o) => o + limit)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60
                dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}