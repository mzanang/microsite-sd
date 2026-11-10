import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageKbCommunityDocuments, createKbAdminClient } from "@/lib/kb/auth";

const bucket = "kb-public-documents";
const maxFileSize = 20 * 1024 * 1024;
const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  is_published: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
});

function errorMessage(error: { code?: string; message?: string }) {
  if (["42P01", "PGRST205"].includes(String(error.code ?? "")) || String(error.message ?? "").includes("kb_public_documents")) {
    return "Modul SK belum siap. Terapkan migrasi 202611090004_community_public_resources.sql terlebih dahulu.";
  }
  return "Operasi dokumen SK gagal diproses.";
}

function publicUrl(admin: ReturnType<typeof createKbAdminClient>, storagePath: string) {
  return admin.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
}

export async function GET() {
  if (!(await canManageKbCommunityDocuments())) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const admin = createKbAdminClient();
  const { data, error } = await admin.from("kb_public_documents").select("id, title, description, storage_path, original_name, mime_type, file_size, sort_order, is_published, created_at, updated_at").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: errorMessage(error) }, { status: 503 });
  return NextResponse.json({ documents: (data ?? []).map((item) => ({ ...item, public_url: publicUrl(admin, item.storage_path) })) });
}

export async function POST(request: Request) {
  if (!(await canManageKbCommunityDocuments())) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const file = form.get("file");
  if (title.length < 2 || title.length > 120) return NextResponse.json({ error: "Judul dokumen harus berisi 2–120 karakter." }, { status: 400 });
  if (!(file instanceof File) || file.size <= 0) return NextResponse.json({ error: "Pilih file PDF terlebih dahulu." }, { status: 400 });
  if (file.size > maxFileSize) return NextResponse.json({ error: "Ukuran file maksimal 20 MB." }, { status: 400 });
  if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) return NextResponse.json({ error: "SK Kombel hanya menerima file PDF." }, { status: 400 });

  const admin = createKbAdminClient();
  const storagePath = `sk/${crypto.randomUUID()}.pdf`;
  const upload = await admin.storage.from(bucket).upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: "application/pdf", upsert: false });
  if (upload.error) return NextResponse.json({ error: "File PDF gagal diunggah." }, { status: 500 });
  const { data, error } = await admin.from("kb_public_documents").insert({ title, description, storage_path: storagePath, original_name: file.name.slice(0, 180), mime_type: "application/pdf", file_size: file.size }).select("id, title, description, storage_path, original_name, mime_type, file_size, sort_order, is_published, created_at, updated_at").single();
  if (error || !data) {
    await admin.storage.from(bucket).remove([storagePath]);
    return NextResponse.json({ error: error ? errorMessage(error) : "Dokumen gagal disimpan." }, { status: error ? 503 : 500 });
  }
  return NextResponse.json({ document: { ...data, public_url: publicUrl(admin, data.storage_path) } }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await canManageKbCommunityDocuments())) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data dokumen tidak valid." }, { status: 400 });
  const { id, ...changes } = parsed.data;
  const admin = createKbAdminClient();
  const { data, error } = await admin.from("kb_public_documents").update(changes).eq("id", id).select("id, title, description, storage_path, original_name, mime_type, file_size, sort_order, is_published, created_at, updated_at").single();
  if (error || !data) return NextResponse.json({ error: error ? errorMessage(error) : "Dokumen tidak ditemukan." }, { status: error ? 503 : 404 });
  return NextResponse.json({ document: { ...data, public_url: publicUrl(admin, data.storage_path) } });
}

export async function DELETE(request: Request) {
  if (!(await canManageKbCommunityDocuments())) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const body = await request.json().catch(() => null) as { id?: string } | null;
  if (!body?.id || !z.string().uuid().safeParse(body.id).success) return NextResponse.json({ error: "Dokumen tidak valid." }, { status: 400 });
  const admin = createKbAdminClient();
  const { data: document, error: lookupError } = await admin.from("kb_public_documents").select("storage_path").eq("id", body.id).maybeSingle();
  if (lookupError) return NextResponse.json({ error: errorMessage(lookupError) }, { status: 503 });
  if (!document) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
  const { error } = await admin.from("kb_public_documents").delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: errorMessage(error) }, { status: 503 });
  await admin.storage.from(bucket).remove([document.storage_path]);
  return NextResponse.json({ ok: true });
}
