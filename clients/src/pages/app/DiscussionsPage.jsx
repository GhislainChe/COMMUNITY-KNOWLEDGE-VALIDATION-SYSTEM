import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../../api/api";
import DiscoverListSkeleton from "../../components/UIskeletons/ProfileSkeleton";

export default function DiscussionsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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

  // Sending
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Reply state
  const [replyTo, setReplyTo] = useState(null); // { commentId, userId, authorName, content }
  const [replyText, setReplyText] = useState("");

  // Discussion list data (for /app/discussions without practiceId)
  const [threads, setThreads] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [errorList, setErrorList] = useState("");

  const bottomRef = useRef(null);

  // Helper: flatten nested tree into linear list (keeps order: parent then replies)
  function flattenCommentsTree(nodes) {
    const out = [];
    const walk = (arr) => {
      for (const n of arr || []) {
        out.push(n);
        if (n.replies && n.replies.length) walk(n.replies);
      }
    };
    walk(nodes);
    return out;
  }

  // Map all comments for parent lookup (reply preview)
  const commentMap = useMemo(() => {
    const map = new Map();
    for (const c of comments) map.set(String(c.commentId), c);
    return map;
  }, [comments]);

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

        // Your backend returns: { practiceId, comments: roots }
        const roots = res?.data?.comments || [];
        const flat = flattenCommentsTree(roots);

        setComments(flat);
      } catch (err) {
        setErrorThread(
          err?.response?.data?.message || "Failed to load discussion",
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

        // If you haven't created this endpoint yet, you'll see the error message below.
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
            "Discussion list endpoint not available yet (we will add it).",
        );
      } finally {
        setLoadingList(false);
      }
    }

    loadList();
  }, [practiceId]);

  // Auto-scroll to bottom when messages load / change
  useEffect(() => {
    if (!practiceId) return;
    // small delay to let DOM paint
    const t = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => clearTimeout(t);
  }, [practiceId, comments.length]);

  // Reload thread (after send/reply)
  async function reloadThread() {
    if (!practiceId) return;
    const res = await api.get(`/practices/${practiceId}/comments`);
    const roots = res?.data?.comments || [];
    const flat = flattenCommentsTree(roots);
    setComments(flat);
  }

  async function handleSend() {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    try {
      setSending(true);
      await api.post(`/practices/${practiceId}/comments`, { content: trimmed });
      setMessage("");
      await reloadThread();
    } catch (err) {
      setErrorThread(err?.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleReplySend() {
    const trimmed = replyText.trim();
    if (!trimmed || sending || !replyTo) return;

    try {
      setSending(true);
      await api.post(
        `/practices/${practiceId}/comments/${replyTo.commentId}/replies`,
        { content: trimmed },
      );

      setReplyText("");
      setReplyTo(null);
      await reloadThread();
    } catch (err) {
      setErrorThread(err?.response?.data?.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (replyTo) handleReplySend();
      else handleSend();
    }
  }

  if (loadingList) return <DiscoverListSkeleton count={6} />;
  if (errorList)
    return (
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2 p-3">
          <h1 className="font-heading text-2xl font-semibold">Discussions</h1>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300/80">
            Error getting your discussions<b> Check your internet connection and try again</b>.
          </div>
        </div>
      </div>
    );

  // ===== UI =====

  // List mode (no practiceId)
  if (!practiceId) {
    return (
      <div className="p-3 ">
        <h1 className="font-heading text-2xl font-semibold">Discussions</h1>
        <p className="mt-0 text-slate-600 dark:text-slate-300/70">
          Your discussion threads.
        </p>

        <div className="mt-4 ">
          

          {!loadingList && !errorList && threads.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300/80">
              You haven’t commented on any practice yet.
            </div>
          )}

          {/* When backend endpoint exists, render thread list here */}
          {/* Thread list */}
          {!loadingList && !errorList && threads.length > 0 && (
            <div className="mt-6 space-y-3">
              {threads.map((t) => (
                <button
                  key={t.practiceId}
                  type="button"
                  onClick={() =>
                    navigate(`/app/discussions?practiceId=${t.practiceId}`)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:bg-slate-50
                   dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 dark:text-white">
                        {t.title || "Practice discussion"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-300/70">
                        by{" "}
                        <span className="font-semibold">
                          {t.authorName || "Community member"}
                        </span>
                      </p>
                      <p className="mt-2 truncate text-sm text-slate-700 dark:text-slate-200">
                        {t.lastMessage || "No message yet"}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <p className="text-[11px] text-slate-500 dark:text-slate-300/70">
                        {t.lastAt ? new Date(t.lastAt).toLocaleString() : ""}
                      </p>

                      <span
                        className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700
                             dark:bg-emerald-500/15 dark:text-emerald-200"
                      >
                        {t.messagesCount || 0}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Thread mode (chat)
  return (
    <div className="flex h-full flex-col p-2">
      {/* Header */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate("/app/discussions")} className="rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10" > <ArrowLeft size={18} /> </button>
          <p className="text-xs text-slate-500 dark:text-slate-300/70">Practice discussions</p>
        </div>
        <h1 className="mt-1 font-heading text-xl font-semibold">
          {practiceInfo?.title || "Practice discussion"}
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-300/70">
          Practice by{" "}
          <span className="font-semibold">
            {practiceInfo?.authorName || "Community member"}
          </span>
        </p>
      </div>

      {loadingThread && <p className="text-slate-500">Loading messages...</p>}
      {errorThread && <p className="text-red-600">{errorThread}</p>}

      {/* Messages container */}
      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
        {!loadingThread && !errorThread && comments.length === 0 && (
          <p className="text-slate-600 dark:text-slate-300/70">
            No messages yet. Be the first to comment.
          </p>
        )}

        {comments.map((c) => {
          const isMine = Number(c.userId) === Number(user?.userId);

          // Reply preview
          const parent = c.parentCommentId
            ? commentMap.get(String(c.parentCommentId))
            : null;

          const parentName =
            parent?.authorName ||
            (Number(parent?.userId) === Number(user?.userId) ? "You" : "User");

          const parentText = parent?.content || "";

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

                {/* ✅ Show replied-to message */}
                {c.parentCommentId ? (
                  <div
                    className={`mb-1 rounded-xl px-3 py-2 text-[12px] leading-snug ${
                      isMine
                        ? "bg-white/15 text-white"
                        : "bg-black/5 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                    }`}
                  >
                    <p
                      className={`text-[11px] font-semibold ${
                        isMine
                          ? "text-white/90"
                          : "text-slate-500 dark:text-slate-300/70"
                      }`}
                    >
                      Replying to {parentName}
                    </p>

                    <p
                      className={`mt-1 line-clamp-2 ${
                        isMine
                          ? "text-white/90"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {parentText || "Original message"}
                    </p>
                  </div>
                ) : null}

                <p className="whitespace-pre-wrap">{c.content}</p>

                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="text-[10px] opacity-70">
                    {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                  </p>

                  {/* Reply button */}
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTo({
                        commentId: c.commentId,
                        userId: c.userId,
                        authorName: c.authorName || "User",
                        content: c.content,
                      });
                      setReplyText("");
                    }}
                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                      isMine
                        ? "bg-white/15 text-white hover:bg-white/20"
                        : "bg-black/10 text-slate-700 hover:bg-black/15 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                    }`}
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Reply preview bar */}
      {replyTo && (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-slate-800 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                Replying to {replyTo.authorName}
              </p>
              <p className="mt-1 line-clamp-2 text-[13px] opacity-90">
                {replyTo.content}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setReplyTo(null);
                setReplyText("");
              }}
              className="rounded-xl border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-white/5 dark:text-emerald-200 dark:hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={replyTo ? replyText : message}
          onChange={(e) =>
            replyTo ? setReplyText(e.target.value) : setMessage(e.target.value)
          }
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={replyTo ? "Write a reply..." : "Write a message..."}
          className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-emerald-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-400"
        />

        <button
          type="button"
          disabled={sending}
          onClick={() => (replyTo ? handleReplySend() : handleSend())}
          className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
