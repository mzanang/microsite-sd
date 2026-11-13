"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import type { KbProfile } from "@/lib/kb/auth";

export function ProgressBarToast({
  title = "Password berhasil diubah",
  message = "Password akun Anda telah berhasil diperbarui.",
  durationMs = 4000,
  onClose,
}: {
  title?: string;
  message?: string;
  durationMs?: number;
  onClose: () => void;
}) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPercent = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remainingPercent);
      if (elapsed >= durationMs) {
        clearInterval(interval);
        onClose();
      }
    }, 35);

    return () => clearInterval(interval);
  }, [durationMs, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-5 right-5 z-[9999] w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-[0_16px_40px_rgba(16,185,129,0.18)] transition-all animate-in fade-in slide-in-from-top-3 duration-300"
    >
      <div className="flex items-start gap-3.5 p-4 sm:p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
          <CheckCircle2 size={22} className="text-emerald-600" />
        </span>
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-sm font-extrabold text-[#102d62]">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#536f92]">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1 text-[#8ba2bd] transition hover:bg-[#edf4ff] hover:text-[#102d62]"
          aria-label="Tutup notifikasi"
        >
          <X size={16} />
        </button>
      </div>
      {/* Animated Countdown Progress Bar */}
      <div className="h-1.5 w-full bg-emerald-50">
        <div
          className="h-full bg-emerald-500 transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

type AccountSecurityProps = {
  profile: KbProfile;
  onClose?: () => void;
  onSuccessToast?: (title?: string, message?: string) => void;
  isDialog?: boolean;
  initialTab?: "password" | "info" | "logout";
};

export function AccountSecurityView({
  profile,
  onClose,
  onSuccessToast,
  isDialog = false,
  initialTab = "password",
}: AccountSecurityProps) {
  const [activeTab, setActiveTab] = useState<"password" | "info" | "logout">(initialTab);
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [inlineToast, setInlineToast] = useState<{ title?: string; message?: string } | null>(null);

  const roleLabel =
    profile.role === "super_admin"
      ? "Super Admin"
      : profile.role === "kepala_sekolah"
      ? "Kepala Sekolah"
      : profile.role === "pengawas_dabin"
      ? "Pengawas Dabin"
      : profile.community_position === "ketua"
      ? "Ketua Kombel"
      : profile.community_position === "sekretaris"
      ? "Sekretaris Kombel"
      : "Anggota Kombel";

  // Password validation rules
  const isMinLength = newPassword.length >= 8;
  const hasLetterAndNumber = /[a-zA-Z]/.test(newPassword) && /\d/.test(newPassword);
  const isConfirmationMatch = confirmation.length > 0 && newPassword === confirmation;

  const isFormValid = isMinLength && hasLetterAndNumber && isConfirmationMatch;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!isMinLength) {
      setError("Password baru wajib minimal 8 karakter.");
      return;
    }
    if (!hasLetterAndNumber) {
      setError("Password baru harus mengandung kombinasi huruf dan angka.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("Konfirmasi password baru tidak sama.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/komunitas-belajar/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          password: newPassword,
          confirmation,
        }),
      });

      const result = await response.json().catch(() => ({})) as { error?: string; ok?: boolean; message?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Gagal mengubah password.");
      }

      setNewPassword("");
      setConfirmation("");

      // Trigger notification and close modal if in dialog
      if (onSuccessToast) {
        onSuccessToast("Password berhasil diubah", "Password akun Anda telah berhasil diperbarui.");
      } else {
        setInlineToast({
          title: "Password berhasil diubah",
          message: "Password akun Anda telah berhasil diperbarui.",
        });
        setSuccess("Password berhasil diubah. Silakan gunakan password baru ini untuk login berikutnya.");
      }

      if (onClose) {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengubah password.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setNewPassword("");
    setConfirmation("");
    setError("");
    setSuccess("");
    if (onClose) onClose();
  }

  return (
    <>
      {inlineToast && (
        <ProgressBarToast
          title={inlineToast.title}
          message={inlineToast.message}
          onClose={() => setInlineToast(null)}
        />
      )}

      <div className={`overflow-hidden rounded-2xl border border-[#dbe7f5] bg-white shadow-xl ${isDialog ? "w-full max-w-4xl" : ""}`}>
        {/* Header Keamanan Akun */}
        <div className="flex items-center justify-between border-b border-[#e1eaf4] bg-white px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0b5fc3] text-white shadow-sm">
              <ShieldCheck size={24} />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-[#102d62]">Keamanan Akun</h2>
              <p className="text-xs text-[#6683a6]">Kelola keamanan akun Anda untuk menjaga akun tetap aman.</p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#6683a6] transition hover:bg-[#edf4ff] hover:text-[#1264c5]"
              aria-label="Tutup modal"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Main Body with Sidebar Navigation */}
        <div className="grid md:grid-cols-[220px_1fr]">
          {/* Left Sidebar Menu */}
          <nav className="border-b md:border-b-0 md:border-r border-[#e1eaf4] bg-[#f8fbff] p-4 space-y-1.5" aria-label="Menu Keamanan Akun">
            <button
              type="button"
              onClick={() => { setActiveTab("password"); setError(""); setSuccess(""); }}
              className={`flex w-full min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-bold transition text-left ${
                activeTab === "password"
                  ? "bg-[#edf4ff] text-[#0b5fc3] shadow-sm"
                  : "text-[#536f92] hover:bg-[#edf4ff]/60 hover:text-[#102d62]"
              }`}
            >
              <Lock size={17} className={activeTab === "password" ? "text-[#0b5fc3]" : "text-[#6683a6]"} />
              Ubah Password
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("info"); setError(""); setSuccess(""); }}
              className={`flex w-full min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-bold transition text-left ${
                activeTab === "info"
                  ? "bg-[#edf4ff] text-[#0b5fc3] shadow-sm"
                  : "text-[#536f92] hover:bg-[#edf4ff]/60 hover:text-[#102d62]"
              }`}
            >
              <UserCheck size={17} className={activeTab === "info" ? "text-[#0b5fc3]" : "text-[#6683a6]"} />
              Informasi Akun
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("logout"); setError(""); setSuccess(""); }}
              className={`flex w-full min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-bold transition text-left ${
                activeTab === "logout"
                  ? "bg-red-50 text-red-600 shadow-sm"
                  : "text-[#536f92] hover:bg-red-50/60 hover:text-red-600"
              }`}
            >
              <LogOut size={17} className={activeTab === "logout" ? "text-red-600" : "text-[#6683a6]"} />
              Keluar
            </button>
          </nav>

          {/* Right Content Area */}
          <div className="p-6 sm:p-8">
            {/* TAB 1: UBAH PASSWORD */}
            {activeTab === "password" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-extrabold text-[#102d62]">Ubah Password</h3>
                  <p className="mt-1 text-xs text-[#6683a6]">
                    Ganti password akun Anda secara berkala untuk keamanan yang lebih baik.
                  </p>
                </div>

                {error && (
                  <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
                    <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-600 mt-0.5" />
                    <span>{success}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
                    {/* Form Inputs */}
                    <div className="space-y-4">
                      {/* Password Baru */}
                      <label className="block">
                        <span className="mb-2 block text-xs font-bold text-[#34577f]">Password Baru</span>
                        <div className="relative">
                          <input
                            type={showNew ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={8}
                            placeholder="••••••••••••"
                            autoComplete="new-password"
                            className="h-11 w-full rounded-xl border border-[#bfd2e8] bg-white px-4 pr-11 text-sm outline-none transition placeholder:text-[#9ab0c8] focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNew((v) => !v)}
                            className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg text-[#6683a6] hover:bg-[#edf4ff] hover:text-[#1264c5]"
                            aria-label={showNew ? "Sembunyikan password" : "Tampilkan password"}
                          >
                            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </label>

                      {/* Konfirmasi Password Baru */}
                      <label className="block">
                        <span className="mb-2 block text-xs font-bold text-[#34577f]">Konfirmasi Password Baru</span>
                        <div className="relative">
                          <input
                            type={showConfirmation ? "text" : "password"}
                            value={confirmation}
                            onChange={(e) => setConfirmation(e.target.value)}
                            required
                            minLength={8}
                            placeholder="••••••••••••"
                            autoComplete="new-password"
                            className="h-11 w-full rounded-xl border border-[#bfd2e8] bg-white px-4 pr-11 text-sm outline-none transition placeholder:text-[#9ab0c8] focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmation((v) => !v)}
                            className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg text-[#6683a6] hover:bg-[#edf4ff] hover:text-[#1264c5]"
                            aria-label={showConfirmation ? "Sembunyikan password" : "Tampilkan password"}
                          >
                            {showConfirmation ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </label>
                    </div>

                    {/* Ketentuan Password Box */}
                    <div className="rounded-xl border border-[#dbe7f5] bg-[#f8fbff] p-5 self-start">
                      <p className="text-xs font-bold text-[#102d62]">Ketentuan Password:</p>
                      <ul className="mt-3 space-y-2.5 text-xs">
                        <li className="flex items-center gap-2">
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                            isMinLength ? "bg-emerald-600 text-white" : "bg-[#dbe7f5] text-[#6683a6]"
                          }`}>
                            <Check size={11} strokeWidth={3} />
                          </span>
                          <span className={isMinLength ? "font-semibold text-emerald-800" : "text-[#6683a6]"}>
                            Minimal 8 karakter
                          </span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                            hasLetterAndNumber ? "bg-emerald-600 text-white" : "bg-[#dbe7f5] text-[#6683a6]"
                          }`}>
                            <Check size={11} strokeWidth={3} />
                          </span>
                          <span className={hasLetterAndNumber ? "font-semibold text-emerald-800" : "text-[#6683a6]"}>
                            Mengandung huruf dan angka
                          </span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                            isConfirmationMatch ? "bg-emerald-600 text-white" : "bg-[#dbe7f5] text-[#6683a6]"
                          }`}>
                            <Check size={11} strokeWidth={3} />
                          </span>
                          <span className={isConfirmationMatch ? "font-semibold text-emerald-800" : "text-[#6683a6]"}>
                            Konfirmasi password cocok
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Form Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-[#edf2f8]">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="min-h-11 rounded-xl border border-[#bfd2e8] px-5 text-xs font-bold text-[#34577f] hover:bg-[#f8fbff]"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !isFormValid}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b5fc3] px-6 text-xs font-bold text-white transition hover:bg-[#084e9f] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        "Menyimpan..."
                      ) : (
                        <>
                          <Lock size={15} /> Simpan Password
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: INFORMASI AKUN */}
            {activeTab === "info" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-extrabold text-[#102d62]">Informasi Akun</h3>
                  <p className="mt-1 text-xs text-[#6683a6]">Data akun dan identitas terdaftar Anda di Komunitas Belajar.</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#e1eaf4] bg-[#f8fbff] p-4">
                    <p className="text-xs font-semibold text-[#6683a6]">Nama Lengkap</p>
                    <p className="mt-1 font-bold text-[#102d62] text-sm">{profile.full_name}</p>
                  </div>
                  <div className="rounded-xl border border-[#e1eaf4] bg-[#f8fbff] p-4">
                    <p className="text-xs font-semibold text-[#6683a6]">NIP / NIK</p>
                    <p className="mt-1 font-bold text-[#102d62] text-sm">{profile.login_identifier || "Belum diatur"}</p>
                  </div>
                  <div className="rounded-xl border border-[#e1eaf4] bg-[#f8fbff] p-4">
                    <p className="text-xs font-semibold text-[#6683a6]">Peran Akses</p>
                    <p className="mt-1 font-bold text-[#0b5fc3] text-sm">{roleLabel}</p>
                  </div>
                  <div className="rounded-xl border border-[#e1eaf4] bg-[#f8fbff] p-4">
                    <p className="text-xs font-semibold text-[#6683a6]">Status Akun</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="font-bold text-emerald-700 text-sm">{profile.is_active ? "Aktif" : "Nonaktif"}</span>
                    </div>
                  </div>
                  {profile.role === "guru" && (
                    <>
                      <div className="rounded-xl border border-[#e1eaf4] bg-[#f8fbff] p-4">
                        <p className="text-xs font-semibold text-[#6683a6]">Jenis Guru</p>
                        <p className="mt-1 font-bold text-[#102d62] text-sm">{profile.teacher_type || "Guru Kelas"}</p>
                      </div>
                      <div className="rounded-xl border border-[#e1eaf4] bg-[#f8fbff] p-4">
                        <p className="text-xs font-semibold text-[#6683a6]">Kelas / Mapel</p>
                        <p className="mt-1 font-bold text-[#102d62] text-sm">
                          {profile.teacher_type === "Guru Mapel"
                            ? `${profile.teaching_subject || "PAIBP"} · Kelas 1–6`
                            : profile.teaching_grade
                            ? `Kelas ${profile.teaching_grade}`
                            : "Belum diatur"}
                        </p>
                      </div>
                    </>
                  )}
                  <div className="sm:col-span-2 rounded-xl border border-[#e1eaf4] bg-[#f8fbff] p-4">
                    <p className="text-xs font-semibold text-[#6683a6]">Email Pemulihan Kata Sandi</p>
                    <p className="mt-1 font-bold text-[#102d62] text-sm">
                      {profile.recovery_email ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 size={16} /> {profile.recovery_email}
                        </span>
                      ) : (
                        <span className="text-[#6683a6] font-normal">
                          Belum didaftarkan. Hubungi Super Admin jika ingin menambahkan email pemulihan akun.
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("password")}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0b5fc3] px-5 text-xs font-bold text-white hover:bg-[#084e9f]"
                  >
                    <KeyRound size={15} /> Buka Form Ubah Password
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: KELUAR */}
            {activeTab === "logout" && (
              <div className="space-y-6 text-center py-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <LogOut size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#102d62]">Keluar dari Akun?</h3>
                  <p className="mt-2 text-xs leading-5 text-[#6683a6]">
                    Anda akan keluar dari sesi Komunitas Belajar pada perangkat ini.
                  </p>
                </div>
                <form action="/api/komunitas-belajar/auth/logout" method="post" className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("password")}
                    className="min-h-11 rounded-xl border border-[#bfd2e8] px-5 text-xs font-bold text-[#34577f] hover:bg-[#f8fbff]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-6 text-xs font-bold text-white transition hover:bg-red-700"
                  >
                    <LogOut size={15} /> Ya, Keluar Sekarang
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function AccountSecurityDialog({
  profile,
  open,
  onOpenChange,
  initialTab = "password",
}: {
  profile: KbProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: "password" | "info" | "logout";
}) {
  const [toast, setToast] = useState<{ title?: string; message?: string } | null>(null);

  if (!open && !toast) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#071d45]/60 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false);
          }}
        >
          <div role="dialog" aria-modal="true" className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl">
            <AccountSecurityView
              profile={profile}
              onClose={() => onOpenChange(false)}
              onSuccessToast={(title, message) => {
                setToast({ title, message });
                onOpenChange(false);
              }}
              isDialog
              initialTab={initialTab}
            />
          </div>
        </div>
      )}

      {toast && (
        <ProgressBarToast
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
