// clients/src/pages/app/PracticesPage.jsx
import { useEffect, useState } from "react";
import { api } from "../../api/api";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { X } from "lucide-react";

// ✅ Put a default image in: clients/src/assets/practice-default.jpg
import defaultPracticeImg from "../../assets/practice-default.jpg";

export default function PracticesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [openPracticeId, setOpenPracticeId] = useState(null);

  const navigate = useNavigate();
  const [practices, setPractices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [outcomeType, setOutcomeType] = useState("EFFECTIVE");
  const [similarContext, setSimilarContext] = useState("Y");
  const [comment, setComment] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [recommendation, setRecommendation] = useState("YES");

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [submitMsg, setSubmitMsg] = useState("");

  useEffect(() => {
    const id = searchParams.get("submitOutcomeFor");
    if (id) setOpenPracticeId(Number(id));
  }, [searchParams]);

  // useEffect(() => {
  //   console.log("openPracticeId =", openPracticeId);
  // }, [openPracticeId]);

  useEffect(() => {
  if (!openPracticeId) return;

  setOutcomeType("EFFECTIVE");
  setSimilarContext("Y");
  setComment("");
  setDurationDays("");
  setRecommendation("YES");
  setSubmitErr("");
  setSubmitMsg("");
}, [openPracticeId]);


  useEffect(() => {
    async function fetchPractices() {
      try {
        const res = await api.get("/practices");
        console.log("Practices response:", res.data);

        // Backend may return an array OR { practices: [...] }
        const list = Array.isArray(res.data)
          ? res.data
          : res.data?.practices || [];

        setPractices(list);
      } catch (err) {
        setError("Failed to load practices.");
      } finally {
        setLoading(false);
      }
    }
    console.log("Fetching practices...");

    fetchPractices();
  }, []);

  function closeOutcomeModal() {
    setOpenPracticeId(null);

    const next = new URLSearchParams(searchParams);
    next.delete("submitOutcomeFor");
    setSearchParams(next, { replace: true });
  }

  async function submitOutcome(e) {
  e.preventDefault();
  setSubmitErr("");
  setSubmitMsg("");

  if (!comment.trim()) {
    setSubmitErr("Please enter a short outcome comment.");
    return;
  }
  if (!durationDays || Number(durationDays) <= 0) {
    setSubmitErr("Please enter a valid number of days.");
    return;
  }

  try {
    setSubmitLoading(true);

    const payload = {
      outcomeType,
      similarContext, // must be "Y" or "N"
      comment: comment.trim(),
      durationDays: Number(durationDays),
      recommendation, // YES/NO/MAYBE
    };

    await api.post(`/practices/${openPracticeId}/outcomes`, payload);

    setSubmitMsg("Outcome submitted successfully ✅");

    // Close after short moment
    setTimeout(() => {
      closeOutcomeModal();
    }, 600);
  } catch (err) {
    setSubmitErr(
      err?.response?.data?.message || "Failed to submit outcome."
    );
  } finally {
    setSubmitLoading(false);
  }
}


  if (loading) {
    return <p className="text-slate-500">Loading practices...</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="text-slate-900 dark:text-slate-100 p-3">
      <div className="flex items-end justify-between gap-4 m-1">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Practices</h1>
        </div>

        {/* Placeholder button for later (Create Practice) */}
        <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
          Add Practice
        </button>
      </div>

      {practices.length === 0 ? (
        <p className="mt-6 text-slate-500">No practices found.</p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {practices.map((p) => {
            const imgSrc = p.imageUrl || defaultPracticeImg;

            return (
              <div
                key={p.practiceId}
                className="relative h-[390px] overflow-hidden rounded-[28px] shadow-md border border-slate-200 bg-white dark:border-white/10 dark:bg-white/10 dark:shadow-black/30 hover:shadow-lg transition-shadow"
              >
                {/* Background image */}
                <img
                  src={imgSrc}
                  alt={p.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />

                {/* Gradient overlay like the sample:
          - clearer at top
          - darker at bottom for readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/75" />

                {/* Top-right author badge */}
                <div className="absolute right-3 top-2 z-10 rounded-full bg-black/10 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur dark:bg-black/35">
                  by {p.authorName || "Community member"}
                </div>

                {/* Content block sits LOWER (like sample) */}
                <div className="absolute left-2 right-2 bottom-[75px] z-10 text-left">
                  <h2 className="font-heading text-[24px] font-extrabold leading-tight text-white">
                    {p.title}
                  </h2>

                  <p className="mt-2 text-[13px] leading-snug text-white/85">
                    {p.description ||
                      "Community practice shared with full context and steps."}
                  </p>

                  {/* Pills row */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    <span className="rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold text-white">
                      {p.cropType || "Crop"}
                    </span>
                    <span className="rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold text-white">
                      {p.location || "Location"}
                    </span>
                    <span className="rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold text-white">
                      {p.season || "Season"}
                    </span>
                  </div>

                  {/* Second row (confidence + effectiveness) */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded-full bg-emerald-600/45 px-3 py-1 text-[11px] font-semibold text-emerald-50">
                      {p.confidenceLevel || "LOW"}
                    </span>
                    <span className="rounded-full bg-black/35 px-3 py-1 text-[11px] font-semibold text-white">
                      Effectiveness: {p.effectivenessScore ?? "—"}
                    </span>
                  </div>
                </div>

                {/* Button */}
                <div className="absolute bottom-3 left-3 right-3 z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/app/practices/${p.practiceId}`);
                    }}
                    className="w-full rounded-full bg-white py-3 text-[13px] font-semibold text-slate-900 shadow-sm transition bg-white hover:bg-slate-100 dark:bg-emerald-600/100 dark:text-white dark:hover:bg-white"
                  >
                    View details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {openPracticeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeOutcomeModal}
          />

          {/* Modal box */}
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#0b1220]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-lg font-bold">
                  Submit outcome
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                  Practice ID:{" "}
                  <span className="font-semibold">{openPracticeId}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={closeOutcomeModal}
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50
                     dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
             {/* Messages */}
{submitErr && (
  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
    {submitErr}
  </div>
)}
{submitMsg && (
  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
    {submitMsg}
  </div>
)}

<form onSubmit={submitOutcome} className="mt-4 space-y-4">
  <div className="grid gap-3 sm:grid-cols-2">
    <div>
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
        Outcome type
      </label>
      <select
        value={outcomeType}
        onChange={(e) => setOutcomeType(e.target.value)}
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                   focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
      >
        <option value="EFFECTIVE">Effective</option>
        <option value="PARTIAL">Partially effective</option>
        <option value="INEFFECTIVE">Ineffective</option>
      </select>
    </div>

    <div>
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
        Similar context?
      </label>
      <select
        value={similarContext}
        onChange={(e) => setSimilarContext(e.target.value)}
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                   focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
      >
        <option value="Y">Yes (similar)</option>
        <option value="N">No (different)</option>
      </select>
    </div>
  </div>

  <div className="grid gap-3 sm:grid-cols-2">
    <div>
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
        Days before reporting
      </label>
      <input
        type="number"
        min="1"
        value={durationDays}
        onChange={(e) => setDurationDays(e.target.value)}
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                   focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
        placeholder="e.g. 7"
      />
    </div>

    <div>
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
        Recommendation
      </label>
      <select
        value={recommendation}
        onChange={(e) => setRecommendation(e.target.value)}
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                   focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
      >
        <option value="YES">Yes</option>
        <option value="NO">No</option>
        <option value="MAYBE">Maybe</option>
      </select>
    </div>
  </div>

  <div>
    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
      Short outcome comment
    </label>
    <textarea
      value={comment}
      onChange={(e) => setComment(e.target.value)}
      rows={4}
      className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                 focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
      placeholder="What happened after you applied the practice?"
    />
  </div>

  <div className="flex items-center justify-end gap-2">
    <button
      type="button"
      onClick={closeOutcomeModal}
      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50
                 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
    >
      Cancel
    </button>

    <button
      type="submit"
      disabled={submitLoading}
      className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
    >
      {submitLoading ? "Submitting..." : "Submit"}
    </button>
  </div>
</form>

            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={closeOutcomeModal}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50
                     dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
