import { useEffect, useState } from "react";
import { api } from "../../api/api";
import { useNavigate } from "react-router-dom";
import ProfileSkeleton from "../../components/UIskeletons/ProfileSkeleton";
import DiscoverListSkeleton from "../../components/UIskeletons/ProfileSkeleton";

export default function BookmarksPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadApplied() {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/practices/applied");
        setItems(res.data.applied || []);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load bookmarks");
      } finally {
        setLoading(false);
      }
    }

    loadApplied();
  }, []);

  if (loading) return <DiscoverListSkeleton count={6} />;
  if (error)
    return (
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2 p-3">
          <h1 className="font-heading text-2xl font-semibold">Bookmarks</h1>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300/80">
            Error getting your bookmarks<b> Check your internet connection and try again</b>.
          </div>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 p-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Bookmarks</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300/70">
            Practices you applied, so you can return later and submit outcomes.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300/80">
          No bookmarked practices yet. Open a practice and click <b>Apply</b>.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => {
            const status = it.appliedStatus || it.status || "APPLIED";
            const isReported = status === "REPORTED";

            return (
              <div
                key={it.appliedId}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left: info */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{it.title}</p>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold
                        ${
                          isReported
                            ? "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                        }`}
                    >
                      {isReported ? "REPORTED" : "APPLIED"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                    by {it.authorName || "Community member"}
                  </p>

                  {it.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-300/60">
                      {it.description}
                    </p>
                  )}
                </div>

                {/* Right: actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/app/practices/${it.practiceId}`)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50
                               dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  >
                    View
                  </button>

                  {!isReported ? (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/app/practices?submitOutcomeFor=${it.practiceId}&from=bookmarks`,
                        )
                      }
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Submit outcome
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-600
                                 dark:bg-white/10 dark:text-slate-300"
                      title="You already submitted an outcome for this practice"
                    >
                      Reported ✔
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
