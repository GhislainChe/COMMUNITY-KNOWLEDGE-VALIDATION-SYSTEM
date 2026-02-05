export function getTheme() {
  return localStorage.getItem("theme") || "light";
}

export function applyTheme(theme) {
  const root = document.documentElement;

  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");

  localStorage.setItem("theme", theme);
}

export function toggleTheme() {
  const current = getTheme();
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
