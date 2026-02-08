import { useEffect, useState } from "react";
import { api } from "../../api/api";
import { useNavigate } from "react-router-dom";

export default function BookmarksPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadApplied() {
      try {
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

  if (loading) return <p className="text-slate-500">Loading bookmarks...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Bookmarks</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300/70">
            Practices you applied, so you can return later and submit outcomes.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300/80">
          No bookmarked practices yet. Open a practice and click <b>Apply</b>.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((it) => (
            <div
              key={it.appliedId}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
            >
              <div>
                <p className="font-semibold">{it.title}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300/70">
                  by {it.authorName} • status:{" "}
                  <span className="font-semibold">{it.appliedStatus}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/app/practices/${it.practiceId}`)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

