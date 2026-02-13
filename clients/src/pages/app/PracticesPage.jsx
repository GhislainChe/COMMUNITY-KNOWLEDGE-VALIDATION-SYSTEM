// clients/src/pages/app/PracticesPage.jsx
import { useEffect, useState } from "react";
import { api } from "../../api/api";
import { useNavigate, useSearchParams } from "react-router-dom";

// ✅ Put a default image in: clients/src/assets/practice-default.jpg
import defaultPracticeImg from "../../assets/practice-default.jpg";

const API_BASE = "http://localhost:5000";

export default function PracticesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [openPracticeId, setOpenPracticeId] = useState(null);

  const navigate = useNavigate();
  const [practices, setPractices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ dropdown data
  const [cropOptions, setCropOptions] = useState([]);
  const [problemOptions, setProblemOptions] = useState([]);
  const [seasonOptions, setSeasonOptions] = useState([]);

  // Outcome modal state
  const [outcomeType, setOutcomeType] = useState("EFFECTIVE");
  const [similarContext, setSimilarContext] = useState("Y");
  const [comment, setComment] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [recommendation, setRecommendation] = useState("YES");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [submitMsg, setSubmitMsg] = useState("");

  // ✅ Add Practice modal state
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addErr, setAddErr] = useState("");
  const [addMsg, setAddMsg] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    steps: "",
    overview: "",
    materials: "",
    season: "",
    location: "",
    cropTypeId: "",
    problemTypeId: "",
  });

  // ✅ Load dropdown options once
  useEffect(() => {
    async function loadMeta() {
      try {
        const [cropsRes, probsRes, seasonsRes] = await Promise.all([
          api.get("/meta/crops"),
          api.get("/meta/problems"),
          api.get("/meta/seasons"),
        ]);

        setCropOptions(cropsRes.data?.crops || []);
        setProblemOptions(probsRes.data?.problems || []);
        setSeasonOptions(seasonsRes.data?.seasons || []);
      } catch (e) {
        console.log("Failed to load dropdown options:", e);
      }
    }
    loadMeta();
  }, []);

  useEffect(() => {
    const id = searchParams.get("submitOutcomeFor");
    if (id) setOpenPracticeId(Number(id));
  }, [searchParams]);

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

  async function fetchPractices() {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/practices");

      // Backend may return an array OR { practices: [...] }
      const list = Array.isArray(res.data) ? res.data : res.data?.practices || [];
      setPractices(list);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load practices.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPractices();
  }, []);

  function closeOutcomeModal() {
    setOpenPracticeId(null);

    const next = new URLSearchParams(searchParams);
    next.delete("submitOutcomeFor");
    next.delete("from");
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

      const from = searchParams.get("from");
      if (from === "bookmarks") {
        setTimeout(() => {
          closeOutcomeModal();
          navigate("/app/bookmarks", { replace: true });
        }, 600);
        return;
      }

      setTimeout(() => {
        closeOutcomeModal();
      }, 750);
    } catch (err) {
      setSubmitErr(err?.response?.data?.message || "Failed to submit outcome.");
    } finally {
      setSubmitLoading(false);
    }
  }

  // ✅ Add Practice helpers
  function openAddModal() {
    setAddOpen(true);
    setAddLoading(false);
    setAddErr("");
    setAddMsg("");
    setImageFile(null);
    setForm({
      title: "",
      description: "",
      steps: "",
      overview: "",
      materials: "",
      season: "",
      location: "",
      cropTypeId: "",
      problemTypeId: "",
    });
  }

  function closeAddModal() {
    setAddOpen(false);
  }

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function submitPractice(e) {
    e.preventDefault();
    setAddErr("");
    setAddMsg("");

    if (!form.title.trim() || !form.description.trim() || !form.steps.trim()) {
      setAddErr("Title, description and steps are required.");
      return;
    }

    try {
      setAddLoading(true);

      // ✅ Use FormData for file upload
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("description", form.description.trim());
      fd.append("steps", form.steps.trim());
      fd.append("overview", form.overview.trim());
      fd.append("materials", form.materials.trim());
      fd.append("season", form.season || "");
      fd.append("location", form.location.trim());

      // ✅ dropdown ids
      fd.append("cropTypeId", form.cropTypeId || "");
      fd.append("problemTypeId", form.problemTypeId || "");

      if (imageFile) {
        fd.append("image", imageFile); // must match multer field name: .single("image")
      }

      await api.post("/practices", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setAddMsg("Practice added successfully ✅");

      await fetchPractices();
      setTimeout(() => {
        closeAddModal();
      }, 450);
    } catch (err) {
      setAddErr(err?.response?.data?.message || "Failed to add practice.");
    } finally {
      setAddLoading(false);
    }
  }

  if (loading) return <p className="text-slate-500">Loading practices...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="text-slate-900 dark:text-slate-100 p-3">
      <div className="flex items-end justify-between gap-4 m-1">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Practices</h1>
        </div>

        <button
          onClick={openAddModal}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          Add Practice
        </button>
      </div>

      {practices.length === 0 ? (
        <p className="mt-6 text-slate-500">No practices found.</p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {practices.map((p) => {
            // ✅ If backend stores /uploads/... then prefix with API_BASE
            const imgSrc = p.imageUrl
              ? p.imageUrl.startsWith("http")
                ? p.imageUrl
                : `${API_BASE}${p.imageUrl}`
              : defaultPracticeImg;

            return (
              <div
                key={p.practiceId}
                className="relative h-[390px] overflow-hidden rounded-[28px] shadow-md border border-slate-200 bg-white dark:border-white/10 dark:bg-white/10 dark:shadow-black/30 hover:shadow-lg transition-shadow"
              >
                <img
                  src={imgSrc}
                  alt={p.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/75" />

                <div className="absolute right-3 top-2 z-10 rounded-full bg-black/10 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur dark:bg-black/35">
                  by {p.authorName || "Community member"}
                </div>

                <div className="absolute left-2 right-2 bottom-[75px] z-10 text-left">
                  <h2 className="font-heading text-[24px] font-extrabold leading-tight text-white">
                    {p.title}
                  </h2>

                  <p className="mt-2 text-[13px] leading-snug text-white/85">
                    {p.description ||
                      "Community practice shared with full context and steps."}
                  </p>

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

                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded-full bg-emerald-600/45 px-3 py-1 text-[11px] font-semibold text-emerald-50">
                      {p.confidenceLevel || "LOW"}
                    </span>
                    <span className="rounded-full bg-black/35 px-3 py-1 text-[11px] font-semibold text-white">
                      Effectiveness: {p.effectivenessScore ?? "—"}
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-3 left-3 right-3 z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/app/practices/${p.practiceId}`);
                    }}
                    className="w-full rounded-full bg-white py-3 text-[13px] font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 dark:bg-emerald-600 dark:text-white dark:hover:bg-white"
                  >
                    View details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ✅ ADD PRACTICE MODAL (RESPONSIVE + DROPDOWNS + FILE UPLOAD) */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeAddModal}
          />

          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#0b1220]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4 dark:border-white/10">
              <div>
                <h2 className="font-heading text-lg font-bold">Add Practice</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                  Share a practice with steps so others can validate it.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddModal}
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50
                dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-4">
              {addErr && (
                <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                  {addErr}
                </div>
              )}

              {addMsg && (
                <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {addMsg}
                </div>
              )}

              <form onSubmit={submitPractice} className="space-y-3 sm:space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                      Title *
                    </label>
                    <input
                      value={form.title}
                      onChange={(e) => setField("title", e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                      focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
                      placeholder="e.g. Neem leaves pest control"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                      Upload image (optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                      focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
                    />
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300/70">
                      {imageFile ? `Selected: ${imageFile.name}` : "JPG/PNG/WEBP (max 3MB)"}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                    Description *
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    rows={2}
                    className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                    focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
                    placeholder="Short description of what the practice does."
                  />
                </div>

                {/* ✅ DROPDOWNS: Crop + Problem */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                      Crop Type (optional)
                    </label>
                    <select
                      value={form.cropTypeId}
                      onChange={(e) => setField("cropTypeId", e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                      focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
                    >
                      <option value="">Select crop</option>
                      {cropOptions.map((c) => (
                        <option key={c.cropTypeId} value={c.cropTypeId}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                      Problem Type (optional)
                    </label>
                    <select
                      value={form.problemTypeId}
                      onChange={(e) => setField("problemTypeId", e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                      focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
                    >
                      <option value="">Select problem</option>
                      {problemOptions.map((p) => (
                        <option key={p.problemTypeId} value={p.problemTypeId}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ✅ Season dropdown + Location input */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                      Season (optional)
                    </label>
                    <select
                      value={form.season}
                      onChange={(e) => setField("season", e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                      focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
                    >
                      <option value="">Select season</option>
                      {seasonOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                      Location (optional)
                    </label>
                    <input
                      value={form.location}
                      onChange={(e) => setField("location", e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                      focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
                      placeholder="e.g. Bamenda"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                    Overview (optional)
                  </label>
                  <textarea
                    value={form.overview}
                    onChange={(e) => setField("overview", e.target.value)}
                    rows={2}
                    className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                    focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
                    placeholder="Extra context about when/why it works."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                    Steps / How to do it *
                  </label>
                  <textarea
                    value={form.steps}
                    onChange={(e) => setField("steps", e.target.value)}
                    rows={4}
                    className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                    focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
                    placeholder="Write the steps clearly."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                    Materials needed (optional)
                  </label>
                  <textarea
                    value={form.materials}
                    onChange={(e) => setField("materials", e.target.value)}
                    rows={2}
                    className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                    focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
                    placeholder="List materials/tools needed."
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={closeAddModal}
                    className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50
                    dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={addLoading}
                    className="w-full sm:w-auto rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                  >
                    {addLoading ? "Saving..." : "Save Practice"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* OUTCOME MODAL (unchanged) */}
      {openPracticeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeOutcomeModal}
          />

          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#0b1220]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-lg font-bold">Submit outcome</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                  Practice ID: <span className="font-semibold">{openPracticeId}</span>
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
