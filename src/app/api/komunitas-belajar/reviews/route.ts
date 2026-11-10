import { NextResponse } from "next/server";
import { z } from "zod";
import { createKbAdminClient, getCurrentKbProfile } from "@/lib/kb/auth";
import { notifyTeacherAboutReview } from "@/lib/kb/notifications";

const reviewSchema = z.object({ submission_id: z.string().uuid(), status: z.enum(["menunggu_pemeriksaan", "lengkap", "perlu_perbaikan"]), notes: z.string().trim().max(2000).default("") });

export async function GET() {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  if (!["kepala_sekolah", "pengawas_dabin", "super_admin"].includes(profile.role)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const admin = createKbAdminClient();
  let reviewQuery = admin.from("kb_reviews").select("id, submission_id, reviewer_profile_id, reviewer_role, status, notes, reviewed_at, updated_at").order("reviewed_at", { ascending: false });
  if (profile.role !== "super_admin") reviewQuery = reviewQuery.eq("reviewer_role", profile.role);
  const { data: reviews, error } = await reviewQuery;
  if (error) return NextResponse.json({ error: "Riwayat pemeriksaan belum dapat dimuat." }, { status: 503 });
  return NextResponse.json({ reviews: reviews ?? [] });
}

export async function POST(request: Request) {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  if (profile.role !== "kepala_sekolah") return NextResponse.json({ error: "Hanya Kepala Sekolah yang dapat memverifikasi tugas." }, { status: 403 });
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Status atau catatan pemeriksaan tidak valid." }, { status: 400 });
  const admin = createKbAdminClient();
  const { data: submission } = await admin.from("kb_submissions").select("id, teacher_profile_id, requirement_id").eq("id", parsed.data.submission_id).maybeSingle();
  if (!submission) return NextResponse.json({ error: "Pengumpulan tidak ditemukan." }, { status: 404 });
  const { data: requirement } = await admin.from("kb_document_requirements").select("name").eq("id", submission.requirement_id).maybeSingle();
  const { data: teacher } = await admin.from("kb_profiles").select("full_name").eq("id", submission.teacher_profile_id).maybeSingle();
  const { data, error } = await admin.from("kb_reviews").upsert({ submission_id: parsed.data.submission_id, reviewer_profile_id: profile.id, reviewer_role: profile.role, status: parsed.data.status, notes: parsed.data.notes, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "submission_id,reviewer_role" }).select("id, submission_id, reviewer_role, status, notes, reviewed_at, updated_at").single();
  if (error) return NextResponse.json({ error: "Hasil pemeriksaan gagal disimpan." }, { status: 500 });
  const { error: submissionUpdateError } = await admin.from("kb_submissions").update({ status: parsed.data.status, updated_at: new Date().toISOString() }).eq("id", parsed.data.submission_id);
  if (submissionUpdateError) return NextResponse.json({ error: "Hasil pemeriksaan tersimpan, tetapi status Tugas Masuk gagal diperbarui." }, { status: 500 });
  await notifyTeacherAboutReview(admin, { submissionId: parsed.data.submission_id, teacherProfileId: submission.teacher_profile_id, taskName: requirement?.name ?? "Tugas komunitas", reviewerName: profile.full_name, status: parsed.data.status });
  return NextResponse.json({ review: data });
}
