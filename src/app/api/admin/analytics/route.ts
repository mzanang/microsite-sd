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
  const from = isValidDate(request.nextUrl.searchParams.get("from")) ? request.nextUrl.searchParams.get("from")! : today;
  const to = isValidDate(request.nextUrl.searchParams.get("to")) ? request.nextUrl.searchParams.get("to")! : today;
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

  return NextResponse.json({
    timezone: "Asia/Jakarta",
    range: { from, to, granularity },
    current: current.data ?? {},
    previous: previous.data ?? {},
  }, { headers: { "Cache-Control": "private, no-store" } });
}
