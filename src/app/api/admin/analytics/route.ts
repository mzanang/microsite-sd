import { NextRequest, NextResponse } from "next/server";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function jakartaStart(date: string) {
  return new Date(`${date}T00:00:00+07:00`);
}

function nextJakartaDay(date: string) {
  const value = jakartaStart(date);
  value.setUTCDate(value.getUTCDate() + 1);
  return value;
}

function defaultJakartaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

function formatJakartaDate(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

function shiftJakartaDate(date: string, days: number) {
  const value = jakartaStart(date);
  value.setUTCDate(value.getUTCDate() + days);
  return formatJakartaDate(value);
}

type TrendPoint = { bucket: string; visits: number; unique_visitors: number; page_views: number; interactions: number };

function fillDailyTrend(value: unknown, from: string, to: string) {
  const points = Array.isArray(value) ? value as Array<Partial<TrendPoint>> : [];
  const byDate = new Map(points.map((point) => [String(point.bucket ?? "").slice(0, 10), point]));
  const trend: TrendPoint[] = [];
  for (let date = from; date <= to; date = shiftJakartaDate(date, 1)) {
    const point = byDate.get(date);
    trend.push({
      bucket: point?.bucket ? String(point.bucket) : `${date}T00:00:00`,
      visits: Number(point?.visits ?? 0),
      unique_visitors: Number(point?.unique_visitors ?? 0),
      page_views: Number(point?.page_views ?? 0),
      interactions: Number(point?.interactions ?? 0),
    });
  }
  return trend;
}

function normaliseSummary(value: unknown, from: string, to: string, granularity: string) {
  if (!value || typeof value !== "object") return {};
  const summary = value as Record<string, unknown>;
  return granularity === "day" ? { ...summary, trend: fillDailyTrend(summary.trend, from, to) } : summary;
}

function isValidDate(value: string | null): value is string {
  if (!value || !datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00+07:00`);
  const [year, month, day] = value.split("-").map(Number);
  return !Number.isNaN(parsed.valueOf()) && parsed.getUTCFullYear() === year && parsed.getUTCMonth() + 1 === month && parsed.getUTCDate() === day;
}

export async function GET(request: NextRequest) {
  if (!supabaseConfigured()) return NextResponse.json({ error: "Supabase belum dikonfigurasi di environment." }, { status: 503 });
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Sesi admin tidak ditemukan." }, { status: 401 });
  const { data: profile } = await supabase.from("admin_profiles").select("id").eq("user_id", userData.user.id).eq("is_active", true).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Akses analitik tidak diizinkan." }, { status: 403 });

  const today = defaultJakartaDate();
  const requestedFrom = isValidDate(request.nextUrl.searchParams.get("from")) ? request.nextUrl.searchParams.get("from")! : "";
  const to = isValidDate(request.nextUrl.searchParams.get("to")) ? request.nextUrl.searchParams.get("to")! : today;
  const from = requestedFrom || shiftJakartaDate(to, -6);
  const fromDate = jakartaStart(from);
  const toExclusive = nextJakartaDay(to);
  if (fromDate >= toExclusive) return NextResponse.json({ error: "Tanggal mulai harus sebelum atau sama dengan tanggal akhir." }, { status: 400 });

  const duration = toExclusive.getTime() - fromDate.getTime();
  const previousFrom = new Date(fromDate.getTime() - duration);
  const granularity = duration <= 31 * 24 * 60 * 60 * 1000 ? "day" : duration <= 180 * 24 * 60 * 60 * 1000 ? "week" : "month";
  const [current, previous] = await Promise.all([
    supabase.rpc("get_analytics_summary", { p_microsite_slug: "sd-negeri-dukuhwaru-01", p_from: fromDate.toISOString(), p_to: toExclusive.toISOString(), p_granularity: granularity }),
    supabase.rpc("get_analytics_summary", { p_microsite_slug: "sd-negeri-dukuhwaru-01", p_from: previousFrom.toISOString(), p_to: fromDate.toISOString(), p_granularity: granularity }),
  ]);
  if (current.error || previous.error) return NextResponse.json({ error: "Data analitik belum dapat dimuat.", details: current.error?.message || previous.error?.message }, { status: 500 });

  const previousFromDate = formatJakartaDate(previousFrom);
  const previousToDate = shiftJakartaDate(from, -1);
  return NextResponse.json({
    timezone: "Asia/Jakarta",
    range: { from, to, granularity },
    current: normaliseSummary(current.data, from, to, granularity),
    previous: normaliseSummary(previous.data, previousFromDate, previousToDate, granularity),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
