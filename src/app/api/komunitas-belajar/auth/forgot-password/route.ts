import { NextResponse } from "next/server";
import { z } from "zod";
import { createKbAdminClient, normalizeLoginIdentifier } from "@/lib/kb/auth";

const forgotPasswordSchema = z.object({
  login_identifier: z.string().trim().regex(/^\d{4,32}$/, "NIP/NIK harus berupa angka."),
});

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan pemulihan. Silakan coba lagi dalam 15 menit." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "NIP atau NIK tidak valid." }, { status: 400 });
  }

  const identifier = normalizeLoginIdentifier(parsed.data.login_identifier);

  try {
    const admin = createKbAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("kb_profiles")
      .select("id, full_name, auth_user_id, recovery_email, recovery_email_verified, is_active")
      .eq("login_identifier", identifier)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: "Terjadi gangguan saat memproses akun. Silakan coba lagi." }, { status: 500 });
    }

    if (!profile || !profile.is_active || !profile.auth_user_id) {
      return NextResponse.json({
        ok: false,
        has_recovery_email: false,
        error: "Akun dengan NIP/NIK tersebut tidak ditemukan atau tidak aktif. Silakan hubungi Super Admin untuk bantuan.",
      }, { status: 404 });
    }

    // Check if recovery email exists and is valid
    const recoveryEmail = profile.recovery_email?.trim();
    if (!recoveryEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) {
      return NextResponse.json({
        ok: false,
        has_recovery_email: false,
        error: "Akun ini belum memiliki email pemulihan yang terdaftar. Silakan hubungi Super Admin untuk memperbarui data pemulihan akun Anda atau mereset password.",
      }, { status: 400 });
    }

    // Sync auth.users email to recovery email so Supabase Auth recovery email delivers properly
    const { data: authUserData } = await admin.auth.admin.getUserById(profile.auth_user_id);
    if (authUserData.user?.email !== recoveryEmail) {
      await admin.auth.admin.updateUserById(profile.auth_user_id, {
        email: recoveryEmail,
        email_confirm: true,
      });
    }

    // Determine redirect URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || "http://localhost:3000";
    const redirectTo = `${siteUrl.replace(/\/$/, "")}/komunitas-belajar/reset-password`;

    // Send recovery email via Supabase Auth
    const { error: resetError } = await admin.auth.resetPasswordForEmail(recoveryEmail, {
      redirectTo,
    });

    if (resetError) {
      console.error("Supabase resetPasswordForEmail error:", resetError);
      return NextResponse.json({
        error: "Gagal mengirimkan tautan pemulihan ke email. Silakan hubungi Super Admin.",
      }, { status: 500 });
    }

    // Secure response: Never expose email address or NIP/NIK mapping in public response
    return NextResponse.json({
      ok: true,
      has_recovery_email: true,
      message: "Tautan pemulihan kata sandi telah dikirimkan ke email pemulihan yang terdaftar pada akun Anda. Silakan periksa kotak masuk atau spam email Anda.",
    });
  } catch (err) {
    console.error("Unexpected error in forgot-password:", err);
    return NextResponse.json({
      error: "Layanan pemulihan kata sandi sedang tidak dapat diakses. Silakan hubungi Super Admin.",
    }, { status: 503 });
  }
}

