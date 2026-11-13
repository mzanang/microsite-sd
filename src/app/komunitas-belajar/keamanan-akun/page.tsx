import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoleDashboardShell } from "@/components/community/role-dashboard";
import { AccountSecurityView } from "@/components/community/account-security";
import { getCurrentKbProfile } from "@/lib/kb/auth";
import { getRoleWorkspaceData, type DashboardView } from "@/lib/kb/dashboard-data";

export const metadata: Metadata = { title: "Keamanan Akun - Komunitas Belajar" };
export const dynamic = "force-dynamic";

export default async function KeamananAkunPage() {
  const profile = await getCurrentKbProfile();
  if (!profile) redirect("/komunitas-belajar/login");
  if (profile.must_change_password) redirect("/komunitas-belajar/ganti-password");
  if (profile.role === "super_admin") redirect("/admin/dashboard");

  const view = (profile.role === "guru"
    ? profile.community_position === "ketua"
      ? "ketua"
      : profile.community_position === "sekretaris"
      ? "sekretaris"
      : "anggota"
    : profile.role === "kepala_sekolah"
    ? "ks"
    : "pengawas") as DashboardView;

  const data = await getRoleWorkspaceData(profile, view);

  return (
    <RoleDashboardShell
      profile={profile}
      view={view}
      data={data}
      pageTitle="Keamanan Akun"
      pageDescription="Kelola informasi akun dan kata sandi Anda"
    >
      <div className="mx-auto max-w-3xl">
        <AccountSecurityView profile={profile} />
      </div>
    </RoleDashboardShell>
  );
}

