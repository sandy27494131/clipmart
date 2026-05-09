export default function BrowseSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="animate-pulse rounded-2xl border border-stone-200 bg-white/70 p-5"
        >
          <div className="h-24 rounded-xl bg-stone-200" />
          <div className="mt-4 h-4 w-24 rounded bg-stone-200" />
          <div className="mt-3 h-6 w-3/4 rounded bg-stone-200" />
          <div className="mt-2 h-4 w-full rounded bg-stone-200" />
          <div className="mt-1 h-4 w-2/3 rounded bg-stone-200" />
        </div>
      ))}
    </div>
  );
}
