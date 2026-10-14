import { defaultConfig } from "@/lib/default-config";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import type { MicrositeConfig } from "@/types/microsite";

function normalizeSettings(value: Partial<MicrositeConfig["settings"]>) {
  const merged = { ...defaultConfig.settings, ...value };
  const linkLayouts = ["stacked", "horizontal", "compact", "cards", "spotlight"] as const;
  const linkLayout = linkLayouts.includes(merged.link_layout as typeof linkLayouts[number]) ? merged.link_layout : "stacked";
  const timeFormats = ["weekday-date-time", "date-time", "weekday-time", "time-only"] as const;
  const timeDateFormats = ["long", "short", "dd/mm/yyyy", "dd-mm-yyyy", "yyyy-mm-dd"] as const;
  const timeLayouts = ["single", "split"] as const;
  const timeSeparators = ["dot", "dash", "slash", "line", "none"] as const;
  const timeStyles = ["card", "pill", "outline", "minimal"] as const;
  const timePositions = ["left", "center", "right"] as const;
  const timeClockStyles = ["digital", "analog"] as const;
  const timeFontFamilies = ["poppins", "plus-jakarta", "inter", "dm-sans", "digital"] as const;
  const timeSizes = ["small", "medium", "large"] as const;
  const timeCardModes = ["single", "separate", "none"] as const;
  const legacyTimeSize = merged.time_size === "small" ? 14 : merged.time_size === "large" ? 28 : 18;
  const timeSizeCustom = Number.isFinite(Number(value.time_size_custom)) ? Math.max(12, Math.min(48, Number(value.time_size_custom))) : legacyTimeSize;
  return {
    ...merged,
    background_url: merged.background_url || "/bg_hero.webp",
    logo_url: merged.logo_url || "/logo.png",
    link_layout: linkLayout,
    site_title_font_family: merged.site_title_font_family ?? defaultConfig.settings.site_title_font_family,
    site_title_text_weight: merged.site_title_text_weight ?? defaultConfig.settings.site_title_text_weight,
    time_format: timeFormats.includes(merged.time_format as typeof timeFormats[number]) ? merged.time_format : defaultConfig.settings.time_format,
    time_date_format: timeDateFormats.includes(merged.time_date_format as typeof timeDateFormats[number]) ? merged.time_date_format : defaultConfig.settings.time_date_format,
    time_layout: timeLayouts.includes(merged.time_layout as typeof timeLayouts[number]) ? merged.time_layout : defaultConfig.settings.time_layout,
    time_separator: timeSeparators.includes(merged.time_separator as typeof timeSeparators[number]) ? merged.time_separator : defaultConfig.settings.time_separator,
    time_show_timezone: typeof merged.time_show_timezone === "boolean" ? merged.time_show_timezone : defaultConfig.settings.time_show_timezone,
    time_style: timeStyles.includes(merged.time_style as typeof timeStyles[number]) ? merged.time_style : defaultConfig.settings.time_style,
    time_position: timePositions.includes(merged.time_position as typeof timePositions[number]) ? merged.time_position : defaultConfig.settings.time_position,
    time_clock_style: timeClockStyles.includes(merged.time_clock_style as typeof timeClockStyles[number]) ? merged.time_clock_style : defaultConfig.settings.time_clock_style,
    time_font_family: timeFontFamilies.includes(merged.time_font_family as typeof timeFontFamilies[number]) ? merged.time_font_family : defaultConfig.settings.time_font_family,
    time_size: timeSizes.includes(merged.time_size as typeof timeSizes[number]) ? merged.time_size : defaultConfig.settings.time_size,
    time_size_custom: timeSizeCustom,
    time_card_mode: timeCardModes.includes(merged.time_card_mode as typeof timeCardModes[number]) ? merged.time_card_mode : defaultConfig.settings.time_card_mode,
  };
}

export async function getPublishedConfig(): Promise<MicrositeConfig> {
  if (!supabaseConfigured()) return defaultConfig;
  try {
    const supabase = await createClient();
    const { data: site } = await supabase.from("microsites").select("*").eq("slug", "sd-negeri-dukuhwaru-01").eq("publication_status", "published").maybeSingle();
    if (!site) return defaultConfig;
    const [{ data: settings }, { data: components }] = await Promise.all([
      supabase.from("microsite_settings").select("published_settings").eq("microsite_id", site.id).maybeSingle(),
      supabase.from("microsite_components").select("id, component_type, title, is_enabled, sort_order, published_config").eq("microsite_id", site.id).eq("is_published", true).order("sort_order"),
    ]);
    const config = (settings?.published_settings ?? {}) as Partial<MicrositeConfig["settings"]>;
    const serviceComponent = components?.find((item) => item.component_type === "service_links");
    const contactComponent = components?.find((item) => item.component_type === "contact");
    const rawComponents = components ?? defaultConfig.components.map((item) => ({ id: item.id, component_type: item.type, title: item.title, is_enabled: item.is_enabled, sort_order: item.sort_order, published_config: {} }));
    return {
      microsite: { id: site.id, slug: site.slug, title: site.published_title || defaultConfig.microsite.title, description: site.published_description || "", address: site.published_address || defaultConfig.microsite.address, maps_url: site.published_maps_url || defaultConfig.microsite.maps_url, latitude: Number(site.published_latitude ?? defaultConfig.microsite.latitude), longitude: Number(site.published_longitude ?? defaultConfig.microsite.longitude), status: "published", last_published_at: site.last_published_at },
      settings: normalizeSettings(config),
      services: ((serviceComponent?.published_config as { links?: MicrositeConfig["services"] })?.links ?? defaultConfig.services),
      contacts: ((contactComponent?.published_config as { contacts?: MicrositeConfig["contacts"] })?.contacts ?? defaultConfig.contacts),
      components: rawComponents.map((item) => ({ id: item.id, type: item.component_type as MicrositeConfig["components"][number]["type"], title: item.title, is_enabled: item.is_enabled, sort_order: item.sort_order, config: (item.published_config ?? {}) as Record<string, unknown> })),
    };
  } catch {
    return defaultConfig;
  }
}

export async function getAdminConfig(): Promise<MicrositeConfig> {
  if (!supabaseConfigured()) return defaultConfig;
  const supabase = await createClient();
  const { data: site } = await supabase.from("microsites").select("*").eq("slug", "sd-negeri-dukuhwaru-01").maybeSingle();
  if (!site) return defaultConfig;
  const [{ data: settings }, { data: components }] = await Promise.all([
    supabase.from("microsite_settings").select("settings").eq("microsite_id", site.id).maybeSingle(),
    supabase.from("microsite_components").select("id, component_type, title, is_enabled, sort_order, config").eq("microsite_id", site.id).order("sort_order"),
  ]);
  const serviceComponent = components?.find((item) => item.component_type === "service_links");
  const contactComponent = components?.find((item) => item.component_type === "contact");
  const rawComponents = components ?? defaultConfig.components.map((item) => ({ id: item.id, component_type: item.type, title: item.title, is_enabled: item.is_enabled, sort_order: item.sort_order, config: {} }));
  return {
    microsite: { id: site.id, slug: site.slug, title: site.title, description: site.description ?? "", address: site.address ?? "", maps_url: site.maps_url ?? "", latitude: Number(site.latitude ?? defaultConfig.microsite.latitude), longitude: Number(site.longitude ?? defaultConfig.microsite.longitude), status: site.publication_status, last_published_at: site.last_published_at },
    settings: normalizeSettings((settings?.settings ?? {}) as Partial<MicrositeConfig["settings"]>),
    services: ((serviceComponent?.config as { links?: MicrositeConfig["services"] })?.links ?? defaultConfig.services),
    contacts: ((contactComponent?.config as { contacts?: MicrositeConfig["contacts"] })?.contacts ?? defaultConfig.contacts),
    components: rawComponents.map((item) => ({ id: item.id, type: item.component_type as MicrositeConfig["components"][number]["type"], title: item.title, is_enabled: item.is_enabled, sort_order: item.sort_order, config: (item.config ?? {}) as Record<string, unknown> })),
  };
}

export type AdminDashboardAnalytics = {
  totals: { visits: number; unique_visitors: number; page_views: number; interactions: number };
  trend: Array<{ bucket: string; visits: number; unique_visitors: number; page_views: number; interactions: number }>;
};

function adminJakartaDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

function shiftAdminJakartaDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00+07:00`);
  value.setUTCDate(value.getUTCDate() + days);
  return adminJakartaDate(value);
}

function fillAdminDailyTrend(points: AdminDashboardAnalytics["trend"], from: string, to: string) {
  const byDate = new Map(points.map((point) => [point.bucket.slice(0, 10), point]));
  const trend: AdminDashboardAnalytics["trend"] = [];
  for (let date = from; date <= to; date = shiftAdminJakartaDate(date, 1)) {
    const point = byDate.get(date);
    trend.push({
      bucket: point?.bucket ?? `${date}T00:00:00`,
      visits: Number(point?.visits ?? 0),
      unique_visitors: Number(point?.unique_visitors ?? 0),
      page_views: Number(point?.page_views ?? 0),
      interactions: Number(point?.interactions ?? 0),
    });
  }
  return trend;
}

export async function getAdminAnalyticsSnapshot(): Promise<AdminDashboardAnalytics> {
  const empty = { totals: { visits: 0, unique_visitors: 0, page_views: 0, interactions: 0 }, trend: [] };
  if (!supabaseConfigured()) return empty;
  try {
    const today = adminJakartaDate();
    const fromDay = shiftAdminJakartaDate(today, -6);
    const to = new Date(`${today}T00:00:00+07:00`);
    to.setUTCDate(to.getUTCDate() + 1);
    const from = new Date(`${fromDay}T00:00:00+07:00`);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_analytics_summary", { p_microsite_slug: "sd-negeri-dukuhwaru-01", p_from: from.toISOString(), p_to: to.toISOString(), p_granularity: "day" });
    if (error) return empty;
    const summary = data as { totals?: Partial<AdminDashboardAnalytics["totals"]>; trend?: AdminDashboardAnalytics["trend"] } | null;
    return {
      totals: {
        visits: Number(summary?.totals?.visits ?? 0),
        unique_visitors: Number(summary?.totals?.unique_visitors ?? 0),
        page_views: Number(summary?.totals?.page_views ?? 0),
        interactions: Number(summary?.totals?.interactions ?? 0),
      },
      trend: Array.isArray(summary?.trend) ? fillAdminDailyTrend(summary.trend.map((item) => ({ bucket: String(item.bucket), visits: Number(item.visits ?? 0), unique_visitors: Number(item.unique_visitors ?? 0), page_views: Number(item.page_views ?? 0), interactions: Number(item.interactions ?? 0) })), fromDay, today) : fillAdminDailyTrend([], fromDay, today),
    };
  } catch {
    return empty;
  }
}
