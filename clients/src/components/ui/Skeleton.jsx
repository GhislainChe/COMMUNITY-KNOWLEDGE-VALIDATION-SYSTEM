export default function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/70 dark:bg-white/10 ${className}`}
    />
  );
}
