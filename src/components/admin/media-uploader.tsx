"use client";

import Image from "next/image";
import { FileImage, ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { notifyAdmin } from "@/lib/admin-notify";

type MediaAsset = {
  id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  alt_text: string;
  created_at: string;
  url: string;
};

export function MediaUploader() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState("");

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/media");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setAssets(result.assets ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Pustaka media gagal dimuat.";
      setStatus(message);
      notifyAdmin(message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAssets(); }, [loadAssets]);

  function choose(next: File | null) {
    if (!next) return;
    if (!next.type.startsWith("image/") || next.size > 5 * 1024 * 1024) {
      setStatus("File harus berupa gambar dengan ukuran maksimal 5 MB.");
      notifyAdmin("File gambar tidak valid.", "error");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setStatus("");
  }

  async function upload() {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/admin/media", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setStatus("Aset berhasil disimpan ke Storage.");
      notifyAdmin("Aset berhasil disimpan ke Storage.", "success");
      if (preview) URL.revokeObjectURL(preview);
      setFile(null);
      setPreview("");
      await loadAssets();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload aset gagal.";
      setStatus(message);
      notifyAdmin(message, "error");
    }
  }

  async function remove(asset: MediaAsset) {
    if (!window.confirm(`Hapus aset "${asset.original_name}" dari Storage?`)) return;
    setDeleting(asset.id);
    try {
      const response = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: asset.storage_path }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      setStatus("Aset berhasil dihapus dari Storage.");
      notifyAdmin("Aset berhasil dihapus dari Storage.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Aset gagal dihapus.";
      setStatus(message);
      notifyAdmin(message, "error");
    } finally {
      setDeleting("");
    }
  }

  return <div className="space-y-7">
    <div>
      <p className="section-kicker">Pustaka media</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">Aset visual sekolah.</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-ink/55">Simpan logo, banner, dan gambar latar di satu tempat. Preview akan tampil setelah upload dan aset dapat dihapus langsung dari Storage.</p>
    </div>
    <div className="rounded-[1.5rem] border border-dashed border-moss/40 bg-mist p-6 text-center sm:p-10">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-moss shadow-sm"><UploadCloud size={22} /></span>
      <h2 className="mt-4 font-bold">Unggah aset baru</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/55">PNG, JPG, WebP, atau SVG - maksimal 5 MB. Gambar akan diproses untuk tampilan responsif.</p>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(event) => choose(event.target.files?.[0] ?? null)} />
      <button onClick={() => input.current?.click()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-moss px-4 text-sm font-bold text-white hover:brightness-110"><ImagePlus size={17} /> Pilih file</button>
      {file && <div className="mx-auto mt-5 flex max-w-md items-center gap-3 rounded-xl bg-white p-3 text-left">
        <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-paper"><Image src={preview} alt="Pratinjau aset" fill sizes="48px" unoptimized className="object-cover" /></div>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{file.name}</span>
        <button onClick={upload} className="min-h-10 rounded-lg bg-clay px-3 text-xs font-bold text-white">Simpan</button>
      </div>}
      {status && <p role="status" className="mt-4 text-sm font-semibold text-ink/70">{status}</p>}
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {loading ? <div className="col-span-full rounded-2xl border border-ink/10 bg-white p-8 text-center text-sm text-ink/50">Memuat pustaka media...</div> : assets.length ? assets.map((asset) => <Asset key={asset.id} asset={asset} deleting={deleting === asset.id} onDelete={() => remove(asset)} />) : <div className="col-span-full rounded-2xl border border-ink/10 bg-white p-8 text-center text-sm text-ink/50">Belum ada aset. Unggah gambar pertama untuk memulai.</div>}
    </div>
  </div>;
}

function Asset({ asset, deleting, onDelete }: { asset: MediaAsset; deleting: boolean; onDelete: () => void }) {
  return <article className="rounded-[1.25rem] border border-ink/10 bg-white p-4">
    <div className="relative aspect-[1.8/1] overflow-hidden rounded-xl bg-paper">
      <Image src={asset.url} alt={asset.alt_text || asset.original_name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" unoptimized className="object-contain" />
    </div>
    <div className="mt-4 flex items-start gap-3">
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{asset.original_name}</p><p className="mt-1 text-xs text-ink/45">{formatBytes(asset.file_size)} - {asset.mime_type}</p></div>
      <button onClick={onDelete} disabled={deleting} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50" aria-label={`Hapus ${asset.original_name}`}><Trash2 size={16} /></button>
    </div>
  </article>;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

