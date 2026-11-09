"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, UploadCloud } from "lucide-react";

type Requirement = { id: string; name: string; description: string; collection_method: "file" | "link" | "both"; is_required: boolean; due_at: string | null };
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

  const load = useCallback(async () => {
    const response = await fetch("/api/komunitas-belajar/submissions", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? "Data gagal dimuat."); return; }
    setRequirements(body.requirements ?? []);
    setSubmissions(body.submissions ?? []);
    if (!selected && body.requirements?.[0]) setSelected(body.requirements[0].id);
  }, [selected]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (currentRequirement && currentRequirement.collection_method !== "both") setMethod(currentRequirement.collection_method); }, [currentRequirement]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const body = new FormData();
    body.set("requirement_id", selected); body.set("collection_method", method);
    if (method === "file" && file) body.set("file", file);
    if (method === "link") body.set("external_url", url);
    const response = await fetch("/api/komunitas-belajar/submissions", { method: "POST", body });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Pengumpulan gagal disimpan.");
    else { setMessage("Pengumpulan berhasil dikirim untuk pemeriksaan."); setFile(null); setUrl(""); event.currentTarget.reset(); await load(); }
    setBusy(false);
  }

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
    <section className="rounded-2xl border border-[#dbe7f5] bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">Pengumpulan guru</p>
      <h1 className="mt-2 text-2xl font-extrabold text-[#173f70]">Kirim administrasi</h1>
      <p className="mt-3 text-sm leading-6 text-[#6683a6]">Pilih persyaratan lalu unggah file atau kirim link HTTPS. Setiap pengiriman menjadi versi baru.</p>
      {requirements.length ? <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Persyaratan</span><select value={selected} onChange={(event) => setSelected(event.target.value)} className="h-12 w-full rounded-xl border border-[#bfd2e8] px-3 text-sm"><option value="">Pilih persyaratan</option>{requirements.map((requirement) => <option key={requirement.id} value={requirement.id}>{requirement.name}{requirement.is_required ? " *" : ""}</option>)}</select></label>
        {currentRequirement && <p className="rounded-xl bg-[#f4f8ff] px-4 py-3 text-xs leading-5 text-[#6683a6]">{currentRequirement.description || "Tidak ada keterangan tambahan."}{currentRequirement.due_at ? ` Batas: ${new Date(currentRequirement.due_at).toLocaleDateString("id-ID")}.` : ""}</p>}
        <fieldset><legend className="mb-2 text-sm font-bold text-[#34577f]">Metode pengumpulan</legend><div className="grid grid-cols-2 gap-2">{(["file", "link"] as const).filter((value) => currentRequirement?.collection_method === "both" || currentRequirement?.collection_method === value).map((value) => <label key={value} className="flex min-h-11 items-center gap-2 rounded-xl border border-[#bfd2e8] px-3 text-sm font-semibold text-[#34577f]"><input type="radio" name="method" checked={method === value} onChange={() => setMethod(value)} />{value === "file" ? "Upload file" : "Gunakan link"}</label>)}</div></fieldset>
        {method === "file" ? <label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">File dokumen</span><input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required className="block w-full rounded-xl border border-dashed border-[#1970d2]/40 bg-[#f4f8ff] p-3 text-sm" /></label> : <label className="block"><span className="mb-2 block text-sm font-bold text-[#34577f]">Link dokumen</span><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} required placeholder="https://drive.google.com/..." className="h-12 w-full rounded-xl border border-[#bfd2e8] px-3 text-sm" /><span className="mt-2 block text-xs leading-5 text-[#6683a6]">Pastikan Kepala Sekolah dan Pengawas Dabin sudah memiliki izin akses.</span></label>}
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}{message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p>}
        <button disabled={busy || !selected} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0b5fc3] px-4 text-sm font-bold text-white disabled:opacity-60"><UploadCloud size={18} />{busy ? "Mengirim..." : currentSubmission ? "Kirim versi baru" : "Kirim administrasi"}</button>
      </form> : <div className="mt-6 rounded-xl border border-dashed border-[#b9cfe7] px-5 py-8 text-center text-sm text-[#6683a6]">Belum ada persyaratan aktif.</div>}
    </section>
    <section className="rounded-2xl border border-[#dbe7f5] bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#1970d2]">Riwayat saya</p><h2 className="mt-2 text-2xl font-extrabold text-[#173f70]">Status administrasi</h2><div className="mt-6 space-y-3">{requirements.map((requirement) => { const submission = submissions.find((item) => item.requirement_id === requirement.id); return <article key={requirement.id} className="rounded-xl border border-[#e1eaf4] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-[#173f70]">{requirement.name}</h3><p className="mt-1 text-xs text-[#6683a6]">{submission?.latest_version?.original_name ?? submission?.latest_version?.external_url ?? "Belum ada pengumpulan"}</p></div><span className="rounded-lg bg-[#edf4ff] px-2 py-1 text-xs font-bold text-[#1264c5]">{statusLabels[submission?.status ?? "belum_diunggah"]}</span></div>{submission?.reviews?.filter((review) => review.notes).map((review) => <p key={`${review.reviewer_role}-${review.notes}`} className="mt-3 rounded-lg bg-[#fff7e8] px-3 py-2 text-xs leading-5 text-[#8a5a00]">{review.reviewer_role === "kepala_sekolah" ? "Kepala Sekolah" : "Pengawas Dabin"}: {review.notes}</p>)}{submission?.latest_version?.external_url && <a className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#1264c5]" href={submission.latest_version.external_url} target="_blank" rel="noreferrer">Buka link <ExternalLink size={13} /></a>}</article>; })}</div></section>
  </div>;
}
