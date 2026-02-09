import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/api";
import defaultPracticeImg from "../../assets/practice-default.jpg";

export default function PracticeDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const practiceId = Number(id);

  const [practice, setPractice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);

  // Apply states (button)
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyMsg, setApplyMsg] = useState("");
  const [isApplied, setIsApplied] = useState(false);

  // Placeholder stats (we will connect later)
  const statValues = useMemo(
    () => ({
      totalReports: stats?.totalReports ?? 0,
      effective: stats?.effective ?? 0,
      partial: stats?.partial ?? 0,
      ineffective: stats?.ineffective ?? 0,
      recommendedRate: stats?.recommendedRate ?? 0,
    }),
    [stats]
  );

  useEffect(() => {
    async function fetchDetails() {
      try {
        setLoading(true);
        setError("");

        if (!Number.isInteger(practiceId) || practiceId <= 0) {
          setError("Invalid practice id");
          return;
        }

        // 1) Load practice
        const res = await api.get(`/practices/${practiceId}`);
        const data = res.data?.practice ? res.data.practice : res.data;
        setPractice(data);

        // 2) Load stats
        const statsRes = await api.get(`/practices/${practiceId}/stats`);
        setStats(statsRes.data);

        // 3) Check if THIS practice is already applied by current user
        //    (Uses your existing endpoint: GET /api/practices/applied)
        const appliedRes = await api.get(`/practices/applied`);
        const appliedList = Array.isArray(appliedRes.data)
          ? appliedRes.data
          : appliedRes.data?.applied || appliedRes.data?.practices || [];

        const alreadyApplied = appliedList.some((p) => {
          const pid =
            Number(p.practiceId ?? p.id ?? p.practice_id ?? p.practiceID);
          return pid === practiceId;
        });

        setIsApplied(alreadyApplied);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load practice");
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [practiceId]);

  async function handleApply() {
    try {
      setApplyLoading(true);
      setApplyMsg("");

      await api.post(`/practices/${practiceId}/apply`);
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
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10">
          {/* Background image */}
          <div
            className="min-h-[240px] sm:min-h-[300px] md:min-h-[360px] bg-cover bg-center"
            style={{
              backgroundImage: `url(${imgSrc})`,
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
              {/* Apply / Applied */}
              {!isApplied ? (
                <button
                  onClick={handleApply}
                  disabled={applyLoading}
                  className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100 disabled:opacity-60 sm:w-auto"
                >
                  {applyLoading ? "Applying..." : "Apply practice"}
                </button>
              ) : (
                <button
                  disabled
                  className="rounded-2xl bg-white/20 px-3 py-2 text-sm font-semibold text-white backdrop-blur sm:w-auto"
                  title="Already applied"
                >
                  Applied ✔
                </button>
              )}

              {/* Submit outcome (only if applied) */}
              {isApplied && (
                <button
                  onClick={() =>
                    navigate(`/app/practices?submitOutcomeFor=${practiceId}`)
                  }
                  className="rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 sm:w-auto"
                >
                  Submit outcome
                </button>
              )}

              {/* Comments -> discussions for this practice */}
              <button
                onClick={() =>
                  navigate(`/app/discussions?practiceId=${practiceId}`)
                }
                className="rounded-2xl bg-white/15 px-3 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 sm:w-auto"
              >
                Comments
              </button>
            </div>

            {/* Apply message */}
            {applyMsg && (
              <p className="mt-2 text-left text-xs text-white/80">{applyMsg}</p>
            )}
          </div>
        </div>

        {/* META CHIPS (placeholders for later DB tables) */}
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
            { label: "Reports", value: statValues.totalReports },
            { label: "Effective", value: statValues.effective },
            { label: "Partial", value: statValues.partial },
            { label: "Ineffective", value: statValues.ineffective },
            { label: "Recommended", value: `${statValues.recommendedRate}%` },
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
