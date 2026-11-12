"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Check existing session or auth event from recovery link
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setValidSession(true);
        setVerifying(false);
        return;
      }

      // Check onAuthStateChange for PASSWORD_RECOVERY
      const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && newSession)) {
          setValidSession(true);
          setVerifying(false);
        }
      });

      // Allow a few seconds for Supabase client to parse URL hash/code
      const timeout = setTimeout(async () => {
        const { data: { session: delayedSession } } = await supabase.auth.getSession();
        if (delayedSession) {
          setValidSession(true);
        } else {
          setValidSession(false);
        }
        setVerifying(false);
      }, 2500);

      return () => {
        authListener.subscription.unsubscribe();
        clearTimeout(timeout);
      };
    }

    void checkSession();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (password !== confirmation) {
      setError("Konfirmasi kata sandi tidak sama.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw new Error(updateError.message || "Gagal memperbarui kata sandi.");
      }

      // Sync must_change_password via change-password API or session
      await fetch("/api/komunitas-belajar/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, confirmation }),
      }).catch(() => undefined);

      // Sign out recovery session so they log in fresh with new credentials
      await supabase.auth.signOut().catch(() => undefined);

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan kata sandi baru.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f8ff] px-5 py-10 text-[#173253] sm:px-8">
      <section className="w-full max-w-xl rounded-[2rem] border border-[#dbe7f5] bg-white p-7 shadow-[0_24px_70px_rgba(23,83,158,.14)] sm:p-12" aria-labelledby="reset-password-title">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={48} height={48} className="h-12 w-12 object-contain" />
          <div>
            <p className="text-sm font-extrabold text-[#153d70]">SD Negeri Dukuhwaru 01</p>
            <p className="text-xs text-[#6683a6]">Komunitas Belajar Guru</p>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">Pemulihan Akun</p>
          <h1 id="reset-password-title" className="mt-2 text-3xl font-extrabold tracking-tight text-[#173253]">
            Tetapkan Kata Sandi Baru
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#6683a6]">
            Buat kata sandi baru untuk akun Komunitas Belajar Anda. Minimal 8 karakter.
          </p>
        </div>

        {verifying ? (
          <div className="mt-8 space-y-4 text-center py-6">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#1264c5] border-t-transparent" />
            <p className="text-sm font-semibold text-[#536f92]">Memverifikasi tautan pemulihan...</p>
          </div>
        ) : success ? (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900 space-y-3 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-xl font-extrabold text-emerald-900">Kata Sandi Berhasil Diperbarui!</h2>
              <p className="leading-6 text-emerald-800">
                Kata sandi baru Anda telah aktif. Silakan masuk menggunakan NIP/NIK dan kata sandi baru Anda.
              </p>
            </div>
            <Link
              href="/komunitas-belajar/login"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0b5fc3] px-5 text-sm font-bold text-white transition hover:bg-[#084e9f]"
            >
              Masuk Sekarang
            </Link>
          </div>
        ) : !validSession ? (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900 space-y-3">
              <div className="flex items-center gap-2 font-bold text-red-800 text-base">
                <AlertCircle size={20} className="shrink-0 text-red-600" />
                Tautan Tidak Valid atau Kedaluwarsa
              </div>
              <p className="leading-6 text-xs text-red-800">
                Tautan pemulihan ini sudah tidak berlaku atau telah digunakan sebelumnya. Untuk alasan keamanan, tautan pemulihan hanya dapat digunakan satu kali.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/komunitas-belajar/lupa-password"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0b5fc3] px-4 text-sm font-bold text-white transition hover:bg-[#084e9f]"
              >
                Kirim Ulang Tautan Pemulihan
              </Link>
              <Link
                href="/komunitas-belajar/login"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#bfd2e8] px-4 text-sm font-bold text-[#34577f] hover:bg-[#f8fbff]"
              >
                Kembali ke Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[#34577f]">Kata Sandi Baru</span>
              <div className="relative">
                <input
                  name="password"
                  required
                  minLength={8}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Minimal 8 karakter"
                  className="h-12 w-full rounded-xl border border-[#bfd2e8] bg-white px-4 pr-12 text-sm outline-none transition placeholder:text-[#9ab0c8] focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-[#6683a6] hover:bg-[#edf4ff] hover:text-[#1264c5]"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[#34577f]">Ulangi Kata Sandi Baru</span>
              <div className="relative">
                <input
                  name="confirmation"
                  required
                  minLength={8}
                  type={showConfirmation ? "text" : "password"}
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Ketik ulang kata sandi baru"
                  className="h-12 w-full rounded-xl border border-[#bfd2e8] bg-white px-4 pr-12 text-sm outline-none transition placeholder:text-[#9ab0c8] focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmation((v) => !v)}
                  className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-[#6683a6] hover:bg-[#edf4ff] hover:text-[#1264c5]"
                  aria-label={showConfirmation ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0b5fc3] px-4 text-sm font-bold text-white transition hover:bg-[#084e9f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5fc3] disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? (
                "Menyimpan kata sandi..."
              ) : (
                <>
                  <KeyRound size={17} /> Simpan Kata Sandi Baru
                </>
              )}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

