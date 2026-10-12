import { NextResponse } from "next/server";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);

export async function GET() {
  if (!supabaseConfigured()) return NextResponse.json({ error: "Supabase belum dikonfigurasi di environment." }, { status: 503 });
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Sesi admin tidak ditemukan." }, { status: 401 });
  const { data: profile } = await supabase.from("admin_profiles").select("id").eq("user_id", userData.user.id).eq("is_active", true).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const { data: site } = await supabase.from("microsites").select("id").eq("slug", "sd-negeri-dukuhwaru-01").single();
  if (!site) return NextResponse.json({ error: "Microsite tidak ditemukan." }, { status: 404 });
  const { data: assets, error } = await supabase.from("media_assets").select("id, storage_path, original_name, mime_type, file_size, alt_text, created_at").eq("microsite_id", site.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Pustaka media gagal dimuat." }, { status: 500 });
  return NextResponse.json({ assets: (assets ?? []).map((asset) => ({ ...asset, url: supabase.storage.from("microsite-media").getPublicUrl(asset.storage_path).data.publicUrl })) });
}

export async function POST(request: Request) {
  if (!supabaseConfigured()) return NextResponse.json({ error: "Supabase belum dikonfigurasi di environment." }, { status: 503 });
  const supabase = await createClient(); const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Sesi admin tidak ditemukan." }, { status: 401 });
  const { data: profile } = await supabase.from("admin_profiles").select("id").eq("user_id", userData.user.id).eq("is_active", true).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File) || !allowed.has(file.type) || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File harus JPG, PNG, WebP, atau SVG dan berukuran maksimal 5 MB." }, { status: 400 });
  const { data: site } = await supabase.from("microsites").select("id").eq("slug", "sd-negeri-dukuhwaru-01").single();
  if (!site) return NextResponse.json({ error: "Microsite tidak ditemukan." }, { status: 404 });
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-"); const path = `${site.id}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("microsite-media").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: "Upload Storage gagal." }, { status: 500 });
  const { data: publicUrl } = supabase.storage.from("microsite-media").getPublicUrl(path);
  const { error: metadataError } = await supabase.from("media_assets").insert({ microsite_id: site.id, storage_path: path, original_name: file.name, mime_type: file.type, file_size: file.size, alt_text: file.name.replace(/\.[^.]+$/, ""), uploaded_by: userData.user.id });
  if (metadataError) return NextResponse.json({ error: "Metadata aset gagal disimpan." }, { status: 500 });
  return NextResponse.json({ ok: true, url: publicUrl.publicUrl, path });
}

export async function DELETE(request: Request) {
  if (!supabaseConfigured()) return NextResponse.json({ error: "Supabase belum dikonfigurasi di environment." }, { status: 503 });
  const supabase = await createClient(); const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Sesi admin tidak ditemukan." }, { status: 401 });
  const { data: profile } = await supabase.from("admin_profiles").select("id").eq("user_id", userData.user.id).eq("is_active", true).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const path = typeof body.path === "string" ? body.path : "";
  const { data: site } = await supabase.from("microsites").select("id").eq("slug", "sd-negeri-dukuhwaru-01").single();
  if (!site) return NextResponse.json({ error: "Microsite tidak ditemukan." }, { status: 404 });
  if (!path || !path.startsWith(`${site.id}/`)) return NextResponse.json({ error: "Path aset tidak valid." }, { status: 400 });
  const { error: storageError } = await supabase.storage.from("microsite-media").remove([path]);
  if (storageError) return NextResponse.json({ error: "Aset gagal dihapus dari Storage." }, { status: 500 });
  const { error: metadataError } = await supabase.from("media_assets").delete().eq("microsite_id", site.id).eq("storage_path", path);
  if (metadataError) return NextResponse.json({ error: "Metadata aset gagal dihapus." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
