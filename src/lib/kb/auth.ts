import "server-only";

import { cache } from "react";
import { randomInt } from "node:crypto";
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
  teaching_subject: string | null;
  teaching_grade: number | null;
  teaching_grades: number[];
  public_title: string | null;
  community_position: "ketua" | "anggota" | null;
  is_active: boolean;
  is_public: boolean;
  must_change_password: boolean;
  recovery_email?: string | null;
  recovery_email_verified?: boolean;
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

export function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const required = ["A", "a", "7", "!"];
  const password = [...required, ...Array.from({ length: 12 }, () => alphabet[randomInt(alphabet.length)])];
  for (let index = password.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [password[index], password[swapIndex]] = [password[swapIndex], password[index]];
  }
  return password.join("");
}

export const getCurrentKbProfile = cache(async (): Promise<KbProfile | null> => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data } = await supabase
    .from("kb_profiles")
    .select("id, auth_user_id, full_name, login_identifier, role, teacher_type, teaching_subject, teaching_grade, teaching_grades, public_title, community_position, is_active, is_public, must_change_password, recovery_email, recovery_email_verified")
    .eq("auth_user_id", userData.user.id)
    .eq("is_active", true)
    .maybeSingle();
  return (data as KbProfile | null) ?? null;
});

export function getKbDashboardPath(profile: Pick<KbProfile, "role" | "community_position">) {
  if (profile.role === "super_admin") return "/admin/dashboard";
  if (profile.role === "guru" && profile.community_position === "ketua") return "/komunitas-belajar/ketua/dashboard";
  if (profile.role === "guru") return "/komunitas-belajar/anggota/dashboard";
  if (profile.role === "kepala_sekolah") return "/komunitas-belajar/ks/dashboard";
  return "/komunitas-belajar/pengawas/dashboard";
}

export const canManageKbUsers = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;
  try {
    const admin = createKbAdminClient();
    const [{ data: kbProfile }, { data: adminProfile }] = await Promise.all([
      admin.from("kb_profiles").select("role, is_active").eq("auth_user_id", userData.user.id).maybeSingle(),
      admin.from("admin_profiles").select("id").eq("user_id", userData.user.id).eq("is_active", true).maybeSingle(),
    ]);
    return Boolean((kbProfile?.role === "super_admin" && kbProfile.is_active) || adminProfile);
  } catch {
    return false;
  }
});

export async function canManageKbCommunityDocuments() {
  const kbProfile = await getCurrentKbProfile();
  if (kbProfile?.role === "super_admin" || (kbProfile?.role === "guru" && kbProfile.community_position === "ketua")) return true;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;
  try {
    const admin = createKbAdminClient();
    const { data: adminProfile } = await admin.from("admin_profiles").select("id").eq("user_id", userData.user.id).eq("is_active", true).maybeSingle();
    return Boolean(adminProfile);
  } catch {
    return false;
  }
}
