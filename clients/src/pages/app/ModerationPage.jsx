// clients/src/pages/app/ModerationPage.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/api";
import {
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  XCircle,
  EyeOff,
  Trash2,
  Ban,
  MessageSquareWarning,
  FileSearch,
} from "lucide-react";

function formatDate(dt) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt || "";
  }
}

function reasonBadge(reason) {
  const r = (reason || "").toUpperCase();
  if (r === "ABUSIVE") return "bg-red-500/15 text-red-800 dark:text-red-200";
  if (r === "FALSE_INFO")
    return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
  if (r === "SPAM")
    return "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-100";
  return "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-100";
}

function typePill(type) {
  const t = (type || "").toUpperCase();
  if (t === "PRACTICE")
    return "bg-emerald-600/15 text-emerald-800 dark:text-emerald-200";
  if (t === "COMMENT")
    return "bg-indigo-600/15 text-indigo-800 dark:text-indigo-200";
  if (t === "OUTCOME")
    return "bg-amber-600/15 text-amber-800 dark:text-amber-200";
  return "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-100";
}

function actionOptionsFor(targetType) {
  const t = (targetType || "").toUpperCase();

  const base = [{ value: "NO_ACTION", label: "No action" }];

  if (t === "COMMENT")
    base.push({ value: "HIDE_COMMENT", label: "Hide comment" });

  if (t === "PRACTICE")
    base.push({ value: "HIDE_PRACTICE", label: "Hide practice" });

  if (t === "OUTCOME")
    base.push({ value: "REJECT_OUTCOME", label: "Reject outcome" });

  return base;
}

function actionIcon(action) {
  switch (action) {
    case "NO_ACTION":
      return <CheckCircle2 className="h-4 w-4" />;
    case "HIDE_COMMENT":
      return <EyeOff className="h-4 w-4" />;
    case "HIDE_PRACTICE":
      return <Trash2 className="h-4 w-4" />;
    case "REJECT_OUTCOME":
      return <Ban className="h-4 w-4" />;
    default:
      return <XCircle className="h-4 w-4" />;
  }
}

function SkeletonRow() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-white/10" />
        <div className="h-6 w-24 rounded-full bg-slate-200 dark:bg-white/10" />
        <div className="h-6 w-28 rounded-full bg-slate-200 dark:bg-white/10" />
        <div className="ml-auto h-4 w-32 rounded bg-slate-200 dark:bg-white/10" />
      </div>
      <div className="h-4 w-[85%] rounded bg-slate-200 dark:bg-white/10" />
      <div className="h-4 w-[60%] rounded bg-slate-200 dark:bg-white/10" />
      <div className="h-3 w-40 rounded bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

export default function ModerationPage() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState("");

  // review modal state
  const [openFlag, setOpenFlag] = useState(null);
  const [actionTaken, setActionTaken] = useState("NO_ACTION");
  const [reviewNote, setReviewNote] = useState("");

  // optional preview (won’t break if endpoint not available)
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [saveMsg, setSaveMsg] = useState("");

  async function loadFlags() {
    try {
      setLoading(true);
      setPageErr("");
      const res = await api.get("/moderation/flags");
      setFlags(res.data?.flags || []);
    } catch (err) {
      setPageErr(
        err?.response?.data?.message || "Failed to load moderation flags.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFlags();
  }, []);

  const pendingCount = useMemo(() => flags.length, [flags]);

  async function tryLoadPreview(flagId) {
    // Optional endpoint (add later): GET /api/moderation/flags/:flagId/details
    try {
      setPreviewLoading(true);
      setPreview(null);
      const res = await api.get(`/moderation/flags/${flagId}/details`);
      setPreview(res.data || null);
    } catch {
      // ignore if not implemented
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  function openReviewModal(flag) {
    setOpenFlag(flag);
    setActionTaken("NO_ACTION");
    setReviewNote("");
    setSaveErr("");
    setSaveMsg("");
    setPreview(null);
    if (flag?.flagId) tryLoadPreview(flag.flagId);
  }

  function closeReviewModal() {
    setOpenFlag(null);
    setSaveErr("");
    setSaveMsg("");
    setSaving(false);
    setPreview(null);
    setPreviewLoading(false);
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!openFlag?.flagId) return;

    try {
      setSaving(true);
      setSaveErr("");
      setSaveMsg("");

      await api.patch(`/moderation/flags/${openFlag.flagId}`, {
        actionTaken,
        reviewNote: reviewNote.trim() || null,
      });

      setSaveMsg("Resolved ✅");
      setFlags((prev) => prev.filter((f) => f.flagId !== openFlag.flagId));

      setTimeout(() => {
        closeReviewModal();
      }, 450);
    } catch (err) {
      setSaveErr(err?.response?.data?.message || "Failed to submit review.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-3 space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="h-6 w-40 rounded bg-slate-200 dark:bg-white/10" />
          <div className="mt-2 h-4 w-72 rounded bg-slate-200 dark:bg-white/10" />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
            <div className="h-4 w-32 rounded bg-slate-200 dark:bg-white/10" />
          </div>
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </div>
      </div>
    );
  }

  if (pageErr) {
    return <p className="p-4 text-red-600">{pageErr}</p>;
  }

  return (
    <div className="p-3 space-y-4 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-600 text-white">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-heading text-xl font-bold">
                  Moderation
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                  Review reported content and take action.
                </p>
              </div>
            </div>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-600/15 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              Pending reports: {pendingCount}
            </div>
          </div>

          <button
            onClick={loadFlags}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50
            dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Pending flags
          </p>
          <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300/70">
            <MessageSquareWarning className="h-4 w-4" />
            API returns newest first
          </div>
        </div>

        {flags.length === 0 ? (
          <div className="p-4 text-sm text-slate-600 dark:text-slate-300/80">
            No pending reports
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {flags.map((f) => (
              <button
                key={f.flagId}
                type="button"
                onClick={() => openReviewModal(f)}
                className="w-full text-left hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <div className="p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${typePill(
                        f.targetType,
                      )}`}
                    >
                      {f.targetType}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${reasonBadge(f.reason)}`}
                    >
                      {f.reason}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-100">
                      Target ID: {f.targetId}
                    </span>

                    <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-300/70">
                      {formatDate(f.createdAt)}
                    </span>
                  </div>

                  {f.details ? (
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      {f.details}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-300/70">
                      No extra details.
                    </p>
                  )}

                  <p className="text-xs text-slate-500 dark:text-slate-300/70">
                    Reporter: {f.reporterName} ({f.reporterEmail})
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {openFlag && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeReviewModal}
          />

          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0b1220]">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 dark:border-white/10">
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-300/70">
                  Review flag #{openFlag.flagId}
                </p>
                <p className="font-heading text-lg font-bold">
                  {openFlag.targetType} • Target {openFlag.targetId}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                  Reason:{" "}
                  <span className="font-semibold">{openFlag.reason}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={closeReviewModal}
                className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50
                dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">
              {/* Optional preview */}
              {/* Content Preview */}
              <div
                className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm
                dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              >
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-300/70">
                  Content preview
                </p>

                {previewLoading && (
                  <p className="mt-2 text-slate-500">Loading preview...</p>
                )}

                {!previewLoading && preview?.practice && (
                  <>
                    <p className="mt-2 font-semibold">
                      {preview.practice.title}
                    </p>
                    <p className="mt-1 text-sm">
                      {preview.practice.description}
                    </p>
                    <p className="mt-1 text-xs opacity-70">
                      Status: {preview.practice.status}
                    </p>
                  </>
                )}

                {!previewLoading && preview?.comment && (
                  <>
                    <p className="mt-2 font-semibold">
                      Comment by {preview.comment.authorName}
                    </p>
                    <p className="mt-1 text-sm">{preview.comment.content}</p>
                    <p className="mt-1 text-xs opacity-70">
                      Status: {preview.comment.status}
                    </p>
                  </>
                )}

                {!previewLoading && preview?.outcome && (
                  <>
                    <p className="mt-2 font-semibold">Outcome report</p>
                    <p className="mt-1 text-sm">{preview.outcome.comment}</p>
                    <p className="mt-1 text-xs opacity-70">
                      Status: {preview.outcome.status}
                    </p>
                  </>
                )}

                {!previewLoading &&
                  !preview?.practice &&
                  !preview?.comment &&
                  !preview?.outcome && (
                    <p className="mt-2 text-slate-500">No preview available.</p>
                  )}
              </div>
              {/* Quick actions */}
              <div className="mt-3 flex flex-wrap gap-2">
                {preview?.practice?.practiceId && (
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        `/app/practices/${preview.practice.practiceId}`,
                        "_blank",
                      )
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50
      dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Open practice
                  </button>
                )}

                {preview?.comment?.practiceId && (
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        `/app/discussions?practiceId=${preview.comment.practiceId}`,
                        "_blank",
                      )
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50
      dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Open discussion
                  </button>
                )}
              </div>

              {preview?.reporter && (
                <div
                  className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700
  dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-300/70">
                    Reporter
                  </p>
                  <p className="mt-1 font-semibold">
                    {preview.reporter.fullName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-300/70">
                    {preview.reporter.email}
                  </p>
                </div>
              )}

              {saveErr && (
                <div
                  className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700
                dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
                >
                  {saveErr}
                </div>
              )}

              {saveMsg && (
                <div
                  className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800
                dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
                >
                  {saveMsg}
                </div>
              )}

              <form onSubmit={submitReview} className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                    Action
                  </label>
                  <select
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                    focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
                  >
                    {actionOptionsFor(openFlag.targetType).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>

                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300/70">
                    Only actions valid for {openFlag.targetType} are shown.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                    Review note (optional)
                  </label>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                    focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
                    placeholder="Short note for audit trail..."
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={closeReviewModal}
                    className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50
                    dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                  >
                    {actionIcon(actionTaken)}
                    {saving ? "Saving..." : "Resolve"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
