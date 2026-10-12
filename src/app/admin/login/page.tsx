"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <main className="flex min-h-[100dvh] items-center justify-center bg-paper px-4 py-8 sm:px-6">
      <div className="w-full max-w-[27.5rem]">
        <header className="mb-8 flex items-center gap-3 px-1">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-moss text-sm font-extrabold text-white">01</span>
          <div>
            <p className="text-[15px] font-extrabold tracking-tight text-ink">SD Negeri Dukuhwaru 01</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[.18em] text-ink/45">Admin microsite</p>
          </div>
        </header>

        <section className="rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-soft sm:p-8" aria-labelledby="login-title">
          <div className="mb-8">
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-moss/10 text-moss" aria-hidden="true"><LockKeyhole size={20} /></span>
            <h1 id="login-title" className="font-display text-[clamp(1.8rem,5vw,2rem)] leading-tight tracking-tight text-ink">Selamat datang kembali.</h1>
            <p className="mt-2 max-w-[19rem] text-sm leading-6 text-ink/55">Masuk untuk memperbarui informasi yang tampil di microsite sekolah.</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-ink">Email admin</span>
              <input name="email" type="email" autoComplete="email" required placeholder="admin@sekolah.id" className="h-12 w-full rounded-xl border border-ink/15 bg-paper/50 px-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-moss focus:ring-4 focus:ring-moss/10" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-ink">Kata sandi</span>
              <input name="password" type="password" autoComplete="current-password" required placeholder="Masukkan kata sandi" className="h-12 w-full rounded-xl border border-ink/15 bg-paper/50 px-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-moss focus:ring-4 focus:ring-moss/10" />
            </label>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold leading-5 text-red-800">{error}</p>}
            <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-moss px-4 text-sm font-bold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss disabled:cursor-wait disabled:opacity-60">
              {loading ? "Memeriksa akses..." : "Masuk ke dashboard"}
              {!loading && <ArrowRight size={17} aria-hidden="true" />}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-ink/45">Akun admin dibuat secara terkontrol melalui Supabase Auth. Pendaftaran publik tidak tersedia.</p>
        </section>

        <p className="mt-6 text-center text-xs text-ink/40">Microsite Builder <span aria-hidden="true">·</span> v0.1</p>
      </div>
    </main>
  );
}
