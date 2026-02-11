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

  // Composer (input)
  const [message, setMessage] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");

  // Reply state
  const [replyTo, setReplyTo] = useState(null); // { commentId, authorName, content }

  // Auto-scroll to bottom
  const bottomRef = useRef(null);
  const scrollToBottom = (behavior = "smooth") =>
    bottomRef.current?.scrollIntoView({ behavior });

  useEffect(() => {
    if (!practiceId) return;
    const t = setTimeout(() => scrollToBottom("auto"), 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceId]);

  useEffect(() => {
    if (!practiceId) return;
    const t = setTimeout(() => scrollToBottom("smooth"), 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments.length]);

  // Fetch: thread (chat)
  useEffect(() => {
    async function loadThread() {
      if (!practiceId) return;

      try {
        setLoadingThread(true);
        setErrorThread("");

        // 1) Practice header info
        const practiceRes = await api.get(`/practices/${practiceId}`);
        const p = practiceRes.data?.practice
          ? practiceRes.data.practice
          : practiceRes.data;

        setPracticeInfo({
          title: p?.title || "Practice discussion",
          authorName: p?.author?.fullName || "Community member",
        });

        // 2) Comments
        const res = await api.get(`/practices/${practiceId}/comments`);
        const raw = res.data;

        let data =
          (Array.isArray(raw) && raw) ||
          raw?.comments ||
          raw?.data ||
          raw?.results ||
          raw?.rows ||
          [];

        data = Array.isArray(data) ? data : [];

        const flattened = flattenCommentsForChat(data);
        setComments(flattened);
      } catch (err) {
        setErrorThread(
          err?.response?.data?.message || "Failed to load discussion"
        );
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

        // You can create this endpoint later
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

  async function handleSend() {
    if (!practiceId) return;

    const text = message.trim();
    if (!text) return;

    if (text.length > 500) {
      setSendError("Message must be 500 characters or less.");
      return;
    }

    setSendError("");

    // Optimistic message (shows instantly)
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      commentId: tempId,
      userId: user?.userId,
      parentCommentId: replyTo ? replyTo.commentId : null,
      content: text,
      createdAt: new Date().toISOString(),
      authorName: "You",
      _optimistic: true,
    };

    setComments((prev) => [...prev, optimistic]);
    setMessage("");

    try {
      setSendLoading(true);

      let res;
      if (replyTo) {
        res = await api.post(
          `/practices/${practiceId}/comments/${replyTo.commentId}/replies`,
          { content: text }
        );
      } else {
        res = await api.post(`/practices/${practiceId}/comments`, {
          content: text,
        });
      }

      // Replace temp message with real commentId if returned
      const realId = res.data?.commentId;

      if (realId) {
        setComments((prev) =>
          prev.map((c) =>
            c.commentId === tempId
              ? { ...c, commentId: realId, _optimistic: false }
              : c
          )
        );
      } else {
        setComments((prev) =>
          prev.map((c) =>
            c.commentId === tempId ? { ...c, _optimistic: false } : c
          )
        );
      }

      setReplyTo(null);
    } catch (err) {
      // Remove optimistic message on failure
      setComments((prev) => prev.filter((c) => c.commentId !== tempId));

      setSendError(err?.response?.data?.message || "Failed to send message.");
    } finally {
      setSendLoading(false);
    }
  }

  function onKeyDown(e) {
    // Enter sends, Shift+Enter new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

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
          {loadingList && (
            <p className="text-slate-500">Loading discussions...</p>
          )}
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
            const displayName =
              c.authorName ||
              (isMine ? "You" : `User ${c.userId ?? ""}`) ||
              "User";

            return (
              <div
                key={c.commentId}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[85%] sm:max-w-[70%]">
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
                      c._optimistic ? "opacity-80" : "",
                    ].join(" ")}
                  >
                    {/* Reply indicator */}
                    {c.parentCommentId ? (
                      <div className="mb-2 inline-flex rounded-lg bg-black/10 px-2 py-1 text-[10px] font-semibold opacity-80 dark:bg-white/10">
                        Reply
                      </div>
                    ) : null}

                    <p className="whitespace-pre-wrap leading-relaxed">
                      {c.content}
                    </p>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      {!isMine ? (
                        <button
                          type="button"
                          onClick={() =>
                            setReplyTo({
                              commentId: c.commentId,
                              authorName: displayName,
                              content: c.content,
                            })
                          }
                          className="text-[11px] font-semibold text-emerald-600 hover:underline"
                        >
                          Reply
                        </button>
                      ) : (
                        <span />
                      )}

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

      {/* Composer */}
      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
        {sendError && (
          <p className="mb-2 text-sm text-red-600">{sendError}</p>
        )}

        {/* Reply preview */}
        {replyTo && (
          <div className="mb-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs dark:border-emerald-800/40 dark:bg-emerald-950/30">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                  Replying to {replyTo.authorName}
                </p>
                <p className="mt-1 line-clamp-2 text-slate-600 dark:text-slate-300/70">
                  {replyTo.content}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-xs font-semibold text-slate-500 hover:text-red-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder={
              replyTo
                ? "Write a reply… (Enter to send, Shift+Enter for new line)"
                : "Write a message… (Enter to send, Shift+Enter for new line)"
            }
            className="min-h-[44px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                       focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={sendLoading || !message.trim()}
            className="h-[44px] rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {sendLoading ? "Sending..." : replyTo ? "Reply" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * If backend returns nested tree {replies: [...]},
 * flatten it in chronological order for chat rendering.
 */
function flattenCommentsForChat(items) {
  const hasReplies = items.some(
    (x) => Array.isArray(x?.replies) && x.replies.length > 0
  );
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
        authorName: node.authorName,
      });
      if (node.replies?.length) walk(node.replies);
    }
  };
  walk(items);

  out.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  return out;
}

function formatTime(createdAt) {
  if (!createdAt) return "";
  try {
    return new Date(createdAt).toLocaleString();
  } catch {
    return "";
  }
}
