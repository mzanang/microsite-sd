"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

type CommunityNavProps = { schoolName: string; logoUrl: string };

const links = [
  { href: "/", label: "Portal Sekolah" },
  { href: "#profil-sekolah", label: "Profil sekolah" },
  { href: "#kepala-sekolah", label: "Kepala sekolah" },
  { href: "#guru", label: "Daftar guru" },
] as const;

export function CommunityNav({ schoolName, logoUrl }: CommunityNavProps) {
  const [open, setOpen] = useState(false);

  return <header className="sticky top-0 z-50 border-b border-[#e2e8f0]/90 bg-white/95 shadow-[0_1px_8px_rgba(15,23,42,.04)] backdrop-blur"><div className="mx-auto w-full max-w-6xl px-5 sm:px-8"><div className="flex min-h-16 items-center justify-between gap-4 py-3"><Link href="#beranda" onClick={() => setOpen(false)} className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1264c5]"><Image src={logoUrl} alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" unoptimized /><span className="min-w-0"><span className="block truncate text-sm font-extrabold tracking-tight text-[#0f172a]">{schoolName}</span><span className="block text-[10px] font-bold uppercase tracking-[.16em] text-[#64748b]">Komunitas Belajar Guru</span></span></Link><nav aria-label="Navigasi halaman" className="hidden items-center gap-1 text-sm font-semibold text-[#475569] md:flex">{links.map((link) => <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 transition hover:bg-[#eff6ff] hover:text-[#005bbf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf]">{link.label}</Link>)}<Link href="/komunitas-belajar/login" className="ml-1 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#1a73e8] px-4 text-sm font-bold text-white shadow-[0_4px_10px_-2px_rgba(15,23,42,.12)] transition hover:bg-[#005bbf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf]">Masuk</Link></nav><button type="button" aria-expanded={open} aria-controls="community-mobile-navigation" aria-label={open ? "Tutup navigasi" : "Buka navigasi"} onClick={() => setOpen((current) => !current)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#cbd5e1] text-[#005bbf] hover:bg-[#eff6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf] md:hidden">{open ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}</button></div>{open && <nav id="community-mobile-navigation" aria-label="Navigasi mobile" className="border-t border-[#e2e8f0] py-3 md:hidden">{links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-[#334155] hover:bg-[#eff6ff] hover:text-[#005bbf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf]">{link.label}</Link>)}<Link href="/komunitas-belajar/login" onClick={() => setOpen(false)} className="mt-2 flex min-h-11 items-center justify-center rounded-lg bg-[#1a73e8] px-4 text-sm font-bold text-white hover:bg-[#005bbf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf]">Masuk</Link></nav>}</div></header>;
}
