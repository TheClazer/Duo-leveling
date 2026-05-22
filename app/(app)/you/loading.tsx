export default function YouLoading() {
  return (
    <div className="animate-fade-in">
      <section className="relative mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-end md:justify-between">
          <div className="h-64 w-64 animate-pulse rounded-full bg-bg-elevated/40 md:h-80 md:w-80" />
          <div className="flex flex-1 flex-col gap-3">
            <div className="h-3 w-32 animate-pulse rounded bg-bg-elevated/40" />
            <div className="h-14 w-64 animate-pulse rounded bg-bg-elevated/40 md:h-20" />
            <div className="h-5 w-40 animate-pulse rounded bg-bg-elevated/40" />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="surface h-48 animate-pulse" />
          <div className="surface h-48 animate-pulse" />
          <div className="surface h-72 animate-pulse" />
          <div className="surface h-72 animate-pulse" />
        </div>
      </section>
    </div>
  );
}
