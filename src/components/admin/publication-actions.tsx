"use client";

import Link from "next/link";
import { Clock3, ExternalLink, Send } from "lucide-react";
import { useState } from "react";
import { notifyAdmin } from "@/lib/admin-notify";
import type { MicrositeConfig } from "@/types/microsite";

export function PublicationActions({ config }: { config: MicrositeConfig }) { const [status, setStatus] = useState("");
  async function publish() { setStatus("Menerbitkan..."); const response = await fetch("/api/admin/publish", { method: "POST" }); setStatus(response.ok ? "Perubahan berhasil diterbitkan." : "Publikasi gagal. Periksa sesi admin dan Supabase."); notifyAdmin(response.ok ? "Perubahan berhasil dipublikasikan." : "Publikasi gagal.", response.ok ? "success" : "error"); }
  async function save() { setStatus("Draf aman tersimpan."); }
  return <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 sm:p-7"><div className="flex flex-col justify-between gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /><span className="text-sm font-bold">Microsite aktif</span></div><p className="mt-2 text-xs text-ink/45">Versi publik terakhir: {config.microsite.last_published_at ? new Date(config.microsite.last_published_at).toLocaleString("id-ID") : "Belum ada snapshot"}</p></div><Link href="/" target="_blank" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink/15 px-4 text-sm font-bold hover:border-moss hover:text-moss">Lihat publik <ExternalLink size={16} /></Link></div><div className="mt-6 rounded-2xl bg-mist p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-clay"><Clock3 size={18} /></span><div><p className="text-sm font-bold">Draf siap ditinjau</p><p className="mt-1 text-sm leading-6 text-ink/55">Periksa pratinjau sebelum perubahan ini menggantikan versi publik.</p></div></div><div className="mt-5 flex flex-wrap gap-3"><Link href="/admin/editor" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-moss px-4 text-sm font-bold text-white">Periksa draf <Send size={15} /></Link><button onClick={publish} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-moss px-4 text-sm font-bold text-moss">Publikasikan</button><button onClick={save} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink/15 px-4 text-sm font-bold">Simpan saja</button></div>{status && <p role="status" className="mt-4 text-sm font-semibold text-ink/70">{status}</p>}</div></section>; }




