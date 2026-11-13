"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Check, ClipboardCopy, Eye, EyeOff, KeyRound, Pencil, Plus, ShieldAlert, Trash2, X } from "lucide-react";

type UserRole = "kepala_sekolah" | "guru" | "pengawas_dabin";
type CommunityPosition = "ketua" | "sekretaris" | "anggota";
type User = {
  id: string;
  full_name: string;
  login_identifier: string | null;
  role: UserRole | "super_admin";
  teacher_type: string | null;
  teaching_subject: string | null;
  teaching_grade: number | null;
  teaching_grades: number[];
  public_title: string | null;
  community_position: CommunityPosition | null;
  is_active: boolean;
  is_public: boolean;
  must_change_password: boolean;
  recovery_email?: string | null;
  recovery_email_verified?: boolean;
  created_at: string;
};
type TemporaryCredential = { fullName: string; loginIdentifier: string; password: string };
type EditForm = {
  full_name: string;
  login_identifier: string;
  role: UserRole;
  teacher_type: string;
  teaching_subject: string;
  teaching_grade: string;
  teaching_grades: string[];
  public_title: string;
  community_position: CommunityPosition;
  recovery_email: string;
  is_active: boolean;
  is_public: boolean;
};

const roleLabels: Record<User["role"], string> = { super_admin: "Super Admin", kepala_sekolah: "Kepala Sekolah", guru: "Guru", pengawas_dabin: "Pengawas Dabin" };
const positionLabels: Record<CommunityPosition, string> = { ketua: "Ketua", sekretaris: "Sekretaris", anggota: "Anggota" };
const grades = [1, 2, 3, 4, 5, 6];

export function UserManagement({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [createOpen, setCreateOpen] = useState(false);
  const [createRole, setCreateRole] = useState<UserRole>("guru");
  const [createPosition, setCreatePosition] = useState<CommunityPosition>("anggota");
  const [createTeacherType, setCreateTeacherType] = useState("Guru Kelas");
  const [createSubject, setCreateSubject] = useState("PAIBP");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [createCredential, setCreateCredential] = useState<TemporaryCredential | null>(null);
  const [resetCredential, setResetCredential] = useState<TemporaryCredential | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [resettingId, setResettingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [confirmResetUser, setConfirmResetUser] = useState<User | null>(null);

  useEffect(() => {
    if (users.length) return;
    let active = true;
    fetch("/api/komunitas-belajar/users", { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) as { users?: User[] } }))
      .then(({ ok, body }) => { if (active && ok && body.users) setUsers(body.users); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [users.length]);

  function beginEdit(user: User) {
    if (user.role === "super_admin") return;
    setError(""); setMessage("");
    const teacherType = user.teacher_type === "Guru Mapel" ? "Guru Mapel" : "Guru Kelas";
    setEditingId(user.id);
    setEditForm({ full_name: user.full_name, login_identifier: user.login_identifier ?? "", role: user.role, teacher_type: teacherType, teaching_subject: user.teaching_subject ?? "PAIBP", teaching_grade: user.teaching_grade ? String(user.teaching_grade) : "", teaching_grades: (user.teaching_grades?.length ? user.teaching_grades : user.teaching_grade ? [user.teaching_grade] : grades).map(String), public_title: user.public_title ?? "", community_position: user.community_position ?? "anggota", recovery_email: user.recovery_email ?? "", is_active: user.is_active, is_public: user.is_public });
  }

  function cancelEdit() { setEditingId(null); setEditForm(null); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(""); setError(""); setCreateCredential(null); setCopied(false); setLoading(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const role = String(form.get("role") || "guru") as UserRole;
    try {
      const response = await fetch("/api/komunitas-belajar/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ full_name: form.get("full_name"), login_identifier: form.get("login_identifier"), role, teacher_type: form.get("teacher_type") || undefined, teaching_subject: form.get("teaching_subject") || undefined, teaching_grade: form.get("teaching_grade") || undefined, teaching_grades: form.getAll("teaching_grades"), public_title: form.get("public_title") || undefined, community_position: role === "guru" ? form.get("community_position") : undefined, recovery_email: form.get("recovery_email") || undefined, is_public: form.get("is_public") === "on" }) });
      const result = await response.json().catch(() => ({})) as { error?: string; ok?: boolean; temporary_password?: string };
      if (!response.ok || !result.ok || !result.temporary_password) throw new Error(result.error || "Pengguna gagal dibuat.");
      setMessage("Pengguna berhasil dibuat dan sudah masuk ke daftar akses.");
      setCreateCredential({ fullName: String(form.get("full_name") || "Pengguna"), loginIdentifier: String(form.get("login_identifier") || ""), password: result.temporary_password });
      formElement.reset(); setCreateRole("guru"); setCreatePosition("anggota"); setCreateTeacherType("Guru Kelas"); setCreateSubject("PAIBP");
      await refreshUsers();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Pengguna gagal dibuat."); } finally { setLoading(false); }
  }

  async function refreshUsers() {
    const refresh = await fetch("/api/komunitas-belajar/users", { cache: "no-store" });
    const refreshed = await refresh.json().catch(() => ({})) as { users?: User[] };
    if (refresh.ok && refreshed.users) setUsers(refreshed.users);
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId || !editForm) return;
    setError(""); setMessage(""); setSavingEdit(true);
    try {
      const response = await fetch("/api/komunitas-belajar/users", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: editingId, ...editForm, teaching_grade: editForm.teaching_grade || null, teaching_grades: editForm.teaching_grades, community_position: editForm.role === "guru" ? editForm.community_position : null, recovery_email: editForm.recovery_email || null }) });
      const result = await response.json().catch(() => ({})) as { error?: string; ok?: boolean };
      if (!response.ok || !result.ok) throw new Error(result.error || "Perubahan pengguna gagal disimpan.");
      setMessage("Perubahan pengguna berhasil disimpan."); cancelEdit(); await refreshUsers();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Perubahan pengguna gagal disimpan."); } finally { setSavingEdit(false); }
  }

  function requestResetPassword(user: User) {
    setError(""); setMessage(""); setResetCredential(null); setCopied(false);
    setConfirmResetUser(user);
  }

  async function executeResetPassword() {
    const user = confirmResetUser;
    if (!user) return;
    setConfirmResetUser(null);
    setResettingId(user.id);
    try {
      const response = await fetch(`/api/komunitas-belajar/users/${user.id}/reset-password`, { method: "POST" });
      const result = await response.json().catch(() => ({})) as { error?: string; ok?: boolean; full_name?: string; login_identifier?: string; temporary_password?: string };
      if (!response.ok || !result.ok || !result.temporary_password) throw new Error(result.error || "Password gagal direset.");
      setResetCredential({ fullName: result.full_name || user.full_name, loginIdentifier: result.login_identifier || user.login_identifier || "", password: result.temporary_password });
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, must_change_password: true } : item));
    } catch (resetError) { setError(resetError instanceof Error ? resetError.message : "Password gagal direset."); } finally { setResettingId(""); }
  }

  async function deleteUser(user: User) {
    if (user.role === "super_admin") return;
    if (!window.confirm(`Hapus pengguna ${user.full_name}? Akun login dan profilnya akan dihapus permanen.`)) return;
    setError(""); setMessage(""); setDeletingId(user.id);
    try {
      const response = await fetch(`/api/komunitas-belajar/users/${user.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({})) as { error?: string; ok?: boolean; full_name?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Pengguna gagal dihapus.");
      setUsers((current) => current.filter((item) => item.id !== user.id));
      if (editingId === user.id) cancelEdit();
      setMessage(`Pengguna ${result.full_name || user.full_name} berhasil dihapus.`);
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Pengguna gagal dihapus."); } finally { setDeletingId(""); }
  }

  async function copyPassword(source: "create" | "reset") {
    const credential = source === "create" ? createCredential : resetCredential;
    if (!credential) return;
    await navigator.clipboard.writeText(credential.password);
    setCopied(true);
  }

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 rounded-2xl border border-[#dbe7f5] bg-white p-6 shadow-[0_10px_25px_rgba(23,83,158,.05)] sm:flex-row sm:items-center sm:justify-between sm:p-7"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Pengguna terdaftar</p><h2 className="mt-2 text-xl font-extrabold text-[#173f70]">Daftar akses</h2><p className="mt-2 text-sm leading-6 text-[#6683a6]">Kelola akun, peran, data guru, dan status akses komunitas.</p></div><button type="button" onClick={() => { setCreateOpen(true); setError(""); setMessage(""); }} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0b5fc3] px-4 text-sm font-bold text-white hover:bg-[#084e9f]"><Plus size={17} aria-hidden="true" /> Tambah pengguna</button></section>
    {(error || message) && <div className="space-y-3">{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800">{error}</p>}{message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-800">{message}</p>}</div>}
    <section className="rounded-2xl border border-[#dbe7f5] bg-white p-5 shadow-[0_10px_25px_rgba(23,83,158,.05)] sm:p-7" aria-labelledby="user-list-title"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Akun komunitas</p><h2 id="user-list-title" className="mt-2 text-xl font-extrabold text-[#173f70]">Tabel pengguna</h2></div><span className="text-sm font-semibold text-[#6683a6]">{users.length} akun</span></div><div className="mt-5 overflow-x-auto rounded-xl border border-[#e1eaf4]"><table className="w-full min-w-[1120px] text-left text-sm"><thead className="bg-[#f8fbff] text-xs uppercase tracking-[.08em] text-[#536f92]"><tr><th className="px-4 py-3 font-bold">Nama / NIP-NIK</th><th className="px-4 py-3 font-bold">Peran</th><th className="px-4 py-3 font-bold">Jenis guru</th><th className="px-4 py-3 font-bold">Kelas / mapel</th><th className="px-4 py-3 font-bold">Status</th><th className="px-4 py-3 font-bold">Aksi</th></tr></thead><tbody>{users.length ? users.map((user) => <UserRow key={user.id} user={user} editingId={editingId} editForm={editForm} savingEdit={savingEdit} resettingId={resettingId} deletingId={deletingId} onEdit={beginEdit} onCancelEdit={cancelEdit} onSaveEdit={saveEdit} onReset={requestResetPassword} onDelete={deleteUser} onChangeEdit={setEditForm} />) : <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[#6683a6]">Belum ada pengguna operasional.</td></tr>}</tbody></table></div></section>
    {createOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#071d45]/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="add-user-title"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Akun baru</p><h2 id="add-user-title" className="mt-2 text-2xl font-extrabold text-[#173f70]">Tambahkan pengguna</h2><p className="mt-2 text-sm leading-6 text-[#6683a6]">Password sementara dibuat otomatis dan wajib diganti saat login pertama.</p></div><button type="button" onClick={() => setCreateOpen(false)} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-[#bfd2e8] text-[#6683a6]" aria-label="Tutup modal"><X size={18} /></button></div><form onSubmit={submit} className="mt-6 space-y-4"><Field label="Nama lengkap" name="full_name" placeholder="Contoh: Siti Aminah, S.Pd" required /><Field label="NIP / NIK" name="login_identifier" placeholder="Masukkan NIP atau NIK" required inputMode="numeric" pattern="[0-9]{4,32}" /><RoleField value={createRole} onChange={setCreateRole} />{createRole === "guru" && <><PositionField name="community_position" value={createPosition} onChange={setCreatePosition} /><TeacherCreateFields teacherType={createTeacherType} subject={createSubject} onTeacherTypeChange={setCreateTeacherType} onSubjectChange={setCreateSubject} /></>}{createRole === "guru" && <Field label="Jabatan atau keterangan publik (opsional)" name="public_title" placeholder="Contoh: Wali Kelas VI" />}<Field label="Email pemulihan (opsional untuk lupa password)" name="recovery_email" placeholder="Contoh: guru@gmail.com" type="email" /><div className="rounded-xl bg-[#f4f8ff] px-4 py-3 text-sm leading-6 text-[#6683a6]">Password sementara akan ditampilkan satu kali setelah akun berhasil dibuat.</div><label className="flex min-h-12 items-center gap-3 rounded-xl bg-[#f4f8ff] px-4"><input name="is_public" type="checkbox" className="h-4 w-4 accent-[#1970d2]" /><span><span className="block text-sm font-bold text-[#34577f]">Tampilkan profil di halaman publik</span><span className="block text-xs leading-5 text-[#6683a6]">Jangan aktifkan jika data belum boleh dipublikasikan.</span></span></label>{createCredential && <CredentialBox credential={createCredential} copied={copied} onCopy={() => void copyPassword("create")} />}{loading ? <button type="submit" disabled className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0b5fc3] px-4 text-sm font-bold text-white opacity-60">Membuat pengguna...</button> : <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setCreateOpen(false)} className="min-h-12 rounded-xl border border-[#bfd2e8] px-4 text-sm font-bold text-[#34577f]">Tutup</button><button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0b5fc3] px-5 text-sm font-bold text-white hover:bg-[#084e9f]">Buat pengguna</button></div>}</form></div></div>}
    {confirmResetUser && <ResetPasswordConfirmDialog user={confirmResetUser} loading={resettingId === confirmResetUser.id} onConfirm={executeResetPassword} onCancel={() => setConfirmResetUser(null)} />}
    {resetCredential && <ResetPasswordResultDialog credential={resetCredential} copied={copied} onCopy={() => void copyPassword("reset")} onClose={() => { setResetCredential(null); setCopied(false); }} />}
  </div>;
}

function ResetPasswordConfirmDialog({ user, loading, onConfirm, onCancel }: { user: User; loading: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#071d45]/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onCancel(); }}>
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="confirm-reset-title">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="absolute right-4 top-4 text-[#6683a6] hover:text-[#102d62]"
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#edf4ff] text-[#0b5fc3]">
          <KeyRound size={26} />
        </div>

        <h2 id="confirm-reset-title" className="mt-4 text-xl font-extrabold text-[#102d62]">
          Reset Password
        </h2>
        <p className="mt-2 text-xs leading-5 text-[#536f92]">
          Apakah Anda yakin ingin mereset password akun <strong className="text-[#102d62] font-bold">{user.full_name}</strong>? Password baru akan dibuat secara otomatis dan Anda akan langsung melihatnya.
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-10 flex-1 rounded-xl border border-[#bfd2e8] px-4 text-xs font-bold text-[#34577f] hover:bg-[#f8fbff] disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0b5fc3] px-4 text-xs font-bold text-white hover:bg-[#084e9f] disabled:opacity-60"
          >
            {loading ? "Mereset..." : <><KeyRound size={14} /> Reset Password</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordResultDialog({ credential, copied, onCopy, onClose }: { credential: TemporaryCredential; copied: boolean; onCopy: () => void; onClose: () => void }) {
  const [visible, setVisible] = useState(true);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#071d45]/55 p-4 backdrop-blur-sm" role="presentation">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="reset-result-title">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[#6683a6] hover:text-[#102d62]"
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#16a34a] text-white">
          <Check size={28} strokeWidth={3} />
        </div>

        <h2 id="reset-result-title" className="mt-4 text-xl font-extrabold text-[#102d62]">
          Reset Password Berhasil
        </h2>
        <p className="mt-1 text-xs text-[#6683a6]">
          Password sementara untuk akun:
        </p>

        {/* User Card */}
        <div className="mt-4 flex items-center justify-center gap-2.5 rounded-xl border border-[#e1eaf4] bg-[#f8fbff] px-4 py-3 text-xs text-[#102d62]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#dbe7f5] text-[#0b5fc3]">
            <KeyRound size={14} />
          </span>
          <span className="font-extrabold text-[#102d62]">{credential.fullName}</span>
          <span className="text-[#6683a6]">(NIP: {credential.loginIdentifier || "—"})</span>
        </div>

        {/* Green Password Box */}
        <div className="mt-3.5 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-left">
          <p className="text-[11px] font-semibold text-[#15803d]">Password Sementara:</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="font-mono text-base font-extrabold tracking-wider text-[#15803d]">
              {visible ? credential.password : "••••••••••••••••"}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#bbf7d0] bg-white text-[#15803d] hover:bg-[#e0f7e9]"
                aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
              >
                {visible ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                type="button"
                onClick={onCopy}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#bbf7d0] bg-white px-2.5 text-xs font-bold text-[#15803d] hover:bg-[#e0f7e9]"
              >
                {copied ? <><Check size={13} /> Tersalin</> : <><ClipboardCopy size={13} /> Salin</>}
              </button>
            </div>
          </div>
        </div>

        {/* Orange Warning Box */}
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#fef08a] bg-[#fefce8] p-3 text-left text-[11px] leading-5 text-[#854d0e]">
          <ShieldAlert size={16} className="shrink-0 text-[#ca8a04] mt-0.5" />
          <div>
            <p>Password ini hanya ditampilkan satu kali.</p>
            <p>Pengguna wajib mengganti password setelah login.</p>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 min-h-11 w-full rounded-xl bg-[#0b5fc3] px-6 text-sm font-bold text-white transition hover:bg-[#084e9f]"
        >
          Selesai
        </button>
      </div>
    </div>
  );
}

function UserRow({ user, editingId, editForm, savingEdit, resettingId, deletingId, onEdit, onCancelEdit, onSaveEdit, onReset, onDelete, onChangeEdit }: { user: User; editingId: string | null; editForm: EditForm | null; savingEdit: boolean; resettingId: string; deletingId: string; onEdit: (user: User) => void; onCancelEdit: () => void; onSaveEdit: (event: FormEvent<HTMLFormElement>) => Promise<void>; onReset: (user: User) => void; onDelete: (user: User) => Promise<void>; onChangeEdit: (value: EditForm | null) => void }) {
  const editing = editingId === user.id && editForm;
  return <>{<tr className="border-t border-[#edf2f8] align-top"><td className="px-4 py-4"><p className="font-bold text-[#173f70]">{user.full_name}</p><p className="mt-1 text-xs text-[#6683a6]">{user.login_identifier || "Tanpa NIP/NIK"}</p></td><td className="px-4 py-4"><span className="rounded-lg bg-[#edf4ff] px-2.5 py-1 text-xs font-bold text-[#1264c5]">{roleLabels[user.role]}</span>{user.role === "guru" && <p className="mt-2 text-xs text-[#6683a6]">{positionLabels[user.community_position ?? "anggota"]}</p>}</td><td className="px-4 py-4 text-[#536f92]">{user.role === "guru" ? user.teacher_type || "Belum diatur" : "—"}</td><td className="px-4 py-4 text-[#536f92]">{user.role !== "guru" ? "—" : user.teacher_type === "Guru Mapel" ? `${user.teaching_subject || "PAIBP"} · Kelas 1–6` : user.teaching_grade ? `Kelas ${user.teaching_grade}` : "Belum diatur"}</td><td className="px-4 py-4"><p className={`font-semibold ${user.is_active ? "text-emerald-700" : "text-slate-500"}`}>{user.is_active ? "Aktif" : "Nonaktif"}</p><p className="mt-1 text-xs text-[#6683a6]">{user.must_change_password ? "Belum ganti password" : "Password sudah diganti"}{user.is_public ? " · Publik" : ""}</p></td><td className="px-4 py-4"><div className="flex flex-wrap gap-2">{user.role !== "super_admin" && <button type="button" onClick={() => onEdit(user)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5] hover:bg-[#edf4ff]"><Pencil size={14} aria-hidden="true" /> Edit</button>}<button type="button" onClick={() => onReset(user)} disabled={resettingId === user.id || deletingId === user.id} className="min-h-9 rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5] disabled:opacity-60">{resettingId === user.id ? "Mereset..." : "Reset password"}</button>{user.role !== "super_admin" && <button type="button" onClick={() => void onDelete(user)} disabled={deletingId === user.id || resettingId === user.id} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"><Trash2 size={14} aria-hidden="true" /> {deletingId === user.id ? "Menghapus..." : "Hapus"}</button>}</div></td></tr>}{editing && <tr className="border-t border-[#edf2f8]"><td colSpan={6} className="bg-[#f8fbff] px-4 py-5"><EditUserForm form={editForm} saving={savingEdit} onCancel={onCancelEdit} onSave={onSaveEdit} onChange={onChangeEdit} /></td></tr>}</>;
}

function EditUserForm({ form, saving, onCancel, onSave, onChange }: { form: EditForm; saving: boolean; onCancel: () => void; onSave: (event: FormEvent<HTMLFormElement>) => Promise<void>; onChange: (value: EditForm | null) => void }) {
  const set = (patch: Partial<EditForm>) => onChange({ ...form, ...patch });
  return <form onSubmit={onSave} className="rounded-xl border border-[#bfd2e8] bg-white p-4" aria-label={`Edit ${form.full_name}`}><div className="flex items-center justify-between gap-3"><p className="text-sm font-extrabold text-[#173f70]">Edit data pengguna</p><button type="button" onClick={onCancel} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-[#6683a6] hover:bg-[#f4f8ff]" aria-label="Batal edit"><X size={17} /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><EditField label="Nama lengkap" value={form.full_name} onChange={(value) => set({ full_name: value })} required /><EditField label="NIP / NIK" value={form.login_identifier} onChange={(value) => set({ login_identifier: value })} inputMode="numeric" pattern="[0-9]{4,32}" required /><RoleField value={form.role} onChange={(value) => set({ role: value })} />{form.role === "guru" && <PositionField name="edit-community-position" value={form.community_position} onChange={(value) => set({ community_position: value })} />}<div className="sm:col-span-2"><EditField label="Email pemulihan (opsional untuk lupa password)" value={form.recovery_email} onChange={(value) => set({ recovery_email: value })} type="email" placeholder="Contoh: guru@gmail.com" /></div></div>{form.role === "guru" && <div className="mt-3"><TeacherEditFields form={form} onChange={set} /></div>}{form.role === "guru" && <div className="mt-3"><EditField label="Keterangan publik (opsional)" value={form.public_title} onChange={(value) => set({ public_title: value })} /></div>}<div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-bold text-[#34577f]">Status akun</span><select value={form.is_active ? "active" : "inactive"} onChange={(event) => set({ is_active: event.target.value === "active" })} className={selectClass}><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></label><label className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#34577f] sm:mt-6"><input type="checkbox" checked={form.is_public} onChange={(event) => set({ is_public: event.target.checked })} className="h-4 w-4 accent-[#1970d2]" /> Tampilkan profil publik</label></div><div className="mt-4 flex justify-end"><button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0b5fc3] px-4 text-xs font-bold text-white disabled:opacity-60">{saving ? "Menyimpan..." : <><Check size={14} aria-hidden="true" /> Simpan perubahan</>}</button></div></form>;
}

function TeacherCreateFields({ teacherType, subject, onTeacherTypeChange, onSubjectChange }: { teacherType: string; subject: string; onTeacherTypeChange: (value: string) => void; onSubjectChange: (value: string) => void }) {
  return <div className="space-y-4"><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Guru Kelas / Mapel</span><select name="teacher_type" value={teacherType} onChange={(event) => onTeacherTypeChange(event.target.value)} className={selectClass}><option value="Guru Kelas">Guru Kelas</option><option value="Guru Mapel">Guru Mapel</option></select></label>{teacherType === "Guru Kelas" ? <label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Kelas yang diampu</span><select name="teaching_grade" required className={selectClass}><option value="">Pilih kelas</option>{grades.map((grade) => <option key={grade} value={grade}>Kelas {grade}</option>)}</select></label> : <><SubjectChoice value={subject} onChange={onSubjectChange} /><GradeScope /></>}</div>;
}

function TeacherEditFields({ form, onChange }: { form: EditForm; onChange: (patch: Partial<EditForm>) => void }) {
  return <div className="space-y-4"><label className="block"><span className="mb-2 block text-xs font-bold text-[#34577f]">Guru Kelas / Mapel</span><select value={form.teacher_type} onChange={(event) => onChange({ teacher_type: event.target.value })} className={selectClass}><option value="Guru Kelas">Guru Kelas</option><option value="Guru Mapel">Guru Mapel</option></select></label>{form.teacher_type === "Guru Kelas" ? <label className="block"><span className="mb-2 block text-xs font-bold text-[#34577f]">Kelas yang diampu</span><select value={form.teaching_grade} onChange={(event) => onChange({ teaching_grade: event.target.value, teaching_grades: event.target.value ? [event.target.value] : [] })} required className={selectClass}><option value="">Pilih kelas</option>{grades.map((grade) => <option key={grade} value={grade}>Kelas {grade}</option>)}</select></label> : <><SubjectChoice value={form.teaching_subject} onChange={(value) => onChange({ teaching_subject: value })} /><GradeScope selected={form.teaching_grades} /></>}</div>;
}

function SubjectChoice({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <fieldset><legend className="mb-2 block text-sm font-bold text-[#34577f]">Mata pelajaran</legend><div className="flex flex-wrap gap-3"><label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#bfd2e8] px-4 text-sm font-semibold text-[#34577f]"><input type="radio" name="teaching_subject" value="PAIBP" checked={value === "PAIBP"} onChange={() => onChange("PAIBP")} className="h-4 w-4 accent-[#1970d2]" /> PAIBP</label><label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#bfd2e8] px-4 text-sm font-semibold text-[#34577f]"><input type="radio" name="teaching_subject" value="PJOK" checked={value === "PJOK"} onChange={() => onChange("PJOK")} className="h-4 w-4 accent-[#1970d2]" /> PJOK</label></div></fieldset>;
}

function GradeScope({ selected }: { selected?: string[] } = {}) {
  return <fieldset><legend className="mb-2 block text-sm font-bold text-[#34577f]">Kelas yang diampu</legend><div className="grid grid-cols-2 gap-2 rounded-xl bg-[#f4f8ff] p-3 sm:grid-cols-3">{grades.map((grade) => <label key={grade} className="inline-flex items-center gap-2 text-sm font-semibold text-[#34577f]"><input type="checkbox" name="teaching_grades" value={grade} checked={selected ? selected.includes(String(grade)) : undefined} defaultChecked={!selected} readOnly={Boolean(selected)} className="h-4 w-4 accent-[#1970d2]" /> Kelas {grade}</label>)}</div><p className="mt-2 text-xs text-[#6683a6]">Guru Mapel otomatis mengampu kelas 1–6.</p></fieldset>;
}

function CredentialBox({ credential, copied, onCopy }: { credential: TemporaryCredential; copied: boolean; onCopy: () => void }) {
  const [visible, setVisible] = useState(false);
  return <div className="rounded-xl border border-[#9fd6b4] bg-[#effbf3] p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#247642]">Password sementara — {credential.fullName}</p><div className="mt-3 flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#173f70]">{visible ? credential.password : "••••••••••••••••"}</code><button type="button" onClick={() => setVisible((v) => !v)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#9fd6b4] text-[#247642]" aria-label={visible ? "Sembunyikan" : "Tampilkan"}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button><button type="button" onClick={onCopy} className="min-h-10 shrink-0 rounded-lg border border-[#9fd6b4] px-3 text-xs font-bold text-[#247642]">{copied ? "Tersalin" : "Salin"}</button></div><p className="mt-2 text-xs leading-5 text-[#6683a6]">Password ini hanya ditampilkan satu kali. Salin sekarang.</p></div>;
}

function RoleField({ value, onChange }: { value: UserRole; onChange: (value: UserRole) => void }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Peran</span><select name="role" value={value} onChange={(event) => onChange(event.target.value as UserRole)} className={selectClass}><option value="kepala_sekolah">Kepala Sekolah</option><option value="guru">Guru</option><option value="pengawas_dabin">Pengawas Dabin</option></select></label>;
}

function PositionField({ name, value, onChange }: { name: string; value: CommunityPosition; onChange: (value: CommunityPosition) => void }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Jabatan</span><select name={name} value={value} onChange={(event) => onChange(event.target.value as CommunityPosition)} className={selectClass}><option value="ketua">Ketua</option><option value="sekretaris">Sekretaris</option><option value="anggota">Anggota</option></select></label>;
}

function Field({ label, name, placeholder, required, inputMode, pattern, type = "text" }: { label: string; name: string; placeholder: string; required?: boolean; inputMode?: "numeric" | "text"; pattern?: string; type?: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">{label}</span><input name={name} type={type} required={required} inputMode={inputMode} pattern={pattern} placeholder={placeholder} className="h-12 w-full rounded-xl border border-[#bfd2e8] bg-white px-4 text-sm outline-none placeholder:text-[#9ab0c8] focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10" /></label>;
}

function EditField({ label, value, onChange, required, inputMode, pattern, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; inputMode?: "numeric" | "text"; pattern?: string; type?: string; placeholder?: string }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-[#34577f]">{label}</span><input value={value} type={type} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} required={required} inputMode={inputMode} pattern={pattern} className="h-11 w-full rounded-xl border border-[#bfd2e8] bg-white px-3 text-sm outline-none focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10" /></label>;
}

const selectClass = "h-12 w-full rounded-xl border border-[#bfd2e8] bg-white px-3 text-sm outline-none focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10";
