import { NextResponse } from "next/server";
import { z } from "zod";
import { createKbAdminClient, normalizeLoginIdentifier } from "@/lib/kb/auth";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  login_identifier: z.string().trim().regex(/^\d{4,32}$/, "NIP/NIK harus berisi angka.").max(32),
  password: z.string().min(1).max(256),
});

const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function allowedToTry(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (current.count >= 8) return false;
  current.count += 1;
  return true;
}

export async function POST(request: Request) {
  const key = clientKey(request);
  if (!allowedToTry(key)) return NextResponse.json({ error: "Percobaan login terlalu banyak. Coba lagi nanti." }, { status: 429 });

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "NIP/NIK atau kata sandi tidak valid." }, { status: 400 });

  try {
    const admin = createKbAdminClient();
    const identifier = normalizeLoginIdentifier(parsed.data.login_identifier);
    const { data: profile } = await admin.from("kb_profiles").select("auth_user_id, role, community_position, must_change_password, is_active").eq("login_identifier", identifier).eq("is_active", true).maybeSingle();
    if (!profile?.auth_user_id) return NextResponse.json({ error: "NIP/NIK atau kata sandi tidak cocok." }, { status: 401 });

    const { data: authData } = await admin.auth.admin.getUserById(profile.auth_user_id);
    const email = authData.user?.email;
    if (!email) return NextResponse.json({ error: "NIP/NIK atau kata sandi tidak cocok." }, { status: 401 });

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
    if (error) return NextResponse.json({ error: "NIP/NIK atau kata sandi tidak cocok." }, { status: 401 });

    attempts.delete(key);
    return NextResponse.json({ ok: true, role: profile.role, community_position: profile.community_position, must_change_password: profile.must_change_password });
  } catch {
    return NextResponse.json({ error: "Login komunitas belajar belum tersedia." }, { status: 503 });
  }
}
