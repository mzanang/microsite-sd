"use client";

import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Download, Eye, Info, MousePointerClick, RefreshCw, Search, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Metric = "visits" | "unique_visitors" | "page_views" | "interactions";
type DateRange = { from: string; to: string };
type Totals = { visits: number; unique_visitors: number; page_views: number; interactions: number };
type TrendPoint = { bucket: string; visits: number; unique_visitors: number; page_views: number; interactions: number };
type PopularPage = { page_path: string; page_title: string; page_views: number; unique_visitors: number };
type Breakdown = { source?: string; device?: string; count: number };
type Summary = { totals: Totals; trend: TrendPoint[]; popular_pages: PopularPage[]; sources: Breakdown[]; devices: Breakdown[] };
type AnalyticsResponse = { timezone: string; range: DateRange & { granularity: string }; current: Summary; previous: Summary };

const emptyTotals: Totals = { visits: 0, unique_visitors: 0, page_views: 0, interactions: 0 };
const emptySummary: Summary = { totals: emptyTotals, trend: [], popular_pages: [], sources: [], devices: [] };
const metricLabels: Record<Metric, string> = { visits: "Kunjungan", unique_visitors: "Pengunjung unik", page_views: "Tampilan halaman", interactions: "Interaksi" };

function jakartaDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return jakartaDate(date);
}

function initialRange(): DateRange {
  const today = jakartaDate();
  return { from: shiftDate(today, -6), to: today };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value || 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(`${value}T00:00:00+07:00`));
}

function formatPeriod(value: string) {
  const date = new Date(value.includes("T") ? `${value}Z` : `${value}T00:00:00+07:00`);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", timeZone: "Asia/Jakarta" }).format(date);
}

function percentageChange(current: number, previous: number) {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

function quickRange(value: string): DateRange {
  const today = jakartaDate();
  if (value === "today") return { from: today, to: today };
  if (value === "yesterday") { const yesterday = shiftDate(today, -1); return { from: yesterday, to: yesterday }; }
  if (value === "7d") return { from: shiftDate(today, -6), to: today };
  if (value === "30d") return { from: shiftDate(today, -29), to: today };
  if (value === "this-month") return { from: `${today.slice(0, 7)}-01`, to: today };
  if (value === "last-month") {
    const thisMonth = `${today.slice(0, 7)}-01`;
    const lastMonthEnd = shiftDate(thisMonth, -1);
    return { from: `${lastMonthEnd.slice(0, 7)}-01`, to: lastMonthEnd };
  }
  if (value === "this-year") return { from: `${today.slice(0, 4)}-01-01`, to: today };
  return initialRange();
}

function normaliseSummary(value: Partial<Summary> | undefined): Summary {
  return {
    totals: { ...emptyTotals, ...(value?.totals ?? {}) },
    trend: Array.isArray(value?.trend) ? value.trend : [],
    popular_pages: Array.isArray(value?.popular_pages) ? value.popular_pages : [],
    sources: Array.isArray(value?.sources) ? value.sources : [],
    devices: Array.isArray(value?.devices) ? value.devices : [],
  };
}

export function AnalyticsWorkspace() {
  const [range, setRange] = useState<DateRange>(initialRange);
  const [draftRange, setDraftRange] = useState<DateRange>(initialRange);
  const [period, setPeriod] = useState("7d");
  const [metric, setMetric] = useState<Metric>("visits");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tablePage, setTablePage] = useState(1);

  const load = useCallback(async (nextRange: DateRange) => {
    if (nextRange.from > nextRange.to) { setError("Tanggal mulai tidak boleh melebihi tanggal akhir."); return; }
    setLoading(true);
    setError("");
    setRange(nextRange);
    setDraftRange(nextRange);
    setTablePage(1);
    try {
      const response = await fetch(`/api/admin/analytics?from=${nextRange.from}&to=${nextRange.to}`, { cache: "no-store" });
      const body = await response.json() as AnalyticsResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "Data analitik belum dapat dimuat.");
      setData({ ...body, current: normaliseSummary(body.current), previous: normaliseSummary(body.previous) });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Data analitik belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(initialRange()); }, [load]);

  const current = data?.current ?? emptySummary;
  const previous = data?.previous ?? emptySummary;
  const filteredPages = useMemo(() => current.popular_pages.filter((page) => `${page.page_title} ${page.page_path}`.toLowerCase().includes(search.toLowerCase())), [current.popular_pages, search]);
  const pageSize = 5;
  const visiblePages = filteredPages.slice((tablePage - 1) * pageSize, tablePage * pageSize);
  const pageCount = Math.max(1, Math.ceil(filteredPages.length / pageSize));

  function applyQuick(value: string) {
    setPeriod(value);
    if (value !== "custom") void load(quickRange(value));
  }

  function exportCsv() {
    const rows = [
      ["Periode", `${range.from} - ${range.to}`],
      ["Zona waktu", "Asia/Jakarta"],
      [],
      ["Metrik", "Nilai"],
      ["Total kunjungan", String(current.totals.visits)],
      ["Pengunjung unik", String(current.totals.unique_visitors)],
      ["Tampilan halaman", String(current.totals.page_views)],
      ["Total interaksi", String(current.totals.interactions)],
      [],
      ["Halaman", "Path", "Tampilan halaman", "Pengunjung unik"],
      ...current.popular_pages.map((page) => [page.page_title || "Tanpa judul", page.page_path, String(page.page_views), String(page.unique_visitors)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `analitik-${range.from}-${range.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return <div className="space-y-7">
    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div><p className="section-kicker text-[#6048e8]/75">Ruang kerja admin</p><h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">Analitik & Insight</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/55">Pantau kunjungan microsite berdasarkan data yang benar-benar tercatat.</p></div>
      <button type="button" onClick={exportCsv} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#6048e8] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(96,72,232,.18)] transition hover:bg-[#5138d5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6048e8]"><Download size={16} /> Unduh laporan</button>
    </div>

    <section className="rounded-2xl border border-[#6048e8]/15 bg-white p-4 shadow-sm sm:p-5" aria-label="Filter tanggal">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 flex-1"><label htmlFor="analytics-period" className="mb-2 block text-xs font-bold uppercase tracking-[.14em] text-ink/45">Periode cepat</label><select id="analytics-period" value={period} onChange={(event) => applyQuick(event.target.value)} className="h-11 w-full max-w-xs rounded-xl border border-ink/15 bg-white px-3 text-sm font-semibold outline-none focus:border-[#6048e8] focus:ring-4 focus:ring-[#6048e8]/10"><option value="today">Hari ini</option><option value="yesterday">Kemarin</option><option value="7d">7 hari terakhir</option><option value="30d">30 hari terakhir</option><option value="this-month">Bulan ini</option><option value="last-month">Bulan lalu</option><option value="this-year">Tahun ini</option><option value="custom">Rentang khusus</option></select></div>
        <div className="flex flex-wrap items-end gap-3"><label className="block"><span className="mb-2 block text-xs font-bold text-ink/45">Mulai</span><input type="date" value={draftRange.from} onChange={(event) => { setPeriod("custom"); setDraftRange({ ...draftRange, from: event.target.value }); }} className="h-11 rounded-xl border border-ink/15 px-3 text-sm outline-none focus:border-[#6048e8]" /></label><label className="block"><span className="mb-2 block text-xs font-bold text-ink/45">Akhir</span><input type="date" value={draftRange.to} onChange={(event) => { setPeriod("custom"); setDraftRange({ ...draftRange, to: event.target.value }); }} className="h-11 rounded-xl border border-ink/15 px-3 text-sm outline-none focus:border-[#6048e8]" /></label><button type="button" onClick={() => void load(draftRange)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#6048e8] px-4 text-sm font-bold text-[#6048e8] hover:bg-[#6048e8]/5"><CalendarDays size={16} /> Terapkan</button><button type="button" onClick={() => { const next = initialRange(); setPeriod("7d"); void load(next); }} className="min-h-11 rounded-xl px-3 text-sm font-bold text-ink/55 hover:bg-ink/5">Reset</button></div>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-ink/45"><Info size={14} /> Data ditampilkan dalam zona waktu Asia/Jakarta · {range.from} sampai {range.to}</p>
    </section>

    {error && <div role="alert" className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"><span>{error}</span><button type="button" onClick={() => void load(range)} className="inline-flex min-h-8 items-center gap-2 rounded-lg px-2 hover:bg-red-100"><RefreshCw size={14} /> Coba lagi</button></div>}
    {loading && <p role="status" className="rounded-xl border border-[#6048e8]/15 bg-[#6048e8]/5 px-4 py-3 text-sm font-semibold text-[#6048e8]">Memuat data analitik…</p>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan statistik">
      <MetricCard label="Total kunjungan" value={current.totals.visits} previous={previous.totals.visits} detail="Sesi yang dimulai" icon={<TrendingUp size={18} />} />
      <MetricCard label="Pengunjung unik" value={current.totals.unique_visitors} previous={previous.totals.unique_visitors} detail="Identifier anonim" icon={<Users size={18} />} />
      <MetricCard label="Tampilan halaman" value={current.totals.page_views} previous={previous.totals.page_views} detail="Page view tercatat" icon={<Eye size={18} />} />
      <MetricCard label="Total interaksi" value={current.totals.interactions} previous={previous.totals.interactions} detail="Klik tautan & unduhan" icon={<MousePointerClick size={18} />} />
    </section>

    <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="trend-title">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="section-kicker">Pergerakan data</p><h2 id="trend-title" className="mt-2 font-display text-2xl">Tren Kunjungan Microsite</h2></div><label className="flex items-center gap-2 text-xs font-bold text-ink/55"><span className="sr-only">Metrik grafik</span><select value={metric} onChange={(event) => setMetric(event.target.value as Metric)} className="h-10 rounded-lg border border-ink/15 bg-white px-3 outline-none focus:border-[#6048e8]"><option value="visits">Kunjungan</option><option value="unique_visitors">Pengunjung unik</option><option value="page_views">Tampilan halaman</option><option value="interactions">Interaksi</option></select></label></div>
      <TrendChart data={current.trend} metric={metric} />
    </section>

    <InsightPanel current={current} previous={previous} />

    <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="popular-title">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="section-kicker">Konten teratas</p><h2 id="popular-title" className="mt-2 font-display text-2xl">Halaman Paling Populer</h2><p className="mt-2 text-sm text-ink/55">Diurutkan berdasarkan tampilan halaman pada periode aktif.</p></div><label className="relative block w-full sm:w-64"><span className="sr-only">Cari halaman</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" /><input value={search} onChange={(event) => { setSearch(event.target.value); setTablePage(1); }} placeholder="Cari judul atau URL" className="h-10 w-full rounded-lg border border-ink/15 pl-9 pr-3 text-sm outline-none focus:border-[#6048e8]" /></label></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[42rem] text-left text-sm"><thead className="border-b border-ink/10 text-xs uppercase tracking-[.1em] text-ink/45"><tr><th className="px-3 py-3 font-bold">#</th><th className="px-3 py-3 font-bold">Halaman</th><th className="px-3 py-3 font-bold">URL / path</th><th className="px-3 py-3 text-right font-bold">Tampilan</th><th className="px-3 py-3 text-right font-bold">Pengunjung</th></tr></thead><tbody>{visiblePages.map((page, index) => <tr key={`${page.page_path}-${index}`} className="border-b border-ink/5 last:border-0"><td className="px-3 py-4 font-bold text-[#6048e8]">{(tablePage - 1) * pageSize + index + 1}</td><td className="max-w-[15rem] px-3 py-4 font-semibold">{page.page_title || "Tanpa judul"}</td><td className="max-w-[16rem] truncate px-3 py-4 text-ink/55">{page.page_path}</td><td className="px-3 py-4 text-right font-bold">{formatNumber(Number(page.page_views))}</td><td className="px-3 py-4 text-right text-ink/60">{formatNumber(Number(page.unique_visitors))}</td></tr>)}</tbody></table>{visiblePages.length === 0 && <EmptyState title="Belum ada halaman yang tercatat" detail="Halaman populer akan muncul setelah ada kunjungan publik." />}</div>
      {pageCount > 1 && <div className="mt-4 flex items-center justify-end gap-2"><button type="button" disabled={tablePage === 1} onClick={() => setTablePage((page) => Math.max(1, page - 1))} className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink/10 disabled:opacity-35" aria-label="Halaman sebelumnya"><ChevronLeft size={16} /></button><span className="text-xs font-bold text-ink/55">{tablePage} / {pageCount}</span><button type="button" disabled={tablePage === pageCount} onClick={() => setTablePage((page) => Math.min(pageCount, page + 1))} className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink/10 disabled:opacity-35" aria-label="Halaman berikutnya"><ChevronRight size={16} /></button></div>}
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <BreakdownPanel title="Sumber kunjungan" items={current.sources.map((item) => ({ label: sourceLabel(item.source || "unknown"), value: Number(item.count) }))} empty="Sumber belum tersedia." />
      <BreakdownPanel title="Perangkat pengunjung" items={current.devices.map((item) => ({ label: deviceLabel(item.device || "unknown"), value: Number(item.count) }))} empty="Data perangkat belum tersedia." />
    </section>

    <p className="text-xs leading-5 text-ink/45">Definisi metrik: kunjungan dihitung dari sesi anonim yang dimulai, pengunjung unik dari identifier anonim yang disimpan terbatas di browser, tampilan halaman dari event page view, dan interaksi dari klik tautan atau unduhan.</p>
  </div>;
}

function MetricCard({ label, value, previous, detail, icon }: { label: string; value: number; previous: number; detail: string; icon: React.ReactNode }) {
  const change = percentageChange(value, previous);
  return <article className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6048e8]/10 text-[#6048e8]">{icon}</span><p className="mt-5 text-xs font-bold text-ink/45">{label}</p><p className="mt-1 text-3xl font-extrabold tracking-tight">{formatNumber(value)}</p><div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-ink/45">{detail}</span>{change === null ? <span className="text-[10px] font-bold text-ink/35">Belum ada pembanding</span> : <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${change >= 0 ? "text-emerald-700" : "text-red-700"}`}>{change >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{Math.abs(change).toFixed(1)}%</span>}</div></article>;
}

function TrendChart({ data, metric }: { data: TrendPoint[]; metric: Metric }) {
  if (!data.length) return <EmptyState title="Belum ada data tren" detail="Grafik akan terisi setelah kunjungan publik tercatat." />;
  const width = 900;
  const height = 260;
  const padX = 38;
  const padY = 24;
  const values = data.map((point) => Number(point[metric] ?? 0));
  const max = Math.max(1, ...values);
  const points = values.map((value, index) => { const x = padX + (index * (width - padX * 2)) / Math.max(1, values.length - 1); const y = height - padY - (value / max) * (height - padY * 2); return { x, y, value, label: formatPeriod(data[index].bucket) }; });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  return <div className="mt-6 overflow-x-auto"><div className="min-w-[36rem]"><svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`Grafik ${metricLabels[metric]}`}><g stroke="#e9e7f8" strokeDasharray="3 5">{[0, 1, 2, 3].map((line) => { const y = padY + (line * (height - padY * 2)) / 3; return <line key={line} x1={padX} x2={width - padX} y1={y} y2={y} />; })}</g><path d={path} fill="none" stroke="#6048e8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />{points.map((point) => <g key={`${point.label}-${point.x}`}><circle cx={point.x} cy={point.y} r="6" fill="white" stroke="#6048e8" strokeWidth="3"><title>{`${point.label}: ${formatNumber(point.value)} ${metricLabels[metric].toLowerCase()}`}</title></circle></g>)}<g fill="#7d7891" fontSize="11" textAnchor="middle">{points.filter((_, index) => index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 5) === 0).map((point) => <text key={`label-${point.x}`} x={point.x} y={height - 2}>{point.label}</text>)}</g></svg></div></div>;
}

function InsightPanel({ current, previous }: { current: Summary; previous: Summary }) {
  const hasData = current.totals.page_views > 0 || current.totals.visits > 0;
  const topPage = current.popular_pages[0];
  const topDay = [...current.trend].sort((a, b) => Number(b.visits) - Number(a.visits))[0];
  const change = percentageChange(current.totals.visits, previous.totals.visits);
  const topDevice = [...current.devices].filter((item) => item.device !== "unknown").sort((a, b) => Number(b.count) - Number(a.count))[0];
  const insights = !hasData ? ["Insight belum tersedia karena belum ada data kunjungan pada periode ini."] : [
    topPage?.page_views ? `${topPage.page_title || topPage.page_path} menjadi halaman dengan tampilan terbanyak pada periode ini.` : "Belum ada halaman dengan data tampilan yang cukup.",
    topDay?.visits ? `Aktivitas kunjungan tertinggi tercatat pada ${formatPeriod(topDay.bucket)}.` : "Belum ada sesi yang cukup untuk menentukan hari teraktif.",
    change === null ? "Perbandingan periode belum tersedia karena periode sebelumnya belum memiliki kunjungan." : `Jumlah kunjungan ${change >= 0 ? "meningkat" : "menurun"} ${Math.abs(change).toFixed(1)}% dibandingkan periode sebelumnya.`,
    topDevice ? `Sebagian besar pengunjung menggunakan perangkat ${deviceLabel(topDevice.device || "unknown").toLowerCase()}.` : "Data perangkat belum cukup untuk membuat insight.",
  ];
  return <section className="rounded-2xl border border-[#6048e8]/15 bg-[#6048e8]/[.06] p-5 sm:p-7" aria-labelledby="insight-title"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6048e8] text-white"><BarChart3 size={19} /></span><div><p className="section-kicker text-[#6048e8]/75">Ringkasan otomatis</p><h2 id="insight-title" className="mt-1 font-display text-2xl">Insight Kunjungan</h2></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{insights.map((insight) => <p key={insight} className="rounded-xl border border-[#6048e8]/10 bg-white/80 px-4 py-3 text-sm leading-6 text-ink/70">{insight}</p>)}</div></section>;
}

function BreakdownPanel({ title, items, empty }: { title: string; items: Array<{ label: string; value: number }>; empty: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-7"><h2 className="font-display text-2xl">{title}</h2>{!items.length || !total ? <EmptyState title={empty} detail="Metrik ini akan muncul jika data tersedia." /> : <div className="mt-5 space-y-4">{items.map((item) => { const percentage = (item.value / total) * 100; return <div key={item.label}><div className="flex justify-between gap-3 text-sm"><span className="font-semibold">{item.label}</span><span className="font-bold">{formatNumber(item.value)} <span className="font-normal text-ink/45">({percentage.toFixed(1)}%)</span></span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#6048e8]/10"><div className="h-full rounded-full bg-[#6048e8]" style={{ width: `${percentage}%` }} /></div></div>; })}</div>}</section>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="flex min-h-32 flex-col items-center justify-center px-4 py-8 text-center"><BarChart3 size={24} className="text-[#6048e8]/45" /><p className="mt-3 text-sm font-bold text-ink/65">{title}</p><p className="mt-1 text-xs leading-5 text-ink/45">{detail}</p></div>;
}

function sourceLabel(value: string) {
  return ({ direct: "Direct", search: "Search", social: "Social", referral: "Referral", unknown: "Tidak diketahui" } as Record<string, string>)[value] || "Tidak diketahui";
}

function deviceLabel(value: string) {
  return ({ mobile: "Mobile", desktop: "Desktop", tablet: "Tablet", unknown: "Tidak diketahui" } as Record<string, string>)[value] || "Tidak diketahui";
}
