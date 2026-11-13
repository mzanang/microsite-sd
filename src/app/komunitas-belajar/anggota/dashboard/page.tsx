import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoleDashboard } from "@/components/community/role-dashboard";
import { getCurrentKbProfile, getKbDashboardPath } from "@/lib/kb/auth";
import { getRoleDashboardData } from "@/lib/kb/dashboard-data";

export const metadata: Metadata = { title: "Dashboard Anggota Kombel" };
export const dynamic = "force-dynamic";

export default async function AnggotaDashboardPage() {
  const profile = await getCurrentKbProfile();
  if (!profile) redirect("/komunitas-belajar/login");
  if (profile.must_change_password) redirect("/komunitas-belajar/ganti-password");
  if (profile.role !== "guru" || ["ketua", "sekretaris"].includes(profile.community_position ?? "")) redirect(getKbDashboardPath(profile));
  const data = await getRoleDashboardData(profile, "anggota");
  return <RoleDashboard profile={profile} view="anggota" data={data} />;
}
