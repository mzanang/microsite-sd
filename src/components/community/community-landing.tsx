import Link from "next/link";
import {
  Camera,
  ChevronRight,
  ClipboardPenLine,
  FileText,
  Globe2,
  MapPin,
  School,
  Upload,
  UserRound,
} from "lucide-react";
import { CommunityNav } from "@/components/community/community-nav";
import { CommunityHero } from "@/components/community/community-hero";
import type { PublicCommunityData, PublicCommunityProfile } from "@/lib/community-data";
import { schoolProfileLeft, schoolProfileRight } from "@/lib/community-school-profile";

const publicCards = [
  { slug: "sk-komunitas-belajar", label: "SK Komunitas Belajar", icon: Globe2 },
  { slug: "materi-kegiatan", label: "Materi Kegiatan", icon: FileText },
  { slug: "daftar-hadir-notulen", label: "Daftar Hadir dan Notulen", icon: ClipboardPenLine },
  { slug: "upload-tugas-kombel", label: "Upload Tugas Kombel", icon: Upload },
  { slug: "dokumentasi-kegiatan", label: "Dokumentasi Kegiatan", icon: Camera },
] as const;

export function CommunityLanding({ data }: { data: PublicCommunityData }) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f9fb] font-[var(--font-plus-jakarta)] text-[#191c1e]">
      <CommunityNav schoolName={data.school.name} logoUrl={data.school.logo_url} />

      <div id="beranda" className="mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
        <CommunityHero schoolName={data.school.name} />

        <div className="mx-auto max-w-6xl">

        <section className="mt-14" aria-label="Ruang publik komunitas belajar">
          <div className="space-y-4">
            {publicCards.map(({ slug, label, icon: Icon }) => (
              <Link key={slug} href={`/komunitas-belajar/${slug}`} className="group flex min-h-20 items-center gap-4 rounded-2xl border border-white/80 bg-white px-3 py-3 shadow-[0_10px_25px_rgba(43,55,75,.1)] transition hover:-translate-y-0.5 hover:border-[#b8d2ee] hover:shadow-[0_14px_30px_rgba(43,55,75,.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1264c5] sm:gap-5 sm:px-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#d4d4d6] text-[#34383e] transition group-hover:bg-[#c6dafa] group-hover:text-[#1264c5]">
                  <Icon size={25} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 text-center text-base font-extrabold text-[#34383e] sm:text-lg">{label}</span>
                <ChevronRight className="shrink-0 text-[#8492a2] transition group-hover:translate-x-1 group-hover:text-[#1264c5]" size={22} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-[#c8dcf4] bg-[#e9f3ff] p-5 sm:p-6" aria-labelledby="login-cta-title">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-[#1264c5]">Akses pengelola</p>
              <h2 id="login-cta-title" className="mt-2 text-lg font-extrabold text-[#173f70]">Masuk sebagai KS, Pengawas, atau Guru</h2>
              <p className="mt-1 text-sm leading-6 text-[#5d718a]">Gunakan NIP atau NIK yang dibuat oleh Super Admin.</p>
            </div>
            <Link href="/komunitas-belajar/login" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1264c5] px-4 text-sm font-bold text-white transition hover:bg-[#0d4e9b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1264c5]">
              Masuk ke portal <ChevronRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section id="profil-sekolah" className="scroll-mt-6 pt-14" aria-labelledby="school-profile-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1264c5]">Tentang sekolah</p>
              <h2 id="school-profile-title" className="mt-2 text-2xl font-extrabold tracking-tight text-[#173253]">Profil Sekolah</h2>
            </div>
            <School className="text-[#ff6b2d]" size={28} aria-hidden="true" />
          </div>
          <article className="mt-5 rounded-2xl border border-white/80 bg-white p-5 shadow-[0_10px_25px_rgba(43,55,75,.08)] sm:p-6">
            <div className="grid gap-5 lg:grid-cols-2">
              <SchoolProfileTable fields={schoolProfileLeft.map((field) => field.label === "Nama Sekolah" ? { ...field, value: data.school.name } : field)} />
              <SchoolProfileTable fields={schoolProfileRight.map((field) => field.label === "Kepala Sekolah" && data.principal ? { ...field, value: data.principal.name } : field)} />
            </div>
            <div className="mt-5 flex items-start gap-3 border-t border-[#e3eaf2] pt-5 text-sm leading-6 text-[#5d718a]"><MapPin className="mt-0.5 shrink-0 text-[#1264c5]" size={18} aria-hidden="true" /><span>{data.school.address || "Alamat sekolah belum ditambahkan."}</span></div>
          </article>
        </section>

        <section id="kepala-sekolah" className="scroll-mt-6 pt-12" aria-labelledby="principal-title">
          <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#1264c5]">Pimpinan sekolah</p><h2 id="principal-title" className="mt-2 text-2xl font-extrabold tracking-tight text-[#173253]">Kepala sekolah</h2></div><UserRound className="text-[#1264c5]" size={27} aria-hidden="true" /></div>
          <div className="mt-5 rounded-2xl border border-white/80 bg-white p-6 shadow-[0_10px_25px_rgba(43,55,75,.08)] sm:p-7">{data.principal ? <ProfileRow profile={data.principal} principal /> : <EmptyState title="Data kepala sekolah belum ditambahkan" description="Profil akan tampil setelah Super Admin mengaktifkan data publiknya." />}</div>
        </section>

        <section id="guru" className="scroll-mt-6 pt-12" aria-labelledby="teachers-title">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#1264c5]">Tenaga pendidik</p><h2 id="teachers-title" className="mt-2 text-2xl font-extrabold tracking-tight text-[#173253]">Daftar guru</h2></div><p className="text-sm font-semibold text-[#71849b]">{data.teachers.length ? `${data.teachers.length} profil publik` : "Belum ada profil publik"}</p></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">{data.teachers.length ? data.teachers.map((teacher) => <ProfileCard key={`${teacher.name}-${teacher.teacher_type}`} profile={teacher} />) : <EmptyState title="Daftar guru belum ditambahkan" description="Nama dan jenis guru akan tampil setelah Super Admin mengaktifkan profil publiknya." />}</div>
        </section>
      </div>
      </div>

      <footer className="border-t border-[#e2e8f0] bg-white"><div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-7 text-sm text-[#64748b] sm:flex-row sm:items-center sm:justify-between sm:px-8"><span className="font-semibold">{data.school.name}</span><span>Komunitas Belajar Guru</span></div></footer>
    </main>
  );
}

function ProfileCard({ profile }: { profile: PublicCommunityProfile }) {
  return <article className="rounded-2xl border border-white/80 bg-white p-5 shadow-[0_10px_25px_rgba(43,55,75,.06)]"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e9f3ff] text-[#1264c5]"><UserRound size={20} aria-hidden="true" /></div><h3 className="mt-5 text-base font-extrabold text-[#173f70]">{profile.name}</h3><p className="mt-1 text-sm font-semibold text-[#5d718a]">{profile.teacher_type}</p>{profile.title && <p className="mt-1 text-xs text-[#7b8da3]">{profile.title}</p>}</article>;
}

function ProfileRow({ profile, principal }: { profile: PublicCommunityProfile; principal?: boolean }) {
  return <div className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#e9f3ff] text-[#1264c5]"><UserRound size={28} aria-hidden="true" /></div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1264c5]">{principal ? profile.title || "Kepala Sekolah" : profile.teacher_type}</p><h3 className="mt-2 text-xl font-extrabold text-[#173f70]">{profile.name}</h3><p className="mt-1 text-sm text-[#5d718a]">Profil publik sekolah</p></div></div>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl border border-dashed border-[#b8c9dc] bg-[#f8fbff] px-5 py-7 text-center sm:col-span-2"><p className="font-bold text-[#34577f]">{title}</p><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6c7f98]">{description}</p></div>;
}

function SchoolProfileTable({ fields }: { fields: { label: string; value: string }[] }) {
  return <dl className="overflow-hidden rounded-2xl border border-[#dce4ea] bg-white">{fields.map((field) => <div key={field.label} className="grid min-h-12 grid-cols-[minmax(8.5rem,.9fr)_1.1fr] border-b border-[#e6ebef] last:border-b-0 sm:grid-cols-[minmax(9.5rem,1fr)_1.2fr]"><dt className="bg-[#f5f7f8] px-4 py-3 text-xs font-extrabold leading-5 text-[#294457] sm:text-sm">{field.label}</dt><dd className="flex items-center px-4 py-3 text-sm leading-5 text-[#4d6a7d]">{field.value}</dd></div>)}</dl>;
}
