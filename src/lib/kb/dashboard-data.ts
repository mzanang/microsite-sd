import "server-only";

import { cache } from "react";
import { createKbAdminClient, type KbProfile } from "@/lib/kb/auth";
import { getLinkedSessionMap } from "@/lib/kb/linked-session-data";

export type DashboardView = "ketua" | "sekretaris" | "anggota" | "ks" | "pengawas";
export type DashboardPermission = { menu_key: string; access_level: "lihat" | "kelola" | "monitoring" };
export type DashboardStat = { label: string; value: number; tone: "blue" | "green" | "purple" | "orange" };
export type DashboardChartPoint = { month: string; submissions: number; reviewed: number };
export type DashboardStatusPoint = { name: string; value: number; color: string };
export type DashboardActivity = { title: string; description: string; status: string; date: string };
export type DashboardRequirement = {
  id: string;
  name: string;
  description: string;
  collection_method: "file" | "link" | "both";
  is_required: boolean;
  due_at: string | null;
  is_active: boolean;
  attendance_session_id: string | null;
  meeting_number?: number | null;
  material_title?: string | null;
  submission_id?: string | null;
  submission_status?: string | null;
  is_locked?: boolean;
};
export type RoleDashboardData = {
  stats: DashboardStat[];
  chart: DashboardChartPoint[];
  status: DashboardStatusPoint[];
  activities: DashboardActivity[];
  notificationCount: number;
  scopeNote: string;
  permissions: DashboardPermission[];
  requirements: DashboardRequirement[];
  menuBadges: Record<string, number>;
};

type SubmissionRow = { id: string; requirement_id: string; status: string; created_at: string; updated_at: string; submitted_at: string | null; teacher_profile_id: string };
type ReviewRow = { submission_id: string; reviewer_role: string; status: string; reviewed_at: string };

function latestKsReviews(reviews: ReviewRow[]) {
  const latest = new Map<string, ReviewRow>();
  for (const review of reviews) {
    if (review.reviewer_role === "kepala_sekolah" && !latest.has(review.submission_id)) latest.set(review.submission_id, review);
  }
  return latest;
}

function effectiveSubmissionStatus(submission: SubmissionRow, review?: ReviewRow) {
  if (!review) return submission.status;
  if (submission.submitted_at && review.reviewed_at && new Date(submission.submitted_at).getTime() > new Date(review.reviewed_at).getTime()) return "menunggu_verifikasi_ulang";
  return review.status;
}

const statusColors = {
  submitted: "#1473e6",
  pending: "#f59e0b",
  verified: "#16b979",
  revision: "#ef4444",
  missing: "#cbd5e1",
};

const fallbackPermissions: Record<DashboardView, DashboardPermission[]> = {
  ketua: ["dashboard", "upload_sk", "materi", "dokumentasi", "praktik_baik", "forum", "upload_tugas", "memberikan_tugas", "daftar_hadir", "profil"].map((menu_key) => ({ menu_key, access_level: menu_key === "dashboard" || menu_key === "profil" ? "lihat" : "kelola" })),
  sekretaris: ["dashboard", "upload_sk", "materi", "dokumentasi", "praktik_baik", "forum", "upload_tugas", "memberikan_tugas", "daftar_hadir", "profil"].map((menu_key) => ({ menu_key, access_level: menu_key === "dashboard" || menu_key === "profil" ? "lihat" : "kelola" })),
  anggota: ["dashboard", "materi", "forum", "upload_tugas", "daftar_hadir", "profil"].map((menu_key) => ({ menu_key, access_level: menu_key === "dashboard" || menu_key === "materi" || menu_key === "forum" ? "lihat" : "kelola" })),
  ks: ["dashboard", "upload_sk", "materi", "dokumentasi", "praktik_baik", "forum", "upload_tugas", "daftar_hadir", "verifikasi", "grafik", "monitoring", "profil"].map((menu_key) => ({ menu_key, access_level: menu_key === "daftar_hadir" ? "monitoring" : menu_key === "verifikasi" || menu_key === "profil" ? "kelola" : "lihat" })),
  pengawas: ["dashboard", "upload_sk", "materi", "dokumentasi", "praktik_baik", "forum", "upload_tugas", "daftar_hadir", "verifikasi", "grafik", "monitoring", "profil"].map((menu_key) => ({ menu_key, access_level: menu_key === "daftar_hadir" ? "monitoring" : menu_key === "profil" ? "kelola" : "lihat" })),
};

export const getRoleDashboardData = cache(async (profile: KbProfile, view: DashboardView): Promise<RoleDashboardData> => {
  const admin = createKbAdminClient();
  const isPersonalTeacherDashboard = profile.role === "guru";
  const isMember = view === "anggota" || isPersonalTeacherDashboard;
  const [{ data: members }, { data: requirements }, { data: submissions }, { count: notificationCount }, { data: permissionRows }] = await Promise.all([
    admin.from("kb_profiles").select("id, full_name", { count: "exact" }).eq("role", "guru").eq("is_active", true),
    admin.from("kb_document_requirements").select("id, name, description, collection_method, is_required, due_at, is_active, attendance_session_id").eq("is_active", true).order("sort_order", { ascending: true }),
    isMember
      ? admin.from("kb_submissions").select("id, requirement_id, status, created_at, updated_at, submitted_at, teacher_profile_id").eq("teacher_profile_id", profile.id).order("updated_at", { ascending: false })
      : admin.from("kb_submissions").select("id, requirement_id, status, created_at, updated_at, submitted_at, teacher_profile_id").order("updated_at", { ascending: false }),
    admin.from("kb_notifications").select("id", { count: "exact", head: true }).eq("recipient_profile_id", profile.id).is("read_at", null).lte("available_at", new Date().toISOString()),
    admin.from("kb_menu_permissions").select("menu_key, access_level").eq("role_key", view).eq("is_active", true),
  ]);

  const memberCount = members?.length ?? 0;
  const activeRequirements = requirements?.length ?? 0;
  const submissionRows = (submissions ?? []) as SubmissionRow[];
  const submissionIds = submissionRows.map((item) => item.id);
  const { data: reviews } = submissionIds.length
    ? await admin.from("kb_reviews").select("submission_id, reviewer_role, status, reviewed_at").in("submission_id", submissionIds).order("reviewed_at", { ascending: false })
    : { data: [] as ReviewRow[] };
  const reviewRows = (reviews ?? []) as ReviewRow[];
  const submissionById = new Map(submissionRows.map((submission) => [submission.id, submission]));
  const ksReviewsBySubmission = latestKsReviews(reviewRows);
  const effectiveSubmissionRows = submissionRows.map((submission) => ({ ...submission, status: effectiveSubmissionStatus(submission, ksReviewsBySubmission.get(submission.id)) }));
  const completeCount = effectiveSubmissionRows.filter((item) => item.status === "lengkap").length;
  const pendingCount = effectiveSubmissionRows.filter((item) => item.status === "menunggu_pemeriksaan" || item.status === "menunggu_verifikasi_ulang").length;
  const revisionCount = effectiveSubmissionRows.filter((item) => item.status === "perlu_perbaikan").length;
  const expectedCount = isMember ? activeRequirements : activeRequirements * memberCount;
  const missingCount = Math.max(expectedCount - effectiveSubmissionRows.length, 0);
  const chart = createMonthlyChart(effectiveSubmissionRows, reviewRows);
  const status = [
    { name: "Terkumpul", value: completeCount, color: statusColors.verified },
    { name: "Menunggu", value: pendingCount, color: statusColors.pending },
    { name: "Perlu perbaikan", value: revisionCount, color: statusColors.revision },
    { name: "Belum dikumpulkan", value: missingCount, color: statusColors.missing },
  ];
  const teacherNames = await getTeacherNames(admin, effectiveSubmissionRows.slice(0, 5));
  const menuBadges = await getRoleMenuBadges(profile, view, admin, (requirements ?? []) as DashboardRequirement[], effectiveSubmissionRows);

  const sessionIds = [...new Set((requirements ?? []).map((r) => r.attendance_session_id).filter(Boolean))] as string[];
  const sessionMap = await getLinkedSessionMap(admin, sessionIds);

  const lockedReqIds = new Set(
    effectiveSubmissionRows
      .filter((s) => s.status === "lengkap" || s.status === "perlu_perbaikan")
      .map((s) => s.requirement_id)
  );

  return {
    stats: statsFor(view, { memberCount, activeRequirements, submissionCount: submissionRows.length, pendingCount, completeCount }),
    chart,
    status,
    activities: submissionRows.slice(0, 5).map((submission) => ({
      title: activityTitle(submission.status),
      description: `${teacherNames.get(submission.teacher_profile_id) ?? "Guru"} · administrasi komunitas`,
      status: statusLabel(submission.status),
      date: formatDate(submission.updated_at || submission.created_at),
    })),
    notificationCount: notificationCount ?? 0,
    scopeNote: isMember ? `Menampilkan data pengumpulan milik ${profile.full_name}.` : "Menampilkan data komunitas berdasarkan kewenangan akun Anda.",
    permissions: permissionRows?.length ? permissionRows as DashboardPermission[] : fallbackPermissions[view],
    requirements: (requirements ?? []).map((requirement) => {
      const submission = effectiveSubmissionRows.find((item) => item.requirement_id === requirement.id);
      const session = requirement.attendance_session_id ? sessionMap.get(requirement.attendance_session_id) : null;
      return {
        ...requirement,
        meeting_number: session?.meeting_number ?? null,
        material_title: session?.material_title ?? null,
        submission_id: submission?.id ?? null,
        submission_status: isMember ? submission?.status ?? null : null,
        is_locked: lockedReqIds.has(requirement.id),
      };
    }) as DashboardRequirement[],
    menuBadges,
  };
});

export const getRoleWorkspaceData = cache(async (profile: KbProfile, view: DashboardView): Promise<RoleDashboardData> => {
  const admin = createKbAdminClient();
  const [{ data: requirements }, { data: ownSubmissions }, { count: notificationCount }, { data: permissionRows }, { data: verifiedSubmissions }] = await Promise.all([
    admin.from("kb_document_requirements").select("id, name, description, collection_method, is_required, due_at, is_active, attendance_session_id").eq("is_active", true).order("sort_order", { ascending: true }),
    profile.role === "guru" ? admin.from("kb_submissions").select("id, requirement_id, status").eq("teacher_profile_id", profile.id) : Promise.resolve({ data: [] as Array<{ id: string; requirement_id: string; status: string }> }),
    admin.from("kb_notifications").select("id", { count: "exact", head: true }).eq("recipient_profile_id", profile.id).is("read_at", null).lte("available_at", new Date().toISOString()),
    admin.from("kb_menu_permissions").select("menu_key, access_level").eq("role_key", view).eq("is_active", true),
    admin.from("kb_submissions").select("requirement_id").in("status", ["lengkap", "perlu_perbaikan"]),
  ]);

  const rawRequirements = requirements ?? [];
  const sessionIds = [...new Set(rawRequirements.map((r) => r.attendance_session_id).filter(Boolean))] as string[];
  const sessionMap = await getLinkedSessionMap(admin, sessionIds);
  const lockedReqIds = new Set((verifiedSubmissions ?? []).map((s) => s.requirement_id));

  const menuBadges = await getRoleMenuBadges(profile, view, admin, rawRequirements as DashboardRequirement[]);

  return {
    stats: [],
    chart: [],
    status: [],
    activities: [],
    notificationCount: notificationCount ?? 0,
    scopeNote: `Menampilkan ruang kerja untuk ${profile.full_name}.`,
    permissions: permissionRows?.length ? permissionRows as DashboardPermission[] : fallbackPermissions[view],
    requirements: rawRequirements.map((requirement) => {
      const submission = (ownSubmissions ?? []).find((item) => item.requirement_id === requirement.id);
      const session = requirement.attendance_session_id ? sessionMap.get(requirement.attendance_session_id) : null;
      return {
        ...requirement,
        meeting_number: session?.meeting_number ?? null,
        material_title: session?.material_title ?? null,
        submission_id: submission?.id ?? null,
        submission_status: submission?.status ?? null,
        is_locked: lockedReqIds.has(requirement.id),
      };
    }) as DashboardRequirement[],
    menuBadges,
  };
});

export async function getRoleMenuBadges(profile: KbProfile, view: DashboardView, admin = createKbAdminClient(), providedRequirements?: DashboardRequirement[], providedSubmissions?: SubmissionRow[]) {
  const requirements = providedRequirements ?? ((await admin.from("kb_document_requirements").select("id, name, description, collection_method, is_required, due_at, is_active, attendance_session_id").eq("is_active", true)).data ?? []) as DashboardRequirement[];
  const badges: Record<string, number> = {};

  if (view === "anggota") {
    // Only fetch submissions belonging to this member to avoid downloading entire school's data
    const submissions = providedSubmissions ?? ((await admin.from("kb_submissions").select("id, requirement_id, status, created_at, updated_at, submitted_at, teacher_profile_id").eq("teacher_profile_id", profile.id).order("updated_at", { ascending: false })).data ?? []) as SubmissionRow[];
    const submissionIds = submissions.map((submission) => submission.id);
    const { data: reviewRows } = submissionIds.length
      ? await admin.from("kb_reviews").select("submission_id, status, reviewed_at").eq("reviewer_role", "kepala_sekolah").in("submission_id", submissionIds)
      : { data: [] as Array<{ submission_id: string; status: string; reviewed_at: string | null }> };
    const reviewStatusBySubmission = new Map((reviewRows ?? []).filter((review) => {
      const submission = submissions.find((item) => item.id === review.submission_id);
      return Boolean(submission && (!submission.submitted_at || !review.reviewed_at || new Date(review.reviewed_at).getTime() >= new Date(submission.submitted_at).getTime()));
    }).map((review) => [review.submission_id, review.status]));
    const effectiveStatus = (submission: SubmissionRow) => reviewStatusBySubmission.get(submission.id) ?? submission.status;

    const submittedByRequirement = new Map(submissions.map((submission) => [submission.requirement_id, submission]));
    badges.tugas_kombel = requirements.filter((requirement) => {
      const submission = submittedByRequirement.get(requirement.id);
      return !submission || effectiveStatus(submission) === "perlu_perbaikan";
    }).length;
  } else if (view === "ks" || view === "ketua" || view === "sekretaris") {
    const submissions = providedSubmissions ?? ((await admin.from("kb_submissions").select("id, requirement_id, status, created_at, updated_at, submitted_at, teacher_profile_id").order("updated_at", { ascending: false })).data ?? []) as SubmissionRow[];
    const submissionIds = submissions.map((submission) => submission.id);
    const { data: reviews } = submissionIds.length
      ? await admin.from("kb_reviews").select("submission_id, reviewer_role, status, reviewed_at").eq("reviewer_role", "kepala_sekolah").in("submission_id", submissionIds).order("reviewed_at", { ascending: false })
      : { data: [] as ReviewRow[] };
    const latestReviews = latestKsReviews((reviews ?? []) as ReviewRow[]);
    const count = submissions.filter((submission) => ["menunggu_pemeriksaan", "menunggu_verifikasi_ulang"].includes(effectiveSubmissionStatus(submission, latestReviews.get(submission.id)))).length;
    if (view === "ks") badges.verifikasi = count;
    if (view === "ketua" || view === "sekretaris") badges.pengumpulan_anggota = count;
  }

  // Attendance badge: only query sessions currently active right now
  if (view === "ketua" || view === "sekretaris" || view === "anggota" || view === "ks") {
    const now = new Date().toISOString();
    const [{ data: activeSessions }, { data: records }] = await Promise.all([
      admin.from("kb_attendance_sessions").select("id").lte("active_from", now).gte("active_until", now),
      admin.from("kb_attendance_records").select("session_id").eq("profile_id", profile.id),
    ]);
    const recordedSessions = new Set((records ?? []).map((record) => record.session_id));
    badges.daftar_hadir = (activeSessions ?? []).filter((session) => !recordedSessions.has(session.id)).length;
  }

  return badges;
}

function statsFor(view: DashboardView, values: { memberCount: number; activeRequirements: number; submissionCount: number; pendingCount: number; completeCount: number }): DashboardStat[] {
  if (view === "anggota") return [
    { label: "Administrasi diberikan", value: values.activeRequirements, tone: "blue" },
    { label: "Sudah terkumpul", value: values.submissionCount, tone: "green" },
    { label: "Menunggu pemeriksaan", value: values.pendingCount, tone: "purple" },
    { label: "Terverifikasi", value: values.completeCount, tone: "orange" },
  ];
  if (view === "ketua" || view === "sekretaris") return [
    { label: "Anggota aktif", value: values.memberCount, tone: "blue" },
    { label: "Pengumpulan masuk", value: values.submissionCount, tone: "purple" },
    { label: "Menunggu pemeriksaan", value: values.pendingCount, tone: "orange" },
    { label: "Terverifikasi", value: values.completeCount, tone: "green" },
  ];
  return [
    { label: "Anggota aktif", value: values.memberCount, tone: "blue" },
    { label: "Pengumpulan masuk", value: values.submissionCount, tone: "green" },
    { label: "Menunggu pemeriksaan", value: values.pendingCount, tone: "purple" },
    { label: "Terverifikasi", value: values.completeCount, tone: "orange" },
  ];
}

function createMonthlyChart(submissions: SubmissionRow[], reviews: ReviewRow[]) {
  const now = new Date();
  const points = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return { key: `${date.getFullYear()}-${date.getMonth()}`, month: date.toLocaleDateString("id-ID", { month: "short" }).replace(".", ""), submissions: 0, reviewed: 0 };
  });
  const pointMap = new Map(points.map((point) => [point.key, point]));
  for (const item of submissions) {
    const date = new Date(item.created_at);
    const point = pointMap.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (point) point.submissions += 1;
  }
  for (const item of reviews) {
    const date = new Date(item.reviewed_at);
    const point = pointMap.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (point) point.reviewed += 1;
  }
  return points.map(({ key: _key, ...point }) => point);
}

async function getTeacherNames(admin: ReturnType<typeof createKbAdminClient>, submissions: SubmissionRow[]) {
  const ids = [...new Set(submissions.map((item) => item.teacher_profile_id))];
  if (!ids.length) return new Map<string, string>();
  const { data } = await admin.from("kb_profiles").select("id, full_name").in("id", ids);
  return new Map((data ?? []).map((item) => [item.id, item.full_name]));
}

function activityTitle(status: string) {
  if (status === "lengkap") return "Pengumpulan terverifikasi";
  if (status === "menunggu_pemeriksaan") return "Pengumpulan menunggu pemeriksaan";
  if (status === "perlu_perbaikan") return "Pengumpulan perlu perbaikan";
  return "Pengumpulan baru dibuat";
}

function statusLabel(status: string) {
  if (status === "lengkap") return "Terverifikasi";
  if (status === "menunggu_pemeriksaan") return "Menunggu";
  if (status === "perlu_perbaikan") return "Perlu perbaikan";
  return "Belum dikumpulkan";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
