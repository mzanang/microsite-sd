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
  button_effect?: "inherit" | "none" | "lift" | "glow" | "shine" | "pulse" | "shake" | "bounce";
  button_effect_trigger?: "inherit" | "interaction" | "idle" | "both";
  button_effect_speed?: "inherit" | "slow" | "medium" | "fast";
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
  card_radius: "soft" | "round" | "sharp" | "pill" | "organic" | "square";
  element_spacing: "compact" | "comfortable" | "airy";
  card_style: "solid" | "outline" | "tinted" | "glass" | "elevated" | "dashed";
  overlay_opacity: number;
  background_position: string;
  background_url: string;
  banner_url: string;
  logo_url: string;
  link_layout: "stacked" | "horizontal" | "compact" | "cards" | "spotlight";
  card_background: string;
  card_text_color: string;
  card_muted_color: string;
  card_border_color: string;
  card_font_family: "poppins" | "plus-jakarta" | "inter" | "dm-sans";
  card_title_size: "small" | "medium" | "large";
  card_body_size: "small" | "medium" | "large";
  card_text_weight: "normal" | "semibold" | "bold";
  card_shadow: "none" | "soft" | "strong";
  button_style: "card" | "solid" | "outline" | "soft" | "ghost" | "pill" | "glass" | "underline";
  button_size: "small" | "medium" | "large";
  button_color_mode: "primary" | "accent" | "custom";
  button_color: string;
  button_text_color: string;
  button_effect: "none" | "lift" | "glow" | "shine" | "pulse" | "shake" | "bounce";
  button_effect_trigger: "interaction" | "idle" | "both";
  icon_card_mode: "separate" | "integrated" | "separate-icon" | "separate-card";
  icon_background: "card" | "none";
  icon_shape: "square" | "rounded" | "circle" | "pill" | "diamond" | "hexagon" | "squircle";
  icon_color_mode: "primary" | "accent" | "custom";
  icon_color: string;
  icon_size: "small" | "medium" | "large";
  icon_panel_size: "compact" | "balanced" | "wide";
  background_animation: "none" | "float" | "aurora" | "gradient" | "particles" | "clouds" | "rain" | "shimmer" | "waves" | "snow";
  background_animation_color_mode: "primary" | "accent" | "custom";
  background_animation_color: string;
  background_animation_speed: "slow" | "medium" | "fast";
  background_animation_count: number;
  background_animation_opacity: number;
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
