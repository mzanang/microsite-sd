import "server-only";

import { createKbAdminClient } from "@/lib/kb/auth";

type NotificationAdmin = ReturnType<typeof createKbAdminClient>;

type NotificationRow = {
  recipient_profile_id: string;
  notification_type: string;
  title: string;
  body: string;
  link_url: string | null;
  dedupe_key: string;
  available_at: string;
};

async function insertMissingNotifications(admin: NotificationAdmin, rows: NotificationRow[]) {
  if (!rows.length) return;
  const keys = rows.map((row) => row.dedupe_key);
  const { data: existing } = await admin.from("kb_notifications").select("dedupe_key").in("dedupe_key", keys);
  const existingKeys = new Set((existing ?? []).map((row) => row.dedupe_key));
  const pending = rows.filter((row) => !existingKeys.has(row.dedupe_key));
  if (pending.length) await admin.from("kb_notifications").insert(pending);
}

async function getActiveMembers(admin: NotificationAdmin) {
  const { data } = await admin.from("kb_profiles").select("id, community_position").eq("role", "guru").eq("is_active", true);
  return (data ?? []).filter((member) => member.community_position !== "ketua");
}

export async function notifyMembersAboutTask(admin: NotificationAdmin, task: { id: string; name: string; due_at: string | null }) {
  const members = await getActiveMembers(admin);
  const now = new Date().toISOString();
  await insertMissingNotifications(admin, members.map((member) => ({
    recipient_profile_id: member.id,
    notification_type: "task_assigned",
    title: "Tugas Kombel baru",
    body: `${task.name}${task.due_at ? ` · Batas ${new Date(task.due_at).toLocaleString("id-ID")}` : ""}`,
    link_url: `/komunitas-belajar/ruang/tugas_kombel?requirement_id=${task.id}`,
    dedupe_key: `task:${task.id}:${member.id}`,
    available_at: now,
  })));
}

export async function notifyReviewersAboutSubmission(admin: NotificationAdmin, submission: { id: string; taskName: string; teacherName: string; versionNo: number }) {
  const { data: reviewers } = await admin.from("kb_profiles").select("id").in("role", ["kepala_sekolah", "pengawas_dabin"]).eq("is_active", true);
  const now = new Date().toISOString();
  await insertMissingNotifications(admin, (reviewers ?? []).map((reviewer) => ({
    recipient_profile_id: reviewer.id,
    notification_type: "submission_received",
    title: "Tugas baru perlu diperiksa",
    body: `${submission.teacherName} mengirim ${submission.taskName} (versi ${submission.versionNo}).`,
    link_url: "/komunitas-belajar/ruang/verifikasi",
    dedupe_key: `submission:${submission.id}:${submission.versionNo}:${reviewer.id}`,
    available_at: now,
  })));
}

export async function notifyTeacherAboutReview(admin: NotificationAdmin, review: { submissionId: string; teacherProfileId: string; taskName: string; reviewerName: string; status: string }) {
  const statusLabel = review.status === "lengkap" ? "Lengkap" : review.status === "perlu_perbaikan" ? "Perlu perbaikan" : "Menunggu pemeriksaan";
  await insertMissingNotifications(admin, [{
    recipient_profile_id: review.teacherProfileId,
    notification_type: "submission_reviewed",
    title: "Hasil pemeriksaan tugas",
    body: `${review.taskName}: ${statusLabel} oleh ${review.reviewerName}.`,
    link_url: "/komunitas-belajar/ruang/upload_tugas",
    dedupe_key: `review:${review.submissionId}:kepala_sekolah:${review.status}`,
    available_at: new Date().toISOString(),
  }]);
}

export async function notifyForumEntryAuthorAboutReply(admin: NotificationAdmin, reply: { replyId: string; entryId: string; entryTitle: string; entryAuthorId: string; authorId: string; authorName: string }) {
  if (reply.entryAuthorId === reply.authorId) return;
  await insertMissingNotifications(admin, [{
    recipient_profile_id: reply.entryAuthorId,
    notification_type: "forum_reply",
    title: "Balasan forum baru",
    body: `${reply.authorName} membalas diskusi “${reply.entryTitle}”.`,
    link_url: `/komunitas-belajar/forum-diskusi/guru?entry_id=${reply.entryId}`,
    dedupe_key: `forum-reply:${reply.replyId}:${reply.entryAuthorId}`,
    available_at: new Date().toISOString(),
  }]);
}

export async function scheduleAttendanceReminders(admin: NotificationAdmin, session: { id: string; title: string; active_until: string | null }) {
  if (!session.active_until) return;
  const members = await getActiveMembers(admin);
  const availableAt = new Date(new Date(session.active_until).getTime() - 5 * 60 * 1000).toISOString();
  await insertMissingNotifications(admin, members.map((member) => ({
    recipient_profile_id: member.id,
    notification_type: "attendance_closing_soon",
    title: "Presensi segera ditutup",
    body: `${session.title} akan ditutup dalam 5 menit.`,
    link_url: `/komunitas-belajar/ruang/daftar_hadir?session_id=${session.id}`,
    dedupe_key: `attendance-closing:${session.id}:${member.id}`,
    available_at: availableAt,
  })));
}

export async function ensureAttendanceReminders(admin: NotificationAdmin) {
  const now = new Date().toISOString();
  const { data: sessions } = await admin.from("kb_attendance_sessions").select("id, title, active_until").not("active_until", "is", null).gt("active_until", now);
  for (const session of sessions ?? []) await scheduleAttendanceReminders(admin, session);
}
