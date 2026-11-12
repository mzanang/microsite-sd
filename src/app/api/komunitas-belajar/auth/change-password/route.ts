import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createKbAdminClient } from "@/lib/kb/auth";
import { createClient } from "@/lib/supabase/server";

const changePasswordSchema = z.object({
  current_password: z.string().max(256).optional(),
  password: z.string().min(8, "Password baru minimal 8 karakter.").max(128, "Password terlalu panjang."),
  confirmation: z.string().min(8, "Konfirmasi password minimal 8 karakter.").max(128),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message || "Input tidak valid.";
    return NextResponse.json({ error: firstIssue }, { status: 400 });
  }

  const { current_password, password, confirmation } = parsed.data;

  if (password !== confirmation) {
    return NextResponse.json({ error: "Konfirmasi password baru tidak sama." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Sesi tidak ditemukan atau telah berakhir. Silakan login kembali." }, { status: 401 });
  }

  const admin = createKbAdminClient();
  const { data: profile } = await admin
    .from("kb_profiles")
    .select("id, must_change_password, login_identifier, role, community_position")
    .eq("auth_user_id", userData.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profil akun tidak ditemukan atau dinonaktifkan." }, { status: 403 });
  }

  // Verify current password only if provided
  if (current_password) {
    if (current_password === password) {
      return NextResponse.json({ error: "Password baru tidak boleh sama dengan password lama." }, { status: 400 });
    }

    // Verify current password by signing in with temporary supabase client
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (url && anonKey) {
      const testClient = createSupabaseClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const userEmail = userData.user.email;
      if (userEmail) {
        const { error: verifyError } = await testClient.auth.signInWithPassword({
          email: userEmail,
          password: current_password,
        });

        if (verifyError) {
          return NextResponse.json({ error: "Password saat ini salah. Pastikan Anda memasukkan password yang benar." }, { status: 400 });
        }
      }
    }
  }

  // Update password via Supabase Auth
  const { error: authError } = await supabase.auth.updateUser({ password });
  if (authError) {
    return NextResponse.json({ error: "Password gagal diperbarui. Pastikan memenuhi kriteria keamanan." }, { status: 400 });
  }

  // Update must_change_password status in kb_profiles to false
  try {
    const { error: profileError } = await admin
      .from("kb_profiles")
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq("auth_user_id", userData.user.id)
      .eq("is_active", true);

    if (profileError) {
      return NextResponse.json({ error: "Password berubah, tetapi pembaruan status akun tertunda. Silakan refresh." }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Password berubah, tetapi pembaruan status akun tertunda." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    role: profile.role,
    community_position: profile.community_position,
    message: "Password berhasil diperbarui.",
  });
}
