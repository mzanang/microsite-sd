"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  X,
} from "lucide-react";
import {
  type GuideRole,
  type KbGuideItem,
  formatGuideFileSize,
} from "@/lib/community-guides";

interface CommunityGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLE_DEFINITIONS: {
  key: GuideRole;
  label: string;
  badgeColor: string;
}[] = [
  {
    key: "ketua_sekretaris",
    label: "Panduan untuk Ketua/Sekretaris",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    key: "kepala_sekolah",
    label: "Panduan untuk Kepala Sekolah",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    key: "guru",
    label: "Panduan untuk Guru",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    key: "pengawas_dabin",
    label: "Panduan untuk Pengawas",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
];

export function CommunityGuideModal({
  isOpen,
  onClose,
}: CommunityGuideModalProps) {
  const [guides, setGuides] = useState<KbGuideItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    // Handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    // Fetch guides if not yet loaded
    if (!loaded) {
      setLoading(true);
      setError("");
      fetch("/api/komunitas-belajar/panduan")
        .then((res) => {
          if (!res.ok) throw new Error("Gagal memuat dokumen panduan.");
          return res.json();
        })
        .then((data) => {
          setGuides(data.guides ?? []);
          setLoaded(true);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Gagal memuat dokumen panduan.");
        })
        .finally(() => {
          setLoading(false);
        });
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, loaded, onClose]);

  if (!isOpen) return null;

  // Urutkan list dokumen panduan yang terupload sesuai aturan:
  // 1. Ketua/Sekretaris, 2. Kepala Sekolah, 3. Guru, 4. Pengawas
  const sortedGuides = [...guides].sort((a, b) => {
    const orderA = ROLE_DEFINITIONS.findIndex((r) => r.key === a.role);
    const orderB = ROLE_DEFINITIONS.findIndex((r) => r.key === b.role);
    const posA = orderA === -1 ? 99 : orderA;
    const posB = orderB === -1 ? 99 : orderB;
    if (posA !== posB) return posA - posB;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-[#071E3D]/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col w-full max-w-xl max-h-[88vh] bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-[#E2E8F0] overflow-hidden text-[#172B4D] animate-in zoom-in-95 duration-200">
        {/* Header: Logo Sekolah di kiri, Judul 1 baris, tombol X di kanan */}
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4.5 border-b border-[#EDF2F7] bg-white">
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <Image
              src="/logo.png"
              alt="Logo Sekolah"
              width={38}
              height={38}
              priority
              className="h-9 w-9 sm:h-10 sm:w-10 object-contain shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#125FC1] truncate">
                Panduan Penggunaan
              </p>
              <h2
                id="guide-modal-title"
                className="text-sm sm:text-[15px] font-extrabold text-[#172B4D] truncate whitespace-nowrap"
                title="Panduan Pengguna Platform Komunitas Belajar"
              >
                Panduan Pengguna Platform Komunitas Belajar
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#172B4D] transition border border-[#E2E8F0]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Langsung List Dokumen Panduan Tanpa Filter */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#64748B]">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#125FC1] mb-2" />
              Memuat berkas panduan...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
              <AlertCircle className="inline mr-1.5 h-4 w-4" />
              {error}
            </div>
          ) : sortedGuides.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#CBD5E1] p-8 text-center text-[#64748B]">
              <FileText className="mx-auto h-10 w-10 text-[#94A3B8] mb-2" />
              <p className="text-sm font-bold text-[#334155]">
                Belum ada dokumen panduan yang diunggah.
              </p>
              <p className="mt-1 text-xs text-[#64748B] max-w-sm mx-auto">
                Admin dapat mengunggah berkas panduan PDF melalui dashboard Super Admin.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedGuides.map((guide) => {
                const roleDef =
                  ROLE_DEFINITIONS.find((r) => r.key === guide.role) ??
                  ROLE_DEFINITIONS[2];

                return (
                  <div
                    key={guide.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 transition duration-150 hover:border-[#125FC1]/40 hover:shadow-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-200">
                        <FileText size={20} />
                      </span>
                      <div className="min-w-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleDef.badgeColor}`}
                        >
                          {roleDef.label}
                        </span>
                        <h4 className="mt-1 text-sm font-bold text-[#172B4D] leading-snug break-words">
                          {guide.title}
                        </h4>
                        {guide.description && (
                          <p className="mt-0.5 text-xs text-[#64748B] line-clamp-2 leading-relaxed">
                            {guide.description}
                          </p>
                        )}
                        <p className="mt-1.5 text-[11px] font-medium text-[#94A3B8]">
                          PDF · {formatGuideFileSize(guide.file_size)} · {guide.original_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <a
                        href={guide.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCE3ED] bg-[#F8FAFC] px-3 text-xs font-bold text-[#125FC1] transition hover:border-[#125FC1] hover:bg-[#EDF4FF]"
                      >
                        <ExternalLink size={13} />
                        <span>Buka</span>
                      </a>
                      <a
                        href={guide.file_url}
                        download={guide.original_name}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#125FC1] px-3 text-xs font-bold text-white shadow-xs transition hover:bg-[#0D4FA8]"
                      >
                        <Download size={13} />
                        <span>Unduh</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-t border-[#EDF2F7] bg-[#F8FAFC]">
          <p className="text-[11px] text-[#64748B]">
            SD Negeri Dukuhwaru 01 · Komunitas Belajar
          </p>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-xl bg-white border border-[#DCE3ED] text-xs font-bold text-[#334155] hover:bg-[#F1F5F9] transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}


