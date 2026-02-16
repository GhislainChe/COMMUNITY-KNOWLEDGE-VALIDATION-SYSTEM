import Skeleton from "../ui/Skeleton";

export default function DiscoverListSkeleton({ count = 6 }) {
  return (
    <div className="divide-y divide-slate-200 dark:divide-white/10">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />

            <div className="flex flex-wrap gap-2 pt-1">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
