"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ChangeCommunityPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    if (password.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }

    if (password !== confirmation) {
      setError("Konfirmasi password baru tidak sama.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/komunitas-belajar/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, confirmation }),
      });
      const result = await response.json().catch(() => ({})) as {
        error?: string;
        ok?: boolean;
        role?: string;
        community_position?: string | null;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Password gagal diperbarui.");
      }

      const destination =
        result.role === "super_admin"
          ? "/admin/dashboard"
          : result.role === "kepala_sekolah"
          ? "/komunitas-belajar/ks/dashboard"
          : result.role === "pengawas_dabin"
          ? "/komunitas-belajar/pengawas/dashboard"
          : result.community_position === "ketua"
          ? "/komunitas-belajar/ketua/dashboard"
          : result.community_position === "sekretaris"
          ? "/komunitas-belajar/sekretaris/dashboard"
          : "/komunitas-belajar/anggota/dashboard";

      router.push(destination);
      router.refresh();
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "Password gagal diperbarui.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f8ff] px-5 py-10 text-[#173253] sm:px-8">
      <section className="w-full max-w-xl rounded-[2rem] border border-[#dbe7f5] bg-white p-7 shadow-[0_24px_70px_rgba(23,83,158,.14)] sm:p-12" aria-labelledby="change-password-title">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={48} height={48} className="h-12 w-12 object-contain" />
          <div>
            <p className="text-sm font-extrabold text-[#153d70]">SD Negeri Dukuhwaru 01</p>
            <p className="text-xs text-[#6683a6]">Komunitas Belajar Guru</p>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2 rounded-xl bg-[#fff8eb] border border-[#fde1b0] p-3 text-xs leading-5 text-[#92680d]">
          <ShieldAlert size={18} className="shrink-0 text-[#d77a00]" />
          <span>Akun Anda menggunakan password sementara. Silakan buat password baru sebelum melanjutkan.</span>
        </div>

        <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">Keamanan akun</p>
        <h1 id="change-password-title" className="mt-2 text-3xl font-extrabold tracking-tight text-[#173253]">
          Ganti password wajib
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#6683a6]">
          Password baru minimal 8 karakter. Setelah disimpan, Anda dapat menggunakan password ini untuk login selanjutnya.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#34577f]">Password baru</span>
            <div className="relative">
              <input
                name="password"
                required
                minLength={8}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                className="h-12 w-full rounded-xl border border-[#bfd2e8] bg-white px-4 pr-12 text-sm outline-none transition placeholder:text-[#9ab0c8] focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-[#6683a6] hover:bg-[#edf4ff] hover:text-[#1264c5]"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#34577f]">Ulangi password baru</span>
            <div className="relative">
              <input
                name="confirmation"
                required
                minLength={8}
                type={showConfirmation ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Ketik ulang password baru"
                className="h-12 w-full rounded-xl border border-[#bfd2e8] bg-white px-4 pr-12 text-sm outline-none transition placeholder:text-[#9ab0c8] focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmation((v) => !v)}
                className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-[#6683a6] hover:bg-[#edf4ff] hover:text-[#1264c5]"
                aria-label={showConfirmation ? "Sembunyikan password" : "Tampilkan password"}
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
            {loading ? "Menyimpan password baru..." : <><KeyRound size={17} /> Simpan password baru</>}
          </button>
        </form>

        <form action="/api/komunitas-belajar/auth/logout" method="post" className="mt-6 text-center">
          <button type="submit" className="text-sm font-bold text-[#6683a6] transition hover:text-[#1970d2]">
            Keluar dari akun
          </button>
        </form>
      </section>
    </main>
  );
}
