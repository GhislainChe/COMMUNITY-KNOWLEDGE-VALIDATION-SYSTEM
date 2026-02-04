import { Link, Navigate } from "react-router-dom";
import { isLoggedIn } from "../auth/token";
import {
  ArrowRight,
  ShieldCheck,
  Search,
  MessageSquareText,
} from "lucide-react";
import heroImg from "../assets/hero.jpg"; // <-- add your image here

export default function LandingPage() {
  if (isLoggedIn()) return <Navigate to="/app/practices" replace />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="text-lg tracking-wide">
          <span className="font-brand font-semibold">CKVS</span>
          <span className="mx-2 text-slate-400">·</span>
          {/* <span className="font-sans text-sm text-slate-500">
            Preserving and validating knowledge
          </span> */}
        </div>

        <nav className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
          >
            Register
          </Link>
        </nav>
      </header>

      {/* Hero section */}
      <main className="mx-auto max-w-6xl px-6">
        <div className="grid min-h-[calc(100vh-90px)] items-center gap-10 lg:grid-cols-2">
          {/* Left content */}
          <div>
            <h1 className="font-heading text-4xl font-semibold leading-tight sm:text-5xl">
              Preserve community knowledge.{" "}
              <span className="text-emerald-600">Validate what works.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
              CKVS helps communities capture agricultural practices, record real
              outcomes, and build trust over time—so effective knowledge is
              preserved and easy to discover.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Sign in
              </Link>
            </div>

            {/* Mini cards to balance left side on large screens */}
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Validated Practices
                </p>
                <p className="mt-1 font-heading text-2xl font-semibold text-slate-900">
                  120+
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Ranked by real outcomes.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Outcome Reports
                </p>
                <p className="mt-1 font-heading text-2xl font-semibold text-emerald-700">
                  350+
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Effective • Partial • Ineffective.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Trusted Contributors
                </p>
                <p className="mt-1 font-heading text-2xl font-semibold text-slate-900">
                  60+
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Credibility scoring built-in.
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Academic project demo — Agricultural practices in a selected
              community.
            </p>
          </div>

          {/* Right hero image + feature cards */}
          <div className="space-y-5">
            {/* Cinematic image block */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <img
                src={heroImg}
                alt="Agricultural community"
                className="h-56 w-full object-cover sm:h-64"
              />
              {/* overlay to make it cinematic */}
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/50 via-slate-900/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <p className="font-heading text-lg font-semibold">
                  Turning local experience into trusted knowledge.
                </p>
                <p className="mt-1 text-sm text-white/80">
                  Report outcomes • Build credibility • Preserve practices
                </p>
              </div>
            </div>

            {/* Feature cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-lg font-semibold">
                  Outcome validation
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Practices gain credibility based on real results, not
                  opinions.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-lg font-semibold">
                  Easy discovery
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Search by crop, problem type, season and location.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                  <MessageSquareText className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-lg font-semibold">
                  Community discussions
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Talk under each practice to clarify and share improvements.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-lg font-semibold">
                  Trust scoring
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Contributors gain credibility as their practices prove
                  effective.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer stays near bottom, not floating mid page */}
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} CKVS · HND Software Engineering Project
        </footer>
      </main>
    </div>
  );
}
