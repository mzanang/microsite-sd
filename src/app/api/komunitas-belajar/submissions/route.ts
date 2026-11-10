import { NextResponse } from "next/server";
import { getCurrentKbProfile, createKbAdminClient } from "@/lib/kb/auth";
import { notifyReviewersAboutSubmission } from "@/lib/kb/notifications";

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

function allowedDomain(hostname: string, domains: string[]) {
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

export async function GET() {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  const admin = createKbAdminClient();
  const canSeeAllSubmissions = profile.role !== "guru" || profile.community_position === "ketua";
  const [{ data: requirements, error: requirementError }, { data: submissions, error: submissionError }, { data: participants }] = await Promise.all([
    admin.from("kb_document_requirements").select("id, name, description, collection_method, is_required, due_at, category_id, period_id, attendance_session_id").eq("is_active", true).order("sort_order", { ascending: true }),
    canSeeAllSubmissions ? admin.from("kb_submissions").select("id, requirement_id, teacher_profile_id, status, current_version_no, submitted_at, updated_at").order("updated_at", { ascending: false }) : admin.from("kb_submissions").select("id, requirement_id, status, current_version_no, submitted_at, updated_at").eq("teacher_profile_id", profile.id),
    admin.from("kb_profiles").select("id, full_name, login_identifier").eq("role", "guru").eq("is_active", true).order("full_name", { ascending: true }),
  ]);
  if (requirementError || submissionError) return NextResponse.json({ error: "Data administrasi belum dapat dimuat." }, { status: 503 });
  const submissionRows = submissions ?? [];
  const ids = submissionRows.map((submission) => submission.id);
  const { data: versions } = ids.length ? await admin.from("kb_submission_versions").select("id, submission_id, version_no, collection_method, original_name, mime_type, file_size, external_url, created_at").in("submission_id", ids).order("version_no", { ascending: false }) : { data: [] };
  const { data: reviews } = ids.length ? await admin.from("kb_reviews").select("id, submission_id, reviewer_role, status, notes, reviewed_at").in("submission_id", ids).order("reviewed_at", { ascending: false }) : { data: [] };
  const latestVersions = new Map<string, unknown>();
  for (const version of versions ?? []) if (!latestVersions.has(version.submission_id)) latestVersions.set(version.submission_id, version);
  const teacherIds = submissionRows.map((submission) => "teacher_profile_id" in submission ? submission.teacher_profile_id : null).filter(Boolean) as string[];
  const { data: teachers } = teacherIds.length ? await admin.from("kb_profiles").select("id, full_name, login_identifier, role, teacher_type, teaching_grade").in("id", teacherIds) : { data: [] };
  const reviewBySubmission = new Map((reviews ?? []).filter((review) => review.reviewer_role === "kepala_sekolah").map((review) => [review.submission_id, review]));
  const linkedSessionIds = [...new Set((requirements ?? []).map((requirement) => requirement.attendance_session_id).filter(Boolean))] as string[];
  const { data: linkedSessions } = linkedSessionIds.length ? await admin.from("kb_attendance_sessions").select("id, meeting_number, material_title").in("id", linkedSessionIds) : { data: [] };
  const sessionById = new Map((linkedSessions ?? []).map((session) => [session.id, session]));
  const requirementRows = (requirements ?? []).map((requirement) => ({ ...requirement, meeting_number: requirement.attendance_session_id ? sessionById.get(requirement.attendance_session_id)?.meeting_number ?? null : null, material_title: requirement.attendance_session_id ? sessionById.get(requirement.attendance_session_id)?.material_title ?? null : null }));
  return NextResponse.json({ requirements: requirementRows, participants: participants ?? [], submissions: submissionRows.map((submission) => {
    const currentReview = reviewBySubmission.get(submission.id);
    const reviewIsCurrent = Boolean(currentReview && (!submission.submitted_at || !currentReview.reviewed_at || new Date(currentReview.reviewed_at).getTime() >= new Date(submission.submitted_at).getTime()));
    return { ...submission, status: reviewIsCurrent ? currentReview?.status : submission.status, latest_version: latestVersions.get(submission.id) ?? null, reviews: (reviews ?? []).filter((review) => review.submission_id === submission.id), teacher: teachers?.find((teacher) => teacher.id === ("teacher_profile_id" in submission ? submission.teacher_profile_id : "")) ?? null };
  }) });
}

export async function POST(request: Request) {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  if (profile.role !== "guru") return NextResponse.json({ error: "Hanya guru yang dapat mengirim administrasi miliknya sendiri." }, { status: 403 });
  const form = await request.formData();
  const requirementId = String(form.get("requirement_id") ?? "");
  const method = String(form.get("collection_method") ?? "");
  if (!requirementId || !["file", "link"].includes(method)) return NextResponse.json({ error: "Persyaratan dan metode pengumpulan wajib dipilih." }, { status: 400 });
  const admin = createKbAdminClient();
  const { data: requirement, error: requirementError } = await admin.from("kb_document_requirements").select("id, name, collection_method, max_file_size_bytes, allowed_mime_types, allowed_link_domains, is_active").eq("id", requirementId).eq("is_active", true).maybeSingle();
  if (requirementError || !requirement) return NextResponse.json({ error: "Persyaratan tidak ditemukan atau sudah tidak aktif." }, { status: 404 });
  if (requirement.collection_method !== "both" && requirement.collection_method !== method) return NextResponse.json({ error: "Metode pengumpulan ini tidak diizinkan." }, { status: 400 });
  const { data: existing } = await admin.from("kb_submissions").select("id, current_version_no, status").eq("requirement_id", requirementId).eq("teacher_profile_id", profile.id).maybeSingle();
  if (existing?.status === "lengkap") return NextResponse.json({ error: "Tugas sudah diverifikasi KS dan tidak dapat diubah." }, { status: 409 });

  let storagePath: string | null = null;
  let versionData: Record<string, unknown>;
  if (method === "file") {
    const file = form.get("file");
    if (!(file instanceof File) || file.size <= 0) return NextResponse.json({ error: "Pilih file terlebih dahulu." }, { status: 400 });
    if (file.size > Math.min(Number(requirement.max_file_size_bytes ?? maxFileSize), maxFileSize)) return NextResponse.json({ error: "Ukuran file melebihi batas persyaratan." }, { status: 400 });
    const allowedMimes = Array.isArray(requirement.allowed_mime_types) ? requirement.allowed_mime_types : Object.keys(mimeExtensions);
    if (!allowedMimes.includes(file.type) || !mimeExtensions[file.type]) return NextResponse.json({ error: "Format file tidak diizinkan untuk persyaratan ini." }, { status: 400 });
    storagePath = `submissions/${profile.id}/${requirementId}/${crypto.randomUUID()}.${mimeExtensions[file.type]}`;
    const upload = await admin.storage.from("kb-administrasi").upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (upload.error) return NextResponse.json({ error: "File gagal diunggah." }, { status: 500 });
    versionData = { collection_method: "file", storage_path: storagePath, original_name: file.name.slice(0, 180), mime_type: file.type, file_size: file.size, external_url: null };
  } else {
    const externalUrl = String(form.get("external_url") ?? "").trim();
    let parsedUrl: URL;
    try { parsedUrl = new URL(externalUrl); } catch { return NextResponse.json({ error: "Link dokumen tidak valid." }, { status: 400 }); }
    const domains = Array.isArray(requirement.allowed_link_domains) ? requirement.allowed_link_domains : [];
    if (parsedUrl.protocol !== "https:" || !allowedDomain(parsedUrl.hostname.toLowerCase(), domains)) return NextResponse.json({ error: "Link harus HTTPS dan berasal dari domain yang diizinkan." }, { status: 400 });
    versionData = { collection_method: "link", storage_path: null, original_name: null, mime_type: null, file_size: null, external_url: parsedUrl.toString() };
  }

  const versionNo = Number(existing?.current_version_no ?? 0) + 1;
  const { data: submission, error: submissionError } = existing
    ? await admin.from("kb_submissions").update({ status: "menunggu_pemeriksaan", current_version_no: versionNo, submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", existing.id).select("id, requirement_id, status, current_version_no, submitted_at, updated_at").single()
    : await admin.from("kb_submissions").insert({ requirement_id: requirementId, teacher_profile_id: profile.id, status: "menunggu_pemeriksaan", current_version_no: versionNo, submitted_at: new Date().toISOString() }).select("id, requirement_id, status, current_version_no, submitted_at, updated_at").single();
  if (submissionError || !submission) { if (storagePath) await admin.storage.from("kb-administrasi").remove([storagePath]); return NextResponse.json({ error: "Pengumpulan gagal disimpan." }, { status: 500 }); }
  const { error: versionError } = await admin.from("kb_submission_versions").insert({ submission_id: submission.id, version_no: versionNo, submitted_by: profile.id, ...versionData });
  if (versionError) { if (storagePath) await admin.storage.from("kb-administrasi").remove([storagePath]); return NextResponse.json({ error: "Versi dokumen gagal disimpan." }, { status: 500 }); }
  await admin.from("kb_reviews").delete().eq("submission_id", submission.id);
  await notifyReviewersAboutSubmission(admin, { id: submission.id, taskName: requirement.name, teacherName: profile.full_name, versionNo });
  return NextResponse.json({ ok: true, submission }, { status: 201 });
}

export async function DELETE(request: Request) {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  if (profile.role !== "guru") return NextResponse.json({ error: "Hanya guru yang dapat membatalkan pengumpulan miliknya." }, { status: 403 });
  const body = await request.json().catch(() => null) as { submission_id?: unknown } | null;
  if (!body || typeof body.submission_id !== "string") return NextResponse.json({ error: "Pengumpulan tidak valid." }, { status: 400 });
  const admin = createKbAdminClient();
  const { data: submission } = await admin.from("kb_submissions").select("id, teacher_profile_id, status").eq("id", body.submission_id).maybeSingle();
  if (!submission || submission.teacher_profile_id !== profile.id) return NextResponse.json({ error: "Pengumpulan tidak ditemukan." }, { status: 404 });
  if (submission.status === "lengkap") return NextResponse.json({ error: "Tugas sudah diverifikasi KS dan tidak dapat dibatalkan." }, { status: 409 });
  const { data: versions } = await admin.from("kb_submission_versions").select("storage_path").eq("submission_id", submission.id);
  const paths = (versions ?? []).map((version) => version.storage_path).filter((path): path is string => Boolean(path));
  const { error } = await admin.from("kb_submissions").delete().eq("id", submission.id).eq("teacher_profile_id", profile.id);
  if (error) return NextResponse.json({ error: "Pengumpulan gagal dibatalkan." }, { status: 503 });
  if (paths.length) await admin.storage.from("kb-administrasi").remove(paths);
  return NextResponse.json({ ok: true });
}
