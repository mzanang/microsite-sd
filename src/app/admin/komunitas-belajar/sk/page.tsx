import type { Metadata } from "next";
import { SkManagement } from "@/components/community/sk-management";

export const metadata: Metadata = { title: "SK Komunitas Belajar" };

export default function AdminCommunitySkPage() {
  return <div className="space-y-8"><div><p className="section-kicker text-[#6048e8]/75">Komunitas Belajar Guru</p><h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">Kelola SK Kombel.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/55">Admin dapat menambah, mengubah, mempublikasikan, dan menghapus dokumen SK. Dokumen yang dipublikasikan dapat dibaca pengunjung tanpa login.</p></div><SkManagement /></div>;
}
