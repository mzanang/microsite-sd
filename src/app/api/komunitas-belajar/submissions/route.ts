import { NextResponse } from "next/server";
import { getCurrentKbProfile, createKbAdminClient } from "@/lib/kb/auth";
import { notifyReviewersAboutSubmission } from "@/lib/kb/notifications";
import { getLinkedSessionMap } from "@/lib/kb/linked-session-data";

const maxFileSize = 100 * 1024 * 1024;
const mimeExtensions: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export async function GET() {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  const admin = createKbAdminClient();
  const canSeeAllSubmissions = profile.role !== "guru";

  const [
    { data: requirements, error: requirementError },
    { data: submissions, error: submissionError },
    { data: participants },
  ] = await Promise.all([
    admin
      .from("kb_document_requirements")
      .select("id, name, description, collection_method, is_required, due_at, category_id, period_id, attendance_session_id, created_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    canSeeAllSubmissions
      ? admin
          .from("kb_submissions")
          .select("id, requirement_id, teacher_profile_id, status, current_version_no, submitted_at, updated_at, created_at")
          .order("updated_at", { ascending: false })
      : admin
          .from("kb_submissions")
          .select("id, requirement_id, teacher_profile_id, status, current_version_no, submitted_at, updated_at, created_at")
          .eq("teacher_profile_id", profile.id)
          .order("updated_at", { ascending: false }),
    canSeeAllSubmissions
      ? admin
          .from("kb_profiles")
          .select("id, full_name, login_identifier, role, teacher_type, teaching_grade, teaching_subject, community_position")
          .eq("role", "guru")
          .eq("is_active", true)
          .order("full_name", { ascending: true })
      : admin
          .from("kb_profiles")
          .select("id, full_name, login_identifier, role, teacher_type, teaching_grade, teaching_subject, community_position")
          .eq("id", profile.id)
          .eq("role", "guru")
          .eq("is_active", true),
  ]);

  if (requirementError || submissionError) {
    return NextResponse.json({ error: "Data administrasi belum dapat dimuat." }, { status: 503 });
  }

  const submissionRows = submissions ?? [];
  const ids = submissionRows.map((submission) => submission.id);
  const teacherIds = [
    ...new Set(submissionRows.map((submission) => submission.teacher_profile_id).filter(Boolean)),
  ] as string[];
  const linkedSessionIds = [
    ...new Set((requirements ?? []).map((requirement) => requirement.attendance_session_id).filter(Boolean)),
  ] as string[];

  // Fetch secondary relations concurrently in parallel
  const [
    { data: versions },
    { data: reviews },
    { data: teachers },
    linkedSessionMap,
  ] = await Promise.all([
    ids.length
      ? admin
          .from("kb_submission_versions")
          .select("id, submission_id, version_no, collection_method, original_name, mime_type, file_size, external_url, created_at")
          .in("submission_id", ids)
          .order("version_no", { ascending: false })
      : Promise.resolve({ data: [] }),
    ids.length
      ? admin
          .from("kb_reviews")
          .select("id, submission_id, reviewer_profile_id, reviewer_role, status, notes, reviewed_at, updated_at")
          .in("submission_id", ids)
          .order("reviewed_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    teacherIds.length
      ? admin
          .from("kb_profiles")
          .select("id, full_name, login_identifier, role, teacher_type, teaching_grade, teaching_subject, community_position")
          .in("id", teacherIds)
      : Promise.resolve({ data: [] }),
    getLinkedSessionMap(admin, linkedSessionIds),
  ]);

  // Fetch reviewer names
  const reviewerIds = [...new Set((reviews ?? []).map((r) => r.reviewer_profile_id).filter(Boolean))];
  const { data: reviewerProfiles } = reviewerIds.length
    ? await admin.from("kb_profiles").select("id, full_name, role").in("id", reviewerIds)
    : { data: [] };
  const reviewerMap = new Map((reviewerProfiles ?? []).map((p) => [p.id, p]));

  // Map latest versions (first entry per submission_id since sorted version_no DESC)
  const latestVersions = new Map<string, any>();
  for (const version of versions ?? []) {
    if (!latestVersions.has(version.submission_id)) {
      latestVersions.set(version.submission_id, version);
    }
  }

  const teacherMap = new Map((teachers ?? []).map((t) => [t.id, t]));

  // Map latest KS review (first entry per submission_id since sorted reviewed_at DESC)
  const reviewBySubmission = new Map<string, any>();
  for (const review of reviews ?? []) {
    if (review.reviewer_role === "kepala_sekolah" && !reviewBySubmission.has(review.submission_id)) {
      reviewBySubmission.set(review.submission_id, {
        ...review,
        reviewer_name: reviewerMap.get(review.reviewer_profile_id)?.full_name ?? "Kepala Sekolah",
      });
    }
  }

  const requirementRows = (requirements ?? []).map((requirement) => {
    const session = requirement.attendance_session_id ? linkedSessionMap.get(requirement.attendance_session_id) : null;
    return {
      ...requirement,
      meeting_number: session?.meeting_number ?? null,
      material_title: session?.material_title ?? null,
      event_date: session?.event_date ?? null,
    };
  });

  const enrichedSubmissions = submissionRows.map((submission) => {
    const latestReview = reviewBySubmission.get(submission.id) ?? null;
    const teacherId = submission.teacher_profile_id ? String(submission.teacher_profile_id) : "";

    // Determine accurate effective status
    let effectiveStatus = submission.status;
    if (latestReview) {
      const isRevisionSubmittedAfterReview = Boolean(
        submission.submitted_at &&
          latestReview.reviewed_at &&
          new Date(submission.submitted_at).getTime() > new Date(latestReview.reviewed_at).getTime()
      );

      if (isRevisionSubmittedAfterReview) {
        effectiveStatus = "menunggu_verifikasi_ulang";
      } else {
        effectiveStatus = latestReview.status; // 'lengkap' | 'perlu_perbaikan' | 'menunggu_pemeriksaan'
      }
    } else {
      if (submission.current_version_no > 1) {
        effectiveStatus = "menunggu_verifikasi_ulang";
      } else if (!effectiveStatus || effectiveStatus === "belum_diunggah") {
        effectiveStatus = "menunggu_pemeriksaan";
      }
    }

    const allSubmissionReviews = (reviews ?? [])
      .filter((r) => r.submission_id === submission.id)
      .map((r) => ({
        ...r,
        reviewer_name: reviewerMap.get(r.reviewer_profile_id)?.full_name ?? (r.reviewer_role === "kepala_sekolah" ? "Kepala Sekolah" : "Pengawas Dabin"),
      }));

    return {
      ...submission,
      status: effectiveStatus,
      raw_status: submission.status,
      latest_version: latestVersions.get(submission.id) ?? null,
      reviews: allSubmissionReviews,
      latest_review: latestReview,
      teacher: teacherMap.get(teacherId) ?? null,
    };
  });

  return NextResponse.json({
    requirements: requirementRows,
    participants: participants ?? [],
    submissions: enrichedSubmissions,
  });
}

export async function POST(request: Request) {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  if (profile.role !== "guru") {
    return NextResponse.json({ error: "Hanya guru yang dapat mengumpulkan tugas miliknya sendiri." }, { status: 403 });
  }

  const form = await request.formData();
  const requirementId = String(form.get("requirement_id") ?? "");
  const method = String(form.get("collection_method") ?? "");

  if (!requirementId || !["file", "link"].includes(method)) {
    return NextResponse.json({ error: "Persyaratan dan metode pengumpulan wajib dipilih." }, { status: 400 });
  }

  const admin = createKbAdminClient();
  const { data: requirement, error: requirementError } = await admin
    .from("kb_document_requirements")
    .select("id, name, collection_method, max_file_size_bytes, allowed_mime_types, allowed_link_domains, is_active")
    .eq("id", requirementId)
    .eq("is_active", true)
    .maybeSingle();

  if (requirementError || !requirement) {
    return NextResponse.json({ error: "Persyaratan tugas tidak ditemukan atau sudah tidak aktif." }, { status: 404 });
  }

  if (requirement.collection_method !== "both" && requirement.collection_method !== method) {
    return NextResponse.json({ error: "Metode pengumpulan ini tidak diizinkan untuk tugas ini." }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("kb_submissions")
    .select("id, current_version_no, status")
    .eq("requirement_id", requirementId)
    .eq("teacher_profile_id", profile.id)
    .maybeSingle();

  if (existing?.status === "lengkap") {
    return NextResponse.json({ error: "Tugas sudah dinyatakan lengkap oleh Kepala Sekolah dan terkunci dari perubahan." }, { status: 409 });
  }

  let storagePath: string | null = null;
  let versionData: Record<string, unknown>;

  if (method === "file") {
    const file = form.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "Pilih file dokumen terlebih dahulu." }, { status: 400 });
    }
    if (file.size > Math.min(Number(requirement.max_file_size_bytes ?? maxFileSize), maxFileSize)) {
      return NextResponse.json({ error: "Ukuran file melebihi batas yang diizinkan." }, { status: 400 });
    }

    const allowedMimes = Array.isArray(requirement.allowed_mime_types) && requirement.allowed_mime_types.length
      ? requirement.allowed_mime_types
      : Object.keys(mimeExtensions);

    if (!allowedMimes.includes(file.type) || !mimeExtensions[file.type]) {
      return NextResponse.json({ error: "Format file tidak diizinkan. Gunakan PDF, DOCX, XLSX, JPG, atau PNG." }, { status: 400 });
    }

    storagePath = `submissions/${profile.id}/${requirementId}/${crypto.randomUUID()}.${mimeExtensions[file.type]}`;
    const upload = await admin.storage
      .from("kb-administrasi")
      .upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });

    if (upload.error) {
      return NextResponse.json({ error: "File dokumen gagal diunggah ke storage." }, { status: 500 });
    }

    versionData = {
      collection_method: "file",
      storage_path: storagePath,
      original_name: file.name.slice(0, 180),
      mime_type: file.type,
      file_size: file.size,
      external_url: null,
    };
  } else {
    let externalUrl = String(form.get("external_url") ?? "").trim();
    if (!externalUrl) {
      return NextResponse.json({ error: "Link dokumen wajib diisi." }, { status: 400 });
    }

    if (!externalUrl.startsWith("http://") && !externalUrl.startsWith("https://")) {
      externalUrl = `https://${externalUrl}`;
    }

    try {
      const parsedUrl = new URL(externalUrl);
      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        throw new Error();
      }
      if (!parsedUrl.hostname || !parsedUrl.hostname.includes(".")) {
        throw new Error();
      }
    } catch {
      return NextResponse.json({ error: "Link dokumen tidak valid. Pastikan format URL benar (contoh: https://...)." }, { status: 400 });
    }

    versionData = {
      collection_method: "link",
      storage_path: null,
      original_name: null,
      mime_type: null,
      file_size: null,
      external_url: externalUrl,
    };
  }

  const now = new Date().toISOString();
  const isRevision = Boolean(existing);
  const versionNo = Number(existing?.current_version_no ?? 0) + 1;
  const newStatus = isRevision ? "menunggu_verifikasi_ulang" : "menunggu_pemeriksaan";

  const { data: submission, error: submissionError } = existing
    ? await admin
        .from("kb_submissions")
        .update({
          status: newStatus,
          current_version_no: versionNo,
          submitted_at: now,
          updated_at: now,
        })
        .eq("id", existing.id)
        .select("id, requirement_id, status, current_version_no, submitted_at, updated_at")
        .single()
    : await admin
        .from("kb_submissions")
        .insert({
          requirement_id: requirementId,
          teacher_profile_id: profile.id,
          status: newStatus,
          current_version_no: versionNo,
          submitted_at: now,
          updated_at: now,
        })
        .select("id, requirement_id, status, current_version_no, submitted_at, updated_at")
        .single();

  if (submissionError || !submission) {
    if (storagePath) await admin.storage.from("kb-administrasi").remove([storagePath]);
    return NextResponse.json({ error: "Pengumpulan tugas gagal disimpan ke database." }, { status: 500 });
  }

  const { error: versionError } = await admin
    .from("kb_submission_versions")
    .insert({
      submission_id: submission.id,
      version_no: versionNo,
      submitted_by: profile.id,
      ...versionData,
    });

  if (versionError) {
    if (storagePath) await admin.storage.from("kb-administrasi").remove([storagePath]);
    return NextResponse.json({ error: "Versi dokumen pengumpulan gagal disimpan." }, { status: 500 });
  }

  // NOTE: We DO NOT delete previous kb_reviews rows! This preserves revision history.
  // Instead, the new submission timestamp and versionNo indicate that a revision is waiting for KS re-check.

  await notifyReviewersAboutSubmission(admin, {
    id: submission.id,
    taskName: requirement.name,
    teacherName: profile.full_name,
    versionNo,
  });

  return NextResponse.json({ ok: true, submission }, { status: 201 });
}

export async function DELETE(request: Request) {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  if (profile.role !== "guru") {
    return NextResponse.json({ error: "Hanya guru yang dapat membatalkan pengumpulan miliknya." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { submission_id?: unknown } | null;
  if (!body || typeof body.submission_id !== "string") {
    return NextResponse.json({ error: "Pengumpulan tugas tidak valid." }, { status: 400 });
  }

  const admin = createKbAdminClient();
  const { data: submission } = await admin
    .from("kb_submissions")
    .select("id, teacher_profile_id, status")
    .eq("id", body.submission_id)
    .maybeSingle();

  if (!submission || submission.teacher_profile_id !== profile.id) {
    return NextResponse.json({ error: "Pengumpulan tidak ditemukan." }, { status: 404 });
  }

  if (submission.status === "lengkap") {
    return NextResponse.json({ error: "Tugas sudah diverifikasi Lengkap oleh Kepala Sekolah dan tidak dapat dibatalkan." }, { status: 409 });
  }

  const { data: versions } = await admin
    .from("kb_submission_versions")
    .select("storage_path")
    .eq("submission_id", submission.id);

  const paths = (versions ?? []).map((version) => version.storage_path).filter((path): path is string => Boolean(path));

  const { error } = await admin
    .from("kb_submissions")
    .delete()
    .eq("id", submission.id)
    .eq("teacher_profile_id", profile.id);

  if (error) return NextResponse.json({ error: "Pengumpulan gagal dibatalkan." }, { status: 503 });

  if (paths.length) await admin.storage.from("kb-administrasi").remove(paths);
  return NextResponse.json({ ok: true });
}
