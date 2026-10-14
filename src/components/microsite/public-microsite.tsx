"use client";

import Image from "next/image";
import { QRCodeCanvas } from "qrcode.react";
import { ArrowUpRight, Check, Copy, ExternalLink, MapPin, MessageCircle, Moon, Share2, Sun, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import type { MicrositeConfig } from "@/types/microsite";
import { AppIcon, ServiceIcon } from "@/components/microsite/icon";
import { PublicSplash } from "@/components/public/public-splash";
import { isSafeUrl } from "@/lib/utils";
import { trackPublicEvent, trackPublicPageView } from "@/lib/public-analytics";

type Modal = "verified" | "share" | null;

const fontFamilyMap = {
  poppins: "var(--font-poppins), Arial, sans-serif",
  "plus-jakarta": "var(--font-plus-jakarta), Arial, sans-serif",
  inter: "var(--font-inter), Arial, sans-serif",
  "dm-sans": "var(--font-dm-sans), Arial, sans-serif",
  digital: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
};
const sizeMap = {
  title: { small: "0.9rem", medium: "1rem", large: "1.15rem" },
  body: { small: "0.75rem", medium: "0.875rem", large: "1rem" },
};
const introSizeMap = { small: "0.8rem", medium: "0.95rem", large: "1.1rem" };
const weightMap = { normal: "400", semibold: "600", bold: "700" };
const shadowMap = { none: "none", soft: "0 12px 32px rgba(25,52,43,.08)", strong: "0 16px 36px rgba(25,52,43,.18)" };

export function PublicMicrosite({ config: initialConfig, realtime = true, showSplash = realtime, preview = !realtime }: { config: MicrositeConfig; realtime?: boolean; showSplash?: boolean; preview?: boolean }) {
  const [liveConfig, setLiveConfig] = useState(initialConfig);
  const [now, setNow] = useState(() => new Date());
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const rootRef = useRef<HTMLElement>(null);
  const config = liveConfig;
  const { microsite, settings } = config;
  const [modal, setModal] = useState<Modal>(null);
  const [shareUrl, setShareUrl] = useState("https://sdndukuhwaru01.vercel.app");
  const [shareStatus, setShareStatus] = useState("");
  const contentWidth = { narrow: "max-w-xl", standard: "max-w-2xl", wide: "max-w-3xl" }[settings.content_width];
  const radius = { soft: "rounded-[1.25rem]", round: "rounded-[2rem]", sharp: "rounded-md", pill: "rounded-full", organic: "rounded-[2.25rem_1rem_2.5rem_1rem]", square: "rounded-none", circle: "rounded-full", diamond: "icon-shape-diamond", hexagon: "icon-shape-hexagon", squircle: "icon-shape-squircle" }[settings.card_radius];
  const cardShape = settings.card_style === "outline" ? "bg-transparent shadow-none" : settings.card_style === "tinted" ? "bg-[var(--card-tint)]" : settings.card_style === "glass" ? "bg-white/35 backdrop-blur-md" : settings.card_style === "elevated" ? "bg-[var(--card-bg)] shadow-[0_18px_42px_rgba(25,52,43,.16)]" : settings.card_style === "dashed" ? "bg-[var(--card-bg)] border-dashed" : "bg-[var(--card-bg)]";
  const card = `border ${cardShape} text-[var(--card-text)] [border-color:var(--card-border)] [box-shadow:var(--card-shadow)] [font-family:var(--card-font)]`;
  const portalBadgeClass = settings.button_style === "card" ? `${card} ${radius}` : `border ${settings.button_style === "pill" ? "rounded-full" : radius}`;
  const portalBadgeStyle = settings.button_style === "card" ? undefined : { ...buttonStyle(settings), color: themeMode === "dark" ? "#ffffff" : "var(--button-text-color)" };
  const titleText = "text-[length:var(--card-title-size)] font-[var(--card-weight)] text-[var(--card-text)] [font-family:var(--card-font)]";
  const bodyText = "text-[length:var(--card-body-size)] text-[var(--card-muted)] [font-family:var(--card-font)]";
  const spacingClass = settings.element_spacing === "compact" ? "space-y-3" : settings.element_spacing === "airy" ? "space-y-14" : "space-y-10";
  const linkSpacingClass = settings.element_spacing === "compact" ? "space-y-0" : settings.element_spacing === "airy" ? "space-y-5" : "space-y-3";
  const services = useMemo(() => config.services.filter((service) => service.is_enabled).sort((a, b) => a.sort_order - b.sort_order), [config.services]);
  const contacts = config.contacts.filter((contact) => contact.is_enabled && contact.href);
  const logoUrl = settings.logo_url || "/logo.png";
  const backgroundUrl = settings.background_url || "/bg_hero.webp";
  const orderedComponents = useMemo(
    () => [...config.components].filter((component) => component.is_enabled).sort((a, b) => a.sort_order - b.sort_order),
    [config.components],
  );
  const overlay = Math.max(0, Math.min(Number(settings.overlay_opacity ?? 0.12), 0.8));
  const profilePosition = settings.hero_profile_position ?? "bottom";
  const backgroundAnimationColor = settings.background_animation_color_mode === "accent" ? "var(--accent)" : settings.background_animation_color_mode === "custom" ? settings.background_animation_color : "var(--primary)";
  const darkMode = themeMode === "dark";
  const heroBadgeStyle = { ...portalBadgeStyle, backgroundColor: "rgba(255,255,255,.95)", borderColor: darkMode ? "#68a9e8" : "#4e80b7", color: "#123f83", boxShadow: "0 4px 14px rgba(8,43,98,.18)", textShadow: "none" } as React.CSSProperties;
  const readableLightMuted = readableTextColor(settings.card_muted_color, settings.page_background, "#4C6258");
  const readableLightIntro = readableTextColor(settings.intro_text_color, settings.page_background, "#4C6258");
  const cardVars = {
    "--primary": darkMode ? "#76a9ef" : settings.primary_color,
    "--accent": darkMode ? "#4b8fe8" : settings.accent_color,
    "--page-bg": darkMode ? "#082b62" : settings.page_background,
    "--text-color": darkMode ? "#edf4ff" : settings.text_color,
    "--page-font": fontFamilyMap[settings.font_family],
    "--site-title-font": fontFamilyMap[settings.site_title_font_family],
    "--site-title-weight": weightMap[settings.site_title_text_weight],
    "--card-tint": "color-mix(in srgb, var(--primary) 8%, var(--page-bg))",
    "--card-bg": darkMode ? "#0d3470" : settings.card_background,
    "--card-text": darkMode ? "#f3f7ff" : settings.card_text_color,
    "--card-muted": darkMode ? "#bfd0e8" : readableLightMuted,
    "--card-border": darkMode ? "#2d5b99" : settings.card_border_color,
    "--realtime-color": darkMode ? "#c8ded3" : `color-mix(in srgb, ${settings.primary_color} 72%, #19342b)`,
    "--button-text-color": darkMode && settings.button_color_mode !== "custom" ? "#ffffff" : settings.button_text_color,
    "--card-font": fontFamilyMap[settings.card_font_family],
    "--card-title-size": sizeMap.title[settings.card_title_size],
    "--card-body-size": sizeMap.body[settings.card_body_size],
    "--card-weight": weightMap[settings.card_text_weight],
    "--card-shadow": shadowMap[settings.card_shadow],
    "--intro-font": fontFamilyMap[settings.intro_font_family],
    "--intro-size": introSizeMap[settings.intro_text_size],
    "--intro-weight": weightMap[settings.intro_text_weight],
    "--intro-color": darkMode ? "#c5d5ec" : readableLightIntro,
    "--footer-text": darkMode ? "#bfd0e8" : readableLightMuted,
    "--hero-text": darkMode ? "#b8d7ff" : "#ffffff",
  } as React.CSSProperties;

  useEffect(() => {
    const saved = window.localStorage.getItem("microsite-theme-mode");
    if (saved === "dark" || saved === "light") setThemeMode(saved);
  }, []);

  useEffect(() => { window.localStorage.setItem("microsite-theme-mode", themeMode); }, [themeMode]);

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

  useEffect(() => {
    const publicUrl = new URL(window.location.href);
    publicUrl.search = "";
    publicUrl.hash = "";
    setShareUrl(publicUrl.toString());
  }, []);

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
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const pagePath = `${window.location.pathname}${window.location.search}`.slice(0, 240);
    trackPublicPageView(pagePath, microsite.title);
    const onLinkClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      trackPublicEvent({ eventType: "link_click", pagePath, pageTitle: microsite.title, targetUrl: href });
    };
    root.addEventListener("click", onLinkClick);
    return () => root.removeEventListener("click", onLinkClick);
  }, [microsite.title]);
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

  return <main ref={rootRef} className="relative min-h-screen overflow-x-hidden text-[var(--text-color)] [font-family:var(--page-font)]" style={{ ...cardVars, backgroundColor: "var(--page-bg)" }}>
    {showSplash && <PublicSplash />}
    <div className="relative z-10 mx-auto min-h-screen max-w-[1440px] px-4 py-4 sm:px-8 sm:py-8 lg:px-12" style={{ backgroundColor: "color-mix(in srgb, var(--page-bg) 94%, transparent)" }}>
      {settings.background_animation !== "none" && <BackgroundAnimation settings={settings} color={backgroundAnimationColor} />}
      <section data-aos="fade-in" className={`relative z-10 isolate mx-auto aspect-[1701/665] ${profilePosition === "center" ? "overflow-hidden" : profilePosition === "outside" ? "overflow-visible mb-[9rem] sm:mb-[10rem]" : "overflow-visible mb-16"} ${radius} ${contentWidth}`} style={{ backgroundImage: `linear-gradient(rgba(12,46,51,${overlay * 0.45}), rgba(12,46,51,${overlay})), url(${backgroundUrl})`, backgroundPosition: settings.background_position || "center", backgroundSize: "100% 100%" }}>
        <div className="relative flex h-full flex-col justify-between p-4 text-[var(--hero-text)] sm:p-6"><div className="flex items-start justify-between"><span className={`inline-flex px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.16em] backdrop-blur-sm sm:px-3 sm:py-1.5 sm:text-[10px] sm:tracking-[.2em] ${portalBadgeClass}`} style={heroBadgeStyle}>Portal sekolah</span><div className="relative -right-1 -top-2 flex items-center gap-1 sm:static sm:gap-2"><button onClick={() => setThemeMode((current) => current === "dark" ? "light" : "dark")} aria-label={darkMode ? "Gunakan mode terang" : "Gunakan mode gelap"} title={darkMode ? "Mode terang" : "Mode gelap"} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-ink shadow-lg transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{darkMode ? <Sun size={19} /> : <Moon size={19} />}</button><button onClick={() => { setShareStatus(""); setModal("share"); }} aria-label="Bagikan microsite" title="Bagikan microsite" className="group flex h-11 w-11 items-center justify-center rounded-full text-ink transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg transition group-hover:bg-[#f2f7f5] group-hover:-translate-y-0.5 sm:h-11 sm:w-11"><Share2 size={18} /></span></button></div></div><div className={`absolute left-1/2 z-10 -translate-x-1/2 ${profilePosition === "center" ? "top-1/2 -translate-y-1/2" : profilePosition === "outside" ? "top-full mt-4" : "bottom-0 translate-y-1/2"} `}><div className="relative h-24 w-24 sm:h-32 sm:w-32 lg:h-36 lg:w-36"><div className="absolute inset-0 rounded-full bg-white/85 p-2 shadow-2xl ring-4 ring-white/30"><div className="relative h-full w-full overflow-hidden rounded-full bg-white"><Image src={logoUrl} alt={`Logo ${microsite.title}`} fill sizes="144px" priority className="object-contain p-1" /></div></div><button onClick={() => setModal("verified")} aria-label="Lihat status verifikasi sekolah" title="Sekolah terverifikasi" className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-[#2388f4] text-white shadow-lg transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-10 sm:w-10"><Check size={16} strokeWidth={3} /></button></div></div></div>
      </section>
      <section className={`relative z-10 mx-auto ${contentWidth}`}>
        <div data-aos="fade-up" className="px-1 pb-5 pt-6 text-center sm:px-3">
          <h1 className={preview ? "whitespace-nowrap text-[clamp(1.35rem,2.2vw,2rem)] leading-tight tracking-[-.035em] text-[var(--primary)]" : "text-3xl leading-tight text-[var(--primary)] sm:text-4xl"} style={{ fontFamily: "var(--site-title-font)", fontWeight: "var(--site-title-weight)" }}>{microsite.title}</h1>
          <a href="https://www.google.com/maps/search/?api=1&query=-6.969376957480174,109.09867575461168" target="_blank" rel="noreferrer" className="mx-auto mt-4 flex max-w-xl justify-center font-medium leading-6 text-[var(--primary)] underline-offset-4 hover:underline" style={{ fontFamily: "var(--card-font)", fontSize: "var(--card-body-size)" }}>
            {microsite.address}
          </a>
          <p className="mx-auto mt-3 max-w-xl whitespace-pre-line leading-6 text-[length:var(--intro-size)] font-[var(--intro-weight)] text-[var(--intro-color)] [font-family:var(--intro-font)]" style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" }}>{microsite.description}</p>
        </div>
        <div data-aos="fade-up" className={`mb-8 flex ${settings.time_layout === "split" ? settings.time_card_mode === "separate" ? "justify-center" : "w-full" : settings.time_position === "left" ? "justify-start" : settings.time_position === "right" ? "justify-end" : "justify-center"}`}><time dateTime={now.toISOString()} className={`${settings.time_layout === "split" && settings.time_card_mode !== "separate" ? "w-full" : ""} ${settings.time_layout !== "split" || settings.time_card_mode === "single" ? "px-4 py-2" : ""} text-xs font-semibold ${settings.time_layout === "split" && settings.time_card_mode !== "single" ? "" : timeFrameClass(settings, radius, card)}`} style={timeFrameStyle(settings)} aria-label="Waktu sekarang">{settings.time_layout === "split" ? <SplitTime value={now} settings={settings} radius={radius} card={card} /> : <TimeDisplay value={now} settings={settings} />}</time></div>
        <div className={spacingClass}>{orderedComponents.map((component, index) => <div key={component.id} data-aos="fade-up" style={{ "--aos-delay": `${Math.min(index * 70, 280)}ms` } as React.CSSProperties}><PublicComponent component={component} config={config} services={services} contacts={contacts} radius={radius} card={card} titleText={titleText} bodyText={bodyText} linkSpacingClass={linkSpacingClass} /></div>)}</div>
        <footer data-aos="fade-up" className="flex items-center justify-between pb-7 pt-14 text-xs text-[var(--footer-text)]"><span>{String.fromCharCode(169)} {new Date().getFullYear()} {microsite.title}</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> Microsite resmi</span></footer>
      </section>
    </div>
    {modal === "verified" && <ModalShell title="Verified Status" onClose={() => setModal(null)}><div className="flex flex-col items-center text-center"><div className="relative h-24 w-24 overflow-hidden rounded-full bg-white p-2 ring-4 ring-[#2388f4]/20"><Image src={logoUrl} alt="Logo sekolah" fill sizes="96px" className="object-contain p-2" /></div><div className="mt-6 w-full space-y-4 text-sm"><div><p className="text-ink/55">This microsite belongs to:</p><p className="mt-1 font-bold text-ink underline decoration-ink/25 underline-offset-4">{microsite.title}</p></div><div><p className="text-ink/55">Type:</p><p className="mt-1 font-semibold text-ink">School</p></div><div><p className="text-ink/55">Verified At:</p><p className="mt-1 font-semibold text-ink">{formatVerifiedDate(microsite.last_published_at)}</p></div></div><p className="mt-6 text-xs leading-5 text-ink/50">Identitas ini dikelola oleh SD Negeri Dukuhwaru 01 untuk keperluan informasi publik sekolah.</p></div></ModalShell>}
    {modal === "share" && <ModalShell title="Bagikan microsite" onClose={() => setModal(null)}><div className="flex flex-col items-center text-center"><div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm"><QRCodeCanvas value={shareUrl} size={220} level="H" imageSettings={{ src: logoUrl, height: 42, width: 42, excavate: true }} /></div><p className="mt-4 max-w-sm break-all text-sm text-ink/55">{shareUrl}</p><div className="mt-5 grid w-full gap-3 sm:grid-cols-3"><button onClick={copyLink} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-moss px-3 text-sm font-bold text-white hover:brightness-110"><Copy size={16} /> Salin link</button><button onClick={shareWhatsApp} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#198754] px-3 text-sm font-bold text-[#198754] hover:bg-[#eefaf3]"><MessageCircle size={16} /> WhatsApp</button><button onClick={shareInstagram} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-clay px-3 text-sm font-bold text-clay hover:bg-orange-50"><Share2 size={16} /> Instagram</button></div>{shareStatus && <p role="status" className="mt-4 text-sm font-semibold text-ink/65">{shareStatus}</p>}</div></ModalShell>}
  </main>;
}

function BackgroundAnimation({ settings, color }: { settings: MicrositeConfig["settings"]; color: string }) {
  const count = Math.max(4, Math.min(24, Number(settings.background_animation_count ?? 10)));
  const speed = settings.background_animation_speed === "slow" ? "28s" : settings.background_animation_speed === "fast" ? "12s" : "20s";
  const opacity = Math.max(0, Math.min(1, Number(settings.background_animation_opacity ?? 0.45)));
  const style = { "--microsite-bg-color": color, "--microsite-bg-secondary": settings.accent_color, "--microsite-bg-speed": speed, "--microsite-bg-opacity": opacity } as React.CSSProperties;
  if (settings.background_animation === "gradient") return <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden"><div className="microsite-bg-gradient" style={style} /></div>;
  if (settings.background_animation === "aurora") return <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden"><div className="microsite-bg-aurora" style={style} /></div>;
  if (settings.background_animation === "shimmer") return <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">{Array.from({ length: Math.min(count, 10) }, (_, index) => <span key={index} className="microsite-bg-shimmer" style={{ ...style, left: `${index * 13 - 15}%`, animationDelay: `${index * -1.2}s` }} />)}</div>;
  if (settings.background_animation === "waves") return <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden"><svg className="microsite-bg-waves" viewBox="0 0 1200 360" preserveAspectRatio="none" style={style}><path className="microsite-bg-wave-path microsite-bg-wave-back" d="M0 210 C 150 148 280 252 430 205 S 720 150 870 208 S 1080 255 1200 190 V360 H0 Z" /><path className="microsite-bg-wave-path microsite-bg-wave-middle" d="M0 252 C 170 196 300 292 480 238 S 760 188 930 248 S 1080 284 1200 225 V360 H0 Z" /><path className="microsite-bg-wave-path microsite-bg-wave-front" d="M0 292 C 170 246 300 320 470 278 S 750 230 910 286 S 1080 330 1200 275 V360 H0 Z" /><path className="microsite-bg-foam-line" d="M0 210 C 150 148 280 252 430 205 S 720 150 870 208 S 1080 255 1200 190" /><path className="microsite-bg-foam-line microsite-bg-foam-line-soft" d="M0 252 C 170 196 300 292 480 238 S 760 188 930 248 S 1080 284 1200 225" /></svg>{Array.from({ length: Math.min(count, 24) }, (_, index) => <span key={index} className="microsite-bg-foam" style={{ ...style, left: `${(index * 29) % 100}%`, bottom: `${18 + (index % 5) * 6}%`, width: `${18 + (index % 4) * 9}px`, animationDelay: `${index * -0.7}s` }} />)}</div>;
  if (settings.background_animation === "clouds") return <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">{Array.from({ length: count }, (_, index) => <span key={index} className="microsite-bg-cloud" style={{ ...style, "--microsite-cloud-scale": 0.8 + (index % 4) * 0.12, left: `${(index * 37) % 100}%`, top: `${(index * 61) % 82}%`, animationDelay: `${(index % 7) * -1.7}s` } as React.CSSProperties} />)}</div>;
  const itemClass = settings.background_animation === "particles" ? "microsite-bg-particle" : settings.background_animation === "rain" ? "microsite-bg-rain" : settings.background_animation === "snow" ? "microsite-bg-snow" : "microsite-bg-orb";
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">{Array.from({ length: count }, (_, index) => <span key={index} className={itemClass} style={{ ...style, left: `${(index * 37) % 100}%`, top: `${(index * 61) % 100}%`, width: itemClass === "microsite-bg-particle" || itemClass === "microsite-bg-rain" || itemClass === "microsite-bg-snow" ? undefined : `${28 + (index % 4) * 16}px`, height: itemClass === "microsite-bg-particle" || itemClass === "microsite-bg-rain" || itemClass === "microsite-bg-snow" ? undefined : `${28 + (index % 4) * 16}px`, "--microsite-rain-length": `${18 + (index % 5) * 7}px`, "--microsite-rain-opacity": 0.34 + (index % 4) * 0.06, "--microsite-rain-drift": `${-18 + (index % 6) * 7}px`, animationDelay: `${(index % 11) * -0.38}s` } as React.CSSProperties} />)}</div>;
}

function SectionHeading({ component, settings, defaultShowTitle = false }: { component: MicrositeConfig["components"][number]; settings: MicrositeConfig["settings"]; defaultShowTitle?: boolean }) {
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
  const descriptionColor = isHexColor(String(values.description_color ?? "")) ? readableTextColor(String(values.description_color), settings.page_background, "var(--card-muted)") : "var(--card-muted)";
  const alignClass = values.align === "left" ? "text-left" : values.align === "right" ? "text-right" : "text-center";
  return <div className={`mb-5 ${alignClass}`}><h2 style={{ fontFamily: family, fontSize: size, fontWeight: weight, color: titleColor }}>{showTitle ? component.title : null}</h2>{showDescription && <p className="mt-2" style={{ fontFamily: descriptionFamily, fontSize: descriptionSize, fontWeight: descriptionWeight, color: descriptionColor }}>{description}</p>}</div>;
}

function ServiceLinksSection({ component, settings, services, radius, card, titleText, bodyText, linkSpacingClass, iconFrameClass, iconFrameStyle }: { component: MicrositeConfig["components"][number]; settings: MicrositeConfig["settings"]; services: MicrositeConfig["services"]; radius: string; card: string; titleText: string; bodyText: string; linkSpacingClass: string; iconFrameClass: string; iconFrameStyle?: React.CSSProperties }) {
  const layout = settings.link_layout;
  const separateIcon = settings.icon_card_mode !== "integrated";
  const listClass = separateIcon ? layout === "compact" ? "space-y-2" : linkSpacingClass : layout === "horizontal" || layout === "cards" || layout === "spotlight" ? "grid gap-3 sm:grid-cols-2" : layout === "compact" ? "space-y-2" : linkSpacingClass;
  return <section aria-label={component.title}><SectionHeading component={component} settings={settings} /><div className={`mt-5 ${listClass}`}>{services.map((service, index) => <ServiceLinkCard key={service.id} service={service} settings={settings} layout={layout} featured={index === 0} radius={radius} card={card} titleText={titleText} bodyText={bodyText} separateIcon={separateIcon} iconFrameClass={iconFrameClass} iconFrameStyle={iconFrameStyle} />)}</div></section>;
}

function ServiceLinkCard({ service, settings, layout, featured, radius, card, titleText, bodyText, separateIcon, iconFrameClass, iconFrameStyle }: { service: MicrositeConfig["services"][number]; settings: MicrositeConfig["settings"]; layout: MicrositeConfig["settings"]["link_layout"]; featured: boolean; radius: string; card: string; titleText: string; bodyText: string; separateIcon: boolean; iconFrameClass: string; iconFrameStyle?: React.CSSProperties }) {
  const cardLayout = layout === "cards";
  const spotlight = layout === "spotlight";
  const compact = layout === "compact";
  const useSeparateIcon = separateIcon;
  const iconSize = iconSizeValue(settings.icon_size);
  const icon = <span className={`flex shrink-0 items-center justify-center ${useSeparateIcon ? `${iconPanelClass(settings.icon_panel_size, compact)} self-stretch` : compact ? "h-9 w-9" : "h-11 w-11"} ${iconFrameClass}`} style={iconFrameStyle}>{service.icon_type === "image" ? <ServiceIcon name={service.icon} imageUrl={service.icon_url} size={iconSize} /> : <AppIcon name={service.icon} size={iconSize} />}</span>;
  const linkClass = compact ? "min-h-14 gap-3 px-3 py-2.5" : cardLayout ? "min-h-[150px] flex-col justify-center gap-3 p-5 text-center" : spotlight && featured ? "min-h-[150px] gap-5 p-6 sm:col-span-2" : spotlight ? "min-h-[96px] gap-3 p-4" : "min-h-[72px] gap-4 p-4";
  const content = <span className={`min-w-0 flex-1 ${cardLayout ? "text-center" : "text-left"}`}><span className={`block ${titleText}`} style={buttonTitleStyle(settings)}>{service.title}</span>{service.description && <span className={`mt-1 block leading-5 ${bodyText}`} style={buttonDescriptionStyle(settings)}>{service.description}</span>}</span>;
  const effectClass = buttonEffectClass(settings, service.button_effect, service.button_effect_trigger);
  const link = <a href={isSafeUrl(service.href) ? service.href : "#"} target="_blank" rel="noreferrer" style={{ ...buttonStyle(settings), ...buttonSizeStyle(settings), ...buttonEffectStyle(service.button_effect_speed) }} className={`group flex min-w-0 flex-1 items-center border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${effectClass} ${buttonStyleClass(settings)} ${linkClass} ${spotlight && featured ? "bg-[var(--card-tint)]" : ""} ${radius} ${card}`} data-button-effect={service.button_effect ?? settings.button_effect} data-button-trigger={service.button_effect_trigger ?? settings.button_effect_trigger}>{!useSeparateIcon && icon}{content}<ArrowUpRight size={19} className={`shrink-0 text-[var(--card-muted)] ${cardLayout ? "self-end" : ""}`} /></a>;
  return useSeparateIcon ? <div className="flex w-full min-w-0 items-stretch gap-3">{icon}{link}</div> : link;
}

function buttonStyle(settings: MicrositeConfig["settings"]): React.CSSProperties {
  if (settings.button_style === "card") return {};
  const color = settings.button_color_mode === "accent" ? "var(--accent)" : settings.button_color_mode === "custom" ? settings.button_color : "var(--primary)";
  if (settings.button_style === "solid") return { backgroundColor: color, borderColor: color, color: "var(--button-text-color)" };
  if (settings.button_style === "pill") return { backgroundColor: color, borderColor: color, color: "var(--button-text-color)", borderRadius: "9999px" };
  if (settings.button_style === "outline") return { backgroundColor: "transparent", borderColor: color, color };
  if (settings.button_style === "soft") return { backgroundColor: `color-mix(in srgb, ${color} 16%, var(--card-bg))`, borderColor: "transparent", color };
  if (settings.button_style === "glass") return { backgroundColor: "color-mix(in srgb, var(--card-bg) 76%, transparent)", borderColor: `color-mix(in srgb, ${color} 35%, var(--card-border))`, color, backdropFilter: "blur(12px)" };
  if (settings.button_style === "underline") return { backgroundColor: "transparent", borderColor: "transparent", borderBottom: `2px solid ${color}`, color };
  return { backgroundColor: "transparent", borderColor: "transparent", color };
}

function buttonDescriptionStyle(settings: MicrositeConfig["settings"]): React.CSSProperties {
  const usesButtonSurface = settings.button_style === "solid" || settings.button_style === "pill";
  return { color: usesButtonSurface ? "color-mix(in srgb, var(--button-text-color) 76%, transparent)" : "var(--card-muted)" };
}

function buttonTitleStyle(settings: MicrositeConfig["settings"]): React.CSSProperties {
  return settings.button_style === "solid" || settings.button_style === "pill" ? { color: "var(--button-text-color)" } : {};
}

function buttonSizeStyle(settings: MicrositeConfig["settings"]): React.CSSProperties {
  if (settings.button_size === "small") return { fontSize: "0.8rem", minHeight: "3.25rem", padding: "0.65rem 0.85rem" };
  if (settings.button_size === "large") return { fontSize: "1rem", minHeight: "4.5rem", padding: "1.15rem 1.25rem" };
  return { fontSize: "0.875rem", minHeight: "4rem", padding: "0.9rem 1rem" };
}

function buttonEffectClass(settings: MicrositeConfig["settings"], effectOverride?: string, triggerOverride?: string) {
  const effect = effectOverride && effectOverride !== "inherit" ? effectOverride : settings.button_effect;
  if (effect === "none") return "";
  const trigger = triggerOverride && triggerOverride !== "inherit" ? triggerOverride : settings.button_effect_trigger ?? "interaction";
  return `${trigger !== "idle" ? `button-effect-${effect}` : ""} ${trigger !== "interaction" ? `button-effect-idle-${effect}` : ""}`.trim();
}

function buttonEffectStyle(speedOverride?: string): React.CSSProperties {
  const speed = speedOverride && speedOverride !== "inherit" ? speedOverride : "medium";
  const interactionDuration = speed === "slow" ? "1.05s" : speed === "fast" ? ".42s" : ".7s";
  const idleDuration = speed === "slow" ? "6.5s" : speed === "fast" ? "2.8s" : "4.5s";
  return { "--button-effect-duration": interactionDuration, "--button-effect-idle-duration": idleDuration } as React.CSSProperties;
}

function buttonStyleClass(settings: MicrositeConfig["settings"]) { return settings.button_style === "pill" ? "rounded-full" : ""; }

function iconSizeValue(size: MicrositeConfig["settings"]["icon_size"]) { return size === "small" ? 18 : size === "large" ? 30 : 23; }
function iconPanelClass(size: MicrositeConfig["settings"]["icon_panel_size"], compact: boolean) { if (compact) return size === "wide" ? "min-h-14 min-w-16" : size === "compact" ? "min-h-14 min-w-12" : "min-h-14 min-w-14"; return size === "wide" ? "min-h-[72px] min-w-20" : size === "compact" ? "min-h-[72px] min-w-14" : "min-h-[72px] min-w-16"; }
function normaliseEmbedUrl(value: string) {
  if (value.startsWith("blob:")) return value;
  if (!isSafeUrl(value)) return "";
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (["youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host)) {
      const videoId = host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : url.searchParams.get("v") || url.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
      if (videoId) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
    }
    if (host === "vimeo.com") {
      const videoId = url.pathname.match(/\/(\d+)/)?.[1];
      if (videoId) return `https://player.vimeo.com/video/${videoId}`;
    }
    return url.toString();
  } catch {
    return "";
  }
}
function isVideoFileUrl(value: string, mimeType = "") {
  if (mimeType.startsWith("video/")) return true;
  try { return /\.(mp4|webm|ogg|mov)$/i.test(new URL(value).pathname); } catch { return false; }
}
function autoplayEmbedUrl(value: string, autoplay: boolean, audio: boolean) {
  try {
    const url = new URL(value);
    if (url.hostname === "www.youtube-nocookie.com" || url.hostname === "player.vimeo.com") {
      if (autoplay) {
        url.searchParams.set("autoplay", "1");
        if (audio) url.searchParams.delete("mute");
        else url.searchParams.set("mute", "1");
      } else {
        url.searchParams.delete("autoplay");
        url.searchParams.delete("mute");
      }
    }
    return url.toString();
  } catch {
    return value;
  }
}

function PublicComponent({ component, config, services, contacts, radius, card, titleText, bodyText, linkSpacingClass }: { component: MicrositeConfig["components"][number]; config: MicrositeConfig; services: MicrositeConfig["services"]; contacts: MicrositeConfig["contacts"]; radius: string; card: string; titleText: string; bodyText: string; linkSpacingClass: string }) {
  const { microsite, settings } = config;
  const separateIcon = settings.icon_card_mode !== "integrated";
  const iconBackground = settings.icon_card_mode === "separate-icon" ? "none" : settings.icon_card_mode === "separate-card" ? "card" : settings.icon_background;
  const iconColor = settings.icon_color_mode === "accent" ? "var(--accent)" : settings.icon_color_mode === "custom" ? settings.icon_color : "var(--primary)";
  const iconShape = settings.icon_shape === "circle" || settings.icon_shape === "pill" ? "rounded-full" : settings.icon_shape === "square" ? "rounded-md" : settings.icon_shape === "none" ? "rounded-none" : settings.icon_shape === "bubble" ? "rounded-[2rem]" : settings.icon_shape === "organic" ? "icon-shape-organic" : settings.icon_shape === "diamond" ? "icon-shape-diamond" : settings.icon_shape === "hexagon" ? "icon-shape-hexagon" : settings.icon_shape === "squircle" ? "icon-shape-squircle" : "rounded-xl";
  const iconFrameClass = `${iconBackground === "card" ? "border shadow-sm" : "border-transparent bg-transparent"} ${iconShape}`;
  const iconFrameStyle = { backgroundColor: iconBackground === "card" ? `color-mix(in srgb, ${iconColor} 12%, var(--card-bg))` : "transparent", borderColor: iconBackground === "card" ? `color-mix(in srgb, ${iconColor} 24%, var(--card-border))` : "transparent", color: iconColor };
  if (component.type === "service_links") return <ServiceLinksSection component={component} settings={settings} services={services} radius={radius} card={card} titleText={titleText} bodyText={bodyText} linkSpacingClass={linkSpacingClass} iconFrameClass={iconFrameClass} iconFrameStyle={iconFrameStyle} />;
  if (component.type === "location") {
    const locationValues = component.config ?? {};
    if (locationValues.show_map === false) return null;
    const latitude = Number(locationValues.latitude ?? microsite.latitude);
    const longitude = Number(locationValues.longitude ?? microsite.longitude);
    const mapTitle = String(locationValues.map_title ?? component.title ?? "Peta lokasi sekolah");
    const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(microsite.title)}&ll=${latitude},${longitude}&z=17&output=embed`;
    return <section aria-label={mapTitle}><SectionHeading component={{ ...component, title: mapTitle }} settings={settings} /><div className={`overflow-hidden ${radius} ${card}`}><div className="aspect-[16/8] min-h-[260px] bg-[#dce8e5]"><iframe title={mapTitle} src={mapUrl} className="h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div><a href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`} target="_blank" rel="noreferrer" className="sr-only">Buka lokasi di Google Maps</a></div></section>;
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
    const iconSize = contactValues.icon_size === "small" ? 15 : contactValues.icon_size === "large" ? 23 : contactValues.icon_size === "medium" ? 18 : iconSizeValue(settings.icon_size);
    const gapClass = contactValues.gap_size === "tight" ? "gap-0" : contactValues.gap_size === "wide" ? "gap-5" : "gap-3";
    const cardStyle = contactValues.card_style === "outline" ? "bg-transparent [box-shadow:none]" : contactValues.card_style === "tinted" ? "bg-[var(--card-tint)] [box-shadow:var(--card-shadow)]" : "bg-[var(--card-bg)] [box-shadow:var(--card-shadow)]";
    const contactCard = `${withCard ? `border ${cardStyle}` : "border-transparent bg-transparent [box-shadow:none]"} text-[var(--card-text)] [border-color:var(--card-border)] [font-family:var(--card-font)]`;
    const animation = contactValues.animation === "fade" ? "contact-card-fade" : contactValues.animation === "lift" || contactValues.animation === "glow" ? "contact-card-glow" : "";
    const buttonAnimation = buttonEffectClass(settings, String(contactValues.button_effect ?? "inherit"), String(contactValues.button_effect_trigger ?? "inherit"));
    const buttonAnimationStyle = buttonEffectStyle(String(contactValues.button_effect_speed ?? "inherit"));
    const layoutClass = displayMode === "compact" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2";
    return <section aria-labelledby={`${component.id}-title`}><div id={`${component.id}-title`}><SectionHeading component={{ ...component, title }} settings={settings} defaultShowTitle /></div><div className={`mx-auto mt-5 max-w-xl ${displayMode === "icon" ? "flex flex-wrap justify-center gap-0" : `grid ${gapClass} ${layoutClass}`}`}>{contacts.map((contact) => { const icon = showIcons ? <span className={`flex shrink-0 items-center justify-center ${separateIcon && displayMode !== "icon" ? "min-h-16 min-w-16 self-stretch" : "h-9 w-9"} ${iconFrameClass}`} style={iconFrameStyle}><AppIcon name={contact.icon} size={iconSize} /></span> : null; const content = <span className="min-w-0 text-left">{showLabels && <span className="block text-xs font-bold uppercase tracking-[.12em] text-[var(--card-muted)]">{contact.label}</span>}{showValues && <span className={`block truncate ${titleText}`}>{contact.value}</span>}</span>; const link = <a key={contact.id} href={isSafeUrl(contact.href) ? contact.href : "#"} target={contact.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" aria-label={contact.label} style={buttonAnimationStyle} className={`flex min-h-16 min-w-0 flex-1 items-center gap-3 p-3.5 transition ${animation} ${buttonAnimation} ${contactRadius} ${contactCard}`} data-button-effect={contactValues.button_effect ?? settings.button_effect} data-button-trigger={contactValues.button_effect_trigger ?? settings.button_effect_trigger}>{displayMode !== "icon" && content}</a>; return separateIcon && displayMode !== "icon" ? <div key={`${contact.id}-row`} className="flex w-full min-w-0 items-stretch gap-3">{icon}{link}</div> : <a key={contact.id} href={isSafeUrl(contact.href) ? contact.href : "#"} target={contact.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" aria-label={contact.label} style={buttonAnimationStyle} className={`flex min-h-16 items-center gap-3 p-3.5 transition ${animation} ${buttonAnimation} ${contactRadius} ${contactCard} ${displayMode === "icon" ? "w-16 justify-center p-2" : ""}`} data-button-effect={contactValues.button_effect ?? settings.button_effect} data-button-trigger={contactValues.button_effect_trigger ?? settings.button_effect_trigger}>{icon}{displayMode !== "icon" && content}</a>; })}</div></section>;
  }
  const values = component.config ?? {};
  const body = String(values.body ?? values.description ?? "");
  const href = String(values.href ?? "");
  if (component.type === "divider") { const style = ["solid", "dashed", "dotted", "double"].includes(String(values.style)) ? String(values.style) : "solid"; const height = Math.max(1, Math.min(8, Number(values.height ?? 1))); const color = isHexColor(String(values.color ?? "")) ? String(values.color) : "var(--card-border)"; const spacing = values.spacing === "compact" ? "my-3" : values.spacing === "airy" ? "my-10" : "my-6"; return <div role="separator" aria-label="Pemisah komponen" className={spacing} style={{ borderTop: `${height}px ${style} ${color}` }} />; }
  if (component.type === "text") { const withCard = values.with_card !== false; const textContent = <><h2 className={titleText}>{component.title}</h2><p className={`mt-3 whitespace-pre-line leading-7 ${bodyText}`}>{body}</p></>; return withCard ? <section className={`border p-5 ${radius} ${card}`}>{textContent}</section> : <section className="px-1 py-2">{textContent}</section>; }
  if (component.type === "image" && isSafeUrl(String(values.image_url ?? ""))) return <section><figure className={`overflow-hidden border ${radius} ${card}`}><Image src={String(values.image_url)} alt={String(values.alt ?? component.title)} width={1200} height={700} className="h-auto w-full object-cover" unoptimized /><figcaption className={`p-4 ${titleText}`}>{component.title}</figcaption></figure></section>;
  if (component.type === "embed") {
    const embedUrl = normaliseEmbedUrl(String(values.embed_url ?? ""));
    if (!embedUrl) return null;
    const autoplay = values.autoplay !== false;
    const autoplayAudio = autoplay && values.autoplay_audio === true;
    return <section aria-labelledby={`${component.id}-title`}><h2 id={`${component.id}-title`} className={`mb-4 text-center font-display text-3xl text-[var(--primary)] ${titleText}`}>{component.title}</h2><div className={`aspect-video overflow-hidden border ${radius} ${card}`}>{isVideoFileUrl(embedUrl, String(values.embed_mime_type ?? "")) ? <video src={embedUrl} className="h-full w-full object-cover" controls autoPlay={autoplay} muted={!autoplayAudio} playsInline preload="metadata" /> : <iframe title={component.title} src={autoplayEmbedUrl(embedUrl, autoplay, autoplayAudio)} className="h-full w-full border-0" loading="lazy" allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />}</div></section>;
  }
  if (["link", "whatsapp", "email", "instagram", "phone"].includes(component.type)) { const icon = <span className={`flex shrink-0 items-center justify-center ${separateIcon ? "min-h-[72px] min-w-16 self-stretch" : "h-11 w-11"} ${iconFrameClass}`} style={iconFrameStyle}><AppIcon name={component.type === "email" ? "mail" : component.type} size={iconSizeValue(settings.icon_size)} /></span>; const linkStyle = { ...buttonStyle(settings), ...buttonSizeStyle(settings), ...buttonEffectStyle(String(values.button_effect_speed ?? "inherit")) }; const effectClass = buttonEffectClass(settings, String(values.button_effect ?? "inherit"), String(values.button_effect_trigger ?? "inherit")); const link = <a href={isSafeUrl(href) ? href : "#"} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" style={linkStyle} className={`group flex min-h-[72px] min-w-0 flex-1 items-center gap-4 border p-4 transition ${effectClass} ${buttonStyleClass(settings)} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${radius} ${card}`} data-button-effect={String(values.button_effect ?? settings.button_effect)} data-button-trigger={String(values.button_effect_trigger ?? settings.button_effect_trigger)}><span className="min-w-0 flex-1"><span className={`block ${titleText}`} style={buttonTitleStyle(settings)}>{component.title}</span>{body && <span className={`mt-1 block leading-5 ${bodyText}`} style={buttonDescriptionStyle(settings)}>{body}</span>}</span><ExternalLink size={18} className="shrink-0 text-[var(--card-muted)]" /></a>; return separateIcon ? <div className="flex w-full min-w-0 items-stretch gap-3">{icon}{link}</div> : <a href={isSafeUrl(href) ? href : "#"} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" style={linkStyle} className={`group flex min-h-[72px] items-center gap-4 border p-4 transition ${effectClass} ${buttonStyleClass(settings)} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${radius} ${card}`} data-button-effect={String(values.button_effect ?? settings.button_effect)} data-button-trigger={String(values.button_effect_trigger ?? settings.button_effect_trigger)}>{icon}<span className="min-w-0 flex-1"><span className={`block ${titleText}`} style={buttonTitleStyle(settings)}>{component.title}</span>{body && <span className={`mt-1 block leading-5 ${bodyText}`} style={buttonDescriptionStyle(settings)}>{body}</span>}</span><ExternalLink size={18} className="shrink-0 text-[var(--card-muted)]" /></a>; }
  return null;
}

function formatDateByStyle(value: Date, style: MicrositeConfig["settings"]["time_date_format"]) {
  const numericParts = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(value);
  const day = numericParts.find((part) => part.type === "day")?.value ?? "00";
  const month = numericParts.find((part) => part.type === "month")?.value ?? "00";
  const year = numericParts.find((part) => part.type === "year")?.value ?? "0000";
  if (style === "short") return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" }).format(value);
  if (style === "dd/mm/yyyy") return `${day}/${month}/${year}`;
  if (style === "dd-mm-yyyy") return `${day}-${month}-${year}`;
  if (style === "yyyy-mm-dd") return `${year}-${month}-${day}`;
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "long", year: "numeric" }).format(value);
}
function timeParts(value: Date, dateFormat: MicrositeConfig["settings"]["time_date_format"]) {
  const weekday = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", weekday: "long" }).format(value);
  const date = formatDateByStyle(value, dateFormat);
  const parts = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(value);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return { weekday, date, time: `${hour}:${minute}`, hour: Number(hour), minute: Number(minute) };
}
function timeSeparatorValue(separator: MicrositeConfig["settings"]["time_separator"]) { return separator === "dot" ? "·" : separator === "dash" ? "—" : separator === "slash" ? "/" : separator === "line" ? "│" : ""; }
function formatJakartaTime(value: Date, settings: MicrositeConfig["settings"]) {
  const { weekday, date, time } = timeParts(value, settings.time_date_format);
  const suffix = settings.time_show_timezone ? " WIB" : "";
  const separator = timeSeparatorValue(settings.time_separator);
  const join = (left: string, right: string) => separator ? `${left} ${separator} ${right}` : `${left} ${right}`;
  if (settings.time_format === "time-only") return `${time}${suffix}`;
  if (settings.time_format === "weekday-time") return `${join(weekday, time)}${suffix}`;
  if (settings.time_format === "date-time") return `${join(date, time)}${suffix}`;
  return `${join(`${weekday}, ${date}`, time)}${suffix}`;
}
function timeFrameClass(settings: MicrositeConfig["settings"], radius: string, card: string) {
  if (settings.time_card_mode === "none") return "";
  if (settings.time_style === "pill") return `${card} rounded-full`;
  if (settings.time_style === "outline") return `${card} rounded-xl bg-transparent shadow-none`;
  if (settings.time_style === "minimal") return `${card} rounded-none border-x-0 border-t-0 bg-transparent shadow-none`;
  return `${card} ${radius}`;
}
function timeFrameStyle(settings: MicrositeConfig["settings"]): React.CSSProperties {
  const legacySize = settings.time_size === "small" ? 14 : settings.time_size === "large" ? 28 : 18;
  const size = Math.max(12, Math.min(48, Number(settings.time_size_custom ?? legacySize)));
  const clockSize = Math.max(30, Math.min(96, size * 2.25));
  const isDigital = settings.time_font_family === "digital";
  const surface = settings.time_style === "minimal" || settings.time_style === "outline" ? { color: "var(--realtime-color)", backgroundColor: "transparent" } : { color: "var(--realtime-color)" };
  return { ...surface, fontFamily: fontFamilyMap[settings.time_font_family], fontSize: `${size}px`, fontVariantNumeric: "tabular-nums", fontWeight: isDigital ? 700 : undefined, letterSpacing: isDigital ? "0.08em" : undefined, "--clock-size": `${clockSize}px` } as unknown as React.CSSProperties;
}
function AnalogClock({ hour, minute }: { hour: number; minute: number }) {
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const minuteAngle = minute * 6;
  return <span className="realtime-analog-clock" style={{ "--clock-hour-angle": `${hourAngle}deg`, "--clock-minute-angle": `${minuteAngle}deg` } as React.CSSProperties} aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <span key={index} className="realtime-analog-clock__tick" style={{ "--clock-index": index } as React.CSSProperties} />)}<span className="realtime-analog-clock__hand realtime-analog-clock__hand--hour" /><span className="realtime-analog-clock__hand realtime-analog-clock__hand--minute" /></span>;
}
function TimeDisplay({ value, settings }: { value: Date; settings: MicrositeConfig["settings"] }) {
  const { hour, minute } = timeParts(value, settings.time_date_format);
  if (settings.time_clock_style === "analog") return <span className="inline-flex items-center gap-2"><AnalogClock hour={hour} minute={minute} />{settings.time_show_timezone && <span>WIB</span>}</span>;
  return formatJakartaTime(value, settings);
}
function SplitTime({ value, settings, radius, card }: { value: Date; settings: MicrositeConfig["settings"]; radius: string; card: string }) {
  const { weekday, date, hour, minute } = timeParts(value, settings.time_date_format);
  const left = settings.time_format === "time-only" ? "Waktu sekarang" : settings.time_format === "weekday-time" ? weekday : settings.time_format === "date-time" ? date : `${weekday}, ${date}`;
  const right = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}${settings.time_show_timezone ? " WIB" : ""}`;
  const separator: string = settings.time_separator;
  const isSeparate = settings.time_card_mode === "separate";
  const segmentClass = isSeparate ? `${timeFrameClass(settings, radius, card)} inline-flex shrink-0 whitespace-nowrap px-4 py-2` : "";
  const rightContent = settings.time_clock_style === "analog" ? <span className="inline-flex items-center gap-2"><AnalogClock hour={hour} minute={minute} />{settings.time_show_timezone && <span>WIB</span>}</span> : right;
  if (separator === "line") {
    return <span className={`${isSeparate ? "inline-flex max-w-full items-center" : "grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,auto)]"} items-center gap-3 text-left`}><span className={`${isSeparate ? "shrink-0" : "min-w-0 truncate"} ${segmentClass}`}>{left}</span><span aria-hidden="true" className="inline-block h-5 w-px shrink-0" style={{ backgroundColor: "currentColor", opacity: 0.45 }} /><span className={`shrink-0 text-right ${segmentClass}`}>{rightContent}</span></span>;
  }
  return <span className={`${isSeparate ? "inline-flex max-w-full items-center" : "grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,auto)]"} items-center gap-3 text-left`}><span className={`${isSeparate ? "shrink-0" : "min-w-0 truncate"} ${segmentClass}`}>{left}</span>{separator !== "none" ? <span aria-hidden="true" className={separator === "line" ? "h-5 w-px bg-current/30" : "text-current/55"}>{separator === "dot" ? "·" : separator === "dash" ? "—" : separator === "slash" ? "/" : ""}</span> : <span aria-hidden="true" className="w-0" />}<span className={`shrink-0 text-right ${segmentClass}`}>{rightContent}</span></span>;
}
function formatVerifiedDate(value?: string | null) { if (!value) return "Not published yet"; return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
function isHexColor(value: string) { return /^#[0-9A-Fa-f]{6}$/.test(value); }
function readableTextColor(value: string, background: string, fallback: string) {
  if (!isHexColor(value) || !isHexColor(background)) return fallback;
  return contrastRatio(value, background) >= 4.5 ? value : fallback;
}
function contrastRatio(first: string, second: string) {
  const luminance = (value: string) => {
    const channels = value.slice(1).match(/../g)?.map((channel) => Number.parseInt(channel, 16) / 255) ?? [0, 0, 0];
    const linear = channels.map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05);
}
function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="relative max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-auto rounded-[1.5rem] bg-white p-6 shadow-2xl sm:p-8"><div className="mb-6 flex items-center justify-between"><h2 className="font-display text-2xl">{title}</h2><button onClick={onClose} aria-label="Tutup modal" className="flex h-11 w-11 items-center justify-center rounded-full bg-paper text-ink/60 hover:bg-sand"><X size={18} /></button></div>{children}</div></div>; }






























