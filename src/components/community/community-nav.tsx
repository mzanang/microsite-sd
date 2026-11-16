"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, Camera, CircleHelp, ClipboardCheck, Grid2X2, Menu, Search, ShieldCheck, UsersRound, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type CommunityNavProps = { schoolName: string; logoUrl: string; searchValue: string; onSearchChange: (value: string) => void };
type SpaceLink = {
  href: string;
  label: string;
  icon?: LucideIcon;
  imageSrc?: string;
  tone?: string;
  isExternal?: boolean;
};

const primaryLinks = [
  { hash: "#beranda", label: "Beranda", sectionId: "beranda" },
  { hash: "#profil-sekolah", label: "Profil Sekolah", sectionId: "profil-sekolah" },
  { hash: "#guru", label: "Tim Komunitas", sectionId: "guru" },
];

const spaceLinks: SpaceLink[] = [
  { href: "/komunitas-belajar/sk-komunitas-belajar", label: "SK Kombel", icon: ShieldCheck, tone: "text-[#005bbf]" },
  { href: "/komunitas-belajar/materi-kegiatan", label: "Materi Kegiatan", icon: BookOpen, tone: "text-[#2b5bb5]" },
  { href: "/komunitas-belajar/daftar-hadir", label: "Daftar Hadir", icon: ClipboardCheck, tone: "text-[#2e7d32]" },
  { href: "/komunitas-belajar/upload-tugas-kombel", label: "Tugas Kombel", icon: ClipboardCheck, tone: "text-[#e65100]" },
  { href: "/komunitas-belajar/dokumentasi-kegiatan", label: "Dokumentasi Kegiatan", icon: Camera, tone: "text-[#8e24aa]" },
  { href: "/komunitas-belajar/praktik-baik-guru", label: "Praktik Baik Guru", icon: UsersRound, tone: "text-[#00677d]" },
  { href: "/komunitas-belajar/forum-diskusi-guru", label: "Forum Diskusi Guru", icon: UsersRound, tone: "text-[#a15c00]" },
  {
    href: "https://rumah.pendidikan.go.id/ruang/gtk",
    label: "Ruang GTK",
    imageSrc: "/RUANG_GTK.png",
    isExternal: true,
  },
];

function SpaceMenu({ onClose }: { onClose: () => void }) {
  return (
    <>
      {/* Backdrop overlay on mobile & tablet */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Pop-up Card: Centered on mobile & tablet, aligned right under the button on desktop */}
      <div className="fixed left-1/2 top-[5rem] -translate-x-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-[28rem] sm:max-w-[32rem] rounded-2xl border border-[#c1c6d6]/70 bg-white p-5 sm:p-6 shadow-[0_20px_45px_-10px_rgba(15,23,42,.22)] animate-in zoom-in-95 duration-150 lg:absolute lg:left-auto lg:right-0 lg:top-[calc(100%+0.75rem)] lg:translate-x-0 lg:w-[29rem] lg:rounded-xl">
        <div className="flex items-center justify-between gap-4 border-b border-[#f1f5f9] pb-3 sm:pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#005bbf]/10 text-[#005bbf]">
              <Grid2X2 size={16} />
            </span>
            <h2 className="text-base font-bold text-[#191c1e]">Komunitas Belajar</h2>
          </div>
          <button
            type="button"
            title="Tutup jelajah komunitas"
            aria-label="Tutup jelajah komunitas"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#414754] hover:bg-[#f2f4f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {spaceLinks.map(({ href, label, icon: Icon, imageSrc, tone, isExternal }) => {
            const itemContent = (
              <>
                <span className="kb-space-icon-box flex h-12 w-12 items-center justify-center rounded-lg bg-[#f7f9fb]">
                  {imageSrc ? (
                    <Image
                      src={imageSrc}
                      alt={label}
                      width={32}
                      height={32}
                      className="h-8 w-8 object-contain"
                    />
                  ) : Icon ? (
                    <Icon className={tone} size={24} aria-hidden="true" />
                  ) : null}
                </span>
                <span className="font-semibold text-xs leading-tight">{label}</span>
              </>
            );
            const linkClass =
              "flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl p-2.5 text-center text-xs text-[#414754] transition hover:bg-[#f2f4f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#005bbf]";

            if (isExternal) {
              return (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={onClose}
                  title={label}
                  className={linkClass}
                >
                  {itemContent}
                </a>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                title={label}
                className={linkClass}
              >
                {itemContent}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function CommunityNav({ schoolName, logoUrl, searchValue, onSearchChange }: CommunityNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [spacesOpen, setSpacesOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("beranda");
  const isLanding = pathname === "/komunitas-belajar";
  const landingHref = (hash: string) => isLanding ? hash : `/komunitas-belajar${hash}`;

  useEffect(() => {
    if (!isLanding) return;
    const sectionIds = ["beranda", "ruang-kolaborasi", "profil-sekolah", "guru", "faq"];
    const sections = sectionIds.map((id) => document.getElementById(id)).filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]?.target.id) setActiveSection(visible[0].target.id);
    }, { rootMargin: "-120px 0px -55% 0px", threshold: 0.01 });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [isLanding]);

  function closeMenus() {
    setMobileOpen(false);
    setSpacesOpen(false);
  }

  function openCommunitySpaces() {
    setSpacesOpen((current) => !current);
    if (isLanding) document.getElementById("ruang-kolaborasi")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  const linkClass = (active: boolean) => `inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-2.5 text-sm font-semibold transition-colors hover:text-[#005bbf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf] ${active ? "border-[#005bbf] text-[#005bbf]" : "border-transparent text-[#414754]"}`;

  return <header className="fixed inset-x-0 top-0 z-50 border-b border-[#e2e8f0] bg-white shadow-[0_1px_8px_rgba(0,0,0,.04)]">
    <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
      <div className="relative flex min-h-[4.5rem] items-center gap-3">
        <Link href={landingHref("#beranda")} onClick={closeMenus} title="Beranda Komunitas Belajar" className="flex min-w-0 shrink-0 items-center gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf]"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden"><Image src={logoUrl} alt="" width={40} height={40} className="h-10 w-10 object-contain" unoptimized /></span><span className="hidden min-w-0 sm:flex sm:flex-col"><span className="truncate text-sm font-bold leading-tight text-[#191c1e]">Komunitas Belajar</span><span className="max-w-[180px] text-[11px] leading-tight text-[#64748b]">{schoolName}</span></span><span className="flex min-w-0 flex-col sm:hidden"><span className="truncate text-xs font-bold text-[#191c1e]">Kombel Sekolah</span><span className="truncate text-[10px] leading-tight text-[#64748b]">{schoolName}</span></span></Link>
        <nav aria-label="Navigasi utama" className="absolute left-1/2 hidden w-[520px] max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center justify-center gap-1 lg:flex"><Link href="/" onClick={closeMenus} title="Portal Sekolah" className={linkClass(false)}>Portal Sekolah</Link>{primaryLinks.map((link) => <Link key={link.hash} href={landingHref(link.hash)} onClick={closeMenus} title={link.label} aria-current={isLanding && activeSection === link.sectionId ? "location" : undefined} className={linkClass(isLanding && activeSection === link.sectionId)}>{link.label}</Link>)}</nav>
        <div className="ml-auto flex items-center gap-2"><Link href={landingHref("#faq")} title="Bantuan" aria-label="Bantuan" onClick={closeMenus} aria-current={isLanding && activeSection === "faq" ? "location" : undefined} className={`${linkClass(isLanding && activeSection === "faq")} hidden h-11 w-11 items-center justify-center sm:inline-flex`}><CircleHelp size={19} aria-hidden="true" /></Link><div className="relative"><button type="button" title="Komunitas Belajar" aria-label="Komunitas Belajar" aria-expanded={spacesOpen} onClick={openCommunitySpaces} className="inline-flex h-11 w-11 items-center justify-center border-b-2 border-transparent bg-transparent text-sm font-bold text-[#191c1e] hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf]"><Grid2X2 size={19} aria-hidden="true" /></button>{spacesOpen && <SpaceMenu onClose={() => setSpacesOpen(false)} />}</div><Link href="/komunitas-belajar/login" title="Masuk ke Komunitas Belajar" className="hidden min-h-11 items-center rounded-lg bg-[#2d3133] px-5 text-sm font-bold text-white hover:bg-[#191c1e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#191c1e] sm:inline-flex">Masuk</Link><button type="button" title={mobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"} aria-label={mobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"} aria-expanded={mobileOpen} aria-controls="community-mobile-navigation" onClick={() => setMobileOpen((current) => !current)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#191c1e] hover:bg-[#f2f4f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf] lg:hidden">{mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}</button></div>
      </div>
      <div className="border-t border-[#eef0f2] py-3"><label className="mx-auto flex w-full max-w-[520px] items-center rounded-lg border border-[#b8bec9] bg-white lg:w-[520px]"><span className="sr-only">Cari ruang komunitas</span><input title="Cari ruang komunitas" value={searchValue} onChange={(event) => onSearchChange(event.target.value)} className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-[#191c1e] outline-none placeholder:text-[#727785]" placeholder="Contoh: Pembelajaran, Panduan, SK Kombel..." /><span className="flex h-11 w-11 shrink-0 items-center justify-center border-l border-[#b8bec9] text-[#005bbf]"><Search size={21} aria-hidden="true" /></span></label></div>
      {mobileOpen && <nav id="community-mobile-navigation" aria-label="Navigasi mobile" className="border-t border-[#e2e8f0] py-3 lg:hidden"><Link href="/" onClick={closeMenus} title="Portal Sekolah" className="flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-[#005bbf] hover:bg-[#f2f4f6]">Portal Sekolah</Link>{primaryLinks.map((link) => <Link key={link.hash} href={landingHref(link.hash)} onClick={closeMenus} title={link.label} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-[#414754] hover:bg-[#f2f4f6]">{link.label}</Link>)}<Link href={landingHref("#faq")} onClick={closeMenus} title="Bantuan" className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#414754] hover:bg-[#f2f4f6]"><CircleHelp size={17} aria-hidden="true" />Bantuan</Link><Link href={landingHref("#ruang-kolaborasi")} onClick={closeMenus} title="Komunitas Belajar" className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#414754] hover:bg-[#f2f4f6]"><Grid2X2 size={17} aria-hidden="true" />Komunitas Belajar</Link><p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[.14em] text-[#727785]">Ruang Komunitas</p>{spaceLinks.map(({ href, label, icon: Icon, imageSrc, tone, isExternal }) => isExternal ? <a key={href} href={href} target="_blank" rel="noreferrer" onClick={closeMenus} title={label} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#414754] hover:bg-[#f2f4f6]">{imageSrc ? <span className="flex h-5 w-5 items-center justify-center"><Image src={imageSrc} alt="" width={18} height={18} className="h-4.5 w-4.5 object-contain" /></span> : Icon ? <Icon className={tone} size={17} aria-hidden="true" /> : null}{label}</a> : <Link key={href} href={href} onClick={closeMenus} title={label} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#414754] hover:bg-[#f2f4f6]">{imageSrc ? <span className="flex h-5 w-5 items-center justify-center"><Image src={imageSrc} alt="" width={18} height={18} className="h-4.5 w-4.5 object-contain" /></span> : Icon ? <Icon className={tone} size={17} aria-hidden="true" /> : null}{label}</Link>)}<Link href="/komunitas-belajar/login" onClick={closeMenus} title="Masuk ke Komunitas Belajar" className="mt-2 flex min-h-11 items-center justify-center rounded-lg bg-[#2d3133] px-4 text-sm font-bold text-white hover:bg-[#191c1e]">Masuk</Link></nav>}
    </div>
  </header>;
}
