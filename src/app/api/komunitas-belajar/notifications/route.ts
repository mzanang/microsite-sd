import { NextResponse } from "next/server";
import { createKbAdminClient, getCurrentKbProfile } from "@/lib/kb/auth";
import { ensureAttendanceReminders } from "@/lib/kb/notifications";

export async function GET() {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  const admin = createKbAdminClient();
  await ensureAttendanceReminders(admin);
  const now = new Date().toISOString();
  const { data, error } = await admin.from("kb_notifications").select("id, notification_type, title, body, link_url, read_at, created_at, available_at").eq("recipient_profile_id", profile.id).lte("available_at", now).order("created_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: "Notifikasi belum dapat dimuat." }, { status: 503 });
  return NextResponse.json({ notifications: data ?? [], unreadCount: (data ?? []).filter((item) => !item.read_at).length });
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
