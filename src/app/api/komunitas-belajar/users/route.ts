import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageKbUsers, createKbAdminClient, generateTemporaryPassword, normalizeLoginIdentifier } from "@/lib/kb/auth";

const createUserSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  login_identifier: z.string().trim().regex(/^\d{4,32}$/, "NIP atau NIK harus berupa angka."),
  role: z.enum(["kepala_sekolah", "guru", "pengawas_dabin"]),
  teacher_type: z.preprocess((value) => value === null ? undefined : value, z.string().trim().max(100).optional().default("")),
  teaching_subject: z.preprocess((value) => value === null ? undefined : value, z.enum(["PAIBP", "PJOK"]).optional().default("PAIBP")),
  teaching_grade: z.preprocess((value) => value === "" || value === undefined || value === null ? null : value, z.coerce.number().int().min(1).max(6).nullable().optional()),
  teaching_grades: z.array(z.coerce.number().int().min(1).max(6)).optional().default([]),
  public_title: z.preprocess((value) => value === null ? undefined : value, z.string().trim().max(120).optional().default("")),
  community_position: z.enum(["ketua", "anggota"]).optional().default("anggota"),
  recovery_email: z.string().trim().email("Format email pemulihan tidak valid.").or(z.literal("")).optional(),
  is_public: z.boolean().optional().default(false),
});

const updateUserSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().trim().min(2).max(120),
  login_identifier: z.string().trim().regex(/^\d{4,32}$/, "NIP atau NIK harus berupa angka."),
  role: z.enum(["kepala_sekolah", "guru", "pengawas_dabin"]),
  teacher_type: z.preprocess((value) => value === null ? undefined : value, z.string().trim().max(100).optional().default("")),
  teaching_subject: z.preprocess((value) => value === null ? undefined : value, z.enum(["PAIBP", "PJOK"]).optional().default("PAIBP")),
  teaching_grade: z.preprocess((value) => value === "" || value === undefined || value === null ? null : value, z.coerce.number().int().min(1).max(6).nullable().optional()),
  teaching_grades: z.array(z.coerce.number().int().min(1).max(6)).optional().default([]),
  public_title: z.preprocess((value) => value === null ? undefined : value, z.string().trim().max(120).optional().default("")),
  community_position: z.enum(["ketua", "anggota"]).nullable().optional(),
  recovery_email: z.string().trim().email("Format email tidak valid.").or(z.literal("")).optional().nullable(),
  is_active: z.boolean().default(true),
  is_public: z.boolean().default(false),
});

function communityDatabaseError(error: { code?: string; message?: string }) {
  const code = String(error.code ?? "");
  const message = String(error.message ?? "").toLowerCase();
  if (["42P01", "PGRST205"].includes(code) || message.includes("kb_profiles")) return "Database Komunitas Belajar belum siap. Terapkan migrasi komunitas 202611090001_public_community_core.sql, 202611090003_kb_operational_schema.sql, 202611090004_community_public_resources.sql, 202611100001_community_position.sql, dan 202611100010_kb_teacher_subject_scope.sql terlebih dahulu.";
  if (code === "42703") return "Struktur database Komunitas Belajar belum lengkap. Terapkan ulang migrasi komunitas yang tersedia.";
  return "Profil pengguna gagal disimpan.";
}

function normalizeTeachingFields(input: { role: string; teacher_type: string; teaching_subject: string; teaching_grade?: number | null; teaching_grades: number[] }) {
  if (input.role !== "guru") return { teacher_type: null, teaching_subject: null, teaching_grade: null, teaching_grades: [] };
  const teacherType = input.teacher_type === "Guru Mapel" ? "Guru Mapel" : "Guru Kelas";
  const grades = teacherType === "Guru Mapel"
    ? [1, 2, 3, 4, 5, 6]
    : Array.from(new Set([...(input.teaching_grades ?? []), ...(input.teaching_grade ? [input.teaching_grade] : [])])).slice(0, 1);
  return {
    teacher_type: teacherType,
    teaching_subject: teacherType === "Guru Mapel" ? input.teaching_subject || "PAIBP" : null,
    teaching_grade: teacherType === "Guru Kelas" ? grades[0] ?? null : null,
    teaching_grades: grades,
  };
}

export async function GET() {
  if (!(await canManageKbUsers())) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

  const admin = createKbAdminClient();
  const { data, error } = await admin.from("kb_profiles").select("id, full_name, login_identifier, role, teacher_type, teaching_subject, teaching_grade, teaching_grades, public_title, community_position, is_active, is_public, must_change_password, recovery_email, recovery_email_verified, created_at").order("full_name", { ascending: true });
  if (error) return NextResponse.json({ error: communityDatabaseError(error) }, { status: 503 });
  return NextResponse.json({ users: data ?? [] });
}

export async function POST(request: Request) {
  if (!(await canManageKbUsers())) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data pengguna belum lengkap atau tidak valid." }, { status: 400 });

  const identifier = normalizeLoginIdentifier(parsed.data.login_identifier);
  if (!/^\d{4,32}$/.test(identifier)) return NextResponse.json({ error: "NIP atau NIK hanya boleh berisi angka." }, { status: 400 });

  try {
    const admin = createKbAdminClient();
    const { data: existing, error: lookupError } = await admin.from("kb_profiles").select("id").eq("login_identifier", identifier).maybeSingle();
    if (lookupError) return NextResponse.json({ error: communityDatabaseError(lookupError) }, { status: 503 });
    if (existing) return NextResponse.json({ error: "NIP atau NIK sudah terdaftar." }, { status: 409 });

    const temporaryPassword = generateTemporaryPassword();
    const internalEmail = `${crypto.randomUUID()}@kb.internal`;
    const { data: authData, error: authError } = await admin.auth.admin.createUser({ email: internalEmail, password: temporaryPassword, email_confirm: true, user_metadata: { kb_login_identifier: identifier } });
    if (authError || !authData.user) return NextResponse.json({ error: "Akun pengguna gagal dibuat." }, { status: 500 });

    const teaching = normalizeTeachingFields(parsed.data);
    const { error: profileError } = await admin.from("kb_profiles").insert({
      auth_user_id: authData.user.id,
      full_name: parsed.data.full_name,
      login_identifier: identifier,
      role: parsed.data.role,
      ...teaching,
      public_title: parsed.data.role === "guru" ? parsed.data.public_title || null : null,
      community_position: parsed.data.role === "guru" ? parsed.data.community_position : null,
      recovery_email: parsed.data.recovery_email || null,
      recovery_email_verified: Boolean(parsed.data.recovery_email),
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

export async function PATCH(request: Request) {
  if (!(await canManageKbUsers())) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data pengguna belum lengkap atau tidak valid." }, { status: 400 });

  const identifier = normalizeLoginIdentifier(parsed.data.login_identifier);
  if (!/^\d{4,32}$/.test(identifier)) return NextResponse.json({ error: "NIP atau NIK hanya boleh berisi angka." }, { status: 400 });

  const admin = createKbAdminClient();
  const { data: targetProfile, error: targetLookupError } = await admin.from("kb_profiles").select("id, role").eq("id", parsed.data.id).maybeSingle();
  if (targetLookupError) return NextResponse.json({ error: communityDatabaseError(targetLookupError) }, { status: 503 });
  if (!targetProfile) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
  if (targetProfile.role === "super_admin") return NextResponse.json({ error: "Akun Super Admin tidak dapat diedit dari menu ini." }, { status: 403 });

  const { data: existing, error: lookupError } = await admin.from("kb_profiles").select("id").eq("login_identifier", identifier).neq("id", parsed.data.id).maybeSingle();
  if (lookupError) return NextResponse.json({ error: communityDatabaseError(lookupError) }, { status: 503 });
  if (existing) return NextResponse.json({ error: "NIP atau NIK sudah terdaftar." }, { status: 409 });

  const teaching = normalizeTeachingFields(parsed.data);
  const patchPayload: Record<string, unknown> = {
    full_name: parsed.data.full_name,
    login_identifier: identifier,
    role: parsed.data.role,
    ...teaching,
    public_title: parsed.data.role === "guru" ? parsed.data.public_title || null : null,
    community_position: parsed.data.role === "guru" ? parsed.data.community_position || "anggota" : null,
    is_active: parsed.data.is_active,
    is_public: parsed.data.is_public,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.recovery_email !== undefined) {
    patchPayload.recovery_email = parsed.data.recovery_email || null;
    patchPayload.recovery_email_verified = Boolean(parsed.data.recovery_email);
  }
  const { error } = await admin.from("kb_profiles").update(patchPayload).eq("id", parsed.data.id);

  if (error) return NextResponse.json({ error: communityDatabaseError(error) }, { status: error.code === "PGRST205" || error.code === "42P01" || error.code === "42703" ? 503 : 500 });
  return NextResponse.json({ ok: true });
}
