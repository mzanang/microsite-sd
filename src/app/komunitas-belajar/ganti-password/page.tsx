"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangeCommunityPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/komunitas-belajar/auth/change-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: form.get("password"), confirmation: form.get("confirmation") }) });
      const result = await response.json().catch(() => ({})) as { error?: string; ok?: boolean };
      if (!response.ok || !result.ok) throw new Error(result.error || "Password gagal diperbarui.");
      router.push("/komunitas-belajar/dashboard");
      router.refresh();
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "Password gagal diperbarui.");
      setLoading(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#f4f8ff] px-5 py-10 text-[#173253] sm:px-8"><section className="w-full max-w-xl rounded-[2rem] border border-[#dbe7f5] bg-white p-7 shadow-[0_24px_70px_rgba(23,83,158,.14)] sm:p-12" aria-labelledby="change-password-title"><div className="flex items-center gap-3"><Image src="/logo.png" alt="" width={48} height={48} className="h-12 w-12 object-contain" /><div><p className="text-sm font-extrabold text-[#153d70]">SD Negeri Dukuhwaru 01</p><p className="text-xs text-[#6683a6]">Komunitas Belajar Guru</p></div></div><p className="mt-10 text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">Keamanan akun</p><h1 id="change-password-title" className="mt-3 text-3xl font-extrabold tracking-tight">Ganti password terlebih dahulu</h1><p className="mt-3 text-sm leading-6 text-[#6683a6]">Password ini dibuat sementara oleh admin. Buat password pribadi sebelum melanjutkan ke dashboard.</p><form onSubmit={submit} className="mt-8 space-y-5"><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Password baru</span><input name="password" required minLength={8} type="password" autoComplete="new-password" className="h-12 w-full rounded-xl border border-[#bfd2e8] bg-white px-4 text-sm outline-none focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10" /></label><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Ulangi password baru</span><input name="confirmation" required minLength={8} type="password" autoComplete="new-password" className="h-12 w-full rounded-xl border border-[#bfd2e8] bg-white px-4 text-sm outline-none focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10" /></label>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800">{error}</p>}<button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0b5fc3] px-4 text-sm font-bold text-white hover:bg-[#084e9f] disabled:cursor-wait disabled:opacity-60">{loading ? "Menyimpan..." : "Simpan password baru"}</button></form><form action="/api/komunitas-belajar/auth/logout" method="post" className="mt-5 text-center"><button type="submit" className="text-sm font-bold text-[#6683a6] hover:text-[#1970d2]">Keluar</button></form></section></main>;
}
