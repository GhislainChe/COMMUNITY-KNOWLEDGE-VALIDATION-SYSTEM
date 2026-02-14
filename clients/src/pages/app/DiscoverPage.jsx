import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/api";
import { useNavigate } from "react-router-dom";
import defaultPracticeImg from "../../assets/practice-default.jpg";

const API_BASE = "http://localhost:5000";

export default function DiscoverPage() {
  const navigate = useNavigate();

  // filters
  const [q, setQ] = useState("");
  const [cropTypeId, setCropTypeId] = useState("");
  const [problemTypeId, setProblemTypeId] = useState("");
  const [season, setSeason] = useState("");
  const [confidenceLevel, setConfidenceLevel] = useState("");
  const [location, setLocation] = useState("");
  const [sort, setSort] = useState("new");

  // dropdown options
  const [cropOptions, setCropOptions] = useState([]);
  const [problemOptions, setProblemOptions] = useState([]);
  const [seasonOptions, setSeasonOptions] = useState([]);

  // results
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load dropdown meta
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
        console.log("Meta load failed:", e);
      }
    }
    loadMeta();
  }, []);

  // Fetch results
  async function fetchResults() {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (q.trim()) params.q = q.trim();
      if (cropTypeId) params.cropTypeId = cropTypeId;
      if (problemTypeId) params.problemTypeId = problemTypeId;
      if (season) params.season = season;
      if (confidenceLevel) params.confidenceLevel = confidenceLevel;
      if (location.trim()) params.location = location.trim();
      params.sort = sort;

      const res = await api.get("/discover/practices", { params });
      setItems(res.data?.results || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load discover results.");
    } finally {
      setLoading(false);
    }
  }

  // Load initial
  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasFilters = useMemo(() => {
    return (
      q.trim() ||
      cropTypeId ||
      problemTypeId ||
      season ||
      confidenceLevel ||
      location.trim() ||
      sort !== "new"
    );
  }, [q, cropTypeId, problemTypeId, season, confidenceLevel, location, sort]);

  function clearFilters() {
    setQ("");
    setCropTypeId("");
    setProblemTypeId("");
    setSeason("");
    setConfidenceLevel("");
    setLocation("");
    setSort("new");
  }

  return (
    <div className="space-y-5 p-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Discover</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300/70">
            Search and filter practices to find what works best.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchResults}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Search
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
              Search
            </label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. neem, pesticide, fertilizer..."
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
              focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
              Crop
            </label>
            <select
              value={cropTypeId}
              onChange={(e) => setCropTypeId(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
              focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
            >
              <option value="">All</option>
              {cropOptions.map((c) => (
                <option key={c.cropTypeId} value={c.cropTypeId}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
              Problem
            </label>
            <select
              value={problemTypeId}
              onChange={(e) => setProblemTypeId(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
              focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
            >
              <option value="">All</option>
              {problemOptions.map((p) => (
                <option key={p.problemTypeId} value={p.problemTypeId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
              Season
            </label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
              focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
            >
              <option value="">All</option>
              {seasonOptions.map((s) => (
                <option key={s.seasonId} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
              Sort
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
              focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
            >
              <option value="new">Newest</option>
              <option value="top">Top effectiveness</option>
              <option value="recommended">Most recommended</option>
              <option value="reported">Most reported</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
              Location
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Bamenda"
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
              focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">
              Confidence
            </label>
            <select
              value={confidenceLevel}
              onChange={(e) => setConfidenceLevel(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
              focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
            >
              <option value="">All</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchResults}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Apply
          </button>

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                clearFilters();
                // optional: refresh after clearing
                setTimeout(fetchResults, 0);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50
              dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:text-slate-200">
          Results ({items.length})
        </div>

        {loading && <p className="p-4 text-slate-500">Loading...</p>}
        {error && <p className="p-4 text-red-600">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="p-4 text-slate-600 dark:text-slate-300/70">
            No results found. Try different filters.
          </p>
        )}

        <div className="divide-y divide-slate-200 dark:divide-white/10">
          {items.map((p) => {
            const imgSrc = p.imageUrl
              ? p.imageUrl.startsWith("http")
                ? p.imageUrl
                : `${API_BASE}${p.imageUrl}`
              : defaultPracticeImg;

            return (
              <button
                key={p.practiceId}
                type="button"
                onClick={() => navigate(`/app/practices/${p.practiceId}`)}
                className="w-full text-left hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <div className="flex gap-4 p-4">
                  <img
                    src={imgSrc}
                    alt={p.title}
                    className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="truncate font-heading text-base font-semibold">
                        {p.title}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-300/70">
                        • by {p.authorName || "Community member"}
                      </span>
                    </div>

                    <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300/80">
                      {p.description}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-100">
                        Reports: {p.totalReports ?? 0}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-100">
                        Recommended: {p.yesCount ?? 0}
                      </span>
                      <span className="rounded-full bg-emerald-600/15 px-2 py-1 text-emerald-800 dark:text-emerald-200">
                        Score: {p.effectivenessScore ?? "—"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-100">
                        {p.confidenceLevel || "LOW"}
                      </span>
                      {p.season && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-100">
                          {p.season}
                        </span>
                      )}
                      {p.location && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-100">
                          {p.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
