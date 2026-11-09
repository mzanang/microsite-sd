import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentKbProfile } from "@/lib/kb/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard Komunitas Belajar" };
export const dynamic = "force-dynamic";

const roleLabels = {
  super_admin: "Super Admin",
  kepala_sekolah: "Kepala Sekolah",
  guru: "Guru",
  pengawas_dabin: "Pengawas Dabin",
} as const;

export default async function CommunityDashboardPage() {
  const profile = await getCurrentKbProfile();
  if (!profile) redirect("/komunitas-belajar/login");
  if (profile.must_change_password) redirect("/komunitas-belajar/ganti-password");

  const supabase = await createClient();
  const [{ count: requirementCount }, { count: teacherCount }, { count: submissionCount }] = await Promise.all([
    supabase.from("kb_document_requirements").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("kb_profiles").select("id", { count: "exact", head: true }).eq("role", "guru").eq("is_active", true),
    profile.role === "guru"
      ? supabase.from("kb_submissions").select("id", { count: "exact", head: true }).eq("teacher_profile_id", profile.id)
      : supabase.from("kb_submissions").select("id", { count: "exact", head: true }),
  ]);

  return <main className="min-h-screen bg-[#f4f8ff] text-[#173253]"><header className="border-b border-[#dbe7f5] bg-white"><div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8"><Link href="/komunitas-belajar" className="flex items-center gap-3"><Image src="/logo.png" alt="" width={40} height={40} className="h-10 w-10 object-contain" /><span><span className="block text-sm font-extrabold text-[#153d70]">Komunitas Belajar Guru</span><span className="block text-xs text-[#6683a6]">SD Negeri Dukuhwaru 01</span></span></Link><div className="flex items-center gap-2">{profile.role === "super_admin" && <Link href="/komunitas-belajar/pengguna" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-[#1264c5] hover:bg-[#edf4ff]">Manajemen pengguna</Link>}<form action="/api/komunitas-belajar/auth/logout" method="post"><button type="submit" className="min-h-11 rounded-xl border border-[#bfd2e8] px-4 text-sm font-bold text-[#34577f] hover:border-[#1970d2] hover:text-[#1970d2]">Keluar</button></form></div></div></header><div className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">Dashboard</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight">Selamat datang, {profile.full_name}</h1><p className="mt-3 text-sm leading-6 text-[#6683a6]">Peran aktif: {roleLabels[profile.role]}.</p><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Stat label="Persyaratan aktif" value={requirementCount ?? 0} /><Stat label="Guru aktif" value={teacherCount ?? 0} /><Stat label={profile.role === "guru" ? "Pengumpulan saya" : "Total pengumpulan"} value={submissionCount ?? 0} /></div><section className="mt-8 rounded-2xl border border-[#dbe7f5] bg-white p-6 sm:p-8"><h2 className="text-xl font-extrabold text-[#173f70]">Modul operasional berikutnya</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-[#557291]">Struktur database, session, dan halaman dashboard dasar sudah tersedia. Modul manajemen persyaratan, pengumpulan dokumen, pemeriksaan, dan laporan akan dihubungkan pada tahap berikutnya.</p></section></div></main>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-[#dbe7f5] bg-white p-5 shadow-[0_10px_25px_rgba(23,83,158,.05)]"><p className="text-sm font-semibold text-[#6683a6]">{label}</p><p className="mt-3 text-3xl font-extrabold text-[#173f70]">{value}</p></div>;
}
