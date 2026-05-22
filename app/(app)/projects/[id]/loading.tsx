export default function ProjectTabLoading() {
  return (
    <div className="space-y-3" aria-busy>
      <div className="surface h-48 animate-pulse" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="surface h-32 animate-pulse" />
        <div className="surface h-32 animate-pulse" />
        <div className="surface h-32 animate-pulse" />
      </div>
    </div>
  );
}
