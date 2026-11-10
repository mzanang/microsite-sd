import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoleDashboard } from "@/components/community/role-dashboard";
import { getCurrentKbProfile, getKbDashboardPath } from "@/lib/kb/auth";
import { getRoleDashboardData } from "@/lib/kb/dashboard-data";

export const metadata: Metadata = { title: "Dashboard Pengawas Dabin" };
export const dynamic = "force-dynamic";

export default async function PengawasDashboardPage() {
  const profile = await getCurrentKbProfile();
  if (!profile) redirect("/komunitas-belajar/login");
  if (profile.must_change_password) redirect("/komunitas-belajar/ganti-password");
  if (profile.role !== "pengawas_dabin") redirect(getKbDashboardPath(profile));
  const data = await getRoleDashboardData(profile, "pengawas");
  return <RoleDashboard profile={profile} view="pengawas" data={data} />;
}
