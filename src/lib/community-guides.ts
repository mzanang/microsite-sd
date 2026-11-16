export type GuideRole = "ketua_sekretaris" | "kepala_sekolah" | "guru" | "pengawas_dabin";

export interface GuideRoleMeta {
  key: GuideRole;
  label: string;
  shortLabel: string;
  badge: string;
  description: string;
  badgeColor: string;
}

export const GUIDE_ROLES: GuideRoleMeta[] = [
  {
    key: "ketua_sekretaris",
    label: "Ketua / Sekretaris",
    shortLabel: "Ketua & Sekr.",
    badge: "Pengurus",
    description:
      "Panduan lengkap pengelolaan komunitas belajar, verifikasi berkas materi kegiatan, penugasan, dan manajemen anggota.",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    key: "kepala_sekolah",
    label: "Kepala Sekolah",
    shortLabel: "Kepala Sekolah",
    badge: "Pimpinan",
    description:
      "Panduan pemantauan keterlaksanaan kombel, pemeriksaan dan review penugasan guru, serta laporan evaluasi berkala.",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    key: "guru",
    label: "Guru",
    shortLabel: "Guru / Pendidik",
    badge: "Pendidik",
    description:
      "Panduan akses login, presensi kehadiran pertemuan, pengunggahan tugas mandiri, serta partisipasi forum diskusi.",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    key: "pengawas_dabin",
    label: "Pengawas Dabin",
    shortLabel: "Pengawas Dabin",
    badge: "Pengawas",
    description:
      "Panduan pemantauan kegiatan kombel sekolah binaan, monitoring pengumpulan tugas guru, dan pemberian catatan pembinaan.",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
];

export interface KbGuideItem {
  id: string;
  role: GuideRole;
  title: string;
  description: string;
  original_name: string;
  file_url: string;
  storage_path?: string;
  file_size: number; // in bytes, max 1048576 (1 MB)
  created_at: string;
  updated_at: string;
}

export const MAX_GUIDE_FILE_SIZE = 1024 * 1024; // 1 MB (1,048,576 bytes)

export function formatGuideFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getRoleMeta(role: GuideRole): GuideRoleMeta {
  return GUIDE_ROLES.find((r) => r.key === role) ?? GUIDE_ROLES[2];
}

