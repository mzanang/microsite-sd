import { NextResponse } from "next/server";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!supabaseConfigured()) return NextResponse.json({ total_visits: null, error: "unavailable" }, { status: 503 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_visitor_stats");
  if (error) return NextResponse.json({ total_visits: null, error: "unavailable" }, { status: 503 });

  return NextResponse.json({ total_visits: Number(data?.total_visits ?? 0) }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
