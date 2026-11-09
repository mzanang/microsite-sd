"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CommunityLoginCard() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/komunitas-belajar/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ login_identifier: form.get("login_identifier"), password: form.get("password") }) });
      const result = await response.json().catch(() => ({})) as { error?: string; ok?: boolean };
      if (!response.ok || !result.ok) throw new Error(result.error || "Login gagal.");
      router.push("/komunitas-belajar/dashboard");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login gagal.");
      setLoading(false);
    }
  }

  return <div><div className="text-center"><h2 className="text-2xl font-extrabold tracking-tight text-[#173253]">Selamat Datang</h2><p className="mt-2 text-xs leading-5 text-[#71849b]">Masuk ke Komunitas Belajar Guru<br />SD Negeri Dukuhwaru 01</p></div><form onSubmit={submit} className="mt-6 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold text-[#34577f]">NIP / NIK</span><input name="login_identifier" required autoComplete="username" inputMode="numeric" className="h-11 w-full rounded-xl border border-[#cbd9e8] bg-white px-3 text-sm outline-none placeholder:text-[#9ab0c8] focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10" placeholder="Masukkan NIP atau NIK" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-[#34577f]">Kata sandi</span><input name="password" required type="password" autoComplete="current-password" className="h-11 w-full rounded-xl border border-[#cbd9e8] bg-white px-3 text-sm outline-none placeholder:text-[#9ab0c8] focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10" placeholder="Masukkan kata sandi" /></label>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-800">{error}</p>}<button type="submit" disabled={loading} className="flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0b5fc3] px-4 text-sm font-bold text-white hover:bg-[#084e9f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5fc3] disabled:cursor-wait disabled:opacity-60">{loading ? "Memeriksa akses..." : "Masuk"}</button></form><div className="mt-4 flex justify-end text-xs"><Link href="/komunitas-belajar/login" className="font-bold text-[#1264c5] hover:underline">Bantuan login</Link></div><p className="mt-5 rounded-xl border border-[#c8dcf4] bg-[#edf6ff] px-3 py-2.5 text-[11px] leading-5 text-[#557291]">Akun dibuat oleh Super Admin. Tidak tersedia pendaftaran mandiri.</p></div>;
}
