"use client";

import Image from "next/image";
import { QRCodeCanvas } from "qrcode.react";
import { ArrowUpRight, Check, Copy, ExternalLink, MapPin, MessageCircle, Share2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import type { MicrositeConfig } from "@/types/microsite";
import { AppIcon, ServiceIcon } from "@/components/microsite/icon";
import { isSafeUrl } from "@/lib/utils";

type Modal = "verified" | "share" | null;

const fontFamilyMap = {
  poppins: "var(--font-poppins), Arial, sans-serif",
  "plus-jakarta": "var(--font-plus-jakarta), Arial, sans-serif",
  inter: "var(--font-inter), Arial, sans-serif",
  "dm-sans": "var(--font-dm-sans), Arial, sans-serif",
};
const sizeMap = {
  title: { small: "0.9rem", medium: "1rem", large: "1.15rem" },
  body: { small: "0.75rem", medium: "0.875rem", large: "1rem" },
};
const introSizeMap = { small: "0.8rem", medium: "0.95rem", large: "1.1rem" };
const weightMap = { normal: "400", semibold: "600", bold: "700" };
const shadowMap = { none: "none", soft: "0 12px 32px rgba(25,52,43,.08)", strong: "0 16px 36px rgba(25,52,43,.18)" };

export function PublicMicrosite({ config: initialConfig, realtime = true }: { config: MicrositeConfig; realtime?: boolean }) {
  const [liveConfig, setLiveConfig] = useState(initialConfig);
  const [now, setNow] = useState(() => new Date());
  const rootRef = useRef<HTMLElement>(null);
  const config = liveConfig;
  const { microsite, settings } = config;
  const [modal, setModal] = useState<Modal>(null);
  const [shareUrl, setShareUrl] = useState("https://sdndukuhwaru01.vercel.app");
  const [shareStatus, setShareStatus] = useState("");
  const contentWidth = { narrow: "max-w-xl", standard: "max-w-2xl", wide: "max-w-3xl" }[settings.content_width];
  const radius = { soft: "rounded-[1.25rem]", round: "rounded-[2rem]", sharp: "rounded-md" }[settings.card_radius];
  const cardShape = settings.card_style === "outline" ? "bg-transparent shadow-none" : settings.card_style === "tinted" ? "bg-[var(--card-tint)]" : "bg-[var(--card-bg)]";
  const card = `border ${cardShape} text-[var(--card-text)] [border-color:var(--card-border)] [box-shadow:var(--card-shadow)] [font-family:var(--card-font)]`;
  const titleText = "text-[length:var(--card-title-size)] font-[var(--card-weight)] text-[var(--card-text)] [font-family:var(--card-font)]";
  const bodyText = "text-[length:var(--card-body-size)] text-[var(--card-muted)] [font-family:var(--card-font)]";
  const spacingClass = settings.element_spacing === "compact" ? "space-y-3" : settings.element_spacing === "airy" ? "space-y-14" : "space-y-10";
  const linkSpacingClass = settings.element_spacing === "compact" ? "space-y-0" : settings.element_spacing === "airy" ? "space-y-5" : "space-y-3";
  const services = useMemo(() => config.services.filter((service) => service.is_enabled).sort((a, b) => a.sort_order - b.sort_order), [config.services]);
  const contacts = config.contacts.filter((contact) => contact.is_enabled && contact.href);
  const logoUrl = settings.logo_url || "/logo.png";
  const backgroundUrl = settings.background_url || "/bg_hero.webp";
  const orderedComponents = useMemo(() => [...config.components].filter((component) => component.is_enabled).sort((a, b) => a.sort_order - b.sort_order), [config.components]);
  const overlay = Math.max(0, Math.min(Number(settings.overlay_opacity ?? 0.12), 0.8));
  const profilePosition = settings.hero_profile_position ?? "bottom";
  const cardVars = {
    "--primary": settings.primary_color,
    "--accent": settings.accent_color,
    "--page-bg": settings.page_background,
    "--text-color": settings.text_color,
    "--page-font": fontFamilyMap[settings.font_family],
    "--card-tint": "color-mix(in srgb, var(--primary) 8%, var(--page-bg))",
    "--card-bg": settings.card_background,
    "--card-text": settings.card_text_color,
    "--card-muted": settings.card_muted_color,
    "--card-border": settings.card_border_color,
    "--card-font": fontFamilyMap[settings.card_font_family],
    "--card-title-size": sizeMap.title[settings.card_title_size],
    "--card-body-size": sizeMap.body[settings.card_body_size],
    "--card-weight": weightMap[settings.card_text_weight],
    "--card-shadow": shadowMap[settings.card_shadow],
    "--intro-font": fontFamilyMap[settings.intro_font_family],
    "--intro-size": introSizeMap[settings.intro_text_size],
    "--intro-weight": weightMap[settings.intro_text_weight],
    "--intro-color": settings.intro_text_color,
  } as React.CSSProperties;

  const refreshPublished = useCallback(async () => {
    try {
      const response = await fetch("/api/public/config", { cache: "no-store" });
      if (!response.ok) return;
      setLiveConfig(await response.json() as MicrositeConfig);
    } catch {}
  }, []);

  useEffect(() => {
    if (!realtime) return;
    void refreshPublished();
    const timer = window.setInterval(refreshPublished, 5000);
    if (!supabaseConfigured()) return () => window.clearInterval(timer);
    const supabase = createClient();
    const channel = supabase.channel("public-microsite-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "microsites" }, refreshPublished)
      .on("postgres_changes", { event: "*", schema: "public", table: "microsite_settings" }, refreshPublished)
      .on("postgres_changes", { event: "*", schema: "public", table: "microsite_components" }, refreshPublished)
      .subscribe();
    return () => { window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [realtime, refreshPublished]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => { setShareUrl(window.location.href); }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.dataset.aosReady = "true";
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-aos]"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        (entry.target as HTMLElement).classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.12 });
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [config]);
  useEffect(() => { if (!modal) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setModal(null); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [modal]);

  async function copyLink() {
    try { await navigator.clipboard.writeText(shareUrl); setShareStatus("Link berhasil disalin."); } catch { setShareStatus("Salin link tidak tersedia di browser ini."); }
  }
  function shareWhatsApp() { window.open(`https://wa.me/?text=${encodeURIComponent(`${microsite.title} - ${shareUrl}`)}`, "_blank", "noopener,noreferrer"); }
  async function shareInstagram() {
    if (navigator.share) { try { await navigator.share({ title: microsite.title, text: `Microsite ${microsite.title}`, url: shareUrl }); return; } catch { return; } }
    await copyLink();
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  }

  return <main ref={rootRef} className="min-h-screen overflow-x-hidden bg-[#edf3f5] text-[var(--text-color)] [font-family:var(--page-font)]" style={cardVars}>
    <div className="mx-auto min-h-screen max-w-[1440px] bg-[var(--page-bg)] px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
      <section data-aos="fade-in" className={`relative isolate mx-auto aspect-[1701/665] ${profilePosition === "center" ? "overflow-hidden" : "overflow-visible mb-16"} ${radius} ${contentWidth}`} style={{ backgroundImage: `linear-gradient(rgba(12,46,51,${overlay * 0.45}), rgba(12,46,51,${overlay})), url(${backgroundUrl})`, backgroundPosition: settings.background_position || "center", backgroundSize: "100% 100%" }}>
        <div className="relative flex h-full flex-col justify-between p-4 text-white sm:p-6"><div className="flex items-start justify-between"><span className="rounded-full bg-black/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-white/85 backdrop-blur-sm">Portal sekolah</span><button onClick={() => { setShareStatus(""); setModal("share"); }} aria-label="Bagikan microsite" title="Bagikan microsite" className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-lg transition hover:-translate-y-0.5 hover:bg-[#f2f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><Share2 size={20} /></button></div><div className={`absolute left-1/2 z-10 -translate-x-1/2 ${profilePosition === "center" ? "top-1/2 -translate-y-1/2" : profilePosition === "outside" ? "top-full mt-4" : "bottom-0 translate-y-1/2"} `}><div className="relative h-20 w-20 sm:h-28 sm:w-28"><div className="absolute inset-0 rounded-full bg-white/85 p-2 shadow-2xl ring-4 ring-white/30"><div className="relative h-full w-full overflow-hidden rounded-full bg-white"><Image src={logoUrl} alt={`Logo ${microsite.title}`} fill sizes="112px" priority className="object-contain p-1" /></div></div><button onClick={() => setModal("verified")} aria-label="Lihat status verifikasi sekolah" title="Sekolah terverifikasi" className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-[#2388f4] text-white shadow-lg transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><Check size={16} strokeWidth={3} /></button></div></div></div>
      </section>
      <section className={`mx-auto ${contentWidth}`}>
        <div data-aos="fade-up" className="px-1 pb-5 pt-6 text-center sm:px-3">
          <h1 className="font-display text-3xl leading-tight text-[var(--primary)] sm:text-4xl">{microsite.title}</h1>
          <a href="https://www.google.com/maps/search/?api=1&query=-6.969376957480174,109.09867575461168" target="_blank" rel="noreferrer" className="mx-auto mt-4 flex max-w-xl justify-center font-medium leading-6 text-[var(--primary)] underline-offset-4 hover:underline" style={{ fontFamily: "var(--card-font)", fontSize: "var(--card-body-size)" }}>
            {microsite.address}
          </a>
          <p className="mx-auto mt-3 max-w-xl whitespace-pre-line leading-6 text-[length:var(--intro-size)] font-[var(--intro-weight)] text-[var(--intro-color)] [font-family:var(--intro-font)]" style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" }}>{microsite.description}</p>
        </div>
        <div data-aos="fade-up" className="mb-8 flex justify-center"><time dateTime={now.toISOString()} className="rounded-full border px-4 py-2 text-xs font-semibold text-[var(--card-muted)] [border-color:var(--card-border)] [box-shadow:var(--card-shadow)]" aria-label="Waktu sekarang">{formatJakartaTime(now)}</time></div>
        <div className={spacingClass}>{orderedComponents.map((component, index) => <div key={component.id} data-aos="fade-up" style={{ "--aos-delay": `${Math.min(index * 70, 280)}ms` } as React.CSSProperties}><PublicComponent component={component} config={config} services={services} contacts={contacts} radius={radius} card={card} titleText={titleText} bodyText={bodyText} linkSpacingClass={linkSpacingClass} /></div>)}</div>
        <footer data-aos="fade-up" className="flex items-center justify-between pb-7 pt-14 text-xs text-[var(--card-muted)]"><span>{String.fromCharCode(169)} {new Date().getFullYear()} {microsite.title}</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> Microsite resmi</span></footer>
      </section>
    </div>
    {modal === "verified" && <ModalShell title="Sekolah terverifikasi" onClose={() => setModal(null)}><div className="flex flex-col items-center text-center"><div className="relative h-24 w-24 overflow-hidden rounded-full bg-white p-2 ring-4 ring-[#2388f4]/20"><Image src={logoUrl} alt="Logo sekolah" fill sizes="96px" className="object-contain p-2" /></div><h3 className="mt-5 font-display text-2xl">{microsite.title}</h3><span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#eaf3ff] px-3 py-1.5 text-xs font-bold text-[#1670d2]"><Check size={14} strokeWidth={3} /> Terverifikasi</span><p className="mt-5 text-xs leading-5 text-ink/50">Identitas ini dikelola oleh SD Negeri Dukuhwaru 01 untuk keperluan informasi publik sekolah.</p></div></ModalShell>}
    {modal === "share" && <ModalShell title="Bagikan microsite" onClose={() => setModal(null)}><div className="flex flex-col items-center text-center"><div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm"><QRCodeCanvas value={shareUrl} size={220} level="H" imageSettings={{ src: logoUrl, height: 42, width: 42, excavate: true }} /></div><p className="mt-4 max-w-sm break-all text-sm text-ink/55">{shareUrl}</p><div className="mt-5 grid w-full gap-3 sm:grid-cols-3"><button onClick={copyLink} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-moss px-3 text-sm font-bold text-white hover:brightness-110"><Copy size={16} /> Salin link</button><button onClick={shareWhatsApp} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#198754] px-3 text-sm font-bold text-[#198754] hover:bg-[#eefaf3]"><MessageCircle size={16} /> WhatsApp</button><button onClick={shareInstagram} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-clay px-3 text-sm font-bold text-clay hover:bg-orange-50"><Share2 size={16} /> Instagram</button></div>{shareStatus && <p role="status" className="mt-4 text-sm font-semibold text-ink/65">{shareStatus}</p>}</div></ModalShell>}
  </main>;
}

function SectionHeading({ component, defaultShowTitle = false }: { component: MicrositeConfig["components"][number]; defaultShowTitle?: boolean }) {
  const values = component.config ?? {};
  const showTitle = values.show_title === undefined ? defaultShowTitle : values.show_title === true;
  const description = String(values.description ?? "");
  const showDescription = values.show_description !== false && Boolean(description);
  if (!showTitle && !showDescription) return null;
  const family = fontFamilyMap[String(values.title_font_family ?? "poppins") as keyof typeof fontFamilyMap] ?? fontFamilyMap.poppins;
  const descriptionFamily = fontFamilyMap[String(values.description_font_family ?? values.title_font_family ?? "poppins") as keyof typeof fontFamilyMap] ?? fontFamilyMap.poppins;
  const size = String(values.title_size ?? "large") === "small" ? "1.2rem" : String(values.title_size ?? "large") === "medium" ? "1.6rem" : "2rem";
  const descriptionSize = String(values.description_size ?? "medium") === "small" ? "0.8rem" : String(values.description_size ?? "medium") === "large" ? "1.1rem" : "0.95rem";
  const weight = weightMap[String(values.title_weight ?? "bold") as keyof typeof weightMap] ?? "700";
  const descriptionWeight = weightMap[String(values.description_weight ?? "normal") as keyof typeof weightMap] ?? "400";
  const titleColor = isHexColor(String(values.title_color ?? "")) ? String(values.title_color) : "var(--primary)";
  const descriptionColor = isHexColor(String(values.description_color ?? "")) ? String(values.description_color) : "var(--card-muted)";
  const alignClass = values.align === "left" ? "text-left" : values.align === "right" ? "text-right" : "text-center";
  return <div className={`mb-5 ${alignClass}`}><h2 style={{ fontFamily: family, fontSize: size, fontWeight: weight, color: titleColor }}>{showTitle ? component.title : null}</h2>{showDescription && <p className="mt-2" style={{ fontFamily: descriptionFamily, fontSize: descriptionSize, fontWeight: descriptionWeight, color: descriptionColor }}>{description}</p>}</div>;
}

function PublicComponent({ component, config, services, contacts, radius, card, titleText, bodyText, linkSpacingClass }: { component: MicrositeConfig["components"][number]; config: MicrositeConfig; services: MicrositeConfig["services"]; contacts: MicrositeConfig["contacts"]; radius: string; card: string; titleText: string; bodyText: string; linkSpacingClass: string }) {
  const { microsite, settings } = config;
  const iconFrameClass = settings.icon_card_mode === "integrated" ? "border-transparent bg-transparent" : "border shadow-sm";
  const iconFrameStyle = settings.icon_card_mode === "integrated" ? undefined : { backgroundColor: "color-mix(in srgb, var(--primary) 12%, var(--card-bg))", borderColor: "color-mix(in srgb, var(--primary) 24%, var(--card-border))" };
  if (component.type === "service_links") return <section aria-label={component.title}><SectionHeading component={component} /><div className={`mt-5 ${settings.link_layout === "horizontal" ? "grid gap-3 sm:grid-cols-2" : linkSpacingClass}`}>{services.map((service) => <a key={service.id} href={isSafeUrl(service.href) ? service.href : "#"} target="_blank" rel="noreferrer" className={`group flex min-h-[72px] items-center gap-4 border p-4 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${radius} ${card}`}><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconFrameClass} text-[var(--primary)]`} style={iconFrameStyle}>{service.icon_type === "image" ? <ServiceIcon name={service.icon} imageUrl={service.icon_url} /> : <AppIcon name={service.icon} />}</span><span className="min-w-0 flex-1 text-left"><span className={`block ${titleText}`}>{service.title}</span>{service.description && <span className={`mt-1 block leading-5 ${bodyText}`}>{service.description}</span>}</span><ArrowUpRight size={19} className="shrink-0 text-[var(--card-muted)]" /></a>)}</div></section>;
  if (component.type === "location") {
    const locationValues = component.config ?? {};
    if (locationValues.show_map === false) return null;
    const latitude = Number(locationValues.latitude ?? microsite.latitude);
    const longitude = Number(locationValues.longitude ?? microsite.longitude);
    const mapTitle = String(locationValues.map_title ?? component.title ?? "Peta lokasi sekolah");
    const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(microsite.title)}&ll=${latitude},${longitude}&z=17&output=embed`;
    return <section aria-label={mapTitle}><SectionHeading component={{ ...component, title: mapTitle }} /><div className={`overflow-hidden ${radius} ${card}`}><div className="aspect-[16/8] min-h-[260px] bg-[#dce8e5]"><iframe title={mapTitle} src={mapUrl} className="h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div><a href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`} target="_blank" rel="noreferrer" className="sr-only">Buka lokasi di Google Maps</a></div></section>;
  }
  if (component.type === "contact") {
    const contactValues = component.config ?? {};
    const title = component.title === "Terhubung" ? "Terhubung bersama kami" : component.title;
    const displayMode = String(contactValues.display_mode ?? "full");
    const showIcons = contactValues.show_icons !== false;
    const showLabels = contactValues.show_labels !== false;
    const showValues = contactValues.show_values !== false;
    const withCard = contactValues.with_card !== false;
    const contactRadius = contactValues.card_shape === "square" ? "rounded-md" : contactValues.card_shape === "bubble" ? "rounded-[2rem]" : radius;
    const iconSize = contactValues.icon_size === "small" ? 15 : contactValues.icon_size === "large" ? 23 : 18;
    const gapClass = contactValues.gap_size === "tight" ? "gap-0" : contactValues.gap_size === "wide" ? "gap-5" : "gap-3";
    const cardStyle = contactValues.card_style === "outline" ? "bg-transparent [box-shadow:none]" : contactValues.card_style === "tinted" ? "bg-[var(--card-tint)] [box-shadow:var(--card-shadow)]" : "bg-[var(--card-bg)] [box-shadow:var(--card-shadow)]";
    const contactCard = `${withCard ? `border ${cardStyle}` : "border-transparent bg-transparent [box-shadow:none]"} text-[var(--card-text)] [border-color:var(--card-border)] [font-family:var(--card-font)]`;
    const animation = contactValues.animation === "fade" ? "contact-card-fade" : contactValues.animation === "lift" || contactValues.animation === "glow" ? "contact-card-glow" : "";
    const layoutClass = displayMode === "compact" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2";
    return <section aria-labelledby={`${component.id}-title`}><div id={`${component.id}-title`}><SectionHeading component={{ ...component, title }} defaultShowTitle /></div><div className={`mx-auto mt-5 max-w-xl ${displayMode === "icon" ? "flex flex-wrap justify-center gap-0" : `grid ${gapClass} ${layoutClass}`}`}>{contacts.map((contact) => <a key={contact.id} href={isSafeUrl(contact.href) ? contact.href : "#"} target={contact.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" aria-label={contact.label} className={`flex min-h-16 items-center gap-3 p-3.5 transition ${animation} ${contactRadius} ${contactCard} ${displayMode === "icon" ? "w-16 justify-center p-2" : ""}`}>{showIcons && <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconFrameClass} text-[var(--primary)]`} style={iconFrameStyle}><AppIcon name={contact.icon} size={iconSize} /></span>}{displayMode !== "icon" && <span className="min-w-0 text-left">{showLabels && <span className="block text-xs font-bold uppercase tracking-[.12em] text-[var(--card-muted)]">{contact.label}</span>}{showValues && <span className={`block truncate ${titleText}`}>{contact.value}</span>}</span>}</a>)}</div></section>;
  }
  const values = component.config ?? {};
  const body = String(values.body ?? values.description ?? "");
  const href = String(values.href ?? "");
  if (component.type === "divider") { const style = ["solid", "dashed", "dotted", "double"].includes(String(values.style)) ? String(values.style) : "solid"; const height = Math.max(1, Math.min(8, Number(values.height ?? 1))); const color = isHexColor(String(values.color ?? "")) ? String(values.color) : "var(--card-border)"; const spacing = values.spacing === "compact" ? "my-3" : values.spacing === "airy" ? "my-10" : "my-6"; return <div role="separator" aria-label="Pemisah komponen" className={spacing} style={{ borderTop: `${height}px ${style} ${color}` }} />; }
  if (component.type === "text") { const withCard = values.with_card !== false; const textContent = <><h2 className={titleText}>{component.title}</h2><p className={`mt-3 whitespace-pre-line leading-7 ${bodyText}`}>{body}</p></>; return withCard ? <section className={`border p-5 ${radius} ${card}`}>{textContent}</section> : <section className="px-1 py-2">{textContent}</section>; }
  if (component.type === "image" && isSafeUrl(String(values.image_url ?? ""))) return <section><figure className={`overflow-hidden border ${radius} ${card}`}><Image src={String(values.image_url)} alt={String(values.alt ?? component.title)} width={1200} height={700} className="h-auto w-full object-cover" unoptimized /><figcaption className={`p-4 ${titleText}`}>{component.title}</figcaption></figure></section>;
  if (component.type === "embed" && isSafeUrl(String(values.embed_url ?? ""))) return <section><h2 className={`mb-4 text-center font-display text-3xl text-[var(--primary)] ${titleText}`}>{component.title}</h2><div className={`aspect-video overflow-hidden border ${radius} ${card}`}><iframe title={component.title} src={String(values.embed_url)} className="h-full w-full border-0" loading="lazy" /></div></section>;
  if (["link", "whatsapp", "email", "instagram", "phone"].includes(component.type)) return <a href={isSafeUrl(href) ? href : "#"} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={`group flex min-h-[72px] items-center gap-4 border p-4 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${radius} ${card}`}><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconFrameClass} text-[var(--primary)]`} style={iconFrameStyle}><AppIcon name={component.type === "email" ? "mail" : component.type} /></span><span className="min-w-0 flex-1"><span className={`block ${titleText}`}>{component.title}</span>{body && <span className={`mt-1 block leading-5 ${bodyText}`}>{body}</span>}</span><ExternalLink size={18} className="shrink-0 text-[var(--card-muted)]" /></a>;
  return null;
}

function formatJakartaTime(value: Date) { return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(value).replace(" pukul ", " " + String.fromCharCode(183) + " "); }
function isHexColor(value: string) { return /^#[0-9A-Fa-f]{6}$/.test(value); }
function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="relative max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-auto rounded-[1.5rem] bg-white p-6 shadow-2xl sm:p-8"><div className="mb-6 flex items-center justify-between"><h2 className="font-display text-2xl">{title}</h2><button onClick={onClose} aria-label="Tutup modal" className="flex h-11 w-11 items-center justify-center rounded-full bg-paper text-ink/60 hover:bg-sand"><X size={18} /></button></div>{children}</div></div>; }






























