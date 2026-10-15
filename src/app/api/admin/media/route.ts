import { NextResponse } from "next/server";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

const allowedImages = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);
const allowedVideos = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const STORAGE_BUCKET = "microsite-media";
const uploadErrorMessage = "File harus JPG, PNG, WebP, atau SVG maksimal 5 MB; atau video MP4, WebM, OGG, atau MOV maksimal 100 MB.";

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
  try {
    if (request.headers.get("content-type")?.includes("application/json")) return await postSignedMedia(request);
    return await postMedia(request);
  } catch (error) {
    console.error("Admin media upload failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload media gagal diproses." }, { status: 500 });
  }
}

async function postMedia(request: Request) {
  if (!supabaseConfigured()) return NextResponse.json({ error: "Supabase belum dikonfigurasi di environment." }, { status: 503 });
  const supabase = await createClient(); const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Sesi admin tidak ditemukan." }, { status: 401 });
  const { data: profile } = await supabase.from("admin_profiles").select("id").eq("user_id", userData.user.id).eq("is_active", true).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
  const isImage = allowedImages.has(file.type);
  const isVideo = allowedVideos.has(file.type);
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if ((!isImage && !isVideo) || file.size > maxSize) return NextResponse.json({ error: uploadErrorMessage }, { status: 400 });
  const { data: site } = await supabase.from("microsites").select("id").eq("slug", "sd-negeri-dukuhwaru-01").single();
  if (!site) return NextResponse.json({ error: "Microsite tidak ditemukan." }, { status: 404 });
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-"); const path = `${site.id}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: "Upload Storage gagal." }, { status: 500 });
  const { data: publicUrl } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const { error: metadataError } = await supabase.from("media_assets").insert({ microsite_id: site.id, storage_path: path, original_name: file.name, mime_type: file.type, file_size: file.size, alt_text: file.name.replace(/\.[^.]+$/, ""), uploaded_by: userData.user.id });
  if (metadataError) {
    await supabase.storage.from("microsite-media").remove([path]);
    return NextResponse.json({ error: "Metadata aset gagal disimpan." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, url: publicUrl.publicUrl, path });
}

async function postSignedMedia(request: Request) {
  let payload: Record<string, unknown>;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid body");
    payload = body as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Data upload tidak valid." }, { status: 400 });
  }

  const action = typeof payload.action === "string" ? payload.action : "";
  if (action !== "prepare" && action !== "complete") return NextResponse.json({ error: "Aksi upload tidak valid." }, { status: 400 });

  const context = await getAdminMediaContext();
  if ("response" in context) return context.response;
  const { supabase, userId, siteId } = context;

  if (action === "prepare") {
    const originalName = typeof payload.originalName === "string" ? payload.originalName : "";
    const mimeType = typeof payload.mimeType === "string" ? payload.mimeType : "";
    const fileSize = typeof payload.fileSize === "number" ? payload.fileSize : Number(payload.fileSize);
    const validationError = validateMediaMetadata(mimeType, fileSize);
    if (!originalName || validationError) return NextResponse.json({ error: validationError ?? "Nama file tidak valid." }, { status: 400 });

    const safeName = originalName.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `${siteId}/${crypto.randomUUID()}-${safeName}`;
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUploadUrl(path);
    if (error || !data?.token) return NextResponse.json({ error: "Link upload Storage gagal dibuat." }, { status: 500 });
    return NextResponse.json({ ok: true, path, token: data.token });
  }

  const path = typeof payload.path === "string" ? payload.path : "";
  const originalName = typeof payload.originalName === "string" ? payload.originalName : "";
  const mimeType = typeof payload.mimeType === "string" ? payload.mimeType : "";
  const fileSize = typeof payload.fileSize === "number" ? payload.fileSize : Number(payload.fileSize);
  const validationError = validateMediaMetadata(mimeType, fileSize);
  if (!path.startsWith(`${siteId}/`) || !originalName || validationError) return NextResponse.json({ error: validationError ?? "Data upload tidak valid." }, { status: 400 });

  const { data: publicUrl } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const { error: metadataError } = await supabase.from("media_assets").insert({ microsite_id: siteId, storage_path: path, original_name: originalName, mime_type: mimeType, file_size: fileSize, alt_text: originalName.replace(/\.[^.]+$/, ""), uploaded_by: userId });
  if (metadataError) {
    await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    return NextResponse.json({ error: "Metadata aset gagal disimpan." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, url: publicUrl.publicUrl, path });
}

async function getAdminMediaContext() {
  if (!supabaseConfigured()) return { response: NextResponse.json({ error: "Supabase belum dikonfigurasi di environment." }, { status: 503 }) };
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { response: NextResponse.json({ error: "Sesi admin tidak ditemukan." }, { status: 401 }) };
  const { data: profile } = await supabase.from("admin_profiles").select("id").eq("user_id", userData.user.id).eq("is_active", true).maybeSingle();
  if (!profile) return { response: NextResponse.json({ error: "Akses ditolak." }, { status: 403 }) };
  const { data: site } = await supabase.from("microsites").select("id").eq("slug", "sd-negeri-dukuhwaru-01").single();
  if (!site) return { response: NextResponse.json({ error: "Microsite tidak ditemukan." }, { status: 404 }) };
  return { supabase, userId: userData.user.id, siteId: site.id };
}

function validateMediaMetadata(mimeType: string, fileSize: number) {
  const isImage = allowedImages.has(mimeType);
  const isVideo = allowedVideos.has(mimeType);
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  return (!isImage && !isVideo) || !Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxSize ? uploadErrorMessage : null;
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
