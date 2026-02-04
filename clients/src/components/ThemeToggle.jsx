import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ckvs_theme");
    const isDark = saved === "dark"; // default light
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("ckvs_theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50
                 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
      aria-label="Toggle theme"
    >
      {dark ? "🌙" : "☀️"}
    </button>
  );
}
