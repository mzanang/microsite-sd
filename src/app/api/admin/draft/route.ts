import { NextResponse } from "next/server";
import { micrositeDraftSchema } from "@/lib/validations";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = micrositeDraftSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Data draf tidak valid", details: parsed.error.flatten() }, { status: 400 });
  if (!supabaseConfigured()) return NextResponse.json({ error: "Supabase belum dikonfigurasi di environment." }, { status: 503 });
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Sesi admin tidak ditemukan." }, { status: 401 });
  const { data: profile } = await supabase.from("admin_profiles").select("id").eq("user_id", userData.user.id).eq("is_active", true).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const { data: site } = await supabase.from("microsites").select("id").eq("slug", "sd-negeri-dukuhwaru-01").single();
  if (!site) return NextResponse.json({ error: "Microsite tidak ditemukan." }, { status: 404 });
  const now = new Date().toISOString();
  const { error: settingsError } = await supabase.from("microsite_settings").upsert({ microsite_id: site.id, settings: parsed.data.settings, updated_at: now }, { onConflict: "microsite_id" });
  if (settingsError) return NextResponse.json({ error: "Gagal menyimpan pengaturan draf." }, { status: 500 });
  const fixedTypes = ["service_links", "location", "contact"];
  const fixedRows = parsed.data.components.filter((component) => fixedTypes.includes(component.type));
  for (const component of fixedRows) {
    const fixedUpdate = { title: component.title, sort_order: component.sort_order, is_enabled: component.is_enabled, updated_at: now, config: { ...(component.config ?? {}), ...(component.type === "service_links" ? { links: parsed.data.services } : {}) } };
    const { error: fixedError } = await supabase.from("microsite_components").update(fixedUpdate).eq("id", component.id).eq("microsite_id", site.id);
    if (fixedError) return NextResponse.json({ error: "Gagal menyimpan urutan komponen." }, { status: 500 });
  }
  const contentTypes = ["link", "text", "image", "embed", "divider", "whatsapp", "email", "instagram", "phone"];
  const { error: deleteError } = await supabase.from("microsite_components").delete().eq("microsite_id", site.id).in("component_type", contentTypes);
  if (deleteError) return NextResponse.json({ error: "Gagal memperbarui konten draf." }, { status: 500 });
  const contentRows = parsed.data.components.filter((component) => contentTypes.includes(component.type)).map((component) => ({ id: component.id, microsite_id: site.id, component_type: component.type, title: component.title, config: component.config ?? {}, published_config: {}, sort_order: component.sort_order, is_enabled: component.is_enabled, is_published: false, updated_at: now }));
  if (contentRows.length) {
    const { error: contentError } = await supabase.from("microsite_components").insert(contentRows);
    if (contentError) return NextResponse.json({ error: "Gagal menyimpan konten draf." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
