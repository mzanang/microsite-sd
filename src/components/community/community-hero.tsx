"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Slide = { title: string; description: string; badge: string };

const slides: Slide[] = [
  { title: "Kolaborasi Guru untuk Pembelajaran Bermutu", description: "Ruang informasi, administrasi, refleksi, dan berbagi praktik baik bagi komunitas belajar SD Negeri Dukuhwaru 01.", badge: "KOMUNITAS BELAJAR GURU" },
  { title: "Dokumen Komunitas Lebih Mudah Ditemukan", description: "Akses SK, materi, presensi, notulen, tugas, dan dokumentasi dari satu portal yang tertata.", badge: "RUANG KOLABORASI" },
  { title: "Belajar Bersama, Bertumbuh di Sekolah", description: "Bangun kebiasaan berbagi pengalaman dan tindak lanjut pembelajaran bersama rekan pendidik.", badge: "BELAJAR BERSAMA" },
];

export function CommunityHero() {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = slides[activeSlide];

  function moveSlide(direction: number) {
    setActiveSlide((current) => (current + direction + slides.length) % slides.length);
  }

  return <section className="kb-community-hero mx-auto w-full max-w-[1240px] px-4 sm:px-6">
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#dcedff] via-[#eaf3ff] to-[#d8ebff] shadow-[0_2px_8px_-2px_rgba(15,23,42,.04),0_1px_3px_-1px_rgba(15,23,42,.06)]">
      <div className="relative flex min-h-[350px] flex-col gap-6 p-6 sm:p-8 lg:min-h-[390px] lg:p-10">
        <div className="pointer-events-none absolute inset-0 hidden bg-cover bg-right opacity-90 lg:block" style={{ backgroundImage: "url('/bg_kombel.webp')" }} aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_45%,rgba(26,115,232,.14),transparent_28%),radial-gradient(circle_at_18%_15%,rgba(255,255,255,.7),transparent_30%)]" aria-hidden="true" />
        <div className="relative z-10 flex w-full max-w-[760px] flex-col justify-center">
          <div className="mb-3 inline-block w-fit rounded-md bg-[#005bbf] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">{slide.badge}</div>
          <h1 className="max-w-2xl text-[30px] font-extrabold leading-[1.18] tracking-[-.02em] text-[#191c1e] sm:text-[44px] sm:leading-[1.2]">{slide.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#414754] sm:text-base">{slide.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href="#ruang-kolaborasi" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#005bbf] px-5 text-sm font-bold text-white shadow-md hover:bg-[#00337c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf]">Jelajahi ruang <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link href="/komunitas-belajar/login" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#005bbf]/40 bg-white/40 px-5 text-sm font-bold text-[#005bbf] hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf]">Masuk ke portal</Link>
          </div>
        </div>
      </div>
      <button type="button" onClick={() => moveSlide(-1)} aria-label="Slide sebelumnya" className="absolute left-3 top-1/2 z-20 flex h-10 w-10 cursor-pointer -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#191c1e] shadow-md hover:text-[#005bbf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf]"><ArrowLeft size={19} aria-hidden="true" /></button>
      <button type="button" onClick={() => moveSlide(1)} aria-label="Slide berikutnya" className="absolute right-3 top-1/2 z-20 flex h-10 w-10 cursor-pointer -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#191c1e] shadow-md hover:text-[#005bbf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf]"><ArrowRight size={19} aria-hidden="true" /></button>
      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">{slides.map((item, index) => <button key={item.badge} type="button" aria-label={`Pilih slide ${index + 1}`} aria-current={index === activeSlide ? "true" : undefined} onClick={() => setActiveSlide(index)} className={`${index === activeSlide ? "w-6 bg-[#005bbf]" : "w-2 bg-[#c1c6d6] hover:bg-[#005bbf]"} h-2 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005bbf]`} />)}</div>
    </div>
  </section>;
}
