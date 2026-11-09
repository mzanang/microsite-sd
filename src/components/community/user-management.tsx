"use client";

import { FormEvent, useEffect, useState } from "react";

type UserRole = "kepala_sekolah" | "guru" | "pengawas_dabin";
type User = { id: string; full_name: string; login_identifier: string | null; role: UserRole | "super_admin"; teacher_type: string | null; public_title: string | null; is_active: boolean; is_public: boolean; must_change_password: boolean; created_at: string };
type TemporaryCredential = { fullName: string; password: string };

const roleLabels: Record<User["role"], string> = { super_admin: "Super Admin", kepala_sekolah: "Kepala Sekolah", guru: "Guru", pengawas_dabin: "Pengawas Dabin" };

export function UserManagement({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [temporaryCredential, setTemporaryCredential] = useState<TemporaryCredential | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resettingId, setResettingId] = useState("");

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
    setMessage(""); setError(""); setTemporaryCredential(null); setCopied(false); setLoading(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/komunitas-belajar/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ full_name: form.get("full_name"), login_identifier: form.get("login_identifier"), role: form.get("role"), teacher_type: form.get("teacher_type"), teaching_grade: form.get("teaching_grade"), public_title: form.get("public_title"), is_public: form.get("is_public") === "on" }) });
      const result = await response.json().catch(() => ({})) as { error?: string; ok?: boolean; temporary_password?: string };
      if (!response.ok || !result.ok || !result.temporary_password) throw new Error(result.error || "Pengguna gagal dibuat.");
      setMessage("Pengguna berhasil dibuat. Simpan password sementara ini dan sampaikan melalui kanal yang aman.");
      setTemporaryCredential({ fullName: String(form.get("full_name") || "Pengguna"), password: result.temporary_password });
      formElement.reset();
      const refresh = await fetch("/api/komunitas-belajar/users", { cache: "no-store" });
      const refreshed = await refresh.json().catch(() => ({})) as { users?: User[] };
      if (refresh.ok && refreshed.users) setUsers(refreshed.users);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Pengguna gagal dibuat."); } finally { setLoading(false); }
  }

  async function resetPassword(user: User) {
    if (!window.confirm(`Reset password untuk ${user.full_name}? Password lama akan langsung tidak berlaku.`)) return;
    setError(""); setMessage(""); setTemporaryCredential(null); setCopied(false); setResettingId(user.id);
    try {
      const response = await fetch(`/api/komunitas-belajar/users/${user.id}/reset-password`, { method: "POST" });
      const result = await response.json().catch(() => ({})) as { error?: string; ok?: boolean; full_name?: string; temporary_password?: string };
      if (!response.ok || !result.ok || !result.temporary_password) throw new Error(result.error || "Password gagal direset.");
      setMessage("Password berhasil direset. Password sementara hanya ditampilkan sekarang.");
      setTemporaryCredential({ fullName: result.full_name || user.full_name, password: result.temporary_password });
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, must_change_password: true } : item));
    } catch (resetError) { setError(resetError instanceof Error ? resetError.message : "Password gagal direset."); } finally { setResettingId(""); }
  }

  async function copyPassword() {
    if (!temporaryCredential) return;
    await navigator.clipboard.writeText(temporaryCredential.password);
    setCopied(true);
  }

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]"><section className="rounded-2xl border border-[#dbe7f5] bg-white p-6 shadow-[0_10px_25px_rgba(23,83,158,.05)] sm:p-7" aria-labelledby="add-user-title"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Akun baru</p><h2 id="add-user-title" className="mt-2 text-xl font-extrabold text-[#173f70]">Tambahkan pengguna</h2><p className="mt-2 text-sm leading-6 text-[#6683a6]">Password sementara dibuat otomatis dan wajib diganti saat login pertama.</p><form onSubmit={submit} className="mt-6 space-y-4"><Field label="Nama lengkap" name="full_name" placeholder="Contoh: Siti Aminah, S.Pd" required /><Field label="NIP / NIK" name="login_identifier" placeholder="Masukkan NIP atau NIK" required inputMode="numeric" /><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Peran</span><select name="role" defaultValue="guru" className="h-12 w-full rounded-xl border border-[#bfd2e8] bg-white px-3 text-sm outline-none focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10"><option value="kepala_sekolah">Kepala Sekolah</option><option value="guru">Guru</option><option value="pengawas_dabin">Pengawas Dabin</option></select></label><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Jenis guru</span><select name="teacher_type" defaultValue="Guru Kelas" className="h-12 w-full rounded-xl border border-[#bfd2e8] bg-white px-3 text-sm outline-none focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10"><option value="Guru Kelas">Guru Kelas</option><option value="Guru Mapel">Guru Mapel</option></select></label><Field label="Kelas yang diampu (opsional)" name="teaching_grade" placeholder="Contoh: 1 atau 6" inputMode="numeric" /><Field label="Jabatan atau keterangan publik (opsional)" name="public_title" placeholder="Contoh: Wali Kelas VI" /><div className="rounded-xl bg-[#f4f8ff] px-4 py-3 text-sm leading-6 text-[#6683a6]">Password sementara akan ditampilkan satu kali setelah akun berhasil dibuat.</div><label className="flex min-h-12 items-center gap-3 rounded-xl bg-[#f4f8ff] px-4"><input name="is_public" type="checkbox" className="h-4 w-4 accent-[#1970d2]" /><span><span className="block text-sm font-bold text-[#34577f]">Tampilkan profil di halaman publik</span><span className="block text-xs leading-5 text-[#6683a6]">Jangan aktifkan jika data belum boleh dipublikasikan.</span></span></label>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800">{error}</p>}{message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-800">{message}</p>}{temporaryCredential && <div className="rounded-xl border border-[#9fd6b4] bg-[#effbf3] p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#247642]">Password sementara — {temporaryCredential.fullName}</p><div className="mt-3 flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#173f70]">{temporaryCredential.password}</code><button type="button" onClick={copyPassword} className="min-h-10 shrink-0 rounded-lg border border-[#9fd6b4] px-3 text-xs font-bold text-[#247642]">{copied ? "Tersalin" : "Salin"}</button></div><p className="mt-2 text-xs leading-5 text-[#247642]">Password ini tidak disimpan oleh aplikasi dalam bentuk teks biasa.</p></div>}<button type="submit" disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0b5fc3] px-4 text-sm font-bold text-white hover:bg-[#084e9f] disabled:cursor-wait disabled:opacity-60">{loading ? "Membuat pengguna..." : "Buat pengguna"}</button></form></section><section className="rounded-2xl border border-[#dbe7f5] bg-white p-6 shadow-[0_10px_25px_rgba(23,83,158,.05)] sm:p-7" aria-labelledby="user-list-title"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Pengguna terdaftar</p><h2 id="user-list-title" className="mt-2 text-xl font-extrabold text-[#173f70]">Daftar akses</h2></div><span className="text-sm font-semibold text-[#6683a6]">{users.length} akun</span></div><div className="mt-5 space-y-3">{users.length ? users.map((user) => <article key={user.id} className="rounded-xl border border-[#e1eaf4] px-4 py-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-bold text-[#173f70]">{user.full_name}</h3><p className="mt-1 text-sm text-[#6683a6]">{user.login_identifier || "Tanpa NIP/NIK"}</p></div><span className="w-fit rounded-lg bg-[#edf4ff] px-2.5 py-1 text-xs font-bold text-[#1264c5]">{roleLabels[user.role]}</span></div><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-[#6683a6]"><span>{user.is_active ? "Aktif" : "Nonaktif"}</span><span>{user.must_change_password ? "Menunggu ganti password" : "Password sudah diganti"}</span>{user.is_public && <span>Profil publik</span>}<button type="button" onClick={() => resetPassword(user)} disabled={resettingId === user.id} className="min-h-9 rounded-lg border border-[#bfd2e8] px-3 font-bold text-[#1264c5] hover:border-[#1970d2] hover:bg-[#edf4ff] disabled:cursor-wait disabled:opacity-60">{resettingId === user.id ? "Mereset..." : "Reset password"}</button></div></article>) : <div className="rounded-xl border border-dashed border-[#b9cfe7] bg-[#f8fbff] px-5 py-8 text-center text-sm text-[#6683a6]">Belum ada pengguna operasional.</div>}</div></section></div>;
}

function Field({ label, name, placeholder, required, type = "text", inputMode, autoComplete }: { label: string; name: string; placeholder: string; required?: boolean; type?: string; inputMode?: "numeric" | "text"; autoComplete?: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">{label}</span><input name={name} required={required} type={type} inputMode={inputMode} autoComplete={autoComplete} placeholder={placeholder} className="h-12 w-full rounded-xl border border-[#bfd2e8] bg-white px-4 text-sm outline-none placeholder:text-[#9ab0c8] focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10" /></label>;
}
