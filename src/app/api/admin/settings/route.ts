import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

const schema = z.object({ title: z.string().trim().min(1).max(120), address: z.string().trim().min(1).max(300), maps_url: z.string().trim().url(), description: z.string().trim().max(240), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), contacts: z.array(z.object({ id: z.string().trim().min(1).max(80), label: z.string().trim().min(1).max(80), value: z.string().trim().min(1).max(160), href: z.string().trim().min(1).max(500), icon: z.enum(["instagram", "youtube", "tiktok", "mail", "whatsapp", "phone", "globe"]), is_enabled: z.boolean() })), settings: z.object({ site_title_font_family: z.enum(["poppins", "plus-jakarta", "inter", "dm-sans"]), site_title_text_weight: z.enum(["normal", "semibold", "bold"]) }).passthrough().optional() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Informasi tidak valid.", details: parsed.error.flatten() }, { status: 400 });
  if (!supabaseConfigured()) return NextResponse.json({ error: "Supabase belum dikonfigurasi di environment." }, { status: 503 });
  const supabase = await createClient(); const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Sesi admin tidak ditemukan." }, { status: 401 });
  const { data: profile } = await supabase.from("admin_profiles").select("id").eq("user_id", userData.user.id).eq("is_active", true).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const { data: site } = await supabase.from("microsites").select("id").eq("slug", "sd-negeri-dukuhwaru-01").single();
  if (!site) return NextResponse.json({ error: "Microsite tidak ditemukan." }, { status: 404 });
  const { error: siteError } = await supabase.from("microsites").update({ title: parsed.data.title, address: parsed.data.address, maps_url: parsed.data.maps_url, description: parsed.data.description, latitude: parsed.data.latitude, longitude: parsed.data.longitude, updated_at: new Date().toISOString() }).eq("id", site.id);
  if (siteError) return NextResponse.json({ error: "Gagal menyimpan identitas." }, { status: 500 });
  const { data: contactComponent } = await supabase.from("microsite_components").select("config").eq("microsite_id", site.id).eq("component_type", "contact").maybeSingle();
  const { error: contactError } = await supabase.from("microsite_components").update({ config: { ...(contactComponent?.config ?? {}), contacts: parsed.data.contacts }, updated_at: new Date().toISOString() }).eq("microsite_id", site.id).eq("component_type", "contact");
  if (contactError) return NextResponse.json({ error: "Gagal menyimpan kontak." }, { status: 500 });
  if (parsed.data.settings) {
    const { data: currentSettings } = await supabase.from("microsite_settings").select("settings").eq("microsite_id", site.id).maybeSingle();
    const { error: settingsError } = await supabase.from("microsite_settings").upsert({ microsite_id: site.id, settings: { ...(currentSettings?.settings ?? {}), ...parsed.data.settings }, updated_at: new Date().toISOString() }, { onConflict: "microsite_id" });
    if (settingsError) return NextResponse.json({ error: "Gagal menyimpan tipografi nama sekolah." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
