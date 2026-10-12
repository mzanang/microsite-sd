import { BookOpen, Code2, Globe2, ImageIcon, Instagram, Landmark, Library, Link2, Mail, MapPin, MessageCircle, Minus, Music2, Phone, Play, Send, Text, Youtube } from "lucide-react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = { "book-open": BookOpen, landmark: Landmark, "message-circle": MessageCircle, library: Library, instagram: Instagram, youtube: Youtube, tiktok: Music2, mail: Mail, whatsapp: Send, phone: Phone, globe: Globe2, map: MapPin, play: Play, link: Link2, text: Text, image: ImageIcon, embed: Code2, divider: Minus };

export function AppIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = icons[name] ?? Globe2;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}

export function ServiceIcon({ name, imageUrl, size = 20 }: { name: string; imageUrl?: string; size?: number }) {
  if (imageUrl) return <span className="relative block" style={{ width: size, height: size }}><Image src={imageUrl} alt="" fill sizes={`${size}px`} unoptimized className="object-contain" /></span>;
  return <AppIcon name={name} size={size} />;
}
