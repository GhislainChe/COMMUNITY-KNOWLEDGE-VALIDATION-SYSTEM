import { useMemo } from "react";
import { ShieldCheck, BarChart3, Users, Sparkles, CheckCircle2 } from "lucide-react";

export default function AboutPage() {
  const features = useMemo(
    () => [
      {
        icon: <Users className="h-5 w-5" />,
        title: "Community-Driven Knowledge",
        desc: "Farmers share real practices and learn from each other using structured feedback and discussions.",
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        title: "Validation & Statistics",
        desc: "Outcome reports are aggregated into counts (effective/partial/ineffective) plus recommendation rate.",
      },
      {
        icon: <ShieldCheck className="h-5 w-5" />,
        title: "Trust & Confidence",
        desc: "Practices become more reliable as more valid reports confirm them, improving confidence and score.",
      },
      {
        icon: <Sparkles className="h-5 w-5" />,
        title: "Discover What Works",
        desc: "Discover trending and highly recommended practices based on real usage and results, not assumptions.",
      },
    ],
    []
  );

  const objectives = useMemo(
    () => [
      "Enable farmers to submit agricultural practices with clear steps and materials.",
      "Allow users to apply practices and submit real outcomes after implementation.",
      "Compute effectiveness indicators (effective / partial / ineffective) and recommendation rate.",
      "Provide discussion threads per practice for peer review and clarifications.",
      "Support bookmarks to track applied practices and submit outcomes later.",
      "Improve decision-making by encouraging evidence-based farming actions.",
    ],
    []
  );

  const validationSteps = useMemo(
    () => [
      "A farmer/community member submits a practice (title, description, steps, optional context).",
      "Other users apply the practice and later submit an outcome report (effective/partial/ineffective).",
      "Users also indicate recommendation (Yes/No/Maybe) and provide a short comment + duration.",
      "The system aggregates reports and generates statistics and insight (e.g., recommended rate).",
      "As valid reports increase, the practice becomes more trustworthy and confidence improves.",
    ],
    []
  );

  const techStack = useMemo(
    () => [
      { k: "Frontend", v: "React + TailwindCSS" },
      { k: "Backend", v: "Node.js + Express" },
      { k: "Database", v: "MySQL" },
      { k: "Auth", v: "JWT (token-based authentication)" },
      { k: "Uploads", v: "Multer + /uploads static hosting" },
      { k: "API Style", v: "REST endpoints" },
    ],
    []
  );

  const future = useMemo(
    () => [
      "Personalized recommendations (based on crops applied, location, and outcomes).",
      "Location-aware suggestions (nearby validated practices).",
      "AI-assisted summaries: “Why this works” + best conditions.",
      "Offline-first mobile app for rural areas.",
      "Stronger moderation workflows and community verification roles.",
    ],
    []
  );

  return (
    <div className="p-3 sm:p-4">
      {/* HERO */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-column sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-300/70">
              About the System
            </p>
            <h1 className="mt-1 font-heading text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
              Agricultural Practice Validation & Awareness Platform
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300/80">
              This system is designed to help farmers and community members share agricultural practices,
              apply them in real life, and validate whether they are effective using structured outcome
              reporting and statistics. The goal is to reduce trial-and-error farming by promoting
              evidence-based decision making.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 sm:w-[320px]">
            <p className="font-semibold">Core Value</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300/80">
              Turning community knowledge into <b>validated knowledge</b> using data, outcomes, and trust.
            </p>
          </div>
        </div>
      </div>

      {/* PROBLEM + OBJECTIVES */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Problem */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="font-heading text-lg font-bold">Problem Statement</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300/80">
            Many farmers apply agricultural practices based on rumors, incomplete advice, or unverified
            information. As a result, they risk crop failure, financial losses, and time waste. There is
            often no structured system that tracks real outcomes, measures effectiveness, and builds trust
            from community validation.
          </p>
        </div>

        {/* Objectives */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="font-heading text-lg font-bold">Objectives</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300/80">
            {objectives.map((o, idx) => (
              <li key={idx} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* FEATURES */}
      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
        <h2 className="font-heading text-lg font-bold">Key Features</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <span className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/10">
                  {f.icon}
                </span>
                <p className="font-semibold">{f.title}</p>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300/80">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* HOW VALIDATION WORKS */}
      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
        <h2 className="font-heading text-lg font-bold">How Validation Works</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300/80">
          The platform turns practice sharing into a structured validation process:
        </p>

        <ol className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300/80">
          {validationSteps.map((s, idx) => (
            <li key={idx} className="flex gap-3">
              <div className="mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-emerald-600/15 text-xs font-bold text-emerald-700 dark:text-emerald-200">
                {idx + 1}
              </div>
              <span>{s}</span>
            </li>
          ))}
        </ol>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          <p className="font-semibold">Why this matters</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300/80">
            Instead of relying on assumptions, farmers can make choices based on real results reported by
            other users in similar conditions.
          </p>
        </div>
      </div>

      {/* TECH STACK + FUTURE */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="font-heading text-lg font-bold">Technology Stack</h2>
          <div className="mt-3 space-y-2">
            {techStack.map((t) => (
              <div
                key={t.k}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5"
              >
                <span className="font-semibold text-slate-700 dark:text-slate-200">{t.k}</span>
                <span className="text-slate-600 dark:text-slate-300/80">{t.v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="font-heading text-lg font-bold">Future Improvements</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300/80">
            {future.map((f, idx) => (
              <li key={idx} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* FOOTER NOTE */}
      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300/80">
        <p className="font-semibold text-slate-900 dark:text-white">Project Note</p>
        <p className="mt-1">
          This platform supports your HND goal by demonstrating a full software development lifecycle:
          requirements, design, implementation, testing, and evaluation — with strong real-world relevance.
        </p>
      </div>
    </div>
  );
}
