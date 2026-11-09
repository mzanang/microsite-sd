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

  return <header className="border-b border-[#d7e1ec] bg-white/90 backdrop-blur"><div className="mx-auto w-full max-w-3xl px-5 sm:px-8"><div className="flex min-h-16 items-center justify-between gap-4 py-3"><Link href="#beranda" onClick={() => setOpen(false)} className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1264c5]"><Image src={logoUrl} alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" unoptimized /><span className="min-w-0"><span className="block truncate text-sm font-extrabold tracking-tight text-[#143d72]">{schoolName}</span><span className="block text-[10px] font-bold uppercase tracking-[.16em] text-[#6c7f98]">Komunitas Belajar Guru</span></span></Link><nav aria-label="Navigasi halaman" className="hidden items-center gap-1 text-sm font-semibold text-[#557291] md:flex">{links.map((link) => <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 transition hover:bg-[#edf4ff] hover:text-[#1264c5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1264c5]">{link.label}</Link>)}<Link href="/komunitas-belajar/login" className="ml-1 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1264c5] px-4 text-sm font-bold text-white transition hover:bg-[#0d4e9b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1264c5]">Masuk</Link></nav><button type="button" aria-expanded={open} aria-controls="community-mobile-navigation" aria-label={open ? "Tutup navigasi" : "Buka navigasi"} onClick={() => setOpen((current) => !current)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#bfd2e8] text-[#1264c5] hover:bg-[#edf4ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1264c5] md:hidden">{open ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}</button></div>{open && <nav id="community-mobile-navigation" aria-label="Navigasi mobile" className="border-t border-[#e6edf5] py-3 md:hidden">{links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-[#34577f] hover:bg-[#edf4ff] hover:text-[#1264c5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1264c5]">{link.label}</Link>)}<Link href="/komunitas-belajar/login" onClick={() => setOpen(false)} className="mt-2 flex min-h-11 items-center justify-center rounded-xl bg-[#1264c5] px-4 text-sm font-bold text-white hover:bg-[#0d4e9b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1264c5]">Masuk</Link></nav>}</div></header>;
}
