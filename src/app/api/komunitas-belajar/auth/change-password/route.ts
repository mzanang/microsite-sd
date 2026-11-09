import { NextResponse } from "next/server";
import { z } from "zod";
import { createKbAdminClient } from "@/lib/kb/auth";
import { createClient } from "@/lib/supabase/server";

const changePasswordSchema = z.object({ password: z.string().min(8).max(128), confirmation: z.string().min(8).max(128) });

export async function POST(request: Request) {
  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Password baru minimal 8 karakter." }, { status: 400 });
  if (parsed.data.password !== parsed.data.confirmation) return NextResponse.json({ error: "Konfirmasi password tidak sama." }, { status: 400 });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });

  const { error: authError } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (authError) return NextResponse.json({ error: "Password gagal diperbarui." }, { status: 400 });
  try {
    const admin = createKbAdminClient();
    const { error: profileError } = await admin.from("kb_profiles").update({ must_change_password: false, updated_at: new Date().toISOString() }).eq("auth_user_id", userData.user.id).eq("is_active", true);
    if (profileError) return NextResponse.json({ error: "Password berubah, tetapi status akun belum diperbarui. Hubungi admin." }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Password berubah, tetapi status akun belum diperbarui. Hubungi admin." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
