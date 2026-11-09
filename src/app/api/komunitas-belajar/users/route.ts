import { NextResponse } from "next/server";
import { z } from "zod";
import { createKbAdminClient, getCurrentKbProfile, normalizeLoginIdentifier } from "@/lib/kb/auth";
import { createClient } from "@/lib/supabase/server";

async function canManageCommunityUsers() {
  const kbProfile = await getCurrentKbProfile();
  if (kbProfile?.role === "super_admin") return true;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;
  const { data: adminProfile } = await supabase.from("admin_profiles").select("id").eq("user_id", userData.user.id).eq("is_active", true).maybeSingle();
  return Boolean(adminProfile);
}

const createUserSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  login_identifier: z.string().trim().min(4).max(40),
  role: z.enum(["kepala_sekolah", "guru", "pengawas_dabin"]),
  temporary_password: z.string().min(8).max(128),
  teacher_type: z.string().trim().max(100).optional().default(""),
  public_title: z.string().trim().max(120).optional().default(""),
  is_public: z.boolean().optional().default(false),
});

export async function GET() {
  if (!(await canManageCommunityUsers())) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

  const admin = createKbAdminClient();
  const { data, error } = await admin.from("kb_profiles").select("id, full_name, login_identifier, role, teacher_type, public_title, is_active, is_public, must_change_password, created_at").order("full_name", { ascending: true });
  if (error) return NextResponse.json({ error: "Daftar pengguna gagal dimuat." }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}

export async function POST(request: Request) {
  if (!(await canManageCommunityUsers())) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data pengguna belum lengkap atau tidak valid." }, { status: 400 });

  const identifier = normalizeLoginIdentifier(parsed.data.login_identifier);
  if (!/^[A-Z0-9./]+$/.test(identifier)) return NextResponse.json({ error: "NIP atau NIK hanya boleh berisi huruf, angka, titik, dan garis miring." }, { status: 400 });

  try {
    const admin = createKbAdminClient();
    const { data: existing } = await admin.from("kb_profiles").select("id").eq("login_identifier", identifier).maybeSingle();
    if (existing) return NextResponse.json({ error: "NIP atau NIK sudah terdaftar." }, { status: 409 });

    const internalEmail = `${crypto.randomUUID()}@kb.internal`;
    const { data: authData, error: authError } = await admin.auth.admin.createUser({ email: internalEmail, password: parsed.data.temporary_password, email_confirm: true, user_metadata: { kb_login_identifier: identifier } });
    if (authError || !authData.user) return NextResponse.json({ error: "Akun pengguna gagal dibuat." }, { status: 500 });

    const { error: profileError } = await admin.from("kb_profiles").insert({
      auth_user_id: authData.user.id,
      full_name: parsed.data.full_name,
      login_identifier: identifier,
      role: parsed.data.role,
      teacher_type: parsed.data.teacher_type || null,
      public_title: parsed.data.public_title || null,
      is_public: parsed.data.is_public,
      must_change_password: true,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(authData.user.id);
      if (profileError.code === "23505") return NextResponse.json({ error: "NIP atau NIK sudah terdaftar." }, { status: 409 });
      return NextResponse.json({ error: "Profil pengguna gagal disimpan." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("KB user creation failed", error);
    return NextResponse.json({ error: "Layanan pembuatan pengguna belum siap digunakan." }, { status: 503 });
  }
}
