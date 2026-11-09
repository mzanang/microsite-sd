"use client";

import { FormEvent, useEffect, useState } from "react";

type UserRole = "kepala_sekolah" | "guru" | "pengawas_dabin";
type User = { id: string; full_name: string; login_identifier: string | null; role: UserRole | "super_admin"; teacher_type: string | null; public_title: string | null; is_active: boolean; is_public: boolean; must_change_password: boolean; created_at: string };

const roleLabels: Record<User["role"], string> = { super_admin: "Super Admin", kepala_sekolah: "Kepala Sekolah", guru: "Guru", pengawas_dabin: "Pengawas Dabin" };

export function UserManagement({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (users.length) return;
    let active = true;
    fetch("/api/komunitas-belajar/users", { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) as { users?: User[] } }))
      .then(({ ok, body }) => { if (active && ok && body.users) setUsers(body.users); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [users.length]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/komunitas-belajar/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        full_name: form.get("full_name"), login_identifier: form.get("login_identifier"), role: form.get("role"), temporary_password: form.get("temporary_password"), teacher_type: form.get("teacher_type"), public_title: form.get("public_title"), is_public: form.get("is_public") === "on",
      }) });
      const result = await response.json().catch(() => ({})) as { error?: string; ok?: boolean };
      if (!response.ok || !result.ok) throw new Error(result.error || "Pengguna gagal dibuat.");
      setMessage("Pengguna berhasil dibuat. Sampaikan NIP/NIK dan kata sandi awal secara aman kepada pengguna.");
      event.currentTarget.reset();
      const refresh = await fetch("/api/komunitas-belajar/users", { cache: "no-store" });
      const refreshed = await refresh.json().catch(() => ({})) as { users?: User[] };
      if (refresh.ok && refreshed.users) setUsers(refreshed.users);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Pengguna gagal dibuat.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]"><section className="rounded-2xl border border-[#dbe7f5] bg-white p-6 shadow-[0_10px_25px_rgba(23,83,158,.05)] sm:p-7" aria-labelledby="add-user-title"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Akun baru</p><h2 id="add-user-title" className="mt-2 text-xl font-extrabold text-[#173f70]">Tambahkan pengguna</h2><p className="mt-2 text-sm leading-6 text-[#6683a6]">Password awal hanya dipakai saat login pertama dan wajib diganti oleh pengguna.</p><form onSubmit={submit} className="mt-6 space-y-4"><Field label="Nama lengkap" name="full_name" placeholder="Contoh: Siti Aminah, S.Pd" required /><Field label="NIP / NIK" name="login_identifier" placeholder="Masukkan NIP atau NIK" required inputMode="numeric" /><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Peran</span><select name="role" defaultValue="guru" className="h-12 w-full rounded-xl border border-[#bfd2e8] bg-white px-3 text-sm outline-none focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10"><option value="kepala_sekolah">Kepala Sekolah</option><option value="guru">Guru</option><option value="pengawas_dabin">Pengawas Dabin</option></select></label><Field label="Jenis guru (opsional)" name="teacher_type" placeholder="Contoh: Guru Kelas" /><Field label="Jabatan atau keterangan publik (opsional)" name="public_title" placeholder="Contoh: Wali Kelas VI" /><Field label="Kata sandi awal" name="temporary_password" type="password" placeholder="Minimal 8 karakter" required autoComplete="new-password" /><label className="flex min-h-12 items-center gap-3 rounded-xl bg-[#f4f8ff] px-4"><input name="is_public" type="checkbox" className="h-4 w-4 accent-[#1970d2]" /><span><span className="block text-sm font-bold text-[#34577f]">Tampilkan profil di halaman publik</span><span className="block text-xs leading-5 text-[#6683a6]">Jangan aktifkan jika data belum boleh dipublikasikan.</span></span></label>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800">{error}</p>}{message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-800">{message}</p>}<button type="submit" disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0b5fc3] px-4 text-sm font-bold text-white hover:bg-[#084e9f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5fc3] disabled:cursor-wait disabled:opacity-60">{loading ? "Menyimpan pengguna..." : "Buat pengguna"}</button></form></section><section className="rounded-2xl border border-[#dbe7f5] bg-white p-6 shadow-[0_10px_25px_rgba(23,83,158,.05)] sm:p-7" aria-labelledby="user-list-title"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Pengguna terdaftar</p><h2 id="user-list-title" className="mt-2 text-xl font-extrabold text-[#173f70]">Daftar akses</h2></div><span className="text-sm font-semibold text-[#6683a6]">{users.length} akun</span></div><div className="mt-5 space-y-3">{users.length ? users.map((user) => <article key={user.id} className="rounded-xl border border-[#e1eaf4] px-4 py-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-bold text-[#173f70]">{user.full_name}</h3><p className="mt-1 text-sm text-[#6683a6]">{user.login_identifier || "Tanpa NIP/NIK"}</p></div><span className="w-fit rounded-lg bg-[#edf4ff] px-2.5 py-1 text-xs font-bold text-[#1264c5]">{roleLabels[user.role]}</span></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-[#6683a6]"><span>{user.is_active ? "Aktif" : "Nonaktif"}</span><span>{user.must_change_password ? "Menunggu ganti password" : "Password sudah diganti"}</span>{user.is_public && <span>Profil publik</span>}</div></article>) : <div className="rounded-xl border border-dashed border-[#b9cfe7] bg-[#f8fbff] px-5 py-8 text-center text-sm text-[#6683a6]">Belum ada pengguna operasional.</div>}</div></section></div>;
}

function Field({ label, name, placeholder, required, type = "text", inputMode, autoComplete }: { label: string; name: string; placeholder: string; required?: boolean; type?: string; inputMode?: "numeric" | "text"; autoComplete?: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">{label}</span><input name={name} required={required} type={type} inputMode={inputMode} autoComplete={autoComplete} placeholder={placeholder} className="h-12 w-full rounded-xl border border-[#bfd2e8] bg-white px-4 text-sm outline-none placeholder:text-[#9ab0c8] focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10" /></label>;
}
