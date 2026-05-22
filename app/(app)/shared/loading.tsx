export default function SharedLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 animate-fade-in">
      <div className="surface h-56 animate-pulse" />
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="surface h-64 animate-pulse" />
        <div className="surface h-64 animate-pulse" />
        <div className="surface h-72 animate-pulse lg:col-span-2" />
      </div>
    </div>
  );
}
