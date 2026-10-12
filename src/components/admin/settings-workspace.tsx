"use client";

import { Globe2, MapPin, MessageCircle } from "lucide-react";
import { useState } from "react";
import type { MicrositeConfig } from "@/types/microsite";
import { notifyAdmin } from "@/lib/admin-notify";

export function SettingsWorkspace({ initialConfig }: { initialConfig: MicrositeConfig }) {
  const [site, setSite] = useState(initialConfig.microsite);
  const [contacts, setContacts] = useState(initialConfig.contacts);
  const [status, setStatus] = useState("");

  async function save() {
    const response = await fetch("/api/admin/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...site, latitude: Number(site.latitude), longitude: Number(site.longitude), contacts }) });
    setStatus(response.ok ? "Informasi tersimpan sebagai draf." : "Gagal menyimpan. Periksa input dan koneksi Supabase."); notifyAdmin(response.ok ? "Informasi berhasil disimpan sebagai draf." : "Informasi gagal disimpan.", response.ok ? "success" : "error");
  }

  return <div className="space-y-7">
    <div><p className="section-kicker">Tautan & kontak</p><h1 className="mt-2 font-display text-4xl tracking-tight">Informasi yang selalu aktual.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-ink/55">Perbarui alamat, koordinat peta, dan kanal resmi tanpa menyentuh kode program.</p></div>
    <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay/15 text-clay"><MapPin size={19} /></span><div><h2 className="font-bold">Identitas & lokasi</h2><p className="text-xs text-ink/45">Tampil di bagian atas microsite.</p></div></div>
        <div className="space-y-5"><Text label="Nama sekolah" value={site.title} onChange={(value) => setSite({ ...site, title: value })} /><Text label="Alamat" value={site.address} onChange={(value) => setSite({ ...site, address: value })} textarea /><Text label="URL Google Maps" value={site.maps_url} onChange={(value) => setSite({ ...site, maps_url: value })} /><div className="grid gap-4 sm:grid-cols-2"><Text label="Latitude" value={String(site.latitude)} onChange={(value) => setSite({ ...site, latitude: Number(value) })} /><Text label="Longitude" value={String(site.longitude)} onChange={(value) => setSite({ ...site, longitude: Number(value) })} /></div><p className="-mt-2 text-xs leading-5 text-ink/45">Marker memakai koordinat ini, jadi tetap berada di titik yang sama saat peta digeser.</p><Text label="Deskripsi singkat" value={site.description} onChange={(value) => setSite({ ...site, description: value })} textarea /></div>
        <button onClick={save} className="mt-6 min-h-11 rounded-xl bg-moss px-4 text-sm font-bold text-white">Simpan identitas</button>
      </section>
      <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-moss/10 text-moss"><MessageCircle size={19} /></span><div><h2 className="font-bold">Kanal kontak</h2><p className="text-xs text-ink/45">Ikon kosong tidak akan ditampilkan.</p></div></div>
        <div className="space-y-3">{contacts.map((contact) => <label key={contact.id} className="flex min-h-14 items-center gap-3 rounded-xl border border-ink/10 px-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink/5 text-moss"><Globe2 size={15} /></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-ink/45">{contact.label}</span><input value={contact.href} onChange={(event) => setContacts((current) => current.map((item) => item.id === contact.id ? { ...item, href: event.target.value } : item))} className="w-full truncate bg-transparent text-sm font-semibold outline-none" aria-label={`URL ${contact.label}`} /></span><input type="checkbox" checked={contact.is_enabled} onChange={(event) => setContacts((current) => current.map((item) => item.id === contact.id ? { ...item, is_enabled: event.target.checked } : item))} className="h-4 w-4 accent-[#2F6B55]" aria-label={`Aktifkan ${contact.label}`} /></label>)}</div>
        <button onClick={save} className="mt-6 min-h-11 rounded-xl border border-moss px-4 text-sm font-bold text-moss">Simpan kanal</button>
      </section>
    </div>
    {status && <p role="status" className="rounded-xl bg-mist px-4 py-3 text-sm font-semibold text-ink/70">{status}</p>}
  </div>;
}

function Text({ label, value, onChange, textarea }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-ink/55">{label}</span>{textarea ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full resize-y rounded-lg border border-ink/10 bg-paper/50 px-3 py-3 text-sm leading-6 outline-none focus:border-moss focus:ring-4 focus:ring-moss/10" /> : <input value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-ink/10 bg-paper/50 px-3 text-sm outline-none focus:border-moss focus:ring-4 focus:ring-moss/10" />}</label>;
}


