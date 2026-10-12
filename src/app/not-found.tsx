import Link from "next/link";

export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-center text-ink"><div><p className="section-kicker">404</p><h1 className="mt-3 font-display text-4xl">Halaman tidak ditemukan.</h1><p className="mt-3 text-sm text-ink/60">Tautan yang Anda buka mungkin sudah dipindahkan.</p><Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-moss px-5 text-sm font-bold text-white">Kembali ke beranda</Link></div></main>;
}
