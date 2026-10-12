"use client";

import { Globe2, MapPin, MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { MicrositeConfig, SocialContact } from "@/types/microsite";
import { notifyAdmin } from "@/lib/admin-notify";

export function SettingsWorkspace({ initialConfig }: { initialConfig: MicrositeConfig }) {
  const [site, setSite] = useState(initialConfig.microsite);
  const [settings, setSettings] = useState(initialConfig.settings);
  const [contacts, setContacts] = useState(initialConfig.contacts);
  const [contactDraft, setContactDraft] = useState<SocialContact | null>(null);
  const [status, setStatus] = useState("");

  async function save() {
    const response = await fetch("/api/admin/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...site, latitude: Number(site.latitude), longitude: Number(site.longitude), contacts, settings }) });
    setStatus(response.ok ? "Informasi tersimpan sebagai draf." : "Gagal menyimpan. Periksa input dan koneksi Supabase."); notifyAdmin(response.ok ? "Informasi berhasil disimpan sebagai draf." : "Informasi gagal disimpan.", response.ok ? "success" : "error");
  }

  function startNewContact() {
    setContactDraft({ id: `contact-${Date.now()}`, label: "TikTok", value: "", href: "", icon: "tiktok", is_enabled: true });
    setStatus("");
  }

  function saveContactDraft() {
    if (!contactDraft?.label.trim() || !contactDraft.value.trim() || !isContactHref(contactDraft.href)) {
      setStatus("Isi nama, rincian akun, dan URL kanal yang valid.");
      return;
    }
    setContacts((current) => current.some((contact) => contact.id === contactDraft.id) ? current.map((contact) => contact.id === contactDraft.id ? contactDraft : contact) : [...current, contactDraft]);
    setContactDraft(null);
    setStatus("Perubahan kanal siap disimpan.");
  }

  function removeContact(contact: SocialContact) {
    if (!window.confirm(`Hapus kanal ${contact.label}?`)) return;
    setContacts((current) => current.filter((item) => item.id !== contact.id));
    if (contactDraft?.id === contact.id) setContactDraft(null);
    setStatus(`Kanal ${contact.label} dihapus dari draf.`);
  }

  return <div className="space-y-7">
    <div><p className="section-kicker">Tautan & kontak</p><h1 className="mt-2 font-display text-4xl tracking-tight">Informasi yang selalu aktual.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-ink/55">Perbarui alamat, koordinat peta, dan kanal resmi tanpa menyentuh kode program.</p></div>
    <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay/15 text-clay"><MapPin size={19} /></span><div><h2 className="font-bold">Identitas & lokasi</h2><p className="text-xs text-ink/45">Tampil di bagian atas microsite.</p></div></div>
        <div className="space-y-5"><Text label="Nama sekolah" value={site.title} onChange={(value) => setSite({ ...site, title: value })} /><div className="grid gap-4 sm:grid-cols-2"><Select label="Font nama sekolah" value={settings.site_title_font_family} onChange={(value) => setSettings({ ...settings, site_title_font_family: value as typeof settings.site_title_font_family })} options={[["poppins", "Poppins"], ["plus-jakarta", "Plus Jakarta Sans"], ["inter", "Inter"], ["dm-sans", "DM Sans"]]} /><Select label="Ketebalan nama sekolah" value={settings.site_title_text_weight} onChange={(value) => setSettings({ ...settings, site_title_text_weight: value as typeof settings.site_title_text_weight })} options={[["normal", "Tipis"], ["semibold", "Sedang"], ["bold", "Tebal"]]} /></div><Text label="Alamat" value={site.address} onChange={(value) => setSite({ ...site, address: value })} textarea /><Text label="URL Google Maps" value={site.maps_url} onChange={(value) => setSite({ ...site, maps_url: value })} /><div className="grid gap-4 sm:grid-cols-2"><Text label="Latitude" value={String(site.latitude)} onChange={(value) => setSite({ ...site, latitude: Number(value) })} /><Text label="Longitude" value={String(site.longitude)} onChange={(value) => setSite({ ...site, longitude: Number(value) })} /></div><p className="-mt-2 text-xs leading-5 text-ink/45">Marker memakai koordinat ini, jadi tetap berada di titik yang sama saat peta digeser.</p><Text label="Deskripsi singkat" value={site.description} onChange={(value) => setSite({ ...site, description: value })} textarea /></div>
        <button onClick={save} className="mt-6 min-h-11 rounded-xl bg-moss px-4 text-sm font-bold text-white">Simpan identitas</button>
      </section>
      <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-moss/10 text-moss"><MessageCircle size={19} /></span><div><h2 className="font-bold">Kanal kontak</h2><p className="text-xs text-ink/45">Kelola rincian Instagram, YouTube, TikTok, dan kanal lain.</p></div></div><button onClick={startNewContact} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-moss px-3 text-xs font-bold text-white transition hover:brightness-110"><Plus size={15} /> Tambah kanal</button></div>
        <div className="space-y-3">{contacts.map((contact) => <div key={contact.id} className="rounded-xl border border-ink/10 px-3 py-3"><div className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-moss"><Globe2 size={15} /></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-ink/45">{contact.label}</span><span className="block truncate text-sm font-semibold">{contact.value || contact.href}</span></span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${contact.is_enabled ? "bg-moss/10 text-moss" : "bg-ink/5 text-ink/45"}`}>{contact.is_enabled ? "Aktif" : "Nonaktif"}</span><button onClick={() => setContactDraft(contact)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink/10 text-ink/55 hover:border-moss hover:text-moss" aria-label={`Edit ${contact.label}`}><Pencil size={15} /></button><button onClick={() => removeContact(contact)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50" aria-label={`Hapus ${contact.label}`}><Trash2 size={15} /></button></div><p className="mt-2 truncate pl-11 text-xs text-ink/45">{contact.href}</p></div>)}</div>
        {contactDraft && <div className="mt-4 space-y-4 rounded-xl bg-mist p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold">{contacts.some((contact) => contact.id === contactDraft.id) ? "Edit kanal" : "Tambah kanal"}</p><p className="mt-1 text-xs text-ink/45">Rincian ini tampil saat label dan nilai diaktifkan pada komponen kontak.</p></div><button onClick={() => setContactDraft(null)} className="min-h-10 rounded-lg px-3 text-xs font-bold text-ink/55 hover:bg-white">Batal</button></div><div className="grid gap-4 sm:grid-cols-2"><Text label="Nama kanal" value={contactDraft.label} onChange={(value) => setContactDraft({ ...contactDraft, label: value })} /><Select label="Ikon" value={contactDraft.icon} onChange={(value) => setContactDraft({ ...contactDraft, icon: value as SocialContact["icon"] })} options={[["instagram", "Instagram"], ["youtube", "YouTube"], ["tiktok", "TikTok"], ["mail", "Email"], ["whatsapp", "WhatsApp"], ["phone", "Telepon"], ["globe", "Website"]]} /><Text label="Rincian akun" value={contactDraft.value} onChange={(value) => setContactDraft({ ...contactDraft, value: value })} /><Text label="URL kanal" value={contactDraft.href} onChange={(value) => setContactDraft({ ...contactDraft, href: value })} /><label className="flex min-h-11 items-center gap-3 sm:col-span-2"><input type="checkbox" checked={contactDraft.is_enabled} onChange={(event) => setContactDraft({ ...contactDraft, is_enabled: event.target.checked })} className="h-4 w-4 accent-[#2F6B55]" /><span className="text-sm font-bold">Tampilkan kanal di microsite</span></label></div><button onClick={saveContactDraft} className="min-h-11 rounded-lg bg-moss px-4 text-xs font-bold text-white">Simpan perubahan kanal</button></div>}
        <button onClick={save} className="mt-6 min-h-11 rounded-xl border border-moss px-4 text-sm font-bold text-moss">Simpan kanal</button>
      </section>
    </div>
    {status && <p role="status" className="rounded-xl bg-mist px-4 py-3 text-sm font-semibold text-ink/70">{status}</p>}
  </div>;
}

function Text({ label, value, onChange, textarea }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-ink/55">{label}</span>{textarea ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full resize-y rounded-lg border border-ink/10 bg-paper/50 px-3 py-3 text-sm leading-6 outline-none focus:border-moss focus:ring-4 focus:ring-moss/10" /> : <input value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-ink/10 bg-paper/50 px-3 text-sm outline-none focus:border-moss focus:ring-4 focus:ring-moss/10" />}</label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-ink/55">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-ink/10 bg-paper/50 px-3 text-sm font-semibold outline-none focus:border-moss focus:ring-4 focus:ring-moss/10">{options.map(([option, labelText]) => <option key={option} value={option}>{labelText}</option>)}</select></label>;
}

function isContactHref(value: string) {
  return /^(https?:\/\/|mailto:|tel:)/i.test(value.trim());
}


