import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/api";
import defaultPracticeImg from "../../assets/practice-default.jpg";
import { Bookmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MessageSquareText } from "lucide-react";

export default function PracticeDetailsPage() {
  const navigate = useNavigate();

  const { id } = useParams();

  const [practice, setPractice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Apply states (button)
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyMsg, setApplyMsg] = useState("");
  const [isApplied, setIsApplied] = useState(false);

  // Placeholder stats (we will connect later)
  const stats = {
    totalReports: practice?.reportsCount ?? 0,
    effective: practice?.effectiveCount ?? 0,
    partial: practice?.partialCount ?? 0,
    ineffective: practice?.ineffectiveCount ?? 0,
    recommendedRate: practice?.recommendedRate ?? 0,
  };

  useEffect(() => {
    console.log("PRACTICE DATA:", practice);
  }, [practice]);

  useEffect(() => {
    async function fetchDetails() {
      try {
        setLoading(true);
        setError("");

        const res = await api.get(`/practices/${id}`);

        // Backend might return { practice: {...} } or just {...}
        const data = res.data?.practice ? res.data.practice : res.data;
        setPractice(data);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load practice");
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [id]);

  async function handleApply() {
    try {
      setApplyLoading(true);
      setApplyMsg("");

      await api.post(`/practices/${id}/apply`);
      setIsApplied(true);
      setApplyMsg("Saved to Bookmarks.");
    } catch (err) {
      if (err?.response?.status === 409) {
        setIsApplied(true);
        setApplyMsg("Already saved in Bookmarks.");
      } else {
        setApplyMsg(err?.response?.data?.message || "Failed to apply practice");
      }
    } finally {
      setApplyLoading(false);
    }
  }

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!practice) return <p className="text-slate-500">Practice not found.</p>;

  const imgSrc = practice.imageUrl || defaultPracticeImg;

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="relative h-[320px]">
          <img
            src={imgSrc}
            alt={practice.title}
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* gradient overlay like your cards */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/85" />

          {/* content */}
          <div className="absolute inset-x-0 bottom-0 p-5 text-left">
            <p className="text-xs font-semibold text-white/80">
              by {practice.author?.fullName || "Community member"}
            </p>

            <h1 className="mt-1 font-heading text-[26px] font-extrabold leading-tight text-white">
              {practice.title}
            </h1>

            <p className="mt-2 max-w-2xl text-[13px] leading-snug text-white/85">
              {practice.description || "No description provided."}
            </p>
            {/* Context placeholders (ready for backend later) */}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ContextPill label="Crop" value={practice.cropType || "—"} />
              <ContextPill
                label="Problem"
                value={practice.problemType || "—"}
              />
              <ContextPill label="Season" value={practice.season || "—"} />
              <ContextPill label="Location" value={practice.location || "—"} />
            </div>

            {/* tags */}
            <div className="mt-3 flex flex-wrap gap-2">
              {practice.cropType && (
                <span className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white">
                  {practice.cropType}
                </span>
              )}
              {practice.location && (
                <span className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white">
                  {practice.location}
                </span>
              )}
              {practice.season && (
                <span className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white">
                  {practice.season}
                </span>
              )}

              <span className="rounded-full bg-emerald-600/45 px-3 py-1 text-[11px] font-semibold text-emerald-50">
                {practice.confidenceLevel || "LOW"}
              </span>

              <span className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white">
                Score: {practice.effectivenessScore ?? "—"}
              </span>
            </div>

            {/* actions */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleApply}
                disabled={applyLoading || isApplied}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold shadow-sm transition
                  ${
                    isApplied
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                      : "bg-white text-slate-900 hover:bg-slate-100"
                  }
                  ${applyLoading ? "opacity-70" : ""}
                `}
              >
                <Bookmark className="h-4 w-4" />
                {isApplied
                  ? "Applied ✓"
                  : applyLoading
                    ? "Applying..."
                    : "Apply practice"}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/app/discussions?practiceId=${id}`)}
                className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold
             bg-white/15 text-white hover:bg-white/20 transition"
              >
                <MessageSquareText className="h-4 w-4" />
                Comments
              </button>

              {applyMsg && (
                <span className="text-[12px] font-medium text-white/85">
                  {applyMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* STATS ROW (placeholders until backend provides real counts) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Reports" value={stats.totalReports} />
        <StatCard label="Effective" value={stats.effective} />
        <StatCard label="Partial" value={stats.partial} />
        <StatCard label="Ineffective" value={stats.ineffective} />
        <StatCard label="Recommended" value={`${stats.recommendedRate}%`} />
      </div>

      {/* OVERVIEW */}
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
        <h2 className="font-heading text-lg font-semibold">Overview</h2>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-semibold">Description</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/80">
              {practice.description || "No description provided."}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold">Steps</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300/80">
              {practice.steps || "No steps provided."}
            </p>
          </div>
        </div>
      </div>

      {/* COMMUNITY FEEDBACK (we will connect later) */}
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
        <h2 className="font-heading text-lg font-semibold">
          Community feedback
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
          Short anonymized comments from outcome reports.
        </p>

        {/* Placeholder list */}
        <div className="mt-4 space-y-3">
          <FeedbackItem text="Worked after one week. Reduced pests." />
          <FeedbackItem text="Partially effective. Needed extra watering." />
          <FeedbackItem text="Did not work in my case during heavy rains." />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-300/70">
        {label}
      </p>
      <p className="mt-1 font-heading text-xl font-bold">{value}</p>
    </div>
  );
}

function FeedbackItem({ text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
      {text}
    </div>
  );
}

function ContextPill({ label, value }) {
  return (
    <div className="rounded-2xl bg-black/35 px-3 py-2">
      <p className="text-[10px] font-semibold text-white/70">{label}</p>
      <p className="text-[12px] font-semibold text-white">{value}</p>
    </div>
  );
}
