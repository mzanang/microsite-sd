import { NextResponse } from "next/server";
import { z } from "zod";
import { createKbAdminClient, getCurrentKbProfile } from "@/lib/kb/auth";
import { notifyMembersAboutTask } from "@/lib/kb/notifications";

const taskSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).default(""),
  collection_method: z.enum(["file", "link", "both"]),
  due_at: z.string().trim().optional().or(z.literal("")),
  attendance_session_id: z.union([z.string().uuid(), z.literal(""), z.null()]).optional(),
});

export async function GET() {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  const admin = createKbAdminClient();
  const canManage = profile.role === "super_admin" || (profile.role === "guru" && profile.community_position === "ketua");
  let query = admin.from("kb_document_requirements").select("id, name, description, collection_method, is_required, due_at, is_active, attendance_session_id").order("sort_order", { ascending: true });
  if (!canManage) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Daftar tugas belum dapat dimuat." }, { status: 503 });
  return NextResponse.json({ requirements: data ?? [] });
}

export async function POST(request: Request) {
  const profile = await getCurrentKbProfile();
  if (!profile || profile.role !== "guru" || profile.community_position !== "ketua") return NextResponse.json({ error: "Hanya Ketua Kombel yang dapat membuat tugas." }, { status: 403 });
  const parsed = taskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nama, keterangan, dan metode pengumpulan wajib diperiksa." }, { status: 400 });

  const admin = createKbAdminClient();
  const { data: category, error: categoryError } = await admin.from("kb_document_categories").select("id").eq("name", "Tugas Kombel").eq("is_active", true).order("sort_order", { ascending: true }).limit(1).maybeSingle();
  if (categoryError) return NextResponse.json({ error: "Kategori tugas belum tersedia. Terapkan migrasi operasional komunitas terlebih dahulu." }, { status: 503 });
  let categoryId = category?.id;
  if (!categoryId) {
    const created = await admin.from("kb_document_categories").insert({ name: "Tugas Kombel", slug: `tugas-kombel-${crypto.randomUUID()}`, description: "Persyaratan tugas Komunitas Belajar Guru", created_by: profile.id }).select("id").single();
    if (created.error || !created.data) return NextResponse.json({ error: "Kategori tugas gagal disiapkan." }, { status: 503 });
    categoryId = created.data.id;
  }

  const { data: period, error: periodError } = await admin.from("kb_academic_periods").select("id").eq("is_active", true).order("starts_on", { ascending: false }).limit(1).maybeSingle();
  if (periodError) return NextResponse.json({ error: "Periode akademik belum tersedia." }, { status: 503 });
  let periodId = period?.id;
  if (!periodId) {
    const year = new Date().getFullYear();
    const created = await admin.from("kb_academic_periods").insert({ name: `Periode ${year}`, starts_on: `${year}-01-01`, ends_on: `${year}-12-31`, created_by: profile.id }).select("id").single();
    if (created.error || !created.data) return NextResponse.json({ error: "Periode akademik gagal disiapkan." }, { status: 503 });
    periodId = created.data.id;
  }

  const { data, error } = await admin.from("kb_document_requirements").insert({ category_id: categoryId, period_id: periodId, name: parsed.data.name, description: parsed.data.description, collection_method: parsed.data.collection_method, due_at: parsed.data.due_at ? new Date(parsed.data.due_at).toISOString() : null, attendance_session_id: parsed.data.attendance_session_id || null, is_required: true, created_by: profile.id }).select("id, name, description, collection_method, is_required, due_at, is_active, attendance_session_id").single();
  if (error || !data) return NextResponse.json({ error: "Tugas gagal disimpan. Pastikan nama tugas belum digunakan pada periode ini." }, { status: 503 });
  await notifyMembersAboutTask(admin, data);
  return NextResponse.json({ requirement: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const profile = await getCurrentKbProfile();
  if (!profile || profile.role !== "guru" || profile.community_position !== "ketua") return NextResponse.json({ error: "Hanya Ketua Kombel yang dapat mengubah tugas." }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.id !== "string") return NextResponse.json({ error: "Tugas tidak valid." }, { status: 400 });
  const parsed = taskSchema.partial().extend({ is_active: z.boolean().optional() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Perubahan tugas belum valid." }, { status: 400 });
  const admin = createKbAdminClient();
  const updates = { ...parsed.data, ...(parsed.data.due_at !== undefined ? { due_at: parsed.data.due_at ? new Date(parsed.data.due_at).toISOString() : null } : {}), updated_at: new Date().toISOString() };
  const { data, error } = await admin.from("kb_document_requirements").update(updates).eq("id", body.id).select("id, name, description, collection_method, is_required, due_at, is_active, attendance_session_id").single();
  if (error || !data) return NextResponse.json({ error: "Tugas tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ requirement: data });
}

export async function DELETE(request: Request) {
  const profile = await getCurrentKbProfile();
  if (!profile || profile.role !== "guru" || profile.community_position !== "ketua") return NextResponse.json({ error: "Hanya Ketua Kombel yang dapat menghapus tugas." }, { status: 403 });
  const body = await request.json().catch(() => null) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Tugas tidak valid." }, { status: 400 });
  const admin = createKbAdminClient();
  const { count: submissionCount, error: countError } = await admin.from("kb_submissions").select("id", { count: "exact", head: true }).eq("requirement_id", body.id);
  if (countError) return NextResponse.json({ error: "Riwayat tugas gagal diperiksa." }, { status: 503 });
  if ((submissionCount ?? 0) > 0) return NextResponse.json({ error: "Tugas tidak dapat dihapus karena sudah memiliki pengumpulan. Gunakan status Nonaktif." }, { status: 409 });
  const { error } = await admin.from("kb_document_requirements").delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: "Tugas gagal dihapus." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
