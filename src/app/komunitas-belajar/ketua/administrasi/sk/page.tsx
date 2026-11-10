import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleDashboardShell } from "@/components/community/role-dashboard";
import { SkManagement } from "@/components/community/sk-management";
import { getCurrentKbProfile, getKbDashboardPath } from "@/lib/kb/auth";
import { getRoleDashboardData } from "@/lib/kb/dashboard-data";

export const metadata: Metadata = { title: "Upload SK Kombel" };
export const dynamic = "force-dynamic";

export default async function KetuaSkPage() {
  const profile = await getCurrentKbProfile();
  if (!profile) redirect("/komunitas-belajar/login");
  if (profile.must_change_password) redirect("/komunitas-belajar/ganti-password");
  if (profile.role !== "guru" || profile.community_position !== "ketua") redirect(getKbDashboardPath(profile));
  const data = await getRoleDashboardData(profile, "ketua");
  return <RoleDashboardShell profile={profile} view="ketua" data={data}><div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">Administrasi Komunitas</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#173f70]">Upload SK Kombel</h2><p className="mt-2 text-sm leading-6 text-[#6683a6]">Kelola dokumen SK komunitas sesuai kewenangan Ketua Kombel.</p></div><Link href="/komunitas-belajar/ketua/dashboard" className="inline-flex min-h-11 items-center rounded-xl border border-[#bfd2e8] px-4 text-sm font-bold text-[#34577f] hover:border-[#1970d2] hover:text-[#1264c5]">Kembali ke dashboard</Link></div><SkManagement /></div></RoleDashboardShell>;
}
