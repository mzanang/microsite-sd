"use client";

import { useMemo, useState } from "react";
import { Filter, Search, UserCheck, UserRound, Users } from "lucide-react";
import type { PublicTeamMember } from "@/lib/community-data";

type FilterRole = "all" | "kepala_sekolah" | "pengawas_dabin" | "ketua" | "sekretaris" | "anggota";

export function CommunityTeamTable({ members }: { members: PublicTeamMember[] }) {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterRole>("all");

  const filterOptions: { key: FilterRole; label: string }[] = [
    { key: "all", label: "Semua" },
    { key: "pengawas_dabin", label: "Pengawas Dabin" },
    { key: "kepala_sekolah", label: "Kepala Sekolah" },
    { key: "ketua", label: "Ketua" },
    { key: "sekretaris", label: "Sekretaris" },
    { key: "anggota", label: "Anggota" },
  ];

  // Combined search and role filter
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Role filter
      if (selectedFilter === "kepala_sekolah" && member.role !== "kepala_sekolah") return false;
      if (selectedFilter === "pengawas_dabin" && member.role !== "pengawas_dabin") return false;
      if (selectedFilter === "ketua" && member.community_position !== "ketua") return false;
      if (selectedFilter === "sekretaris" && member.community_position !== "sekretaris") return false;
      if (selectedFilter === "anggota" && (member.role !== "guru" || ["ketua", "sekretaris"].includes(member.community_position ?? ""))) return false;

      // Text search
      const q = search.trim().toLowerCase();
      if (!q) return true;

      const matchName = member.name.toLowerCase().includes(q);
      const matchRole = member.display_role.toLowerCase().includes(q);
      const matchTeacherType = (member.teacher_type ?? "").toLowerCase().includes(q);
      const matchGrade = (member.grade_or_subject ?? "").toLowerCase().includes(q);

      return matchName || matchRole || matchTeacherType || matchGrade;
    });
  }, [members, search, selectedFilter]);

  // Compute counts for quick overview
  const counts = useMemo(() => {
    return {
      all: members.length,
      kepala_sekolah: members.filter((m) => m.role === "kepala_sekolah").length,
      pengawas_dabin: members.filter((m) => m.role === "pengawas_dabin").length,
      ketua: members.filter((m) => m.community_position === "ketua").length,
      sekretaris: members.filter((m) => m.community_position === "sekretaris").length,
      anggota: members.filter((m) => m.role === "guru" && !["ketua", "sekretaris"].includes(m.community_position ?? "")).length,
    };
  }, [members]);

  return (
    <section id="guru" className="scroll-mt-40 bg-[#f2f4f6] py-16 sm:py-20 xl:scroll-mt-24">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#005bbf]">
              Struktur Keanggotaan
            </p>
            <h2 className="mt-2 text-[26px] font-bold leading-9 tracking-[-.02em] text-[#191c1e] sm:text-[32px]">
              Tim Komunitas Belajar
            </h2>
            <p className="mt-2 text-sm text-[#414754] max-w-2xl">
              Mengenal pimpinan, pembina, dan anggota Komunitas Belajar Guru SD Negeri Dukuhwaru 01.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#dbe6f5] bg-white px-3.5 py-2 text-xs font-semibold text-[#536f92] shadow-sm self-start sm:self-auto">
            <Users size={16} className="text-[#005bbf]" />
            <span>Total: <strong className="text-[#102d62]">{members.length}</strong> Pendidik & Pengelola</span>
          </div>
        </div>

        {/* Search & Filter Controls Card */}
        <div className="mt-8 rounded-2xl border border-[#e2e8f0] bg-white p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#727785]">
                <Search size={18} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, jabatan, jenis guru, atau kelas/mapel..."
                className="h-11 w-full rounded-xl border border-[#bfd2e8] bg-[#f8fbff] pl-10 pr-4 text-sm text-[#191c1e] outline-none transition placeholder:text-[#8ba2bd] focus:border-[#005bbf] focus:bg-white focus:ring-4 focus:ring-[#005bbf]/10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-bold text-[#727785] hover:text-[#191c1e]"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter jabatan">
              <span className="mr-1 hidden items-center gap-1 text-xs font-bold text-[#64748b] lg:inline-flex">
                <Filter size={13} /> Filter:
              </span>
              {filterOptions.map((opt) => {
                const count = counts[opt.key];
                const active = selectedFilter === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSelectedFilter(opt.key)}
                    className={`kb-team-filter-pill inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      active
                        ? "is-active bg-[#005bbf] text-white shadow-sm"
                        : "bg-[#e2e8f0] text-[#1e293b] hover:bg-[#cbd5e1] hover:text-black"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span
                      className={`kb-pill-count inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] ${
                        active ? "bg-white/20 text-white" : "bg-[#cbd5e1] text-[#0f172a]"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between border-t border-[#f1f5f9] pt-3 text-xs text-[#64748b]">
            <span>
              Menampilkan <strong className="text-[#102d62]">{filteredMembers.length}</strong> dari{" "}
              {members.length} tenaga pendidik dan pengelola
            </span>
            {(search || selectedFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedFilter("all");
                }}
                className="font-bold text-[#005bbf] hover:underline"
              >
                Hapus semua filter
              </button>
            )}
          </div>
        </div>

        {/* TAMPILAN DESKTOP — TABEL */}
        <div className="mt-6 hidden md:block">
          <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Daftar Tim Komunitas Belajar</caption>
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-xs font-bold uppercase tracking-[.08em] text-[#536f92]">
                  <th scope="col" className="px-5 py-4 w-16 text-center">No.</th>
                  <th scope="col" className="px-6 py-4">Nama Lengkap</th>
                  <th scope="col" className="px-6 py-4">Jenis Guru</th>
                  <th scope="col" className="px-6 py-4">Jabatan Komunitas</th>
                  <th scope="col" className="px-6 py-4">Kelas / Mapel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2f8]">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member, index) => (
                    <tr
                      key={member.id || `${member.name}-${index}`}
                      className="transition-colors hover:bg-[#f8fbff]"
                    >
                      <td className="px-5 py-4 text-center text-sm font-bold text-[#1264c5]">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f1ff] text-[#1264c5]">
                            <UserRound size={17} />
                          </span>
                          <span className="font-bold text-[#102d62] text-sm">
                            {member.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#475569]">
                        {member.teacher_type}
                      </td>
                      <td className="px-6 py-4">
                        <RoleBadge role={member.role} position={member.community_position} label={member.display_role} />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-[#475569]">
                        {member.grade_or_subject}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <EmptySearchResult onReset={() => { setSearch(""); setSelectedFilter("all"); }} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TAMPILAN MOBILE — CARDS RESPONSIF */}
        <div className="mt-6 space-y-3 md:hidden">
          {filteredMembers.length > 0 ? (
            filteredMembers.map((member, index) => (
              <article
                key={member.id || `${member.name}-${index}`}
                className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f1ff] text-[#1264c5]">
                      <UserRound size={18} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-[#102d62] text-sm leading-tight truncate">
                        {member.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-[#64748b]">
                        No. {index + 1}
                      </p>
                    </div>
                  </div>
                  <RoleBadge role={member.role} position={member.community_position} label={member.display_role} />
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-[#f1f5f9] pt-3 text-xs">
                  <div className="rounded-xl bg-[#f8fafc] p-2.5">
                    <span className="block text-[11px] font-semibold text-[#8ba2bd]">Jenis Guru</span>
                    <span className="mt-0.5 block font-bold text-[#334155]">{member.teacher_type}</span>
                  </div>
                  <div className="rounded-xl bg-[#f8fafc] p-2.5">
                    <span className="block text-[11px] font-semibold text-[#8ba2bd]">Kelas / Mapel</span>
                    <span className="mt-0.5 block font-bold text-[#334155]">{member.grade_or_subject}</span>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[#c1c6d6] bg-white p-8 text-center">
              <EmptySearchResult onReset={() => { setSearch(""); setSelectedFilter("all"); }} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function RoleBadge({
  role,
  position,
  label,
}: {
  role: string;
  position: string | null;
  label: string;
}) {
  // Pengawas Dabin: Biru
  if (role === "pengawas_dabin") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
        {label}
      </span>
    );
  }

  // Kepala Sekolah: Ungu
  if (role === "kepala_sekolah") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
        {label}
      </span>
    );
  }

  // Ketua dan Sekretaris: Hijau
  if (position === "ketua" || position === "sekretaris") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        {label}
      </span>
    );
  }

  // Anggota: Netral / Abu-abu
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
      {label}
    </span>
  );
}

function EmptySearchResult({ onReset }: { onReset: () => void }) {
  return (
    <div className="space-y-2 py-4">
      <UserCheck size={32} className="mx-auto text-[#94a3b8]" />
      <p className="font-bold text-[#1e293b] text-sm">Data tidak ditemukan</p>
      <p className="text-xs text-[#64748b] max-w-sm mx-auto">
        Tidak ada tenaga pendidik atau pengelola yang sesuai dengan kata kunci pencarian atau filter yang dipilih.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-2 inline-flex h-9 items-center justify-center rounded-xl bg-[#005bbf] px-4 text-xs font-bold text-white hover:bg-[#004795]"
      >
        Tampilkan Semua Tim
      </button>
    </div>
  );
}

