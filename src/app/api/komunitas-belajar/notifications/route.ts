import { NextResponse } from "next/server";
import { createKbAdminClient, getCurrentKbProfile } from "@/lib/kb/auth";
import { ensureAttendanceReminders } from "@/lib/kb/notifications";

export async function GET() {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  const admin = createKbAdminClient();
  await ensureAttendanceReminders(admin);
  const now = new Date().toISOString();
  const { data, error } = await admin.from("kb_notifications").select("id, notification_type, title, body, link_url, dedupe_key, read_at, created_at, available_at").eq("recipient_profile_id", profile.id).lte("available_at", now).order("created_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: "Notifikasi belum dapat dimuat." }, { status: 503 });

  const pendingReviewNotifications = (data ?? []).filter((item) => !item.read_at && item.notification_type === "submission_received" && item.dedupe_key);
  const submissionIds = [...new Set(pendingReviewNotifications.map((item) => item.dedupe_key!.split(":")[1]).filter(Boolean))];
  const { data: submissions } = submissionIds.length
    ? await admin.from("kb_submissions").select("id, status, current_version_no").in("id", submissionIds)
    : { data: [] as { id: string; status: string; current_version_no: number }[] };
  const submissionMap = new Map((submissions ?? []).map((submission) => [submission.id, submission]));
  const staleNotificationIds = pendingReviewNotifications
    .filter((item) => {
      const parts = item.dedupe_key!.split(":");
      const submission = submissionMap.get(parts[1]);
      if (!submission) return false;
      if (submission.status === "lengkap" || submission.status === "perlu_perbaikan") return true;
      return submission.status === "menunggu_verifikasi_ulang" && Number(parts[2]) < submission.current_version_no;
    })
    .map((item) => item.id);

  if (staleNotificationIds.length) {
    await admin.from("kb_notifications").update({ read_at: now }).in("id", staleNotificationIds);
  }

  const reconciledNotifications = (data ?? []).map((item) => staleNotificationIds.includes(item.id) ? { ...item, read_at: now } : item);
  return NextResponse.json({ notifications: reconciledNotifications, unreadCount: reconciledNotifications.filter((item) => !item.read_at).length });
}

export async function PATCH(request: Request) {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: unknown; all?: unknown } | null;
  const admin = createKbAdminClient();
  let query = admin.from("kb_notifications").update({ read_at: new Date().toISOString() }).eq("recipient_profile_id", profile.id).is("read_at", null);
  if (body?.all !== true) {
    if (typeof body?.id !== "string") return NextResponse.json({ error: "Notifikasi tidak valid." }, { status: 400 });
    query = query.eq("id", body.id);
  }
  const { error } = await query;
  if (error) return NextResponse.json({ error: "Notifikasi gagal diperbarui." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
