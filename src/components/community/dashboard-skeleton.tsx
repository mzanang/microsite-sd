export function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Memuat dashboard...">
      {/* Hero Welcome Banner Skeleton */}
      <div className="h-44 w-full rounded-2xl bg-[#075bc5]/70" />

      {/* 4 Stats Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl border border-[#dbe6f5] bg-white p-5 shadow-sm" />
        ))}
      </div>

      {/* Charts Row Skeleton */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.8fr)]">
        <div className="h-72 rounded-2xl border border-[#dbe6f5] bg-white p-5 shadow-sm" />
        <div className="h-72 rounded-2xl border border-[#dbe6f5] bg-white p-5 shadow-sm" />
      </div>

      {/* Activities Row Skeleton */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
        <div className="h-64 rounded-2xl border border-[#dbe6f5] bg-white p-5 shadow-sm" />
        <div className="h-64 rounded-2xl border border-[#dbe6f5] bg-white p-5 shadow-sm" />
      </div>
    </div>
  );
}

