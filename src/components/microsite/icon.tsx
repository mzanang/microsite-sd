import { BookMarked, BookOpen, BookOpenCheck, Building2, CalendarDays, ChartNoAxesColumn, ClipboardList, Code2, Download, FileText, Globe2, GraduationCap, Handshake, HelpCircle, ImageIcon, Instagram, Landmark, Library, Link2, Mail, MapPin, MessageCircle, Megaphone, Minus, Music2, Newspaper, Phone, Play, School, Send, Text, UserRound, Users, Youtube } from "lucide-react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = { "book-open": BookOpen, "book-marked": BookMarked, "book-open-check": BookOpenCheck, landmark: Landmark, school: School, building: Building2, "message-circle": MessageCircle, library: Library, instagram: Instagram, youtube: Youtube, tiktok: Music2, mail: Mail, whatsapp: Send, phone: Phone, globe: Globe2, map: MapPin, play: Play, link: Link2, text: Text, image: ImageIcon, embed: Code2, divider: Minus, calendar: CalendarDays, "file-text": FileText, "graduation-cap": GraduationCap, users: Users, user: UserRound, download: Download, megaphone: Megaphone, "clipboard-list": ClipboardList, help: HelpCircle, newspaper: Newspaper, handshake: Handshake, chart: ChartNoAxesColumn };

export function AppIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = icons[name] ?? Globe2;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}

export function ServiceIcon({ name, imageUrl, size = 20 }: { name: string; imageUrl?: string; size?: number }) {
  if (imageUrl) return <span className="relative block" style={{ width: size, height: size }}><Image src={imageUrl} alt="" fill sizes={`${size}px`} unoptimized className="object-contain" /></span>;
  return <AppIcon name={name} size={size} />;
}
