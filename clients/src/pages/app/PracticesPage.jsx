// clients/src/pages/app/PracticesPage.jsx
import { useEffect, useState } from "react";
import { api } from "../../api/api";

// ✅ Put a default image in: clients/src/assets/practice-default.jpg
import defaultPracticeImg from "../../assets/practice-default.jpg";

export default function PracticesPage() {
  const [practices, setPractices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) {
    return <p className="text-slate-500">Loading practices...</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="text-slate-900 dark:text-slate-100">
      <div className="flex items-end justify-between gap-4" >
        <div>
          <h1 className="font-heading text-2xl font-semibold">Practices</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300/70">
            Community-submitted agricultural practices, ranked by outcomes.
          </p>
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
                    <span className="rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-white">
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

                {/* Button (slimmer like sample) */}
                <div className="absolute bottom-3 left-3 right-3 z-10">
                  <button className="w-full rounded-full bg-white py-3 text-[13px] font-semibold text-slate-900 shadow-sm hover:bg-slate-100">
                    View details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
