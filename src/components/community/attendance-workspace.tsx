"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CalendarCheck2, Download, FileText, Plus, UploadCloud } from "lucide-react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";

type AttendanceWorkspaceProps = { canCreate: boolean; canMark: boolean; canExport: boolean; canSeeDetails: boolean; canManage: boolean };
type AttendanceProfile = { id: string; full_name: string; login_identifier: string | null; teacher_type: string | null; teaching_grade: number | null; role: string; community_position: string | null };
type AttendanceRecord = { id: string; profile_id: string; profile_name: string; status: string; note: string; marked_at: string; profile: AttendanceProfile | null };
type Session = { id: string; title: string; meeting_number: number; event_date: string; location: string; notes: string; material_entry_id: string | null; material_title: string; active_from: string | null; active_until: string | null; attendance_file_name: string | null; attendance_file_mime_type: string | null; attendance_file_url: string | null; records: AttendanceRecord[] };
type Material = { id: string; title: string; body: string; created_at: string };
type Participant = AttendanceProfile;
type Draft = { status: string; note: string };

export function AttendanceWorkspace({ canCreate, canMark, canExport, canSeeDetails, canManage }: AttendanceWorkspaceProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [activeFrom, setActiveFrom] = useState("");
  const [activeUntil, setActiveUntil] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [meeting, setMeeting] = useState("all");
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [managerDrafts, setManagerDrafts] = useState<Record<string, Draft>>({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [manualSessionId, setManualSessionId] = useState<string | null>(null);
  const [manualViewer, setManualViewer] = useState<{ src: string; title: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/komunitas-belajar/attendance", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Data kehadiran gagal dimuat.");
    else { setSessions(result.sessions ?? []); setMaterials(result.materials ?? []); setParticipants(result.participants ?? []); setCurrentProfileId(result.current_profile_id ?? ""); }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); const requestedSession = new URLSearchParams(window.location.search).get("session_id"); if (requestedSession) setExpandedId(requestedSession); }, [load]);
  useEffect(() => {
    if (!supabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase.channel("kb-attendance-workspace-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_attendance_sessions" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_attendance_records" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  function toIso(value: string) { return value ? new Date(value).toISOString() : ""; }
  function toLocalDateTimeValue(value: string | null) { return value ? new Date(value).toISOString().slice(0, 16) : ""; }
  function openCreateSession() { setEditingSessionId(null); setMaterialId(""); setEventDate(""); setActiveFrom(""); setActiveUntil(""); setLocation(""); setNotes(""); setCreateModalOpen(true); }
  function openEditSession(session: Session) { setEditingSessionId(session.id); setMaterialId(session.material_entry_id ?? ""); setEventDate(session.event_date); setActiveFrom(toLocalDateTimeValue(session.active_from)); setActiveUntil(toLocalDateTimeValue(session.active_until)); setLocation(session.location); setNotes(session.notes); setCreateModalOpen(true); }
  function draftFor(session: Session): Draft { const ownRecord = session.records.find((record) => record.profile_id === currentProfileId); return drafts[session.id] ?? { status: ownRecord?.status ?? "hadir", note: ownRecord?.note ?? "" }; }
  function updateDraft(sessionId: string, field: keyof Draft, value: string) { const session = sessions.find((item) => item.id === sessionId); if (!session) return; setDrafts((current) => ({ ...current, [sessionId]: { ...draftFor(session), [field]: value } })); }
  function managedDraftFor(record: AttendanceRecord): Draft { return managerDrafts[record.id] ?? { status: record.status, note: record.note ?? "" }; }
  function updateManagedDraft(record: AttendanceRecord, field: keyof Draft, value: string) { setManagerDrafts((current) => ({ ...current, [record.id]: { ...managedDraftFor(record), [field]: value } })); }

  async function createSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/komunitas-belajar/attendance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create_session", material_entry_id: materialId, event_date: eventDate, active_from: toIso(activeFrom), active_until: toIso(activeUntil), location, notes }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Sesi gagal dibuat.");
    else { setMessage("Daftar hadir berhasil dibuat dan terhubung dengan materi."); setMaterialId(""); setEventDate(""); setActiveFrom(""); setActiveUntil(""); setLocation(""); setNotes(""); setCreateModalOpen(false); await load(); }
    setBusy(false);
  }

  async function updateSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editingSessionId) return;
    setBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/komunitas-belajar/attendance", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ session_id: editingSessionId, material_entry_id: materialId, event_date: eventDate, active_from: toIso(activeFrom), active_until: toIso(activeUntil), location, notes }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Daftar hadir gagal diperbarui.");
    else { setMessage("Daftar hadir berhasil diperbarui."); setEditingSessionId(null); setCreateModalOpen(false); await load(); }
    setBusy(false);
  }

  async function deleteSession(session: Session) {
    if (!window.confirm(`Hapus daftar hadir pertemuan ke-${session.meeting_number}? Catatan kehadiran peserta juga akan dihapus.`)) return;
    setBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/komunitas-belajar/attendance", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ session_id: session.id }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Daftar hadir gagal dihapus.");
    else { setMessage("Daftar hadir berhasil dihapus."); if (expandedId === session.id) setExpandedId(null); await load(); }
    setBusy(false);
  }

  async function markAttendance(sessionId: string) {
    const session = sessions.find((item) => item.id === sessionId); if (!session) return;
    const draft = draftFor(session); setBusy(true); setError("");
    const response = await fetch("/api/komunitas-belajar/attendance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "mark_self", session_id: sessionId, status: draft.status, note: draft.note }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Kehadiran gagal disimpan."); else { setMessage("Kehadiran berhasil disimpan."); await load(); }
    setBusy(false);
  }

  async function saveManagedRecord(sessionId: string, record: AttendanceRecord) {
    const draft = managedDraftFor(record); setBusy(true); setError("");
    const response = await fetch("/api/komunitas-belajar/attendance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "manage_record", session_id: sessionId, profile_id: record.profile_id, status: draft.status, note: draft.note }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Rekap gagal diubah."); else { setMessage("Rekap kehadiran diperbarui."); await load(); }
    setBusy(false);
  }

  async function deleteManagedRecord(sessionId: string, profileId: string) {
    if (!window.confirm("Hapus catatan kehadiran guru ini?")) return;
    setBusy(true);
    const response = await fetch("/api/komunitas-belajar/attendance", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ session_id: sessionId, profile_id: profileId }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Rekap gagal dihapus."); else { setMessage("Rekap kehadiran dihapus."); await load(); }
    setBusy(false);
  }

  async function uploadAttendanceFile(sessionId: string, file: File) {
    if (!(["image/jpeg", "application/pdf"] as string[]).includes(file.type)) { setError("Format daftar hadir hanya JPG atau PDF."); return; }
    if (file.size > 1 * 1024 * 1024) { setError("Ukuran daftar hadir maksimal 1 MB."); return; }
    setUploadBusy(sessionId); setError(""); setMessage("");
    const form = new FormData(); form.set("session_id", sessionId); form.set("file", file);
    const response = await fetch("/api/komunitas-belajar/attendance", { method: "POST", body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "File daftar hadir gagal diunggah."); else { setMessage("File daftar hadir berhasil diunggah."); await load(); }
    setUploadBusy("");
  }

  function openManualAttendance(session: Session) {
    if (!session.attendance_file_url) return;
    setManualViewer({ src: session.attendance_file_url, title: `Daftar hadir pertemuan ke-${session.meeting_number}` });
  }

  const meetingNumbers = [...new Set(sessions.map((session) => session.meeting_number))].sort((a, b) => a - b);
  const filteredSessions = sessions.filter((session) => {
    const date = new Date(session.event_date + "T00:00:00");
    const keyword = search.trim().toLowerCase();
    const participantNames = session.records.map((record) => record.profile_name).join(" ").toLowerCase();
    return (meeting === "all" || String(session.meeting_number) === meeting) && (month === "all" || String(date.getMonth() + 1) === month) && (year === "all" || String(date.getFullYear()) === year) && (!keyword || participantNames.includes(keyword) || session.title.toLowerCase().includes(keyword) || session.material_title.toLowerCase().includes(keyword) || session.event_date.includes(keyword));
  });
  const years = [...new Set([String(new Date().getFullYear()), ...sessions.map((session) => String(new Date(session.event_date + "T00:00:00").getFullYear()))])].sort((a, b) => Number(b) - Number(a));
  const requiredParticipants = getAttendanceParticipants(participants);
  function counts(session: Session) { return requiredParticipants.reduce((result, participant) => { const status = session.records.find((record) => record.profile_id === participant.id)?.status; if (status === "hadir") result.hadir += 1; else if (status === "sakit") result.sakit += 1; else if (status === "izin") result.izin += 1; else if (status === "alpa") result.tanpaKeterangan += 1; else result.belumIsi += 1; return result; }, { hadir: 0, sakit: 0, izin: 0, tanpaKeterangan: 0, belumIsi: 0 }); }
  async function downloadAttendance(session?: Session) {
    if (session) {
      const rows = getAttendanceParticipants(participants).map((participant, index) => {
        const record = session.records.find((item) => item.profile_id === participant.id);
        return [String(index + 1), participant.full_name, participantRoleLabel(participant), record ? attendanceLabel(record.status) : "", ""];
      });
      openAttendancePrintViewV2(session, rows, "Daftar hadir", "Kehadiran", getChairName(participants));
      return;
    }
    const logoBytes = await getSchoolLogoBytes();
    const rows = sessions.map((item, index) => { const total = counts(item); return [String(index + 1), `Pertemuan ke-${item.meeting_number}`, item.event_date, item.material_title, String(total.hadir), String(total.sakit), String(total.izin), String(total.tanpaKeterangan), String(total.belumIsi)]; });
    downloadWorkbook(buildAttendanceWorkbook({ title: "REKAPITULASI DAFTAR HADIR KEGIATAN KOMBEL", summaryRows: rows, logoBytes }), "rekap-daftar-hadir-semua-kegiatan.xlsx");
  }

  async function printAttendanceTemplate(session: Session) {
    const rows = getAttendanceParticipants(participants).map((participant, index) => [String(index + 1), participant.full_name, participantRoleLabel(participant), "", ""]);
    openAttendancePrintViewV2(session, rows, "Daftar hadir", "Tanda Tangan", getChairName(participants));
  }

  function downloadAttendanceTemplate(session: Session) { setManualSessionId(session.id); }

  const attendanceSummary = requiredParticipants.map((participant) => { const statuses = filteredSessions.map((session) => session.records.find((record) => record.profile_id === participant.id)?.status); const hadir = statuses.filter((status) => status === "hadir").length; const sakit = statuses.filter((status) => status === "sakit").length; const izin = statuses.filter((status) => status === "izin").length; const tanpaKeterangan = statuses.filter((status) => status === "alpa").length; const belumIsi = statuses.filter((status) => !status || !["hadir", "sakit", "izin", "alpa"].includes(status)).length; return { participant, hadir, sakit, izin, tanpaKeterangan, belumIsi, alpa: tanpaKeterangan, percentage: statuses.length ? Math.round((hadir / statuses.length) * 100) : 0 }; });

  return <><section className="rounded-2xl border border-[#dbe6f5] bg-white p-6 shadow-[0_8px_22px_rgba(23,83,158,.05)] sm:p-8">
    <div className="flex items-start gap-4"><CalendarCheck2 size={22} className="mt-1 text-[#1264c5]" aria-hidden="true" /><div><h3 className="text-xl font-extrabold text-[#102d62]">Daftar hadir per pertemuan</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[#6683a6]">Setiap sesi otomatis mendapat nomor pertemuan. Rekap Excel berisi jumlah H, S, I, dan TK untuk setiap kegiatan.</p></div></div>
    {canCreate && <><button type="button" onClick={openCreateSession} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1264c5] px-4 text-sm font-bold text-white hover:bg-[#0d4e9b]"><Plus size={17} aria-hidden="true" />Tambah daftar hadir</button>{createModalOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#071d45]/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateModalOpen(false); }}><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="attendance-modal-title"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Pertemuan kombel</p><h4 id="attendance-modal-title" className="mt-1 text-2xl font-extrabold text-[#102d62]">{editingSessionId ? "Edit daftar hadir" : "Tambah daftar hadir"}</h4><p className="mt-2 text-xs text-[#6683a6]">Nomor pertemuan akan dibuat otomatis saat disimpan.</p></div><button type="button" onClick={() => setCreateModalOpen(false)} className="min-h-10 rounded-lg border border-[#bfd2e8] px-3 text-sm font-bold text-[#536f92]">Tutup</button></div><form onSubmit={editingSessionId ? updateSession : createSession} className="mt-6 grid gap-4 rounded-xl bg-[#f8fbff] p-5 sm:grid-cols-2"><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold text-[#34577f]">Materi kegiatan</span><select required value={materialId} onChange={(event) => setMaterialId(event.target.value)} className="h-11 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm"><option value="">Pilih materi kegiatan</option>{materials.map((material) => <option key={material.id} value={material.id}>{material.title}</option>)}</select></label><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Tanggal pelaksanaan</span><input required type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="h-11 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm" /></label><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Tempat</span><input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={180} className="h-11 w-full rounded-lg border border-[#bfd2e8] px-3 text-sm" placeholder="Ruang pertemuan" /></label><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Mulai aktif</span><input required type="datetime-local" value={activeFrom} onChange={(event) => setActiveFrom(event.target.value)} className="h-11 w-full rounded-lg border border-[#bfd2e8] px-3 text-sm" /></label><label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Batas pengisian</span><input required type="datetime-local" value={activeUntil} onChange={(event) => setActiveUntil(event.target.value)} className="h-11 w-full rounded-lg border border-[#bfd2e8] px-3 text-sm" /></label><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold text-[#34577f]">Catatan kegiatan</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={3} className="w-full rounded-lg border border-[#bfd2e8] px-3 py-3 text-sm" placeholder="Agenda atau catatan singkat" /></label><button type="submit" disabled={busy || !materials.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1264c5] px-4 text-sm font-bold text-white hover:bg-[#0d4e9b] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"><Plus size={17} aria-hidden="true" />{busy ? "Menyimpan..." : editingSessionId ? "Simpan perubahan" : "Buat daftar hadir"}</button>{!materials.length && <p className="sm:col-span-2 text-xs font-semibold text-amber-700">Tambahkan Materi Kegiatan terlebih dahulu agar sesi presensi dapat dibuat.</p>}</form></div></div>}</>}
    {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p>}{message && <p role="status" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{message}</p>}
    <div className="mt-6 grid gap-3 rounded-xl border border-[#e1eaf4] bg-[#f8fbff] p-4 md:grid-cols-[minmax(0,1fr)_150px_150px_150px_auto]"><label className="block"><span className="mb-2 block text-xs font-bold text-[#34577f]">Cari nama peserta</span><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm" placeholder="Nama peserta" /></label><label className="block"><span className="mb-2 block text-xs font-bold text-[#34577f]">Pertemuan ke</span><select value={meeting} onChange={(event) => setMeeting(event.target.value)} className="h-10 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm"><option value="all">Semua pertemuan</option>{meetingNumbers.map((number) => <option key={number} value={String(number)}>{number}</option>)}</select></label><label className="block"><span className="mb-2 block text-xs font-bold text-[#34577f]">Bulan</span><select value={month} onChange={(event) => setMonth(event.target.value)} className="h-10 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm"><option value="all">Semua bulan</option>{["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((name, index) => <option key={name} value={String(index + 1)}>{name}</option>)}</select></label><label className="block"><span className="mb-2 block text-xs font-bold text-[#34577f]">Tahun</span><select value={year} onChange={(event) => setYear(event.target.value)} className="h-10 w-full rounded-lg border border-[#bfd2e8] bg-white px-3 text-sm"><option value="all">Semua tahun</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>{canExport && <button type="button" onClick={() => downloadAttendance()} className="inline-flex min-h-[64px] items-center justify-center gap-1 rounded-lg bg-[#1264c5] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#0d4e9b] flex-col"><Download size={16} aria-hidden="true" /><span>Export Excel</span></button>}</div>
    {loading ? <div className="mt-6 rounded-xl border border-dashed border-[#bfd2e8] bg-[#f8fbff] px-5 py-10 text-center text-sm text-[#6683a6]">Memuat daftar hadir...</div> : filteredSessions.length ? <div className="mt-6 overflow-x-auto rounded-xl border border-[#e1eaf4]"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#f8fbff] text-xs uppercase tracking-[.08em] text-[#536f92]"><tr><th className="px-4 py-3 font-bold">No.</th><th className="px-4 py-3 font-bold">Pertemuan</th><th className="px-4 py-3 font-bold">Tanggal</th><th className="px-4 py-3 font-bold">Materi kegiatan</th><th className="px-4 py-3 font-bold"><span>Kehadiran</span><br /><span>H / S / I / TK</span></th><th className="px-4 py-3 font-bold">Aksi</th></tr></thead><tbody>{filteredSessions.map((session, index) => { const total = counts(session); const expanded = expandedId === session.id; const ownRecord = session.records.find((record) => record.profile_id === currentProfileId); const draft = draftFor(session); return <><tr key={session.id} className="border-t border-[#edf2f8] align-top"><td className="px-4 py-4 font-bold text-[#1264c5]">{index + 1}</td><td className="px-4 py-4"><p className="font-bold text-[#173f70]">Pertemuan ke-{session.meeting_number}</p><p className="mt-1 text-xs text-[#6683a6]">{session.title.replace(/^Pertemuan ke-\d+\s*-\s*/, "")} · {session.active_from && session.active_until ? new Date(session.active_from).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) + " sampai " + new Date(session.active_until).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "Waktu aktif belum diatur"}</p></td><td className="px-4 py-4 text-[#536f92]">{new Date(session.event_date + "T00:00:00").toLocaleDateString("id-ID", { dateStyle: "medium" })}</td><td className="px-4 py-4 text-[#536f92]">{session.material_title}</td><td className="px-4 py-4 whitespace-nowrap font-semibold text-[#34577f]"><span className="text-emerald-700">H: {total.hadir}</span><br /><span className="text-sky-700">S: {total.sakit}</span><br /><span className="text-amber-700">I: {total.izin}</span><br /><span className="text-slate-600">TK: {total.tanpaKeterangan}</span></td><td className="px-4 py-4"><div className="flex flex-wrap gap-2">{canExport && (canManage || !session.attendance_file_url) && <button type="button" onClick={() => downloadAttendance(session)} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-[#1264c5] px-2.5 text-[11px] font-bold text-white hover:bg-[#0d4e9b]"><Download size={13} aria-hidden="true" />Unduh</button>}{canManage && <><button type="button" disabled={busy} onClick={() => openEditSession(session)} className="inline-flex min-h-9 items-center rounded-lg border border-[#bfd2e8] px-2.5 text-[11px] font-bold text-[#1264c5] hover:bg-[#edf4ff]">Edit</button><button type="button" disabled={busy} onClick={() => void deleteSession(session)} className="inline-flex min-h-9 items-center rounded-lg border border-red-200 px-2.5 text-[11px] font-bold text-red-700 hover:bg-red-50">Hapus</button></>}{canExport && !canManage && session.attendance_file_url && <button type="button" onClick={() => openManualAttendance(session)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#bfd2e8] px-2.5 text-[11px] font-bold text-[#1264c5] hover:bg-[#edf4ff]"><FileText size={13} aria-hidden="true" />Lihat daftar hadir</button>}{canManage && <button type="button" onClick={() => setManualSessionId(session.id)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#bfd2e8] px-2.5 text-[11px] font-bold text-[#1264c5] hover:bg-[#edf4ff]"><UploadCloud size={13} aria-hidden="true" />{uploadBusy === session.id ? "Mengunggah..." : "Unggah Manual"}</button>}{canManage && session.attendance_file_url && <a href={session.attendance_file_url} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-emerald-200 px-2.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50"><FileText size={13} aria-hidden="true" />Buka file</a>}{canSeeDetails && <button type="button" onClick={() => setExpandedId(expanded ? null : session.id)} className="inline-flex min-h-9 items-center rounded-lg border border-[#bfd2e8] px-2.5 text-[11px] font-bold text-[#1264c5] hover:bg-[#edf4ff]">{expanded ? "Tutup detail" : "Lihat detail"}</button>}{!canSeeDetails && canMark && <button type="button" disabled={busy || Boolean(ownRecord)} onClick={() => setExpandedId(session.id)} className="inline-flex min-h-9 items-center rounded-lg border border-[#bfd2e8] px-2.5 text-[11px] font-bold text-[#1264c5] disabled:opacity-60">{ownRecord ? "Sudah diisi" : "Isi kehadiran saya"}</button>}</div></td></tr>{expanded && <tr key={session.id + "-detail"}><td colSpan={6} className="border-t border-[#edf2f8] bg-[#f8fbff] px-4 py-4"><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">{canSeeDetails && <div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#1970d2]">Nama guru pada pertemuan ini</p>{session.records.length ? <div className="mt-3 space-y-2">{session.records.map((record) => <div key={record.id} className="flex flex-col gap-2 rounded-lg border border-[#e1eaf4] bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-[#173f70]">{record.profile_name}</p><p className="mt-1 text-xs text-[#6683a6]">{record.profile?.login_identifier ?? "NIP/NUPTK belum diisi"} · {record.profile?.teacher_type ?? "Guru"}{record.profile?.teaching_grade ? ` · Kelas ${record.profile.teaching_grade}` : ""}</p></div>{canManage ? <div className="flex flex-wrap items-center gap-2"><select value={managedDraftFor(record).status} onChange={(event) => updateManagedDraft(record, "status", event.target.value)} className="h-9 rounded-lg border border-[#bfd2e8] px-2 text-xs"><option value="hadir">Hadir</option><option value="izin">Izin</option><option value="sakit">Sakit</option><option value="alpa">Tanpa Keterangan</option></select><button type="button" disabled={busy} onClick={() => void saveManagedRecord(session.id, record)} className="min-h-9 rounded-lg bg-[#1264c5] px-2 text-[11px] font-bold text-white disabled:opacity-60">Simpan</button><button type="button" disabled={busy} onClick={() => void deleteManagedRecord(session.id, record.profile_id)} className="min-h-9 rounded-lg border border-red-200 px-2 text-[11px] font-bold text-red-700 disabled:opacity-60">Hapus</button></div> : <span className="w-fit rounded-md bg-[#edf4ff] px-2 py-1 text-xs font-bold text-[#1264c5]">{roleLabelFromProfile(record.profile?.role)}: {attendanceLabel(record.status)}</span>}</div>)}</div> : <p className="mt-3 text-sm text-[#6683a6]">Belum ada guru yang mengisi.</p>}</div>}{canMark && (canManage || !ownRecord) && <div className="rounded-xl border border-[#dbe6f5] bg-white p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#1970d2]">Isi kehadiran saya</p><select value={draft.status} onChange={(event) => updateDraft(session.id, "status", event.target.value)} className="mt-3 h-10 w-full rounded-lg border border-[#bfd2e8] px-3 text-sm"><option value="hadir">Hadir</option><option value="izin">Izin</option><option value="sakit">Sakit</option><option value="alpa">Tanpa Keterangan</option></select>{draft.status === "izin" && <textarea value={draft.note} onChange={(event) => updateDraft(session.id, "note", event.target.value)} maxLength={500} rows={3} className="mt-3 w-full rounded-lg border border-[#bfd2e8] px-3 py-2 text-sm" placeholder="Keterangan izin, misalnya Dinas Luar" />}{ownRecord && <p className="mt-3 text-xs text-[#6683a6]">Terakhir diisi {new Date(ownRecord.marked_at).toLocaleString("id-ID")}</p>}<button type="button" disabled={busy} onClick={() => void markAttendance(session.id)} className="mt-3 min-h-10 w-full rounded-lg bg-[#1264c5] px-3 text-xs font-bold text-white hover:bg-[#0d4e9b] disabled:cursor-not-allowed disabled:opacity-60">{ownRecord ? "Perbarui kehadiran" : "Simpan kehadiran"}</button></div>}</div><div className="mt-4 flex flex-wrap gap-2"><Link href={`/komunitas-belajar/ruang/materi?session_id=${session.material_entry_id ?? ""}`} className="inline-flex min-h-9 items-center rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5] hover:bg-white">Materi kegiatan</Link><Link href={`/komunitas-belajar/ruang/dokumentasi?session_id=${session.id}`} className="inline-flex min-h-9 items-center rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5] hover:bg-white">Dokumentasi</Link><Link href={`/komunitas-belajar/ruang/praktik_baik?session_id=${session.id}`} className="inline-flex min-h-9 items-center rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5] hover:bg-white">Praktik baik</Link><Link href={`/komunitas-belajar/ruang/forum?session_id=${session.id}`} className="inline-flex min-h-9 items-center rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5] hover:bg-white">Forum terkait</Link><p className="w-full text-xs text-[#6683a6]">Status: H = Hadir · S = Sakit · I = Izin · TK = Tanpa Keterangan</p></div></td></tr>}</>; })}</tbody></table></div> : <div className="mt-5 rounded-xl border border-dashed border-[#bfd2e8] bg-[#f8fbff] px-5 py-8 text-center"><p className="text-sm font-bold text-[#34577f]">Belum ada sesi kegiatan</p><p className="mt-2 text-xs leading-5 text-[#6683a6]">{canCreate ? "Buat sesi pertama setelah Materi Kegiatan tersedia." : "Sesi akan muncul setelah Ketua Kombel membuat kegiatan."}</p></div>}
    {!loading && filteredSessions.length > 0 && <section className="mt-6 rounded-xl border border-[#e1eaf4] p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#1970d2]">Akumulasi anggota</p><h4 className="mt-1 text-lg font-extrabold text-[#173f70]">Persentase kehadiran per anggota</h4></div><p className="text-xs text-[#6683a6]">Dihitung dari pertemuan yang sedang difilter.</p></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-[#edf2f8] text-xs uppercase tracking-[.08em] text-[#536f92]"><tr><th className="px-3 py-3 font-bold">Nama</th><th className="px-3 py-3 font-bold">Peran</th><th className="px-3 py-3 font-bold">Hadir</th><th className="px-3 py-3 font-bold">Izin</th><th className="px-3 py-3 font-bold">Sakit</th><th className="px-3 py-3 font-bold">TK</th><th className="px-3 py-3 font-bold">Persentase</th></tr></thead><tbody>{attendanceSummary.map((item) => <tr key={item.participant.id} className="border-t border-[#edf2f8]"><td className="px-3 py-3 font-bold text-[#173f70]">{item.participant.full_name}<span className="mt-1 block text-xs font-normal text-[#6683a6]">{item.participant.login_identifier ?? "NIP/NUPTK belum diisi"}</span></td><td className="px-3 py-3 text-[#536f92]">{roleLabelFromProfile(item.participant.role)}{item.participant.community_position ? " - " + item.participant.community_position : ""}</td><td className="px-3 py-3 font-semibold text-emerald-700">{item.hadir}</td><td className="px-3 py-3 font-semibold text-amber-700">{item.izin}</td><td className="px-3 py-3 font-semibold text-sky-700">{item.sakit}</td><td className="px-3 py-3 font-semibold text-slate-600">{item.alpa}</td><td className="px-3 py-3 font-extrabold text-[#1264c5]">{item.percentage}%</td></tr>)}</tbody></table></div></section>}
  </section>{manualSessionId && <ManualAttendanceModal session={sessions.find((item) => item.id === manualSessionId) ?? null} busy={uploadBusy === manualSessionId} onClose={() => setManualSessionId(null)} onUpload={(file) => { if (manualSessionId) void uploadAttendanceFile(manualSessionId, file); }} onDownloadTemplate={(session) => void printAttendanceTemplate(session)} />}{manualViewer && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#071d45]/65 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setManualViewer(null); }}><div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="manual-attendance-viewer-title"><div className="flex items-center justify-between gap-4 border-b border-[#e1eaf4] px-5 py-4"><h4 id="manual-attendance-viewer-title" className="truncate text-sm font-bold text-[#173f70]">{manualViewer.title}</h4><button type="button" onClick={() => setManualViewer(null)} className="min-h-9 rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#536f92]">Tutup</button></div><iframe title={manualViewer.title} src={manualViewer.src} className="min-h-0 flex-1 bg-[#f8fbff]" /></div></div>}</>;
}

function attendanceLabel(status: string) { return status === "izin" ? "Izin" : status === "sakit" ? "Sakit" : status === "alpa" ? "Tanpa Keterangan" : status === "hadir" ? "Hadir" : "Belum Isi"; }

function getAttendanceParticipants(participants: Participant[]) {
  return participants.filter((participant) => participant.role === "kepala_sekolah" || (participant.role === "guru" && (participant.community_position === "ketua" || participant.community_position === "anggota"))).sort((a, b) => participantRank(a) - participantRank(b) || a.full_name.localeCompare(b.full_name, "id"));
}

function participantRank(participant: Participant) {
  if (participant.role === "kepala_sekolah") return 0;
  if (participant.role === "guru" && participant.community_position === "ketua") return 1;
  return 2;
}

function participantRoleLabel(participant: Participant) {
  if (participant.role === "kepala_sekolah") return "Kepala Sekolah";
  if (participant.role === "guru" && participant.community_position === "ketua") return "Ketua";
  return "Anggota";
}

type ManualAttendanceModalProps = { session: Session | null; busy: boolean; onClose: () => void; onUpload: (file: File) => void; onDownloadTemplate: (session: Session) => void };

function ManualAttendanceModal({ session, busy, onClose, onUpload, onDownloadTemplate }: ManualAttendanceModalProps) {
  if (!session) return null;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#071d45]/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="manual-attendance-title"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Daftar hadir manual</p><h4 id="manual-attendance-title" className="mt-1 text-2xl font-extrabold text-[#102d62]">Pertemuan ke-{session.meeting_number}</h4><p className="mt-2 text-sm leading-6 text-[#6683a6]">Unggah lembar yang sudah ditandatangani atau cetak template PDF dengan logo sekolah.</p></div><button type="button" onClick={onClose} className="min-h-10 rounded-lg border border-[#bfd2e8] px-3 text-sm font-bold text-[#536f92]">Tutup</button></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#dbe6f5] bg-[#f8fbff] p-4"><p className="text-sm font-extrabold text-[#173f70]">Unggah lembar manual</p><p className="mt-1 text-xs leading-5 text-[#6683a6]">File PDF atau JPG, maksimal 1 MB.</p><label className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#1264c5] px-3 text-xs font-bold text-white hover:bg-[#0d4e9b]"><UploadCloud size={15} aria-hidden="true" />{busy ? "Mengunggah..." : "Pilih file daftar hadir"}<input type="file" accept="image/jpeg,application/pdf,.jpg,.jpeg,.pdf" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onUpload(file); }} /></label></div><div className="rounded-xl border border-[#dbe6f5] bg-white p-4"><p className="text-sm font-extrabold text-[#173f70]">Template PDF</p><p className="mt-1 text-xs leading-5 text-[#6683a6]">Peserta sudah diurutkan: Kepala Sekolah, Ketua, lalu Anggota.</p><button type="button" onClick={() => onDownloadTemplate(session)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5] hover:bg-[#edf4ff]"><FileText size={15} aria-hidden="true" />Cetak template PDF</button></div></div>{session.attendance_file_url && <a href={session.attendance_file_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50"><FileText size={15} aria-hidden="true" />Buka file yang tersimpan</a>}<p className="mt-5 text-xs leading-5 text-[#6683a6]">Saat jendela cetak terbuka, pilih tujuan “Simpan sebagai PDF” untuk menyimpan dokumen.</p></div></div>;
}

function htmlEscape(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }

function formatAttendanceDate(value: string) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "long" }) : "-"; }

function getChairName(participants: Participant[]) { return getAttendanceParticipants(participants).find((participant) => participant.role === "guru" && participant.community_position === "ketua")?.full_name ?? "Nama Ketua Kombel"; }

function openAttendancePrintViewV2(session: Session, rows: string[][], documentType: string, attendanceColumnLabel = "Tanda Tangan", chairName = "Nama Ketua Kombel") {
  const printWindow = window.open("", "_blank");
  if (!printWindow) { window.alert("Izinkan pop-up browser untuk membuka dokumen daftar hadir."); return; }
  const rowMarkup = rows.map((row) => `<tr>${row.map((value) => `<td>${htmlEscape(value)}</td>`).join("")}</tr>`).join("");
  const printedAt = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date());
  const link = "https://www.sdndukuhwaru01.web.id/komunitas-belajar";
  printWindow.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8" /><title>${htmlEscape(`${documentType} pertemuan ke-${session.meeting_number}`)}</title><style>@page{size:A4 portrait;margin:14mm 14mm 17mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#173f70;font-family:Arial,Helvetica,sans-serif}.print-page{min-height:calc(297mm - 31mm);display:flex;flex-direction:column}.school-header{display:flex;align-items:center;gap:14px;padding-bottom:10px;border-bottom:2px solid #173f70}.school-header img{width:58px;height:58px;object-fit:contain}.school-heading{flex:1;text-align:center}.school-name,.school-unit-title{font-size:16px;font-weight:700;letter-spacing:.04em}.school-unit-title{margin-top:4px;color:#173f70}.document-title{margin:18px 0 14px;text-align:center;font-size:18px;font-weight:700;letter-spacing:.02em}.metadata{display:grid;grid-template-columns:94px 10px minmax(0,1fr) 100px 10px 190px;gap:6px 4px;margin-bottom:16px;font-size:11px}.metadata .label{font-weight:700;color:#536f92}.metadata .colon{font-weight:700;text-align:center;color:#536f92}.attendance-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px}.attendance-table th,.attendance-table td{border:1px solid #8293a7;padding:7px 6px;vertical-align:middle}.attendance-table th{background:#eaf2fb;text-align:center;font-weight:700}.attendance-table th:nth-child(1),.attendance-table td:nth-child(1){width:8%;text-align:center}.attendance-table th:nth-child(2),.attendance-table td:nth-child(2){width:30%}.attendance-table th:nth-child(3),.attendance-table td:nth-child(3){width:20%}.attendance-table th:nth-child(4),.attendance-table td:nth-child(4){width:22%;height:34px}.attendance-table th:nth-child(5),.attendance-table td:nth-child(5){width:20%}.signature{width:220px;margin:22px 0 0 auto;text-align:center;font-size:11px;line-height:1.5}.signature-space{height:58px}.print-footer{display:flex;justify-content:space-between;gap:18px;margin-top:auto;padding-top:8px;border-top:1px solid #dbe6f5;color:#6683a6;font-size:9px}.print-footer .footer-copy{display:flex;flex-direction:column;gap:2px;font-style:italic}.print-footer a{color:#1264c5;text-decoration:none;white-space:nowrap;font-style:normal}@media print{.print-footer{position:fixed;left:0;right:0;bottom:0}}@media(max-width:640px){.metadata{grid-template-columns:92px 10px minmax(0,1fr)}.print-page{min-height:auto}.print-footer{position:static;flex-direction:column}.print-footer a{white-space:normal}}</style></head><body><main class="print-page"><header class="school-header"><img src="${htmlEscape(new URL("/logo.png", window.location.origin).href)}" alt="Logo sekolah" /><div class="school-heading"><div class="school-name">SD NEGERI DUKUHWARU 01</div><div class="school-unit-title">KOMUNITAS BELAJAR (KOMBEL)</div></div></header><h1 class="document-title">${htmlEscape(documentType.toUpperCase())}</h1><section class="metadata"><span class="label">Pertemuan ke</span><span class="colon">:</span><span>${htmlEscape(String(session.meeting_number))}</span><span class="label">Tanggal</span><span class="colon">:</span><span>${htmlEscape(formatAttendanceDate(session.event_date))}</span><span class="label">Materi Kegiatan</span><span class="colon">:</span><span>${htmlEscape(session.material_title || "-")}</span><span class="label">Tempat</span><span class="colon">:</span><span>${htmlEscape(session.location || "-")}</span></section><table class="attendance-table"><thead><tr><th>No.</th><th>Nama Peserta</th><th>Peran</th><th>${htmlEscape(attendanceColumnLabel)}</th><th>Keterangan</th></tr></thead><tbody>${rowMarkup}</tbody></table><section class="signature"><div>Mengetahui,</div><div>Ketua Kombel</div><div class="signature-space"></div><div>${htmlEscape(chairName)}</div></section><footer class="print-footer"><span class="footer-copy"><span>Dicetak ${htmlEscape(printedAt)}</span><span>Daftar hadir Kombel SD Negeri Dukuhwaru 01</span></span><a href="${link}">${link}</a></footer></main></body></html>`);
  printWindow.document.close(); printWindow.focus(); window.setTimeout(() => printWindow.print(), 350);
}

function openAttendancePrintView(session: Session, rows: string[][], documentType: string, attendanceColumnLabel = "Tanda Tangan", chairName = "Nama Ketua Kombel") {
  const printWindow = window.open("", "_blank");
  if (!printWindow) { window.alert("Izinkan pop-up browser untuk membuka dokumen daftar hadir."); return; }
  const rowMarkup = rows.map((row) => `<tr>${row.map((value) => `<td>${htmlEscape(value)}</td>`).join("")}</tr>`).join("");
  const printedAt = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date());
  printWindow.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8" /><title>${htmlEscape(`${documentType} pertemuan ke-${session.meeting_number}`)}</title><style>@page{size:A4 portrait;margin:14mm 14mm 16mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#173f70;font-family:Arial,Helvetica,sans-serif}.print-page{min-height:calc(297mm - 30mm);display:flex;flex-direction:column}.school-header{display:flex;align-items:center;gap:14px}.school-header img{width:58px;height:58px;object-fit:contain}.school-heading{flex:1;text-align:center}.school-name{font-size:16px;font-weight:700;letter-spacing:.04em}.school-unit{margin-top:4px;color:#536f92;font-size:12px}.document-title{margin:18px 0 14px;text-align:center;font-size:18px;font-weight:700;letter-spacing:.02em}.metadata{display:grid;grid-template-columns:110px 1fr 110px 1fr;gap:6px 10px;margin-bottom:16px;font-size:11px}.metadata .label{font-weight:700;color:#536f92}.attendance-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px}.attendance-table th,.attendance-table td{border:1px solid #8293a7;padding:7px 6px;vertical-align:middle}.attendance-table th{background:#eaf2fb;text-align:center;font-weight:700}.attendance-table th:nth-child(1),.attendance-table td:nth-child(1){width:8%;text-align:center}.attendance-table th:nth-child(2),.attendance-table td:nth-child(2){width:30%}.attendance-table th:nth-child(3),.attendance-table td:nth-child(3){width:20%}.attendance-table th:nth-child(4),.attendance-table td:nth-child(4){width:22%;height:34px}.attendance-table th:nth-child(5),.attendance-table td:nth-child(5){width:20%}.signature{width:220px;margin:22px 0 0 auto;text-align:center;font-size:11px;line-height:1.5}.signature-space{height:58px}.print-footer{display:flex;justify-content:space-between;gap:18px;margin-top:auto;padding-top:8px;border-top:1px solid #dbe6f5;color:#6683a6;font-size:9px}.print-footer .footer-copy{display:flex;flex-direction:column;gap:2px;font-style:italic}.print-footer a{color:#1264c5;text-decoration:none;white-space:nowrap;font-style:normal}@media print{.print-footer{position:fixed;left:0;right:0;bottom:0}}@media(max-width:640px){.metadata{grid-template-columns:92px 1fr}.print-page{min-height:auto}.print-footer{position:static;flex-direction:column}.print-footer a{white-space:normal}}</style></head><body><main class="print-page"><header class="school-header"><img src="${htmlEscape(new URL("/logo.png", window.location.origin).href)}" alt="Logo sekolah" /><div class="school-heading"><div class="school-name">SD NEGERI DUKUHWARU 01</div><div class="school-unit">Komunitas Belajar Guru</div></div></header><h1 class="document-title">${htmlEscape(documentType.toUpperCase())}</h1><section class="metadata"><span class="label">Pertemuan ke</span><span>${htmlEscape(String(session.meeting_number))}</span><span class="label">Tanggal</span><span>${htmlEscape(formatAttendanceDate(session.event_date))}</span><span class="label">Materi Kegiatan</span><span>${htmlEscape(session.material_title || "-")}</span><span class="label">Tempat</span><span>${htmlEscape(session.location || "-")}</span></section><table class="attendance-table"><thead><tr><th>No.</th><th>Nama Peserta</th><th>Peran</th><th>Tanda Tangan</th><th>Keterangan</th></tr></thead><tbody>${rowMarkup}</tbody></table><section class="signature"><div>Mengetahui,</div><div>Ketua Kombel</div><div class="signature-space"></div><div>Nama Ketua</div></section><footer class="print-footer"><span class="footer-copy"><span>Dicetak ${htmlEscape(printedAt)}</span><span>Daftar hadir Kombel SD Negeri Dukuhwaru 01</span></span><a href="https://www.sdndukuhwaru01.web.id/komunitas-belajar">https://www.sdndukuhwaru01.web.id/komunitas-belajar</a></footer></main></body></html>`); printWindow.document.close(); printWindow.focus(); window.setTimeout(() => printWindow.print(), 350);
}

function roleLabelFromProfile(role?: string) { return role === "super_admin" ? "Super Admin" : role === "guru" ? "Guru" : role === "kepala_sekolah" ? "Kepala Sekolah" : role === "pengawas_dabin" ? "Pengawas Dabin" : "Anggota"; }

function xmlEscape(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;"); }
function crc32(bytes: Uint8Array) { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
function zipStored(files: Array<{ name: string; data: string | Uint8Array }>) {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  const u16 = (view: DataView, at: number, value: number) => view.setUint16(at, value, true);
  const u32 = (view: DataView, at: number, value: number) => view.setUint32(at, value, true);
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = typeof file.data === "string" ? encoder.encode(file.data) : file.data;
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length + data.length);
    const localView = new DataView(local.buffer);
    u32(localView, 0, 0x04034b50); u16(localView, 4, 20); u32(localView, 14, crc); u32(localView, 18, data.length); u32(localView, 22, data.length); u16(localView, 26, name.length);
    local.set(name, 30); local.set(data, 30 + name.length); locals.push(local);
    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    u32(centralView, 0, 0x02014b50); u16(centralView, 4, 20); u16(centralView, 6, 20); u32(centralView, 16, crc); u32(centralView, 20, data.length); u32(centralView, 24, data.length); u16(centralView, 28, name.length); u32(centralView, 42, offset);
    central.set(name, 46); centrals.push(central); offset += local.length;
  }
  const centralSize = centrals.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array(22); const endView = new DataView(end.buffer);
  u32(endView, 0, 0x06054b50); u16(endView, 8, files.length); u16(endView, 10, files.length); u32(endView, 12, centralSize); u32(endView, 16, offset);
  const parts: BlobPart[] = [...locals, ...centrals, end].map((item) => item as unknown as BlobPart);
  return new Blob(parts, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

let schoolLogoCache: Uint8Array | null | undefined;

async function getSchoolLogoBytes() {
  if (schoolLogoCache !== undefined) return schoolLogoCache;
  try {
    const response = await fetch("/logo.png");
    schoolLogoCache = response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
  } catch {
    schoolLogoCache = null;
  }
  return schoolLogoCache;
}

function downloadWorkbook(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type WorkbookOptions = { title: string; session?: Session; rows?: string[][]; summaryRows?: string[][]; logoBytes: Uint8Array | null };

function columnName(index: number) {
  let result = ""; let value = index + 1;
  while (value > 0) { const remainder = (value - 1) % 26; result = String.fromCharCode(65 + remainder) + result; value = Math.floor((value - 1) / 26); }
  return result;
}

function cellXml(value: string, reference: string, style = 0) {
  return `<c r="${reference}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

function buildAttendanceWorkbook({ title, session, rows = [], summaryRows, logoBytes }: WorkbookOptions) {
  const isSummary = Boolean(summaryRows);
  const headerRows: string[][] = isSummary
    ? [[title], ["SD NEGERI DUKUHWARU 01"], [], ["No.", "Pertemuan", "Tanggal", "Materi Kegiatan", "Hadir (H)", "Sakit (S)", "Izin (I)", "Tanpa Keterangan (TK)"]]
    : [[title], ["SD NEGERI DUKUHWARU 01"], [], ["Pertemuan ke", String(session?.meeting_number ?? "")], ["Materi", session?.material_title ?? ""], ["Tanggal", session?.event_date ?? ""], ["Tempat", session?.location ?? ""], [], ["No.", "Nama Peserta", "Peran", "Tanda Tangan", "Keterangan"]];
  const dataRows = summaryRows ?? rows;
  const allRows = [...headerRows, ...dataRows, ...(isSummary ? [] : [[], ["", "", "", "Mengetahui,", ""], ["", "", "", "Ketua Kombel", ""], ["", "", "", "Nama Ketua", ""]])];
  const columnCount = isSummary ? 8 : 5;
  const sheetRows = allRows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => cellXml(value, `${columnName(columnIndex)}${rowIndex + 1}`, rowIndex === (isSummary ? 3 : 8) ? 4 : rowIndex < 2 ? rowIndex === 0 ? 1 : 2 : (rowIndex === 3 && !isSummary) ? 3 : 5)).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  const lastColumn = columnName(columnCount - 1);
  const merges = isSummary ? `<mergeCell ref="A1:${lastColumn}1"/><mergeCell ref="A2:${lastColumn}2"/>` : `<mergeCell ref="A1:E1"/><mergeCell ref="A2:E2"/><mergeCell ref="B4:E4"/><mergeCell ref="B5:E5"/><mergeCell ref="B6:E6"/><mergeCell ref="B7:E7"/>`;
  const drawing = logoBytes ? `<drawing r:id="rId1"/>` : "";
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${logoBytes ? `<Default Extension="png" ContentType="image/png"/>` : ""}<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${logoBytes ? `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>` : ""}</Types>`;
  const files: Array<{ name: string; data: string | Uint8Array }> = [
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Daftar Hadir" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", data: `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="14"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="D9EAFB"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" applyAlignment="1"><alignment horizontal="left"/></xf><xf numFmtId="0" fontId="0" fillId="2" borderId="1" applyAlignment="1"><alignment horizontal="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs></styleSheet>` },
    { name: "xl/worksheets/sheet1.xml", data: `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols><col min="1" max="1" width="8" customWidth="1"/><col min="2" max="2" width="28" customWidth="1"/><col min="3" max="${columnCount}" width="20" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData><mergeCells count="${isSummary ? 2 : 6}">${merges}</mergeCells>${drawing}</worksheet>` },
  ];
  if (logoBytes) {
    files.push({ name: "xl/worksheets/_rels/sheet1.xml.rels", data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>` });
    files.push({ name: "xl/drawings/drawing1.xml", data: `<?xml version="1.0" encoding="UTF-8"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>1</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="1" name="Logo sekolah"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>` });
    files.push({ name: "xl/drawings/_rels/drawing1.xml.rels", data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>` });
    files.push({ name: "xl/media/image1.png", data: logoBytes });
  }
  return zipStored(files);
}
