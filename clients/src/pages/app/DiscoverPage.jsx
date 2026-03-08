import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api/api";
import { useNavigate } from "react-router-dom";
import defaultPracticeImg from "../../assets/practice-default.jpg";
import { buildImageUrl } from "../../utils/media";
import { SlidersHorizontal, X } from "lucide-react";
import ProfileSkeleton from "../../components/UIskeletons/ProfileSkeleton";
const PAGE_SIZE = 10;

export default function DiscoverPage() {
  const navigate = useNavigate();

  // ✅ Tabs (smart default sections)
  const [tab, setTab] = useState("trending"); // trending | recommended | new | validated | forYou

  // filters
  const [q, setQ] = useState("");
  const [cropTypeId, setCropTypeId] = useState("");
  const [problemTypeId, setProblemTypeId] = useState("");
  const [season, setSeason] = useState("");
  const [confidenceLevel, setConfidenceLevel] = useState("");
  const [location, setLocation] = useState("");

  // mobile bottom sheet
  const [filtersOpen, setFiltersOpen] = useState(false);

  // dropdown options
  const [cropOptions, setCropOptions] = useState([]);
  const [problemOptions, setProblemOptions] = useState([]);
  const [seasonOptions, setSeasonOptions] = useState([]);

  // results + pagination
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, hasMore: false });
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // sentinel for infinite scroll
  const sentinelRef = useRef(null);
  const fetchingMoreRef = useRef(false);

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

  const hasFilters = useMemo(() => {
    return (
      q.trim() ||
      cropTypeId ||
      problemTypeId ||
      season ||
      confidenceLevel ||
      location.trim()
    );
  }, [q, cropTypeId, problemTypeId, season, confidenceLevel, location]);

  function clearFilters() {
    setQ("");
    setCropTypeId("");
    setProblemTypeId("");
    setSeason("");
    setConfidenceLevel("");
    setLocation("");
  }

  async function fetchResults({ reset = false, nextPage = 1 } = {}) {
    try {
      setLoading(true);
      setError("");

      // For You uses a different endpoint
      if (tab === "forYou") {
        const res = await api.get("/discover/for-you");
        const rows = res.data?.results || [];
        setItems(rows);
        setMeta({ total: rows.length, page: 1, hasMore: false });
        setPage(1);
        return;
      }

      const params = {
        sort: tab,
        page: nextPage,
        limit: PAGE_SIZE,
      };

      if (q.trim()) params.q = q.trim();
      if (cropTypeId) params.cropTypeId = cropTypeId;
      if (problemTypeId) params.problemTypeId = problemTypeId;
      if (season) params.season = season;
      if (confidenceLevel) params.confidenceLevel = confidenceLevel;
      if (location.trim()) params.location = location.trim();

      const res = await api.get("/discover/practices", { params });

      const rows = res.data?.results || [];
      const m = res.data?.meta || {};

      setMeta({
        total: Number(m.total || 0),
        page: Number(m.page || nextPage),
        hasMore: Boolean(m.hasMore),
      });

      if (reset) {
        setItems(rows);
      } else {
        setItems((prev) => [...prev, ...rows]);
      }

      setPage(nextPage);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load discover results.",
      );
    } finally {
      setLoading(false);
      fetchingMoreRef.current = false;
    }
  }

  // ✅ Load immediately (smart default = trending)
  useEffect(() => {
    setItems([]);
    setPage(1);
    setMeta({ total: 0, page: 1, hasMore: false });
    fetchResults({ reset: true, nextPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ✅ Apply filters (manual)
  function applyFilters() {
    setItems([]);
    setPage(1);
    setMeta({ total: 0, page: 1, hasMore: false });
    fetchResults({ reset: true, nextPage: 1 });
    setFiltersOpen(false);
  }

  // ✅ Infinite Scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;
        if (loading) return;
        if (!meta.hasMore) return;
        if (tab === "forYou") return;

        if (fetchingMoreRef.current) return;
        fetchingMoreRef.current = true;

        fetchResults({ reset: false, nextPage: page + 1 });
      },
      { root: null, threshold: 0.3 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [loading, meta.hasMore, page, tab]); // important deps

  function rankBadges(p) {
    const badges = [];

    // 🔥 if trending this week
    if (Number(p.appliedLast7 || 0) >= 5) badges.push("🔥");

    // ⭐ if recommendationRate high
    if (Number(p.recommendationRate || 0) >= 70) badges.push("⭐");

    // 🧪 if enough valid reports
    if (Number(p.validReports || 0) >= 3) badges.push("🧪");

    // 🛡 if high confidence
    if ((p.confidenceLevel || "").toUpperCase() === "HIGH") badges.push("🛡");

    return badges.join(" ");
  }

  function ResultRow({ p }) {
    const imgSrc = buildImageUrl(p.imageUrl) || defaultPracticeImg;

    return (
      <button
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

              {!!rankBadges(p) && (
                <span className="text-xs">{rankBadges(p)}</span>
              )}
            </div>

            {/* 🧠 micro insight */}
            <p className="mt-1 text-[12px] font-semibold text-emerald-700 dark:text-emerald-200">
              {p.whyText || ""}
            </p>

            <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300/80">
              {p.description}
            </p>

            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-100">
                Applied: {p.appliedCount ?? 0}
              </span>

              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-100">
                Reports: {p.totalReports ?? 0}
              </span>

              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-white/10 dark:text-slate-100">
                YES: {p.yesCount ?? 0} ({p.recommendationRate ?? 0}%)
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
  }

  function FiltersPanel() {
    return (
      <div className="grid gap-3">
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

        <div className="grid gap-3 sm:grid-cols-2">
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

        <div>
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
      </div>
    );
  }

  const tabs = [
    { key: "trending", label: "🔥 Trending" },
    { key: "recommended", label: "⭐ Recommended" },
    { key: "new", label: "🆕 New" },
    { key: "validated", label: "🧪 Validated" },
    { key: "forYou", label: "🏆 For you" },
  ];

  return (
    <div className="space-y-4 p-3">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Discover</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300/70">
          Smart sections + validation signals — find what works.
        </p>
      </div>

      {/* ✅ Tabs row (Smart Default Sections) */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              setFiltersOpen(false);
            }}
            className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold border
              ${
                tab === t.key
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-white/5 dark:text-slate-200 dark:border-white/10 dark:hover:bg-white/10"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ✅ Mobile: search bar + filter icon */}
      <div className="md:hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search practices..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
            focus:ring-2 focus:ring-emerald-400 dark:border-white/10 dark:bg-white/5"
          />
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50
            dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            title="Filters"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={applyFilters}
            className="w-full rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Search
          </button>

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                clearFilters();
                setTimeout(() => applyFilters(), 0);
              }}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50
              dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ✅ Desktop: full filters inline */}
      <div className="hidden md:block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
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

          <div className="md:col-span-4">
            <FiltersPanel />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Apply
          </button>

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                clearFilters();
                setTimeout(() => applyFilters(), 0);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50
              dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ✅ Mobile bottom sheet filters */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setFiltersOpen(false)}
          />

          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0b1220]">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-white/10">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-300/70">
                  Filters
                </p>
                <p className="font-heading text-lg font-semibold">
                  Refine results
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50
                dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-4">
              <FiltersPanel />
            </div>

            <div className="flex gap-2 border-t border-slate-200 p-4 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  clearFilters();
                  setTimeout(() => applyFilters(), 0);
                  setFiltersOpen(false);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50
                dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="w-full rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:text-slate-200">
          Results ({items.length}
          {tab !== "forYou" ? ` / ${meta.total}` : ""})
        </div>

        {loading && <ProfileSkeleton count={6} />}
        {error && <p className="p-4 text-red-600">check your internet connection and try again</p>}

        {!loading && !error && items.length === 0 && (
          <p className="p-4 text-slate-600 dark:text-slate-300/70">
            No results found. Try different filters.
          </p>
        )}

        <div className="divide-y divide-slate-200 dark:divide-white/10">
          {items.map((p) => (
            <ResultRow key={p.practiceId} p={p} />
          ))}
        </div>

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} />

        {/* Loading more indicator */}
        {loading && items.length > 0 && (
          <p className="p-4 text-center text-sm text-slate-500">
            Loading more…
          </p>
        )}

        {!loading && tab !== "forYou" && !meta.hasMore && items.length > 0 && (
          <p className="p-4 text-center text-sm text-slate-500">
            You’ve reached the end.
          </p>
        )}
      </div>
    </div>
  );
}
