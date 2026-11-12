export default function RuangLoading() {
  return (
    <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Memuat halaman...">
      {/* Workspace Header Skeleton */}
      <div className="rounded-2xl border border-[#dbe6f5] bg-white px-5 py-6 shadow-[0_8px_22px_rgba(23,83,158,.05)] sm:px-8">
        <div className="h-3 w-28 rounded bg-[#edf4ff]" />
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-lg bg-[#e2ecf8]" />
            <div className="h-4 w-72 max-w-full rounded bg-[#f1f6fd]" />
          </div>
          <div className="h-8 w-24 rounded-lg bg-[#edf4ff]" />
        </div>
      </div>

      {/* Content Skeleton Card */}
      <div className="rounded-2xl border border-[#dbe6f5] bg-white p-6 shadow-[0_8px_22px_rgba(23,83,158,.05)] sm:p-8 space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#e8f1ff]" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-40 rounded bg-[#e2ecf8]" />
            <div className="h-3 w-64 max-w-full rounded bg-[#f1f6fd]" />
          </div>
        </div>
        <div className="pt-4 grid gap-3 sm:grid-cols-2">
          <div className="h-20 rounded-xl border border-[#e1eaf4] bg-[#f8fbff]" />
          <div className="h-20 rounded-xl border border-[#e1eaf4] bg-[#f8fbff]" />
        </div>
        <div className="h-40 rounded-xl border border-[#e1eaf4] bg-[#f8fbff]" />
      </div>
    </div>
  );
}

