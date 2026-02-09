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
  const [stats, setStats] = useState(null);

  // Apply states (button)
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyMsg, setApplyMsg] = useState("");
  const [isApplied, setIsApplied] = useState(false);

  // Placeholder stats (we will connect later)
  const statValues = {
    totalReports: stats?.totalReports ?? 0,
    effective: stats?.effective ?? 0,
    partial: stats?.partial ?? 0,
    ineffective: stats?.ineffective ?? 0,
    recommendedRate: stats?.recommendedRate ?? 0,
  };

  // useEffect(() => {
  //   console.log("PRACTICE DATA:", practice);
  // }, [practice]);

  useEffect(() => {
    async function fetchDetails() {
      try {
        setLoading(true);
        setError("");

        const res = await api.get(`/practices/${id}`);

        // Backend might return { practice: {...} } or just {...}
        const data = res.data?.practice ? res.data.practice : res.data;
        const statsRes = await api.get(`/practices/${id}/stats`);
        setStats(statsRes.data);
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
    <div className="mx-auto w-full max-w-1xl p-0 sm:p-4 md:p-6">
      {/* Page container */}
      <div className="rounded-3xl border border-slate-200 bg-white p-2 sm:p-4 md:p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        {/* HERO CARD */}
        {/* HERO CARD */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10">
          {/* Background image */}
          <div
            className="min-h-[240px] sm:min-h-[300px] md:min-h-[360px] bg-cover bg-center"
            style={{
              backgroundImage: `url(${practice?.imageUrl || defaultPracticeImg})`,
            }}
          />

          {/* Overlay: darker bottom, clearer top */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-6">
            {/* Author pill */}
            <div className="mb-2">
              <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
                by {practice?.author?.fullName || "Community member"}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-left text-xl font-extrabold leading-tight text-white sm:text-2xl md:text-3xl">
              {practice?.title || "Practice title"}
            </h1>

            {/* Description */}
            <p className="mt-1 max-w-xl text-left text-sm text-white/85 sm:text-[15px]">
              {practice?.description ||
                "Community practice shared with full context and steps."}
            </p>

            <div className="sm:ml-auto text-left mt-3 text-xs text-white/80">
              Score:{" "}
              <span className="font-bold text-white">
                {practice?.effectivenessScore ?? "0.00"}
              </span>{" "}
              • Confidence:{" "}
              <span className="font-bold text-white">
                {practice?.confidenceLevel || "LOW"}
              </span>
            </div>

            {/* Buttons row */}
            <div className="mt-4 flex flex-row gap-2 sm:flex-row sm:items-center">
              <button
                onClick={handleApply}
                className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100 sm:w-auto"
              >
                Apply practice
              </button>

              <button
                onClick={() =>
                  navigate(`/app/discussions?practiceId=${practiceId}`)
                }
                className="rounded-2xl bg-white/15 px-3 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 sm:w-auto"
              >
                Comments
              </button>
            </div>
          </div>
        </div>

        {/* META CHIPS (moved OUTSIDE hero so it’s not crowded) */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { label: "Crop", value: practice?.cropType || "--" },
            { label: "Problem", value: practice?.problemType || "--" },
            { label: "Season", value: practice?.season || "--" },
            { label: "Location", value: practice?.location || "--" },
          ].map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm
                 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              <span className="text-slate-500 dark:text-slate-300/70">
                {item.label}:
              </span>
              <span>{item.value}</span>
            </span>
          ))}
        </div>

        {/* STATS */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-3">
          {[
            { label: "Reports", value: stats?.totalReports ?? 0 },
            { label: "Effective", value: stats?.effective ?? 0 },
            { label: "Partial", value: stats?.partial ?? 0 },
            { label: "Ineffective", value: stats?.ineffective ?? 0 },
            { label: "Recommended", value: `${stats?.recommendedRate ?? 0}%` },
            { label: "Confidence", value: practice?.confidenceLevel || "LOW" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-4"
            >
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-300/70">
                {s.label}
              </p>
              <p className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* OVERVIEW */}
        <div className="mt-5 space-y-4 p-3 sm:mt-7">
          <div>
            <h2 className="text-base font-bold sm:text-lg">Overview</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300/80">
              {practice?.overview || "Overview content will appear here."}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold sm:text-base">
              Steps / How to do it
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300/80">
              {practice?.steps || "Steps content will appear here."}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold sm:text-base">Materials needed</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300/80">
              {practice?.materials || "Materials content will appear here."}
            </p>
          </div>
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
