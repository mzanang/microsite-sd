import { NextResponse } from "next/server";
import { canManageKbUsers, createKbAdminClient, generateTemporaryPassword } from "@/lib/kb/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await canManageKbUsers())) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: "Pengguna tidak valid." }, { status: 400 });

  try {
    const admin = createKbAdminClient();
    const { data: profile, error: profileLookupError } = await admin.from("kb_profiles").select("id, auth_user_id, full_name, login_identifier").eq("id", id).maybeSingle();
    if (profileLookupError) return NextResponse.json({ error: "Profil pengguna gagal dibaca." }, { status: 500 });
    if (!profile?.auth_user_id) return NextResponse.json({ error: "Akun autentikasi pengguna tidak ditemukan." }, { status: 404 });

    const temporaryPassword = generateTemporaryPassword();
    const { error: authError } = await admin.auth.admin.updateUserById(profile.auth_user_id, { password: temporaryPassword });
    if (authError) return NextResponse.json({ error: "Password pengguna gagal direset." }, { status: 500 });

    const { error: updateError } = await admin.from("kb_profiles").update({ must_change_password: true, updated_at: new Date().toISOString() }).eq("id", id);
    if (updateError) return NextResponse.json({ error: "Status wajib ganti password gagal diperbarui." }, { status: 500 });
    return NextResponse.json({ ok: true, full_name: profile.full_name, login_identifier: profile.login_identifier, temporary_password: temporaryPassword });
  } catch {
    return NextResponse.json({ error: "Layanan reset password belum siap digunakan." }, { status: 503 });
  }
}
