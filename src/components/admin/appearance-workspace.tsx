"use client";

import { Check, Clock3, Palette, SlidersHorizontal, Sparkles } from "lucide-react";
import { useState } from "react";
import type { CSSProperties } from "react";
import type { MicrositeConfig } from "@/types/microsite";
import { defaultConfig } from "@/lib/default-config";
import { notifyAdmin } from "@/lib/admin-notify";
import { QuickPublishButton } from "@/components/admin/quick-publish-button";

const presets = [
  { name: "Pagi cerah", colors: ["#2563A6", "#E9A23B", "#F6F4EC"], primary_color: "#2563A6", accent_color: "#E9A23B", page_background: "#F6F4EC" },
  { name: "Buku tulis", colors: ["#583E73", "#CF6B5C", "#F7F1EA"], primary_color: "#583E73", accent_color: "#CF6B5C", page_background: "#F7F1EA" },
  { name: "Laut teduh", colors: ["#0F6674", "#E08B57", "#EEF7F4"], primary_color: "#0F6674", accent_color: "#E08B57", page_background: "#EEF7F4" },
  { name: "Langit senja", colors: ["#4C3B75", "#D85D68", "#FBF1F0"], primary_color: "#4C3B75", accent_color: "#D85D68", page_background: "#FBF1F0" },
  { name: "Kapur putih", colors: ["#364152", "#B7791F", "#F7F5EF"], primary_color: "#364152", accent_color: "#B7791F", page_background: "#F7F5EF" },
  { name: "Daun muda", colors: ["#386641", "#BC6C25", "#F4F7E9"], primary_color: "#386641", accent_color: "#BC6C25", page_background: "#F4F7E9" },
  { name: "Merah bata", colors: ["#8F2D26", "#D99A2B", "#FFF5E8"], primary_color: "#8F2D26", accent_color: "#D99A2B", page_background: "#FFF5E8" },
];

const defaultTheme = defaultConfig.settings;

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
  const set = (key: string, value: unknown) => {
    setConfig((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
    setStatus("");
  };
  const setTimeSizePreset = (value: string) => {
    const preset = value as MicrositeConfig["settings"]["time_size"];
    const pixels = preset === "small" ? 14 : preset === "large" ? 28 : 18;
    setConfig((current) => ({ ...current, settings: { ...current.settings, time_size: preset, time_size_custom: pixels } }));
    setStatus("");
  };
  const setTimeSizeCustom = (value: number) => {
    const preset = value <= 16 ? "small" : value >= 25 ? "large" : "medium";
    setConfig((current) => ({ ...current, settings: { ...current.settings, time_size: preset, time_size_custom: value } }));
    setStatus("");
  };

  async function save() {
    const response = await fetch("/api/admin/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(config) });
    setStatus(response.ok ? "Tampilan tersimpan sebagai draf." : "Gagal menyimpan tampilan."); notifyAdmin(response.ok ? "Tampilan berhasil disimpan sebagai draf." : "Tampilan gagal disimpan.", response.ok ? "success" : "error");
  }

  return <div className="space-y-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="section-kicker">Pengaturan tampilan</p><h1 className="mt-2 font-display text-4xl tracking-tight">Beri wajah pada informasi.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-ink/55">Atur warna, bentuk, ukuran, dan tipografi kartu agar sesuai dengan identitas sekolah.</p></div><div className="flex flex-col items-stretch gap-2 sm:items-end"><div className="flex items-center justify-end gap-2 text-sm font-semibold text-ink/65"><SlidersHorizontal size={17} className="shrink-0 text-moss" /><p>{status || "Perubahan disimpan sebagai draf."}</p></div><div className="flex flex-wrap justify-end gap-2"><button onClick={save} className="min-h-10 rounded-lg bg-moss px-4 text-xs font-bold text-white">Simpan tampilan</button><QuickPublishButton config={config} /></div></div></div>
    <div className="space-y-6">
        <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 sm:p-7">
          <div className="mb-7 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-moss/10 text-moss"><Palette size={19} /></span><div><h2 className="font-bold">Preset identitas</h2><p className="text-xs text-ink/45">Pilih fondasi, lalu sesuaikan seperlunya.</p></div></div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4"><button onClick={() => setConfig((current) => ({ ...current, settings: { ...current.settings, ...defaultTheme } }))} className={`rounded-2xl border p-3 text-left ${config.settings.primary_color === defaultTheme.primary_color && config.settings.background_animation === defaultTheme.background_animation ? "border-moss ring-2 ring-moss/15" : "border-ink/10"}`}><div className="flex h-14 gap-1 overflow-hidden rounded-xl"><span className="flex-1" style={{ background: defaultTheme.primary_color }} /><span className="flex-1" style={{ background: defaultTheme.accent_color }} /><span className="flex-1" style={{ background: defaultTheme.page_background }} /></div><div className="mt-3 flex items-center justify-between"><span className="text-sm font-bold">Default sekolah</span>{config.settings.primary_color === defaultTheme.primary_color && config.settings.background_animation === defaultTheme.background_animation && <Check size={16} className="text-moss" />}</div></button>{presets.map((preset) => <button key={preset.name} onClick={() => setConfig((current) => ({ ...current, settings: { ...current.settings, primary_color: preset.primary_color, accent_color: preset.accent_color, page_background: preset.page_background } }))} className={`rounded-2xl border p-3 text-left ${config.settings.primary_color === preset.primary_color ? "border-moss ring-2 ring-moss/15" : "border-ink/10"}`}><div className="flex h-14 gap-1 overflow-hidden rounded-xl">{preset.colors.map((color) => <span key={color} className="flex-1" style={{ background: color }} />)}</div><div className="mt-3 flex items-center justify-between"><span className="text-sm font-bold">{preset.name}</span>{config.settings.primary_color === preset.primary_color && <Check size={16} className="text-moss" />}</div></button>)}</div>
        </section>
        <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 sm:p-7">
          <div className="mb-6 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-moss/10 text-moss"><Sparkles size={19} /></span><div><p className="section-kicker">Background publik</p><h2 className="mt-2 font-display text-2xl">Animasi latar</h2><p className="mt-2 text-sm leading-6 text-ink/55">Tambahkan gerakan ringan pada latar halaman publik. Animasi tetap menghormati pengaturan reduced motion browser.</p></div></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Select label="Model animasi" value={config.settings.background_animation} onChange={(value) => set("background_animation", value)} options={[["none", "Tanpa animasi"], ["float", "Bola mengambang"], ["aurora", "Aurora lembut"], ["gradient", "Gradasi bergerak"], ["particles", "Partikel halus"], ["clouds", "Awan cloud"], ["rain", "Rintik hujan"], ["shimmer", "Kilau shiny"], ["waves", "Efek ombak"], ["snow", "Hujan salju"]]} />
            <Select label="Warna animasi" value={config.settings.background_animation_color_mode} onChange={(value) => set("background_animation_color_mode", value)} options={[["primary", "Warna utama"], ["accent", "Warna aksen"], ["custom", "Warna khusus"]]} />
            {config.settings.background_animation_color_mode === "custom" && <ColorField label="Warna khusus animasi" value={config.settings.background_animation_color} onChange={(value) => set("background_animation_color", value)} />}
            <Select label="Kecepatan" value={config.settings.background_animation_speed} onChange={(value) => set("background_animation_speed", value)} options={[["slow", "Lambat"], ["medium", "Sedang"], ["fast", "Cepat"]]} />
            <RangeField label="Banyaknya elemen" value={config.settings.background_animation_count} min={4} max={24} step={1} onChange={(value) => set("background_animation_count", value)} />
            <RangeField label="Opasitas animasi" value={config.settings.background_animation_opacity} min={0} max={1} step={0.05} onChange={(value) => set("background_animation_opacity", value)} />
          </div>
          <BackgroundPreview settings={config.settings} />
        </section>
        <div className="grid items-start gap-6 xl:grid-cols-2">
        <div className="min-w-0 space-y-6">
        <section className="min-w-0 rounded-[1.5rem] border border-ink/10 bg-white p-5 sm:p-7">
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
         <section className="min-w-0 rounded-[1.5rem] border border-ink/10 bg-white p-5 sm:p-7">
           <div className="mb-6 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2563A6]/10 text-[#2563A6]"><Clock3 size={19} /></span><div><p className="section-kicker">Waktu realtime</p><h2 className="mt-2 font-display text-2xl">Gaya jam dan tanggal</h2><p className="mt-2 text-sm leading-6 text-ink/55">Atur informasi waktu yang tampil di bawah identitas sekolah.</p></div></div>
           <div className="grid gap-5 sm:grid-cols-2">
             <Select label="Gaya tanggal" value={config.settings.time_date_format} onChange={(value) => set("time_date_format", value)} options={[["long", "14 Oktober 2026"], ["short", "14 Okt 2026"], ["dd/mm/yyyy", "14/10/2026"], ["dd-mm-yyyy", "14-10-2026"], ["yyyy-mm-dd", "2026-10-14"]]} />
             <Select label="Format informasi" value={config.settings.time_format} onChange={(value) => set("time_format", value)} options={[["weekday-date-time", "Hari, tanggal · jam"], ["date-time", "Tanggal · jam"], ["weekday-time", "Hari · jam"], ["time-only", "Jam saja"]]} />
             <Select label="Tata letak" value={config.settings.time_layout} onChange={(value) => set("time_layout", value)} options={[["single", "Satu baris"], ["split", "Hari/tanggal kiri · jam kanan"]]} />
             <Select label="Pemisah" value={config.settings.time_separator} onChange={(value) => set("time_separator", value)} options={[["dot", "Titik tengah ·"], ["dash", "Garis panjang —"], ["slash", "Garis miring /"], ["line", "Garis vertikal"], ["none", "Tanpa pemisah"]]} />
             <Select label="Bentuk waktu" value={config.settings.time_style} onChange={(value) => set("time_style", value)} options={[["card", "Mengikuti gaya kartu"], ["pill", "Pill"], ["outline", "Outline"], ["minimal", "Minimal"]]} />
             <Select label="Gaya jam" value={config.settings.time_clock_style} onChange={(value) => set("time_clock_style", value)} options={[["digital", "Digital"], ["analog", "Analog"]]} />
             <Select label="Jenis font jam" value={config.settings.time_font_family} onChange={(value) => set("time_font_family", value)} options={[["poppins", "Poppins"], ["plus-jakarta", "Plus Jakarta Sans"], ["inter", "Inter"], ["dm-sans", "DM Sans"], ["digital", "Digital Mono"]]} />
             <Select label="Ukuran jam" value={config.settings.time_size} onChange={setTimeSizePreset} options={[["small", "Kecil"], ["medium", "Sedang"], ["large", "Besar"]]} />
             <RangeField label="Ukuran kustom (px)" value={config.settings.time_size_custom} min={12} max={48} step={1} onChange={setTimeSizeCustom} />
             <Select label="Kartu tanggal & jam" value={config.settings.time_card_mode} onChange={(value) => set("time_card_mode", value)} options={[["single", "Satu card"], ["separate", "Card terpisah"], ["none", "Tanpa card"]]} />
             <Select label="Peletakan" value={config.settings.time_position} onChange={(value) => set("time_position", value)} options={[["left", "Kiri"], ["center", "Tengah"], ["right", "Kanan"]]} />
             <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={config.settings.time_show_timezone} onChange={(event) => set("time_show_timezone", event.target.checked)} className="h-4 w-4 accent-[#2563A6]" /><span><span className="block text-sm font-bold">Tampilkan WIB</span><span className="block text-xs leading-5 text-ink/45">Tambahkan label zona waktu Asia/Jakarta.</span></span></label>
             <div className="sm:col-span-2"><p className="mb-2 text-xs font-bold text-ink/55">Pratinjau</p><div className={`flex min-h-14 items-center text-sm font-semibold ${config.settings.time_card_mode === "single" ? "bg-[#082b62] px-4 text-[#b8d7ff]" : "bg-transparent px-0 text-[#082b62]"} ${config.settings.time_layout === "split" ? "w-full" : config.settings.time_position === "left" ? "justify-start" : config.settings.time_position === "right" ? "justify-end" : "justify-center"} ${config.settings.time_card_mode === "single" && config.settings.time_style === "pill" ? "rounded-full" : config.settings.time_card_mode === "single" && config.settings.time_style === "minimal" ? "rounded-none border-b border-[#b8d7ff]/30" : config.settings.time_card_mode === "single" ? "rounded-xl" : ""}`}><TimePreview settings={config.settings} /></div></div>
           </div>
         </section>
         </div>
        <section className="min-w-0 rounded-[1.5rem] border border-ink/10 bg-white p-5 sm:p-7">
          <div className="mb-6"><p className="section-kicker">Gaya kartu</p><h2 className="mt-2 font-display text-2xl">Kartu komponen</h2><p className="mt-2 text-sm leading-6 text-ink/55">Pengaturan ini dipakai pada link, kontak, teks, dan komponen lain.</p></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <ColorField label="Warna latar kartu" value={config.settings.card_background} onChange={(value) => set("card_background", value)} />
            <ColorField label="Warna teks utama" value={config.settings.card_text_color} onChange={(value) => set("card_text_color", value)} />
            <ColorField label="Warna teks sekunder" value={config.settings.card_muted_color} onChange={(value) => set("card_muted_color", value)} />
            <ColorField label="Warna garis kartu" value={config.settings.card_border_color} onChange={(value) => set("card_border_color", value)} />
            <Select label="Bentuk kartu" value={config.settings.card_radius} onChange={(value) => set("card_radius", value)} options={[["soft", "Rounded"], ["round", "Bubble"], ["sharp", "Kotak"], ["pill", "Pill"], ["organic", "Organik"], ["square", "Tanpa radius"], ["circle", "Lingkaran"], ["diamond", "Diamond"], ["hexagon", "Hexagon"], ["squircle", "Squircle"]]} />
            <Select label="Gaya kartu" value={config.settings.card_style} onChange={(value) => set("card_style", value)} options={[["solid", "Solid"], ["outline", "Outline"], ["tinted", "Berwarna tema"], ["glass", "Glass"], ["elevated", "Elevated"], ["dashed", "Dashed"]]} />
            <Select label="Gaya tombol link" value={config.settings.button_style} onChange={(value) => set("button_style", value)} options={[["card", "Mengikuti kartu"], ["solid", "Solid"], ["outline", "Outline"], ["soft", "Soft"], ["ghost", "Ghost"], ["pill", "Pill"], ["glass", "Glass"], ["underline", "Underline"]]} />
            <Select label="Ukuran tombol link" value={config.settings.button_size} onChange={(value) => set("button_size", value)} options={[["small", "Kecil"], ["medium", "Sedang"], ["large", "Besar"]]} />
            <Select label="Warna tombol link" value={config.settings.button_color_mode} onChange={(value) => set("button_color_mode", value)} options={[["primary", "Warna utama"], ["accent", "Warna aksen"], ["custom", "Warna khusus"]]} />
            {config.settings.button_color_mode === "custom" && <ColorField label="Warna khusus tombol" value={config.settings.button_color} onChange={(value) => set("button_color", value)} />}
            <ColorField label="Warna teks tombol" value={config.settings.button_text_color} onChange={(value) => set("button_text_color", value)} />
            <Select label="Posisi ikon" value={config.settings.icon_card_mode} onChange={(value) => set("icon_card_mode", value)} options={[["separate", "Terpisah (sesuai pengaturan card)"], ["separate-card", "Terpisah + card ikon"], ["separate-icon", "Terpisah, ikon saja"], ["integrated", "Di dalam tombol"]]} />
            <Select label="Card ikon" value={config.settings.icon_background} onChange={(value) => set("icon_background", value)} options={[["card", "Dengan card"], ["none", "Tanpa card"]]} />
            <Select label="Bentuk ikon" value={config.settings.icon_shape} onChange={(value) => set("icon_shape", value)} options={[["square", "Kotak"], ["rounded", "Rounded"], ["circle", "Lingkaran"], ["pill", "Pill"], ["diamond", "Diamond"], ["hexagon", "Hexagon"], ["squircle", "Squircle"], ["bubble", "Bubble"], ["organic", "Organik"], ["none", "Tanpa radius"]]} />
            <Select label="Warna ikon" value={config.settings.icon_color_mode} onChange={(value) => set("icon_color_mode", value)} options={[["primary", "Warna utama"], ["accent", "Warna aksen"], ["custom", "Warna khusus"]]} />
            {config.settings.icon_color_mode === "custom" && <ColorField label="Warna khusus ikon" value={config.settings.icon_color} onChange={(value) => set("icon_color", value)} />}
            <Select label="Ukuran ikon" value={config.settings.icon_size} onChange={(value) => set("icon_size", value)} options={[["small", "Kecil"], ["medium", "Sedang"], ["large", "Besar"]]} />
            <Select label="Lebar panel ikon" value={config.settings.icon_panel_size} onChange={(value) => set("icon_panel_size", value)} options={[["compact", "Kompak"], ["balanced", "Seimbang"], ["wide", "Lebar"]]} />
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
        </section>
        </div>
    </div>
  </div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-2 block text-xs font-bold text-ink/55">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-ink/10 bg-paper/50 px-3 text-sm font-semibold outline-none focus:border-moss" /></label>; }
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-2 block text-xs font-bold text-ink/55">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full resize-y rounded-lg border border-ink/10 bg-paper/50 px-3 py-2 text-sm leading-6 outline-none focus:border-moss" /></label>; }
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-2 block text-xs font-bold text-ink/55">{label}</span><div className="flex h-11 items-center gap-3 rounded-lg border border-ink/10 bg-paper/50 px-3"><input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-7 w-7 cursor-pointer rounded-md border-0 bg-transparent p-0" /><span className="text-sm font-semibold">{value}</span></div></label>; }
function RangeField({ label, value, min = 0.04, max = 0.8, step = 0.01, onChange }: { label: string; value: number; min?: number; max?: number; step?: number; onChange: (value: number) => void }) { const safeValue = Number.isFinite(value) ? value : min; const isPercentage = max <= 1; return <label className="block"><span className="mb-2 block text-xs font-bold text-ink/55">{label}</span><div className="flex h-11 items-center gap-3 rounded-lg border border-ink/10 bg-paper/50 px-3"><input type="range" min={min} max={max} step={step} value={safeValue} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[#2F6B55]" /><span className="w-12 text-right text-sm font-semibold">{isPercentage ? `${Math.round(safeValue * 100)}%` : safeValue}</span></div></label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) { return <label className="block"><span className="mb-2 block text-xs font-bold text-ink/55">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-ink/10 bg-paper/50 px-3 text-sm font-semibold outline-none focus:border-moss">{options.map(([option, labelText]) => <option key={option} value={option}>{labelText}</option>)}</select></label>; }
function previewDateByStyle(settings: MicrositeConfig["settings"]) {
  if (settings.time_date_format === "short") return "13 Okt 2026";
  if (settings.time_date_format === "dd/mm/yyyy") return "13/10/2026";
  if (settings.time_date_format === "dd-mm-yyyy") return "13-10-2026";
  if (settings.time_date_format === "yyyy-mm-dd") return "2026-10-13";
  return "13 Oktober 2026";
}
function previewTimeLabel(settings: MicrositeConfig["settings"]) {
  const weekday = "Selasa";
  const date = previewDateByStyle(settings);
  const time = `19:30${settings.time_show_timezone ? " WIB" : ""}`;
  const separator = settings.time_separator === "dot" ? "·" : settings.time_separator === "dash" ? "—" : settings.time_separator === "slash" ? "/" : settings.time_separator === "line" ? "│" : "";
  const join = (left: string, right: string) => separator ? `${left} ${separator} ${right}` : `${left} ${right}`;
  const left = settings.time_format === "time-only" ? "Waktu sekarang" : settings.time_format === "weekday-time" ? weekday : settings.time_format === "date-time" ? date : `${weekday}, ${date}`;
  if (settings.time_layout === "split") return `${left}${separator ? ` ${separator} ` : " "}${time}`;
  if (settings.time_format === "time-only") return time;
  return `${join(left, time)}`;
}
const timePreviewFontMap: Record<MicrositeConfig["settings"]["time_font_family"], string> = { poppins: "var(--font-poppins), Arial, sans-serif", "plus-jakarta": "var(--font-plus-jakarta), Arial, sans-serif", inter: "var(--font-inter), Arial, sans-serif", "dm-sans": "var(--font-dm-sans), Arial, sans-serif", digital: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace" };
function AnalogClockPreview() {
  return <span className="realtime-analog-clock" style={{ "--clock-hour-angle": "225deg", "--clock-minute-angle": "180deg" } as CSSProperties} aria-label="Jam analog 19:30">{Array.from({ length: 12 }, (_, index) => <span key={index} className="realtime-analog-clock__tick" style={{ "--clock-index": index } as CSSProperties} />)}<span className="realtime-analog-clock__hand realtime-analog-clock__hand--hour" /><span className="realtime-analog-clock__hand realtime-analog-clock__hand--minute" /></span>;
}
function TimePreview({ settings }: { settings: MicrositeConfig["settings"] }) {
  const weekday = "Selasa";
  const date = previewDateByStyle(settings);
  const time = `19:30${settings.time_show_timezone ? " WIB" : ""}`;
  const separator = settings.time_separator === "dot" ? "·" : settings.time_separator === "dash" ? "—" : settings.time_separator === "slash" ? "/" : settings.time_separator === "line" ? "│" : "";
  const left = settings.time_format === "time-only" ? "Waktu sekarang" : settings.time_format === "weekday-time" ? weekday : settings.time_format === "date-time" ? date : `${weekday}, ${date}`;
  const clock = settings.time_clock_style === "analog" ? <span className="inline-flex items-center gap-2"><AnalogClockPreview />{settings.time_show_timezone && <span>WIB</span>}</span> : time;
  const legacySize = settings.time_size === "small" ? 14 : settings.time_size === "large" ? 28 : 18;
  const size = Math.max(12, Math.min(48, Number(settings.time_size_custom ?? legacySize)));
  const segmentClass = settings.time_layout === "split" && settings.time_card_mode === "separate" ? "rounded-xl bg-[#082b62] px-4 py-2 text-[#b8d7ff]" : "";
  const content = settings.time_layout === "split" ? <span className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,auto)] items-center gap-3 text-left"><span className={`min-w-0 truncate ${segmentClass}`}>{left}</span>{separator ? <span aria-hidden="true" className={settings.time_separator === "line" ? "h-5 w-px bg-current/30" : "text-current/55"}>{separator}</span> : <span aria-hidden="true" className="w-0" />}<span className={`shrink-0 text-right ${segmentClass}`}>{clock}</span></span> : settings.time_clock_style === "analog" ? <span className="inline-flex items-center gap-2"><AnalogClockPreview />{settings.time_show_timezone && <span>WIB</span>}</span> : previewTimeLabel(settings);
  return <span className={settings.time_layout === "split" ? "block w-full" : "inline-flex items-center"} style={{ fontFamily: timePreviewFontMap[settings.time_font_family], fontSize: `${size}px`, fontVariantNumeric: "tabular-nums", letterSpacing: settings.time_font_family === "digital" ? "0.08em" : undefined, "--clock-size": `${Math.max(30, Math.min(96, size * 2.25))}px` } as unknown as CSSProperties}>{content}</span>;
}
function BackgroundPreview({ settings }: { settings: MicrositeConfig["settings"] }) {
  const color = settings.background_animation_color_mode === "accent" ? settings.accent_color : settings.background_animation_color_mode === "custom" ? settings.background_animation_color : settings.primary_color;
  const label = { none: "Animasi nonaktif", float: "Bola mengambang", aurora: "Aurora lembut", gradient: "Gradasi bergerak", particles: "Partikel halus", clouds: "Awan cloud", rain: "Rintik hujan", shimmer: "Kilau shiny", waves: "Efek ombak", snow: "Hujan salju" }[settings.background_animation];
  const effectClass = previewButtonEffectClass(settings);
  const opacity = Math.max(0, Math.min(1, Number(settings.background_animation_opacity ?? 0.45)));
  const count = Math.min(10, Math.max(4, Number(settings.background_animation_count ?? 10)));
  return <div className="mt-5 overflow-hidden rounded-2xl border border-ink/10"><div className={`appearance-animation-preview appearance-animation-${settings.background_animation}`} style={{ "--appearance-animation-color": color, "--appearance-animation-opacity": opacity, "--appearance-animation-speed": settings.background_animation_speed === "slow" ? "7s" : settings.background_animation_speed === "fast" ? "2.5s" : "4.5s" } as React.CSSProperties}><AppearancePreviewElements settings={settings} count={count} /><div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 p-5 text-center"><span className="rounded-full bg-white/75 px-3 py-1 text-[10px] font-bold uppercase tracking-[.16em] text-ink shadow-sm">Pratinjau aktif</span><p className="text-sm font-bold text-ink">{label}</p><button type="button" className={`min-h-10 rounded-xl bg-moss px-4 text-xs font-bold text-white transition ${effectClass}`} data-button-effect={settings.button_effect}>Arahkan kursor untuk mencoba efek tombol</button></div></div></div>;
}

function AppearancePreviewElements({ settings, count }: { settings: MicrositeConfig["settings"]; count: number }) {
  if (settings.background_animation === "waves") return <svg aria-hidden="true" className="appearance-preview-waves" viewBox="0 0 1200 360" preserveAspectRatio="none"><path className="appearance-preview-wave-path appearance-preview-wave-back" d="M0 210 C 150 148 280 252 430 205 S 720 150 870 208 S 1080 255 1200 190 V360 H0 Z" /><path className="appearance-preview-wave-path appearance-preview-wave-middle" d="M0 252 C 170 196 300 292 480 238 S 760 188 930 248 S 1080 284 1200 225 V360 H0 Z" /><path className="appearance-preview-wave-path appearance-preview-wave-front" d="M0 292 C 170 246 300 320 470 278 S 750 230 910 286 S 1080 330 1200 275 V360 H0 Z" /><path className="appearance-preview-foam-line" d="M0 210 C 150 148 280 252 430 205 S 720 150 870 208 S 1080 255 1200 190" /></svg>;
  return <>{Array.from({ length: count }, (_, index) => <span key={index} className="appearance-animation-element" style={{ left: `${(index * 31) % 100}%`, top: `${(index * 47) % 100}%`, animationDelay: `${index * -0.45}s` }} />)}</>;
}

function previewButtonEffectClass(settings: MicrositeConfig["settings"]) { if (settings.button_effect === "none") return ""; const effect = settings.button_effect; const trigger = settings.button_effect_trigger ?? "interaction"; return `${trigger !== "idle" ? `button-effect-${effect}` : ""} ${trigger !== "interaction" ? `button-effect-idle-${effect}` : ""}`.trim(); }








