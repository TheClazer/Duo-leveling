/**
 * WidgetSkeleton — uniform skeleton fallback for Suspense boundaries on
 * the dashboard. Matches the .surface look (themed border + bg) so the
 * skeleton-to-content transition is visually continuous (no layout shift,
 * no color flash).
 *
 * Each dashboard widget on /you and /them is wrapped in
 * <Suspense fallback={<WidgetSkeleton />}>, so widgets stream in
 * independently and slow queries (Github / Leetcode) don't block the page.
 */
export function WidgetSkeleton({
  minHeight = 240,
  label,
}: {
  minHeight?: number;
  label?: string;
}) {
  return (
    <div
      className="surface flex flex-col gap-3 p-5 animate-pulse"
      style={{ minHeight }}
      role="status"
      aria-label={label ?? "Loading"}
    >
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-bg-elevated/60" />
        <div className="h-6 w-16 rounded bg-bg-elevated/60" />
      </div>
      <div className="h-5 w-32 rounded bg-bg-elevated/60" />
      <div className="mt-2 grid flex-1 gap-2">
        <div className="h-3 w-full rounded bg-bg-elevated/40" />
        <div className="h-3 w-5/6 rounded bg-bg-elevated/40" />
        <div className="h-3 w-4/6 rounded bg-bg-elevated/40" />
      </div>
    </div>
  );
}
