export default function FeedLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 animate-fade-in">
      <div className="mb-6">
        <div className="h-3 w-32 animate-pulse rounded bg-bg-elevated/40" />
        <div className="mt-2 h-12 w-32 animate-pulse rounded bg-bg-elevated/40" />
      </div>
      <div className="surface mb-4 h-32 animate-pulse" />
      <div className="space-y-4">
        <div className="surface h-40 animate-pulse" />
        <div className="surface h-32 animate-pulse" />
        <div className="surface h-48 animate-pulse" />
      </div>
    </div>
  );
}
