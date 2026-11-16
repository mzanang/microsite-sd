"use client";

import { useEffect, useState, useId } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  FileUp,
  FolderOpen,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  type GuideRole,
  type KbGuideItem,
  GUIDE_ROLES,
  MAX_GUIDE_FILE_SIZE,
  formatGuideFileSize,
  getRoleMeta,
} from "@/lib/community-guides";

export function CommunityGuidesManager() {
  const [guides, setGuides] = useState<KbGuideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"all" | GuideRole>("all");

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formRole, setFormRole] = useState<GuideRole>("guru");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fileInputId = useId();

  async function loadGuides() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/komunitas-belajar/panduan", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat daftar panduan.");
      setGuides(json.guides ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan memuat data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadGuides();
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setFormFile(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setError("Hanya file berekstensi .PDF yang diperbolehkan.");
      e.target.value = "";
      setFormFile(null);
      return;
    }

    if (file.size > MAX_GUIDE_FILE_SIZE) {
      setError(`Ukuran file (${(file.size / 1024 / 1024).toFixed(2)} MB) melebihi batas maksimal 1 MB.`);
      e.target.value = "";
      setFormFile(null);
      return;
    }

    setFormFile(file);
  }

  function startEdit(item: KbGuideItem) {
    setEditingId(item.id);
    setFormRole(item.role);
    setFormTitle(item.title);
    setFormDescription(item.description || "");
    setFormFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setFormTitle("");
    setFormDescription("");
    setFormFile(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!formTitle.trim()) {
      setError("Judul panduan wajib diisi.");
      return;
    }

    if (!editingId && !formFile) {
      setError("Silakan pilih file PDF panduan (maksimal 1 MB).");
      return;
    }

    setSaving(true);
    try {
      const data = new FormData();
      if (editingId) data.set("id", editingId);
      data.set("role", formRole);
      data.set("title", formTitle.trim());
      data.set("description", formDescription.trim());
      if (formFile) data.set("file", formFile);

      const res = await fetch("/api/admin/komunitas-belajar/panduan", {
        method: "POST",
        body: data,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan panduan.");

      setMessage(editingId ? "Panduan berhasil diperbarui!" : "Panduan baru berhasil diunggah!");
      cancelEdit();
      setGuides(json.guides ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: KbGuideItem) {
    if (!window.confirm(`Yakin ingin menghapus panduan "${item.title}"?`)) return;

    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/komunitas-belajar/panduan", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menghapus panduan.");

      setMessage(`Panduan "${item.title}" berhasil dihapus.`);
      if (editingId === item.id) cancelEdit();
      setGuides(json.guides ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus.");
    }
  }

  const filteredGuides = guides.filter((g) => {
    if (selectedFilter === "all") return true;
    return g.role === selectedFilter;
  });

  return (
    <div className="space-y-8">
      {/* Notifications */}
      {message && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span className="flex-1">{message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800 shadow-xs animate-in fade-in duration-200">
          <AlertCircle size={18} className="shrink-0 text-red-600" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="rounded-lg p-1 text-red-600 hover:bg-red-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Role Guide Status Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {GUIDE_ROLES.map((role) => {
          const roleGuides = guides.filter((g) => g.role === role.key);
          const hasGuide = roleGuides.length > 0;
          return (
            <div
              key={role.key}
              onClick={() => setSelectedFilter(role.key)}
              className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                selectedFilter === role.key
                  ? "border-[#6048e8] bg-[#6048e8]/[0.05] shadow-sm ring-2 ring-[#6048e8]/20"
                  : "border-ink/10 bg-white hover:border-[#6048e8]/30 hover:bg-slate-50/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border ${role.badgeColor}`}>
                  {role.badge}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    hasGuide ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {hasGuide ? `${roleGuides.length} Berkas` : "Belum Ada"}
                </span>
              </div>
              <h3 className="mt-2.5 font-bold text-sm text-ink">{role.label}</h3>
              <p className="mt-1 text-xs text-ink/50 line-clamp-2 leading-relaxed">
                {role.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Form (Left) & List (Right) */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        {/* FORM PANEL */}
        <section className="rounded-2xl border border-[#dedcf3] bg-white p-6 shadow-xs sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#6048e8]/10 text-[#6048e8]">
              {editingId ? <Pencil size={21} /> : <FileUp size={21} />}
            </span>
            <div>
              <h2 className="font-display text-xl text-ink">
                {editingId ? "Edit Dokumen Panduan" : "Unggah Panduan Baru"}
              </h2>
              <p className="mt-0.5 text-xs text-ink/50">
                Format PDF saja · Maksimal ukuran file 1 MB.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Role Select */}
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-ink/60">
                Pilih Peran Sasaran <span className="text-red-500">*</span>
              </span>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as GuideRole)}
                className="h-12 w-full rounded-xl border border-ink/15 bg-white px-3.5 text-sm font-semibold text-ink outline-none transition focus:border-[#6048e8] focus:ring-4 focus:ring-[#6048e8]/10"
              >
                {GUIDE_ROLES.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label} ({r.badge})
                  </option>
                ))}
              </select>
            </label>

            {/* Title */}
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-ink/60">
                Judul Dokumen Panduan <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                maxLength={120}
                placeholder="Contoh: Panduan Login & Verifikasi Tugas Guru"
                className="h-12 w-full rounded-xl border border-ink/15 px-3.5 text-sm font-medium text-ink outline-none transition placeholder:text-ink/35 focus:border-[#6048e8] focus:ring-4 focus:ring-[#6048e8]/10"
              />
            </label>

            {/* Description */}
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-ink/60">
                Keterangan Singkat (Opsional)
              </span>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Penjelasan ringkas mengenai isi panduan dan langkah yang dipelajari."
                className="w-full rounded-xl border border-ink/15 p-3.5 text-sm font-medium text-ink outline-none transition placeholder:text-ink/35 focus:border-[#6048e8] focus:ring-4 focus:ring-[#6048e8]/10"
              />
            </label>

            {/* File PDF Input */}
            <div className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-ink/60">
                Berkas PDF {editingId ? "(Kosongkan jika tidak mengganti file)" : <span className="text-red-500">*</span>}
              </span>
              <label
                htmlFor={fileInputId}
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#6048e8]/30 bg-[#6048e8]/[0.02] p-5 text-center transition hover:border-[#6048e8] hover:bg-[#6048e8]/[0.05]"
              >
                <UploadCloud className="h-8 w-8 text-[#6048e8]" />
                <span className="mt-2 text-xs font-bold text-ink">
                  {formFile ? formFile.name : "Klik untuk memilih file PDF"}
                </span>
                <span className="mt-1 text-[11px] text-ink/50">
                  {formFile
                    ? `Ukuran: ${formatGuideFileSize(formFile.size)}`
                    : "Hanya PDF · Maksimal ukuran 1 MB"}
                </span>
                <input
                  id={fileInputId}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#6048e8] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#5039d1] disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Menyimpan...
                  </>
                ) : editingId ? (
                  <>
                    <Pencil size={16} /> Simpan Perubahan
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} /> Unggah Panduan
                  </>
                )}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-ink/15 px-4 text-sm font-semibold text-ink hover:bg-slate-50"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </section>

        {/* LIST PANEL */}
        <section className="rounded-2xl border border-[#dedcf3] bg-white p-6 shadow-xs sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6048e8]">
                Buku Panduan Kombel
              </p>
              <h2 className="mt-1 font-display text-xl sm:text-2xl text-ink">
                Daftar Dokumen Panduan
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/komunitas-belajar/login"
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink/15 bg-white px-3 py-2 text-xs font-bold text-ink hover:border-[#6048e8] hover:text-[#6048e8]"
              >
                <Eye size={14} /> Lihat di Login
              </Link>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mt-5 flex flex-wrap gap-1.5 border-b border-ink/10 pb-3">
            <button
              type="button"
              onClick={() => setSelectedFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                selectedFilter === "all"
                  ? "bg-[#6048e8] text-white shadow-xs"
                  : "bg-slate-100 text-ink/70 hover:bg-slate-200"
              }`}
            >
              Semua ({guides.length})
            </button>
            {GUIDE_ROLES.map((r) => {
              const count = guides.filter((g) => g.role === r.key).length;
              const isActive = selectedFilter === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setSelectedFilter(r.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    isActive
                      ? "bg-[#6048e8] text-white shadow-xs"
                      : "bg-slate-100 text-ink/70 hover:bg-slate-200"
                  }`}
                >
                  {r.shortLabel} ({count})
                </button>
              );
            })}
          </div>

          {/* List items */}
          {loading ? (
            <div className="py-12 text-center text-sm text-ink/50">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#6048e8] mb-2" />
              Memuat data panduan...
            </div>
          ) : filteredGuides.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink/15 p-8 text-center text-ink/50 my-6">
              <FolderOpen className="mx-auto h-10 w-10 text-ink/30 mb-2" />
              <p className="text-sm font-bold text-ink/70">
                Belum ada panduan untuk filter ini.
              </p>
              <p className="mt-1 text-xs text-ink/45">
                Silakan gunakan form di samping untuk mengunggah file panduan PDF (maks. 1 MB).
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {filteredGuides.map((item) => {
                const meta = getRoleMeta(item.role);
                return (
                  <article
                    key={item.id}
                    className="group rounded-2xl border border-ink/10 bg-white p-4.5 transition hover:border-[#6048e8]/40 hover:shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-200/60">
                          <FileText size={20} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase border ${meta.badgeColor}`}
                            >
                              {meta.label}
                            </span>
                            <span className="text-[11px] font-semibold text-ink/45">
                              {formatGuideFileSize(item.file_size)}
                            </span>
                          </div>
                          <h3 className="mt-1.5 text-sm font-bold text-ink leading-snug break-words">
                            {item.title}
                          </h3>
                          {item.description && (
                            <p className="mt-1 text-xs text-ink/60 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                          <p className="mt-2 text-[11px] text-ink/40 font-mono truncate">
                            File: {item.original_name}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-3.5 flex flex-wrap items-center justify-end gap-2 border-t border-ink/5 pt-3">
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-2.5 text-xs font-bold text-ink hover:border-[#6048e8] hover:text-[#6048e8]"
                      >
                        <ExternalLink size={13} /> Buka PDF
                      </a>
                      <a
                        href={item.file_url}
                        download={item.original_name}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-2.5 text-xs font-bold text-ink hover:border-[#6048e8] hover:text-[#6048e8]"
                      >
                        <Download size={13} /> Unduh
                      </a>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-2.5 text-xs font-bold text-ink hover:border-[#6048e8] hover:text-[#6048e8]"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/50 px-2.5 text-xs font-bold text-red-700 hover:bg-red-100"
                      >
                        <Trash2 size={13} /> Hapus
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

