import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoleDashboard } from "@/components/community/role-dashboard";
import { getCurrentKbProfile, getKbDashboardPath } from "@/lib/kb/auth";
import { getRoleDashboardData } from "@/lib/kb/dashboard-data";

export const metadata: Metadata = { title: "Dashboard Sekretaris Kombel" };
export const dynamic = "force-dynamic";

export default async function SekretarisDashboardPage() {
  const profile = await getCurrentKbProfile();
  if (!profile) redirect("/komunitas-belajar/login");
  if (profile.must_change_password) redirect("/komunitas-belajar/ganti-password");
  if (profile.role !== "guru" || profile.community_position !== "sekretaris") redirect(getKbDashboardPath(profile));
  const data = await getRoleDashboardData(profile, "sekretaris");
  return <RoleDashboard profile={profile} view="sekretaris" data={data} />;
}
