import { useState } from "react";
import { api } from "../api/api";
import { setToken } from "../auth/token";
import { Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, UserCircle2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { isAuthenticated } from "../utils/auth";


export default function LoginPage() {
  if (isAuthenticated()) return <Navigate to="/app" replace />;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      setToken(res.data.token);
      setMsg("Login successful");
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
    } catch (err) {
      setMsg(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100">
      {/* Top-left brand */}
      <div className="px-6 py-4">
        <h1 className="text-lg tracking-wide">
          <span className="font-brand font-semibold">CKVS</span>
          <span className="mx-2 text-slate-400">·</span>
          <span className="font-sans text-sm font-normal text-slate-500 dark:text-slate-300/70">
            Preserving and validating knowledge
          </span>
        </h1>
      </div>

      <div className="mx-auto flex max-w-6xl justify-center px-4 pb-12">
        <div className="w-full max-w-xl">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
              <UserCircle2 className="h-8 w-8 text-emerald-500" />
            </div>

            <h1 className="font-heading text-3xl font-semibold">
              Sign in to your account
            </h1>
            <p className="mt-2 text-base text-slate-500 dark:text-slate-300/70">
              Enter your details to login.
            </p>
          </div>

          {/* Social buttons (placeholders) */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled
              className="flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-500 shadow-sm
                         dark:border-white/10 dark:bg-white/5 dark:text-slate-300/60"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M16.7 13.3c0-2.4 2-3.5 2.1-3.6-1.1-1.6-2.9-1.8-3.5-1.8-1.5-.1-2.9.9-3.7.9-.8 0-2-.9-3.3-.9-1.7 0-3.2 1-4.1 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.2 1.7 2.5 2.9 2.4 1.2 0 1.6-.7 3-1.4 1.4-.6 1.8-.6 3.2 0 1.3.6 1.8 1.4 3 1.4 1.2 0 2-1.1 2.8-2.3.9-1.3 1.2-2.6 1.2-2.7-.1 0-2.3-.9-2.3-3.8zM14.5 4.6c.6-.7 1-1.6.9-2.6-.9.1-2 .6-2.6 1.3-.6.6-1.1 1.6-.9 2.5 1 .1 2-.5 2.6-1.2z" />
              </svg>
              Sign in with Apple
            </button>

            <button
              type="button"
              disabled
              className="flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-500 shadow-sm
                         dark:border-white/10 dark:bg-white/5 dark:text-slate-300/60"
            >
              <svg viewBox="0 0 48 48" className="h-5 w-5">
                <path
                  fill="#FFC107"
                  d="M43.611 20.083H42V20H24v8h11.303C33.92 32.659 29.295 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.959 3.041l5.657-5.657C34.024 6.053 29.273 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.651-.389-3.917z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.306 14.691l6.571 4.819C14.655 16.108 19.01 12 24 12c3.059 0 5.842 1.154 7.959 3.041l5.657-5.657C34.024 6.053 29.273 4 24 4c-7.682 0-14.344 4.33-17.694 10.691z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.192 0 9.86-1.986 13.409-5.209l-6.19-5.238C29.175 35.091 26.715 36 24 36c-5.273 0-9.737-3.317-11.164-7.946l-6.52 5.02C9.505 39.556 16.227 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.611 20.083H42V20H24v8h11.303c-.681 2.017-1.971 3.69-3.704 4.791l.003-.002 6.19 5.238C36.971 39.12 44 34 44 24c0-1.341-.138-2.651-.389-3.917z"
                />
              </svg>
              Sign in with Google
            </button>
          </div>

          {/* Form */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-white/5 sm:p-8">
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Email Address <span className="text-emerald-600">*</span>
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                  <Mail className="h-5 w-5 text-slate-400" />
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="hello@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Password <span className="text-emerald-600">*</span>
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                  <Lock className="h-5 w-5 text-slate-400" />
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    type={showPwd ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="text-slate-400"
                  >
                    {showPwd ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>

              {msg && (
                <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700 dark:bg-white/10 dark:text-slate-200">
                  {msg}
                </p>
              )}
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-300/70">
            Don’t have an account?{" "}
            <Link className="font-semibold text-emerald-600 hover:underline" to="/register">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
