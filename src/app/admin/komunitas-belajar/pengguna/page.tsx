import type { Metadata } from "next";
import { UserManagement } from "@/components/community/user-management";

export const metadata: Metadata = { title: "Pengguna Komunitas Belajar" };

export default function AdminCommunityUsersPage() {
  return <div className="space-y-8"><div><p className="section-kicker text-[#6048e8]/75">Komunitas Belajar Guru</p><h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">Kelola akses komunitas.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/55">Buat akun Kepala Sekolah, Pengawas Dabin, dan Guru yang dapat masuk menggunakan NIP atau NIK. Password awal wajib diganti saat login pertama.</p></div><UserManagement initialUsers={[]} /></div>;
}
