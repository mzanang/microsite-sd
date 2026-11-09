import "server-only";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type KbRole = "super_admin" | "kepala_sekolah" | "guru" | "pengawas_dabin";

export type KbProfile = {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  login_identifier: string | null;
  role: KbRole;
  teacher_type: string | null;
  public_title: string | null;
  is_active: boolean;
  is_public: boolean;
  must_change_password: boolean;
};

export function normalizeLoginIdentifier(value: string) {
  return value.trim().replace(/[\s-]/g, "").toUpperCase();
}

export function createKbAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("KB server authentication is not configured.");
  return createSupabaseAdminClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function getCurrentKbProfile(): Promise<KbProfile | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data } = await supabase.from("kb_profiles").select("id, auth_user_id, full_name, login_identifier, role, teacher_type, public_title, is_active, is_public, must_change_password").eq("auth_user_id", userData.user.id).eq("is_active", true).maybeSingle();
  return (data as KbProfile | null) ?? null;
}
