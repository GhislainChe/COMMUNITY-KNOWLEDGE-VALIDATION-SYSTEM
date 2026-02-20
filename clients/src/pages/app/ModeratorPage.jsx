// clients/src/pages/app/ModeratorPage.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/api";
import { ShieldAlert, RefreshCcw, X, CheckCircle2 } from "lucide-react";

function fmtDate(s) {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return "";
  }
}

const ACTIONS = [
  { value: "NO_ACTION", label: "No action (resolve only)" },
  { value: "HIDE_COMMENT", label: "Hide comment" },
  { value: "REMOVE_PRACTICE", label: "Remove practice" },
  { value: "REJECT_OUTCOME", label: "Reject outcome" },
];

export default function ModeratorPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // review modal
  const [openFlag, setOpenFlag] = useState(null);
  const [actionTaken, setActionTaken] = useState("NO_ACTION");
  const [reviewNote, setReviewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [saveMsg, setSaveMsg] = useState("");

  const pendingCount = useMemo(() => items.length, [items]);

  async function loadFlags() {
    try {
      setLoading(true);
      setErr("");
      const res = await api.get("/moderation/flags");
      setItems(res.data?.flags || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load moderation flags.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFlags();
  }, []);

  function openReview(flag) {
    setOpenFlag(flag);
    setActionTaken("NO_ACTION");
    setReviewNote("");
    setSaveErr("");
    setSaveMsg("");
  }

  function closeReview() {
    setOpenFlag(null);
    setSaveErr("");
    setSaveMsg("");
  }

  async function submitReview(e) {
    e.preventDefault();
    setSaveErr("");
    setSaveMsg("");

    if (!openFlag?.flagId) return;

    // Optional: basic validation depending on type
    if (actionTaken === "HIDE_COMMENT" && openFlag.targetType !== "COMMENT") {
      setSaveErr("HIDE_COMMENT can only be used for COMMENT reports.");
      return;
    }
    if (actionTaken === "REMOVE_PRACTICE" && openFlag.targetType !== "PRACTICE") {
      setSaveErr("REMOVE_PRACTICE can only be used for PRACTICE reports.");
      return;
    }
    if (actionTaken === "REJECT_OUTCOME" && openFlag.targetType !== "OUTCOME") {
      setSaveErr("REJECT_OUTCOME can only be used for OUTCOME reports.");
      return;
    }

    try {
      setSaving(true);

      await api.patch(`/moderation/flags/${openFlag.flagId}`, {
        actionTaken,
        reviewNote: reviewNote.trim() || null,
      });

      setSaveMsg("Reviewed and resolved ");

      // remove from list immediately (so UI feels fast)
      setItems((prev) => prev.filter((f) => f.flagId !== openFlag.flagId));

      setTimeout(() => {
        closeReview();
      }, 450);
    } catch (e) {
      setSaveErr(e?.response?.data?.message || "Failed to review flag.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-3 space-y-4 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/15 text-amber-800 dark:text-amber-200">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold">Moderator Dashboard</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300/70">
                Pending reports that require review.
              </p>
            </div>
          </div>

          <button
            onClick={loadFlags}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50
            dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="mt-3 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-100">
            Pending: {pendingCount}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:text-slate-200">
          Reports
        </div>

        {loading && <p className="p-4 text-slate-500">Loading...</p>}
        {err && <p className="p-4 text-red-600">{err}</p>}

        {!loading && !err && items.length === 0 && (
          <div className="p-4 text-sm text-slate-600 dark:text-slate-300/70">
            No pending reports
          </div>
        )}

        {!loading && !err && items.length > 0 && (
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {items.map((f) => (
              <div key={f.flagId} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-100">
                        #{f.flagId}
                      </span>
                      <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                        {f.targetType}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-100">
                        Reason: {f.reason}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-300/70">
                        {fmtDate(f.createdAt)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-semibold">Target ID:</span> {f.targetId}{" "}
                      <span className="text-slate-400">•</span>{" "}
                      <span className="font-semibold">Reporter:</span>{" "}
                      {f.reporterUserId}
                    </p>

                    {f.details && (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300/80">
                        {f.details}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => openReview(f)}
                    className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {openFlag && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeReview}
          />

          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#0b1220]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4 dark:border-white/10">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-300/70">
                  Review report #{openFlag.flagId}
                </p>
                <p className="font-heading text-lg font-bold">Moderation Action</p>
              </div>

              <button
                type="button"
                onClick={closeReview}
                className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50
                dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-100">
                    {openFlag.targetType}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-100">
                    Target ID: {openFlag.targetId}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-100">
                    Reason: {openFlag.reason}
                  </span>
                </div>
                {openFlag.details && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300/80">
                    {openFlag.details}
                  </p>
                )}
              </div>

              {saveErr && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                  {saveErr}
                </div>
              )}
              {saveMsg && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {saveMsg}
                  </div>
                </div>
              )}

              <form onSubmit={submitReview} className="space-y-3">
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
                    {ACTIONS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>

                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300/70">
                    Choose a valid action for the target type.
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
                    placeholder="Explain why you took this action..."
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={closeReview}
                    className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50
                    dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                  >
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
