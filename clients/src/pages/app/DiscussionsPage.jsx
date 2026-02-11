import { useEffect, useMemo, useRef, useState } from "react";
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

  // Auto-scroll to bottom
  const bottomRef = useRef(null);
  useEffect(() => {
    if (!practiceId) return;
    // small delay so DOM renders first
    const t = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    return () => clearTimeout(t);
  }, [practiceId, comments.length]);

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

        // IMPORTANT: your backend returns: { practiceId, comments: [...] } (tree or flat)
        // We'll safely extract either a flat array or a tree and flatten it.
        const raw = res.data;

        let data =
          (Array.isArray(raw) && raw) ||
          raw?.comments ||
          raw?.data ||
          raw?.results ||
          raw?.rows ||
          [];

        data = Array.isArray(data) ? data : [];

        // If the backend returns tree structure with replies, flatten it for chat display
        const flattened = flattenCommentsForChat(data);
        setComments(flattened);
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

        // You said later you want: list of discussions of practices user commented in.
        // This endpoint likely doesn't exist yet.
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
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 mb-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#0b1220]/70">
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-300/70">
          Practice discussion
        </p>
        <h1 className="mt-1 font-heading text-lg font-bold sm:text-xl">
          {practiceInfo?.title || "Practice discussion"}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
          by{" "}
          <span className="font-semibold">
            {practiceInfo?.authorName || "Community member"}
          </span>
        </p>
      </div>

      {loadingThread && <p className="text-slate-500">Loading messages...</p>}
      {errorThread && <p className="text-red-600">{errorThread}</p>}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-4">
        {!loadingThread && !errorThread && comments.length === 0 && (
          <p className="text-slate-600 dark:text-slate-300/70">
            No messages yet. Be the first to comment.
          </p>
        )}

        <div className="space-y-3">
          {comments.map((c) => {
            const isMine = Number(c.userId) === Number(user?.userId);

            // Backend currently doesn't return authorName.
            // We'll show a safe fallback label.
            const displayName =
              c.authorName ||
              (isMine ? "You" : `User ${c.userId ?? ""}`) ||
              "User";

            return (
              <div
                key={c.commentId}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] sm:max-w-[70%]`}>
                  {/* Name above (only for others) */}
                  {!isMine && (
                    <p className="mb-1 pl-1 text-[11px] font-semibold text-slate-500 dark:text-slate-300/70">
                      {displayName}
                    </p>
                  )}

                  <div
                    className={[
                      "rounded-2xl px-4 py-3 text-sm shadow-sm",
                      isMine
                        ? "rounded-br-md bg-emerald-600 text-white"
                        : "rounded-bl-md bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100",
                    ].join(" ")}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{c.content}</p>

                    <div className="mt-2 flex items-center justify-end gap-2">
                      {c.parentCommentId ? (
                        <span className="text-[10px] opacity-70">
                          Reply
                        </span>
                      ) : null}
                      <span className="text-[10px] opacity-70">
                        {formatTime(c.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Placeholder for input box (we add next) */}
      <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-3 text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300/70">
        Next step: add message input + send (POST comment).
      </div>
    </div>
  );
}

/**
 * If backend returns nested tree {replies: [...]},
 * flatten it in chronological order for chat rendering.
 */
function flattenCommentsForChat(items) {
  // already flat?
  const hasReplies = items.some((x) => Array.isArray(x?.replies) && x.replies.length > 0);
  if (!hasReplies) return items;

  const out = [];
  const walk = (arr) => {
    for (const node of arr) {
      out.push({
        commentId: node.commentId,
        userId: node.userId,
        parentCommentId: node.parentCommentId ?? null,
        content: node.content,
        createdAt: node.createdAt,
        authorName: node.authorName, // may be undefined
      });
      if (node.replies?.length) walk(node.replies);
    }
  };
  walk(items);

  // ensure sorted by time (safest)
  out.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  return out;
}

function formatTime(createdAt) {
  if (!createdAt) return "";
  try {
    const d = new Date(createdAt);
    return d.toLocaleString();
  } catch {
    return "";
  }
}
