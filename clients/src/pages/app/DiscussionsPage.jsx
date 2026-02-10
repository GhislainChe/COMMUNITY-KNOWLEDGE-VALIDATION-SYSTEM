import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api/api";

export default function DiscussionsPage() {
  const [searchParams] = useSearchParams();
  const practiceId = searchParams.get("practiceId"); // e.g. 3

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!practiceId) return;

      try {
        setLoading(true);
        setError("");

        // ✅ CHANGE THIS PATH to match your backend route
        const res = await api.get(`/practices/${practiceId}/comments`);

        // backend might return { comments: [...] } OR just [...]
        const data = Array.isArray(res.data) ? res.data : res.data.comments || [];
        setComments(data);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load comments");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [practiceId]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Discussions</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300/70">
        Practice discussion threads.
      </p>

      {!practiceId ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300/80">
          Open a practice and click <b>Comments</b> to view its discussion.
        </div>
      ) : (
        <div className="mt-6">
          {loading && <p className="text-slate-500">Loading comments...</p>}
          {error && <p className="text-red-600">{error}</p>}

          {!loading && !error && comments.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300/80">
              No comments yet. Be the first to comment.
            </div>
          )}

          <div className="space-y-3">
            {comments.map((c) => (
              <div
                key={c.commentId}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <p className="text-sm text-slate-800 dark:text-slate-100">
                  {c.content}
                </p>

                <div className="mt-2 text-xs text-slate-500 dark:text-slate-300/70">
                  by <span className="font-semibold">{c.authorName || "User"}</span>{" "}
                  • {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
