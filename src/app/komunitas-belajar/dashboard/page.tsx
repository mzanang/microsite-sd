import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentKbProfile } from "@/lib/kb/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard Komunitas Belajar" };
export const dynamic = "force-dynamic";

const roleLabels = { super_admin: "Super Admin", kepala_sekolah: "Kepala Sekolah", guru: "Guru", pengawas_dabin: "Pengawas Dabin" } as const;

export default async function CommunityDashboardPage() {
  const profile = await getCurrentKbProfile();
  if (!profile) redirect("/komunitas-belajar/login");
  if (profile.must_change_password) redirect("/komunitas-belajar/ganti-password");
  const supabase = await createClient();
  const isReviewer = profile.role === "kepala_sekolah" || profile.role === "pengawas_dabin";
  const reviewScope = isReviewer ? supabase.from("kb_reviews").select("id", { count: "exact", head: true }).eq("reviewer_role", profile.role) : null;
  const [requirements, teachers, submissions, complete, revisions, pending] = await Promise.all([
    supabase.from("kb_document_requirements").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("kb_profiles").select("id", { count: "exact", head: true }).eq("role", "guru").eq("is_active", true),
    profile.role === "guru" ? supabase.from("kb_submissions").select("id", { count: "exact", head: true }).eq("teacher_profile_id", profile.id) : supabase.from("kb_submissions").select("id", { count: "exact", head: true }),
    (reviewScope ? reviewScope.eq("status", "lengkap") : supabase.from("kb_submissions").select("id", { count: "exact", head: true }).eq("status", "lengkap")),
    (reviewScope ? reviewScope.eq("status", "perlu_perbaikan") : supabase.from("kb_submissions").select("id", { count: "exact", head: true }).eq("status", "perlu_perbaikan")),
    (reviewScope ? reviewScope.eq("status", "menunggu_pemeriksaan") : supabase.from("kb_submissions").select("id", { count: "exact", head: true }).eq("status", "menunggu_pemeriksaan")),
  ]);
  return <main className="min-h-screen bg-[#f4f8ff] text-[#173253]"><header className="border-b border-[#dbe7f5] bg-white"><div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8"><Link href="/komunitas-belajar" className="flex items-center gap-3"><Image src="/logo.png" alt="" width={40} height={40} className="h-10 w-10 object-contain" /><span><span className="block text-sm font-extrabold text-[#153d70]">Komunitas Belajar Guru</span><span className="block text-xs text-[#6683a6]">SD Negeri Dukuhwaru 01</span></span></Link><div className="flex items-center gap-2">{profile.role === "super_admin" && <Link href="/admin/komunitas-belajar/pengguna" className="hidden min-h-11 items-center rounded-xl px-3 text-sm font-bold text-[#1264c5] hover:bg-[#edf4ff] sm:inline-flex">Manajemen pengguna</Link>}<form action="/api/komunitas-belajar/auth/logout" method="post"><button type="submit" className="min-h-11 rounded-xl border border-[#bfd2e8] px-4 text-sm font-bold text-[#34577f] hover:border-[#1970d2] hover:text-[#1970d2]">Keluar</button></form></div></div></header><div className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">Dashboard {roleLabels[profile.role]}</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Selamat datang, {profile.full_name}</h1><p className="mt-3 text-sm leading-6 text-[#6683a6]">Pantau administrasi sesuai kewenangan akun Anda.</p><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Persyaratan aktif" value={requirements.count ?? 0} /><Stat label="Guru aktif" value={teachers.count ?? 0} /><Stat label={profile.role === "guru" ? "Pengumpulan saya" : "Total pengumpulan"} value={submissions.count ?? 0} /><Stat label="Menunggu pemeriksaan" value={pending.count ?? 0} /></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Stat label="Lengkap" value={complete.count ?? 0} /><Stat label="Perlu perbaikan" value={revisions.count ?? 0} /></div><section className="mt-8 rounded-2xl border border-[#dbe7f5] bg-white p-6 sm:p-8"><h2 className="text-xl font-extrabold text-[#173f70]">Akses kerja</h2><p className="mt-2 text-sm leading-6 text-[#6683a6]">{profile.role === "guru" ? "Kelola pengumpulan dokumen dan lihat status pemeriksaan Anda." : isReviewer ? "Periksa pengumpulan guru dan berikan catatan sesuai peran pemeriksa Anda." : "Kelola akun pengguna melalui ruang kerja admin microsite."}</p><div className="mt-5 flex flex-wrap gap-3">{profile.role === "guru" && <Link href="/komunitas-belajar/administrasi" className="inline-flex min-h-11 items-center rounded-xl bg-[#0b5fc3] px-4 text-sm font-bold text-white">Buka administrasi saya</Link>}{isReviewer && <Link href="/komunitas-belajar/monitoring" className="inline-flex min-h-11 items-center rounded-xl bg-[#0b5fc3] px-4 text-sm font-bold text-white">Buka pemeriksaan</Link>}{profile.role === "super_admin" && <Link href="/admin/komunitas-belajar/pengguna" className="inline-flex min-h-11 items-center rounded-xl bg-[#0b5fc3] px-4 text-sm font-bold text-white">Kelola pengguna</Link>}</div></section></div></main>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-[#dbe7f5] bg-white p-5 shadow-[0_10px_25px_rgba(23,83,158,.05)]"><p className="text-sm font-semibold text-[#6683a6]">{label}</p><p className="mt-3 text-3xl font-extrabold text-[#173f70]">{value}</p></div>; }
