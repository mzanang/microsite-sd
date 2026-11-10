"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, LockKeyhole, Pencil, Trash2, UploadCloud } from "lucide-react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";

type Requirement = { id: string; name: string; description: string; collection_method: "file" | "link" | "both"; is_required: boolean; due_at: string | null; meeting_number?: number | null; material_title?: string | null };
type Review = { reviewer_role: string; status: string; notes: string };
type Submission = { id: string; requirement_id: string; status: string; current_version_no: number; submitted_at: string | null; latest_version: { collection_method: string; original_name: string | null; external_url: string | null } | null; reviews: Review[] };

const statusLabels: Record<string, string> = { belum_diunggah: "Belum diunggah", menunggu_pemeriksaan: "Menunggu pemeriksaan", lengkap: "Lengkap", perlu_perbaikan: "Perlu perbaikan" };

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
  const currentRequirement = requirements.find((requirement) => requirement.id === selected);
  const currentSubmission = submissions.find((submission) => submission.requirement_id === selected);
  const currentLocked = currentSubmission?.status === "lengkap";

  const load = useCallback(async () => {
    const response = await fetch("/api/komunitas-belajar/submissions", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? "Data gagal dimuat."); return; }
    setRequirements(body.requirements ?? []);
    setSubmissions(body.submissions ?? []);
    if (!selected && body.requirements?.[0]) {
      const requested = new URLSearchParams(window.location.search).get("requirement_id");
      const requestedId = requested && body.requirements.some((requirement: Requirement) => requirement.id === requested) ? requested : body.requirements[0].id;
      setSelected(requestedId);
    }
  }, [selected]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!supabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase.channel("kb-submission-status-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_submissions" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_reviews" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("requirement_id");
    if (requested) setSelected(requested);
  }, []);
  useEffect(() => { if (currentRequirement && currentRequirement.collection_method !== "both") setMethod(currentRequirement.collection_method); }, [currentRequirement]);
  useEffect(() => { setUrl(currentSubmission?.latest_version?.external_url ?? ""); }, [currentSubmission?.id, currentSubmission?.latest_version?.external_url]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (currentLocked) return;
    const formElement = event.currentTarget;
    setBusy(true); setError(""); setMessage("");
    const body = new FormData();
    body.set("requirement_id", selected); body.set("collection_method", method);
    if (method === "file" && file) body.set("file", file);
    if (method === "link") body.set("external_url", url);
    const response = await fetch("/api/komunitas-belajar/submissions", { method: "POST", body });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Tugas gagal disimpan.");
    else { setMessage("Tugas berhasil dikirim untuk pemeriksaan."); setFile(null); setUrl(""); formElement.reset(); await load(); }
    setBusy(false);
  }

  async function cancelSubmission(submission: Submission) {
    if (!window.confirm("Batalkan pengumpulan ini? File dan riwayat pengumpulan akan dihapus.")) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/komunitas-belajar/submissions", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ submission_id: submission.id }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Pengumpulan gagal dibatalkan.");
    else { setMessage("Pengumpulan berhasil dibatalkan."); await load(); }
    setBusy(false);
  }

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
    <section className="rounded-2xl border border-[#dbe7f5] bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">Kumpulkan tugas</p>
      <h1 className="mt-2 text-2xl font-extrabold text-[#173f70]">Kumpulkan Tugas</h1>
      <p className="mt-3 text-sm leading-6 text-[#6683a6]">Pilih persyaratan lalu unggah file atau kirim link HTTPS. Setiap pengiriman menjadi versi baru.</p>
      {requirements.length ? <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Persyaratan</span><select value={selected} onChange={(event) => setSelected(event.target.value)} className="h-12 w-full rounded-xl border border-[#bfd2e8] px-3 text-sm"><option value="">Pilih persyaratan</option>{requirements.map((requirement) => { const submission = submissions.find((item) => item.requirement_id === requirement.id); return <option key={requirement.id} value={requirement.id} disabled={submission?.status === "lengkap"}>{requirement.name}{requirement.is_required ? " *" : ""}{submission?.status === "lengkap" ? " (sudah diverifikasi)" : ""}</option>; })}</select></label>
        {currentRequirement && <p className="rounded-xl bg-[#f4f8ff] px-4 py-3 text-xs leading-5 text-[#6683a6]">{currentRequirement.meeting_number ? `Pertemuan ke-${currentRequirement.meeting_number}. ` : ""}{currentRequirement.material_title ? `Materi: ${currentRequirement.material_title}. ` : ""}{currentRequirement.description || "Tidak ada keterangan tambahan."}{currentRequirement.due_at ? ` Batas: ${new Date(currentRequirement.due_at).toLocaleDateString("id-ID")}.` : ""}{currentLocked ? " Tugas ini terkunci karena sudah diverifikasi KS." : ""}</p>}
        <fieldset disabled={currentLocked}><legend className="mb-2 text-sm font-bold text-[#34577f]">Metode pengumpulan</legend><div className="grid grid-cols-2 gap-2">{(["file", "link"] as const).filter((value) => currentRequirement?.collection_method === "both" || currentRequirement?.collection_method === value).map((value) => <label key={value} className="flex min-h-11 items-center gap-2 rounded-xl border border-[#bfd2e8] px-3 text-sm font-semibold text-[#34577f]"><input type="radio" name="method" checked={method === value} onChange={() => setMethod(value)} />{value === "file" ? "Upload file" : "Gunakan link"}</label>)}</div></fieldset>
        {method === "file" ? <label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">{currentSubmission ? "Ganti file dokumen" : "File dokumen"}</span><input type="file" disabled={currentLocked} onChange={(event) => setFile(event.target.files?.[0] ?? null)} required className="block w-full rounded-xl border border-dashed border-[#1970d2]/40 bg-[#f4f8ff] p-3 text-sm disabled:cursor-not-allowed disabled:opacity-60" /></label> : <label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Link dokumen</span><input type="url" disabled={currentLocked} value={url} onChange={(event) => setUrl(event.target.value)} required placeholder="https://drive.google.com/..." className="h-12 w-full rounded-xl border border-[#bfd2e8] px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60" /><span className="mt-2 block text-xs leading-5 text-[#6683a6]">Pastikan Kepala Sekolah dan Pengawas Dabin sudah memiliki izin akses.</span></label>}
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}{message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p>}
        <button disabled={busy || !selected || currentLocked} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0b5fc3] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"><UploadCloud size={18} />{busy ? "Mengirim..." : currentSubmission?.status === "perlu_perbaikan" ? "Kirim ulang setelah perbaikan" : currentSubmission ? "Perbarui kiriman" : "Kumpulkan Tugas"}</button>
      </form> : <div className="mt-6 rounded-xl border border-dashed border-[#b9cfe7] px-5 py-8 text-center text-sm text-[#6683a6]">Belum ada persyaratan aktif.</div>}
    </section>
    <section className="rounded-2xl border border-[#dbe7f5] bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">Riwayat saya</p><h2 className="mt-2 text-2xl font-extrabold text-[#173f70]">Status administrasi</h2><div className="mt-6 space-y-3">{requirements.map((requirement) => { const submission = submissions.find((item) => item.requirement_id === requirement.id); const locked = submission?.status === "lengkap"; return <article key={requirement.id} className="rounded-xl border border-[#e1eaf4] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-[#173f70]">{requirement.name}</h3><p className="mt-1 text-xs text-[#6683a6]">{submission?.latest_version?.original_name ?? submission?.latest_version?.external_url ?? "Belum ada pengumpulan"}</p></div><span className="rounded-lg bg-[#edf4ff] px-2 py-1 text-xs font-bold text-[#1264c5]">{statusLabels[submission?.status ?? "belum_diunggah"]}</span></div>{submission?.reviews?.filter((review) => review.notes).map((review) => <p key={`${review.reviewer_role}-${review.notes}`} className="mt-3 rounded-lg bg-[#fff7e8] px-3 py-2 text-xs leading-5 text-[#8a5a00]">{review.reviewer_role === "kepala_sekolah" ? "Kepala Sekolah" : "Pengawas Dabin"}: {review.notes}</p>)}{submission?.latest_version?.external_url && <a className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#1264c5]" href={submission.latest_version.external_url} target="_blank" rel="noreferrer">Buka link <ExternalLink size={13} /></a>}{submission && <div className="mt-4 flex flex-wrap gap-2">{locked ? <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#f1f5f9] px-3 text-xs font-bold text-[#64748b]"><LockKeyhole size={14} />Terkunci setelah verifikasi KS</span> : <><button type="button" onClick={() => setSelected(requirement.id)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#bfd2e8] px-3 text-xs font-bold text-[#1264c5]"><Pencil size={14} />Ubah kiriman</button><button type="button" disabled={busy} onClick={() => void cancelSubmission(submission)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 disabled:opacity-60"><Trash2 size={14} />Batal kirim</button></>}</div>}</article>; })}</div></section>
  </div>;
}
