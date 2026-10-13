"use client";

import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    if (!supabaseConfigured()) {
      setError("Supabase belum dikonfigurasi. Isi .env.local sebelum login.");
      setLoading(false);
      return;
    }

    const { error: authError } = await createClient().auth.signInWithPassword({ email, password });
    if (authError) {
      setError("Email atau kata sandi tidak cocok.");
      setLoading(false);
      return;
    }

    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <main className="login-stage flex min-h-[100dvh] items-center justify-center p-3 sm:p-5 lg:p-8">
      <section className="login-card grid w-full max-w-[82rem] overflow-hidden rounded-[.7rem] border border-[#a99df2] bg-white shadow-[0_1.5rem_4rem_rgba(62,43,170,.2)] md:min-h-[calc(100dvh-4rem)] md:grid-cols-[minmax(22rem,1fr)_minmax(27rem,1fr)]" aria-labelledby="login-title">
        <div className="login-paper flex items-center bg-white">
          <div className="login-paper-content mx-auto w-full max-w-[27rem] px-7 py-12 sm:px-12 md:px-14 lg:px-16">
            <header className="mb-10 flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center" aria-hidden="true"><Image src="/logo.png" alt="" width={52} height={52} className="h-full w-full object-contain" /></span>
              <div>
                <p className="text-sm font-extrabold tracking-tight text-ink">SD Negeri Dukuhwaru 01</p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[.18em] text-ink/45">Admin microsite</p>
              </div>
            </header>

            <div className="mb-8">
              <p className="whitespace-nowrap text-[clamp(1.25rem,3vw,1.8rem)] font-extrabold leading-tight tracking-[-.03em] text-ink">Masuk ke akun admin</p>
              <p id="login-title" className="mt-2 max-w-[20rem] text-xs leading-5 text-ink/50">Masuk untuk mengelola informasi dan tampilan microsite sekolah.</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="sr-only">Email admin</span>
                <span className="relative block">
                  <Mail size={16} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
                  <input name="email" type="email" autoComplete="email" required placeholder="Email admin" className="h-[3.1rem] w-full rounded-[.3rem] border border-ink/25 bg-white pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-ink/45 focus:border-[#6048e8] focus:ring-4 focus:ring-[#6048e8]/10" />
                </span>
              </label>
              <label className="block">
                <span className="sr-only">Kata sandi</span>
                <span className="relative block">
                  <LockKeyhole size={16} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
                  <input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required placeholder="Kata sandi" className="h-[3.1rem] w-full rounded-[.3rem] border border-ink/25 bg-white pl-11 pr-12 text-sm text-ink outline-none transition placeholder:text-ink/45 focus:border-[#6048e8] focus:ring-4 focus:ring-[#6048e8]/10" />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded text-ink/45 transition hover:bg-[#6048e8]/10 hover:text-[#6048e8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#6048e8]" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </label>
              {error && <p role="alert" className="rounded-[.3rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold leading-5 text-red-800">{error}</p>}
              <button type="submit" disabled={loading} className="flex min-h-[3.1rem] w-full items-center justify-center rounded-[.3rem] bg-[#6048e8] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(96,72,232,.2)] transition hover:bg-[#5138d5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6048e8] disabled:cursor-wait disabled:opacity-60">
                {loading ? "Memeriksa akses..." : "Masuk ke dashboard"}
              </button>
            </form>
          </div>
        </div>

        <div className="login-visual relative min-h-[26rem] overflow-hidden md:min-h-0" aria-label="Foto kegiatan SD Negeri Dukuhwaru 01">
          <div className="login-visual-pattern absolute inset-0" aria-hidden="true" />
          <div className="login-visual-content relative z-10 flex h-full flex-col justify-start px-7 py-8 sm:px-12 sm:py-12">
            <div className="max-w-[23rem] text-white">
              <p className="text-[clamp(1.75rem,3.5vw,2.55rem)] font-extrabold leading-[1.15] tracking-[-.03em]">Hadirkan Informasi Sekolah<br />yang Lebih Baik.</p>
              <p className="mt-3 text-sm leading-6 text-white/75 lg:whitespace-nowrap">Informasi sekolah yang rapi, mudah diperbarui, dan siap dibagikan.</p>
            </div>
            <div className="login-visual-window relative mx-auto mt-7 w-full max-w-[33rem] overflow-hidden rounded-xl border border-white/35 bg-white/15 p-2 shadow-[0_1.5rem_3rem_rgba(26,12,111,.28)] backdrop-blur-md">
              <div className="login-visual-photo relative min-h-[15rem] overflow-hidden rounded-lg sm:min-h-[20rem]" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
