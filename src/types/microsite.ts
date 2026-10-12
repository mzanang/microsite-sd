export type ComponentType = "service_links" | "location" | "contact" | "link" | "text" | "image" | "embed" | "divider" | "whatsapp" | "email" | "instagram" | "phone";

export type SocialContact = {
  id: string;
  label: string;
  value: string;
  href: string;
  icon: "instagram" | "youtube" | "tiktok" | "mail" | "whatsapp" | "phone" | "globe";
  is_enabled: boolean;
};

export type ServiceLink = {
  id: string;
  title: string;
  description?: string;
  href: string;
  icon: string;
  icon_url?: string;
  icon_path?: string;
  icon_type?: "icon" | "image";
  is_enabled: boolean;
  sort_order: number;
};

export type MicrositeSettings = {
  primary_color: string;
  accent_color: string;
  page_background: string;
  text_color: string;
  font_family: "poppins" | "plus-jakarta" | "inter" | "dm-sans";
  site_title_font_family: "poppins" | "plus-jakarta" | "inter" | "dm-sans";
  site_title_text_weight: "normal" | "semibold" | "bold";
  content_width: "narrow" | "standard" | "wide";
  card_radius: "soft" | "round" | "sharp";
  element_spacing: "compact" | "comfortable" | "airy";
  card_style: "solid" | "outline" | "tinted";
  overlay_opacity: number;
  background_position: string;
  background_url: string;
  banner_url: string;
  logo_url: string;
  link_layout: "stacked" | "horizontal";
  card_background: string;
  card_text_color: string;
  card_muted_color: string;
  card_border_color: string;
  card_font_family: "poppins" | "plus-jakarta" | "inter" | "dm-sans";
  card_title_size: "small" | "medium" | "large";
  card_body_size: "small" | "medium" | "large";
  card_text_weight: "normal" | "semibold" | "bold";
  card_shadow: "none" | "soft" | "strong";
  icon_card_mode: "separate" | "integrated";
  intro_font_family: "poppins" | "plus-jakarta" | "inter" | "dm-sans";
  intro_text_size: "small" | "medium" | "large";
  intro_text_weight: "normal" | "semibold" | "bold";
  intro_text_color: string;
  hero_profile_position: "bottom" | "center" | "outside";
};

export type MicrositeConfig = {
  microsite: {
    id: string;
    slug: string;
    title: string;
    description: string;
    address: string;
    maps_url: string;
    latitude: number;
    longitude: number;
    status: "draft" | "published";
    last_published_at?: string | null;
  };
  settings: MicrositeSettings;
  services: ServiceLink[];
  contacts: SocialContact[];
  components: Array<{
    id: string;
    type: ComponentType;
    title: string;
    is_enabled: boolean;
    sort_order: number;
    config?: Record<string, unknown>;
  }>;
};
