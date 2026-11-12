import { NextResponse } from "next/server";
import { z } from "zod";
import { createKbAdminClient, getCurrentKbProfile } from "@/lib/kb/auth";
import { scheduleAttendanceReminders } from "@/lib/kb/notifications";

const createSchema = z.object({
  action: z.literal("create_session"),
  material_entry_id: z.string().uuid(),
  event_date: z.string().date(),
  active_from: z.string().datetime({ offset: true }),
  active_until: z.string().datetime({ offset: true }),
  location: z.string().trim().max(180).default(""),
  notes: z.string().trim().max(1000).default(""),
});
const markSchema = z.object({ action: z.literal("mark_self"), session_id: z.string().uuid(), status: z.enum(["hadir", "izin", "sakit", "alpa"]), note: z.string().trim().max(500).default("") });
const manageSchema = z.object({ action: z.literal("manage_record"), session_id: z.string().uuid(), profile_id: z.string().uuid(), status: z.enum(["hadir", "izin", "sakit", "alpa"]), note: z.string().trim().max(500).default("") });
const maxAttendanceFileSize = 1 * 1024 * 1024;
const attendanceFileTypes: Record<string, string> = { "image/jpeg": "jpg", "application/pdf": "pdf" };

function canCreateSession(profile: Awaited<ReturnType<typeof getCurrentKbProfile>>) {
  return Boolean(profile && (profile.role === "super_admin" || (profile.role === "guru" && profile.community_position === "ketua")));
}

function isRequiredAttendanceParticipant(profile: { role: string; community_position: string | null }) {
  return profile.role === "kepala_sekolah" || (profile.role === "guru" && (profile.community_position === "ketua" || profile.community_position === "anggota"));
}

export async function GET() {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  const admin = createKbAdminClient();
  const [{ data: sessions, error }, { data: materials }, { data: participants }] = await Promise.all([
    admin.from("kb_attendance_sessions").select("id, title, meeting_number, event_date, location, notes, material_entry_id, active_from, active_until, created_by, created_at, attendance_file_path, attendance_file_name, attendance_file_mime_type").order("event_date", { ascending: false }).order("created_at", { ascending: false }),
    admin.from("kb_community_entries").select("id, title, body, created_at").eq("menu_key", "materi").eq("is_published", true).order("created_at", { ascending: false }),
    admin.from("kb_profiles").select("id, full_name, login_identifier, teacher_type, teaching_grade, role, community_position").in("role", ["guru", "kepala_sekolah", "pengawas_dabin"]).eq("is_active", true).order("full_name", { ascending: true }),
  ]);
  if (error) return NextResponse.json({ error: "Data kehadiran belum dapat dimuat. Terapkan migrasi menu komunitas terlebih dahulu." }, { status: 503 });
  const ids = (sessions ?? []).map((session) => session.id);
  const { data: records } = ids.length ? await admin.from("kb_attendance_records").select("id, session_id, profile_id, status, note, marked_at").in("session_id", ids) : { data: [] };
  const profileIds = [...new Set((records ?? []).map((record) => record.profile_id))];
  const { data: profiles } = profileIds.length ? await admin.from("kb_profiles").select("id, full_name, login_identifier, teacher_type, teaching_grade, role, community_position").in("id", profileIds) : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const materialMap = new Map((materials ?? []).map((m) => [m.id, m.title]));

  // Efficiently generate signed URLs only for sessions that actually have a file
  const sessionsWithFiles = (sessions ?? []).filter((s) => Boolean(s.attendance_file_path));
  const fileUrlMap = new Map<string, string>();
  if (sessionsWithFiles.length) {
    await Promise.all(
      sessionsWithFiles.map(async (s) => {
        if (!s.attendance_file_path) return;
        const result = await admin.storage.from("kb-administrasi").createSignedUrl(s.attendance_file_path, 3600);
        if (result.data?.signedUrl) fileUrlMap.set(s.attendance_file_path, result.data.signedUrl);
      })
    );
  }

  // Group records by session_id in a Map for instant O(1) grouping
  const recordsBySession = new Map<string, Array<{ id: string; session_id: string; profile_id: string; status: string; note: string; marked_at: string; profile: unknown; profile_name: string }>>();
  for (const record of records ?? []) {
    const list = recordsBySession.get(record.session_id) ?? [];
    const prof = profileMap.get(record.profile_id) ?? null;
    list.push({
      ...record,
      profile: prof,
      profile_name: prof?.full_name ?? "Anggota",
    });
    recordsBySession.set(record.session_id, list);
  }

  const hydratedSessions = (sessions ?? []).map((session) => ({
    ...session,
    attendance_file_url: session.attendance_file_path ? fileUrlMap.get(session.attendance_file_path) ?? null : null,
    material_title: (session.material_entry_id ? materialMap.get(session.material_entry_id) : null) ?? "Materi kegiatan",
    records: recordsBySession.get(session.id) ?? [],
  }));

  return NextResponse.json({
    materials: materials ?? [],
    participants: participants ?? [],
    sessions: hydratedSessions,
    current_profile_id: profile.id,
  });
}

export async function POST(request: Request) {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    if (!canCreateSession(profile)) return NextResponse.json({ error: "Hanya Ketua Kombel yang dapat mengunggah daftar hadir." }, { status: 403 });
    const form = await request.formData();
    const sessionId = String(form.get("session_id") ?? "");
    const file = form.get("file");
    if (!z.string().uuid().safeParse(sessionId).success || !(file instanceof File) || file.size <= 0) return NextResponse.json({ error: "Sesi dan file daftar hadir wajib dipilih." }, { status: 400 });
    if (file.size > maxAttendanceFileSize) return NextResponse.json({ error: "Ukuran daftar hadir maksimal 1 MB." }, { status: 400 });
    const extension = attendanceFileTypes[file.type];
    if (!extension) return NextResponse.json({ error: "Format daftar hadir hanya JPG atau PDF." }, { status: 400 });
    const admin = createKbAdminClient();
    const { data: session } = await admin.from("kb_attendance_sessions").select("id, attendance_file_path").eq("id", sessionId).maybeSingle();
    if (!session) return NextResponse.json({ error: "Sesi kegiatan tidak ditemukan." }, { status: 404 });
    const storagePath = `attendance/${profile.id}/${sessionId}/${crypto.randomUUID()}.${extension}`;
    const upload = await admin.storage.from("kb-administrasi").upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (upload.error) return NextResponse.json({ error: "File daftar hadir gagal diunggah." }, { status: 500 });
    const { data, error } = await admin.from("kb_attendance_sessions").update({ attendance_file_path: storagePath, attendance_file_name: file.name.slice(0, 180), attendance_file_mime_type: file.type, updated_at: new Date().toISOString() }).eq("id", sessionId).select("id, attendance_file_name, attendance_file_mime_type").single();
    if (error || !data) { await admin.storage.from("kb-administrasi").remove([storagePath]); return NextResponse.json({ error: "File daftar hadir gagal disimpan." }, { status: 503 }); }
    if (session.attendance_file_path) await admin.storage.from("kb-administrasi").remove([session.attendance_file_path]);
    return NextResponse.json({ ok: true, session: data });
  }
  const body = await request.json().catch(() => null);
  const create = createSchema.safeParse(body);
  const mark = markSchema.safeParse(body);
  const manage = manageSchema.safeParse(body);
  const admin = createKbAdminClient();

  if (create.success) {
    if (!canCreateSession(profile)) return NextResponse.json({ error: "Hanya Ketua Kombel yang dapat membuat sesi kegiatan." }, { status: 403 });
    const from = new Date(create.data.active_from);
    const until = new Date(create.data.active_until);
    if (until <= from) return NextResponse.json({ error: "Batas akhir presensi harus setelah waktu mulai." }, { status: 400 });
    const { data: material } = await admin.from("kb_community_entries").select("id, title").eq("id", create.data.material_entry_id).eq("menu_key", "materi").maybeSingle();
    if (!material) return NextResponse.json({ error: "Materi kegiatan wajib dipilih sebelum membuat daftar hadir." }, { status: 400 });
    const { data: lastSession } = await admin.from("kb_attendance_sessions").select("meeting_number").order("meeting_number", { ascending: false }).limit(1).maybeSingle();
    const meetingNumber = Number(lastSession?.meeting_number ?? 0) + 1;
    const { action: _action, material_entry_id: _materialId, ...sessionData } = create.data;
    const { data, error } = await admin.from("kb_attendance_sessions").insert({ ...sessionData, meeting_number: meetingNumber, material_entry_id: material.id, title: `Pertemuan ke-${meetingNumber} - ${material.title}`.slice(0, 180), created_by: profile.id }).select("id, title, meeting_number, event_date, location, notes, material_entry_id, active_from, active_until, created_by, created_at, attendance_file_path, attendance_file_name, attendance_file_mime_type").single();
    if (error || !data) return NextResponse.json({ error: "Sesi kegiatan gagal disimpan." }, { status: 503 });
    await scheduleAttendanceReminders(admin, data);
    return NextResponse.json({ session: { ...data, material_title: material.title, records: [] } }, { status: 201 });
  }

  if (mark.success) {
    if (!isRequiredAttendanceParticipant(profile)) return NextResponse.json({ error: "Pengawas Dabin tidak termasuk peserta wajib daftar hadir." }, { status: 403 });
    const { data: session } = await admin.from("kb_attendance_sessions").select("active_from, active_until").eq("id", mark.data.session_id).maybeSingle();
    if (!session) return NextResponse.json({ error: "Sesi kehadiran tidak ditemukan." }, { status: 404 });
    const now = Date.now();
    if ((session.active_from && now < new Date(session.active_from).getTime()) || (session.active_until && now > new Date(session.active_until).getTime())) return NextResponse.json({ error: "Pengisian presensi sedang tidak berada dalam waktu aktif." }, { status: 409 });
    const { data: existingRecord } = await admin.from("kb_attendance_records").select("id").eq("session_id", mark.data.session_id).eq("profile_id", profile.id).maybeSingle();
    if (existingRecord && profile.role === "guru" && profile.community_position !== "ketua") return NextResponse.json({ error: "Kehadiran Anda sudah tercatat dan hanya dapat diisi satu kali." }, { status: 409 });
    const { data, error } = await admin.from("kb_attendance_records").upsert({ session_id: mark.data.session_id, profile_id: profile.id, status: mark.data.status, note: mark.data.note, marked_at: new Date().toISOString() }, { onConflict: "session_id,profile_id" }).select("id, session_id, profile_id, status, note, marked_at").single();
    if (error || !data) return NextResponse.json({ error: "Kehadiran gagal disimpan." }, { status: 503 });
    return NextResponse.json({ record: data });
  }
  if (manage.success) {
    if (!canCreateSession(profile)) return NextResponse.json({ error: "Hanya Ketua Kombel yang dapat mengubah rekap kehadiran." }, { status: 403 });
    const { data, error } = await admin.from("kb_attendance_records").upsert({ session_id: manage.data.session_id, profile_id: manage.data.profile_id, status: manage.data.status, note: manage.data.note, marked_at: new Date().toISOString() }, { onConflict: "session_id,profile_id" }).select("id, session_id, profile_id, status, note, marked_at").single();
    if (error || !data) return NextResponse.json({ error: "Rekap kehadiran gagal diubah." }, { status: 503 });
    return NextResponse.json({ record: data });
  }
  return NextResponse.json({ error: "Data kehadiran belum valid." }, { status: 400 });
}

export async function DELETE(request: Request) {
  const profile = await getCurrentKbProfile();
  if (!canCreateSession(profile)) return NextResponse.json({ error: "Hanya Ketua Kombel yang dapat menghapus rekap kehadiran." }, { status: 403 });
  const body = await request.json().catch(() => null) as { session_id?: unknown; profile_id?: unknown } | null;
  if (!body || typeof body.session_id !== "string" || typeof body.profile_id !== "string") return NextResponse.json({ error: "Data rekap tidak valid." }, { status: 400 });
  const { error } = await createKbAdminClient().from("kb_attendance_records").delete().eq("session_id", body.session_id).eq("profile_id", body.profile_id);
  if (error) return NextResponse.json({ error: "Rekap kehadiran gagal dihapus." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
