import { z } from "zod";

export const serviceLinkSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(160).optional(),
  href: z.string().url(),
  icon: z.string().min(1).max(32),
  icon_url: z.string().max(1000).optional(),
  icon_type: z.enum(["icon", "image"]).optional(),
  button_effect: z.enum(["inherit", "none", "lift", "glow", "shine", "pulse", "shake", "bounce"]).optional(),
  button_effect_trigger: z.enum(["inherit", "interaction", "idle", "both"]).optional(),
  button_effect_speed: z.enum(["inherit", "slow", "medium", "fast"]).optional(),
  is_enabled: z.boolean(),
  sort_order: z.number().int().nonnegative(),
});

export const micrositeDraftSchema = z.object({
  services: z.array(serviceLinkSchema),
  components: z.array(z.object({ id: z.string().min(1).max(80), type: z.enum(["service_links", "location", "contact", "link", "text", "image", "embed", "divider", "whatsapp", "email", "instagram", "phone"]), title: z.string().trim().min(1).max(120), is_enabled: z.boolean(), sort_order: z.number().int().nonnegative(), config: z.record(z.unknown()).optional() })),
  settings: z.object({ primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/), accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/), page_background: z.string().regex(/^#[0-9A-Fa-f]{6}$/), overlay_opacity: z.number().min(0).max(0.8), link_layout: z.enum(["stacked", "horizontal", "compact", "cards", "spotlight"]).optional() }).passthrough(),
});
