import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/api";

export default function PracticeDetailsPage() {
  const { id } = useParams();
  const [practice, setPractice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOne() {
      try {
        const res = await api.get(`/practices/${id}`);
        setPractice(res.data);
      } catch (err) {
        setError("Failed to load practice details.");
      } finally {
        setLoading(false);
      }
    }
    fetchOne();
  }, [id]);

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!practice) return <p className="text-slate-500">Not found.</p>;

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">{practice.title}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300/70">
        Crop: <span className="font-semibold">{practice.cropType}</span> • Location:{" "}
        <span className="font-semibold">{practice.location}</span> • Season:{" "}
        <span className="font-semibold">{practice.season}</span>
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
        <h2 className="font-heading text-lg font-semibold">Description</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300/80">
          {practice.description || "No description provided."}
        </p>

        <h2 className="mt-5 font-heading text-lg font-semibold">Steps</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300/80 whitespace-pre-line">
          {practice.steps || "No steps provided."}
        </p>
      </div>
    </div>
  );
}
