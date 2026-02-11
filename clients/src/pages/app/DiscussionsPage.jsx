import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api/api";

export default function DiscussionsPage() {
  const [searchParams] = useSearchParams();
  const practiceId = searchParams.get("practiceId"); // thread mode if exists

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, []);

  // Thread data
  const [practiceInfo, setPracticeInfo] = useState(null); // title, authorName
  const [comments, setComments] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [errorThread, setErrorThread] = useState("");

  // Discussion list data (for /app/discussions without practiceId)
  const [threads, setThreads] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [errorList, setErrorList] = useState("");

  // Fetch: thread (chat)
  useEffect(() => {
    async function loadThread() {
      if (!practiceId) return;

      try {
        setLoadingThread(true);
        setErrorThread("");

        // 1) Practice header info
        const practiceRes = await api.get(`/practices/${practiceId}`);
        const p = practiceRes.data?.practice ? practiceRes.data.practice : practiceRes.data;
        setPracticeInfo({
          title: p?.title || "Practice discussion",
          authorName: p?.author?.fullName || "Community member",
        });

        // 2) Comments
        const res = await api.get(`/practices/${practiceId}/comments`);

        // Robust extraction (prevents “only 1 comment” due to shape mismatch)
        const raw = res.data;
        let data =
          (Array.isArray(raw) && raw) ||
          raw?.comments ||
          raw?.data ||
          raw?.results ||
          raw?.rows ||
          raw?.comments?.rows ||
          [];

        data = Array.isArray(data) ? data : [];

        setComments(data);
      } catch (err) {
        setErrorThread(err?.response?.data?.message || "Failed to load discussion");
      } finally {
        setLoadingThread(false);
      }
    }

    loadThread();
  }, [practiceId]);

  // Fetch: discussion list
  useEffect(() => {
    async function loadList() {
      if (practiceId) return;

      try {
        setLoadingList(true);
        setErrorList("");

        // ✅ This endpoint probably DOES NOT exist yet. We'll add it in backend.
        // Expected: list of practices user commented in, with last comment preview.
        const res = await api.get(`/discussions/mine`);
        const raw = res.data;

        const data =
          (Array.isArray(raw) && raw) ||
          raw?.threads ||
          raw?.data ||
          raw?.results ||
          [];

        setThreads(Array.isArray(data) ? data : []);
      } catch (err) {
        setErrorList(
          err?.response?.data?.message ||
            "Discussion list endpoint not available yet (we will add it)."
        );
      } finally {
        setLoadingList(false);
      }
    }

    loadList();
  }, [practiceId]);

  // ===== UI =====

  // List mode (no practiceId)
  if (!practiceId) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-semibold">Discussions</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300/70">
          Your discussion threads.
        </p>

        <div className="mt-6">
          {loadingList && <p className="text-slate-500">Loading discussions...</p>}
          {errorList && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              {errorList}
              <div className="mt-2 text-sm text-slate-500 dark:text-slate-300/70">
                For now: open a practice and click <b>Comments</b>.
              </div>
            </div>
          )}

          {!loadingList && !errorList && threads.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300/80">
              You haven’t commented on any practice yet.
            </div>
          )}

          {/* When backend endpoint exists, we’ll render thread list here */}
        </div>
      </div>
    );
  }

  // Thread mode (chat)
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <p className="text-xs text-slate-500 dark:text-slate-300/70">Discussion</p>
        <h1 className="mt-1 font-heading text-xl font-semibold">
          {practiceInfo?.title || "Practice discussion"}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
          by <span className="font-semibold">{practiceInfo?.authorName || "Community member"}</span>
        </p>
      </div>

      {loadingThread && <p className="text-slate-500">Loading messages...</p>}
      {errorThread && <p className="text-red-600">{errorThread}</p>}

      {/* Messages container */}
      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        {!loadingThread && !errorThread && comments.length === 0 && (
          <p className="text-slate-600 dark:text-slate-300/70">
            No messages yet. Be the first to comment.
          </p>
        )}

        {comments.map((c) => {
          const isMine = Number(c.userId) === Number(user?.userId);

          return (
            <div
              key={c.commentId}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  isMine
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100"
                }`}
              >
                {!isMine && (
                  <p className="mb-1 text-[11px] font-semibold opacity-80">
                    {c.authorName || "User"}
                  </p>
                )}

                <p className="whitespace-pre-wrap">{c.content}</p>

                <p className="mt-2 text-[10px] opacity-70">
                  {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Next step: message input box (we’ll add after we confirm list + thread works) */}
      <div className="mt-4 text-xs text-slate-500 dark:text-slate-300/70">
        Next: add message input + send (POST comment).
      </div>
    </div>
  );
}
