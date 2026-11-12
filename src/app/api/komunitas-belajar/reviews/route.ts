import { NextResponse } from "next/server";
import { z } from "zod";
import { createKbAdminClient, getCurrentKbProfile } from "@/lib/kb/auth";
import { notifyTeacherAboutReview } from "@/lib/kb/notifications";

const reviewSchema = z.object({
  submission_id: z.string().uuid(),
  status: z.enum(["menunggu_pemeriksaan", "lengkap", "perlu_perbaikan"]),
  notes: z.string().trim().max(2000).default(""),
});

export async function GET() {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });

  // Allow kepala_sekolah, pengawas_dabin, super_admin, AND ketua (guru with community_position === 'ketua')
  const isAllowed =
    ["kepala_sekolah", "pengawas_dabin", "super_admin"].includes(profile.role) ||
    (profile.role === "guru" && profile.community_position === "ketua");

  if (!isAllowed) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

  const admin = createKbAdminClient();
  let reviewQuery = admin
    .from("kb_reviews")
    .select("id, submission_id, reviewer_profile_id, reviewer_role, status, notes, reviewed_at, updated_at")
    .order("reviewed_at", { ascending: false });

  // If pengawas, only see pengawas reviews or all? In KB system, KS is the main verifier. Let all authorized roles read reviews.
  const { data: reviews, error } = await reviewQuery;
  if (error) return NextResponse.json({ error: "Riwayat pemeriksaan belum dapat dimuat." }, { status: 503 });

  // Fetch reviewer names
  const reviewerIds = [...new Set((reviews ?? []).map((r) => r.reviewer_profile_id).filter(Boolean))];
  const { data: reviewerProfiles } = reviewerIds.length
    ? await admin.from("kb_profiles").select("id, full_name, role").in("id", reviewerIds)
    : { data: [] };
  const reviewerMap = new Map((reviewerProfiles ?? []).map((p) => [p.id, p]));

  const enrichedReviews = (reviews ?? []).map((review) => ({
    ...review,
    reviewer_name: reviewerMap.get(review.reviewer_profile_id)?.full_name ?? (review.reviewer_role === "kepala_sekolah" ? "Kepala Sekolah" : "Pengawas Dabin"),
  }));

  return NextResponse.json({ reviews: enrichedReviews });
}

export async function POST(request: Request) {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  if (profile.role !== "kepala_sekolah") {
    return NextResponse.json({ error: "Hanya Kepala Sekolah yang memiliki hak untuk memverifikasi tugas." }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Status atau catatan pemeriksaan tidak valid." }, { status: 400 });
  }

  // If status is 'perlu_perbaikan', notes are strictly required
  if (parsed.data.status === "perlu_perbaikan" && !parsed.data.notes.trim()) {
    return NextResponse.json({ error: "Catatan perbaikan wajib diisi ketika memilih status Perlu Perbaikan." }, { status: 400 });
  }

  // If status is 'menunggu_pemeriksaan' (Batal Verifikasi), cancellation reason is strictly required
  if (parsed.data.status === "menunggu_pemeriksaan" && !parsed.data.notes.trim()) {
    return NextResponse.json({ error: "Alasan pembatalan verifikasi wajib diisi." }, { status: 400 });
  }

  const admin = createKbAdminClient();
  const { data: submission } = await admin
    .from("kb_submissions")
    .select("id, teacher_profile_id, requirement_id")
    .eq("id", parsed.data.submission_id)
    .maybeSingle();

  if (!submission) return NextResponse.json({ error: "Pengumpulan tugas tidak ditemukan." }, { status: 404 });

  const [{ data: requirement }, { data: teacher }] = await Promise.all([
    admin.from("kb_document_requirements").select("name").eq("id", submission.requirement_id).maybeSingle(),
    admin.from("kb_profiles").select("full_name").eq("id", submission.teacher_profile_id).maybeSingle(),
  ]);

  const now = new Date().toISOString();

  // Robust update-or-insert pattern for kb_reviews (avoids missing constraint error on upsert)
  const { data: existingReview } = await admin
    .from("kb_reviews")
    .select("id")
    .eq("submission_id", parsed.data.submission_id)
    .eq("reviewer_role", profile.role)
    .maybeSingle();

  const reviewPayload = {
    submission_id: parsed.data.submission_id,
    reviewer_profile_id: profile.id,
    reviewer_role: profile.role,
    status: parsed.data.status,
    notes: parsed.data.notes.trim(),
    reviewed_at: now,
    updated_at: now,
  };

  let savedReview: any;
  if (existingReview?.id) {
    const { data: updated, error: updateErr } = await admin
      .from("kb_reviews")
      .update(reviewPayload)
      .eq("id", existingReview.id)
      .select("id, submission_id, reviewer_role, status, notes, reviewed_at, updated_at")
      .single();
    if (updateErr) return NextResponse.json({ error: "Gagal memperbarui hasil pemeriksaan." }, { status: 500 });
    savedReview = updated;
  } else {
    const { data: inserted, error: insertErr } = await admin
      .from("kb_reviews")
      .insert(reviewPayload)
      .select("id, submission_id, reviewer_role, status, notes, reviewed_at, updated_at")
      .single();
    if (insertErr) return NextResponse.json({ error: "Gagal menyimpan hasil pemeriksaan." }, { status: 500 });
    savedReview = inserted;
  }

  // Update master status in kb_submissions
  const { error: submissionUpdateError } = await admin
    .from("kb_submissions")
    .update({ status: parsed.data.status, updated_at: now })
    .eq("id", parsed.data.submission_id);

  if (submissionUpdateError) {
    return NextResponse.json({ error: "Hasil pemeriksaan tersimpan, namun status tugas gagal diperbarui." }, { status: 500 });
  }

  if (parsed.data.status !== "menunggu_pemeriksaan") {
    await admin
      .from("kb_notifications")
      .update({ read_at: now })
      .eq("recipient_profile_id", profile.id)
      .eq("notification_type", "submission_received")
      .like("dedupe_key", `submission:${parsed.data.submission_id}:%`);
  }

  // Notify teacher
  await notifyTeacherAboutReview(admin, {
    submissionId: parsed.data.submission_id,
    teacherProfileId: submission.teacher_profile_id,
    taskName: requirement?.name ?? "Tugas komunitas",
    reviewerName: profile.full_name,
    status: parsed.data.status,
  });

  return NextResponse.json({
    ok: true,
    review: {
      ...savedReview,
      reviewer_name: profile.full_name,
    },
  });
}
