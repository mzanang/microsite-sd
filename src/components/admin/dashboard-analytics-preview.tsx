import Link from "next/link";
import { BarChart3, Eye, MousePointerClick, TrendingUp, Users } from "lucide-react";
import type { AdminDashboardAnalytics } from "@/lib/data";

function number(value: number) { return new Intl.NumberFormat("id-ID").format(value); }
function period(value: string) {
  const date = new Date(`${value}Z`);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" }).format(date);
}

export function DashboardAnalyticsPreview({ analytics }: { analytics: AdminDashboardAnalytics }) {
  const values = analytics.trend.map((item) => Number(item.visits));
  const max = Math.max(1, ...values);
  const hasData = analytics.totals.visits > 0 || analytics.totals.page_views > 0;
  const width = 860;
  const height = 220;
  const padX = 34;
  const padY = 22;
  const points = values.map((value, index) => ({ x: padX + (index * (width - padX * 2)) / Math.max(1, values.length - 1), y: height - padY - (value / max) * (height - padY * 2), value, label: period(analytics.trend[index].bucket) }));
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  return <section className="rounded-[1.5rem] border border-[#6048e8]/15 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="dashboard-analytics-title">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="section-kicker text-[#6048e8]/75">Ringkasan kunjungan</p><h2 id="dashboard-analytics-title" className="mt-2 font-display text-2xl">Tren kunjungan microsite</h2><p className="mt-2 text-sm leading-6 text-ink/55">Data aktual 7 hari terakhir dalam zona waktu Asia/Jakarta.</p></div><Link href="/admin/analytics" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#6048e8] px-3 text-xs font-bold text-[#6048e8] transition hover:bg-[#6048e8] hover:text-white">Lihat detail analitik</Link></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MiniMetric label="Total kunjungan" value={analytics.totals.visits} icon={<TrendingUp size={16} />} /><MiniMetric label="Pengunjung unik" value={analytics.totals.unique_visitors} icon={<Users size={16} />} /><MiniMetric label="Tampilan halaman" value={analytics.totals.page_views} icon={<Eye size={16} />} /><MiniMetric label="Total interaksi" value={analytics.totals.interactions} icon={<MousePointerClick size={16} />} /></div>
    {!hasData ? <div className="mt-6 flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[#6048e8]/20 bg-[#6048e8]/[.03] px-4 text-center"><BarChart3 size={24} className="text-[#6048e8]/50" /><p className="mt-3 text-sm font-bold text-ink/65">Belum ada data kunjungan</p><p className="mt-1 max-w-md text-xs leading-5 text-ink/45">Grafik akan muncul setelah pengunjung membuka microsite publik dan event analytics tercatat.</p></div> : <div className="mt-6 overflow-x-auto"><div className="min-w-[34rem]"><svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Grafik tren kunjungan 7 hari terakhir"><g stroke="#e9e7f8" strokeDasharray="3 5">{[0, 1, 2, 3].map((line) => { const y = padY + (line * (height - padY * 2)) / 3; return <line key={line} x1={padX} x2={width - padX} y1={y} y2={y} />; })}</g><path d={path} fill="none" stroke="#6048e8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />{points.map((point) => <g key={`${point.label}-${point.x}`}><circle cx={point.x} cy={point.y} r="5" fill="white" stroke="#6048e8" strokeWidth="3"><title>{`${point.label}: ${number(point.value)} kunjungan`}</title></circle></g>)}<g fill="#7d7891" fontSize="10" textAnchor="middle">{points.map((point) => <text key={`label-${point.x}`} x={point.x} y={height - 2}>{point.label}</text>)}</g></svg></div></div>}
  </section>;
}

function MiniMetric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) { return <div className="flex items-center gap-3 rounded-xl border border-ink/10 bg-[#faf9ff] px-3 py-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6048e8]/10 text-[#6048e8]">{icon}</span><span className="min-w-0"><span className="block truncate text-[11px] font-bold text-ink/45">{label}</span><span className="mt-0.5 block text-lg font-extrabold tracking-tight">{number(value)}</span></span></div>; }
