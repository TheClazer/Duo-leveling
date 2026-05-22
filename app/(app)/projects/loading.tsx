export default function ProjectsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 animate-fade-in">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <div className="h-3 w-24 animate-pulse rounded bg-bg-elevated/40" />
          <div className="mt-2 h-12 w-48 animate-pulse rounded bg-bg-elevated/40" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded bg-bg-elevated/40" />
      </div>
      <div className="mb-6 flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 w-16 animate-pulse rounded bg-bg-elevated/40" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-lg bg-bg-elevated/40" />
        ))}
      </div>
    </div>
  );
}
