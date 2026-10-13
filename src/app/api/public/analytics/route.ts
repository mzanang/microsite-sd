import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

const eventSchema = z.object({
  event_type: z.enum(["page_view", "session_start", "link_click", "download"]),
  page_path: z.string().trim().min(1).max(240),
  page_title: z.string().trim().max(160).default(""),
  target_url: z.string().trim().max(1000).optional(),
  session_id: z.string().regex(/^[a-zA-Z0-9_-]{16,128}$/),
  visitor_id: z.string().regex(/^[a-zA-Z0-9_-]{16,128}$/),
  referrer_source: z.enum(["direct", "search", "social", "referral", "unknown"]),
  device_category: z.enum(["mobile", "desktop", "tablet", "unknown"]),
});

const requestBuckets = new Map<string, { startedAt: number; count: number }>();

function requestKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function isAllowed(key: string) {
  const now = Date.now();
  const bucket = requestBuckets.get(key);
  if (!bucket || now - bucket.startedAt > 60_000) {
    requestBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (bucket.count >= 30) return false;
  bucket.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  if (!supabaseConfigured()) return new NextResponse(null, { status: 204 });
  if (!isAllowed(requestKey(request))) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_event" }, { status: 400 });

  const supabase = await createClient();
  const { data: site } = await supabase.from("microsites").select("id").eq("slug", "sd-negeri-dukuhwaru-01").eq("publication_status", "published").maybeSingle();
  if (!site) return new NextResponse(null, { status: 204 });

  const { error } = await supabase.from("analytics_events").insert({
    microsite_id: site.id,
    ...parsed.data,
    target_url: parsed.data.target_url || null,
    occurred_at: new Date().toISOString(),
  });
  if (error) return new NextResponse(null, { status: 204 });
  return NextResponse.json({ ok: true }, { status: 202 });
}
