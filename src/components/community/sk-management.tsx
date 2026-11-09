"use client";

import { useEffect, useState } from "react";
import { FileCheck2, Pencil, Trash2, UploadCloud } from "lucide-react";

type DocumentItem = { id: string; title: string; description: string; original_name: string; file_size: number; sort_order: number; is_published: boolean; public_url: string };

function formatSize(bytes: number) { return `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

export function SkManagement() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/komunitas-belajar/sk", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (response.ok) setDocuments(body.documents ?? []); else setError(body.error ?? "Dokumen gagal dimuat.");
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setSaving(true);
    if (!file) { setError("Pilih file PDF terlebih dahulu."); setSaving(false); return; }
    const body = new FormData(); body.set("title", title); body.set("description", description); body.set("file", file);
    const response = await fetch("/api/admin/komunitas-belajar/sk", { method: "POST", body });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Dokumen gagal diunggah."); else { setTitle(""); setDescription(""); setFile(null); event.currentTarget.reset(); setMessage("Dokumen SK berhasil ditambahkan."); await load(); }
    setSaving(false);
  }

  async function update(document: DocumentItem) {
    const nextTitle = window.prompt("Judul dokumen", document.title); if (nextTitle === null) return;
    const nextDescription = window.prompt("Keterangan singkat", document.description) ?? document.description;
    const response = await fetch("/api/admin/komunitas-belajar/sk", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: document.id, title: nextTitle, description: nextDescription }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Dokumen gagal diperbarui."); else { setMessage("Dokumen berhasil diperbarui."); await load(); }
  }

  async function toggle(document: DocumentItem) {
    const response = await fetch("/api/admin/komunitas-belajar/sk", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: document.id, is_published: !document.is_published }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Status publikasi gagal diubah."); else await load();
  }

  async function remove(document: DocumentItem) {
    if (!window.confirm(`Hapus ${document.title}?`)) return;
    const response = await fetch("/api/admin/komunitas-belajar/sk", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: document.id }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? "Dokumen gagal dihapus."); else { setMessage("Dokumen berhasil dihapus."); await load(); }
  }

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]"><section className="rounded-2xl border border-[#dedcf3] bg-white p-6 shadow-sm sm:p-7"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#6048e8]/10 text-[#6048e8]"><FileCheck2 size={21} /></span><div><h2 className="font-display text-xl">Tambah SK Kombel</h2><p className="mt-1 text-sm text-ink/55">PDF publik untuk dibaca tanpa login.</p></div></div><form onSubmit={upload} className="mt-6 space-y-4"><label className="block"><span className="mb-2 block text-sm font-bold">Judul dokumen</span><input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} className="h-12 w-full rounded-xl border border-ink/15 px-3 outline-none focus:border-[#6048e8]" placeholder="SK Komunitas Belajar Guru" /></label><label className="block"><span className="mb-2 block text-sm font-bold">Keterangan</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={4} className="w-full rounded-xl border border-ink/15 px-3 py-3 outline-none focus:border-[#6048e8]" placeholder="Keterangan singkat dokumen" /></label><label className="block"><span className="mb-2 block text-sm font-bold">File PDF</span><input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required className="block w-full rounded-xl border border-dashed border-[#6048e8]/40 bg-[#6048e8]/[.03] p-3 text-sm" /><span className="mt-2 block text-xs text-ink/50">Maksimal 20 MB. Hanya PDF.</span></label>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}{message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p>}<button disabled={saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#6048e8] px-4 text-sm font-bold text-white hover:bg-[#5039d1] disabled:opacity-60"><UploadCloud size={18} />{saving ? "Mengunggah..." : "Unggah SK"}</button></form></section><section className="rounded-2xl border border-[#dedcf3] bg-white p-6 shadow-sm sm:p-7"><div className="flex items-end justify-between gap-3"><div><p className="section-kicker text-[#6048e8]/75">Arsip publik</p><h2 className="mt-2 font-display text-2xl">Daftar SK Kombel</h2></div><span className="text-sm font-semibold text-ink/50">{documents.length} dokumen</span></div>{loading ? <p className="mt-6 text-sm text-ink/55">Memuat dokumen...</p> : <div className="mt-6 space-y-3">{documents.length ? documents.map((document) => <article key={document.id} className="rounded-xl border border-ink/10 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><a href={document.public_url} target="_blank" rel="noreferrer" className="font-bold text-[#173f70] hover:text-[#6048e8]">{document.title}</a><p className="mt-1 text-xs text-ink/50">{document.original_name} · {formatSize(document.file_size)}</p>{document.description && <p className="mt-2 text-sm leading-6 text-ink/60">{document.description}</p>}</div><span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${document.is_published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{document.is_published ? "Publik" : "Draf"}</span></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => update(document)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-ink/15 px-3 text-xs font-bold hover:border-[#6048e8] hover:text-[#6048e8]"><Pencil size={14} /> Edit</button><button type="button" onClick={() => toggle(document)} className="min-h-9 rounded-lg border border-ink/15 px-3 text-xs font-bold hover:border-[#6048e8] hover:text-[#6048e8]">{document.is_published ? "Jadikan draf" : "Publikasikan"}</button><button type="button" onClick={() => remove(document)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 hover:bg-red-50"><Trash2 size={14} /> Hapus</button></div></article>) : <div className="rounded-xl border border-dashed border-ink/15 px-5 py-10 text-center text-sm text-ink/55">Belum ada SK Kombel yang diunggah.</div>}</div>}</section></div>;
}
