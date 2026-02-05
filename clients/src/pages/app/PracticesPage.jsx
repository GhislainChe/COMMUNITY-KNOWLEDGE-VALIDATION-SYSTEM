import { useEffect, useState } from "react";
import { api } from "../../api/api";

export default function PracticesPage() {
  const [practices, setPractices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch practices when page loads
  useEffect(() => {
    async function fetchPractices() {
      try {
        const res = await api.get("/practices");

        console.log("Practices response:", res.data);

        const list = Array.isArray(res.data)
          ? res.data
          : res.data.practices || [];

        setPractices(list);
      } catch (err) {
        setError("Failed to load practices");
      } finally {
        setLoading(false);
      }
    }

    fetchPractices();
  }, []);

  // 1️⃣ Loading state
  if (loading) {
    return <p className="text-slate-500">Loading practices...</p>;
  }

  // 2️⃣ Error state
  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  // 3️⃣ Empty state
  if (practices.length === 0) {
    return <p className="text-slate-500">No practices found.</p>;
  }

  // 4️⃣ Success state
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Practices</h1>
      <p className="mt-1 text-slate-600">
        Community-submitted agricultural practices.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {practices.map((p) => (
          <div
            key={p.practiceId}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition"
          >
            <h2 className="font-heading text-lg font-semibold">{p.title}</h2>

            <p className="mt-1 text-sm text-slate-600">
              Crop: <span className="font-medium">{p.cropType}</span>
            </p>

            <p className="text-sm text-slate-600">
              Location: <span className="font-medium">{p.location}</span>
            </p>

            <div className="mt-3 flex items-center justify-between">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Score: {p.effectivenessScore}
              </span>

              <span className="text-xs text-slate-500">
                Confidence: {p.confidenceLevel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
