"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
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
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
        role?: string;
        community_position?: string | null;
        must_change_password?: boolean;
      };
      if (!response.ok || !result.ok) throw new Error(result.error || "Login gagal.");
      router.push(
        result.must_change_password
          ? "/komunitas-belajar/ganti-password"
          : result.role === "super_admin"
          ? "/admin/dashboard"
          : result.role === "kepala_sekolah"
          ? "/komunitas-belajar/ks/dashboard"
          : result.role === "pengawas_dabin"
          ? "/komunitas-belajar/pengawas/dashboard"
          : result.community_position === "ketua"
          ? "/komunitas-belajar/ketua/dashboard"
          : result.community_position === "sekretaris"
          ? "/komunitas-belajar/sekretaris/dashboard"
          : "/komunitas-belajar/anggota/dashboard"
      );
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login gagal.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F7FC] text-[#172B4D] font-[var(--font-plus-jakarta)] flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-[#125FC1] selection:text-white">
      {/* Card Wrapper (Card di Mobile & Desktop) */}
      <div className="w-full max-w-[460px] md:max-w-5xl lg:max-w-6xl overflow-hidden bg-white shadow-[0_16px_50px_rgba(18,95,193,0.08)] rounded-3xl md:rounded-[28px] border border-[#E2E8F0] grid md:grid-cols-12">
        {/* KIRI: Panel Login */}
        <section
          aria-labelledby="community-login-title"
          className="md:col-span-6 lg:col-span-7 xl:col-span-6 flex flex-col justify-between p-6 sm:p-8 md:p-10 lg:p-12 xl:p-14 bg-white"
        >
          {/* Top Navigation: Hanya Icon Kembali */}
          <div className="flex items-center justify-between">
            <Link
              href="/komunitas-belajar"
              aria-label="Kembali ke halaman publik"
              title="Kembali ke halaman publik"
              className="group inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE3ED] bg-[#F8FAFC] text-[#125FC1] shadow-xs transition duration-200 hover:border-[#125FC1] hover:bg-[#EDF4FF] hover:text-[#0D4FA8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#125FC1]"
            >
              <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>

          {/* Form Content: Terpusat (Center) */}
          <div className="my-auto py-4 sm:py-6 w-full max-w-sm sm:max-w-md mx-auto">
            {/* Header: Logo Sekolah Tanpa Card, Lebih Besar, dan Center */}
            <div className="flex flex-col items-center text-center">
              <Image
                src="/logo.png"
                alt="Logo Resmi SD Negeri Dukuhwaru 01"
                width={96}
                height={96}
                priority
                className="h-20 w-20 sm:h-24 sm:w-24 object-contain transition-transform duration-300 hover:scale-105"
              />
              <p className="mt-4 text-xs font-extrabold uppercase tracking-[.22em] text-[#125FC1]">
                SD NEGERI DUKUHWARU 01
              </p>
              <h1
                id="community-login-title"
                className="mt-2 text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#172B4D] leading-tight"
              >
                Bersama Belajar, Bersama Bertumbuh.
              </h1>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#64748B]">
                Ruang kolaborasi guru untuk berbagi praktik baik, mengelola administrasi, dan meningkatkan kualitas pembelajaran.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={submit} className="mt-6 sm:mt-7 space-y-4">
              {/* Field NIP / NIK */}
              <label className="block text-left">
                <span className="mb-2 block text-xs font-bold text-[#172B4D]">
                  NIP / NIK
                </span>
                <input
                  name="login_identifier"
                  required
                  autoComplete="username"
                  inputMode="numeric"
                  pattern="[0-9]{4,32}"
                  minLength={4}
                  maxLength={32}
                  onChange={(event) => {
                    event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "");
                  }}
                  className="h-[52px] w-full rounded-xl border border-[#DCE3ED] bg-[#F8FAFC] px-4 text-sm font-medium text-[#172B4D] outline-none transition duration-200 placeholder:text-[#94A3B8] focus:border-[#125FC1] focus:bg-white focus:ring-4 focus:ring-[#125FC1]/10"
                  placeholder="Masukkan NIP atau NIK"
                  aria-describedby="login-identifier-help"
                />
                <span id="login-identifier-help" className="mt-1.5 block text-[11px] text-[#64748B]">
                  Masukkan angka NIP atau NIK tanpa spasi.
                </span>
              </label>

              {/* Field Kata Sandi */}
              <label className="block text-left">
                <span className="mb-2 block text-xs font-bold text-[#172B4D]">
                  Kata sandi
                </span>
                <span className="relative block">
                  <input
                    name="password"
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="h-[52px] w-full rounded-xl border border-[#DCE3ED] bg-[#F8FAFC] px-4 pr-12 text-sm font-medium text-[#172B4D] outline-none transition duration-200 placeholder:text-[#94A3B8] focus:border-[#125FC1] focus:bg-white focus:ring-4 focus:ring-[#125FC1]/10"
                    placeholder="Masukkan kata sandi"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#64748B] transition hover:bg-[#EDF4FF] hover:text-[#125FC1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#125FC1]"
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </span>
              </label>

              {/* Lupa Kata Sandi */}
              <div className="flex justify-end pt-0.5">
                <Link
                  href="/komunitas-belajar/lupa-password"
                  className="text-xs font-semibold text-[#125FC1] transition duration-150 hover:text-[#0D4FA8] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#125FC1]"
                >
                  Lupa kata sandi?
                </Link>
              </div>

              {/* Error Message */}
              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm font-semibold leading-relaxed text-red-800"
                >
                  {error}
                </p>
              )}

              {/* Tombol Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-[52px] w-full items-center justify-center rounded-xl bg-[#125FC1] px-4 text-sm font-bold text-white shadow-sm transition duration-200 hover:bg-[#0D4FA8] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#125FC1] disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? "Memeriksa akses..." : "Masuk ke Dashboard"}
              </button>
            </form>
          </div>

          {/* Footer: Center */}
          <footer className="pt-4 border-t border-[#F1F5F9] text-center">
            <p className="text-xs text-[#64748B]">
              © SD Negeri Dukuhwaru 01 · Komunitas Belajar
            </p>
          </footer>
        </section>

        {/* KANAN: bg_panel bagian guru (Hanya tampil di Desktop/Tablet md ke atas, tidak ada di mobile) */}
        <div className="relative hidden md:block md:col-span-6 lg:col-span-5 xl:col-span-6 bg-[#0B5FC3] overflow-hidden">
          <Image
            src="/bg_kombel.webp"
            alt="Kolaborasi Guru SD Negeri Dukuhwaru 01"
            fill
            priority
            sizes="(max-width: 1024px) 50vw, 600px"
            className="object-cover object-[88%_center] transition-transform duration-700 hover:scale-[1.02]"
          />
          {/* Soft gradient overlay */}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07244D]/80 via-[#07244D]/20 to-transparent"
            aria-hidden="true"
          />

          {/* Kutipan Komunitas Belajar */}
          <div className="relative z-10 flex h-full flex-col justify-end p-8 lg:p-10 text-white">
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-md border border-white/20 shadow-lg">
              <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#CFE6FF]">
                Komunitas Belajar Guru
              </p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-white">
                &ldquo;Belajar bersama, bertumbuh bersama, meningkatkan mutu pembelajaran untuk masa depan anak bangsa.&rdquo;
              </p>
              <p className="mt-2 text-xs text-white/80 font-medium">
                SD Negeri Dukuhwaru 01 · Kab. Tegal
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
