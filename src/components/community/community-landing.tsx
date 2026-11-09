import Image from "next/image";
import Link from "next/link";
import { BookOpen, ChevronRight, MapPin, School, UserRound, UsersRound } from "lucide-react";
import type { PublicCommunityData, PublicCommunityProfile } from "@/lib/community-data";

export function CommunityLanding({ data }: { data: PublicCommunityData }) {
  return <main className="min-h-screen overflow-x-hidden bg-[#f4f8ff] text-[#173253]">
    <header className="border-b border-[#dbe7f5] bg-white/95">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <a href="#beranda" className="flex min-w-0 items-center gap-3" aria-label="Komunitas Belajar Guru, kembali ke beranda">
          <Image src={data.school.logo_url} alt="" width={42} height={42} className="h-10 w-10 shrink-0 object-contain" unoptimized />
          <span className="min-w-0"><span className="block truncate text-sm font-extrabold tracking-tight text-[#153d70]">{data.school.name}</span><span className="block text-[10px] font-bold uppercase tracking-[.16em] text-[#6683a6]">Komunitas Belajar Guru</span></span>
        </a>
        <nav aria-label="Navigasi halaman" className="flex items-center gap-1 text-sm font-semibold text-[#557291]">
          <div className="hidden items-center gap-1 md:flex"><a href="#profil-sekolah" className="rounded-lg px-3 py-2 hover:bg-[#edf4ff] hover:text-[#155bb5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155bb5]">Profil sekolah</a>
          <a href="#kepala-sekolah" className="rounded-lg px-3 py-2 hover:bg-[#edf4ff] hover:text-[#155bb5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155bb5]">Kepala sekolah</a>
          <a href="#guru" className="rounded-lg px-3 py-2 hover:bg-[#edf4ff] hover:text-[#155bb5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155bb5]">Daftar guru</a></div>
          <Link href="/komunitas-belajar/login" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b5fc3] px-4 text-sm font-bold text-white transition hover:bg-[#084e9f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5fc3]">Masuk</Link>
        </nav>
      </div>
    </header>

    <div id="beranda" className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pt-16">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#0b5fc3] px-6 py-10 text-white shadow-[0_20px_60px_rgba(23,83,158,.18)] sm:px-12 sm:py-14">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border-[32px] border-white/10" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-[-5rem] right-24 h-40 w-40 rounded-full bg-[#4ca3f3]/25" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-[#cfe6ff]"><UsersRound size={15} aria-hidden="true" /> Portal komunitas guru</p>
          <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[1.08] tracking-[-.04em] sm:text-6xl">Komunitas Belajar Guru</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg">Ruang informasi dan kegiatan komunitas belajar guru SD Negeri Dukuhwaru 01.</p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold">
            <a href="#profil-sekolah" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-[#0b5fc3] transition hover:bg-[#edf6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Lihat profil sekolah <ChevronRight size={17} aria-hidden="true" /></a>
            <a href="#guru" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/35 px-4 text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Lihat daftar guru</a>
          </div>
        </div>
      </section>

      <section id="profil-sekolah" className="scroll-mt-6 pt-14" aria-labelledby="profil-sekolah-title">
        <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">Tentang sekolah</p><h2 id="profil-sekolah-title" className="mt-2 text-3xl font-extrabold tracking-tight text-[#173253]">Profil sekolah</h2></div><School className="hidden text-[#1970d2] sm:block" size={30} aria-hidden="true" /></div>
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <article className="rounded-2xl border border-[#dbe7f5] bg-white p-6 shadow-[0_12px_30px_rgba(23,83,158,.06)] sm:p-8"><h3 className="text-xl font-extrabold text-[#173f70]">{data.school.name}</h3><p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-7 text-[#557291]">{data.school.description}</p><div className="mt-6 flex items-start gap-3 border-t border-[#e6eef8] pt-5 text-sm leading-6 text-[#557291]"><MapPin className="mt-0.5 shrink-0 text-[#1970d2]" size={18} aria-hidden="true" /><span>{data.school.address || "Alamat sekolah belum ditambahkan."}</span></div></article>
          <article className="rounded-2xl border border-[#c9def6] bg-[#eaf4ff] p-6 sm:p-8"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1970d2] text-white"><BookOpen size={21} aria-hidden="true" /></div><h3 className="mt-5 text-xl font-extrabold text-[#173f70]">Tentang halaman ini</h3><p className="mt-3 text-sm leading-7 text-[#557291]">Halaman publik untuk mengenal profil sekolah, kepala sekolah, dan guru yang datanya diizinkan untuk ditampilkan.</p><p className="mt-5 text-xs font-semibold leading-5 text-[#6683a6]">Informasi yang belum diisi pengelola akan ditampilkan sebagai status kosong.</p></article>
        </div>
      </section>

      <section id="kepala-sekolah" className="scroll-mt-6 pt-14" aria-labelledby="kepala-sekolah-title">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">Pimpinan sekolah</p><h2 id="kepala-sekolah-title" className="mt-2 text-3xl font-extrabold tracking-tight text-[#173253]">Kepala sekolah</h2>
        <div className="mt-6 rounded-2xl border border-[#dbe7f5] bg-white p-6 shadow-[0_12px_30px_rgba(23,83,158,.06)] sm:p-8">{data.principal ? <ProfileRow profile={data.principal} principal /> : <EmptyState title="Data kepala sekolah belum ditambahkan" description="Pengelola dapat menambahkan profil kepala sekolah melalui modul manajemen komunitas belajar." />}</div>
      </section>

      <section id="guru" className="scroll-mt-6 pt-14" aria-labelledby="guru-title">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">Tenaga pendidik</p><h2 id="guru-title" className="mt-2 text-3xl font-extrabold tracking-tight text-[#173253]">Daftar guru</h2></div><p className="text-sm font-semibold text-[#6683a6]">{data.teachers.length ? `${data.teachers.length} profil publik` : "Belum ada profil publik"}</p></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.teachers.length ? data.teachers.map((teacher) => <ProfileCard key={`${teacher.name}-${teacher.teacher_type}`} profile={teacher} />) : <div className="sm:col-span-2 lg:col-span-3"><EmptyState title="Daftar guru belum ditambahkan" description="Nama dan jenis guru akan tampil setelah pengelola mengaktifkan profil publiknya." /></div>}</div>
      </section>
    </div>

    <footer className="border-t border-[#dbe7f5] bg-white"><div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-7 text-sm text-[#6683a6] sm:flex-row sm:items-center sm:justify-between sm:px-8"><span className="font-semibold">{data.school.name}</span><span>Komunitas Belajar Guru</span></div></footer>
  </main>;
}

function ProfileCard({ profile }: { profile: PublicCommunityProfile }) {
  return <article className="rounded-2xl border border-[#dbe7f5] bg-white p-5 shadow-[0_10px_25px_rgba(23,83,158,.05)]"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf4ff] text-[#1970d2]"><UserRound size={20} aria-hidden="true" /></div><h3 className="mt-5 text-base font-extrabold text-[#173f70]">{profile.name}</h3><p className="mt-1 text-sm font-semibold text-[#557291]">{profile.teacher_type}</p>{profile.title && <p className="mt-1 text-xs text-[#7890ad]">{profile.title}</p>}</article>;
}

function ProfileRow({ profile, principal }: { profile: PublicCommunityProfile; principal?: boolean }) {
  return <div className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#eaf4ff] text-[#1970d2]"><UserRound size={28} aria-hidden="true" /></div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">{principal ? profile.title || "Kepala Sekolah" : profile.teacher_type}</p><h3 className="mt-2 text-xl font-extrabold text-[#173f70]">{profile.name}</h3><p className="mt-1 text-sm text-[#557291]">Profil publik sekolah</p></div></div>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl border border-dashed border-[#b9cfe7] bg-[#f8fbff] px-5 py-7 text-center"><p className="font-bold text-[#34577f]">{title}</p><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6683a6]">{description}</p></div>;
}
