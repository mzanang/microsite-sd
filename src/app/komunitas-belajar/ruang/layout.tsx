import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { RoleDashboardShell } from "@/components/community/role-dashboard";
import { getCurrentKbProfile } from "@/lib/kb/auth";
import { getRoleWorkspaceData, type DashboardView } from "@/lib/kb/dashboard-data";

export default async function RuangLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentKbProfile();
  if (!profile) redirect("/komunitas-belajar/login");
  if (profile.must_change_password) redirect("/komunitas-belajar/ganti-password");
  if (profile.role === "super_admin") redirect("/admin/dashboard");

  const view =
    profile.role === "guru"
      ? profile.community_position === "ketua"
        ? "ketua"
        : "anggota"
      : profile.role === "kepala_sekolah"
      ? "ks"
      : "pengawas";

  const data = await getRoleWorkspaceData(profile, view as DashboardView);

  return (
    <RoleDashboardShell profile={profile} view={view as DashboardView} data={data}>
      {children}
    </RoleDashboardShell>
  );
}

