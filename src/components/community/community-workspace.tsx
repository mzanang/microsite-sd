"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, BarChart3, BookOpen, CalendarCheck2, CheckCircle2, ClipboardCheck, FileText, Image as ImageIcon, Lock, MessageCircle, Plus, RefreshCw, UserRound, UsersRound, X, type LucideIcon } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { KbProfile } from "@/lib/kb/auth";
import type { DashboardRequirement, DashboardView, RoleDashboardData } from "@/lib/kb/dashboard-data";
import { ReviewManager } from "@/components/community/review-manager";
import { SkManagement } from "@/components/community/sk-management";
import { SubmissionManager } from "@/components/community/submission-manager";
import { SubmissionOverviewV2 } from "@/components/community/submission-overview";
import { AttendanceWorkspace as AttendanceWorkspaceV2 } from "@/components/community/attendance-workspace";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import { AccountSecurityDialog } from "@/components/community/account-security";

export type PublicDocument = { id: string; title: string; description: string; original_name: string; public_url: string; created_at: string };
type CommunityEntry = { id: string; menu_key: string; title: string; body: string; external_url: string | null; session_id: string | null; meeting_number: number | null; event_date: string | null; category: string; attachments: Array<{ path: string; name: string; size: number; mime_type: string; url?: string | null }>; is_published: boolean; is_pinned: boolean; created_by: string | null; created_at: string };
type CommunitySession = { id: string; title: string; event_date: string; material_entry_id: string | null; material_title: string };
type TaskSession = { id: string; meeting_number: number; material_title: string; event_date: string };
export type WorkspaceProps = { profile: KbProfile; view: DashboardView; menu: string; accessLevel: "lihat" | "kelola" | "monitoring"; data: RoleDashboardData; documents: PublicDocument[] };

const resourceMap: Record<string, { title: string; description: string; publicHref: string; icon: LucideIcon }> = {
  materi: { title: "Materi kegiatan", description: "Baca bahan kegiatan yang sudah dipublikasikan untuk komunitas.", publicHref: "/komunitas-belajar/materi-kegiatan", icon: BookOpen },
  dokumentasi: { title: "Dokumentasi kegiatan", description: "Ruang dokumentasi kegiatan komunitas. Konten publik tampil setelah pengelola menambahkannya.", publicHref: "/komunitas-belajar/dokumentasi-kegiatan", icon: ImageIcon },
  praktik_baik: { title: "Praktik baik guru", description: "Kumpulan pengalaman pembelajaran yang dibagikan oleh anggota komunitas.", publicHref: "/komunitas-belajar/praktik-baik-guru", icon: CheckCircle2 },
  forum: { title: "Forum diskusi", description: "Ruang untuk bertukar pertanyaan dan pengalaman pembelajaran.", publicHref: "/komunitas-belajar/forum-diskusi-guru", icon: MessageCircle },
};

export function CommunityWorkspace({ profile, view, menu, accessLevel, data, documents }: WorkspaceProps) {
  if (menu === "upload_sk") return <WorkspaceFrame eyebrow="Arsip komunitas" title="Upload SK Kombel" description="Kelola atau baca dokumen keputusan komunitas sesuai kewenangan akun." accessLevel={accessLevel}><section className="rounded-2xl border border-[#dbe6f5] bg-white p-5 sm:p-7">{accessLevel === "kelola" ? <SkManagement /> : <DocumentArchive documents={documents} />}</section></WorkspaceFrame>;
  if (resourceMap[menu]) { const resource = resourceMap[menu]; return <WorkspaceFrame eyebrow="Kegiatan komunitas" title={resource.title} description={resource.description} accessLevel={accessLevel}><ResourceWorkspaceRouter profile={profile} resource={resource} menu={menu} canManage={accessLevel === "kelola"} /></WorkspaceFrame>; }
  if (menu === "memberikan_tugas") return <WorkspaceFrame eyebrow="Manajemen tugas" title="Buat tugas Kombel" description="Tambahkan persyaratan administrasi yang akan dikerjakan oleh anggota." accessLevel={accessLevel}><TaskManager initialRequirements={data.requirements} /></WorkspaceFrame>;
  if (menu === "tugas_kombel") return <WorkspaceFrame eyebrow="Kegiatan komunitas" title="Tugas Kombel" description="Lihat persyaratan yang perlu diselesaikan dan buka ruang pengumpulan." accessLevel={accessLevel}><TaskList requirements={data.requirements} /></WorkspaceFrame>;
  if (menu === "tugas") return <WorkspaceFrame eyebrow="Kumpulkan tugas" title="Tugas & Administrasi" description="Kelola pengumpulan dan pantau hasil verifikasi Kepala Sekolah." accessLevel={accessLevel}><SubmissionManager /></WorkspaceFrame>;
  if (menu === "upload_tugas") {
    const isPersonalTaskView = view === "anggota" || view === "ketua";
    return isPersonalTaskView
      ? <WorkspaceFrame eyebrow="Kumpulkan tugas" title="Kumpulkan Tugas" description="Kirim dokumen atau link tugas yang diminta Ketua Kombel." accessLevel={accessLevel}><SubmissionManager /></WorkspaceFrame>
      : <WorkspaceFrame eyebrow="Manajemen tugas" title="Tugas Masuk" description="Lihat pengumpulan tugas guru sesuai kewenangan akun." accessLevel={accessLevel}><SubmissionOverviewV2 pageTitle="Tugas Masuk" pageDescription="Lihat pengumpulan tugas guru sesuai kewenangan akun." /></WorkspaceFrame>;
  }
  if (menu === "pengumpulan_anggota") return <WorkspaceFrame eyebrow="Manajemen tugas" title="Tugas Masuk" description="Pantau nama pengirim, peran, dan tanggal pengumpulan tugas anggota." accessLevel={accessLevel}><SubmissionOverviewV2 pageTitle="Tugas Masuk Anggota" pageDescription="Pantau nama pengirim, peran, status verifikasi Kepala Sekolah, dan catatan pemeriksaan." /></WorkspaceFrame>;
  if (menu === "verifikasi") return <WorkspaceFrame eyebrow="Pemeriksaan" title="Verifikasi tugas" description={view === "ks" ? "Periksa dokumen dan simpan hasil pemeriksaan untuk peran Anda." : "Pantau nama guru dan status tugas yang masuk."} accessLevel={accessLevel}><ReviewManager canReview={view === "ks"} /></WorkspaceFrame>;
  if (menu === "monitoring") return <WorkspaceFrame eyebrow="Monitoring" title="Monitoring anggota" description="Lihat status pengumpulan anggota tanpa mengubah data mereka." accessLevel={accessLevel}><SubmissionOverviewV2 /></WorkspaceFrame>;
  if (menu === "grafik") return <WorkspaceFrame eyebrow="Monitoring" title="Grafik dan statistik" description="Baca ringkasan data pengumpulan yang tersedia untuk akun Anda." accessLevel={accessLevel}><ChartWorkspace data={data} /></WorkspaceFrame>;
  if (menu === "laporan_kegiatan") return <WorkspaceFrame eyebrow="Monitoring" title="Laporan kegiatan" description="Unduh ringkasan pengumpulan komunitas berdasarkan data yang tersedia." accessLevel={accessLevel}><ReportWorkspace data={data} /></WorkspaceFrame>;
  if (menu === "daftar_hadir" || menu === "jadwal_kegiatan") return <WorkspaceFrame eyebrow={menu === "jadwal_kegiatan" ? "Informasi" : "Monitoring"} title={menu === "jadwal_kegiatan" ? "Jadwal kegiatan" : "Daftar hadir"} description={view === "pengawas" ? "Pengawas Dabin hanya dapat mengunduh rekap daftar hadir." : "Ruang untuk mencatat dan membaca kehadiran kegiatan komunitas."} accessLevel={accessLevel}><AttendanceWorkspaceV2 canCreate={accessLevel === "kelola" && view === "ketua"} canMark={view === "ketua" || view === "anggota" || view === "ks"} canExport={view !== "anggota"} canSeeDetails={view !== "anggota"} canManage={view === "ketua"} /></WorkspaceFrame>;
  return <WorkspaceFrame eyebrow="Profil" title="Profil saya" description="Periksa identitas akun dan pengaturan akses Anda." accessLevel={accessLevel}><ProfileWorkspace profile={profile} view={view} data={data} /></WorkspaceFrame>;
}

function WorkspaceFrame({ eyebrow, title, description, accessLevel, children }: { eyebrow: string; title: string; description: string; accessLevel: string; children: React.ReactNode }) {
  return <><header className="rounded-2xl border border-[#dbe6f5] bg-white px-5 py-6 shadow-[0_8px_22px_rgba(23,83,158,.05)] sm:px-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">{eyebrow}</p><div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-extrabold tracking-tight text-[#102d62] sm:text-3xl">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#6683a6]">{description}</p></div><span className="w-fit rounded-lg bg-[#edf4ff] px-3 py-2 text-xs font-bold text-[#1264c5]">Akses: {accessLabel(accessLevel)}</span></div></header><div className="space-y-5">{children}</div></>;
}

function accessLabel(level: string) { return level === "kelola" ? "Kelola" : level === "monitoring" ? "Monitoring" : "Lihat"; }

type ContentMode = "materi" | "dokumentasi" | "praktik_baik" | "forum";

function ResourceWorkspaceRouter({ profile, resource, menu, canManage }: { profile: KbProfile; resource: (typeof resourceMap)[string]; menu: string; canManage: boolean }) {
  if (menu === "forum") return <div className="space-y-3"><div className="flex justify-end"><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("kb-forum-refresh"))} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#bfd2e8] px-4 text-sm font-bold text-[#1264c5] hover:bg-[#edf4ff]"><RefreshCw size={16} aria-hidden="true" />Refresh forum</button></div><ContentManager profile={profile} resource={resource} mode={menu} canManage={canManage} /></div>;
  if (menu === "materi" || menu === "dokumentasi" || menu === "praktik_baik") return <ContentManager profile={profile} resource={resource} mode={menu} canManage={canManage} />;
  return <ResourceWorkspace resource={resource} menu={menu} canManage={canManage} />;
}

function ContentManager({ profile, resource, mode, canManage }: { profile: KbProfile; resource: (typeof resourceMap)[string]; mode: ContentMode; canManage: boolean }) {
  const Icon = resource.icon;
  const canCreate = canManage || mode === "forum";
  const [entries, setEntries] = useState<CommunityEntry[]>([]);
  const [sessions, setSessions] = useState<CommunitySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [meetingNumber, setMeetingNumber] = useState(1);
  const [sessionId, setSessionId] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [category, setCategory] = useState("");
  const [background, setBackground] = useState("");
  const [action, setAction] = useState("");
  const [impact, setImpact] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [openAttendance, setOpenAttendance] = useState(false);
  const [activeFrom, setActiveFrom] = useState("08:00");
  const [activeUntil, setActiveUntil] = useState("15:00");

  const load = useCallback(async () => {
    setLoading(true);
    const contentPromise = fetch("/api/komunitas-belajar/content?menu=" + mode, { cache: "no-store" });
    const attendancePromise = mode === "materi"
      ? fetch("/api/komunitas-belajar/attendance", { cache: "no-store" })
      : Promise.resolve(null);

    const [contentResponse, attendanceResponse] = await Promise.all([contentPromise, attendancePromise]);
    const contentResult = await contentResponse.json().catch(() => ({}));
    if (!contentResponse.ok) {
      setError(contentResult.error ?? "Konten gagal dimuat.");
    } else {
      const nextEntries = contentResult.entries ?? [];
      setEntries(nextEntries);
      if (mode === "materi") setMeetingNumber(Math.max(0, ...nextEntries.map((entry: CommunityEntry) => entry.meeting_number ?? 0)) + 1);
    }
    if (attendanceResponse && attendanceResponse.ok) {
      const attendanceResult = await attendanceResponse.json().catch(() => ({}));
      setSessions(attendanceResult.sessions ?? []);
    }
    setLoading(false);
  }, [mode]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (mode !== "forum") return;
    const refresh = () => void load();
    window.addEventListener("kb-forum-refresh", refresh);
    return () => window.removeEventListener("kb-forum-refresh", refresh);
  }, [load, mode]);

  async function ensureSessionsLoaded() {
    if (sessions.length) return;
    const res = await fetch("/api/komunitas-belajar/attendance", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setSessions(data.sessions ?? []);
    }
  }

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setBody("");
    setEventDate(new Date().toISOString().slice(0, 10));
    setMeetingNumber(Math.max(0, ...entries.map((entry) => entry.meeting_number ?? 0)) + 1);
    setSessionId("");
    setSessionSearch("");
    setCategory("");
    setBackground("");
    setAction("");
    setImpact("");
    setConclusion("");
    setExternalUrl("");
    setSelectedFiles([]);
    setOpenAttendance(false);
    setActiveFrom("08:00");
    setActiveUntil("15:00");
  }

  function openCreate() {
    resetForm();
    void ensureSessionsLoaded();
    setModalOpen(true);
  }

  function editEntry(entry: CommunityEntry) {
    void ensureSessionsLoaded();
    setEditingId(entry.id);
    setTitle(entry.title);
    setBody(entry.body);
    setEventDate(entry.event_date ?? "");
    setMeetingNumber(entry.meeting_number ?? 1);
    setSessionId(entry.session_id ?? "");
    setCategory(entry.category ?? "");
    setExternalUrl(entry.external_url ?? "");
    setSelectedFiles([]);
    setModalOpen(true);
  }

  async function uploadAttachments() {
    if (!selectedFiles.length) return [];
    const form = new FormData();
    selectedFiles.forEach((file) => form.append("files", file));
    const response = await fetch("/api/komunitas-belajar/content/attachments", { method: "POST", body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error ?? "Lampiran gagal diunggah.");
    return result.attachments ?? [];
  }

  async function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const attachments = editingId ? [] : await uploadAttachments();
      const contentBody = mode === "praktik_baik" ? ["A. Latar belakang masalah", background, "", "B. Aksi / langkah penyelesaian", action, "", "C. Hasil dan dampak nyata", impact, "", "D. Kesimpulan dan pembelajaran", conclusion].join("\n") : body;
      const payload = { menu_key: mode, title, body: contentBody, event_date: eventDate || null, meeting_number: mode === "materi" ? meetingNumber : null, session_id: sessionId || null, category, external_url: externalUrl, attachments };
      const response = await fetch("/api/komunitas-belajar/content", { method: editingId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Konten gagal disimpan.");
      if (mode === "materi" && openAttendance && !editingId) {
        const start = new Date((eventDate || new Date().toISOString().slice(0, 10)) + "T" + activeFrom).toISOString();
        const end = new Date((eventDate || new Date().toISOString().slice(0, 10)) + "T" + activeUntil).toISOString();
        const attendanceResponse = await fetch("/api/komunitas-belajar/attendance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create_session", material_entry_id: result.entry.id, event_date: eventDate, active_from: start, active_until: end, location: "", notes: "Daftar hadir dibuka dari Materi Kegiatan." }) });
        const attendanceResult = await attendanceResponse.json().catch(() => ({}));
        if (!attendanceResponse.ok) throw new Error("Materi tersimpan, tetapi daftar hadir gagal dibuat: " + (attendanceResult.error ?? "coba lagi dari menu Daftar Hadir."));
      }
      setMessage(editingId ? "Konten berhasil diperbarui." : "Konten berhasil ditambahkan.");
      setModalOpen(false);
      resetForm();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Konten gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(id: string) {
    if (!window.confirm("Hapus konten ini?")) return;
    setBusy(true);
    const response = await fetch("/api/komunitas-belajar/content", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Konten gagal dihapus.");
    else setEntries((current) => current.filter((entry) => entry.id !== id));
    setBusy(false);
  }

  const filteredSessions = sessions.filter((session) => session.title.toLowerCase().includes(sessionSearch.toLowerCase()) || session.material_title.toLowerCase().includes(sessionSearch.toLowerCase()));
  const titleMap: Record<ContentMode, string> = { materi: "Materi kegiatan", dokumentasi: "Dokumentasi", praktik_baik: "Praktik baik", forum: "Forum diskusi" };
  const descriptionMap: Record<ContentMode, string> = { materi: "Buat pertemuan dengan tanggal, isi materi, dan pilihan membuka daftar hadir otomatis.", dokumentasi: "Simpan dokumentasi yang terhubung dengan kegiatan dan maksimal lima foto.", praktik_baik: "Bagikan pengalaman pembelajaran yang dapat dibaca dan dikomentari anggota.", forum: "Buat topik dan saling memberi balasan, masukan, serta solusi." };
  return <section className="rounded-2xl border border-[#dbe6f5] bg-white p-6 shadow-[0_8px_22px_rgba(23,83,158,.05)] sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e8f1ff] text-[#1264c5]"><Icon size={23} aria-hidden="true" /></span><div><h3 className="text-xl font-extrabold text-[#102d62]">Ruang {titleMap[mode].toLowerCase()}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[#6683a6]">{descriptionMap[mode]}</p></div></div>{canCreate && <button type="button" onClick={openCreate} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#1264c5] px-4 text-sm font-bold text-white hover:bg-[#0d4e9b]"><Plus size={17} aria-hidden="true" />Tambah {titleMap[mode]}</button>}</div>{error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p>}{message && <p role="status" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{message}</p>}{loading ? <div className="mt-6"><StatePanel title="Memuat konten" description="Data sedang dimuat dari server." /></div> : entries.length ? <div className="mt-6 grid gap-4">{entries.map((entry) => <article key={entry.id} className="rounded-xl border border-[#e1eaf4] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-lg font-extrabold text-[#173f70]">{entry.title}</h4>{entry.meeting_number && <span className="rounded-md bg-[#edf4ff] px-2 py-1 text-[11px] font-bold text-[#1264c5]">Pertemuan {entry.meeting_number}</span>}{entry.category && <span className="rounded-md bg-[#f4f8ff] px-2 py-1 text-[11px] font-bold text-[#536f92]">{entry.category}</span>}</div><p className="mt-1 text-xs text-[#6683a6]">{entry.event_date ? new Date(entry.event_date + "T00:00:00").toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Dipublikasikan " + new Date(entry.created_at).toLocaleDateString("id-ID")}</p>{entry.session_id && <p className="mt-1 text-xs font-semibold text-[#536f92]">Pertemuan terkait: {sessions.find((session) => session.id === entry.session_id)?.title ?? "Pertemuan terkait"}</p>}</div>{(canManage || (mode === "forum" && entry.created_by === profile.id)) && <div className="flex gap-2"><button type="button" onClick={() => editEntry(entry)} className="min-h-10 rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5] hover:bg-[#edf4ff]">Edit</button><button type="button" disabled={busy} onClick={() => void removeEntry(entry.id)} className="min-h-10 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 hover:bg-red-50">Hapus</button></div>}</div>{entry.body && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#536f92]">{entry.body}</p>}{entry.attachments?.length > 0 && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{entry.attachments.map((attachment) => attachment.url ? <a key={attachment.path} href={attachment.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-lg border border-[#e1eaf4]"><img src={attachment.url} alt={attachment.name} className="aspect-square w-full object-cover transition group-hover:scale-105" /></a> : null)}</div>}{mode === "forum" || mode === "praktik_baik" ? <ForumReplies entryId={entry.id} /> : null}</article>)}</div> : <EmptyState title={"Belum ada " + titleMap[mode].toLowerCase()} description={canCreate ? "Klik tombol tambah untuk membuat data pertama." : "Konten akan muncul setelah Ketua Kombel menerbitkannya."} />}{modalOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#071d45]/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="content-modal-title"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">{editingId ? "Edit" : "Tambah"} {titleMap[mode]}</p><h4 id="content-modal-title" className="mt-1 text-2xl font-extrabold text-[#102d62]">{titleMap[mode]}</h4></div><button type="button" onClick={() => setModalOpen(false)} className="min-h-10 rounded-lg border border-[#bfd2e8] px-3 text-sm font-bold text-[#536f92]">Tutup</button></div><form onSubmit={saveEntry} className="mt-6 grid gap-4 sm:grid-cols-2">{mode === "materi" && <><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Pertemuan</span><input value={"Pertemuan " + meetingNumber} readOnly className="h-11 w-full rounded-lg border border-[#bfd2e8] bg-[#f8fbff] px-3 text-sm" /></label><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Tanggal pelaksanaan</span><input required type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="h-11 w-full rounded-lg border border-[#bfd2e8] px-3 text-sm" /></label></>}{mode !== "materi" && <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold text-[#34577f]">Kegiatan / pertemuan terkait</span><input value={sessionSearch} onChange={(event) => setSessionSearch(event.target.value)} className="mb-2 h-10 w-full rounded-lg border border-[#bfd2e8] px-3 text-sm" placeholder="Cari kegiatan..." /><select value={sessionId} onChange={(event) => setSessionId(event.target.value)} className="h-11 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm"><option value="">Tidak ditautkan</option>{filteredSessions.map((session) => <option key={session.id} value={session.id}>{session.material_title} · {new Date(session.event_date + "T00:00:00").toLocaleDateString("id-ID")}</option>)}</select></label>}<label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold text-[#34577f]">{mode === "dokumentasi" ? "Judul kegiatan" : mode === "forum" ? "Judul diskusi" : mode === "praktik_baik" ? "Judul praktik baik" : "Judul materi"}</span><input required value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} className="h-11 w-full rounded-lg border border-[#bfd2e8] px-3 text-sm" placeholder="Tulis judul yang jelas" /></label>{(mode === "praktik_baik" || mode === "forum") && <label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Kategori topik</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm"><option value="">Pilih kategori</option><option>Literasi</option><option>Numerasi</option><option>Pembelajaran Berdiferensiasi</option><option>Profil Pelajar Pancasila</option><option>Manajemen Kelas</option><option>Kendala Pembelajaran di Kelas</option><option>Berbagi Inspirasi dan Tips</option><option>Pengumuman dan Informasi Umum</option></select></label>}{mode === "praktik_baik" ? <><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold text-[#34577f]">A. Latar belakang masalah</span><textarea required value={background} onChange={(event) => setBackground(event.target.value)} rows={3} className="w-full rounded-lg border border-[#bfd2e8] px-3 py-3 text-sm" /></label><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold text-[#34577f]">B. Aksi / langkah penyelesaian</span><textarea required value={action} onChange={(event) => setAction(event.target.value)} rows={3} className="w-full rounded-lg border border-[#bfd2e8] px-3 py-3 text-sm" /></label><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold text-[#34577f]">C. Hasil dan dampak nyata</span><textarea required value={impact} onChange={(event) => setImpact(event.target.value)} rows={3} className="w-full rounded-lg border border-[#bfd2e8] px-3 py-3 text-sm" /></label><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold text-[#34577f]">D. Kesimpulan dan pembelajaran</span><textarea required value={conclusion} onChange={(event) => setConclusion(event.target.value)} rows={3} className="w-full rounded-lg border border-[#bfd2e8] px-3 py-3 text-sm" /></label></> : <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold text-[#34577f]">{mode === "dokumentasi" ? "Deskripsi dokumentasi" : mode === "forum" ? "Isi pesan / pertanyaan" : "Isi materi"}</span><textarea required value={body} onChange={(event) => setBody(event.target.value)} rows={5} className="w-full rounded-lg border border-[#bfd2e8] px-3 py-3 text-sm" /></label>}{(mode === "dokumentasi" || mode === "praktik_baik") && <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold text-[#34577f]">Foto lampiran (maksimal 5 file, masing-masing 1 MB)</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []).slice(0, 5))} className="block w-full rounded-lg border border-dashed border-[#bfd2e8] p-3 text-sm" /><span className="mt-1 block text-xs text-[#6683a6]">{selectedFiles.length} foto dipilih. Foto baru menggantikan lampiran saat membuat data baru.</span></label>}{(mode === "materi" || mode === "dokumentasi" || mode === "praktik_baik" || mode === "forum") && <label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Tautan HTTPS, opsional</span><input type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} className="h-11 w-full rounded-lg border border-[#bfd2e8] px-3 text-sm" placeholder="https://..." /></label>}{mode === "materi" && !editingId && <div className="rounded-lg border border-[#bfd2e8] bg-[#f8fbff] p-3 sm:col-span-2"><label className="flex items-start gap-3 text-sm font-bold text-[#34577f]"><input type="checkbox" checked={openAttendance} onChange={(event) => setOpenAttendance(event.target.checked)} className="mt-1 h-4 w-4 accent-[#1264c5]" /> <span>Buka Daftar Hadir setelah materi disimpan</span></label>{openAttendance && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-bold text-[#536f92]">Mulai aktif</span><input type="time" value={activeFrom} onChange={(event) => setActiveFrom(event.target.value)} className="h-10 w-full rounded-lg border border-[#bfd2e8] px-3 text-sm" /></label><label className="block"><span className="mb-1 block text-xs font-bold text-[#536f92]">Batas pengisian</span><input type="time" value={activeUntil} onChange={(event) => setActiveUntil(event.target.value)} className="h-10 w-full rounded-lg border border-[#bfd2e8] px-3 text-sm" /></label></div>}</div>}<div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setModalOpen(false)} className="min-h-11 rounded-lg border border-[#bfd2e8] px-4 text-sm font-bold text-[#536f92]">Batal</button><button type="submit" disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1264c5] px-5 text-sm font-bold text-white hover:bg-[#0d4e9b] disabled:opacity-60"><Plus size={17} aria-hidden="true" />{busy ? "Menyimpan..." : editingId ? "Simpan perubahan" : "Simpan " + titleMap[mode]}</button></div></form></div></div>}</section>;
}

function TaskManager({ initialRequirements }: { initialRequirements: DashboardRequirement[] }) {
  const [requirements, setRequirements] = useState(initialRequirements);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState<"file" | "link" | "both">("file");
  const [dueAt, setDueAt] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState<TaskSession[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadTasks() {
    const taskResponse = await fetch("/api/komunitas-belajar/tasks", { cache: "no-store" });
    const body = await taskResponse.json().catch(() => ({}));
    if (taskResponse.ok) setRequirements(body.requirements ?? []);
  }

  async function ensureSessionsLoaded() {
    if (sessions.length) return;
    const res = await fetch("/api/komunitas-belajar/attendance", { cache: "no-store" });
    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      setSessions(body.sessions ?? []);
    }
  }

  useEffect(() => { void loadTasks(); }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch("/api/komunitas-belajar/tasks", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(editingId ? { id: editingId } : {}), name, description, collection_method: method, due_at: dueAt, attendance_session_id: sessionId || null }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body.error ?? "Tugas gagal disimpan.");
    else { setName(""); setDescription(""); setMethod("file"); setDueAt(""); setSessionId(""); setEditingId(null); setOpen(false); await loadTasks(); }
    setBusy(false);
  }

  function edit(requirement: DashboardRequirement) {
    void ensureSessionsLoaded();
    setEditingId(requirement.id);
    setName(requirement.name);
    setDescription(requirement.description);
    setMethod(requirement.collection_method);
    setDueAt(requirement.due_at ? new Date(requirement.due_at).toISOString().slice(0, 16) : "");
    setSessionId(requirement.attendance_session_id ?? "");
    setOpen(true);
  }

  async function toggle(requirement: DashboardRequirement) {
    const response = await fetch("/api/komunitas-belajar/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: requirement.id, is_active: !requirement.is_active }) });
    if (response.ok) await loadTasks();
  }

  async function remove(requirement: DashboardRequirement) {
    if (!window.confirm(`Hapus tugas ${requirement.name}?`)) return;
    const response = await fetch("/api/komunitas-belajar/tasks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: requirement.id }) });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (response.ok) setRequirements((current) => current.filter((item) => item.id !== requirement.id));
    else setError(body.error ?? "Tugas gagal dihapus.");
  }

  return <section className="rounded-2xl border border-[#dbe6f5] bg-white p-6 shadow-[0_8px_22px_rgba(23,83,158,.05)] sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Manajemen tugas</p><h3 className="mt-2 text-2xl font-extrabold text-[#102d62]">Daftar tugas Kombel</h3><p className="mt-2 text-sm text-[#6683a6]">Atur tugas, metode pengumpulan, dan batas waktunya.</p></div><button type="button" onClick={() => { void ensureSessionsLoaded(); setOpen(true); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1264c5] px-4 text-xs font-bold text-white hover:bg-[#0d4e9b]"><Plus size={16} aria-hidden="true" />Tambah tugas</button></div>
    {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p>}
    <TaskTable requirements={requirements} onEdit={edit} onToggle={toggle} onRemove={remove} />
    <div className="mt-6 grid gap-3">{requirements.length ? requirements.map((requirement) => <article key={requirement.id} className="rounded-xl border border-[#e1eaf4] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-bold text-[#173f70]">{requirement.name}</h4><p className="mt-1 text-sm text-[#6683a6]">{requirement.description || "Tidak ada keterangan tambahan."}</p><p className="mt-2 text-xs font-semibold text-[#536f92]">Metode: {requirement.collection_method === "both" ? "File atau link" : requirement.collection_method === "file" ? "File" : "Link"} · Batas: {requirement.due_at ? new Date(requirement.due_at).toLocaleString("id-ID") : "Tidak dibatasi"}</p></div><button type="button" onClick={() => void toggle(requirement)} className={`rounded-lg px-3 py-2 text-xs font-bold ${requirement.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{requirement.is_active ? "Aktif" : "Nonaktif"}</button></div></article>) : <EmptyState title="Belum ada tugas" description="Tambahkan tugas pertama untuk anggota Kombel." />}</div>
    {open && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#071d45]/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="task-modal-title"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Manajemen tugas</p><h4 id="task-modal-title" className="mt-1 text-2xl font-extrabold text-[#102d62]">Tambah tugas</h4></div><button type="button" onClick={() => setOpen(false)} className="min-h-10 rounded-lg border border-[#bfd2e8] px-3 text-sm font-bold text-[#536f92]">Tutup</button></div><form onSubmit={save} className="mt-6 grid gap-4"><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Nama tugas</span><input required value={name} onChange={(event) => setName(event.target.value)} maxLength={160} className="h-11 w-full rounded-lg border border-[#bfd2e8] px-3 text-sm" placeholder="Contoh: Rencana kegiatan komunitas" /></label><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Keterangan</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={4} className="w-full rounded-lg border border-[#bfd2e8] px-3 py-3 text-sm" placeholder="Jelaskan dokumen yang perlu dikirim." /></label><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Pertemuan terkait</span><select value={sessionId} onChange={(event) => setSessionId(event.target.value)} className="h-11 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm"><option value="">Tidak ditautkan</option>{sessions.map((session) => <option key={session.id} value={session.id}>Pertemuan ke-{session.meeting_number} - {session.material_title}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Metode pengumpulan</span><select value={method} onChange={(event) => setMethod(event.target.value as "file" | "link" | "both")} className="h-11 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm"><option value="file">File</option><option value="link">Link</option><option value="both">File atau link</option></select></label><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Batas waktu</span><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="h-11 w-full rounded-lg border border-[#bfd2e8] px-3 text-sm" /></label></div><button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-[#1264c5] px-4 text-sm font-bold text-white disabled:opacity-60">{busy ? "Menyimpan..." : "Simpan tugas"}</button></form></div></div>}
  </section>;
}

function TaskTable({
  requirements,
  onEdit,
  onToggle,
  onRemove,
}: {
  requirements: DashboardRequirement[];
  onEdit: (requirement: DashboardRequirement) => void;
  onToggle: (requirement: DashboardRequirement) => Promise<void>;
  onRemove: (requirement: DashboardRequirement) => Promise<void>;
}) {
  return requirements.length ? (
    <div className="mt-6 overflow-x-auto rounded-xl border border-[#e1eaf4]">
      <table className="w-full min-w-[840px] text-left text-sm border-collapse">
        <caption className="sr-only">Daftar tugas Kombel</caption>
        <thead className="bg-[#f8fbff] text-xs font-bold uppercase tracking-[.08em] text-[#536f92] border-b border-[#e1eaf4]">
          <tr>
            <th scope="col" className="px-4 py-3">Nama Tugas</th>
            <th scope="col" className="px-4 py-3">Pertemuan & Materi</th>
            <th scope="col" className="px-4 py-3">Metode</th>
            <th scope="col" className="px-4 py-3">Batas Waktu</th>
            <th scope="col" className="px-4 py-3 text-center">Status</th>
            <th scope="col" className="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#edf2f8]">
          {requirements.map((requirement) => (
            <tr key={requirement.id} className="align-top hover:bg-[#fbfdff] transition-colors">
              <td className="px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-[#173f70]">{requirement.name}</p>
                  {requirement.is_locked && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                      <Lock size={10} /> Terkunci (Diverifikasi KS)
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-5 text-[#6683a6]">
                  {requirement.description || "Tidak ada keterangan tambahan."}
                </p>
              </td>
              <td className="px-4 py-4 text-xs">
                {requirement.meeting_number ? (
                  <div>
                    <span className="font-bold text-[#102d62]">Pertemuan ke-{requirement.meeting_number}</span>
                    <p className="mt-0.5 text-[#536f92] max-w-xs truncate">{requirement.material_title ?? "-"}</p>
                  </div>
                ) : (
                  <span className="text-[#8ba2bd] italic">Tidak ditautkan</span>
                )}
              </td>
              <td className="px-4 py-4 text-xs font-medium text-[#536f92]">
                {requirement.collection_method === "both"
                  ? "File atau link"
                  : requirement.collection_method === "file"
                  ? "File"
                  : "Link"}
              </td>
              <td className="px-4 py-4 text-xs text-[#536f92] whitespace-nowrap">
                {requirement.due_at ? new Date(requirement.due_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "Tidak dibatasi"}
              </td>
              <td className="px-4 py-4 text-center">
                <button
                  type="button"
                  disabled={requirement.is_locked}
                  onClick={() => void onToggle(requirement)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    requirement.is_active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                  title={requirement.is_locked ? "Tugas terkunci karena telah diverifikasi Kepala Sekolah." : undefined}
                >
                  {requirement.is_active ? "Aktif" : "Nonaktif"}
                </button>
              </td>
              <td className="px-4 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={requirement.is_locked}
                    onClick={() => onEdit(requirement)}
                    className="min-h-9 rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5] hover:bg-[#edf4ff] transition disabled:opacity-40 disabled:cursor-not-allowed"
                    title={requirement.is_locked ? "Tugas telah diverifikasi Kepala Sekolah sehingga tidak dapat diubah." : "Ubah data tugas"}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={requirement.is_locked}
                    onClick={() => void onRemove(requirement)}
                    className="min-h-9 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    title={requirement.is_locked ? "Tugas telah diverifikasi Kepala Sekolah sehingga tidak dapat dihapus." : "Hapus tugas"}
                  >
                    Hapus
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <EmptyState title="Belum ada tugas" description="Tambahkan tugas pertama untuk anggota Kombel." />
  );
}

function TaskList({ requirements }: { requirements: DashboardRequirement[] }) {
  const active = requirements.filter((requirement) => requirement.is_active);
  return (
    <section className="rounded-2xl border border-[#dbe6f5] bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Manajemen tugas</p>
      <h3 className="mt-2 text-2xl font-extrabold text-[#102d62]">Tugas Kombel</h3>
      <p className="mt-2 text-sm text-[#6683a6]">Pilih tugas untuk membuka ruang pengumpulan.</p>
      <div className="mt-6 grid gap-3">
        {active.length ? (
          active.map((requirement) => {
            const locked = requirement.submission_status === "lengkap";
            const content = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-[#1970d2]">
                      {requirement.meeting_number ? `Pertemuan ke-${requirement.meeting_number}` : "Tugas Kombel"}
                      {requirement.material_title ? ` · ${requirement.material_title}` : ""}
                    </span>
                    <h4 className="mt-0.5 font-bold text-[#173f70]">{requirement.name}</h4>
                    <p className="mt-2 text-sm leading-6 text-[#6683a6]">
                      {requirement.description || "Tidak ada keterangan tambahan."}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-[#536f92]">
                      Batas waktu:{" "}
                      {requirement.due_at
                        ? new Date(requirement.due_at).toLocaleString("id-ID")
                        : "Tidak dibatasi"}
                    </p>
                  </div>
                  <ArrowUpRight
                    size={17}
                    className={locked ? "shrink-0 text-[#94a3b8]" : "shrink-0 text-[#1264c5]"}
                    aria-hidden="true"
                  />
                </div>
                <span className={`mt-4 inline-flex text-xs font-bold ${locked ? "text-[#64748b]" : "text-[#1264c5]"}`}>
                  {locked ? "Lihat tugas dan status" : "Buka pengumpulan"}
                </span>
              </>
            );
            return <Link
              key={requirement.id}
              href={`/komunitas-belajar/ruang/upload_tugas?requirement_id=${requirement.id}`}
              className={`block rounded-xl border border-[#e1eaf4] p-4 transition hover:border-[#1264c5] hover:bg-[#f8fbff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1264c5] ${locked ? "bg-[#f8fafc]" : ""}`}
            >
              {content}
            </Link>;
          })
        ) : (
          <EmptyState title="Belum ada tugas aktif" description="Ketua Kombel belum menambahkan tugas untuk Anda." />
        )}
      </div>
    </section>
  );
}



function SubmissionOverview() {
  const [rows, setRows] = useState<Array<{ id: string; requirement_id: string; status: string; submitted_at: string | null; teacher?: { full_name?: string; role?: string } | null }>>([]);
  const [requirements, setRequirements] = useState<DashboardRequirement[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => { const response = await fetch("/api/komunitas-belajar/submissions", { cache: "no-store" }); const body = await response.json().catch(() => ({})); if (!response.ok) setError(body.error ?? "Data pengumpulan gagal dimuat."); else { setRows(body.submissions ?? []); setRequirements(body.requirements ?? []); } }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!supabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase.channel("kb-submission-overview-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_submissions" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_reviews" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);
  return <section className="rounded-2xl border border-[#dbe6f5] bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Pengumpulan tugas</p><h3 className="mt-2 text-2xl font-extrabold text-[#102d62]">Tugas masuk</h3><p className="mt-2 text-sm text-[#6683a6]">Nama guru, peran, jenis tugas, dan tanggal pengumpulan.</p>{error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p>}{rows.length ? <div className="mt-6 overflow-x-auto rounded-xl border border-[#e1eaf4]"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[#f8fbff] text-xs uppercase tracking-[.08em] text-[#536f92]"><tr><th className="px-4 py-3">Nama guru</th><th className="px-4 py-3">Peran</th><th className="px-4 py-3">Jenis tugas</th><th className="px-4 py-3">Pertemuan</th><th className="px-4 py-3">Materi kegiatan</th><th className="px-4 py-3">Tanggal pengumpulan</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-[#edf2f8]"><td className="px-4 py-3 font-bold text-[#173f70]">{row.teacher?.full_name ?? "Guru"}</td><td className="px-4 py-3 text-[#536f92]">{roleLabelFromProfile(row.teacher?.role)}</td><td className="px-4 py-3 text-[#536f92]">{requirements.find((requirement) => requirement.id === row.requirement_id)?.name ?? "Tugas komunitas"}</td><td className="px-4 py-3 text-[#536f92]">{row.submitted_at ? new Date(row.submitted_at).toLocaleString("id-ID") : "Belum dikumpulkan"}</td><td className="px-4 py-3 font-bold text-[#1264c5]">{statusText(row.status)}</td></tr>)}</tbody></table></div> : <EmptyState title="Belum ada tugas masuk" description="Pengumpulan anggota akan tampil di sini." />}</section>;
}

function ResourceWorkspace({ resource, menu, canManage }: { resource: (typeof resourceMap)[string]; menu: string; canManage: boolean }) {
  const Icon = resource.icon;
  const [entries, setEntries] = useState<CommunityEntry[]>([]);
  const [sessions, setSessions] = useState<CommunitySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    const requestedSessionId = new URLSearchParams(window.location.search).get("session_id") ?? "";
    setSessionId(requestedSessionId);
    fetch(`/api/komunitas-belajar/content?menu=${menu}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error);
        setEntries(result.entries ?? []);
      })
      .catch((reason: Error) => setError(reason.message || "Konten gagal dimuat."))
      .finally(() => setLoading(false));
  }, [menu]);

  async function ensureSessionsLoaded() {
    if (sessions.length) return;
    const res = await fetch("/api/komunitas-belajar/attendance", { cache: "no-store" });
    if (res.ok) {
      const result = await res.json().catch(() => ({}));
      setSessions(result.sessions ?? []);
    }
  }

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setBody("");
    setExternalUrl("");
    setSessionId(new URLSearchParams(window.location.search).get("session_id") ?? "");
  }

  async function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const payload = { menu_key: menu, title, body, external_url: externalUrl, session_id: sessionId || null };
    const response = await fetch("/api/komunitas-belajar/content", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Konten gagal disimpan.");
    else {
      setEntries((current) => editingId ? current.map((entry) => entry.id === editingId ? result.entry : entry) : [result.entry, ...current]);
      setMessage(editingId ? "Konten diperbarui." : "Konten ditambahkan.");
      resetForm();
    }
    setBusy(false);
  }

  async function removeEntry(id: string) {
    if (!window.confirm("Hapus konten ini?")) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/komunitas-belajar/content", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Konten gagal dihapus.");
    else setEntries((current) => current.filter((entry) => entry.id !== id));
    setBusy(false);
  }

  return <section className="rounded-2xl border border-[#dbe6f5] bg-white p-6 shadow-[0_8px_22px_rgba(23,83,158,.05)] sm:p-8"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e8f1ff] text-[#1264c5]"><Icon size={23} aria-hidden="true" /></span><div><h3 className="text-xl font-extrabold text-[#102d62]">Ruang {resource.title.toLowerCase()}</h3><p className="mt-2 text-sm leading-6 text-[#6683a6]">{canManage ? "Tambahkan materi, dokumentasi, praktik baik, atau topik forum untuk anggota." : "Baca konten yang sudah dipublikasikan untuk komunitas."}</p></div></div>{canManage && <form onSubmit={saveEntry} className="mt-6 grid gap-4 rounded-xl bg-[#f8fbff] p-5 sm:grid-cols-2"><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold text-[#34577f]">Pertemuan terkait</span><select value={sessionId} onChange={(event) => setSessionId(event.target.value)} className="h-11 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm"><option value="">Tidak ditautkan ke pertemuan</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.title} · {new Date(`${session.event_date}T00:00:00`).toLocaleDateString("id-ID")}</option>)}</select></label><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold text-[#34577f]">Judul</span><input required value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} className="h-11 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm focus:border-[#1264c5] focus:outline-none" placeholder="Judul konten" /></label><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold text-[#34577f]">Isi konten</span><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} rows={4} className="w-full rounded-lg border border-[#bfd2e8] bg-white px-3 py-3 text-sm focus:border-[#1264c5] focus:outline-none" placeholder="Tulis informasi yang perlu dibaca anggota." /></label><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Link HTTPS, opsional</span><input type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} className="h-11 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm focus:border-[#1264c5] focus:outline-none" placeholder="https://..." /></label><div className="flex items-end gap-2"><button type="submit" disabled={busy} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#1264c5] px-4 text-sm font-bold text-white hover:bg-[#0d4e9b] disabled:cursor-not-allowed disabled:opacity-60"><Plus size={17} aria-hidden="true" />{busy ? "Menyimpan..." : editingId ? "Simpan perubahan" : "Tambah konten"}</button>{editingId && <button type="button" onClick={resetForm} className="min-h-11 rounded-lg border border-[#bfd2e8] px-3 text-sm font-bold text-[#34577f] hover:bg-white">Batal</button>}</div>{error && <p role="alert" className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p>}{message && <p role="status" className="sm:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{message}</p>}</form>}{!canManage && error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p>}{loading ? <StatePanel title="Memuat konten" description="Konten sedang dimuat dari server." /> : entries.length ? <div className="mt-6 grid gap-4">{entries.map((entry) => <article key={entry.id} className="rounded-xl border border-[#e1eaf4] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h4 className="text-lg font-extrabold text-[#173f70]">{entry.title}</h4><p className="mt-1 text-xs text-[#6683a6]">Diterbitkan {new Date(entry.created_at).toLocaleDateString("id-ID")}</p>{entry.session_id && <p className="mt-1 text-xs font-semibold text-[#536f92]">Pertemuan: {sessions.find((session) => session.id === entry.session_id)?.title ?? "Pertemuan terkait"}</p>}</div>{canManage && <div className="flex gap-2"><button type="button" onClick={() => { setEditingId(entry.id); setTitle(entry.title); setBody(entry.body); setExternalUrl(entry.external_url ?? ""); setSessionId(entry.session_id ?? ""); }} className="min-h-10 rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5] hover:bg-[#edf4ff]">Edit</button><button type="button" disabled={busy} onClick={() => void removeEntry(entry.id)} className="min-h-10 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed">Hapus</button></div>}</div>{entry.body && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#536f92]">{entry.body}</p>}{menu === "materi" && sessions.some((session) => session.material_entry_id === entry.id) && <Link href={"/komunitas-belajar/ruang/daftar_hadir?session_id=" + (sessions.find((session) => session.material_entry_id === entry.id)?.id ?? "")} className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5] hover:bg-[#edf4ff]">Buka daftar hadir terkait</Link>}{menu === "forum" && <ForumReplies entryId={entry.id} />}{entry.external_url && <a href={entry.external_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#1264c5] hover:underline">Buka tautan <ArrowUpRight size={15} aria-hidden="true" /></a>}</article>)}</div> : <div className="mt-6 rounded-xl border border-dashed border-[#bfd2e8] bg-[#f8fbff] px-5 py-8 text-center"><p className="text-sm font-bold text-[#34577f]">Konten belum tersedia</p><p className="mt-2 text-xs leading-5 text-[#6683a6]">{canManage ? "Gunakan formulir untuk menambahkan konten pertama." : "Konten akan muncul setelah Ketua Kombel menerbitkannya."}</p><Link href={resource.publicHref} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#1264c5] px-4 text-sm font-bold text-[#1264c5] hover:bg-[#edf4ff]">Buka halaman publik <ArrowUpRight size={16} aria-hidden="true" /></Link></div>}</section>;
}
function ForumReplies({ entryId }: { entryId: string }) {
  type Reply = { id: string; body: string; created_at: string; author?: { full_name: string; role: string; teacher_type: string | null } | null };
  const [replies, setReplies] = useState<Reply[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch(`/api/komunitas-belajar/forum-replies?entry_id=${entryId}`, { cache: "no-store" }).then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error);
      setReplies(result.replies ?? []);
    }).catch((reason: Error) => setError(reason.message || "Balasan gagal dimuat."));
  }, [entryId]);

  async function submitReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/komunitas-belajar/forum-replies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entry_id: entryId, body }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Balasan gagal disimpan.");
    else {
      setReplies((current) => [...current, result.reply]);
      setBody("");
    }
    setBusy(false);
  }

  return <div className="mt-5 rounded-xl bg-[#f8fbff] p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#1970d2]">Balasan diskusi</p>{replies.length ? <div className="mt-3 space-y-3">{replies.map((reply) => <div key={reply.id} className="rounded-lg border border-[#e1eaf4] bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-[#173f70]">{reply.author?.full_name ?? "Anggota komunitas"}</p><time className="text-[11px] text-[#6683a6]">{new Date(reply.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-[#536f92]">{reply.body}</p></div>)}</div> : <p className="mt-3 text-xs text-[#6683a6]">Belum ada balasan. Mulai diskusi dari topik ini.</p>}<form onSubmit={submitReply} className="mt-4 flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor={`reply-${entryId}`}>Tulis balasan</label><input id={`reply-${entryId}`} value={body} onChange={(event) => setBody(event.target.value)} maxLength={3000} className="h-10 min-w-0 flex-1 rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm focus:border-[#1264c5] focus:outline-none" placeholder="Tulis balasan atau pengalaman Anda" /><button type="submit" disabled={busy || !body.trim()} className="min-h-10 rounded-lg bg-[#1264c5] px-4 text-xs font-bold text-white hover:bg-[#0d4e9b] disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Mengirim..." : "Kirim balasan"}</button></form>{error && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{error}</p>}</div>;
}

function DocumentArchive({ documents }: { documents: PublicDocument[] }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <FileText size={22} className="text-[#1264c5]" aria-hidden="true" />
        <div>
          <h3 className="text-xl font-extrabold text-[#102d62]">Arsip SK publik</h3>
          <p className="mt-1 text-sm text-[#6683a6]">Dokumen yang dapat dibaca oleh warga komunitas.</p>
        </div>
      </div>
      {documents.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {documents.map((document) => (
            <a key={document.id} href={document.public_url} target="_blank" rel="noreferrer" className="flex min-h-24 items-center gap-3 rounded-xl border border-[#dbe6f5] p-4 hover:border-[#1264c5] hover:bg-[#f8fbff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1264c5]">
              <FileText size={19} className="shrink-0 text-[#1264c5]" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate font-bold text-[#173f70]">{document.original_name}</span>
                <span className="mt-1 block text-xs text-[#6683a6]">Diterbitkan {new Date(document.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}</span>
              </span>
            </a>
          ))}
        </div>
      ) : (
        <EmptyState title="Belum ada dokumen" description="Arsip SK akan tampil setelah Ketua mengunggah dokumen." />
      )}
    </div>
  );
}
function ChartWorkspace({ data }: { data: RoleDashboardData }) {
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,.8fr)]"><section className="rounded-2xl border border-[#dbe6f5] bg-white p-6 shadow-[0_8px_22px_rgba(23,83,158,.05)] sm:p-8"><div className="flex items-center gap-3"><BarChart3 size={22} className="text-[#1264c5]" aria-hidden="true" /><div><h3 className="text-xl font-extrabold text-[#102d62]">Status pengumpulan</h3><p className="mt-1 text-sm text-[#6683a6]">Ringkasan status sesuai cakupan akses Anda.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{data.status.map((item) => <div key={item.name} className="rounded-xl border border-[#e1eaf4] p-4"><p className="text-xs font-semibold text-[#6683a6]">{item.name}</p><p className="mt-2 text-2xl font-extrabold text-[#102d62]">{item.value}</p></div>)}</div></section><section className="rounded-2xl border border-[#dbe6f5] bg-white p-6 shadow-[0_8px_22px_rgba(23,83,158,.05)] sm:p-8"><h3 className="text-xl font-extrabold text-[#102d62]">Proporsi data</h3><div className="mt-4 h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.status} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={3}>{data.status.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><p className="text-center text-xs text-[#6683a6]">Grafik mengikuti data aktual yang tersedia.</p></section></div>;
}

function ReportWorkspace({ data }: { data: RoleDashboardData }) {
  function downloadReport() { const rows = [["Status", "Jumlah"], ...data.status.map((item) => [item.name, String(item.value)])]; const blob = new Blob([rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "laporan-kegiatan-kombel.csv"; anchor.click(); URL.revokeObjectURL(url); }
  return <section className="rounded-2xl border border-[#dbe6f5] bg-white p-6 shadow-[0_8px_22px_rgba(23,83,158,.05)] sm:p-8"><div className="flex items-start gap-4"><FileText size={22} className="mt-1 text-[#1264c5]" aria-hidden="true" /><div><h3 className="text-xl font-extrabold text-[#102d62]">Ringkasan laporan</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[#6683a6]">Laporan berisi status pengumpulan yang dihitung dari data komunitas saat ini.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{data.status.map((item) => <div key={item.name} className="rounded-xl bg-[#f8fbff] p-4"><p className="text-xs text-[#6683a6]">{item.name}</p><p className="mt-2 text-2xl font-extrabold text-[#102d62]">{item.value}</p></div>)}</div><button type="button" onClick={downloadReport} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1264c5] px-4 text-sm font-bold text-white hover:bg-[#0d4e9b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1264c5]">Unduh CSV laporan <ArrowUpRight size={16} aria-hidden="true" /></button></section>;
}

function AttendanceWorkspace({ canCreate, canMark, canExport, canSeeDetails, canManage }: { canCreate: boolean; canMark: boolean; canExport: boolean; canSeeDetails: boolean; canManage: boolean }) {
  type AttendanceProfile = { id: string; full_name: string; login_identifier: string | null; teacher_type: string | null; teaching_grade: number | null; role: string; community_position: string | null };
  type AttendanceRecord = { id: string; profile_id: string; profile_name: string; status: string; note: string; marked_at: string; profile: AttendanceProfile | null };
  type Session = { id: string; title: string; event_date: string; location: string; notes: string; material_entry_id: string | null; material_title: string; active_from: string | null; active_until: string | null; records: AttendanceRecord[] };
  type Material = { id: string; title: string; body: string; created_at: string };
  type Participant = AttendanceProfile;
  type Draft = { status: string; note: string };

  const [sessions, setSessions] = useState<Session[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [activeFrom, setActiveFrom] = useState("");
  const [activeUntil, setActiveUntil] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [managerDrafts, setManagerDrafts] = useState<Record<string, Draft>>({});

  async function load() {
    setLoading(true);
    const response = await fetch("/api/komunitas-belajar/attendance", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Data kehadiran gagal dimuat.");
    else {
      setSessions(result.sessions ?? []);
      setMaterials(result.materials ?? []);
      setParticipants(result.participants ?? []);
      setCurrentProfileId(result.current_profile_id ?? "");
    }
    setLoading(false);
  }

  useEffect(() => { void load(); const requestedSession = new URLSearchParams(window.location.search).get("session_id"); if (requestedSession) setExpandedId(requestedSession); }, []);
  useEffect(() => {
    if (!supabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase.channel("kb-attendance-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_attendance_sessions" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_attendance_records" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  function toIso(value: string) {
    return value ? new Date(value).toISOString() : "";
  }

  function draftFor(session: Session): Draft {
    const ownRecord = session.records.find((record) => record.profile_id === currentProfileId);
    return drafts[session.id] ?? { status: ownRecord?.status ?? "hadir", note: ownRecord?.note ?? "" };
  }

  async function createSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/komunitas-belajar/attendance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create_session", material_entry_id: materialId, event_date: eventDate, active_from: toIso(activeFrom), active_until: toIso(activeUntil), location, notes }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Sesi gagal dibuat.");
    else {
      setMessage("Daftar hadir berhasil dibuat dan terhubung dengan materi.");
      setMaterialId("");
      setEventDate("");
      setActiveFrom("");
      setActiveUntil("");
      setLocation("");
      setNotes("");
      setCreateModalOpen(false);
      await load();
    }
    setBusy(false);
  }

  async function markAttendance(sessionId: string) {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return;
    const draft = draftFor(session);
    setBusy(true);
    setError("");
    const response = await fetch("/api/komunitas-belajar/attendance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "mark_self", session_id: sessionId, status: draft.status, note: draft.note }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Kehadiran gagal disimpan.");
    else {
      setMessage("Kehadiran berhasil disimpan.");
      await load();
    }
    setBusy(false);
  }

  function updateDraft(sessionId: string, field: keyof Draft, value: string) {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return;
    setDrafts((current) => ({ ...current, [sessionId]: { ...draftFor(session), [field]: value } }));
  }

  function managedDraftFor(record: AttendanceRecord): Draft {
    return managerDrafts[record.id] ?? { status: record.status, note: record.note ?? "" };
  }

  function updateManagedDraft(record: AttendanceRecord, field: keyof Draft, value: string) {
    setManagerDrafts((current) => ({ ...current, [record.id]: { ...managedDraftFor(record), [field]: value } }));
  }

  async function saveManagedRecord(sessionId: string, record: AttendanceRecord) {
    const draft = managedDraftFor(record);
    setBusy(true);
    const response = await fetch("/api/komunitas-belajar/attendance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "manage_record", session_id: sessionId, profile_id: record.profile_id, status: draft.status, note: draft.note }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Rekap gagal diubah.");
    else { setMessage("Rekap kehadiran diperbarui."); await load(); }
    setBusy(false);
  }

  async function deleteManagedRecord(sessionId: string, profileId: string) {
    if (!window.confirm("Hapus catatan kehadiran guru ini?")) return;
    setBusy(true);
    const response = await fetch("/api/komunitas-belajar/attendance", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ session_id: sessionId, profile_id: profileId }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Rekap gagal dihapus.");
    else { setMessage("Rekap kehadiran dihapus."); await load(); }
    setBusy(false);
  }

  const filteredSessions = sessions.filter((session) => {
    const date = new Date(session.event_date + "T00:00:00");
    const matchesMonth = month === "all" || String(date.getMonth() + 1) === month;
    const matchesYear = year === "all" || String(date.getFullYear()) === year;
    const keyword = search.trim().toLowerCase();
    const matchesSearch = !keyword || session.title.toLowerCase().includes(keyword) || session.material_title.toLowerCase().includes(keyword) || session.event_date.includes(keyword);
    return matchesMonth && matchesYear && matchesSearch;
  });

  function counts(session: Session) {
    return participants.reduce((result, participant) => { const status = session.records.find((record) => record.profile_id === participant.id)?.status ?? "alpa"; if (status === "hadir") result.hadir += 1; else if (status === "sakit") result.sakit += 1; else if (status === "izin") result.izin += 1; else result.alpa += 1; return result; }, { hadir: 0, sakit: 0, izin: 0, alpa: 0 });
  }

  function downloadAttendance() {
    const rows = [["No", "Pertemuan", "Tanggal", "Materi Kegiatan", "Nama Guru", "Peran", "Status Kehadiran", "Keterangan", "Waktu Diisi"]];
    let rowNumber = 1;
    filteredSessions.forEach((session) => { participants.forEach((participant) => { const record = session.records.find((item) => item.profile_id === participant.id); rows.push([String(rowNumber++), session.title, session.event_date, session.material_title, participant.full_name, roleLabelFromProfile(participant.role), attendanceLabel(record?.status ?? "alpa"), record?.note ?? "", record?.marked_at ? new Date(record.marked_at).toLocaleString("id-ID") : "Belum diisi"]); }); });
    const url = URL.createObjectURL(attendanceXlsx(rows));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "rekap-daftar-hadir-kombel.xlsx";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const years = [...new Set([String(new Date().getFullYear()), ...sessions.map((session) => String(new Date(session.event_date + "T00:00:00").getFullYear()))])].sort((a, b) => Number(b) - Number(a));
  const attendanceSummary = participants.map((participant) => {
    const statuses = filteredSessions.map((session) => session.records.find((record) => record.profile_id === participant.id)?.status ?? "alpa");
    const hadir = statuses.filter((status) => status === "hadir").length;
    const sakit = statuses.filter((status) => status === "sakit").length;
    const izin = statuses.filter((status) => status === "izin").length;
    const alpa = statuses.filter((status) => status === "alpa").length;
    return { participant, hadir, sakit, izin, alpa, percentage: statuses.length ? Math.round((hadir / statuses.length) * 100) : 0 };
  });
  return <section className="rounded-2xl border border-[#dbe6f5] bg-white p-6 shadow-[0_8px_22px_rgba(23,83,158,.05)] sm:p-8"><div className="flex items-start gap-4"><CalendarCheck2 size={22} className="mt-1 text-[#1264c5]" aria-hidden="true" /><div><h3 className="text-xl font-extrabold text-[#102d62]">Daftar hadir per pertemuan</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[#6683a6]">Setiap presensi wajib terhubung dengan materi kegiatan. Anggota mengisi kehadiran menggunakan identitas akun yang sedang login.</p></div></div>{canCreate && <><button type="button" onClick={() => setCreateModalOpen(true)} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1264c5] px-4 text-sm font-bold text-white hover:bg-[#0d4e9b]"><Plus size={17} aria-hidden="true" />Tambah daftar hadir</button>{createModalOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#071d45]/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateModalOpen(false); }}><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="attendance-modal-title"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Pertemuan kombel</p><h4 id="attendance-modal-title" className="mt-1 text-2xl font-extrabold text-[#102d62]">Tambah daftar hadir</h4></div><button type="button" onClick={() => setCreateModalOpen(false)} className="min-h-10 rounded-lg border border-[#bfd2e8] px-3 text-sm font-bold text-[#536f92]">Tutup</button></div><form onSubmit={createSession} className="mt-6 grid gap-4 rounded-xl bg-[#f8fbff] p-5 sm:grid-cols-2"><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold text-[#34577f]">Pertemuan / materi kegiatan</span><select required value={materialId} onChange={(event) => setMaterialId(event.target.value)} className="h-11 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm"><option value="">Pilih materi kegiatan</option>{materials.map((material) => <option key={material.id} value={material.id}>{material.title}</option>)}</select><span className="mt-1 block text-xs text-[#6683a6]">Judul sesi akan otomatis menjadi “Daftar Hadir - judul materi”.</span></label><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Tanggal pelaksanaan</span><input required type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="h-11 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm" /></label><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Tempat</span><input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={180} className="h-11 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm" placeholder="Ruang pertemuan" /></label><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Mulai aktif</span><input required type="datetime-local" value={activeFrom} onChange={(event) => setActiveFrom(event.target.value)} className="h-11 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm" /></label><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Batas pengisian</span><input required type="datetime-local" value={activeUntil} onChange={(event) => setActiveUntil(event.target.value)} className="h-11 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm" /></label><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold text-[#34577f]">Catatan kegiatan</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={3} className="w-full rounded-lg border border-[#bfd2e8] bg-white px-3 py-3 text-sm" placeholder="Agenda atau catatan singkat" /></label><button type="submit" disabled={busy || !materials.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1264c5] px-4 text-sm font-bold text-white hover:bg-[#0d4e9b] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"><Plus size={17} aria-hidden="true" />{busy ? "Menyimpan..." : "Buat daftar hadir"}</button>{!materials.length && <p className="sm:col-span-2 text-xs font-semibold text-amber-700">Tambahkan Materi Kegiatan terlebih dahulu agar sesi presensi dapat dibuat.</p>}</form></div></div>}</>}{error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p>}{message && <p role="status" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{message}</p>}<div className="mt-6 grid gap-3 rounded-xl border border-[#e1eaf4] bg-[#f8fbff] p-4 md:grid-cols-[1fr_180px_160px_auto]"><label className="block"><span className="mb-2 block text-xs font-bold text-[#34577f]">Cari pertemuan</span><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm" placeholder="Judul materi atau tanggal" /></label><label className="block"><span className="mb-2 block text-xs font-bold text-[#34577f]">Bulan</span><select value={month} onChange={(event) => setMonth(event.target.value)} className="h-10 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm"><option value="all">Semua bulan</option>{["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((name, index) => <option key={name} value={String(index + 1)}>{name}</option>)}</select></label><label className="block"><span className="mb-2 block text-xs font-bold text-[#34577f]">Tahun</span><select value={year} onChange={(event) => setYear(event.target.value)} className="h-10 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm"><option value="all">Semua tahun</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>{canExport && <button type="button" onClick={downloadAttendance} className="inline-flex min-h-10 items-end justify-center rounded-lg bg-[#1264c5] px-4 py-2 text-xs font-bold text-white hover:bg-[#0d4e9b]">Unduh .xlsx</button>}</div>{loading ? <div className="mt-6"><StatePanel title="Memuat daftar hadir" description="Sesi kegiatan sedang dimuat dari server." /></div> : filteredSessions.length ? <div className="mt-6 overflow-x-auto rounded-xl border border-[#e1eaf4]"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#f8fbff] text-xs uppercase tracking-[.08em] text-[#536f92]"><tr><th className="px-4 py-3 font-bold">No.</th><th className="px-4 py-3 font-bold">Pertemuan</th><th className="px-4 py-3 font-bold">Tanggal</th><th className="px-4 py-3 font-bold">Materi kegiatan</th><th className="px-4 py-3 font-bold">Kehadiran H / S / I / TH</th><th className="px-4 py-3 font-bold">Aksi</th></tr></thead><tbody>{filteredSessions.map((session, index) => { const total = counts(session); const expanded = expandedId === session.id; const ownRecord = session.records.find((record) => record.profile_id === currentProfileId); const draft = draftFor(session); return <><tr key={session.id} className="border-t border-[#edf2f8] align-top"><td className="px-4 py-4 font-bold text-[#1264c5]">{index + 1}</td><td className="px-4 py-4"><p className="font-bold text-[#173f70]">{session.title}</p><p className="mt-1 text-xs text-[#6683a6]">{session.active_from && session.active_until ? new Date(session.active_from).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) + " sampai " + new Date(session.active_until).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "Waktu aktif belum diatur"}</p></td><td className="px-4 py-4 text-[#536f92]">{new Date(session.event_date + "T00:00:00").toLocaleDateString("id-ID", { dateStyle: "medium" })}</td><td className="px-4 py-4 text-[#536f92]">{session.material_title}</td><td className="px-4 py-4 whitespace-nowrap font-semibold text-[#34577f]"><span className="text-emerald-700">H: {total.hadir}</span><br /><span className="text-sky-700">S: {total.sakit}</span><br /><span className="text-amber-700">I: {total.izin}</span><br /><span className="text-slate-600">TH: {total.alpa}</span></td><td className="px-4 py-4">{canSeeDetails ? <button type="button" onClick={() => setExpandedId(expanded ? null : session.id)} className="min-h-10 rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5] hover:bg-[#edf4ff]">{expanded ? "Tutup detail" : "Lihat detail"}</button> : <button type="button" disabled={busy || Boolean(ownRecord)} onClick={() => setExpandedId(session.id)} className="min-h-10 rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5] hover:bg-[#edf4ff] disabled:cursor-not-allowed disabled:opacity-60">{ownRecord ? "Sudah diisi" : "Isi kehadiran saya"}</button>}</td></tr>{expanded && <tr key={session.id + "-detail"}><td colSpan={6} className="border-t border-[#edf2f8] bg-[#f8fbff] px-4 py-4"><div className={`flex flex-col gap-4 ${canSeeDetails ? "lg:flex-row lg:items-start" : "sm:flex-row sm:items-start sm:justify-between"}`}>{canSeeDetails ? (<div className="flex-1 min-w-0"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#1970d2]">Nama guru pada pertemuan ini</p>{session.records.length ? <div className="mt-3 space-y-2">{session.records.map((record) => <div key={record.id} className="flex flex-col gap-2 rounded-lg border border-[#e1eaf4] bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-[#173f70]">{record.profile_name}</p><p className="mt-1 text-xs text-[#6683a6]">{record.profile?.login_identifier ?? "NIP/NUPTK belum diisi"} · {record.profile?.teacher_type ?? "Guru"}{record.profile?.teaching_grade ? " · Kelas " + record.profile.teaching_grade : ""}</p></div>{canManage ? <div className="flex flex-wrap items-center gap-2"><select value={managedDraftFor(record).status} onChange={(event) => updateManagedDraft(record, "status", event.target.value)} className="h-9 rounded-lg border border-[#bfd2e8] px-2 text-xs"><option value="hadir">Hadir</option><option value="izin">Izin</option><option value="sakit">Sakit</option><option value="alpa">Alpa</option></select><button type="button" disabled={busy} onClick={() => void saveManagedRecord(session.id, record)} className="min-h-9 rounded-lg bg-[#1264c5] px-2 text-[11px] font-bold text-white disabled:opacity-60">Simpan</button><button type="button" disabled={busy} onClick={() => void deleteManagedRecord(session.id, record.profile_id)} className="min-h-9 rounded-lg border border-red-200 px-2 text-[11px] font-bold text-red-700 disabled:opacity-60">Hapus</button></div> : <span className="w-fit rounded-md bg-[#edf4ff] px-2 py-1 text-xs font-bold text-[#1264c5]">{roleLabelFromProfile(record.profile?.role)}: {attendanceLabel(record.status)}</span>}</div>)}</div> : <p className="mt-3 text-sm text-[#6683a6]">Belum ada guru yang mengisi.</p>}</div>) : (<div className="flex flex-wrap items-center gap-2"><Link href={"/komunitas-belajar/ruang/materi?session_id=" + (session.material_entry_id ?? "")} className="inline-flex min-h-9 items-center rounded-lg border border-[#bfd2e8] bg-white px-3 text-xs font-bold text-[#1264c5] hover:bg-[#edf4ff]">Materi kegiatan</Link><Link href={"/komunitas-belajar/ruang/dokumentasi?session_id=" + session.id} className="inline-flex min-h-9 items-center rounded-lg border border-[#bfd2e8] bg-white px-3 text-xs font-bold text-[#1264c5] hover:bg-[#edf4ff]">Dokumentasi</Link><Link href={"/komunitas-belajar/ruang/praktik_baik?session_id=" + session.id} className="inline-flex min-h-9 items-center rounded-lg border border-[#bfd2e8] bg-white px-3 text-xs font-bold text-[#1264c5] hover:bg-[#edf4ff]">Praktik baik</Link><Link href={"/komunitas-belajar/ruang/forum?session_id=" + session.id} className="inline-flex min-h-9 items-center rounded-lg border border-[#bfd2e8] bg-white px-3 text-xs font-bold text-[#1264c5] hover:bg-[#edf4ff]">Forum terkait</Link></div>)}{canMark && (canManage || !ownRecord) && <div className="w-full sm:w-[220px] shrink-0 rounded-xl border border-[#dbe6f5] bg-white p-3.5 shadow-sm sm:ml-auto"><div className="flex items-center justify-between gap-2 border-b border-[#edf2f8] pb-2"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#1970d2]">Isi kehadiran saya</p><button type="button" onClick={() => setExpandedId(null)} className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#6683a6] transition hover:bg-[#edf4ff] hover:text-[#1264c5]" aria-label="Tutup form kehadiran" title="Tutup"><X size={15} /></button></div><select value={draft.status} onChange={(event) => updateDraft(session.id, "status", event.target.value)} className="mt-2.5 h-9 w-full rounded-lg border border-[#bfd2e8] bg-white px-2.5 text-xs font-semibold text-[#173f70]"><option value="hadir">Hadir</option><option value="izin">Izin</option><option value="sakit">Sakit</option><option value="alpa">Alpa</option></select>{draft.status === "izin" && <textarea value={draft.note} onChange={(event) => updateDraft(session.id, "note", event.target.value)} maxLength={500} rows={2} className="mt-2.5 w-full rounded-lg border border-[#bfd2e8] bg-white px-2.5 py-1.5 text-xs text-[#173f70]" placeholder="Keterangan izin..." />}{ownRecord && <p className="mt-2 text-[10px] text-[#6683a6]">Terakhir diisi {new Date(ownRecord.marked_at).toLocaleString("id-ID")}</p>}<button type="button" disabled={busy} onClick={() => void markAttendance(session.id)} className="mt-2.5 min-h-9 w-full rounded-lg bg-[#1264c5] px-2.5 text-xs font-bold text-white transition hover:bg-[#0d4e9b] disabled:cursor-not-allowed disabled:opacity-60">{ownRecord ? "Perbarui" : "Simpan kehadiran"}</button></div>}</div>{canSeeDetails && <div className="mt-4 flex flex-wrap gap-2"><Link href={"/komunitas-belajar/ruang/materi?session_id=" + (session.material_entry_id ?? "")} className="inline-flex min-h-9 items-center rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5] hover:bg-white">Materi kegiatan</Link><Link href={"/komunitas-belajar/ruang/dokumentasi?session_id=" + session.id} className="inline-flex min-h-9 items-center rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5] hover:bg-white">Dokumentasi</Link><Link href={"/komunitas-belajar/ruang/praktik_baik?session_id=" + session.id} className="inline-flex min-h-9 items-center rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5] hover:bg-white">Praktik baik</Link><Link href={"/komunitas-belajar/ruang/forum?session_id=" + session.id} className="inline-flex min-h-9 items-center rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5] hover:bg-white">Forum terkait</Link></div>}</td></tr>}</>; })}</tbody></table></div> : <EmptyState title="Belum ada sesi kegiatan" description={canCreate ? "Buat sesi pertama setelah Materi Kegiatan tersedia." : "Sesi akan muncul setelah Ketua Kombel membuat kegiatan."} />}{!loading && filteredSessions.length > 0 && <section className="mt-6 rounded-xl border border-[#e1eaf4] p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#1970d2]">Akumulasi anggota</p><h4 className="mt-1 text-lg font-extrabold text-[#173f70]">Persentase kehadiran per anggota</h4></div><p className="text-xs text-[#6683a6]">Dihitung dari pertemuan yang sedang difilter.</p></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-[#edf2f8] text-xs uppercase tracking-[.08em] text-[#536f92]"><tr><th className="px-3 py-3 font-bold">Nama</th><th className="px-3 py-3 font-bold">Peran</th><th className="px-3 py-3 font-bold">Hadir</th><th className="px-3 py-3 font-bold">Izin</th><th className="px-3 py-3 font-bold">Sakit</th><th className="px-3 py-3 font-bold">TH</th><th className="px-3 py-3 font-bold">Persentase</th></tr></thead><tbody>{attendanceSummary.map((item) => <tr key={item.participant.id} className="border-t border-[#edf2f8]"><td className="px-3 py-3 font-bold text-[#173f70]">{item.participant.full_name}<span className="mt-1 block text-xs font-normal text-[#6683a6]">{item.participant.login_identifier ?? "NIP/NUPTK belum diisi"}</span></td><td className="px-3 py-3 text-[#536f92]">{roleLabelFromProfile(item.participant.role)}{item.participant.community_position ? " · " + item.participant.community_position : ""}</td><td className="px-3 py-3 font-semibold text-emerald-700">{item.hadir}</td><td className="px-3 py-3 font-semibold text-amber-700">{item.izin}</td><td className="px-3 py-3 font-semibold text-sky-700">{item.sakit}</td><td className="px-3 py-3 font-semibold text-slate-600">{item.alpa}</td><td className="px-3 py-3 font-extrabold text-[#1264c5]">{item.percentage}%</td></tr>)}</tbody></table></div></section>}</section>;
}
function attendanceLabel(status: string) { return status === "izin" ? "Izin" : status === "sakit" ? "Sakit" : status === "alpa" ? "Alpa" : "Hadir"; }

function xmlEscape(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;"); }
function crc32(bytes: Uint8Array) { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
function zipStored(files: Array<{ name: string; data: string }>) {
  const encoder = new TextEncoder(); const locals: Uint8Array[] = []; const centrals: Uint8Array[] = []; let offset = 0;
  const u16 = (view: DataView, at: number, value: number) => view.setUint16(at, value, true); const u32 = (view: DataView, at: number, value: number) => view.setUint32(at, value, true);
  const bytesFor = (size: number) => new Uint8Array(size);
  for (const file of files) { const name = encoder.encode(file.name); const data = encoder.encode(file.data); const crc = crc32(data); const local = bytesFor(30 + name.length + data.length); const localView = new DataView(local.buffer); u32(localView, 0, 0x04034b50); u16(localView, 4, 20); u16(localView, 6, 0); u16(localView, 8, 0); u16(localView, 10, 0); u16(localView, 12, 0); u32(localView, 14, crc); u32(localView, 18, data.length); u32(localView, 22, data.length); u16(localView, 26, name.length); u16(localView, 28, 0); local.set(name, 30); local.set(data, 30 + name.length); locals.push(local); const central = bytesFor(46 + name.length); const centralView = new DataView(central.buffer); u32(centralView, 0, 0x02014b50); u16(centralView, 4, 20); u16(centralView, 6, 20); u16(centralView, 8, 0); u16(centralView, 10, 0); u16(centralView, 12, 0); u16(centralView, 14, 0); u32(centralView, 16, crc); u32(centralView, 20, data.length); u32(centralView, 24, data.length); u16(centralView, 28, name.length); u16(centralView, 30, 0); u16(centralView, 32, 0); u16(centralView, 34, 0); u16(centralView, 36, 0); u32(centralView, 38, 0); u32(centralView, 42, offset); central.set(name, 46); centrals.push(central); offset += local.length; }
  const centralSize = centrals.reduce((sum, item) => sum + item.length, 0); const end = bytesFor(22); const endView = new DataView(end.buffer); u32(endView, 0, 0x06054b50); u16(endView, 4, 0); u16(endView, 6, 0); u16(endView, 8, files.length); u16(endView, 10, files.length); u32(endView, 12, centralSize); u32(endView, 16, offset); u16(endView, 20, 0); const blobParts = [...locals, ...centrals, end].map((item) => item.buffer as ArrayBuffer); return new Blob(blobParts, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
function attendanceXlsx(rows: string[][]) {
  const columns = rows[0].map((_, index) => String.fromCharCode(65 + index)); const sheetRows = rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((cell, columnIndex) => `<c r="${columns[columnIndex]}${rowIndex + 1}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(cell)}</t></is></c>`).join("")}</row>`).join("");
  return zipStored([
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Daftar Hadir" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>` },
    { name: "xl/worksheets/sheet1.xml", data: `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>` },
  ]);
}

function ProfileWorkspace({ profile, view, data }: { profile: KbProfile; view: DashboardView; data: RoleDashboardData }) {
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const maskedIdentity = profile.login_identifier ? `${profile.login_identifier.slice(0, 4)}${"X".repeat(Math.max(profile.login_identifier.length - 4, 0))}` : "Belum diatur";
  const roleSpecific = profile.role === "guru" ? [["Guru Kelas / Mapel", profile.teacher_type ?? "Belum diatur"], ...(profile.teacher_type === "Guru Mapel" ? [["Mata pelajaran", profile.teaching_subject ?? "PAIBP"], ["Kelas", "Kelas 1–6"]] : [["Kelas", profile.teaching_grade ? `Kelas ${profile.teaching_grade}` : "Belum diatur"]])] : [];

  return (
    <>
      <section className="rounded-2xl border border-[#dbe6f5] bg-white p-6 shadow-[0_8px_22px_rgba(23,83,158,.05)] sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e8f1ff] text-[#1264c5]"><UserRound size={23} aria-hidden="true" /></span>
          <div>
            <h3 className="text-xl font-extrabold text-[#102d62]">{profile.full_name}</h3>
            <p className="mt-1 text-sm text-[#6683a6]">{roleLabel(view)}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[["NIP/NIK", maskedIdentity], ...roleSpecific, ["Status", profile.is_active ? "Aktif" : "Nonaktif"]].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[#e1eaf4] p-4">
              <p className="text-xs text-[#6683a6]">{label}</p>
              <p className="mt-2 font-bold text-[#173f70]">{value}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSecurityModalOpen(true)}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#1264c5] px-4 text-sm font-bold text-[#1264c5] hover:bg-[#edf4ff]"
        >
          <Lock size={16} aria-hidden="true" /> Ganti password
        </button>
      </section>
      <AccountSecurityDialog
        profile={profile}
        open={securityModalOpen}
        onOpenChange={setSecurityModalOpen}
        initialTab="password"
      />
    </>
  );
}

function roleLabel(view: DashboardView) { return view === "ketua" ? "Ketua Kombel" : view === "anggota" ? "Anggota Kombel" : view === "ks" ? "Kepala Sekolah" : "Pengawas Dabin"; }
function roleLabelFromProfile(role?: string) { return role === "super_admin" ? "Super Admin" : role === "guru" ? "Guru" : role === "kepala_sekolah" ? "Kepala Sekolah" : role === "pengawas_dabin" ? "Pengawas Dabin" : "Anggota"; }
function statusText(status: string) { return status === "lengkap" ? "Lengkap" : status === "perlu_perbaikan" ? "Perlu perbaikan" : status === "menunggu_pemeriksaan" ? "Menunggu pemeriksaan" : "Belum diunggah"; }
function StatePanel({ title, description, tone = "normal" }: { title: string; description: string; tone?: "normal" | "error" }) { return <div className={`rounded-xl border px-5 py-10 text-center ${tone === "error" ? "border-red-200 bg-red-50" : "border-dashed border-[#bfd2e8] bg-[#f8fbff]"}`}><p className={`text-sm font-bold ${tone === "error" ? "text-red-800" : "text-[#34577f]"}`}>{title}</p><p className={`mt-2 text-xs leading-5 ${tone === "error" ? "text-red-700" : "text-[#6683a6]"}`}>{description}</p></div>; }
function EmptyState({ title, description, href, action }: { title: string; description: string; href?: string; action?: string }) { return <div className="mt-5 rounded-xl border border-dashed border-[#bfd2e8] bg-[#f8fbff] px-5 py-8 text-center"><p className="text-sm font-bold text-[#34577f]">{title}</p><p className="mt-2 text-xs leading-5 text-[#6683a6]">{description}</p>{href && action && <Link href={href} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#1264c5] px-4 text-xs font-bold text-[#1264c5] hover:bg-[#edf4ff]">{action} <ArrowUpRight size={15} aria-hidden="true" /></Link>}</div>; }






























