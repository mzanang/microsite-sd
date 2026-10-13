"use client";

import { BarChart3, BookOpen, CheckCircle2, ChevronRight, CircleAlert, Eye, FileText, Image as ImageIcon, LayoutDashboard, LogOut, Menu, Palette, PanelLeftClose, PanelLeftOpen, Settings, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analitik & Insight", icon: BarChart3 },
  { href: "/admin/editor", label: "Editor microsite", icon: FileText },
  { href: "/admin/appearance", label: "Pengaturan tampilan", icon: Palette },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
  { href: "/admin/settings", label: "Tautan & kontak", icon: Settings },
  { href: "/admin/publication", label: "Pratinjau & publikasi", icon: Eye },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  useEffect(() => { if (window.localStorage.getItem("admin-sidebar-visible") === "false") setSidebarVisible(false); }, []);
  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; tone: "success" | "error" }>).detail;
      setToast(detail);
      window.setTimeout(() => setToast(null), 3600);
    };
    window.addEventListener("admin-toast", onToast);
    return () => window.removeEventListener("admin-toast", onToast);
  }, []);

  if (pathname === "/admin/login") return <>{children}</>;
  async function logout() { if (supabaseConfigured()) { await createClient().auth.signOut(); window.location.href = "/admin/login"; } }

  return <div className="min-h-screen bg-[#f5f4fc] text-ink">
    {toast && <div role="status" className={cn("fixed right-4 top-20 z-[60] flex max-w-sm items-start gap-3 rounded-2xl border bg-white px-4 py-3 text-sm font-semibold shadow-2xl sm:right-6", toast.tone === "success" ? "border-emerald-200 text-emerald-800" : "border-red-200 text-red-800")}>{toast.tone === "success" ? <CheckCircle2 size={19} className="mt-0.5 shrink-0" /> : <CircleAlert size={19} className="mt-0.5 shrink-0" />}<span>{toast.message}</span></div>}
    <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-[272px] -translate-x-full flex-col border-r border-[#6048e8]/10 bg-white px-4 py-5 transition-[width,transform] duration-200", sidebarVisible ? "lg:w-[272px]" : "lg:w-[76px]", sidebarVisible && "lg:translate-x-0", open && "translate-x-0", sidebarVisible ? "lg:px-4" : "lg:px-2")}>
      <div className={cn("flex items-center px-3", sidebarVisible ? "justify-between" : "justify-center")}>
        <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-3" aria-label="SD Negeri Dukuhwaru 01"><Image src="/logo.png" alt="" width={46} height={46} className="h-11 w-11 shrink-0 object-contain" /><span className={cn(!sidebarVisible && "lg:hidden")}><span className="block whitespace-nowrap text-[12px] font-extrabold tracking-tight">SD NEGERI DUKUHWARU 01</span><span className="block text-[10px] font-bold uppercase tracking-[.14em] text-ink/45">Microsite admin</span></span></Link>
        <button className="flex h-11 w-11 items-center justify-center rounded-xl text-ink/55 hover:bg-[#6048e8]/5 hover:text-[#6048e8] lg:hidden" aria-label="Tutup menu" onClick={() => setOpen(false)}><X size={19} /></button>
      </div>
      <div className="my-7 h-px bg-ink/10" />
      <p className={cn("px-3 text-[10px] font-bold uppercase tracking-[.18em] text-ink/40", !sidebarVisible && "lg:hidden")}>Kelola microsite</p>
      <nav className="mt-3 space-y-1">{nav.map((item) => { const Icon = item.icon; const active = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href)); return <Link key={item.href} href={item.href} title={item.label} onClick={() => setOpen(false)} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition", !sidebarVisible && "lg:justify-center lg:px-0", active ? "bg-[#6048e8] text-white shadow-[0_8px_18px_rgba(96,72,232,.2)]" : "text-ink/60 hover:bg-[#6048e8]/[.07] hover:text-[#6048e8]")}><Icon size={18} strokeWidth={1.8} /><span className={cn("flex-1", !sidebarVisible && "lg:hidden")}>{item.label}</span>{active && <ChevronRight size={15} className={cn(!sidebarVisible && "lg:hidden")} />}</Link>; })}</nav>
      <div className={cn("mt-auto rounded-2xl bg-[#6048e8]/[.06] p-4", !sidebarVisible && "lg:hidden")}><div className="flex items-center gap-2 text-xs font-bold text-[#6048e8]"><BookOpen size={15} /> Tips hari ini</div><p className="mt-2 text-xs leading-5 text-ink/55">Perubahan disimpan sebagai draf sampai Anda menekan Publikasikan.</p></div>
      <Link href="/" target="_blank" title="Lihat halaman publik" className={cn("mt-3 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink/60 hover:bg-[#6048e8]/[.07] hover:text-[#6048e8]", !sidebarVisible && "lg:justify-center lg:px-0")}><Eye size={18} /><span className={cn(!sidebarVisible && "lg:hidden")}>Lihat halaman publik</span></Link>
    </aside>
    <div className={cn("fixed inset-0 z-30 bg-[#281b73]/30 backdrop-blur-sm lg:hidden", !open && "hidden")} onClick={() => setOpen(false)} />
    <div className={cn(sidebarVisible ? "lg:pl-[272px]" : "lg:pl-[76px]")}>
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#6048e8]/10 bg-white/90 px-4 backdrop-blur-md sm:px-8">
        <button className="flex h-11 w-11 items-center justify-center rounded-xl text-ink/55 hover:bg-[#6048e8]/5 hover:text-[#6048e8] lg:hidden" aria-label="Buka menu" onClick={() => setOpen(true)}><Menu size={20} /></button>
        <button className="hidden h-10 w-10 items-center justify-center rounded-xl text-ink/55 hover:bg-[#6048e8]/5 hover:text-[#6048e8] lg:flex" aria-label={sidebarVisible ? "Sembunyikan sidebar" : "Tampilkan sidebar"} title={sidebarVisible ? "Sembunyikan sidebar" : "Tampilkan sidebar"} onClick={() => { const next = !sidebarVisible; setSidebarVisible(next); window.localStorage.setItem("admin-sidebar-visible", String(next)); }}>{sidebarVisible ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}</button>
        <div className="hidden lg:block"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#6048e8]/55">Ruang kerja admin</p><p className="mt-1 text-sm font-semibold">SD Negeri Dukuhwaru 01</p></div>
        <div className="flex items-center gap-2 sm:gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6048e8]/10 p-2"><Image src="/logo.png" alt="Logo sekolah" width={28} height={28} className="h-full w-full object-contain" /></span><button onClick={logout} className="flex h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-ink/55 hover:bg-[#6048e8]/5 hover:text-[#6048e8]" aria-label="Keluar"><LogOut size={17} /><span className="hidden sm:inline">Keluar</span></button></div>
      </header>
      <main className="mx-auto max-w-[1400px] p-4 sm:p-8">{children}</main>
    </div>
  </div>;
}
