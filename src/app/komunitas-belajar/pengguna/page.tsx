import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserManagement } from "@/components/community/user-management";
import { getCurrentKbProfile } from "@/lib/kb/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Manajemen Pengguna Komunitas Belajar" };
export const dynamic = "force-dynamic";

export default async function CommunityUsersPage() {
  const profile = await getCurrentKbProfile();
  if (!profile) redirect("/komunitas-belajar/login");
  if (profile.role !== "super_admin") redirect("/komunitas-belajar/dashboard");

  const supabase = await createClient();
  const { data } = await supabase.from("kb_profiles").select("id, full_name, login_identifier, role, teacher_type, teaching_subject, teaching_grade, teaching_grades, public_title, community_position, is_active, is_public, must_change_password, created_at").order("full_name", { ascending: true });

  return <main className="min-h-screen bg-[#f4f8ff] text-[#173253]"><header className="border-b border-[#dbe7f5] bg-white"><div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8"><Link href="/komunitas-belajar/dashboard" className="flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1970d2]"><Image src="/logo.png" alt="" width={40} height={40} className="h-10 w-10 object-contain" /><span><span className="block text-sm font-extrabold text-[#153d70]">Komunitas Belajar Guru</span><span className="block text-xs text-[#6683a6]">SD Negeri Dukuhwaru 01</span></span></Link><div className="flex items-center gap-2"><Link href="/komunitas-belajar/dashboard" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-[#34577f] hover:bg-[#edf4ff]">Dashboard</Link><form action="/api/komunitas-belajar/auth/logout" method="post"><button type="submit" className="min-h-11 rounded-xl border border-[#bfd2e8] px-4 text-sm font-bold text-[#34577f] hover:border-[#1970d2] hover:text-[#1970d2]">Keluar</button></form></div></div></header><div className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">Super Admin</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight">Manajemen pengguna</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6683a6]">Buat akun Kepala Sekolah, Pengawas Dabin, dan Guru untuk masuk ke portal Komunitas Belajar menggunakan NIP atau NIK.</p><div className="mt-8"><UserManagement initialUsers={(data ?? []) as Parameters<typeof UserManagement>[0]["initialUsers"]} /></div></div></main>;
}
