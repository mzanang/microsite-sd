import { NextResponse } from "next/server";
import { canManageKbUsers, createKbAdminClient } from "@/lib/kb/auth";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await canManageKbUsers())) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: "Pengguna tidak valid." }, { status: 400 });

  try {
    const admin = createKbAdminClient();
    const { data: profile, error: profileLookupError } = await admin.from("kb_profiles").select("id, auth_user_id, full_name, role").eq("id", id).maybeSingle();
    if (profileLookupError) return NextResponse.json({ error: "Profil pengguna gagal dibaca." }, { status: 500 });
    if (!profile) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    if (profile.role === "super_admin") return NextResponse.json({ error: "Akun Super Admin tidak dapat dihapus dari menu ini." }, { status: 403 });

    const [{ count: submissions }, { count: versions }, { count: reviews }, { count: attendance }] = await Promise.all([
      admin.from("kb_submissions").select("id", { count: "exact", head: true }).eq("teacher_profile_id", id),
      admin.from("kb_submission_versions").select("id", { count: "exact", head: true }).eq("submitted_by", id),
      admin.from("kb_reviews").select("id", { count: "exact", head: true }).eq("reviewer_profile_id", id),
      admin.from("kb_attendance_sessions").select("id", { count: "exact", head: true }).eq("created_by", id),
    ]);
    if ((submissions ?? 0) + (versions ?? 0) + (reviews ?? 0) + (attendance ?? 0) > 0) {
      return NextResponse.json({ error: "Pengguna tidak dapat dihapus karena sudah memiliki riwayat tugas, pemeriksaan, atau daftar hadir. Nonaktifkan akun melalui Edit." }, { status: 409 });
    }

    const { error: deleteProfileError } = await admin.from("kb_profiles").delete().eq("id", id);
    if (deleteProfileError) return NextResponse.json({ error: "Profil pengguna gagal dihapus." }, { status: 500 });

    if (profile.auth_user_id) {
      const { error: deleteAuthError } = await admin.auth.admin.deleteUser(profile.auth_user_id);
      if (deleteAuthError) return NextResponse.json({ error: "Profil sudah dihapus, tetapi akun autentikasi belum berhasil dibersihkan." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, full_name: profile.full_name });
  } catch (error) {
    console.error("KB user deletion failed", error);
    return NextResponse.json({ error: "Layanan penghapusan pengguna belum siap digunakan." }, { status: 503 });
  }
}
