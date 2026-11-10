import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoleDashboard } from "@/components/community/role-dashboard";
import { getCurrentKbProfile, getKbDashboardPath } from "@/lib/kb/auth";
import { getRoleDashboardData } from "@/lib/kb/dashboard-data";

export const metadata: Metadata = { title: "Dashboard Kepala Sekolah" };
export const dynamic = "force-dynamic";

export default async function KepalaSekolahDashboardPage() {
  const profile = await getCurrentKbProfile();
  if (!profile) redirect("/komunitas-belajar/login");
  if (profile.must_change_password) redirect("/komunitas-belajar/ganti-password");
  if (profile.role !== "kepala_sekolah") redirect(getKbDashboardPath(profile));
  const data = await getRoleDashboardData(profile, "ks");
  return <RoleDashboard profile={profile} view="ks" data={data} />;
}
