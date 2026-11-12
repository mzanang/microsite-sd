"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CommunityLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const identifier = String(form.get("login_identifier") ?? "").replace(/\D/g, "");
    if (!identifier || !/^\d{4,32}$/.test(identifier)) {
      setError("NIP atau NIK hanya boleh berisi angka.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/komunitas-belajar/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ login_identifier: identifier, password: form.get("password") }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; ok?: boolean; role?: string; community_position?: string | null; must_change_password?: boolean };
      if (!response.ok || !result.ok) throw new Error(result.error || "Login gagal.");
      router.push(result.must_change_password ? "/komunitas-belajar/ganti-password" : result.role === "super_admin" ? "/admin/dashboard" : result.role === "kepala_sekolah" ? "/komunitas-belajar/ks/dashboard" : result.role === "pengawas_dabin" ? "/komunitas-belajar/pengawas/dashboard" : result.community_position === "ketua" ? "/komunitas-belajar/ketua/dashboard" : "/komunitas-belajar/anggota/dashboard");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login gagal.");
      setLoading(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#f4f8ff] px-5 py-10 text-[#173253] sm:px-8"><section className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#dbe7f5] bg-white shadow-[0_24px_70px_rgba(23,83,158,.14)] md:grid-cols-[.9fr_1.1fr]" aria-labelledby="community-login-title">
    <div className="relative hidden overflow-hidden bg-[#0b5fc3] p-10 text-white md:block"><div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full border-[28px] border-white/10" aria-hidden="true" /><div className="relative flex h-full flex-col justify-between"><div><Image src="/logo.png" alt="" width={64} height={64} className="h-16 w-16 object-contain" /><p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-[#cfe6ff]">SD Negeri Dukuhwaru 01</p><h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-[-.04em]">Ruang administrasi guru.</h1><p className="mt-5 max-w-sm text-sm leading-7 text-white/75">Kelola pengumpulan administrasi dan kegiatan komunitas belajar melalui akun yang dibuat oleh pengelola sekolah.</p></div></div></div>
    <div className="p-7 sm:p-12"><Link href="/komunitas-belajar" className="text-sm font-bold text-[#1970d2] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1970d2]">Kembali ke halaman publik</Link><div className="mt-12"><div className="flex items-center gap-3 md:hidden"><Image src="/logo.png" alt="" width={48} height={48} className="h-12 w-12 object-contain" /><div><p className="text-sm font-extrabold text-[#153d70]">SD Negeri Dukuhwaru 01</p><p className="text-xs text-[#6683a6]">Komunitas Belajar Guru</p></div></div><p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-[#1970d2] md:mt-0">Login komunitas belajar</p><h2 id="community-login-title" className="mt-3 text-3xl font-extrabold tracking-tight text-[#173253]">Masuk dengan NIP atau NIK</h2><p className="mt-3 text-sm leading-6 text-[#6683a6]">Gunakan kredensial yang diberikan oleh Super Admin.</p><form onSubmit={submit} className="mt-8 space-y-5"><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">NIP / NIK</span><input name="login_identifier" required autoComplete="username" inputMode="numeric" pattern="[0-9]{4,32}" minLength={4} maxLength={32} onChange={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, ""); }} className="h-12 w-full rounded-xl border border-[#bfd2e8] bg-white px-4 text-sm outline-none transition placeholder:text-[#9ab0c8] focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10" placeholder="Masukkan NIP atau NIK" aria-describedby="login-identifier-help" /><span id="login-identifier-help" className="mt-2 block text-xs text-[#6683a6]">Masukkan angka NIP atau NIK tanpa spasi.</span></label><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Kata sandi</span><span className="relative block"><input name="password" required type={showPassword ? "text" : "password"} autoComplete="current-password" className="h-12 w-full rounded-xl border border-[#bfd2e8] bg-white px-4 pr-12 text-sm outline-none transition placeholder:text-[#9ab0c8] focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10" placeholder="Masukkan kata sandi" /><button type="button" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)} className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-[#6683a6] hover:bg-[#edf4ff] hover:text-[#1264c5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1264c5]">{showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}</button></span></label><div className="flex justify-end"><Link href="/komunitas-belajar/lupa-password" className="text-xs font-bold text-[#1970d2] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1970d2]">Lupa kata sandi?</Link></div>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800">{error}</p>}<button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0b5fc3] px-4 text-sm font-bold text-white transition hover:bg-[#084e9f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5fc3] disabled:cursor-wait disabled:opacity-60">{loading ? "Memeriksa akses..." : "Masuk"}</button></form></div></div>
  </section></main>;
}
