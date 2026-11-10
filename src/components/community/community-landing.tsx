"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Camera,
  CheckSquare,
  ChevronRight,
  MapPin,
  Search,
  School,
  ShieldCheck,
  Upload,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CommunityHero } from "@/components/community/community-hero";
import { CommunityNav } from "@/components/community/community-nav";
import { AccessibilityWidget, type AccessibilityTheme } from "@/components/community/accessibility-widget";
import type { PublicCommunityData, PublicCommunityProfile } from "@/lib/community-data";
import { schoolProfileLeft, schoolProfileRight } from "@/lib/community-school-profile";

type Room = { slug: string; title: string; description: string; meta: string; icon: LucideIcon; tone: string; iconTone: string };

const rooms: Room[] = [
  { slug: "sk-komunitas-belajar", title: "SK & Regulasi Kombel", description: "SK Kepala Sekolah dan pedoman kerja", meta: "Dokumen resmi", icon: ShieldCheck, tone: "bg-[#e3f2fd]", iconTone: "text-[#005bbf]" },
  { slug: "materi-kegiatan", title: "Materi & Modul Ajar", description: "Bahan paparan dan perangkat ajar", meta: "Materi kegiatan", icon: BookOpen, tone: "bg-[#fff3e0]", iconTone: "text-[#e65100]" },
  { slug: "daftar-hadir-notulen", title: "Presensi & Notulensi", description: "Daftar hadir dan catatan rapat", meta: "Buka presensi", icon: CheckSquare, tone: "bg-[#e8f5e9]", iconTone: "text-[#2e7d32]" },
  { slug: "upload-tugas-kombel", title: "Tugas Kombel", description: "Daftar tugas dan karya yang diberikan", meta: "Lihat tugas", icon: Upload, tone: "bg-[#fce4ec]", iconTone: "text-[#c2185b]" },
  { slug: "dokumentasi-kegiatan", title: "Dokumentasi & Galeri", description: "Catatan visual kegiatan komunitas", meta: "Lihat dokumentasi", icon: Camera, tone: "bg-[#ede7f6]", iconTone: "text-[#6a1b9a]" },
  { slug: "praktik-baik-guru", title: "Praktik Baik Guru", description: "Berbagi strategi pembelajaran", meta: "Jelajahi praktik", icon: UsersRound, tone: "bg-[#e0f7fa]", iconTone: "text-[#00677d]" },
  { slug: "forum-diskusi-guru", title: "Forum Diskusi Guru", description: "Ruang bertukar pengalaman", meta: "Buka ruang diskusi", icon: UsersRound, tone: "bg-[#fff8e1]", iconTone: "text-[#a15c00]" },
];

const faqItems = [
  { question: "Bagaimana cara membuka materi dan dokumen komunitas?", answer: "Pilih ruang yang tersedia pada halaman ini. Konten publik dapat dibuka tanpa login jika sudah ditambahkan oleh pengelola." },
  { question: "Bagaimana cara mengunggah tugas kombel?", answer: "Buka ruang Tugas Kombel, pilih tugas yang diberikan Ketua, lalu kirim dokumen atau tautan melalui ruang pengumpulan." },
  { question: "Siapa yang dapat masuk ke portal?", answer: "Akun operasional dibuat oleh Super Admin untuk Kepala Sekolah, Pengawas Dabin, dan Guru. Tidak tersedia pendaftaran mandiri." },
  { question: "Apa yang dilakukan jika belum memiliki akun?", answer: "Hubungi pengelola sekolah untuk dibuatkan akun. Jangan membagikan kata sandi kepada orang lain." },
];

export function CommunityLanding({ data }: { data: PublicCommunityData }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [accessibilityTheme, setAccessibilityTheme] = useState<AccessibilityTheme>("light");
  useEffect(() => {
    const saved = window.localStorage.getItem("kb-public-accessibility");
    if (saved?.includes('"theme":"dark"')) setAccessibilityTheme("dark");
  }, []);
  const filteredRooms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rooms;
    return rooms.filter((room) => `${room.title} ${room.description} ${room.meta}`.toLowerCase().includes(query));
  }, [searchQuery]);

  return (
    <main className={`kb-public-root min-h-screen overflow-x-hidden font-[var(--font-plus-jakarta)] text-[#191c1e] ${accessibilityTheme === "dark" ? "kb-theme-dark" : "kb-theme-light"}`}>
      <CommunityNav schoolName={data.school.name} logoUrl={data.school.logo_url} searchValue={searchQuery} onSearchChange={setSearchQuery} />
      <div id="beranda" className="w-full scroll-mt-40 pt-[9rem] sm:pt-[9rem]">
        <CommunityHero />
      </div>

      <div className="w-full">
        <section id="ruang-kolaborasi" className="mx-auto w-full max-w-[1240px] scroll-mt-40 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-[26px] font-bold leading-9 tracking-[-.02em] text-[#191c1e] sm:text-[32px]">Ruang Kolaborasi Komunitas Belajar</h2>
            <p className="mt-3 text-sm leading-6 text-[#414754] sm:text-base">Akses cepat layanan komunitas untuk mendukung keteraturan administrasi, penguatan modul ajar, dan peningkatan mutu belajar.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{filteredRooms.map((room) => <RoomCard key={room.slug} room={room} />)}</div>
          {!filteredRooms.length && <div className="mt-4 border border-dashed border-[#c1c6d6] bg-white px-6 py-10 text-center"><Search className="mx-auto text-[#727785]" size={25} aria-hidden="true" /><p className="mt-3 font-bold text-[#191c1e]">Ruang tidak ditemukan</p><p className="mt-1 text-sm text-[#414754]">Coba kata kunci lain atau hapus pencarian.</p></div>}
        </section>

        <section id="profil-sekolah" className="mx-auto w-full max-w-[1240px] scroll-mt-40 px-4 py-16 sm:px-6 sm:py-20 xl:scroll-mt-24">
          <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#005bbf]">Tentang sekolah</p><h2 className="mt-2 text-[26px] font-bold leading-9 tracking-[-.02em] text-[#191c1e] sm:text-[32px]">Profil Sekolah</h2></div><School className="text-[#005bbf]" size={30} aria-hidden="true" /></div>
          <article className="mt-8 border border-[#e2e8f0] bg-white p-4 shadow-[0_2px_8px_-2px_rgba(15,23,42,.04),0_1px_3px_-1px_rgba(15,23,42,.06)] sm:p-6"><div className="grid gap-5 lg:grid-cols-2"><SchoolProfileTable fields={schoolProfileLeft.map((field) => field.label === "Nama Sekolah" ? { ...field, value: data.school.name } : field)} /><SchoolProfileTable fields={schoolProfileRight.map((field) => field.label === "Kepala Sekolah" && data.principal ? { ...field, value: data.principal.name } : field)} /></div><div className="mt-5 flex items-start gap-3 border-t border-[#e2e8f0] pt-5 text-sm leading-6 text-[#475569]"><MapPin className="mt-0.5 shrink-0 text-[#005bbf]" size={18} aria-hidden="true" /><a href="https://www.google.com/maps/search/?api=1&query=-6.969424050519738%2C109.0984724818786" target="_blank" rel="noreferrer" className="hover:text-[#005bbf] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf]">{data.school.address || "Alamat sekolah belum ditambahkan."}</a></div></article>
        </section>

        <section id="guru" className="scroll-mt-40 bg-[#f2f4f6] py-16 sm:py-20 xl:scroll-mt-24"><div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#005bbf]">Tenaga pendidik</p><h2 className="mt-2 text-[26px] font-bold leading-9 tracking-[-.02em] text-[#191c1e] sm:text-[32px]">Daftar Guru</h2></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{data.teachers.length ? data.teachers.map((teacher) => <ProfileCard key={`${teacher.name}-${teacher.teacher_type}`} profile={teacher} />) : <EmptyState title="Daftar guru belum ditambahkan" description="Nama dan jenis guru akan tampil setelah Super Admin mengaktifkan profil publiknya." />}</div></div></section>

        <section id="faq" className="mx-auto w-full max-w-[880px] scroll-mt-40 px-4 py-16 sm:px-6 sm:py-20 xl:scroll-mt-24"><div className="mb-10 text-center"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#005bbf]">Bantuan</p><h2 className="mt-2 text-[26px] font-bold leading-9 tracking-[-.02em] text-[#191c1e] sm:text-[32px]">Pertanyaan yang Sering Diajukan</h2><p className="mt-3 text-sm leading-6 text-[#414754]">Panduan singkat untuk mengakses ruang dan akun Komunitas Belajar Guru.</p></div><FaqList /></section>
      </div>

      <footer className="bg-[#eceef0]"><div className="mx-auto grid w-full max-w-[1240px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4"><div className="lg:col-span-2"><div className="flex items-center gap-4"><Image src={data.school.logo_url} alt={`Logo ${data.school.name}`} width={64} height={64} className="h-16 w-16 shrink-0 object-contain" unoptimized /><span className="text-lg font-bold text-[#005bbf]">Komunitas Belajar Sekolah</span></div><p className="mt-4 max-w-md text-sm leading-6 text-[#414754]">Kolaborasi pendidik SD Negeri Dukuhwaru 01</p></div><FooterLinks title="Layanan Kombel" links={rooms.slice(0, 5).map((room) => ({ label: room.title, href: `/komunitas-belajar/${room.slug}` }))} /><FooterLinks title="Portal & Informasi" links={[{ label: "Portal Sekolah", href: "/" }, { label: "Profil Sekolah", href: "#profil-sekolah" }, { label: "Daftar Guru", href: "#guru" }, { label: "Bantuan", href: "#faq" }]} /></div><div className="border-t border-[#cbd5e1] px-4 py-5 text-center text-xs text-[#475569] sm:px-6">© {new Date().getFullYear()} Komunitas Belajar Guru SD Negeri Dukuhwaru 01.</div></footer>
      <AccessibilityWidget theme={accessibilityTheme} onThemeChange={setAccessibilityTheme} />
    </main>
  );
}

function RoomCard({ room }: { room: Room }) {
  const Icon = room.icon;
  return <Link href={`/komunitas-belajar/${room.slug}`} className="group flex min-h-64 flex-col items-center justify-center border border-[#e2e8f0] bg-white p-6 text-center shadow-[0_2px_8px_-2px_rgba(15,23,42,.04),0_1px_3px_-1px_rgba(15,23,42,.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_10px_25px_-5px_rgba(26,115,232,.08),0_4px_10px_-2px_rgba(15,23,42,.04)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf]"><span className={`flex h-16 w-16 items-center justify-center rounded-2xl ${room.tone} ${room.iconTone} transition duration-200 group-hover:scale-105`}><Icon size={31} aria-hidden="true" /></span><h3 className="mt-4 text-base font-semibold text-[#191c1e] group-hover:text-[#005bbf]">{room.title}</h3><p className="mt-1 text-xs leading-5 text-[#475569]">{room.description}</p><span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#005bbf]">{room.meta}<ChevronRight size={14} aria-hidden="true" /></span></Link>;
}

function FaqList() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return <div className="space-y-3">{faqItems.map((item, index) => <div key={item.question} className="overflow-hidden border border-[#e2e8f0] bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,.04)]"><button type="button" aria-expanded={openIndex === index} onClick={() => setOpenIndex((current) => current === index ? null : index)} className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-[#191c1e] hover:text-[#005bbf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#005bbf]"><span>{item.question}</span><ChevronRight size={19} className={`shrink-0 text-[#727785] transition-transform ${openIndex === index ? "rotate-90 text-[#005bbf]" : ""}`} aria-hidden="true" /></button>{openIndex === index && <div className="border-t border-[#e2e8f0] px-5 pb-5 pt-4 text-sm leading-6 text-[#475569]">{item.answer}</div>}</div>)}</div>;
}

function FooterLinks({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return <div><h3 className="text-sm font-bold text-[#191c1e]">{title}</h3><div className="mt-4 flex flex-col gap-2">{links.map((link) => <Link key={link.label} href={link.href} className="text-sm text-[#475569] hover:text-[#005bbf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf]">{link.label}</Link>)}</div></div>;
}

function ProfileCard({ profile }: { profile: PublicCommunityProfile }) {
  const roleLabel = profile.community_position === "ketua" ? "Ketua" : "Anggota";
  return <article className="border border-[#e2e8f0] bg-white p-5 shadow-[0_2px_8px_-2px_rgba(15,23,42,.04)]"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e3f2fd] text-[#005bbf]"><UserRound size={20} aria-hidden="true" /></div><h3 className="mt-5 text-base font-bold text-[#191c1e]">{profile.name}</h3><p className="mt-1 text-sm text-[#475569]">{profile.teacher_type}</p><p className="mt-4 text-sm font-bold text-[#005bbf]">{roleLabel}</p>{profile.title && <p className="mt-1 text-xs text-[#64748b]">{profile.title}</p>}</article>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="border border-dashed border-[#c1c6d6] bg-white px-5 py-8 text-center sm:col-span-2 lg:col-span-4"><p className="font-bold text-[#191c1e]">{title}</p><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#475569]">{description}</p></div>;
}

function SchoolProfileTable({ fields }: { fields: { label: string; value: string }[] }) {
  return <dl>{fields.map((field) => <div key={field.label} className="grid min-h-12 grid-cols-[minmax(8.5rem,.9fr)_1.1fr] border-b border-[#e2e8f0] last:border-b-0 sm:grid-cols-[minmax(9.5rem,1fr)_1.2fr]"><dt className="bg-[#f2f4f6] px-4 py-3 text-xs font-bold leading-5 text-[#414754] sm:text-sm">{field.label}</dt><dd className={`flex items-center px-4 py-3 leading-5 text-[#475569] ${field.label === "Email" ? "text-xs sm:text-sm" : "text-sm"}`}>{field.value}</dd></div>)}</dl>;
}
