import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/api";
import {
  LogOut,
  User,
  Bookmark,
  MessageSquareText,
  Pencil,
  Trash2,
} from "lucide-react";

export default function ProfilePage() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, []);

  const [loading, setLoading] = useState(true);
  const [appliedCount, setAppliedCount] = useState(0);
  const [threadsCount, setThreadsCount] = useState(0);
  const [myPractices, setMyPractices] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        if (!user) {
          navigate("/login", { replace: true });
          return;
        }

        // Bookmarks
        const appliedRes = await api.get("/practices/applied");
        const applied = appliedRes.data?.applied || [];
        setAppliedCount(applied.length);

        // Discussions
        const threadsRes = await api.get("/discussions/mine");
        const threads = threadsRes.data?.threads || [];
        setThreadsCount(threads.length);

        // My Practices
        const mineRes = await api.get("/practices/mine");
        setMyPractices(mineRes.data?.practices || []);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [navigate, user]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this practice?"))
      return;

    try {
      await api.delete(`/practices/${id}`);
      setMyPractices((prev) =>
        prev.filter((p) => p.practiceId !== id)
      );
    } catch (err) {
      alert("Failed to delete.");
    }
  }

  if (loading) return <p className="p-4 text-slate-500">Loading...</p>;

  return (
    <div className="p-4 space-y-6">
      {/* PROFILE HEADER */}
      <div className="rounded-3xl border p-6 bg-white dark:bg-white/5">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{user?.fullName}</h1>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4 bg-white dark:bg-white/5">
          <div className="flex items-center gap-2 font-semibold">
            <Bookmark size={18} />
            Bookmarks
          </div>
          <p className="text-2xl font-bold mt-2">{appliedCount}</p>
        </div>

        <div className="rounded-2xl border p-4 bg-white dark:bg-white/5">
          <div className="flex items-center gap-2 font-semibold">
            <MessageSquareText size={18} />
            Discussions
          </div>
          <p className="text-2xl font-bold mt-2">{threadsCount}</p>
        </div>
      </div>

      {/* MY CREATED PRACTICES */}
      <div className="rounded-3xl border p-6 bg-white dark:bg-white/5">
        <h2 className="text-lg font-bold mb-4">
          My Created Practices ({myPractices.length})
        </h2>

        {myPractices.length === 0 && (
          <p className="text-slate-500">You have not created any practice yet.</p>
        )}

        <div className="space-y-3">
          {myPractices.map((p) => (
            <div
              key={p.practiceId}
              className="border rounded-2xl p-4 flex justify-between items-start"
            >
              <div>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {p.description?.slice(0, 100)}...
                </p>
                <p className="text-xs mt-1 text-slate-400">
                  Status: {p.status}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    navigate(`/app/practices/${p.practiceId}`)
                  }
                  className="p-2 rounded-xl border hover:bg-slate-50"
                >
                  <Pencil size={16} />
                </button>

                <button
                  onClick={() => handleDelete(p.practiceId)}
                  className="p-2 rounded-xl border text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
