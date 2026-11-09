import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageKbUsers, createKbAdminClient, generateTemporaryPassword, normalizeLoginIdentifier } from "@/lib/kb/auth";

const createUserSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  login_identifier: z.string().trim().min(4).max(40),
  role: z.enum(["kepala_sekolah", "guru", "pengawas_dabin"]),
  teacher_type: z.string().trim().max(100).optional().default(""),
  teaching_grade: z.preprocess((value) => value === "" || value === undefined ? null : value, z.coerce.number().int().min(1).max(6).nullable().optional()),
  public_title: z.string().trim().max(120).optional().default(""),
  is_public: z.boolean().optional().default(false),
});

function communityDatabaseError(error: { code?: string; message?: string }) {
  const code = String(error.code ?? "");
  const message = String(error.message ?? "").toLowerCase();
  if (["42P01", "PGRST205"].includes(code) || message.includes("kb_profiles")) return "Database Komunitas Belajar belum siap. Terapkan migrasi komunitas 202611090001_public_community_core.sql, 202611090003_kb_operational_schema.sql, dan 202611090004_community_public_resources.sql terlebih dahulu.";
  if (code === "42703") return "Struktur database Komunitas Belajar belum lengkap. Terapkan ulang migrasi komunitas yang tersedia.";
  return "Profil pengguna gagal disimpan.";
}

export async function GET() {
  if (!(await canManageKbUsers())) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

  const admin = createKbAdminClient();
  const { data, error } = await admin.from("kb_profiles").select("id, full_name, login_identifier, role, teacher_type, teaching_grade, public_title, is_active, is_public, must_change_password, created_at").order("full_name", { ascending: true });
  if (error) return NextResponse.json({ error: communityDatabaseError(error) }, { status: 503 });
  return NextResponse.json({ users: data ?? [] });
}

export async function POST(request: Request) {
  if (!(await canManageKbUsers())) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data pengguna belum lengkap atau tidak valid." }, { status: 400 });

  const identifier = normalizeLoginIdentifier(parsed.data.login_identifier);
  if (!/^[A-Z0-9./]+$/.test(identifier)) return NextResponse.json({ error: "NIP atau NIK hanya boleh berisi huruf, angka, titik, dan garis miring." }, { status: 400 });

  try {
    const admin = createKbAdminClient();
    const { data: existing, error: lookupError } = await admin.from("kb_profiles").select("id").eq("login_identifier", identifier).maybeSingle();
    if (lookupError) return NextResponse.json({ error: communityDatabaseError(lookupError) }, { status: 503 });
    if (existing) return NextResponse.json({ error: "NIP atau NIK sudah terdaftar." }, { status: 409 });

    const temporaryPassword = generateTemporaryPassword();
    const internalEmail = `${crypto.randomUUID()}@kb.internal`;
    const { data: authData, error: authError } = await admin.auth.admin.createUser({ email: internalEmail, password: temporaryPassword, email_confirm: true, user_metadata: { kb_login_identifier: identifier } });
    if (authError || !authData.user) return NextResponse.json({ error: "Akun pengguna gagal dibuat." }, { status: 500 });

    const { error: profileError } = await admin.from("kb_profiles").insert({
      auth_user_id: authData.user.id,
      full_name: parsed.data.full_name,
      login_identifier: identifier,
      role: parsed.data.role,
      teacher_type: parsed.data.teacher_type || null,
      teaching_grade: parsed.data.teaching_grade || null,
      public_title: parsed.data.public_title || null,
      is_public: parsed.data.is_public,
      must_change_password: true,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(authData.user.id);
      if (profileError.code === "23505") return NextResponse.json({ error: "NIP atau NIK sudah terdaftar." }, { status: 409 });
      return NextResponse.json({ error: communityDatabaseError(profileError) }, { status: profileError.code === "PGRST205" || profileError.code === "42P01" || profileError.code === "42703" ? 503 : 500 });
    }

    return NextResponse.json({ ok: true, temporary_password: temporaryPassword });
  } catch (error) {
    console.error("KB user creation failed", error);
    return NextResponse.json({ error: "Layanan pembuatan pengguna belum siap digunakan." }, { status: 503 });
  }
}
