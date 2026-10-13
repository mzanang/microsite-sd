import { defaultConfig } from "@/lib/default-config";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import type { MicrositeConfig } from "@/types/microsite";

function normalizeSettings(value: Partial<MicrositeConfig["settings"]>) {
  const merged = { ...defaultConfig.settings, ...value };
  const linkLayouts = ["stacked", "horizontal", "compact", "cards", "spotlight"] as const;
  const linkLayout = linkLayouts.includes(merged.link_layout as typeof linkLayouts[number]) ? merged.link_layout : "stacked";
  return { ...merged, background_url: merged.background_url || "/bg_hero.webp", logo_url: merged.logo_url || "/logo.png", link_layout: linkLayout, site_title_font_family: merged.site_title_font_family ?? defaultConfig.settings.site_title_font_family, site_title_text_weight: merged.site_title_text_weight ?? defaultConfig.settings.site_title_text_weight };
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

export async function getAdminAnalyticsSnapshot(): Promise<AdminDashboardAnalytics> {
  const empty = { totals: { visits: 0, unique_visitors: 0, page_views: 0, interactions: 0 }, trend: [] };
  if (!supabaseConfigured()) return empty;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const today = `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
    const to = new Date(`${today}T00:00:00+07:00`);
    to.setUTCDate(to.getUTCDate() + 1);
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
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
      trend: Array.isArray(summary?.trend) ? summary.trend.map((item) => ({ bucket: String(item.bucket), visits: Number(item.visits ?? 0), unique_visitors: Number(item.unique_visitors ?? 0), page_views: Number(item.page_views ?? 0), interactions: Number(item.interactions ?? 0) })) : [],
    };
  } catch {
    return empty;
  }
}
