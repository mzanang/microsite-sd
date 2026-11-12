"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  LockKeyhole,
  Pencil,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/community/review-manager";

type Requirement = {
  id: string;
  name: string;
  description: string;
  collection_method: "file" | "link" | "both";
  is_required: boolean;
  due_at: string | null;
  meeting_number?: number | null;
  material_title?: string | null;
  event_date?: string | null;
};

type Review = {
  reviewer_role: string;
  reviewer_name?: string;
  status: string;
  notes: string;
  reviewed_at: string | null;
};

type SubmissionVersion = {
  id: string;
  version_no: number;
  collection_method: string;
  original_name: string | null;
  external_url: string | null;
  created_at: string;
};

type Submission = {
  id: string;
  requirement_id: string;
  status: string; // 'menunggu_pemeriksaan' | 'lengkap' | 'perlu_perbaikan' | 'menunggu_verifikasi_ulang'
  current_version_no: number;
  submitted_at: string | null;
  latest_version?: SubmissionVersion | null;
  reviews?: Review[];
  latest_review?: Review | null;
};

function formatJakartaDateTime(isoDate?: string | null): string {
  if (!isoDate) return "-";
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return "-";
    return (
      new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d) + " WIB"
    );
  } catch {
    return "-";
  }
}

export function SubmissionManager() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState("");
  const [method, setMethod] = useState<"file" | "link">("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [viewer, setViewer] = useState<{ src: string; title: string } | null>(null);
  const [opening, setOpening] = useState("");

  const currentRequirement = requirements.find((requirement) => requirement.id === selected);
  const currentSubmission = submissions.find((submission) => submission.requirement_id === selected);
  const currentLocked = currentSubmission?.status === "lengkap";

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/komunitas-belajar/submissions", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Data pengumpulan tugas gagal dimuat.");
        return;
      }
      setRequirements(body.requirements ?? []);
      setSubmissions(body.submissions ?? []);
      setError("");

      if (!selected && body.requirements?.[0]) {
        const requested = new URLSearchParams(window.location.search).get("requirement_id");
        const requestedId =
          requested && body.requirements.some((r: Requirement) => r.id === requested)
            ? requested
            : body.requirements[0].id;
        setSelected(requestedId);
      }
    } catch {
      setError("Gagal terhubung ke server.");
    }
  }, [selected]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!supabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase
      .channel("kb-submission-status-live-v3")
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_submissions" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_reviews" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("requirement_id");
    if (requested) setSelected(requested);
  }, []);

  useEffect(() => {
    if (currentRequirement && currentRequirement.collection_method !== "both") {
      setMethod(currentRequirement.collection_method as "file" | "link");
    }
  }, [currentRequirement]);

  useEffect(() => {
    setUrl(currentSubmission?.latest_version?.external_url ?? "");
  }, [currentSubmission?.id, currentSubmission?.latest_version?.external_url]);

  async function openFile(submissionId: string, title: string) {
    setOpening(submissionId);
    try {
      const res = await fetch(`/api/komunitas-belajar/submissions/${submissionId}/file`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) alert(data.error ?? "Dokumen tidak dapat dibuka.");
      else setViewer({ src: data.url, title: data.name ?? title });
    } catch {
      alert("Gagal memuat dokumen.");
    } finally {
      setOpening("");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (currentLocked) return;

    const formElement = event.currentTarget;
    setBusy(true);
    setError("");
    setMessage("");

    const body = new FormData();
    body.set("requirement_id", selected);
    body.set("collection_method", method);
    if (method === "file" && file) body.set("file", file);
    if (method === "link") body.set("external_url", url);

    try {
      const response = await fetch("/api/komunitas-belajar/submissions", { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "Tugas gagal dikirim.");
      } else {
        const isRevision = currentSubmission?.status === "perlu_perbaikan";
        setMessage(
          isRevision
            ? "Revisi tugas berhasil dikirim untuk diperiksa ulang oleh Kepala Sekolah."
            : "Tugas berhasil dikirim dan menunggu verifikasi Kepala Sekolah."
        );
        setFile(null);
        setUrl("");
        formElement.reset();
        await load();
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelSubmission(submission: Submission) {
    if (!window.confirm("Batalkan pengumpulan ini? File dan pengumpulan tugas Anda akan dihapus.")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/komunitas-belajar/submissions", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ submission_id: submission.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "Pengumpulan gagal dibatalkan.");
      } else {
        setMessage("Pengumpulan tugas berhasil dibatalkan.");
        await load();
      }
    } catch {
      setError("Gagal membatalkan pengumpulan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* FORM PENGUMPULAN / REVISI TUGAS */}
      <section className="rounded-2xl border border-[#dbe7f5] bg-white p-6 shadow-sm sm:p-8 space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">
            Kumpulkan tugas
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#173f70]">
            {currentSubmission?.status === "perlu_perbaikan" ? "Kirim Revisi Tugas" : "Kumpulkan Tugas"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#6683a6]">
            Pilih persyaratan tugas lalu unggah file atau kirim link HTTPS. Setiap revisi akan tersimpan sebagai versi baru secara aman.
          </p>
        </div>

        {requirements.length ? (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[#34577f]">Pilih Persyaratan Tugas</span>
              <select
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
                className="h-12 w-full rounded-xl border border-[#bfd2e8] bg-[#f8fbff] px-3.5 text-sm font-semibold text-[#102d62] outline-none transition focus:border-[#1970d2] focus:bg-white"
              >
                <option value="">Pilih tugas</option>
                {requirements.map((req) => {
                  const sub = submissions.find((item) => item.requirement_id === req.id);
                  const isDone = sub?.status === "lengkap";
                  return (
                    <option key={req.id} value={req.id} disabled={isDone}>
                      {req.meeting_number ? `Pertemuan ${req.meeting_number} - ` : ""}
                      {req.name}
                      {req.is_required ? " *" : ""}
                      {isDone ? " (Sudah Lengkap & Terverifikasi)" : sub ? ` (${sub.status === "perlu_perbaikan" ? "Perlu Revisi" : "Sudah Dikirim"})` : ""}
                    </option>
                  );
                })}
              </select>
            </label>

            {currentRequirement && (
              <div className="rounded-xl border border-[#dbe6f5] bg-[#f8fbff] p-4 text-xs space-y-1.5 leading-5 text-[#536f92]">
                <p className="font-bold text-[#102d62]">
                  {currentRequirement.meeting_number ? `Pertemuan ke-${currentRequirement.meeting_number}` : ""}
                  {currentRequirement.material_title ? ` · Materi: ${currentRequirement.material_title}` : ""}
                </p>
                <p>{currentRequirement.description || "Tidak ada keterangan tambahan."}</p>
                <p className="font-semibold text-[#0b5fc3]">
                  Batas akhir: {currentRequirement.due_at ? formatJakartaDateTime(currentRequirement.due_at) : "Tidak dibatasi"}
                </p>
                {currentLocked && (
                  <p className="mt-2 font-bold text-emerald-700 flex items-center gap-1.5 pt-1 border-t border-[#e2e8f0]">
                    <LockKeyhole size={13} />
                    Tugas ini telah diverifikasi Lengkap oleh Kepala Sekolah dan terkunci dari perubahan.
                  </p>
                )}
              </div>
            )}

            {/* Alert Perlu Perbaikan pada Form jika sedang dipilih */}
            {currentSubmission?.status === "perlu_perbaikan" && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-red-900">
                  <AlertCircle size={15} className="text-red-600" />
                  <span>Tugas ini memerlukan perbaikan berdasarkan catatan KS:</span>
                </div>
                {currentSubmission.latest_review?.notes && (
                  <p className="text-red-950 font-medium pl-6 whitespace-pre-wrap italic">
                    &quot;{currentSubmission.latest_review.notes}&quot;
                  </p>
                )}
                <p className="text-[11px] text-red-700 pl-6">
                  Silakan unggah dokumen atau link revisi di bawah ini untuk mengirim versi terbaru.
                </p>
              </div>
            )}

            <fieldset disabled={currentLocked}>
              <legend className="mb-2 text-sm font-bold text-[#34577f]">Metode Pengumpulan</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["file", "link"] as const)
                  .filter((v) => currentRequirement?.collection_method === "both" || currentRequirement?.collection_method === v)
                  .map((val) => (
                    <label
                      key={val}
                      className={`flex min-h-11 items-center gap-2.5 rounded-xl border px-3.5 text-xs font-semibold cursor-pointer transition ${
                        method === val
                          ? "border-[#1970d2] bg-[#edf4ff] text-[#1264c5] font-bold"
                          : "border-[#bfd2e8] bg-white text-[#475569] hover:bg-[#f8fbff]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="method"
                        checked={method === val}
                        onChange={() => setMethod(val)}
                        className="accent-[#1970d2]"
                      />
                      {val === "file" ? "Upload File Dokumen" : "Gunakan Tautan / Link"}
                    </label>
                  ))}
              </div>
            </fieldset>

            {method === "file" ? (
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-[#34577f]">
                  {currentSubmission ? "Pilih File Dokumen Baru (Revisi)" : "File Dokumen"}
                </span>
                <input
                  type="file"
                  disabled={currentLocked}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  required={!currentSubmission}
                  className="block w-full rounded-xl border border-dashed border-[#1970d2]/40 bg-[#f4f8ff] p-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                />
                <span className="mt-1.5 block text-[11px] text-[#6683a6]">
                  Format diizinkan: PDF, DOCX, XLSX, JPG, PNG (Maksimal 100 MB).
                </span>
              </label>
            ) : (
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-[#34577f]">Link Dokumen</span>
                <input
                  type="url"
                  disabled={currentLocked}
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  required
                  placeholder="https://... (Google Drive, Canva, s.id, website/microsite)"
                  className="h-12 w-full rounded-xl border border-[#bfd2e8] bg-[#f8fbff] px-3.5 text-xs disabled:cursor-not-allowed disabled:opacity-60 focus:bg-white focus:border-[#1970d2] outline-none"
                />
                <span className="mt-1.5 block text-[11px] leading-relaxed text-[#6683a6]">
                  Dapat berupa link Google Drive, Canva, Microsite s.id, dsb. Pastikan akses link terbuka untuk dibaca oleh Kepala Sekolah.
                </span>
              </label>
            )}

            {error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
                {message}
              </p>
            )}

            <button
              disabled={busy || !selected || currentLocked}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0b5fc3] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#094ba0] disabled:cursor-not-allowed disabled:opacity-60 transition"
            >
              <UploadCloud size={16} />
              {busy
                ? "Mengirim..."
                : currentSubmission?.status === "perlu_perbaikan"
                ? "Kirim Revisi Tugas Sekarang"
                : currentSubmission
                ? "Perbarui Kiriman Tugas"
                : "Kumpulkan Tugas"}
            </button>
          </form>
        ) : (
          <div className="rounded-xl border border-dashed border-[#b9cfe7] p-8 text-center text-xs text-[#6683a6]">
            Belum ada persyaratan tugas aktif saat ini.
          </div>
        )}
      </section>

      {/* RIWAYAT & STATUS VERIFIKASI SAYA (TASK 5) */}
      <section className="rounded-2xl border border-[#dbe7f5] bg-white p-6 shadow-sm sm:p-8 space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">
            Riwayat & Status Verifikasi
          </p>
          <h2 className="mt-2 text-2xl font-extrabold text-[#173f70]">
            Status Administrasi Tugas Saya
          </h2>
          <p className="mt-1 text-xs text-[#6683a6]">
            Pantau hasil pemeriksaan Kepala Sekolah, tanggal verifikasi, dan catatan perbaikan.
          </p>
        </div>

        <div className="space-y-4">
          {requirements.map((req) => {
            const submission = submissions.find((item) => item.requirement_id === req.id);
            const isLocked = submission?.status === "lengkap";
            const ksReview =
              submission?.latest_review ??
              submission?.reviews?.find((r) => r.reviewer_role === "kepala_sekolah");

            return (
              <article
                key={req.id}
                className="rounded-2xl border border-[#e1eaf4] bg-[#fbfdff] p-5 space-y-3.5 transition-all hover:border-[#bfd2e8]"
              >
                {/* Header item */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-[#1970d2]">
                      {req.meeting_number ? `Pertemuan ke-${req.meeting_number}` : "Tugas Kombel"}
                      {req.material_title ? ` · ${req.material_title}` : ""}
                    </span>
                    <h3 className="mt-0.5 text-base font-extrabold text-[#173f70]">
                      {req.name}
                    </h3>
                  </div>
                  <div>
                    {submission ? (
                      <StatusBadge status={submission.status} />
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                        Belum Mengumpulkan
                      </span>
                    )}
                  </div>
                </div>

                {/* Info Rincian Status (TASK 5) */}
                <div className="rounded-xl bg-white p-3.5 border border-[#e8f1ff] text-xs space-y-1.5 text-[#536f92]">
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Batas Akhir:</span>
                    <span className="font-semibold text-[#102d62]">
                      {req.due_at ? formatJakartaDateTime(req.due_at) : "Tidak dibatasi"}
                    </span>
                  </div>

                  {submission && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-[#64748b]">Waktu Pengumpulan:</span>
                        <span className="font-semibold text-[#102d62]">
                          {formatJakartaDateTime(submission.submitted_at)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748b]">Versi Dokumen:</span>
                        <span className="font-semibold text-[#102d62]">
                          Versi {submission.current_version_no}
                        </span>
                      </div>
                      {submission.latest_version && (
                        <div className="flex justify-between items-center pt-1 border-t border-[#f1f5f9]">
                          <span className="text-[#64748b]">Dokumen Dikirim:</span>
                          {submission.latest_version.external_url ? (
                            <a
                              href={submission.latest_version.external_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-[#1264c5] hover:underline"
                            >
                              Lihat <ExternalLink size={12} />
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openFile(submission.id, req.name)}
                              disabled={opening === submission.id}
                              className="inline-flex items-center gap-1 font-bold text-[#1264c5] hover:underline"
                            >
                              <FileText size={12} />
                              {opening === submission.id ? "Memuat..." : submission.latest_version.original_name ?? "Lihat File"}
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Box Catatan Pemeriksaan KS (TASK 5) */}
                {ksReview && (
                  <div
                    className={`rounded-xl p-3.5 text-xs space-y-1 border ${
                      submission?.status === "perlu_perbaikan"
                        ? "border-red-200 bg-red-50/70 text-red-950"
                        : submission?.status === "lengkap"
                        ? "border-emerald-200 bg-emerald-50/60 text-emerald-950"
                        : "border-amber-200 bg-amber-50/60 text-amber-950"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck size={14} className={submission?.status === "lengkap" ? "text-emerald-700" : "text-red-700"} />
                      <span>Hasil Verifikasi: {submission?.status === "lengkap" ? "Dinyatakan Lengkap" : "Perlu Perbaikan"}</span>
                    </div>

                    {ksReview.notes ? (
                      <p className="mt-1 font-medium whitespace-pre-wrap pl-5 italic">
                        &quot;{ksReview.notes}&quot;
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#64748b] pl-5 italic">Tidak ada catatan tambahan.</p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-black/5 text-[10px] text-[#64748b]">
                      <span>Diverifikasi oleh: <strong>{ksReview.reviewer_name ?? "Kepala Sekolah"}</strong></span>
                      <span>Waktu: {formatJakartaDateTime(ksReview.reviewed_at)}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {submission ? (
                    isLocked ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                        <LockKeyhole size={13} />
                        Tugas Terverifikasi Lengkap
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelected(req.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#bfd2e8] bg-white px-3 py-1.5 text-xs font-bold text-[#1264c5] hover:bg-[#edf4ff]"
                        >
                          {submission.status === "perlu_perbaikan" ? (
                            <>
                              <UploadCloud size={13} /> Kirim Revisi Tugas
                            </>
                          ) : (
                            <>
                              <Pencil size={13} /> Ubah Pengumpulan
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void cancelSubmission(submission)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          <Trash2 size={13} /> Batalkan Kiriman
                        </button>
                      </>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelected(req.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#0b5fc3] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#094ba0]"
                    >
                      <UploadCloud size={13} /> Kumpulkan Tugas Ini
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* VIEWER MODAL */}
      {viewer && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#071d45]/65 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewer(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={viewer.title}
            className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#e1eaf4] px-5 py-4">
              <p className="truncate text-sm font-bold text-[#173f70]">{viewer.title}</p>
              <button
                type="button"
                onClick={() => setViewer(null)}
                className="rounded-lg p-1.5 text-[#536f92] hover:bg-[#edf4ff]"
              >
                <X size={18} />
              </button>
            </div>
            <iframe title={viewer.title} src={viewer.src} className="min-h-0 flex-1 bg-[#f8fbff]" />
          </div>
        </div>
      )}
    </div>
  );
}
