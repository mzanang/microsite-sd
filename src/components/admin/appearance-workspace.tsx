"use client";

import { Check, Palette, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { MicrositeConfig } from "@/types/microsite";
import { notifyAdmin } from "@/lib/admin-notify";
import { QuickPublishButton } from "@/components/admin/quick-publish-button";

const presets = [
  { name: "Kebun sekolah", colors: ["#2F6B55", "#D7864A", "#F6F3EC"], primary_color: "#2F6B55", accent_color: "#D7864A", page_background: "#F6F3EC" },
  { name: "Pagi cerah", colors: ["#2563A6", "#E9A23B", "#F6F4EC"], primary_color: "#2563A6", accent_color: "#E9A23B", page_background: "#F6F4EC" },
  { name: "Buku tulis", colors: ["#583E73", "#CF6B5C", "#F7F1EA"], primary_color: "#583E73", accent_color: "#CF6B5C", page_background: "#F7F1EA" },
];

export function AppearanceWorkspace({ initialConfig }: { initialConfig: MicrositeConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const [status, setStatus] = useState("");
  const sectionOptions = config.components.filter((component) => component.type === "service_links" || component.type === "location" || component.type === "contact");
  const [selectedSectionId, setSelectedSectionId] = useState(() => initialConfig.components.find((component) => component.type === "contact")?.id ?? initialConfig.components[0]?.id ?? "");
  const selectedSection = config.components.find((component) => component.id === selectedSectionId) ?? sectionOptions[0];
  const sectionValues = selectedSection?.config ?? {};
  const setSection = (key: string, value: unknown) => {
    if (!selectedSection) return;
    setConfig((current) => ({ ...current, components: current.components.map((component) => component.id === selectedSection.id ? { ...component, config: { ...(component.config ?? {}), [key]: value } } : component) }));
    setStatus("");
  };
  const setSectionTitle = (value: string) => {
    if (!selectedSection) return;
    setConfig((current) => ({ ...current, components: current.components.map((component) => component.id === selectedSection.id ? { ...component, title: value } : component) }));
    setStatus("");
  };
  const set = (key: string, value: string | number) => {
    setConfig((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
    setStatus("");
  };

  async function save() {
    const response = await fetch("/api/admin/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(config) });
    setStatus(response.ok ? "Tampilan tersimpan sebagai draf." : "Gagal menyimpan tampilan."); notifyAdmin(response.ok ? "Tampilan berhasil disimpan sebagai draf." : "Tampilan gagal disimpan.", response.ok ? "success" : "error");
  }

  return <div className="space-y-7">
    <div><p className="section-kicker">Pengaturan tampilan</p><h1 className="mt-2 font-display text-4xl tracking-tight">Beri wajah pada informasi.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-ink/55">Atur warna, bentuk, ukuran, dan tipografi kartu agar sesuai dengan identitas sekolah.</p></div>
    <div className="space-y-6">
        <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 sm:p-7">
          <div className="mb-7 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-moss/10 text-moss"><Palette size={19} /></span><div><h2 className="font-bold">Preset identitas</h2><p className="text-xs text-ink/45">Pilih fondasi, lalu sesuaikan seperlunya.</p></div></div>
          <div className="grid gap-3 sm:grid-cols-3">{presets.map((preset) => <button key={preset.name} onClick={() => setConfig((current) => ({ ...current, settings: { ...current.settings, primary_color: preset.primary_color, accent_color: preset.accent_color, page_background: preset.page_background } }))} className={`rounded-2xl border p-3 text-left ${config.settings.primary_color === preset.primary_color ? "border-moss ring-2 ring-moss/15" : "border-ink/10"}`}><div className="flex h-14 gap-1 overflow-hidden rounded-xl">{preset.colors.map((color) => <span key={color} className="flex-1" style={{ background: color }} />)}</div><div className="mt-3 flex items-center justify-between"><span className="text-sm font-bold">{preset.name}</span>{config.settings.primary_color === preset.primary_color && <Check size={16} className="text-moss" />}</div></button>)}</div>
        </section>
        <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 sm:p-7">
          <div className="mb-6"><p className="section-kicker">Judul section</p><h2 className="mt-2 font-display text-2xl">Judul dan deskripsi</h2><p className="mt-2 text-sm leading-6 text-ink/55">Atur teks section dan seluruh gaya tipografinya dari satu tempat.</p></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Select label="Section" value={selectedSection?.id ?? ""} onChange={setSelectedSectionId} options={sectionOptions.map((section) => [section.id, section.type === "contact" ? "Terhubung bersama kami" : section.type === "location" ? "Peta lokasi" : "Komponen / Link"])} />
            <Field label="Judul section" value={selectedSection?.title ?? ""} onChange={setSectionTitle} />
            <div className="sm:col-span-2"><TextArea label="Deskripsi section" value={String(sectionValues.description ?? "")} onChange={(value) => setSection("description", value)} /></div>
            <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={sectionValues.show_title === undefined ? selectedSection?.type !== "service_links" : Boolean(sectionValues.show_title)} onChange={(event) => setSection("show_title", event.target.checked)} className="h-4 w-4 accent-[#2F6B55]" /><span className="text-sm font-bold">Tampilkan judul</span></label>
            <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={sectionValues.show_description !== false} onChange={(event) => setSection("show_description", event.target.checked)} className="h-4 w-4 accent-[#2F6B55]" /><span className="text-sm font-bold">Tampilkan deskripsi</span></label>
            <Select label="Perataan" value={String(sectionValues.align ?? "center")} onChange={(value) => setSection("align", value)} options={[["left", "Kiri"], ["center", "Tengah"], ["right", "Kanan"]]} />
            <Select label="Font judul" value={String(sectionValues.title_font_family ?? "poppins")} onChange={(value) => setSection("title_font_family", value)} options={[["poppins", "Poppins"], ["plus-jakarta", "Plus Jakarta Sans"], ["inter", "Inter"], ["dm-sans", "DM Sans"]]} />
            <Select label="Ukuran judul" value={String(sectionValues.title_size ?? "large")} onChange={(value) => setSection("title_size", value)} options={[["small", "Kecil"], ["medium", "Sedang"], ["large", "Besar"]]} />
            <Select label="Ketebalan judul" value={String(sectionValues.title_weight ?? "bold")} onChange={(value) => setSection("title_weight", value)} options={[["normal", "Tipis"], ["semibold", "Sedang"], ["bold", "Tebal"]]} />
            <ColorField label="Warna judul" value={String(sectionValues.title_color ?? config.settings.primary_color)} onChange={(value) => setSection("title_color", value)} />
            <Select label="Font deskripsi" value={String(sectionValues.description_font_family ?? "poppins")} onChange={(value) => setSection("description_font_family", value)} options={[["poppins", "Poppins"], ["plus-jakarta", "Plus Jakarta Sans"], ["inter", "Inter"], ["dm-sans", "DM Sans"]]} />
            <Select label="Ukuran deskripsi" value={String(sectionValues.description_size ?? "medium")} onChange={(value) => setSection("description_size", value)} options={[["small", "Kecil"], ["medium", "Sedang"], ["large", "Besar"]]} />
            <Select label="Ketebalan deskripsi" value={String(sectionValues.description_weight ?? "normal")} onChange={(value) => setSection("description_weight", value)} options={[["normal", "Tipis"], ["semibold", "Sedang"], ["bold", "Tebal"]]} />
            <ColorField label="Warna deskripsi" value={String(sectionValues.description_color ?? config.settings.card_muted_color)} onChange={(value) => setSection("description_color", value)} />
          </div>
        </section>
        <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 sm:p-7">
          <div className="mb-6"><p className="section-kicker">Gaya kartu</p><h2 className="mt-2 font-display text-2xl">Kartu komponen</h2><p className="mt-2 text-sm leading-6 text-ink/55">Pengaturan ini dipakai pada link, kontak, teks, dan komponen lain.</p></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <ColorField label="Warna latar kartu" value={config.settings.card_background} onChange={(value) => set("card_background", value)} />
            <ColorField label="Warna teks utama" value={config.settings.card_text_color} onChange={(value) => set("card_text_color", value)} />
            <ColorField label="Warna teks sekunder" value={config.settings.card_muted_color} onChange={(value) => set("card_muted_color", value)} />
            <ColorField label="Warna garis kartu" value={config.settings.card_border_color} onChange={(value) => set("card_border_color", value)} />
            <Select label="Bentuk kartu" value={config.settings.card_radius} onChange={(value) => set("card_radius", value)} options={[["soft", "Rounded"], ["round", "Bubble"], ["sharp", "Kotak"]]} />
            <Select label="Gaya kartu" value={config.settings.card_style} onChange={(value) => set("card_style", value)} options={[["solid", "Solid"], ["outline", "Outline"], ["tinted", "Berwarna tema"]]} />
            <Select label="Icon dengan card" value={config.settings.icon_card_mode} onChange={(value) => set("icon_card_mode", value)} options={[["separate", "Pisah dari card"], ["integrated", "Gabung dengan card"]]} />
            <Select label="Font halaman" value={config.settings.font_family} onChange={(value) => set("font_family", value)} options={[["poppins", "Poppins"], ["plus-jakarta", "Plus Jakarta Sans"], ["inter", "Inter"], ["dm-sans", "DM Sans"]]} />
            <Select label="Bayangan kartu" value={config.settings.card_shadow} onChange={(value) => set("card_shadow", value)} options={[["none", "Tanpa bayangan"], ["soft", "Lembut"], ["strong", "Tegas"]]} />
            <Select label="Font kartu" value={config.settings.card_font_family} onChange={(value) => set("card_font_family", value)} options={[["poppins", "Poppins"], ["plus-jakarta", "Plus Jakarta Sans"], ["inter", "Inter"], ["dm-sans", "DM Sans"]]} />
            <Select label="Ketebalan judul" value={config.settings.card_text_weight} onChange={(value) => set("card_text_weight", value)} options={[["normal", "Normal"], ["semibold", "Semi tebal"], ["bold", "Tebal"]]} />
            <Select label="Ukuran judul" value={config.settings.card_title_size} onChange={(value) => set("card_title_size", value)} options={[["small", "Kecil"], ["medium", "Sedang"], ["large", "Besar"]]} />
            <Select label="Ukuran deskripsi kartu" value={config.settings.card_body_size} onChange={(value) => set("card_body_size", value)} options={[["small", "Kecil"], ["medium", "Sedang"], ["large", "Besar"]]} />
            <Select label="Font teks pengantar" value={config.settings.intro_font_family} onChange={(value) => set("intro_font_family", value)} options={[["poppins", "Poppins"], ["plus-jakarta", "Plus Jakarta Sans"], ["inter", "Inter"], ["dm-sans", "DM Sans"]]} />
            <Select label="Ukuran teks pengantar" value={config.settings.intro_text_size} onChange={(value) => set("intro_text_size", value)} options={[["small", "Kecil"], ["medium", "Sedang"], ["large", "Besar"]]} />
            <Select label="Ketebalan teks pengantar" value={config.settings.intro_text_weight} onChange={(value) => set("intro_text_weight", value)} options={[["normal", "Normal"], ["semibold", "Semi tebal"], ["bold", "Tebal"]]} />
            <ColorField label="Warna teks pengantar" value={config.settings.intro_text_color} onChange={(value) => set("intro_text_color", value)} />
            <ColorField label="Warna utama halaman" value={config.settings.primary_color} onChange={(value) => set("primary_color", value)} />
            <ColorField label="Warna teks halaman" value={config.settings.text_color} onChange={(value) => set("text_color", value)} />
            <ColorField label="Warna aksen halaman" value={config.settings.accent_color} onChange={(value) => set("accent_color", value)} />
            <Select label="Lebar konten" value={config.settings.content_width} onChange={(value) => set("content_width", value)} options={[["narrow", "Sempit"], ["standard", "Standar"], ["wide", "Lebar"]]} />
            <Select label="Jarak antar elemen" value={config.settings.element_spacing} onChange={(value) => set("element_spacing", value)} options={[["compact", "Rapat"], ["comfortable", "Nyaman"], ["airy", "Lapang"]]} />
            <Select label="Posisi latar hero" value={config.settings.background_position} onChange={(value) => set("background_position", value)} options={[["center", "Tengah"], ["top", "Atas"], ["bottom", "Bawah"]]} />
            <Select label="Posisi logo profil hero" value={config.settings.hero_profile_position} onChange={(value) => set("hero_profile_position", value)} options={[["bottom", "Di garis bawah hero"], ["center", "Di tengah hero"], ["outside", "Di luar hero"]]} />
            <RangeField label="Kegelapan overlay hero" value={config.settings.overlay_opacity} onChange={(value) => set("overlay_opacity", value)} />
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-mist p-4"><div className="flex items-center gap-3"><SlidersHorizontal size={17} className="text-moss" /><p className="text-sm font-semibold">{status || "Perubahan disimpan sebagai draf."}</p></div><div className="flex flex-wrap gap-2"><button onClick={save} className="min-h-10 rounded-lg bg-moss px-4 text-xs font-bold text-white">Simpan tampilan</button><QuickPublishButton config={config} /></div></div>
        </section>
    </div>
  </div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-2 block text-xs font-bold text-ink/55">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-ink/10 bg-paper/50 px-3 text-sm font-semibold outline-none focus:border-moss" /></label>; }
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-2 block text-xs font-bold text-ink/55">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full resize-y rounded-lg border border-ink/10 bg-paper/50 px-3 py-2 text-sm leading-6 outline-none focus:border-moss" /></label>; }
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-2 block text-xs font-bold text-ink/55">{label}</span><div className="flex h-11 items-center gap-3 rounded-lg border border-ink/10 bg-paper/50 px-3"><input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-7 w-7 cursor-pointer rounded-md border-0 bg-transparent p-0" /><span className="text-sm font-semibold">{value}</span></div></label>; }
function RangeField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="block"><span className="mb-2 block text-xs font-bold text-ink/55">{label}</span><div className="flex h-11 items-center gap-3 rounded-lg border border-ink/10 bg-paper/50 px-3"><input type="range" min="0.04" max="0.8" step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[#2F6B55]" /><span className="w-12 text-right text-sm font-semibold">{Math.round(value * 100)}%</span></div></label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) { return <label className="block"><span className="mb-2 block text-xs font-bold text-ink/55">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-ink/10 bg-paper/50 px-3 text-sm font-semibold outline-none focus:border-moss">{options.map(([option, labelText]) => <option key={option} value={option}>{labelText}</option>)}</select></label>; }








