"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Layers,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import { ProgressBarToast } from "@/components/community/account-security";

export type Requirement = {
  id: string;
  name: string;
  description?: string;
  collection_method: "file" | "link" | "both";
  is_required: boolean;
  due_at: string | null;
  created_at?: string;
  meeting_number?: number | null;
  material_title?: string | null;
  event_date?: string | null;
};

export type TeacherParticipant = {
  id: string;
  full_name: string;
  login_identifier: string | null;
  role: string;
  teacher_type: string | null;
  teaching_grade: number | null;
  teaching_subject: string | null;
  community_position: string | null;
};

export type Review = {
  id?: string;
  submission_id: string;
  reviewer_role: string;
  reviewer_name?: string;
  status: string;
  notes: string;
  reviewed_at?: string;
  updated_at?: string;
};

export type SubmissionVersion = {
  id: string;
  submission_id: string;
  version_no: number;
  collection_method: string;
  original_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  external_url: string | null;
  created_at: string;
};

export type Submission = {
  id: string;
  requirement_id: string;
  teacher_profile_id: string;
  status: string; // 'menunggu_pemeriksaan' | 'lengkap' | 'perlu_perbaikan' | 'menunggu_verifikasi_ulang'
  raw_status?: string;
  current_version_no: number;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  teacher?: TeacherParticipant | null;
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

function getExternalUrl(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function formatJakartaDateOnly(isoDate?: string | null): string {
  if (!isoDate) return "Tidak dibatasi";
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return "Tidak dibatasi";
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return "-";
  }
}

export function StatusBadge({ status, plain = false }: { status: string; plain?: boolean }) {
  if (status === "lengkap") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 ${plain ? "px-0 py-0" : "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1"}`}>
        <CheckCircle2 size={13} className="text-emerald-600" />
        Lengkap
      </span>
    );
  }
  if (status === "perlu_perbaikan") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold text-red-700 ${plain ? "px-0 py-0" : "rounded-full border border-red-200 bg-red-50 px-2.5 py-1"}`}>
        <AlertCircle size={13} className="text-red-600" />
        Perlu Perbaikan
      </span>
    );
  }
  if (status === "menunggu_verifikasi_ulang") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 ${plain ? "px-0 py-0" : "rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1"}`}>
        <Clock size={13} className="text-sky-600" />
        Menunggu Verifikasi Ulang
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 ${plain ? "px-0 py-0" : "rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1"}`}>
      <Clock size={13} className="text-amber-600" />
      Menunggu Verifikasi
    </span>
  );
}

export function ReviewManager({ canReview }: { canReview: boolean }) {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [participants, setParticipants] = useState<TeacherParticipant[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  // Filters
  const [searchGuru, setSearchGuru] = useState("");
  const [filterPertemuan, setFilterPertemuan] = useState("all");
  const [filterMateri, setFilterMateri] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Dialog & preview state
  const [verifyingSubmission, setVerifyingSubmission] = useState<Submission | null>(null);
  const [verificationResult, setVerificationResult] = useState<"lengkap" | "perlu_perbaikan">("lengkap");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // KS Cancel Verification state
  const [cancelingSubmission, setCancelingSubmission] = useState<Submission | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const [documentViewer, setDocumentViewer] = useState<{ src: string; title: string } | null>(null);
  const [openingDocId, setOpeningDocId] = useState("");

  const [toastMessage, setToastMessage] = useState<{ title: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const response = await fetch("/api/komunitas-belajar/submissions", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setLoadError(body.error ?? "Data pengumpulan dan verifikasi gagal dimuat.");
        return;
      }

      const reqs: Requirement[] = body.requirements ?? [];
      const subs: Submission[] = body.submissions ?? [];
      const parts: TeacherParticipant[] = body.participants ?? [];

      setRequirements(reqs);
      setSubmissions(subs);
      setParticipants(parts);
      setLoadError("");

      // Set default selected task if not set or invalid
      setSelectedTaskId((prev) => {
        if (prev && reqs.some((r) => r.id === prev)) return prev;
        return reqs.length > 0 ? reqs[0].id : "";
      });
    } catch (err: any) {
      setLoadError(err?.message || "Koneksi ke server terputus.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Real-time synchronization
  useEffect(() => {
    if (!supabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase
      .channel("kb-review-manager-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_submissions" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_reviews" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_document_requirements" }, () => void loadData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Currently selected task requirement object
  const currentTask = useMemo(() => {
    return requirements.find((r) => r.id === selectedTaskId) ?? null;
  }, [requirements, selectedTaskId]);

  // Submissions for the currently selected task
  const taskSubmissions = useMemo(() => {
    if (!selectedTaskId) return [];
    return submissions.filter((s) => s.requirement_id === selectedTaskId);
  }, [submissions, selectedTaskId]);

  // Filtered submissions in table
  const filteredSubmissions = useMemo(() => {
    return taskSubmissions.filter((sub) => {
      // 1. Search Teacher Name
      const teacherName = sub.teacher?.full_name ?? "";
      if (searchGuru.trim() && !teacherName.toLowerCase().includes(searchGuru.trim().toLowerCase())) {
        return false;
      }

      // 2. Pertemuan Ke
      if (filterPertemuan !== "all") {
        const meeting = currentTask?.meeting_number ? String(currentTask.meeting_number) : "-";
        if (meeting !== filterPertemuan) return false;
      }

      // 3. Materi Kegiatan
      if (filterMateri !== "all") {
        const material = currentTask?.material_title ?? "-";
        if (material !== filterMateri) return false;
      }

      // 4 & 5. Month & Year of submitted_at
      if (sub.submitted_at) {
        const date = new Date(sub.submitted_at);
        if (filterMonth !== "all" && String(date.getMonth() + 1) !== filterMonth) return false;
        if (filterYear !== "all" && String(date.getFullYear()) !== filterYear) return false;
      } else {
        if (filterMonth !== "all" || filterYear !== "all") return false;
      }

      // 6. Status Verifikasi
      if (filterStatus !== "all") {
        if (filterStatus === "menunggu" && !(sub.status === "menunggu_pemeriksaan" || sub.status === "menunggu_verifikasi_ulang")) return false;
        if (filterStatus === "lengkap" && sub.status !== "lengkap") return false;
        if (filterStatus === "perlu_perbaikan" && sub.status !== "perlu_perbaikan") return false;
        if (filterStatus === "menunggu_verifikasi_ulang" && sub.status !== "menunggu_verifikasi_ulang") return false;
      }

      return true;
    });
  }, [taskSubmissions, searchGuru, filterPertemuan, filterMateri, filterMonth, filterYear, filterStatus, currentTask]);

  // Reset all filters
  const resetFilters = () => {
    setSearchGuru("");
    setFilterPertemuan("all");
    setFilterMateri("all");
    setFilterMonth("all");
    setFilterYear("all");
    setFilterStatus("all");
  };

  // Open Document or External Link
  async function handleOpenDocument(submission: Submission) {
    setOpeningDocId(submission.id);
    try {
      const response = await fetch(`/api/komunitas-belajar/submissions/${submission.id}/file`, { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string; name?: string };
      if (!response.ok || !body.url) {
        alert(body.error ?? "Dokumen tidak dapat dibuka.");
      } else {
        setDocumentViewer({
          src: body.url,
          title: body.name ?? `Tugas - ${submission.teacher?.full_name ?? "Guru"}`,
        });
      }
    } catch {
      alert("Gagal memuat file dokumen.");
    } finally {
      setOpeningDocId("");
    }
  }

  // Open Verification Modal
  function handleOpenVerify(submission: Submission) {
    setVerifyingSubmission(submission);
    const existingStatus = submission.latest_review?.status;
    setVerificationResult(existingStatus === "perlu_perbaikan" ? "perlu_perbaikan" : "lengkap");
    setVerificationNotes(submission.latest_review?.notes ?? "");
    setDialogError("");
  }

  // Submit Verification
  async function handleSaveVerification() {
    if (!verifyingSubmission) return;

    if (verificationResult === "perlu_perbaikan" && !verificationNotes.trim()) {
      setDialogError("Catatan perbaikan wajib diisi ketika memilih status Perlu Perbaikan.");
      return;
    }

    setIsSubmittingReview(true);
    setDialogError("");

    try {
      const response = await fetch("/api/komunitas-belajar/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          submission_id: verifyingSubmission.id,
          status: verificationResult,
          notes: verificationNotes.trim(),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setDialogError(result.error ?? "Gagal menyimpan hasil verifikasi.");
        return;
      }

      // Close modal & notify
      setVerifyingSubmission(null);
      setToastMessage({
        title: "Verifikasi Berhasil Disimpan",
        message: `Status tugas ${verifyingSubmission.teacher?.full_name ?? "guru"} berhasil diubah menjadi ${
          verificationResult === "lengkap" ? "Lengkap" : "Perlu Perbaikan"
        }.`,
      });

      // Reload fresh data from database
      await loadData();
    } catch (err: any) {
      setDialogError(err?.message || "Terjadi kesalahan saat menyimpan verifikasi.");
    } finally {
      setIsSubmittingReview(false);
    }
  }

  // Open Cancel Verification Dialog
  function handleOpenCancelVerify(submission: Submission) {
    setCancelingSubmission(submission);
    setCancelReason("");
    setCancelError("");
  }

  // Confirm Cancel Verification
  async function handleConfirmCancelVerification() {
    if (!cancelingSubmission) return;
    if (!cancelReason.trim()) {
      setCancelError("Alasan pembatalan verifikasi wajib diisi.");
      return;
    }

    setIsSubmittingCancel(true);
    setCancelError("");

    try {
      const response = await fetch("/api/komunitas-belajar/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          submission_id: cancelingSubmission.id,
          status: "menunggu_pemeriksaan",
          notes: `[Batal Verifikasi]: ${cancelReason.trim()}`,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setCancelError(result.error ?? "Gagal membatalkan hasil verifikasi.");
        return;
      }

      const teacherName = cancelingSubmission.teacher?.full_name ?? "guru";
      setCancelingSubmission(null);
      setCancelReason("");
      if (verifyingSubmission?.id === cancelingSubmission.id) {
        setVerifyingSubmission(null);
      }

      setToastMessage({
        title: "Verifikasi Berhasil Dibatalkan",
        message: `Status tugas ${teacherName} telah dikembalikan ke Menunggu Pemeriksaan. Penguncian tugas akan terbuka jika seluruh verifikasi telah dibatalkan.`,
      });

      await loadData();
    } catch (err: any) {
      setCancelError(err?.message || "Terjadi kesalahan saat membatalkan verifikasi.");
    } finally {
      setIsSubmittingCancel(false);
    }
  }

  // --- STATISTIK & MONITORING PERSENTASE PENGUMPULAN ---
  // Mandatory participants: active teachers
  const eligibleTeachers = useMemo(() => {
    return participants.filter((p) => p.role === "guru");
  }, [participants]);

  const stats = useMemo(() => {
    const totalWajib = eligibleTeachers.length;

    // Deduplicate by teacher_profile_id: 1 teacher counts at most once
    const submittedTeacherIds = new Set(taskSubmissions.map((s) => s.teacher_profile_id));
    const totalSudah = Array.from(submittedTeacherIds).filter((id) =>
      eligibleTeachers.some((t) => t.id === id)
    ).length;

    const totalBelum = Math.max(0, totalWajib - totalSudah);

    // Verified complete
    const verifiedCompleteTeachers = new Set(
      taskSubmissions.filter((s) => s.status === "lengkap").map((s) => s.teacher_profile_id)
    );
    const totalDiverifikasi = Array.from(verifiedCompleteTeachers).filter((id) =>
      eligibleTeachers.some((t) => t.id === id)
    ).length;

    // Needs revision
    const needsRevisionTeachers = new Set(
      taskSubmissions.filter((s) => s.status === "perlu_perbaikan").map((s) => s.teacher_profile_id)
    );
    const totalPerbaikan = Array.from(needsRevisionTeachers).filter((id) =>
      eligibleTeachers.some((t) => t.id === id)
    ).length;

    const percentPengumpulan = totalWajib > 0 ? Math.round((totalSudah / totalWajib) * 100) : 0;
    const percentVerifikasi = totalWajib > 0 ? Math.round((totalDiverifikasi / totalWajib) * 100) : 0;

    return {
      totalWajib,
      totalSudah,
      totalBelum,
      totalDiverifikasi,
      totalPerbaikan,
      percentPengumpulan,
      percentVerifikasi,
    };
  }, [eligibleTeachers, taskSubmissions]);

  // Teachers who haven't submitted yet
  const unsubmittedTeachers = useMemo(() => {
    const submittedIds = new Set(taskSubmissions.map((s) => s.teacher_profile_id));
    return eligibleTeachers.filter((t) => !submittedIds.has(t.id));
  }, [eligibleTeachers, taskSubmissions]);

  // Unique meeting numbers & materials for dropdown filters
  const uniqueMeetings = useMemo(() => {
    const set = new Set<string>();
    requirements.forEach((r) => {
      if (r.meeting_number) set.add(String(r.meeting_number));
    });
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [requirements]);

  const uniqueMaterials = useMemo(() => {
    const set = new Set<string>();
    requirements.forEach((r) => {
      if (r.material_title) set.add(r.material_title);
    });
    return Array.from(set);
  }, [requirements]);

  const yearsList = useMemo(() => {
    const set = new Set<string>([String(new Date().getFullYear())]);
    taskSubmissions.forEach((s) => {
      if (s.submitted_at) set.add(String(new Date(s.submitted_at).getFullYear()));
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [taskSubmissions]);

  return (
    <div className="space-y-8">
      {/* 1. SECTION HEADER & DROPDOWN PEMILIHAN TUGAS */}
      <section className="rounded-2xl border border-[#dbe6f5] bg-white p-6 shadow-[0_8px_22px_rgba(23,83,158,.05)] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">
              Pemeriksaan & Verifikasi Tugas
            </p>
            <h1 className="mt-2 text-2xl font-extrabold text-[#102d62] sm:text-3xl">
              {canReview ? "Verifikasi Tugas Guru" : "Monitoring Tugas Guru"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#6683a6] max-w-2xl">
              {canReview
                ? "Pilih tugas pertemuan, periksa dokumen administrasi yang dikumpulkan guru, dan simpan hasil verifikasi."
                : "Pengawas Dabin dapat memantau status pengumpulan dan hasil verifikasi Kepala Sekolah secara transparan."}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-[#edf4ff] px-4 py-2.5 text-xs font-bold text-[#1264c5] self-start">
            <ShieldCheck size={17} />
            <span>Kewenangan: {canReview ? "Pemeriksa Utama (KS)" : "Monitoring (Pengawas)"}</span>
          </div>
        </div>

        {/* Dropdown Pemilihan Tugas */}
        <div className="mt-6 rounded-2xl border border-[#cbdff7] bg-[#f8fbff] p-5">
          <label className="block">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#34577f]">
              <Layers size={15} className="text-[#1970d2]" />
              Pilih Tugas yang Ingin Diverifikasi:
            </span>
            {requirements.length > 0 ? (
              <select
                value={selectedTaskId}
                onChange={(e) => {
                  setSelectedTaskId(e.target.value);
                  resetFilters();
                }}
                className="mt-2.5 h-12 w-full rounded-xl border border-[#bfd2e8] bg-white px-4 text-sm font-bold text-[#102d62] shadow-sm outline-none transition focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/15"
              >
                {requirements.map((req) => {
                  const meetingStr = req.meeting_number ? `PERTEMUAN ${req.meeting_number} — ` : "";
                  const materialStr = req.material_title ? `Materi: ${req.material_title} | ` : "";
                  const createdStr = req.created_at ? `Dibuat: ${formatJakartaDateOnly(req.created_at)} | ` : "";
                  const dueStr = `Batas: ${formatJakartaDateOnly(req.due_at)}`;
                  return (
                    <option key={req.id} value={req.id}>
                      {meetingStr}
                      {req.name.toUpperCase()} ({materialStr}
                      {createdStr}
                      {dueStr})
                    </option>
                  );
                })}
              </select>
            ) : (
              <p className="mt-2 text-xs font-semibold text-amber-700">
                Belum ada tugas atau persyaratan yang dibuat oleh Ketua Kombel.
              </p>
            )}
          </label>

          {/* Rincian Tugas Terpilih */}
          {currentTask && (
            <div className="mt-4 grid gap-3 border-t border-[#dbe6f5] pt-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-white p-3 border border-[#e1eaf4]">
                <span className="text-[#6683a6]">Pertemuan Ke:</span>
                <p className="mt-1 font-bold text-[#102d62]">
                  {currentTask.meeting_number ? `Pertemuan ke-${currentTask.meeting_number}` : "-"}
                </p>
              </div>
              <div className="rounded-xl bg-white p-3 border border-[#e1eaf4]">
                <span className="text-[#6683a6]">Materi Kegiatan:</span>
                <p className="mt-1 font-bold text-[#102d62] truncate">
                  {currentTask.material_title ?? "-"}
                </p>
              </div>
              <div className="rounded-xl bg-white p-3 border border-[#e1eaf4]">
                <span className="text-[#6683a6]">Metode Pengumpulan:</span>
                <p className="mt-1 font-bold text-[#102d62]">
                  {currentTask.collection_method === "both"
                    ? "File atau Link"
                    : currentTask.collection_method === "file"
                    ? "Upload File"
                    : "Link Eksternal"}
                </p>
              </div>
              <div className="rounded-xl bg-white p-3 border border-[#e1eaf4]">
                <span className="text-[#6683a6]">Batas Pengumpulan:</span>
                <p className="mt-1 font-bold text-[#102d62]">
                  {formatJakartaDateOnly(currentTask.due_at)}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. FILTER PENCARIAN HALAMAN VERIFIKASI (TASK 2) */}
      <section className="rounded-2xl border border-[#dbe6f5] bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1970d2]">
            <Filter size={15} />
            <span>Filter Pengumpulan Tugas</span>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-[#536f92] hover:bg-[#edf4ff] hover:text-[#1264c5] transition"
          >
            <RotateCcw size={13} />
            Reset Filter
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {/* 1. Pencarian Nama Guru */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-[#34577f] mb-1.5">Nama Guru</label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8ba2bd]" />
              <input
                type="text"
                value={searchGuru}
                onChange={(e) => setSearchGuru(e.target.value)}
                placeholder="Cari nama guru..."
                className="h-10 w-full rounded-xl border border-[#bfd2e8] bg-[#f8fbff] pl-9 pr-3 text-xs text-[#191c1e] outline-none transition focus:border-[#1970d2] focus:bg-white focus:ring-2 focus:ring-[#1970d2]/15"
              />
            </div>
          </div>

          {/* 2. Pertemuan Ke */}
          <div>
            <label className="block text-xs font-bold text-[#34577f] mb-1.5">Pertemuan</label>
            <select
              value={filterPertemuan}
              onChange={(e) => setFilterPertemuan(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#bfd2e8] bg-[#f8fbff] px-2.5 text-xs text-[#191c1e] outline-none focus:border-[#1970d2] focus:bg-white"
            >
              <option value="all">Semua</option>
              {uniqueMeetings.map((num) => (
                <option key={num} value={num}>
                  Ke-{num}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Bulan Pengumpulan */}
          <div>
            <label className="block text-xs font-bold text-[#34577f] mb-1.5">Bulan</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#bfd2e8] bg-[#f8fbff] px-2.5 text-xs text-[#191c1e] outline-none focus:border-[#1970d2] focus:bg-white"
            >
              <option value="all">Semua Bulan</option>
              {[
                "Januari",
                "Februari",
                "Maret",
                "April",
                "Mei",
                "Juni",
                "Juli",
                "Agustus",
                "September",
                "Oktober",
                "November",
                "Desember",
              ].map((name, idx) => (
                <option key={name} value={String(idx + 1)}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Tahun Pengumpulan */}
          <div>
            <label className="block text-xs font-bold text-[#34577f] mb-1.5">Tahun</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#bfd2e8] bg-[#f8fbff] px-2.5 text-xs text-[#191c1e] outline-none focus:border-[#1970d2] focus:bg-white"
            >
              <option value="all">Semua Tahun</option>
              {yearsList.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Status Verifikasi */}
          <div>
            <label className="block text-xs font-bold text-[#34577f] mb-1.5">Status Verifikasi</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#bfd2e8] bg-[#f8fbff] px-2.5 text-xs text-[#191c1e] outline-none focus:border-[#1970d2] focus:bg-white"
            >
              <option value="all">Semua Status</option>
              <option value="menunggu">Menunggu Verifikasi</option>
              <option value="lengkap">Lengkap</option>
              <option value="perlu_perbaikan">Perlu Perbaikan</option>
              <option value="menunggu_verifikasi_ulang">Menunggu Verifikasi Ulang</option>
            </select>
          </div>
        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between border-t border-[#f1f5f9] pt-3 text-xs text-[#64748b]">
          <span>
            Menampilkan <strong className="text-[#102d62]">{filteredSubmissions.length}</strong> dari{" "}
            {taskSubmissions.length} pengumpulan untuk tugas ini.
          </span>
          {(searchGuru ||
            filterPertemuan !== "all" ||
            filterMateri !== "all" ||
            filterMonth !== "all" ||
            filterYear !== "all" ||
            filterStatus !== "all") && (
            <span className="font-semibold text-[#1970d2]">Filter sedang aktif</span>
          )}
        </div>
      </section>

      {/* 3. TABEL PENGUMPULAN TUGAS (8 KOLOM - TASK 1) */}
      <section className="rounded-2xl border border-[#dbe6f5] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-[#102d62]">
              Daftar Pengumpulan Tugas Guru
            </h2>
            <p className="mt-1 text-xs text-[#6683a6]">
              Tugas yang sudah dikumpulkan oleh guru dan siap untuk diperiksa atau dipantau.
            </p>
          </div>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-[#e1eaf4]">
          <table className="w-full min-w-[960px] text-left border-collapse text-sm">
            <thead className="bg-[#f8fbff] text-xs font-bold uppercase tracking-[.08em] text-[#536f92] border-b border-[#e1eaf4]">
              <tr>
                <th scope="col" className="px-4 py-3.5 text-center w-12">No.</th>
                <th scope="col" className="px-4 py-3.5">Pertemuan Ke</th>
                <th scope="col" className="px-4 py-3.5">Materi Kegiatan</th>
                <th scope="col" className="px-4 py-3.5">Nama Guru</th>
                <th scope="col" className="px-4 py-3.5">Tanggal Pengumpulan</th>
                <th scope="col" className="px-4 py-3.5 text-center">Dokumen / Link</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3.5">Status Verifikasi KS</th>
                <th scope="col" className="px-4 py-3.5 text-right w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2f8]">
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((submission, index) => {
                  const teacher = submission.teacher;
                  const version = submission.latest_version;
                  const externalUrl = getExternalUrl(version?.external_url);
                  const isOpening = openingDocId === submission.id;

                  return (
                    <tr key={submission.id} className="transition-colors hover:bg-[#f8fbff]">
                      <td className="px-4 py-4 text-center font-bold text-[#1264c5]">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#102d62]">
                        {currentTask?.meeting_number ? `Pertemuan ke-${currentTask.meeting_number}` : "-"}
                      </td>
                      <td className="px-4 py-4 text-[#475569] max-w-xs truncate">
                        {currentTask?.material_title ?? currentTask?.name ?? "-"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-[#102d62]">
                          {teacher?.full_name ?? "Guru"}
                        </div>
                        <div className="text-[11px] text-[#64748b]">
                          {teacher?.teacher_type ?? "Guru"}
                          {teacher?.teaching_grade ? ` · Kelas ${teacher.teaching_grade}` : ""}
                          {teacher?.teaching_subject ? ` · ${teacher.teaching_subject}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-[#536f92] whitespace-nowrap">
                        {formatJakartaDateTime(submission.submitted_at)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {externalUrl ? (
                          <a
                            href={externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1264c5] hover:underline transition"
                          >
                            <ExternalLink size={13} />
                            <span>Lihat</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleOpenDocument(submission)}
                            disabled={isOpening}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1264c5] hover:underline transition disabled:opacity-60"
                          >
                            <FileText size={13} />
                            <span>{isOpening ? "Membuka..." : "Buka File"}</span>
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <StatusBadge status={submission.status} plain />
                        {submission.current_version_no > 1 && (
                          <span className="block mt-1 text-[11px] text-[#64748b]">
                            Versi {submission.current_version_no}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {canReview ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenVerify(submission)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0b5fc3] px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#094ba0] transition"
                            >
                              <ShieldCheck size={14} />
                              <span>{submission.status === "lengkap" || submission.status === "perlu_perbaikan" ? "Ubah" : "Verifikasi"}</span>
                            </button>
                            {(submission.status === "lengkap" || submission.status === "perlu_perbaikan") && (
                              <button
                                type="button"
                                onClick={() => handleOpenCancelVerify(submission)}
                                className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition"
                                title="Batalkan hasil verifikasi tugas ini"
                              >
                                <RotateCcw size={12} />
                                <span>Batal</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenVerify(submission)}
                            className="inline-flex items-center gap-1 rounded-xl border border-[#bfd2e8] px-3 py-1.5 text-xs font-bold text-[#34577f] hover:bg-[#f8fbff]"
                          >
                            <Eye size={13} /> Detail
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-[#6683a6]">
                    <FileCheck2 size={32} className="mx-auto text-[#bfd2e8] mb-2" />
                    Belum ada tugas yang dikumpulkan sesuai kriteria filter di atas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS */}
        <div className="space-y-3 md:hidden">
          {filteredSubmissions.length > 0 ? (
            filteredSubmissions.map((submission, index) => {
              const teacher = submission.teacher;
              const version = submission.latest_version;
              const externalUrl = getExternalUrl(version?.external_url);

              return (
                <article
                  key={submission.id}
                  className="rounded-2xl border border-[#e1eaf4] bg-white p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-[#1264c5]">#{index + 1}</span>
                      <h3 className="font-bold text-[#102d62] text-sm mt-0.5">
                        {teacher?.full_name ?? "Guru"}
                      </h3>
                      <p className="text-xs text-[#64748b]">
                        {teacher?.teacher_type ?? "Guru"}
                        {teacher?.teaching_grade ? ` · Kelas ${teacher.teaching_grade}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={submission.status} plain />
                  </div>

                  <div className="rounded-xl bg-[#f8fbff] p-3 text-xs space-y-1.5 text-[#536f92]">
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Pertemuan:</span>
                      <span className="font-semibold text-[#102d62]">
                        {currentTask?.meeting_number ? `Ke-${currentTask.meeting_number}` : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Materi:</span>
                      <span className="font-semibold text-[#102d62] truncate max-w-[180px]">
                        {currentTask?.material_title ?? "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Dikumpulkan:</span>
                      <span className="font-semibold text-[#102d62]">
                        {formatJakartaDateTime(submission.submitted_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    {externalUrl ? (
                      <a
                        href={externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1264c5] hover:underline"
                      >
                        <ExternalLink size={13} />
                        <span>Lihat</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleOpenDocument(submission)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1264c5] hover:underline"
                      >
                        <FileText size={13} />
                        <span>Buka File</span>
                      </button>
                    )}

                    {canReview ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenVerify(submission)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0b5fc3] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm"
                        >
                          <ShieldCheck size={14} />
                          <span>{submission.status === "lengkap" || submission.status === "perlu_perbaikan" ? "Ubah" : "Verifikasi"}</span>
                        </button>
                        {(submission.status === "lengkap" || submission.status === "perlu_perbaikan") && (
                          <button
                            type="button"
                            onClick={() => handleOpenCancelVerify(submission)}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700"
                          >
                            <RotateCcw size={12} />
                            <span>Batal</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenVerify(submission)}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#bfd2e8] px-3 py-1.5 text-xs font-bold text-[#34577f]"
                      >
                        <Eye size={13} /> Detail
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-[#bfd2e8] p-8 text-center text-xs text-[#6683a6]">
              Belum ada pengumpulan tugas.
            </div>
          )}
        </div>
      </section>

      {/* 4. MONITORING PERSENTASE PENGUMPULAN & GURU BELUM MENGUMPULKAN (TASK 3) */}
      <section className="rounded-2xl border border-[#dbe6f5] bg-white p-6 shadow-sm sm:p-8 space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">
            Statistik & Monitoring Progres
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-[#102d62]">
            MONITORING PENGUMPULAN TUGAS
          </h2>
          <p className="mt-1 text-xs text-[#6683a6]">
            Perhitungan riil berdasarkan tugas yang sedang dipilih (
            <strong className="text-[#102d62]">{currentTask?.name ?? "Tugas terpilih"}</strong>).
          </p>
        </div>

        {/* 5 Metrik Kotak Statistik */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-[#e1eaf4] bg-[#f8fbff] p-4 text-center">
            <span className="text-xs font-bold text-[#64748b]">Wajib Mengumpulkan</span>
            <p className="mt-2 text-3xl font-extrabold text-[#102d62]">{stats.totalWajib}</p>
            <span className="mt-1 block text-[11px] text-[#64748b]">Guru Aktif</span>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-center">
            <span className="text-xs font-bold text-blue-700">Sudah Mengumpulkan</span>
            <p className="mt-2 text-3xl font-extrabold text-[#0b5fc3]">{stats.totalSudah}</p>
            <span className="mt-1 block text-[11px] text-blue-600">Guru</span>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-center">
            <span className="text-xs font-bold text-amber-800">Belum Mengumpulkan</span>
            <p className="mt-2 text-3xl font-extrabold text-amber-700">{stats.totalBelum}</p>
            <span className="mt-1 block text-[11px] text-amber-700">Guru</span>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-center">
            <span className="text-xs font-bold text-emerald-800">Sudah Diverifikasi</span>
            <p className="mt-2 text-3xl font-extrabold text-emerald-600">{stats.totalDiverifikasi}</p>
            <span className="mt-1 block text-[11px] text-emerald-700">Lengkap</span>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4 text-center">
            <span className="text-xs font-bold text-red-800">Perlu Perbaikan</span>
            <p className="mt-2 text-3xl font-extrabold text-red-600">{stats.totalPerbaikan}</p>
            <span className="mt-1 block text-[11px] text-red-700">Revisi</span>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="grid gap-6 lg:grid-cols-2 pt-2">
          {/* Progress Pengumpulan */}
          <div className="rounded-2xl border border-[#e1eaf4] p-5 bg-[#fbfdff]">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[#102d62]">Persentase Pengumpulan</span>
              <span className="text-[#0b5fc3] text-sm">{stats.percentPengumpulan}%</span>
            </div>
            <div className="mt-2.5 h-3 w-full rounded-full bg-[#e8f1ff] overflow-hidden">
              <div
                className="h-full bg-[#0b5fc3] transition-all duration-500 rounded-full"
                style={{ width: `${stats.percentPengumpulan}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-[#64748b]">
              {stats.totalSudah} dari {stats.totalWajib} guru telah mengirimkan tugas.
            </p>
          </div>

          {/* Progress Verifikasi */}
          <div className="rounded-2xl border border-[#e1eaf4] p-5 bg-[#fbfdff]">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[#102d62]">Persentase Verifikasi Selesai (Lengkap)</span>
              <span className="text-emerald-600 text-sm">{stats.percentVerifikasi}%</span>
            </div>
            <div className="mt-2.5 h-3 w-full rounded-full bg-emerald-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                style={{ width: `${stats.percentVerifikasi}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-[#64748b]">
              {stats.totalDiverifikasi} dari {stats.totalWajib} guru telah dinyatakan lengkap oleh KS.
            </p>
          </div>
        </div>

        {/* TABEL GURU BELUM MENGUMPULKAN TUGAS */}
        <div className="pt-4 border-t border-[#edf2f8]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <UserX size={18} className="text-amber-600" />
              <h3 className="text-base font-extrabold text-[#102d62]">
                Guru Belum Mengumpulkan Tugas ({unsubmittedTeachers.length})
              </h3>
            </div>
            <span className="text-xs text-[#64748b]">
              Wajib segera menyelesaikan tugas
            </span>
          </div>

          {unsubmittedTeachers.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-[#e1eaf4]">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#f8fbff] text-xs font-bold uppercase tracking-[.08em] text-[#536f92] border-b border-[#e1eaf4]">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-center w-12">No.</th>
                    <th scope="col" className="px-5 py-3">Nama Guru</th>
                    <th scope="col" className="px-5 py-3">Jenis Guru</th>
                    <th scope="col" className="px-5 py-3">Kelas / Mata Pelajaran</th>
                    <th scope="col" className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf2f8]">
                  {unsubmittedTeachers.map((teacher, idx) => (
                    <tr key={teacher.id} className="hover:bg-[#f8fbff]">
                      <td className="px-4 py-3 text-center text-xs font-bold text-[#64748b]">
                        {idx + 1}
                      </td>
                      <td className="px-5 py-3 font-bold text-[#102d62]">
                        {teacher.full_name}
                      </td>
                      <td className="px-5 py-3 text-xs text-[#475569]">
                        {teacher.teacher_type ?? "Guru"}
                      </td>
                      <td className="px-5 py-3 text-xs font-medium text-[#475569]">
                        {teacher.teacher_type === "Guru Mapel"
                          ? teacher.teaching_subject || "Mata Pelajaran"
                          : teacher.teaching_grade
                          ? `Kelas ${teacher.teaching_grade}`
                          : "-"}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                          Belum Mengumpulkan
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-6 text-center text-xs font-bold text-emerald-800">
              <CheckCircle2 size={24} className="mx-auto text-emerald-600 mb-1.5" />
              Luar biasa! Seluruh guru telah mengumpulkan tugas ini.
            </div>
          )}
        </div>
      </section>

      {/* 5. MODAL DIALOG VERIFIKASI KEPALA SEKOLAH (TASK 1.3) */}
      {verifyingSubmission && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#071d45]/60 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isSubmittingReview) {
              setVerifyingSubmission(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="verify-modal-title"
            className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-7 space-y-5"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#e1eaf4] pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-[#1970d2]">
                  Pemeriksaan Tugas
                </p>
                <h3 id="verify-modal-title" className="mt-1 text-xl font-extrabold text-[#102d62]">
                  {canReview ? "Verifikasi Tugas Guru" : "Detail Tugas Guru"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVerifyingSubmission(null)}
                disabled={isSubmittingReview}
                className="rounded-lg p-1 text-[#8ba2bd] hover:bg-[#edf4ff] hover:text-[#102d62]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Info Tugas */}
            <div className="rounded-xl bg-[#f8fbff] p-4 text-xs space-y-2 border border-[#dbe6f5]">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-[#64748b]">Nama Guru:</span>
                <span className="col-span-2 font-bold text-[#102d62]">
                  {verifyingSubmission.teacher?.full_name ?? "Guru"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-[#64748b]">Pertemuan:</span>
                <span className="col-span-2 font-bold text-[#102d62]">
                  {currentTask?.meeting_number ? `Pertemuan ke-${currentTask.meeting_number}` : "-"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-[#64748b]">Materi Kegiatan:</span>
                <span className="col-span-2 font-semibold text-[#102d62]">
                  {currentTask?.material_title ?? currentTask?.name ?? "-"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-[#64748b]">Tanggal Pengumpulan:</span>
                <span className="col-span-2 text-[#536f92]">
                  {formatJakartaDateTime(verifyingSubmission.submitted_at)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center pt-1 border-t border-[#e1eaf4]">
                <span className="text-[#64748b]">Dokumen / Link:</span>
                <div className="col-span-2">
                  {getExternalUrl(verifyingSubmission.latest_version?.external_url) ? (
                    <a
                      href={getExternalUrl(verifyingSubmission.latest_version?.external_url) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-bold text-[#1264c5] hover:underline"
                    >
                      <ExternalLink size={13} /> Lihat
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleOpenDocument(verifyingSubmission)}
                      className="inline-flex items-center gap-1.5 font-bold text-[#1264c5] hover:underline"
                    >
                      <FileText size={13} /> Unduh / Buka File ({verifyingSubmission.latest_version?.original_name ?? "Dokumen"})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Form Verifikasi KS */}
            {canReview ? (
              <div className="space-y-4">
                <label className="block text-xs font-bold text-[#102d62]">
                  Pilih Hasil Pemeriksaan:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer transition ${
                      verificationResult === "lengkap"
                        ? "border-emerald-500 bg-emerald-50/60 text-emerald-900 font-bold"
                        : "border-[#bfd2e8] bg-white text-[#475569] hover:bg-[#f8fbff]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="verifyResult"
                      checked={verificationResult === "lengkap"}
                      onChange={() => setVerificationResult("lengkap")}
                      className="accent-emerald-600"
                    />
                    <span>A. LENGKAP</span>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer transition ${
                      verificationResult === "perlu_perbaikan"
                        ? "border-red-500 bg-red-50/60 text-red-900 font-bold"
                        : "border-[#bfd2e8] bg-white text-[#475569] hover:bg-[#f8fbff]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="verifyResult"
                      checked={verificationResult === "perlu_perbaikan"}
                      onChange={() => setVerificationResult("perlu_perbaikan")}
                      className="accent-red-600"
                    />
                    <span>B. PERLU PERBAIKAN</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#34577f] mb-1.5">
                    Catatan Pemeriksaan{" "}
                    {verificationResult === "perlu_perbaikan" ? (
                      <span className="text-red-600">* (Wajib diisi untuk guru)</span>
                    ) : (
                      <span className="text-[#8ba2bd] font-normal">(Opsional)</span>
                    )}
                  </label>
                  <textarea
                    rows={4}
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder={
                      verificationResult === "perlu_perbaikan"
                        ? "Tuliskan saran atau bagian yang perlu direvisi oleh guru..."
                        : "Tuliskan apresiasi atau catatan tambahan (jika ada)..."
                    }
                    className="w-full rounded-xl border border-[#bfd2e8] p-3 text-xs outline-none transition focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/15"
                  />
                </div>

                {dialogError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                    {dialogError}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-2">
                  {verifyingSubmission.status === "lengkap" || verifyingSubmission.status === "perlu_perbaikan" ? (
                    <button
                      type="button"
                      onClick={() => handleOpenCancelVerify(verifyingSubmission)}
                      disabled={isSubmittingReview}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                    >
                      <RotateCcw size={13} />
                      <span>Batalkan Verifikasi</span>
                    </button>
                  ) : (
                    <div />
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setVerifyingSubmission(null)}
                      disabled={isSubmittingReview}
                      className="rounded-xl border border-[#bfd2e8] px-4 py-2 text-xs font-bold text-[#34577f] hover:bg-[#f8fbff]"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveVerification}
                      disabled={isSubmittingReview}
                      className="rounded-xl bg-[#0b5fc3] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#094ba0] disabled:opacity-60"
                    >
                      {isSubmittingReview ? "Menyimpan..." : "Simpan Verifikasi"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Read-only inspection for Pengawas
              <div className="space-y-3">
                <div className="rounded-xl bg-[#f8fafc] p-3 text-xs">
                  <span className="font-bold text-[#64748b]">Status Saat Ini:</span>
                  <div className="mt-1">
                    <StatusBadge status={verifyingSubmission.status} />
                  </div>
                  {verifyingSubmission.latest_review?.notes && (
                    <div className="mt-3 border-t border-[#e2e8f0] pt-2">
                      <span className="font-bold text-[#102d62]">Catatan Pemeriksa:</span>
                      <p className="mt-1 text-[#475569] italic">
                        &quot;{verifyingSubmission.latest_review.notes}&quot;
                      </p>
                      <p className="mt-1 text-[10px] text-[#8ba2bd]">
                        Diverifikasi oleh: {verifyingSubmission.latest_review.reviewer_name ?? "Kepala Sekolah"} (
                        {formatJakartaDateTime(verifyingSubmission.latest_review.reviewed_at)})
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setVerifyingSubmission(null)}
                    className="rounded-xl border border-[#bfd2e8] px-4 py-2 text-xs font-bold text-[#34577f]"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5B. MODAL BATAL VERIFIKASI KEPALA SEKOLAH */}
      {cancelingSubmission && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-[#071d45]/65 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isSubmittingCancel) {
              setCancelingSubmission(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-verify-title"
            className="w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-7 space-y-4"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#e1eaf4] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <RotateCcw size={20} />
                </span>
                <div>
                  <h3 id="cancel-verify-title" className="text-lg font-extrabold text-[#102d62]">
                    Batalkan Verifikasi Tugas
                  </h3>
                  <p className="text-xs text-[#6683a6]">
                    Kembalikan status tugas guru ke status Menunggu Pemeriksaan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelingSubmission(null)}
                disabled={isSubmittingCancel}
                className="rounded-lg p-1 text-[#8ba2bd] hover:bg-[#edf4ff]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-950">
                <AlertCircle size={14} className="text-amber-700" />
                Perhatian:
              </p>
              <p className="text-[11px] leading-relaxed">
                Tindakan ini akan mengembalikan status tugas <strong>{cancelingSubmission.teacher?.full_name}</strong> menjadi <em>Menunggu Verifikasi</em>. Jika tidak ada lagi tugas anggota lain yang diverifikasi pada pertemuan ini, fitur Edit dan Hapus pada akun Ketua akan otomatis terbuka kembali.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#102d62]">
                Alasan Pembatalan Verifikasi <span className="text-red-600">* (Wajib diisi)</span>
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Perlu pemeriksaan ulang terhadap lampiran berkas terbaru guru..."
                className="w-full rounded-xl border border-[#bfd2e8] p-3 text-xs outline-none focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/15"
              />
              <span className="text-[10px] text-[#64748b]">
                Alasan pembatalan akan disimpan dalam riwayat pemeriksaan dan diteruskan kepada guru.
              </span>
            </div>

            {cancelError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                {cancelError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#edf2f8]">
              <button
                type="button"
                onClick={() => setCancelingSubmission(null)}
                disabled={isSubmittingCancel}
                className="rounded-xl border border-[#bfd2e8] px-4 py-2 text-xs font-bold text-[#34577f] hover:bg-[#f8fbff]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelVerification}
                disabled={isSubmittingCancel || !cancelReason.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                <RotateCcw size={13} />
                <span>{isSubmittingCancel ? "Membatalkan..." : "Konfirmasi Pembatalan"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DOCUMENT VIEWER (IFRAME) */}
      {documentViewer && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071d45]/70 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDocumentViewer(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={documentViewer.title}
            className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#e1eaf4] px-5 py-3.5">
              <span className="font-bold text-[#102d62] text-sm truncate">
                {documentViewer.title}
              </span>
              <button
                type="button"
                onClick={() => setDocumentViewer(null)}
                className="rounded-lg p-1.5 text-[#8ba2bd] hover:bg-[#edf4ff] hover:text-[#102d62]"
              >
                <X size={18} />
              </button>
            </div>
            <iframe src={documentViewer.src} title={documentViewer.title} className="h-full w-full bg-[#f8fbff]" />
          </div>
        </div>
      )}

      {/* 7. PROGRESS BAR NOTIFICATION TOAST */}
      {toastMessage && (
        <ProgressBarToast
          title={toastMessage.title}
          message={toastMessage.message}
          durationMs={4000}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
