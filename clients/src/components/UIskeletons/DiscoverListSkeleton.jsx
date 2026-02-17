import Skeleton from "../ui/Skeleton";

export default function PracticesGridSkeleton({ count = 6 }) {
  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative h-[390px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-md dark:border-white/10 dark:bg-white/5"
        >
          <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/30" />

          <div className="absolute right-3 top-2">
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>

          <div className="absolute left-3 right-3 bottom-[85px] space-y-3">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />

            <div className="flex flex-wrap gap-2 pt-1">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>

          <div className="absolute bottom-3 left-3 right-3">
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
