import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/api";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  X,
  ExternalLink,
  FileText,
} from "lucide-react";

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
  if (t === "PRACTICE")
    return "bg-emerald-600/15 text-emerald-800 dark:text-emerald-200";
  if (t === "COMMENT")
    return "bg-indigo-600/15 text-indigo-800 dark:text-indigo-200";
  if (t === "OUTCOME")
    return "bg-amber-600/15 text-amber-800 dark:text-amber-200";
  return "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-100";
}

function actionPill(action) {
  const a = String(action || "").toUpperCase();
  if (a === "HIDE_COMMENT")
    return "bg-indigo-600/15 text-indigo-800 dark:text-indigo-200";
  if (a === "HIDE_PRACTICE" || a === "REMOVE_PRACTICE")
    return "bg-rose-600/15 text-rose-800 dark:text-rose-200";
  if (a === "REJECT_OUTCOME")
    return "bg-amber-600/15 text-amber-800 dark:text-amber-200";
  if (a === "NO_ACTION")
    return "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-100";
  return "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-100";
}

function isReversibleAction(action) {
  const a = String(action || "").toUpperCase();
  return (
    a === "HIDE_COMMENT" ||
    a === "HIDE_PRACTICE" ||
    a === "REMOVE_PRACTICE" ||
    a === "REJECT_OUTCOME"
  );
}

function escapeCsv(val) {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

function downloadCsv(filename, rows) {
  const headers = [
    "flagId",
    "targetType",
    "targetId",
    "reason",
    "actionTaken",
    "reviewNote",
    "moderatorName",
    "reporterName",
    "reviewedAt",
    "isUndone",
    "undoneAt",
    "undoNote",
  ];

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
  const pages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  );

  // ===== Details modal state =====
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsErr, setDetailsErr] = useState("");

  // Undo inside modal
  const [undoNote, setUndoNote] = useState("");
  const [undoErr, setUndoErr] = useState("");
  const [undoingFlagId, setUndoingFlagId] = useState(null);

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

  function onDownload() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`audit-log-${stamp}.csv`, rows);
  }

  async function openDetailsModal(r) {
    setSelectedRow(r);
    setDetailsOpen(true);

    setDetails(null);
    setDetailsErr("");
    setUndoErr("");
    setUndoNote("");
    setDetailsLoading(true);

    try {
      // Reuse the same preview/details endpoint you use on ModerationPage
      const res = await api.get(`/moderation/flags/${r.flagId}/details`);
      setDetails(res.data || null);
    } catch (e) {
      setDetailsErr(
        e?.response?.data?.message ||
          "Details endpoint not available. Implement GET /moderation/flags/:flagId/details.",
      );
      setDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeDetailsModal() {
    setDetailsOpen(false);
    setSelectedRow(null);
    setDetails(null);
    setDetailsErr("");
    setUndoErr("");
    setUndoNote("");
    setUndoingFlagId(null);
    setDetailsLoading(false);
  }

  async function confirmUndo() {
    if (!selectedRow?.flagId) return;

    try {
      setUndoErr("");
      setUndoingFlagId(selectedRow.flagId);

      await api.post(`/moderation/flags/${selectedRow.flagId}/undo`, {
        undoNote: undoNote.trim() || null,
      });

      // Update audit row so UI shows UNDONE immediately
      setRows((prev) =>
        prev.map((x) =>
          x.flagId === selectedRow.flagId
            ? {
                ...x,
                isUndone: 1,
                undoneAt: new Date().toISOString(),
                undoNote: undoNote.trim() || null,
              }
            : x,
        ),
      );

      // Optional: also update modal selectedRow
      setSelectedRow((prev) =>
        prev
          ? {
              ...prev,
              isUndone: 1,
              undoneAt: new Date().toISOString(),
              undoNote: undoNote.trim() || null,
            }
          : prev,
      );

      // Reload details (so content status updates)
      try {
        const res = await api.get(
          `/moderation/flags/${selectedRow.flagId}/details`,
        );
        setDetails(res.data || null);
      } catch {
        // ignore
      }

      setUndoingFlagId(null);
    } catch (e) {
      setUndoErr(e?.response?.data?.message || "Failed to undo action.");
      setUndoingFlagId(null);
    }
  }

  const modalTargetPracticeId =
    details?.practice?.practiceId ||
    details?.comment?.practiceId ||
    details?.outcome?.practiceId ||
    null;

  const canUndo =
    selectedRow &&
    Number(selectedRow.isUndone || 0) !== 1 &&
    isReversibleAction(selectedRow.actionTaken);

  const undone = selectedRow && Number(selectedRow.isUndone || 0) === 1;

  return (
    <div className="p-3 space-y-4 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-600 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-heading text-xl font-bold">
                  Audit Log
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                  Click a row to view full details and undo.
                </p>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500 dark:text-slate-300/70">
              Showing <b>{rows.length}</b> of <b>{total}</b> results
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              onClick={onDownload}
              disabled={rows.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60
              dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 sm:w-auto"
              title="Download as CSV (opens in Excel)"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>

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

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <div className="relative w-full md:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by note, moderator, reporter, IDs…"
                className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm outline-none
                focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
              />
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 md:w-auto">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none
                hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 md:w-[150px]"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last 365 days</option>
              </select>

              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none
                hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 md:w-[160px]"
              >
                <option value="ALL">All types</option>
                <option value="PRACTICE">Practice</option>
                <option value="COMMENT">Comment</option>
                <option value="OUTCOME">Outcome</option>
              </select>

              <select
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none
                hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 md:w-[190px]"
              >
                <option value="ALL">All actions</option>
                <option value="NO_ACTION">No action</option>
                <option value="HIDE_COMMENT">Hide comment</option>
                <option value="HIDE_PRACTICE">Hide practice</option>
                <option value="REMOVE_PRACTICE">Remove practice</option>
                <option value="REJECT_OUTCOME">Reject outcome</option>
              </select>
            </div>
          </div>

          <button
            onClick={applySearch}
            className="w-full rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 lg:w-[140px]"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5 overflow-hidden">
        {loading ? (
          <div className="p-4 text-sm text-slate-500 dark:text-slate-300/70">
            Loading…
          </div>
        ) : err ? (
          <div className="p-4 text-sm text-red-600">{err}</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-slate-500 dark:text-slate-300/70">
            No results.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left">
              <thead className="bg-slate-50 dark:bg-white/5">
                <tr className="text-xs text-slate-500 dark:text-slate-300/70">
                  <th className="px-4 py-3 font-semibold">Target</th>
                  <th className="px-4 py-3 font-semibold">Reason</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Moderator</th>
                  <th className="px-4 py-3 font-semibold">Reporter</th>
                  <th className="px-4 py-3 font-semibold">Reviewed at</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {rows.map((r) => {
                  const undone = Number(r.isUndone || 0) === 1;

                  return (
                    <tr
                      key={r.flagId}
                      className="text-sm hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                      onClick={() => openDetailsModal(r)}
                      title="Click to view details"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {pill(typePill(r.targetType), r.targetType)}
                          {pill(
                            "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-100",
                            `ID: ${r.targetId}`,
                          )}
                          {undone
                            ? pill(
                                "bg-emerald-600/15 text-emerald-800 dark:text-emerald-200",
                                "UNDONE",
                              )
                            : null}
                          {pill(
                            "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-100",
                            `Flag: #${r.flagId}`,
                          )}
                        </div>

                        {r.reviewNote ? (
                          <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-300/80 line-clamp-2">
                            Note: {r.reviewNote}
                          </p>
                        ) : null}

                        {undone && (r.undoNote || r.undoneAt) ? (
                          <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-300/70 line-clamp-2">
                            Undo: {r.undoNote || "—"}{" "}
                            {r.undoneAt ? `• ${formatDate(r.undoneAt)}` : ""}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-4 py-3">{r.reason || "—"}</td>

                      <td className="px-4 py-3">
                        {pill(actionPill(r.actionTaken), r.actionTaken || "—")}
                      </td>

                      <td className="px-4 py-3">{r.moderatorName || "—"}</td>
                      <td className="px-4 py-3">{r.reporterName || "—"}</td>
                      <td className="px-4 py-3">{formatDate(r.reviewedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !err && total > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200 px-4 py-3 text-sm dark:border-white/10">
            <p className="text-xs text-slate-500 dark:text-slate-300/70">
              Page <b>{page}</b> of <b>{pages}</b>
            </p>

            <div className="flex items-center justify-end gap-2">
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

      {/* ===== Details Modal ===== */}
      {detailsOpen && selectedRow && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeDetailsModal}
          />

          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0b1220]">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 dark:border-white/10">
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-300/70">
                  Flag #{selectedRow.flagId}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {pill(typePill(selectedRow.targetType), selectedRow.targetType)}
                  {pill(
                    "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-100",
                    `Target ID: ${selectedRow.targetId}`,
                  )}
                  {pill(
                    actionPill(selectedRow.actionTaken),
                    selectedRow.actionTaken || "—",
                  )}
                  {undone
                    ? pill(
                        "bg-emerald-600/15 text-emerald-800 dark:text-emerald-200",
                        "UNDONE",
                      )
                    : null}
                </div>

                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300/70">
                  Reason:{" "}
                  <span className="font-semibold">
                    {selectedRow.reason || "—"}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetailsModal}
                className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50
                dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto p-4 space-y-3">
              {/* Meta */}
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-300/70">
                    Moderator
                  </p>
                  <p className="mt-1 font-semibold">
                    {selectedRow.moderatorName || "—"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300/70">
                    Reviewed at: {formatDate(selectedRow.reviewedAt)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-300/70">
                    Reporter
                  </p>
                  <p className="mt-1 font-semibold">
                    {selectedRow.reporterName || "—"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300/70">
                    Note: {selectedRow.reviewNote || "—"}
                  </p>
                </div>
              </div>

              {/* Content preview */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-300/70">
                    Content details
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    {modalTargetPracticeId ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              `/app/practices/${modalTargetPracticeId}`,
                              "_blank",
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50
                          dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open practice
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              `/app/discussions?practiceId=${modalTargetPracticeId}`,
                              "_blank",
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50
                          dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open discussion
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {detailsLoading ? (
                  <p className="mt-2 text-slate-500 dark:text-slate-300/70">
                    Loading details…
                  </p>
                ) : detailsErr ? (
                  <p className="mt-2 text-red-600">{detailsErr}</p>
                ) : !details ? (
                  <p className="mt-2 text-slate-500 dark:text-slate-300/70">
                    No details returned.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {/* PRACTICE */}
                    {details.practice && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <p className="font-semibold">
                            {details.practice.title}
                          </p>
                        </div>
                        <p className="mt-2 text-sm">
                          {details.practice.description}
                        </p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-300/70">
                          Status: <b>{details.practice.status}</b> • By{" "}
                          <b>{details.practice.authorName || "—"}</b>
                        </p>
                      </div>
                    )}

                    {/* COMMENT */}
                    {details.comment && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                        <p className="font-semibold">
                          Comment by {details.comment.authorName || "—"}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm">
                          {details.comment.content}
                        </p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-300/70">
                          Status: <b>{details.comment.status}</b>
                        </p>
                      </div>
                    )}

                    {/* OUTCOME */}
                    {details.outcome && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                        <p className="font-semibold">Outcome report</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm">
                          {details.outcome.comment}
                        </p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-300/70">
                          Status: <b>{details.outcome.status}</b>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Undo section */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-300/70">
                  Undo / Revert
                </p>

                {undone ? (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300/80">
                    This action has already been undone.
                    {selectedRow.undoneAt
                      ? ` (Undone at ${formatDate(selectedRow.undoneAt)})`
                      : ""}
                  </p>
                ) : !canUndo ? (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300/80">
                    This action is not reversible.
                  </p>
                ) : (
                  <>
                    {undoErr && (
                      <div className="mt-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                        {undoErr}
                      </div>
                    )}

                    <label className="mt-2 block text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                      Undo note (optional)
                    </label>
                    <textarea
                      value={undoNote}
                      onChange={(e) => setUndoNote(e.target.value)}
                      rows={3}
                      className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                      focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
                      placeholder="Why are you undoing this action?"
                    />

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <button
                        type="button"
                        onClick={confirmUndo}
                        disabled={undoingFlagId === selectedRow.flagId}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                      >
                        <RotateCcw className="h-4 w-4" />
                        {undoingFlagId === selectedRow.flagId
                          ? "Undoing..."
                          : "Confirm undo"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}