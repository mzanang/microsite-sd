import type { Metadata } from "next";
import { CommunityGuidesManager } from "@/components/admin/community-guides-manager";

export const metadata: Metadata = {
  title: "Panduan Pengguna Komunitas Belajar",
};

export default function AdminCommunityGuidesPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="section-kicker text-[#6048e8]/75">Komunitas Belajar Guru</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">
          Kelola File Panduan Login & Peran.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/55">
          Super Admin dapat mengunggah dan mengelola dokumen panduan PDF (maks. 1 MB) untuk 4 peran:
          Ketua/Sekretaris, Kepala Sekolah, Guru, dan Pengawas Dabin. Dokumen ini disematkan langsung
          pada panel modal login publik.
        </p>
      </div>

      <CommunityGuidesManager />
    </div>
  );
}

