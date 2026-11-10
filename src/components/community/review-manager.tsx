"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Search, X } from "lucide-react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";

type Submission = { id: string; requirement_id: string; teacher_profile_id: string; status: string; current_version_no: number; submitted_at: string | null; teacher?: { full_name: string; login_identifier: string | null } | null; latest_version?: { collection_method: string; original_name: string | null; external_url: string | null } | null };
type Review = { submission_id: string; reviewer_role: string; status: string; notes: string; reviewed_at?: string };
type Requirement = { id: string; name: string };
type Participant = { id: string; full_name: string; login_identifier: string | null };
type Viewer = { src: string; title: string };

export function ReviewManager({ canReview }: { canReview: boolean }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [opening, setOpening] = useState("");
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [submissionResponse, reviewResponse] = await Promise.all([fetch("/api/komunitas-belajar/submissions", { cache: "no-store" }), fetch("/api/komunitas-belajar/reviews", { cache: "no-store" })]);
    const submissionBody = await submissionResponse.json().catch(() => ({}));
    const reviewBody = await reviewResponse.json().catch(() => ({}));
    if (!submissionResponse.ok || !reviewResponse.ok) setError(submissionBody.error ?? reviewBody.error ?? "Monitoring gagal dimuat.");
    else { setSubmissions(submissionBody.submissions ?? []); setRequirements(submissionBody.requirements ?? []); setParticipants(submissionBody.participants ?? []); setReviews(reviewBody.reviews ?? []); }
  }, []);

  useEffect(() => {
    void load();
    if (!supabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase.channel("kb-review-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_submissions" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_reviews" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const taskName = (submission: Submission) => requirements.find((item) => item.id === submission.requirement_id)?.name ?? "Administrasi";
  const currentReview = (submission: Submission) => reviews.find((item) => item.submission_id === submission.id);
  const matchesSearch = (submission: Submission) => `${submission.teacher?.full_name ?? "Guru"} ${taskName(submission)}`.toLowerCase().includes(search.trim().toLowerCase());
  const pending = canReview ? submissions.filter((submission) => { const review = currentReview(submission); return matchesSearch(submission) && (!review || review.status === "menunggu_pemeriksaan"); }) : [];
  const history = canReview ? submissions.filter((submission) => { const review = currentReview(submission); return Boolean(review && review.status !== "menunggu_pemeriksaan") && matchesSearch(submission); }) : [];

  async function save(submissionId: string, status: string, notes: string) {
    setBusy(submissionId); setError(""); setMessage("");
    const response = await fetch("/api/komunitas-belajar/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ submission_id: submissionId, status, notes }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body.error ?? "Review gagal disimpan.");
    else { setMessage("Hasil pemeriksaan tersimpan dan status guru sudah diperbarui."); await load(); }
    setBusy("");
  }

  async function openDocument(submission: Submission) {
    setOpening(submission.id); setError("");
    if (submission.latest_version?.external_url) { window.open(submission.latest_version.external_url, "_blank", "noopener,noreferrer"); setOpening(""); return; }
    const response = await fetch(`/api/komunitas-belajar/submissions/${submission.id}/file`, { cache: "no-store" });
    const body = await response.json().catch(() => ({})) as { url?: string; error?: string; name?: string };
    if (!response.ok || !body.url) setError(body.error ?? "Dokumen tidak dapat dibuka.");
    else setViewer({ src: body.url, title: body.name ?? taskName(submission) });
    setOpening("");
  }

  const monitoringRows = useMemo(() => {
    if (canReview) return [];
    const source = participants.length ? participants : Array.from(new Map(submissions.map((submission) => [submission.teacher_profile_id, submission.teacher])).entries()).filter((entry): entry is [string, Participant] => Boolean(entry[1])).map(([id, teacher]) => ({ ...teacher, id }));
    return source.filter((participant) => participant.full_name.toLowerCase().includes(search.trim().toLowerCase())).map((participant) => {
      const teacherSubmissions = submissions.filter((submission) => submission.teacher_profile_id === participant.id);
      return { participant, complete: teacherSubmissions.filter((submission) => submission.status === "lengkap").length, revision: teacherSubmissions.filter((submission) => submission.status === "perlu_perbaikan").length, sent: teacherSubmissions.filter((submission) => submission.status !== "belum_diunggah").length, pending: Math.max(requirements.length - teacherSubmissions.length, 0) };
    });
  }, [canReview, participants, submissions, requirements, search]);

  return <section className="rounded-2xl border border-[#dbe7f5] bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">Monitoring administrasi</p><h1 className="mt-2 text-2xl font-extrabold text-[#173f70]">{canReview ? "Verifikasi tugas" : "Monitoring tugas masuk"}</h1><p className="mt-3 text-sm leading-6 text-[#6683a6]">{canReview ? "Periksa dokumen yang masuk, lalu lihat riwayat pemeriksaan di sisi kanan." : "Pengawas Dabin hanya melihat rekap tugas guru. Verifikasi dilakukan oleh Kepala Sekolah."}</p>{error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}{message && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p>}<label className="relative mt-6 block"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6683a6]" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-xl border border-[#bfd2e8] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#1970d2] focus:ring-4 focus:ring-[#1970d2]/10" placeholder="Cari nama guru atau nama tugas" aria-label="Cari nama guru atau nama tugas" /></label>{canReview ? <div className="mt-6 grid gap-5 xl:grid-cols-2"><ReviewPanel title="Menunggu pemeriksaan" description="Tugas yang belum selesai diperiksa oleh Anda." submissions={pending} requirements={requirements} reviews={reviews} busy={busy} opening={opening} canReview onOpenDocument={openDocument} onSave={save} /><ReviewPanel title="Riwayat pemeriksaan" description="Tugas yang sudah diberi hasil pemeriksaan." submissions={history} requirements={requirements} reviews={reviews} busy={busy} opening={opening} onOpenDocument={openDocument} /></div> : <MonitoringPanel rows={monitoringRows} requirementsCount={requirements.length} />}{viewer && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#071d45]/65 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewer(null); }}><div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="document-viewer-title"><div className="flex items-center justify-between gap-3 border-b border-[#e1eaf4] px-5 py-4"><h2 id="document-viewer-title" className="truncate font-bold text-[#173f70]">{viewer.title}</h2><button type="button" onClick={() => setViewer(null)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#bfd2e8] text-[#536f92]" aria-label="Tutup dokumen"><X size={18} /></button></div><iframe src={viewer.src} title={viewer.title} className="h-[70vh] w-full bg-[#f4f8ff]" /></div></div>}</section>;
}

function ReviewPanel({ title, description, submissions, requirements, reviews, busy, opening, canReview = false, onOpenDocument, onSave }: { title: string; description: string; submissions: Submission[]; requirements: Requirement[]; reviews: Review[]; busy: string; opening: string; canReview?: boolean; onOpenDocument: (submission: Submission) => Promise<void>; onSave?: (submissionId: string, status: string, notes: string) => Promise<void> }) {
  return <section className="rounded-xl border border-[#e1eaf4] bg-[#fbfdff] p-4 sm:p-5"><div><h2 className="text-lg font-extrabold text-[#173f70]">{title}</h2><p className="mt-1 text-xs leading-5 text-[#6683a6]">{description}</p></div><div className="mt-4 space-y-3">{submissions.length ? submissions.map((submission) => <ReviewCard key={submission.id} submission={submission} requirement={requirements.find((item) => item.id === submission.requirement_id)} review={reviews.find((item) => item.submission_id === submission.id)} canReview={canReview} busy={busy === submission.id} opening={opening === submission.id} onOpenDocument={onOpenDocument} onSave={onSave} />) : <div className="rounded-lg border border-dashed border-[#bfd2e8] px-4 py-8 text-center text-sm text-[#6683a6]">Belum ada data pada seksi ini.</div>}</div></section>;
}

function ReviewCard({ submission, requirement, review, canReview, busy, opening, onOpenDocument, onSave }: { submission: Submission; requirement?: Requirement; review?: Review; canReview: boolean; busy: boolean; opening: boolean; onOpenDocument: (submission: Submission) => Promise<void>; onSave?: (submissionId: string, status: string, notes: string) => Promise<void> }) {
  const [status, setStatus] = useState(review?.status ?? "menunggu_pemeriksaan");
  const [notes, setNotes] = useState(review?.notes ?? "");
  useEffect(() => { setStatus(review?.status ?? "menunggu_pemeriksaan"); setNotes(review?.notes ?? ""); }, [review?.status, review?.notes]);
  return <article className="rounded-xl border border-[#dbe6f5] bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-bold text-[#173f70]">{submission.teacher?.full_name ?? "Guru"}</h3><p className="mt-1 text-sm text-[#6683a6]">{requirement?.name ?? "Administrasi"} · versi {submission.current_version_no}</p><button type="button" onClick={() => void onOpenDocument(submission)} disabled={opening} className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5] hover:bg-[#edf4ff] disabled:opacity-60"><FileText size={14} aria-hidden="true" />{opening ? "Membuka..." : "Buka dokumen"}</button></div><span className={`w-fit rounded-lg px-2 py-1 text-xs font-bold ${review?.status === "lengkap" ? "bg-emerald-50 text-emerald-700" : review?.status === "perlu_perbaikan" ? "bg-red-50 text-red-700" : "bg-[#fff7e8] text-[#a15c00]"}`}>{review?.status ?? "Menunggu pemeriksaan"}</span></div>{canReview ? <div className="mt-4 space-y-3"><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 w-full rounded-lg border border-[#bfd2e8] px-3 text-sm"><option value="lengkap">Lengkap</option><option value="perlu_perbaikan">Perlu perbaikan</option></select><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Catatan atau saran perbaikan" className="w-full rounded-lg border border-[#bfd2e8] px-3 py-2 text-sm" /><button type="button" disabled={busy} onClick={() => void onSave?.(submission.id, status, notes)} className="min-h-11 w-full rounded-lg bg-[#0b5fc3] px-4 text-sm font-bold text-white disabled:opacity-60">{busy ? "Menyimpan..." : "Simpan verifikasi"}</button></div> : review?.notes ? <p className="mt-3 rounded-lg bg-[#fff7e8] px-3 py-2 text-xs leading-5 text-[#8a5a00]">Catatan: {review.notes}</p> : null}</article>;
}

function MonitoringPanel({ rows, requirementsCount }: { rows: Array<{ participant: Participant; complete: number; revision: number; sent: number; pending: number }>; requirementsCount: number }) {
  return <section className="mt-6 overflow-x-auto rounded-xl border border-[#e1eaf4]"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#f8fbff] text-xs uppercase tracking-[.08em] text-[#536f92]"><tr><th className="px-4 py-3 font-bold">Nama guru</th><th className="px-4 py-3 font-bold">Tugas lengkap</th><th className="px-4 py-3 font-bold">Perlu perbaikan</th><th className="px-4 py-3 font-bold">Sudah kirim</th><th className="px-4 py-3 font-bold">Belum kirim</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.participant.id} className="border-t border-[#edf2f8]"><td className="px-4 py-4"><p className="font-bold text-[#173f70]">{row.participant.full_name}</p><p className="mt-1 text-xs text-[#6683a6]">{row.participant.login_identifier ?? "NIP/NIK belum diatur"}</p></td><td className="px-4 py-4 font-bold text-emerald-700">{row.complete}</td><td className="px-4 py-4 font-bold text-red-700">{row.revision}</td><td className="px-4 py-4 font-bold text-[#1264c5]">{row.sent}</td><td className="px-4 py-4 font-bold text-slate-600">{row.pending}</td></tr>) : <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-[#6683a6]">Belum ada guru atau tugas aktif untuk dimonitor.</td></tr>}</tbody><caption className="caption-bottom px-4 py-3 text-left text-xs text-[#6683a6]">Total tugas aktif yang digunakan sebagai dasar belum kirim: {requirementsCount}.</caption></table></section>;
}
