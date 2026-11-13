import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CommunityWorkspaceLoader } from "@/components/community/role-dashboard";
import { getCurrentKbProfile, getKbDashboardPath } from "@/lib/kb/auth";
import { getPublicCommunityDocuments } from "@/lib/community-data";
import { getRoleDashboardData, getRoleWorkspaceData, type DashboardView } from "@/lib/kb/dashboard-data";

const menuDefinitions: Record<string, { title: string; permissionKey: string }> = {
  upload_sk: { title: "Upload SK Kombel", permissionKey: "upload_sk" },
  materi: { title: "Materi Kegiatan", permissionKey: "materi" },
  dokumentasi: { title: "Dokumentasi", permissionKey: "dokumentasi" },
  praktik_baik: { title: "Praktik Baik", permissionKey: "praktik_baik" },
  forum: { title: "Forum Diskusi", permissionKey: "forum" },
  memberikan_tugas: { title: "Buat Tugas Kombel", permissionKey: "memberikan_tugas" },
  upload_tugas: { title: "Upload Tugas", permissionKey: "upload_tugas" },
  tugas_kombel: { title: "Tugas Kombel", permissionKey: "upload_tugas" },
  tugas: { title: "Tugas Kombel", permissionKey: "upload_tugas" },
  pengumpulan_anggota: { title: "Tugas Masuk", permissionKey: "upload_tugas" },
  daftar_hadir: { title: "Daftar Hadir", permissionKey: "daftar_hadir" },
  monitoring: { title: "Monitoring Anggota", permissionKey: "monitoring" },
  verifikasi: { title: "Verifikasi Tugas", permissionKey: "verifikasi" },
  grafik: { title: "Grafik dan Statistik", permissionKey: "grafik" },
  laporan_kegiatan: { title: "Laporan Kegiatan", permissionKey: "monitoring" },
  jadwal_kegiatan: { title: "Jadwal Kegiatan", permissionKey: "daftar_hadir" },
  profil: { title: "Profil Saya", permissionKey: "profil" },
};

type PageProps = { params: Promise<{ menu: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { menu } = await params;
  return { title: menuDefinitions[menu]?.title ?? "Menu Komunitas Belajar" };
}

export const dynamic = "force-dynamic";

export default async function CommunityWorkspacePage({ params }: PageProps) {
  const { menu } = await params;
  const definition = menuDefinitions[menu];
  if (!definition) notFound();

  const profile = await getCurrentKbProfile();
  if (!profile) redirect("/komunitas-belajar/login");
  if (profile.must_change_password) redirect("/komunitas-belajar/ganti-password");
  if (profile.role === "super_admin") redirect("/admin/dashboard");

  const view = profile.role === "guru" ? (profile.community_position === "ketua" ? "ketua" : profile.community_position === "sekretaris" ? "sekretaris" : "anggota") : profile.role === "kepala_sekolah" ? "ks" : "pengawas";
  const needsFullDashboardData = menu === "grafik" || menu === "laporan_kegiatan";
  const data = needsFullDashboardData ? await getRoleDashboardData(profile, view as DashboardView) : await getRoleWorkspaceData(profile, view as DashboardView);
  const permission = data.permissions.find((item) => item.menu_key === definition.permissionKey);
  if (!permission) redirect(getKbDashboardPath(profile));

  const documents = definition.permissionKey === "upload_sk" ? await getPublicCommunityDocuments() : [];
  const pageTitle = menu === "verifikasi" && profile.role === "pengawas_dabin" ? "Monitoring Tugas" : definition.title;
  const accessLevel = profile.role === "pengawas_dabin" && menu === "verifikasi" ? "lihat" : permission.access_level;
  return (
    <CommunityWorkspaceLoader
      profile={profile}
      view={view as DashboardView}
      menu={menu}
      accessLevel={accessLevel}
      data={data}
      documents={documents}
    />
  );
}
