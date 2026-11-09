"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BarChart3, BookOpen, Camera, CircleHelp, ClipboardCheck, Grid2X2, Menu, School, Search, ShieldCheck, Upload, UsersRound, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type CommunityNavProps = { schoolName: string; logoUrl: string; searchValue: string; onSearchChange: (value: string) => void };
type SpaceLink = { href: string; label: string; icon: LucideIcon; tone: string };

const spaceLinks: SpaceLink[] = [
  { href: "/komunitas-belajar/sk-komunitas-belajar", label: "SK Kombel", icon: ShieldCheck, tone: "text-[#005bbf]" },
  { href: "/komunitas-belajar/materi-kegiatan", label: "Materi Kegiatan", icon: BookOpen, tone: "text-[#2b5bb5]" },
  { href: "/komunitas-belajar/daftar-hadir-notulen", label: "Daftar Hadir dan Notulen", icon: ClipboardCheck, tone: "text-[#2e7d32]" },
  { href: "/komunitas-belajar/upload-tugas-kombel", label: "Upload Tugas Kombel", icon: Upload, tone: "text-[#e65100]" },
  { href: "/komunitas-belajar/dokumentasi-kegiatan", label: "Dokumentasi Kegiatan", icon: Camera, tone: "text-[#8e24aa]" },
  { href: "/komunitas-belajar/praktik-baik-guru", label: "Praktik Baik Guru", icon: UsersRound, tone: "text-[#00677d]" },
  { href: "/komunitas-belajar/forum-diskusi-guru", label: "Forum Diskusi Guru", icon: UsersRound, tone: "text-[#a15c00]" },
  { href: "/komunitas-belajar/peningkatan-rapor-pendidikan", label: "Rapor Pendidikan", icon: BarChart3, tone: "text-[#7b1fa2]" },
];

function SpaceMenu({ onClose }: { onClose: () => void }) {
  return <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(92vw,29rem)] rounded-xl border border-[#c1c6d6]/70 bg-white p-5 shadow-[0_20px_35px_-10px_rgba(15,23,42,.15)]"><div className="flex items-center justify-between gap-4"><h2 className="text-base font-bold text-[#191c1e]">Komunitas Belajar</h2><button type="button" title="Tutup jelajah komunitas" aria-label="Tutup jelajah komunitas" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#414754] hover:bg-[#f2f4f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf]"><X size={18} aria-hidden="true" /></button></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{spaceLinks.map(({ href, label, icon: Icon, tone }) => <Link key={href} href={href} onClick={onClose} title={label} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg p-2 text-center text-xs text-[#414754] hover:bg-[#f2f4f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#005bbf]"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#f7f9fb]"><Icon className={tone} size={24} aria-hidden="true" /></span><span>{label}</span></Link>)}</div></div>;
}

export function CommunityNav({ schoolName, logoUrl, searchValue, onSearchChange }: CommunityNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [spacesOpen, setSpacesOpen] = useState(false);

  function closeMenus() {
    setMobileOpen(false);
    setSpacesOpen(false);
  }
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#e2e8f0] bg-white shadow-[0_1px_8px_rgba(0,0,0,.04)]">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
        <div className="flex min-h-[4.5rem] items-center gap-3">
          <Link href="#beranda" onClick={closeMenus} title="Beranda Komunitas Belajar" className="flex min-w-0 shrink-0 items-center gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#005bbf]"><Image src={logoUrl} alt="" width={40} height={40} className="h-10 w-10 object-contain" unoptimized /></span>
            <span className="hidden min-w-0 sm:flex sm:flex-col"><span className="truncate text-sm font-bold leading-tight text-[#191c1e]">Komunitas Belajar</span><span className="max-w-[180px] text-[11px] leading-tight text-[#64748b]">{schoolName}</span></span>
            <span className="flex min-w-0 flex-col sm:hidden"><span className="truncate text-xs font-bold text-[#191c1e]">Kombel Sekolah</span><span className="truncate text-[10px] leading-tight text-[#64748b]">{schoolName}</span></span>
          </Link>
          <label className="mx-auto hidden w-full max-w-[34rem] min-w-0 flex-none items-center rounded-lg border border-[#b8bec9] bg-white xl:flex">
            <span className="sr-only">Cari ruang komunitas</span>
            <input title="Cari ruang komunitas" value={searchValue} onChange={(event) => onSearchChange(event.target.value)} className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-[#191c1e] outline-none placeholder:text-[#727785]" placeholder="Contoh: Pembelajaran, Panduan, SK Kombel..." />
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border-l border-[#b8bec9] text-[#005bbf]"><Search size={21} aria-hidden="true" /></span>
          </label>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" title="Portal Sekolah" aria-label="Portal Sekolah" onClick={closeMenus} className="hidden h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#414754] hover:bg-[#f2f4f6] hover:text-[#005bbf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf] sm:inline-flex"><School size={19} aria-hidden="true" /><span className="hidden sm:inline">Portal Sekolah</span></Link>
            <Link href="#faq" title="Bantuan" aria-label="Bantuan" className="hidden h-11 w-11 items-center justify-center rounded-lg text-[#414754] hover:bg-[#f2f4f6] hover:text-[#005bbf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf] sm:inline-flex"><CircleHelp size={19} aria-hidden="true" /></Link>
            <div className="relative"><button type="button" title="Jelajahi komunitas" aria-label="Jelajahi komunitas" aria-expanded={spacesOpen} onClick={() => setSpacesOpen((current) => !current)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#e0e3e5] text-[#191c1e] hover:bg-[#cbd5e1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf]"><Grid2X2 size={20} aria-hidden="true" /></button>{spacesOpen && <SpaceMenu onClose={() => setSpacesOpen(false)} />}</div>
            <Link href="/komunitas-belajar/login" title="Masuk ke Komunitas Belajar" className="hidden min-h-11 items-center rounded-lg bg-[#2d3133] px-5 text-sm font-bold text-white hover:bg-[#191c1e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#191c1e] sm:inline-flex">Masuk</Link>
            <button type="button" title={mobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"} aria-label={mobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"} aria-expanded={mobileOpen} aria-controls="community-mobile-navigation" onClick={() => setMobileOpen((current) => !current)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#191c1e] hover:bg-[#f2f4f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf] lg:hidden">{mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}</button>
          </div>
        </div>
        <div className="border-t border-[#eef0f2] py-3 xl:hidden">
          <label className="flex items-center rounded-lg border border-[#b8bec9] bg-white"><span className="sr-only">Cari ruang komunitas</span><input title="Cari ruang komunitas" value={searchValue} onChange={(event) => onSearchChange(event.target.value)} className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-[#191c1e] outline-none placeholder:text-[#727785]" placeholder="Contoh: Pembelajaran, Panduan, SK Kombel..." /><span className="flex h-11 w-11 shrink-0 items-center justify-center border-l border-[#b8bec9] text-[#005bbf]"><Search size={21} aria-hidden="true" /></span></label>
        </div>
        {mobileOpen && <nav id="community-mobile-navigation" aria-label="Navigasi mobile" className="border-t border-[#e2e8f0] py-3 lg:hidden"><Link href="/" onClick={closeMenus} title="Portal Sekolah" className="flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-[#005bbf] hover:bg-[#f2f4f6]">Portal Sekolah</Link><Link href="#profil-sekolah" onClick={closeMenus} title="Profil Sekolah" className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-[#414754] hover:bg-[#f2f4f6]">Profil Sekolah</Link><p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[.14em] text-[#727785]">Ruang Komunitas</p>{spaceLinks.map(({ href, label, icon: Icon, tone }) => <Link key={href} href={href} onClick={closeMenus} title={label} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#414754] hover:bg-[#f2f4f6]"><Icon className={tone} size={17} aria-hidden="true" />{label}</Link>)}<Link href="#guru" onClick={closeMenus} title="Daftar Guru" className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-[#414754] hover:bg-[#f2f4f6]">Daftar Guru</Link><Link href="#faq" onClick={closeMenus} title="Bantuan" className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-[#414754] hover:bg-[#f2f4f6]">Bantuan</Link><Link href="/komunitas-belajar/login" onClick={closeMenus} title="Masuk ke Komunitas Belajar" className="mt-2 flex min-h-11 items-center justify-center rounded-lg bg-[#2d3133] px-4 text-sm font-bold text-white hover:bg-[#191c1e]">Masuk</Link></nav>}
      </div>
    </header>
  );
}
