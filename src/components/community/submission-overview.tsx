"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/community/review-manager";

type FileViewerState = {
  submissionId: string;
  src?: string;
  title: string;
  mimeType?: string;
  fileSize?: number;
  createdAt?: string;
  isLoading: boolean;
  errorMessage?: string;
};

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type SubmissionOverviewRow = {
  id: string;
  requirement_id: string;
  status: string; // 'menunggu_pemeriksaan' | 'lengkap' | 'perlu_perbaikan' | 'menunggu_verifikasi_ulang'
  raw_status?: string;
  current_version_no: number;
  submitted_at: string | null;
  teacher?: {
    id?: string;
    full_name?: string;
    login_identifier?: string | null;
    role?: string;
    teacher_type?: string | null;
    teaching_grade?: number | null;
    teaching_subject?: string | null;
    community_position?: string | null;
  } | null;
  latest_version?: {
    id?: string;
    version_no?: number;
    collection_method: string;
    original_name: string | null;
    external_url: string | null;
  } | null;
  reviews?: Array<{
    reviewer_role: string;
    reviewer_name?: string;
    status: string;
    notes: string;
    reviewed_at: string | null;
  }>;
  latest_review?: {
    reviewer_role: string;
    reviewer_name?: string;
    status: string;
    notes: string;
    reviewed_at: string | null;
  } | null;
};

type Requirement = {
  id: string;
  name: string;
  description?: string;
  collection_method: string;
  is_required: boolean;
  due_at: string | null;
  meeting_number?: number | null;
  material_title?: string | null;
  event_date?: string | null;
};

function formatJakartaDateTime(isoDate?: string | null): string {
  if (!isoDate) return "Belum dikumpulkan";
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return "Belum dikumpulkan";
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

export function SubmissionOverviewV2({
  pageTitle = "Tugas Masuk",
  pageDescription = "Pantau status pengumpulan tugas anggota dan hasil verifikasi Kepala Sekolah.",
}: {
  pageTitle?: string;
  pageDescription?: string;
}) {
  const [rows, setRows] = useState<SubmissionOverviewRow[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selected, setSelected] = useState<SubmissionOverviewRow | null>(null);

  // Filters (TASK 6)
  const [searchGuru, setSearchGuru] = useState("");
  const [filterPertemuan, setFilterPertemuan] = useState("all");
  const [filterMateri, setFilterMateri] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterStatusPengumpulan, setFilterStatusPengumpulan] = useState("all");
  const [filterStatusVerifikasi, setFilterStatusVerifikasi] = useState("all");

  const [viewer, setViewer] = useState<FileViewerState | null>(null);
  const [opening, setOpening] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/komunitas-belajar/submissions", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Data pengumpulan gagal dimuat.");
      } else {
        setRows(body.submissions ?? []);
        setRequirements(body.requirements ?? []);
        setError("");
      }
    } catch {
      setError("Gagal terhubung ke server.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!supabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase
      .channel("kb-submission-overview-live-v3")
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_submissions" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_reviews" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  async function fetchFileUrl(submissionId: string, fallbackTitle: string) {
    try {
      const response = await fetch(`/api/komunitas-belajar/submissions/${submissionId}/file`, { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as {
        url?: string;
        name?: string;
        mime_type?: string;
        file_size?: number;
        created_at?: string;
        error?: string;
      };

      if (!response.ok || !body.url) {
        setViewer((prev) =>
          prev && prev.submissionId === submissionId
            ? { ...prev, isLoading: false, errorMessage: body.error ?? "Dokumen tidak dapat dimuat dari server." }
            : prev
        );
      } else {
        setViewer({
          submissionId,
          src: body.url,
          title: body.name ?? fallbackTitle,
          mimeType: body.mime_type,
          fileSize: body.file_size,
          createdAt: body.created_at,
          isLoading: false,
        });
      }
    } catch {
      setViewer((prev) =>
        prev && prev.submissionId === submissionId
          ? { ...prev, isLoading: false, errorMessage: "Gagal terhubung ke server penyimpanan dokumen." }
          : prev
      );
    }
  }

  async function openDocument(submission: SubmissionOverviewRow) {
    setError("");
    setOpening(submission.id);

    try {
      // File pengumpulan dibuka pada popup preview di halaman ini.
      const title = submission.latest_version?.original_name ?? "Dokumen tugas";
      setViewer({ submissionId: submission.id, title, isLoading: true });

      await fetchFileUrl(submission.id, title);
    } finally {
      setOpening("");
    }
  }

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const req = requirements.find((r) => r.id === row.requirement_id);

      // 1. Search Teacher
      const name = row.teacher?.full_name ?? "";
      if (searchGuru.trim() && !name.toLowerCase().includes(searchGuru.trim().toLowerCase())) {
        return false;
      }

      // 2. Pertemuan Ke
      if (filterPertemuan !== "all") {
        const meeting = req?.meeting_number ? String(req.meeting_number) : "-";
        if (meeting !== filterPertemuan) return false;
      }

      // 3. Materi Kegiatan
      if (filterMateri !== "all") {
        const material = req?.material_title ?? "-";
        if (material !== filterMateri) return false;
      }

      // 4 & 5. Month & Year
      if (row.submitted_at) {
        const date = new Date(row.submitted_at);
        if (filterMonth !== "all" && String(date.getMonth() + 1) !== filterMonth) return false;
        if (filterYear !== "all" && String(date.getFullYear()) !== filterYear) return false;
      } else {
        if (filterMonth !== "all" || filterYear !== "all") return false;
      }

      // 6. Status Pengumpulan
      if (filterStatusPengumpulan !== "all") {
        const hasSubmitted = Boolean(row.submitted_at);
        if (filterStatusPengumpulan === "sudah" && !hasSubmitted) return false;
        if (filterStatusPengumpulan === "belum" && hasSubmitted) return false;
      }

      // 7. Status Verifikasi
      if (filterStatusVerifikasi !== "all") {
        if (filterStatusVerifikasi === "menunggu" && !(row.status === "menunggu_pemeriksaan" || row.status === "menunggu_verifikasi_ulang")) return false;
        if (filterStatusVerifikasi === "lengkap" && row.status !== "lengkap") return false;
        if (filterStatusVerifikasi === "perlu_perbaikan" && row.status !== "perlu_perbaikan") return false;
        if (filterStatusVerifikasi === "menunggu_verifikasi_ulang" && row.status !== "menunggu_verifikasi_ulang") return false;
      }

      return true;
    });
  }, [rows, requirements, searchGuru, filterPertemuan, filterMateri, filterMonth, filterYear, filterStatusPengumpulan, filterStatusVerifikasi]);

  const resetFilters = () => {
    setSearchGuru("");
    setFilterPertemuan("all");
    setFilterMateri("all");
    setFilterMonth("all");
    setFilterYear("all");
    setFilterStatusPengumpulan("all");
    setFilterStatusVerifikasi("all");
  };

  const meetingsList = useMemo(() => {
    const set = new Set<string>();
    requirements.forEach((r) => {
      if (r.meeting_number) set.add(String(r.meeting_number));
    });
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [requirements]);

  const materialsList = useMemo(() => {
    const set = new Set<string>();
    requirements.forEach((r) => {
      if (r.material_title) set.add(r.material_title);
    });
    return Array.from(set);
  }, [requirements]);

  const yearsList = useMemo(() => {
    const set = new Set<string>([String(new Date().getFullYear())]);
    rows.forEach((r) => {
      if (r.submitted_at) set.add(String(new Date(r.submitted_at).getFullYear()));
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [rows]);

  return (
    <>
      <section className="rounded-2xl border border-[#dbe6f5] bg-white p-6 shadow-sm sm:p-8 space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Pengumpulan tugas</p>
          <h2 className="mt-2 text-2xl font-extrabold text-[#102d62]">{pageTitle}</h2>
          <p className="mt-2 text-sm text-[#6683a6]">{pageDescription}</p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {error}
          </p>
        )}

        {/* FILTER BAR (TASK 6) */}
        <div className="rounded-2xl border border-[#e1eaf4] bg-[#f8fbff] p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1970d2]">
              <Filter size={14} /> Filter Pengumpulan
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#536f92] hover:bg-[#edf4ff] hover:text-[#1264c5]"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {/* 1. Nama Guru */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#34577f] mb-1">Nama Guru</label>
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8ba2bd]" />
                <input
                  type="text"
                  value={searchGuru}
                  onChange={(e) => setSearchGuru(e.target.value)}
                  placeholder="Cari guru..."
                  className="h-9 w-full rounded-xl border border-[#bfd2e8] bg-white pl-8 pr-3 text-xs outline-none focus:border-[#1970d2]"
                />
              </div>
            </div>

            {/* 2. Pertemuan Ke */}
            <div>
              <label className="block text-[11px] font-bold text-[#34577f] mb-1">Pertemuan</label>
              <select
                value={filterPertemuan}
                onChange={(e) => setFilterPertemuan(e.target.value)}
                className="h-9 w-full rounded-xl border border-[#bfd2e8] bg-white px-2 text-xs outline-none focus:border-[#1970d2]"
              >
                <option value="all">Semua</option>
                {meetingsList.map((m) => (
                  <option key={m} value={m}>
                    Ke-{m}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Materi Kegiatan */}
            <div>
              <label className="block text-[11px] font-bold text-[#34577f] mb-1">Materi</label>
              <select
                value={filterMateri}
                onChange={(e) => setFilterMateri(e.target.value)}
                className="h-9 w-full rounded-xl border border-[#bfd2e8] bg-white px-2 text-xs outline-none focus:border-[#1970d2]"
              >
                <option value="all">Semua</option>
                {materialsList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Bulan */}
            <div>
              <label className="block text-[11px] font-bold text-[#34577f] mb-1">Bulan</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="h-9 w-full rounded-xl border border-[#bfd2e8] bg-white px-2 text-xs outline-none focus:border-[#1970d2]"
              >
                <option value="all">Semua</option>
                {[
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "Mei",
                  "Jun",
                  "Jul",
                  "Agu",
                  "Sep",
                  "Okt",
                  "Nov",
                  "Des",
                ].map((name, idx) => (
                  <option key={name} value={String(idx + 1)}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Tahun */}
            <div>
              <label className="block text-[11px] font-bold text-[#34577f] mb-1">Tahun</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="h-9 w-full rounded-xl border border-[#bfd2e8] bg-white px-2 text-xs outline-none focus:border-[#1970d2]"
              >
                <option value="all">Semua</option>
                {yearsList.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Status Verifikasi */}
            <div>
              <label className="block text-[11px] font-bold text-[#34577f] mb-1">Verifikasi KS</label>
              <select
                value={filterStatusVerifikasi}
                onChange={(e) => setFilterStatusVerifikasi(e.target.value)}
                className="h-9 w-full rounded-xl border border-[#bfd2e8] bg-white px-2 text-xs outline-none focus:border-[#1970d2]"
              >
                <option value="all">Semua</option>
                <option value="menunggu">Menunggu</option>
                <option value="lengkap">Lengkap</option>
                <option value="perlu_perbaikan">Perlu Perbaikan</option>
                <option value="menunggu_verifikasi_ulang">Verif Ulang</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#dbe6f5] pt-2.5 text-xs text-[#64748b]">
            <span>
              Menampilkan <strong className="text-[#102d62]">{filteredRows.length}</strong> dari {rows.length} pengumpulan.
            </span>
          </div>
        </div>

        {/* TABEL PENGUMPULAN */}
        {filteredRows.length ? (
          <div className="overflow-x-auto rounded-xl border border-[#e1eaf4]">
            <table className="w-full min-w-[1100px] text-left text-sm border-collapse">
              <caption className="sr-only">Daftar pengumpulan tugas</caption>
              <thead className="bg-[#f8fbff] text-xs font-bold uppercase tracking-[.08em] text-[#536f92] border-b border-[#e1eaf4]">
                <tr>
                  <th scope="col" className="px-4 py-3 text-center w-12">No.</th>
                  <th scope="col" className="px-4 py-3">Nama Guru</th>
                  <th scope="col" className="px-4 py-3">Tugas / Pertemuan</th>
                  <th scope="col" className="px-4 py-3">Materi Kegiatan</th>
                  <th scope="col" className="px-4 py-3">Waktu Pengumpulan</th>
                  <th scope="col" className="px-4 py-3 text-center">Dokumen</th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3">Status Verifikasi KS</th>
                  <th scope="col" className="px-4 py-3 text-right w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2f8]">
                {filteredRows.map((row, idx) => {
                  const req = getRequirement(row);
                  const ksReview = row.latest_review ?? row.reviews?.find((r) => r.reviewer_role === "kepala_sekolah");
                  const externalUrl = getExternalUrl(row.latest_version?.external_url);

                  return (
                    <tr key={row.id} className="hover:bg-[#f8fbff] transition-colors">
                      <td className="px-4 py-3.5 text-center font-bold text-[#1264c5] text-xs">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-[#102d62] text-sm">
                          {row.teacher?.full_name ?? "Guru"}
                        </div>
                        <div className="text-[11px] text-[#64748b]">
                          {row.teacher?.teacher_type ?? "Guru"}
                          {row.teacher?.teaching_grade ? ` · Kelas ${row.teacher.teaching_grade}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-[#102d62] text-xs">{req?.name ?? "Tugas"}</p>
                        <p className="text-[11px] text-[#64748b]">
                          {req?.meeting_number ? `Pertemuan ke-${req.meeting_number}` : "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#536f92] max-w-xs truncate">
                        {req?.material_title ?? "-"}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#536f92] whitespace-nowrap">
                        {formatJakartaDateTime(row.submitted_at)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {externalUrl ? (
                          <a
                            href={externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1264c5] hover:underline"
                          >
                            <ExternalLink size={12} />
                            <span>Lihat</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void openDocument(row)}
                            disabled={opening === row.id}
                            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#1264c5] hover:underline disabled:cursor-wait disabled:opacity-60"
                          >
                            <FileText size={12} />
                            <span>{opening === row.id ? "..." : "File"}</span>
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={row.status} plain />
                        {ksReview?.reviewer_name && (
                          <span className="block mt-1 text-[10px] text-[#64748b]">
                            oleh {ksReview.reviewer_name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelected(row)}
                          className="inline-flex items-center gap-1 rounded-xl border border-[#bfd2e8] px-3 py-1 text-xs font-bold text-[#1264c5] hover:bg-[#edf4ff]"
                        >
                          <Eye size={12} /> Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#bfd2e8] p-10 text-center text-sm text-[#6683a6]">
            <FileCheck2 size={32} className="mx-auto text-[#bfd2e8] mb-2" />
            Belum ada tugas masuk yang sesuai filter.
          </div>
        )}
      </section>

      {/* DETAIL MODAL */}
      {selected && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#071d45]/60 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="submission-detail-title"
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-7 space-y-4"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#e1eaf4] pb-3.5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-[#1970d2]">Detail Pengumpulan</p>
                <h3 id="submission-detail-title" className="mt-1 text-xl font-extrabold text-[#102d62]">
                  {getRequirement(selected)?.name ?? "Tugas Komunitas"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1 text-[#8ba2bd] hover:bg-[#edf4ff]"
              >
                <X size={18} />
              </button>
            </div>

            <dl className="grid gap-3 rounded-xl bg-[#f8fbff] p-4 text-xs sm:grid-cols-2 border border-[#e1eaf4]">
              <div>
                <dt className="text-[#64748b] font-medium">Nama Guru:</dt>
                <dd className="mt-0.5 font-bold text-[#102d62] text-sm">{selected.teacher?.full_name ?? "Guru"}</dd>
              </div>
              <div>
                <dt className="text-[#64748b] font-medium">Jenis Guru:</dt>
                <dd className="mt-0.5 text-[#536f92] font-semibold">
                  {selected.teacher?.teacher_type ?? "Guru"}
                  {selected.teacher?.teaching_grade ? ` (Kelas ${selected.teacher.teaching_grade})` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-[#64748b] font-medium">Pertemuan:</dt>
                <dd className="mt-0.5 text-[#102d62] font-semibold">
                  {getRequirement(selected)?.meeting_number ? `Pertemuan ke-${getRequirement(selected)?.meeting_number}` : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-[#64748b] font-medium">Materi Kegiatan:</dt>
                <dd className="mt-0.5 text-[#102d62] font-semibold">{getRequirement(selected)?.material_title ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-[#64748b] font-medium">Waktu Pengumpulan:</dt>
                <dd className="mt-0.5 text-[#536f92]">{formatJakartaDateTime(selected.submitted_at)}</dd>
              </div>
              <div>
                <dt className="text-[#64748b] font-medium">Status Verifikasi KS:</dt>
                <dd className="mt-1">
                  <StatusBadge status={selected.status} />
                </dd>
              </div>
            </dl>

            {/* Catatan KS jika ada */}
            {selected.reviews?.filter((r) => r.reviewer_role === "kepala_sekolah" && r.notes).map((r, idx) => (
              <div key={idx} className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs space-y-1">
                <p className="font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-amber-700" />
                  Catatan Pemeriksaan Kepala Sekolah:
                </p>
                <p className="text-amber-950 font-medium whitespace-pre-wrap leading-relaxed pl-5">
                  &quot;{r.notes}&quot;
                </p>
                <p className="text-[10px] text-amber-700/80 pl-5 pt-1">
                  Diverifikasi oleh: {r.reviewer_name ?? "Kepala Sekolah"} ({formatJakartaDateTime(r.reviewed_at)})
                </p>
              </div>
            ))}

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#e1eaf4]">
              {getExternalUrl(selected.latest_version?.external_url) ? (
                <a
                  href={getExternalUrl(selected.latest_version?.external_url) ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0b5fc3] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#094ba0]"
                >
                  <ExternalLink size={13} />
                  <span>Lihat</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => void openDocument(selected)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0b5fc3] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#094ba0]"
                >
                  <FileText size={13} />
                  <span>Buka / Unduh File</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl border border-[#bfd2e8] px-4 py-2 text-xs font-bold text-[#536f92] hover:bg-[#f8fbff]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}

