import { useMemo } from "react";
import { ShieldCheck, BarChart3, Users, Sparkles, CheckCircle2 } from "lucide-react";

export default function AboutPage() {
  const features = useMemo(
    () => [
      {
        icon: <Users className="h-5 w-5" />,
        title: "Community-Driven Knowledge",
        desc: "Community members share practical agricultural knowledge and refine it through feedback, discussion, and lived experience.",
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        title: "Validation & Statistics",
        desc: "Outcome reports are aggregated into validation metrics such as effectiveness counts, confidence, and recommendation rate.",
      },
      {
        icon: <ShieldCheck className="h-5 w-5" />,
        title: "Trust & Confidence",
        desc: "Practices become more reliable as more valid reports confirm them, improving confidence and score.",
      },
      {
        icon: <Sparkles className="h-5 w-5" />,
        title: "Discover What Works",
        desc: "Users can discover promising practices based on real usage, community validation, and measurable outcomes.",
      },
    ],
    []
  );

  const objectives = useMemo(
    () => [
      "Enable users to submit community agricultural practices with clear steps and context.",
      "Allow farmers and other users to apply practices and report real outcomes after implementation.",
      "Compute validation indicators such as effectiveness, recommendation rate, and confidence level.",
      "Provide discussion threads for peer review, clarification, and collaborative learning.",
      "Support bookmarks and follow-up reporting so validation continues over time.",
      "Promote evidence-based agricultural decision-making using community-generated data.",
    ],
    []
  );

  const validationSteps = useMemo(
    () => [
      "A user submits a practice with a title, description, steps, and optional farming context.",
      "Other users apply the practice in real conditions and later submit an outcome report.",
      "Each report includes effectiveness, recommendation, duration, and short evidence-based feedback.",
      "The platform aggregates those reports into validation statistics and confidence indicators.",
      "As more valid outcomes are collected, trust in the practice and its contributor becomes stronger.",
    ],
    []
  );

  const techStack = useMemo(
    () => [
      { k: "Frontend", v: "React + TailwindCSS" },
      { k: "Backend", v: "Node.js + Express" },
      { k: "Database", v: "MySQL" },
      { k: "Auth", v: "JWT (token-based authentication)" },
      { k: "Uploads", v: "Multer + Cloudinary" },
      { k: "API Style", v: "REST endpoints" },
    ],
    []
  );

  const future = useMemo(
    () => [
      "Smarter recommendations based on user activity, crop type, and validation history.",
      "Location-aware suggestions for similar farming environments.",
      "Richer validation summaries such as why a practice works and under which conditions.",
      "Offline-first mobile support for low-connectivity rural communities.",
      "Stronger moderation, audit history, and community verification workflows.",
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
              Community Knowledge Validation System
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300/80">
              The Community Knowledge Validation System (CKVS) is designed to capture agricultural
              practices from the community, validate them through real outcome reporting, and help
              users make better farming decisions using structured evidence instead of assumptions.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 sm:w-[320px]">
            <p className="font-semibold">Project Details</p>
            <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-300/80">
              <p>Community Knowledge Validation System</p>
              <p>Version 1.0</p>
              <p>Developed by Ndong Ghislain Che</p>
              <p>HND Software Engineering Project</p>
            </div>
          </div>
        </div>
      </div>

      {/* PROBLEM + OBJECTIVES */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Problem */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="font-heading text-lg font-bold">Problem Statement</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300/80">
            Many farmers rely on word-of-mouth advice, incomplete recommendations, or practices that
            have never been properly validated. This creates uncertainty, wasted effort, and avoidable
            losses. CKVS addresses that gap by turning shared practices into structured, reviewable,
            and measurable knowledge.
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
            Instead of depending only on assumptions, users can make agricultural decisions using
            real community feedback, measurable outcomes, and stronger trust signals.
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
          This project demonstrates the practical application of software engineering to a real
          community problem by combining requirements analysis, system design, implementation,
          validation logic, moderation, analytics, and user-centered delivery.
        </p>
      </div>
    </div>
  );
}
