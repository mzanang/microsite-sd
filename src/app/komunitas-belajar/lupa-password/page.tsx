"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, HelpCircle, Mail, Send } from "lucide-react";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [needsAdminHelp, setNeedsAdminHelp] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setNeedsAdminHelp(false);

    const cleanIdentifier = identifier.replace(/\D/g, "");
    if (!cleanIdentifier || !/^\d{4,32}$/.test(cleanIdentifier)) {
      setError("NIP atau NIK hanya boleh berisi angka (4–32 digit).");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/komunitas-belajar/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ login_identifier: cleanIdentifier }),
      });

      const result = await response.json().catch(() => ({})) as {
        ok?: boolean;
        error?: string;
        message?: string;
        has_recovery_email?: boolean;
      };

      if (!response.ok || !result.ok) {
        setError(result.error || "Gagal memproses pemulihan kata sandi.");
        if (result.has_recovery_email === false) {
          setNeedsAdminHelp(true);
        }
        return;
      }

      setSuccessMessage(result.message || "Tautan pemulihan berhasil dikirim ke email pemulihan Anda.");
    } catch {
      setError("Terjadi gangguan jaringan atau server. Silakan coba beberapa saat lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f8ff] px-5 py-10 text-[#173253] sm:px-8">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] border border-[#dbe7f5] bg-white shadow-[0_24px_70px_rgba(23,83,158,.14)] md:grid-cols-[.9fr_1.1fr]" aria-labelledby="forgot-password-title">
        {/* Left Side Decoration */}
        <div className="relative hidden overflow-hidden bg-[#0b5fc3] p-10 text-white md:block">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full border-[28px] border-white/10" aria-hidden="true" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <Image src="/logo.png" alt="" width={64} height={64} className="h-16 w-16 object-contain" />
              <p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-[#cfe6ff]">SD Negeri Dukuhwaru 01</p>
              <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-[-.04em]">
                Pemulihan Akses Akun Komunitas Belajar.
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-7 text-white/75">
                Sistem akan mengirimkan instruksi dan tautan pemulihan ke alamat email yang telah didaftarkan pada profil Anda.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 text-xs leading-5 text-white/80">
              Keamanan Anda terlindungi: pemetaan identitas dan email tidak pernah diungkap secara publik.
            </div>
          </div>
        </div>

        {/* Right Side Form */}
        <div className="p-7 sm:p-12">
          <Link
            href="/komunitas-belajar/login"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#1970d2] hover:underline"
          >
            <ArrowLeft size={16} /> Kembali ke halaman login
          </Link>

          <div className="mt-10">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">Bantuan Masuk</p>
            <h2 id="forgot-password-title" className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#173253]">
              Lupa kata sandi?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6683a6]">
              Masukkan NIP atau NIK Anda untuk menerima tautan pemulihan kata sandi.
            </p>

            {successMessage ? (
              <div className="mt-6 space-y-5">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 space-y-3">
                  <div className="flex items-center gap-2 font-extrabold text-emerald-800 text-base">
                    <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                    Tautan Pemulihan Terkirim
                  </div>
                  <p className="leading-6">{successMessage}</p>
                  <p className="text-xs text-emerald-700">
                    Buka email Anda dan klik tautan di dalamnya untuk menetapkan password baru. Tautan ini berlaku terbatas.
                  </p>
                </div>
                <Link
                  href="/komunitas-belajar/login"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0b5fc3] px-4 text-sm font-bold text-white transition hover:bg-[#084e9f]"
                >
                  Kembali ke Halaman Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#34577f]">NIP / NIK</span>
                  <input
                    name="login_identifier"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, ""))}
                    autoComplete="username"
                    inputMode="numeric"
                    pattern="[0-9]{4,32}"
                    minLength={4}
                    maxLength={32}
                    className="h-12 w-full rounded-xl border border-[#bfd2e8] bg-white px-4 text-sm outline-none transition placeholder:text-[#9ab0c8] focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10"
                    placeholder="Masukkan NIP atau NIK terdaftar"
                  />
                  <span className="mt-2 block text-xs text-[#6683a6]">
                    Hanya angka tanpa spasi atau tanda hubung.
                  </span>
                </label>

                {error && (
                  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-red-800">
                      <AlertCircle size={18} className="text-red-600 shrink-0" />
                      Pemberitahuan
                    </div>
                    <p className="text-xs leading-5">{error}</p>
                  </div>
                )}

                {needsAdminHelp && (
                  <div className="rounded-xl border border-[#dbe7f5] bg-[#f8fbff] p-4 text-xs leading-5 text-[#34577f] space-y-2">
                    <div className="flex items-center gap-2 font-bold text-[#102d62]">
                      <HelpCircle size={16} className="text-[#1264c5]" />
                      Panduan Bantuan Super Admin
                    </div>
                    <p>
                      Karena akun Anda dibuat oleh sekolah, Super Admin dapat melakukan reset kata sandi langsung dari panel manajemen pengguna dan memberikan password sementara baru kepada Anda.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0b5fc3] px-4 text-sm font-bold text-white transition hover:bg-[#084e9f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5fc3] disabled:cursor-wait disabled:opacity-60"
                >
                  {loading ? (
                    "Memproses..."
                  ) : (
                    <>
                      <Send size={16} /> Kirim Tautan Pemulihan
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

