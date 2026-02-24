import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Flag, Shield } from "lucide-react";
import { api } from "../../api/api";
import DiscoverListSkeleton from "../../components/UIskeletons/ProfileSkeleton";

// ✅ Add report modal
import ReportModal from "../../components/ReportModal";

export default function DiscussionsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const practiceId = searchParams.get("practiceId"); // "system" OR numeric string

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

  // System notifications (used for list + system thread)
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Sending (only for practice threads)
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Reply state (only for practice threads)
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");

  // Discussion list data (for /app/discussions without practiceId)
  const [threads, setThreads] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [errorList, setErrorList] = useState("");

  // ✅ Report modal state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState({ type: "COMMENT", id: 0 });
  const [reportSubtitle, setReportSubtitle] = useState("");

  const bottomRef = useRef(null);

  const isSystemThread = String(practiceId || "").toLowerCase() === "system";
  const isPracticeThread = !!practiceId && !isSystemThread;

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

  // ✅ Load notifications (used in list + system thread)
  async function loadNotifications() {
    try {
      setLoadingNotifications(true);
      const nRes = await api.get("/notifications/mine");
      setNotifications(nRes.data?.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  }

  // Fetch: thread (practice chat)
  useEffect(() => {
    async function loadThread() {
      if (!isPracticeThread) return;

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
  }, [practiceId, isPracticeThread]);

  // Fetch: system thread (notifications)
  useEffect(() => {
    if (!isSystemThread) return;
    loadNotifications();
  }, [isSystemThread]);

  // Fetch: discussion list (threads + notifications count)
  useEffect(() => {
    async function loadList() {
      if (practiceId) return;

      try {
        setLoadingList(true);
        setErrorList("");

        // 1) threads
        let threadsData = [];
        try {
          const res = await api.get(`/discussions/mine`);
          const raw = res.data;

          threadsData =
            (Array.isArray(raw) && raw) ||
            raw?.threads ||
            raw?.data ||
            raw?.results ||
            [];
        } catch {
          threadsData = [];
        }

        setThreads(Array.isArray(threadsData) ? threadsData : []);

        // 2) notifications
        await loadNotifications();
      } catch (err) {
        setErrorList(
          err?.response?.data?.message ||
            "Error loading discussions/notifications.",
        );
      } finally {
        setLoadingList(false);
      }
    }

    loadList();
  }, [practiceId]);

  // Auto-scroll to bottom (practice thread)
  useEffect(() => {
    if (!isPracticeThread) return;
    const t = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => clearTimeout(t);
  }, [isPracticeThread, comments.length]);

  // Auto-scroll to bottom (system thread)
  useEffect(() => {
    if (!isSystemThread) return;
    const t = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => clearTimeout(t);
  }, [isSystemThread, notifications.length]);

  // Reload practice thread (after send/reply)
  async function reloadThread() {
    if (!isPracticeThread) return;
    const res = await api.get(`/practices/${practiceId}/comments`);
    const roots = res?.data?.comments || [];
    const flat = flattenCommentsTree(roots);
    setComments(flat);
  }

  async function handleSend() {
    const trimmed = message.trim();
    if (!trimmed || sending || !isPracticeThread) return;

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
    if (!trimmed || sending || !replyTo || !isPracticeThread) return;

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
    if (!isPracticeThread) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (replyTo) handleReplySend();
      else handleSend();
    }
  }

  // ✅ Open report modal helper
  function openReportComment(comment) {
    setReportTarget({ type: "COMMENT", id: Number(comment.commentId) || 0 });
    setReportSubtitle(
      `Reporting a comment by ${comment.authorName || "User"} (ID: ${comment.commentId})`,
    );
    setReportOpen(true);
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

  // ===============================
  // ✅ LIST MODE
  // ===============================
  if (!practiceId) {
    const systemCount = notifications.length;

    return (
      <div className="p-3">
        <h1 className="font-heading text-2xl font-semibold">Discussions</h1>
        <p className="mt-0 text-slate-600 dark:text-slate-300/70">
          Your discussion threads.
        </p>

        <div className="mt-4">
          {/* ✅ SYSTEM THREAD CARD */}
          {systemCount > 0 && (
            <button
              type="button"
              onClick={() => navigate("/app/discussions?practiceId=system")}
              className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left shadow-sm transition hover:bg-amber-100
              dark:border-amber-500/20 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-200">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 dark:text-white">
                        System messages
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300/70">
                        Moderator/Admin decisions & alerts
                      </p>
                    </div>
                  </div>

                  <p className="mt-2 truncate text-sm text-slate-700 dark:text-slate-200">
                    {notifications[0]?.message || "Open to view messages"}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <p className="text-[11px] text-slate-500 dark:text-slate-300/70">
                    {notifications[0]?.createdAt
                      ? new Date(notifications[0].createdAt).toLocaleString()
                      : ""}
                  </p>

                  <span className="inline-flex items-center rounded-full bg-amber-200 px-2 py-1 text-[11px] font-semibold text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
                    {systemCount}
                  </span>
                </div>
              </div>
            </button>
          )}

          {/* no threads */}
          {!loadingList && !errorList && threads.length === 0 && systemCount === 0 && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300/80">
              You haven’t commented on any practice yet.
            </div>
          )}

          {/* threads */}
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

  // ===============================
  // ✅ SYSTEM THREAD MODE
  // ===============================
  if (isSystemThread) {
    return (
      <div className="flex h-full flex-col p-2">
        {/* Header */}
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/app/discussions")}
              className="rounded-lg text-slate-700 hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <ArrowLeft size={18} />
            </button>
            <p className="text-xs text-slate-600 dark:text-slate-300/70">
              System chat (read-only)
            </p>
          </div>

          <h1 className="mt-1 font-heading text-xl font-semibold text-slate-900 dark:text-white">
            System messages
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300/70">
            Moderator/Admin decisions will appear here. You can’t reply.
          </p>
        </div>

        {loadingNotifications && (
          <p className="text-slate-500 px-2">Loading system messages...</p>
        )}

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
          {!loadingNotifications && notifications.length === 0 && (
            <p className="text-slate-600 dark:text-slate-300/70">
              No system messages yet.
            </p>
          )}

          {notifications.map((n) => (
            <div key={n.notificationId} className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm bg-amber-50 text-slate-900 border border-amber-200
              dark:bg-amber-500/10 dark:text-slate-100 dark:border-amber-500/20">
                <p className="mb-1 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                  System
                </p>

                <p className="font-semibold">{n.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                  {n.message}
                </p>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] text-slate-500 dark:text-slate-300/70">
                    {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                  </p>

                  {n.linkUrl ? (
                    <button
                      type="button"
                      onClick={() => navigate(n.linkUrl)}
                      className="rounded-lg bg-black/5 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-black/10
                      dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                    >
                      Open
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      </div>
    );
  }

  // ===============================
  // ✅ PRACTICE THREAD MODE (normal chat)
  // ===============================
  return (
    <div className="flex h-full flex-col p-2">
      {/* Header */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/app/discussions")}
            className="rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <ArrowLeft size={18} />
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-300/70">
            Practice discussions
          </p>
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
          const isSystem = c.isModerationNotice || String(c.authorName) === "System";

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
              className={`flex ${isSystem ? "justify-center" : isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  isSystem
                    ? "bg-amber-50 text-slate-900 border border-amber-200 dark:bg-amber-500/10 dark:text-slate-100 dark:border-amber-500/20"
                    : isMine
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100"
                }`}
              >
                {!isMine && !isSystem && (
                  <p className="mb-1 text-[11px] font-semibold opacity-80">
                    {c.authorName || "User"}
                  </p>
                )}

                {/* replied-to preview */}
                {!isSystem && c.parentCommentId ? (
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

                  {/* Hide actions for system messages */}
                  {!isSystem && (
                    <div className="flex items-center gap-2">
                      {/* Report */}
                      <button
                        type="button"
                        onClick={() => openReportComment(c)}
                        className={`rounded-lg px-2 py-1 text-[11px] font-semibold inline-flex items-center gap-1 ${
                          isMine
                            ? "bg-white/15 text-white hover:bg-white/20"
                            : "bg-black/10 text-slate-700 hover:bg-black/15 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                        }`}
                        title="Report this comment"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        Report
                      </button>

                      {/* Reply */}
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
                  )}
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

      {/* Input (only practice threads) */}
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

      {/* Report Modal */}
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType={reportTarget.type}
        targetId={reportTarget.id}
        title="Report comment"
        subtitle={reportSubtitle}
      />
    </div>
  );
}