import { useMemo, useState } from "react";
import { api } from "../api/api";
import { X, Flag } from "lucide-react";

const REASONS = [
  { value: "SPAM", label: "Spam / Ads" },
  { value: "FALSE_INFO", label: "False information" },
  { value: "ABUSIVE", label: "Abusive / Hate" },
  { value: "OTHER", label: "Other" },
];

export default function ReportModal({
  open,
  onClose,
  targetType, // "PRACTICE" | "COMMENT" | "OUTCOME"
  targetId,
  title = "Report content",
  subtitle = "",
  defaultReason = "FALSE_INFO",
}) {
  const [reason, setReason] = useState(defaultReason);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const canSubmit = useMemo(() => {
    return !!targetType && Number(targetId) > 0 && !!reason && !loading;
  }, [targetType, targetId, reason, loading]);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");

    try {
      setLoading(true);

      await api.post("/flags", {
        targetType,
        targetId: Number(targetId),
        reason,
        details: details.trim() || null,
      });

      setMsg("Report submitted ✅");
      setTimeout(() => {
        onClose?.();
      }, 450);
    } catch (e2) {
      const status = e2?.response?.status;

      if (status === 409) {
        setMsg("You already reported this item (pending review).");
        setTimeout(() => onClose?.(), 700);
        return;
      }

      setErr(e2?.response?.data?.message || "Failed to submit report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0b1220]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 dark:border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-200">
                <Flag className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-heading text-lg font-bold">{title}</p>
                {subtitle ? (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-300/70">
              Target: <b>{targetType}</b> • ID: <b>{targetId}</b>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50
            dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {err && (
            <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700
            dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
              {err}
            </div>
          )}
          {msg && (
            <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800
            dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
              {msg}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                Extra details (optional)
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explain what is wrong so moderators can act faster..."
                className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50
                dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full sm:w-auto rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
              >
                {loading ? "Sending..." : "Submit report"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}