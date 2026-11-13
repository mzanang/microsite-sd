"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { type ComponentType, ReactNode, useEffect, useRef, useState } from "react";
import { BarChart3, BookOpen, CalendarCheck2, ChevronRight, ClipboardCheck, FileText, Home, Image as ImageIcon, LogOut, Menu, MessageCircle, PanelLeftClose, PanelLeftOpen, Paperclip, Settings, ShieldCheck, Star, UsersRound, X, type LucideProps } from "lucide-react";
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { KbProfile } from "@/lib/kb/auth";
import type { DashboardView, RoleDashboardData } from "@/lib/kb/dashboard-data";
import { NotificationBell } from "@/components/community/notification-bell";
import type { WorkspaceProps } from "@/components/community/community-workspace";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import { AccountSecurityDialog } from "@/components/community/account-security";

const LazyCommunityWorkspace = dynamic(() => import("@/components/community/community-workspace").then((module) => module.CommunityWorkspace), { ssr: false, loading: () => null });

export function CommunityWorkspaceLoader(props: WorkspaceProps) {
  return <LazyCommunityWorkspace {...props} />;
}

type MenuItem = { key: string; permissionKey?: string; label: string; href: string; icon: ComponentType<LucideProps> };
type MenuGroup = { label?: string; items: MenuItem[] };

const workspaceHref = (key: string) => `/komunitas-belajar/ruang/${key}`;

const workspaceMenuMap: Record<string, { title: string; description: string }> = {
  upload_sk: { title: "Upload SK Kombel", description: "Kelola atau baca dokumen keputusan komunitas sesuai kewenangan akun." },
  materi: { title: "Materi Kegiatan", description: "Baca bahan kegiatan yang sudah dipublikasikan untuk komunitas." },
  dokumentasi: { title: "Dokumentasi", description: "Ruang dokumentasi kegiatan komunitas SD Negeri Dukuhwaru 01." },
  praktik_baik: { title: "Praktik Baik", description: "Kumpulan pengalaman pembelajaran yang dibagikan oleh anggota komunitas." },
  forum: { title: "Forum Diskusi", description: "Ruang untuk bertukar pertanyaan dan pengalaman pembelajaran." },
  memberikan_tugas: { title: "Buat Tugas Kombel", description: "Tambahkan persyaratan administrasi yang akan dikerjakan oleh anggota." },
  upload_tugas: { title: "Upload Tugas", description: "Kirim dokumen atau link tugas yang diminta Ketua Kombel." },
  tugas_kombel: { title: "Tugas Kombel", description: "Lihat persyaratan yang perlu diselesaikan dan buka ruang pengumpulan." },
  tugas: { title: "Tugas Kombel", description: "Lihat persyaratan yang perlu diselesaikan dan kelola pengumpulan tugas." },
  pengumpulan_anggota: { title: "Tugas Masuk", description: "Pantau nama pengirim, peran, dan tanggal pengumpulan tugas anggota." },
  daftar_hadir: { title: "Daftar Hadir", description: "Ruang untuk mencatat dan membaca kehadiran kegiatan komunitas." },
  monitoring: { title: "Monitoring Anggota", description: "Lihat status pengumpulan anggota tanpa mengubah data mereka." },
  verifikasi: { title: "Verifikasi Tugas", description: "Periksa dokumen dan simpan hasil pemeriksaan tugas." },
  grafik: { title: "Grafik & Statistik", description: "Baca ringkasan data pengumpulan yang tersedia untuk akun Anda." },
  laporan_kegiatan: { title: "Laporan Kegiatan", description: "Unduh ringkasan pengumpulan komunitas berdasarkan data yang tersedia." },
  jadwal_kegiatan: { title: "Jadwal Kegiatan", description: "Lihat jadwal sesi kegiatan dan pertemuan komunitas." },
  profil: { title: "Profil Saya", description: "Periksa identitas akun dan pengaturan akses Anda." },
};

const roleConfig: Record<DashboardView, { label: string; groups: MenuGroup[] }> = {
  ketua: {
    label: "Ketua Kombel",
    groups: [
      { items: [{ key: "dashboard", label: "Dashboard", href: "/komunitas-belajar/ketua/dashboard", icon: Home }] },
      { label: "KEGIATAN KOMUNITAS", items: [{ key: "upload_sk", label: "Upload SK", href: workspaceHref("upload_sk"), icon: FileText }, { key: "materi", label: "Materi Kegiatan", href: workspaceHref("materi"), icon: BookOpen }, { key: "dokumentasi", label: "Dokumentasi", href: workspaceHref("dokumentasi"), icon: ImageIcon }, { key: "praktik_baik", label: "Praktik Baik", href: workspaceHref("praktik_baik"), icon: Star }, { key: "forum", label: "Forum Diskusi", href: workspaceHref("forum"), icon: MessageCircle }, { key: "tugas_kombel", permissionKey: "upload_tugas", label: "Tugas Kombel", href: workspaceHref("tugas_kombel"), icon: ClipboardCheck }] },
      { label: "MANAJEMEN TUGAS", items: [{ key: "memberikan_tugas", label: "Buat Tugas Kombel", href: workspaceHref("memberikan_tugas"), icon: ClipboardCheck }, { key: "pengumpulan_anggota", permissionKey: "upload_tugas", label: "Tugas Masuk", href: workspaceHref("pengumpulan_anggota"), icon: UsersRound }] },
      { label: "MONITORING", items: [{ key: "daftar_hadir", label: "Daftar Hadir", href: workspaceHref("daftar_hadir"), icon: CalendarCheck2 }] },
      { items: [{ key: "profil", label: "Profil Saya", href: workspaceHref("profil"), icon: Settings }] },
    ],
  },
  sekretaris: {
    label: "Sekretaris Kombel",
    groups: [
      { items: [{ key: "dashboard", label: "Dashboard", href: "/komunitas-belajar/sekretaris/dashboard", icon: Home }] },
      { label: "KEGIATAN KOMUNITAS", items: [{ key: "upload_sk", label: "Upload SK", href: workspaceHref("upload_sk"), icon: FileText }, { key: "materi", label: "Materi Kegiatan", href: workspaceHref("materi"), icon: BookOpen }, { key: "dokumentasi", label: "Dokumentasi", href: workspaceHref("dokumentasi"), icon: ImageIcon }, { key: "praktik_baik", label: "Praktik Baik", href: workspaceHref("praktik_baik"), icon: Star }, { key: "forum", label: "Forum Diskusi", href: workspaceHref("forum"), icon: MessageCircle }, { key: "tugas_kombel", permissionKey: "upload_tugas", label: "Tugas Kombel", href: workspaceHref("tugas_kombel"), icon: ClipboardCheck }] },
      { label: "MANAJEMEN TUGAS", items: [{ key: "memberikan_tugas", label: "Buat Tugas Kombel", href: workspaceHref("memberikan_tugas"), icon: ClipboardCheck }, { key: "pengumpulan_anggota", permissionKey: "upload_tugas", label: "Tugas Masuk", href: workspaceHref("pengumpulan_anggota"), icon: UsersRound }] },
      { label: "MONITORING", items: [{ key: "daftar_hadir", label: "Daftar Hadir", href: workspaceHref("daftar_hadir"), icon: CalendarCheck2 }] },
      { items: [{ key: "profil", label: "Profil Saya", href: workspaceHref("profil"), icon: Settings }] },
    ],
  },
  anggota: {
    label: "Anggota Kombel",
    groups: [
      { items: [{ key: "dashboard", label: "Dashboard", href: "/komunitas-belajar/anggota/dashboard", icon: Home }] },
      { label: "KEGIATAN KOMUNITAS", items: [{ key: "materi", label: "Materi Kegiatan", href: workspaceHref("materi"), icon: BookOpen }, { key: "forum", label: "Forum Diskusi", href: workspaceHref("forum"), icon: MessageCircle }, { key: "tugas_kombel", permissionKey: "upload_tugas", label: "Tugas Kombel", href: workspaceHref("tugas_kombel"), icon: ClipboardCheck }, { key: "daftar_hadir", label: "Daftar Hadir", href: workspaceHref("daftar_hadir"), icon: CalendarCheck2 }] },
      { items: [{ key: "profil", label: "Profil Saya", href: workspaceHref("profil"), icon: Settings }] },
    ],
  },
  ks: {
    label: "Kepala Sekolah",
    groups: [
      { items: [{ key: "dashboard", label: "Dashboard", href: "/komunitas-belajar/ks/dashboard", icon: Home }] },
      { label: "KEGIATAN KOMUNITAS", items: [{ key: "upload_sk", label: "Upload SK", href: workspaceHref("upload_sk"), icon: FileText }, { key: "materi", label: "Materi Kegiatan", href: workspaceHref("materi"), icon: BookOpen }, { key: "dokumentasi", label: "Dokumentasi", href: workspaceHref("dokumentasi"), icon: ImageIcon }, { key: "praktik_baik", label: "Praktik Baik", href: workspaceHref("praktik_baik"), icon: Star }, { key: "forum", label: "Forum Diskusi", href: workspaceHref("forum"), icon: MessageCircle }, { key: "upload_tugas", label: "Tugas Masuk", href: workspaceHref("upload_tugas"), icon: Paperclip }] },
      { label: "MONITORING", items: [{ key: "monitoring", label: "Monitoring Anggota", href: workspaceHref("monitoring"), icon: UsersRound }, { key: "verifikasi", label: "Verifikasi Tugas", href: workspaceHref("verifikasi"), icon: ShieldCheck }, { key: "grafik", label: "Grafik & Statistik", href: workspaceHref("grafik"), icon: BarChart3 }, { key: "laporan_kegiatan", permissionKey: "monitoring", label: "Laporan Kegiatan", href: workspaceHref("laporan_kegiatan"), icon: FileText }] },
      { label: "INFORMASI", items: [{ key: "jadwal_kegiatan", permissionKey: "daftar_hadir", label: "Jadwal Kegiatan", href: workspaceHref("jadwal_kegiatan"), icon: CalendarCheck2 }, { key: "profil", label: "Profil Saya", href: workspaceHref("profil"), icon: Settings }] },
    ],
  },
  pengawas: {
    label: "Pengawas Dabin",
    groups: [
      { items: [{ key: "dashboard", label: "Dashboard", href: "/komunitas-belajar/pengawas/dashboard", icon: Home }] },
      { label: "KEGIATAN KOMUNITAS", items: [{ key: "upload_sk", label: "Upload SK", href: workspaceHref("upload_sk"), icon: FileText }, { key: "materi", label: "Materi Kegiatan", href: workspaceHref("materi"), icon: BookOpen }, { key: "dokumentasi", label: "Dokumentasi", href: workspaceHref("dokumentasi"), icon: ImageIcon }, { key: "praktik_baik", label: "Praktik Baik", href: workspaceHref("praktik_baik"), icon: Star }, { key: "forum", label: "Forum Diskusi", href: workspaceHref("forum"), icon: MessageCircle }, { key: "upload_tugas", label: "Tugas Masuk", href: workspaceHref("upload_tugas"), icon: Paperclip }] },
      { label: "MONITORING", items: [{ key: "monitoring", label: "Monitoring Anggota", href: workspaceHref("monitoring"), icon: UsersRound }, { key: "verifikasi", label: "Monitoring Tugas", href: workspaceHref("verifikasi"), icon: ShieldCheck }, { key: "grafik", label: "Grafik & Statistik", href: workspaceHref("grafik"), icon: BarChart3 }, { key: "laporan_kegiatan", permissionKey: "monitoring", label: "Laporan Kegiatan", href: workspaceHref("laporan_kegiatan"), icon: FileText }] },
      { label: "INFORMASI", items: [{ key: "jadwal_kegiatan", permissionKey: "daftar_hadir", label: "Jadwal Kegiatan", href: workspaceHref("jadwal_kegiatan"), icon: CalendarCheck2 }, { key: "profil", label: "Profil Saya", href: workspaceHref("profil"), icon: Settings }] },
    ],
  },
};

const toneClasses = { blue: "bg-[#e8f1ff] text-[#1264c5]", green: "bg-[#e5f9f0] text-[#159b6c]", purple: "bg-[#f1eaff] text-[#7145d8]", orange: "bg-[#fff2df] text-[#d77a00]" };

export function RoleDashboard({ profile, view, data }: { profile: KbProfile; view: DashboardView; data: RoleDashboardData }) {
  return <RoleDashboardShell profile={profile} view={view} data={data}><DashboardContent profile={profile} view={view} data={data} /><DashboardTaskSummary view={view} requirements={data.requirements} /></RoleDashboardShell>;
}

export function RoleDashboardShell({ profile, view, data, children, pageTitle = "Dashboard", pageDescription }: { profile: KbProfile; view: DashboardView; data: RoleDashboardData; children: ReactNode; pageTitle?: string; pageDescription?: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuBadges, setMenuBadges] = useState(data.menuBadges);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const config = { ...roleConfig[view], groups: roleConfig[view].groups.map((group) => ({ ...group, items: group.items.map((item) => { const count = menuBadges[item.key] ?? menuBadges[item.permissionKey ?? ""] ?? 0; if (!count) return item; const Icon = item.icon; const BadgeIcon = (props: LucideProps) => <span className="relative inline-flex"><Icon {...props} /><span className="absolute -right-2 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-[#ef3340] px-1 text-[9px] font-extrabold leading-4 text-white">{count > 99 ? "99+" : count}</span></span>; return { ...item, icon: BadgeIcon }; }) })) };
  const allowedMenus = new Map(data.permissions.map((permission) => [permission.menu_key, permission.access_level]));

  // Dynamically derive current page title & description when inside workspace routes
  const currentMenuKey = pathname?.startsWith("/komunitas-belajar/ruang/")
    ? pathname.split("/komunitas-belajar/ruang/")[1]?.split("?")[0]
    : null;
  const matchedMenu = currentMenuKey ? workspaceMenuMap[currentMenuKey] : null;
  const currentTitle = matchedMenu?.title ?? pageTitle;
  const currentDescription = matchedMenu?.description ?? pageDescription ?? (view === "ks" || view === "pengawas" ? "Monitoring dan Evaluasi Komunitas Belajar Guru" : "Ruang kerja Komunitas Belajar Guru");

  useEffect(() => setMenuBadges(data.menuBadges), [data.menuBadges]);

  useEffect(() => {
    const refreshBadges = async () => {
      const response = await fetch("/api/komunitas-belajar/menu-badges", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (response.ok) setMenuBadges(body.badges ?? {});
    };
    const interval = window.setInterval(() => void refreshBadges(), 60_000);
    if (!supabaseConfigured()) return () => window.clearInterval(interval);
    const supabase = createClient();
    const channel = supabase.channel(`kb-sidebar-badges-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_submissions" }, () => void refreshBadges())
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_reviews" }, () => void refreshBadges())
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_attendance_records" }, () => void refreshBadges())
      .on("postgres_changes", { event: "*", schema: "public", table: "kb_attendance_sessions" }, () => void refreshBadges())
      .subscribe();
    return () => { window.clearInterval(interval); void supabase.removeChannel(channel); };
  }, [profile.id]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) { if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) setProfileOpen(false); }
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setProfileOpen(false); }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeOnOutsideClick); document.removeEventListener("keydown", closeOnEscape); };
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("kb-sidebar-collapsed");
    if (saved === "true") setSidebarCollapsed(true);
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("kb-sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <div id="top" className="min-h-screen bg-[#f4f7fd] text-[#122e62]">
      <Sidebar
        config={config}
        allowedMenus={allowedMenus}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className={`transition-[padding] duration-200 ${sidebarCollapsed ? "lg:pl-[84px]" : "lg:pl-[282px]"}`}>
        <header className="sticky top-0 z-30 border-b border-[#dbe6f5] bg-white/95 backdrop-blur">
          <div className="flex min-h-[76px] items-center justify-between gap-4 px-5 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#123e77] hover:bg-[#edf4ff] lg:hidden"
                aria-label="Buka menu"
              >
                <Menu size={23} />
              </button>
              <button
                type="button"
                onClick={toggleSidebar}
                className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#123e77] hover:bg-[#edf4ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1264c5] lg:inline-flex"
                aria-label={sidebarCollapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar"}
                aria-expanded={!sidebarCollapsed}
              >
                {sidebarCollapsed ? <PanelLeftOpen size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}
              </button>
              <div className="hidden h-10 w-px bg-[#dbe6f5] sm:block" />
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#edf4ff] text-[#1264c5]">
                  <Home size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-extrabold leading-tight text-[#102d62] sm:text-xl">
                    {currentTitle}
                  </h1>
                  <p className="truncate text-xs text-[#6683a6]">
                    {currentDescription}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell initialCount={data.notificationCount} />
              <div ref={profileMenuRef} className="relative border-l border-[#dbe6f5] pl-3 sm:pl-4">
                <button
                  type="button"
                  onClick={() => setProfileOpen((current) => !current)}
                  className="flex min-h-12 items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-[#f4f8ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1264c5]"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e4eefb]">
                    <Image src="/logo.png" alt="" width={40} height={40} className="h-10 w-10 object-contain" />
                  </span>
                  <span className="hidden min-w-0 sm:block">
                    <span className="block max-w-[190px] truncate text-sm font-extrabold text-[#102d62]">
                      {profile.full_name}
                    </span>
                    <span className="block text-xs text-[#6683a6]">{config.label}</span>
                  </span>
                  <ChevronRight
                    size={16}
                    className={`hidden shrink-0 text-[#34577f] transition sm:block ${profileOpen ? "rotate-90" : ""}`}
                    aria-hidden="true"
                  />
                </button>
                {profileOpen && (
                  <div
                    className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-2xl border border-[#dbe6f5] bg-white p-2 shadow-[0_18px_45px_rgba(18,58,112,.18)]"
                    role="menu"
                  >
                    <div className="border-b border-[#edf2f8] px-3 py-3">
                      <p className="truncate text-sm font-extrabold text-[#102d62]">{profile.full_name}</p>
                      <p className="mt-1 text-xs text-[#6683a6]">{config.label}</p>
                    </div>
                    <Link
                      href={workspaceHref("profil")}
                      prefetch={true}
                      onClick={() => setProfileOpen(false)}
                      className="mt-2 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#34577f] hover:bg-[#edf4ff] hover:text-[#1264c5]"
                      role="menuitem"
                    >
                      <Settings size={17} aria-hidden="true" /> Profil Saya
                    </Link>
                    <button
                      type="button"
                      onClick={() => { setProfileOpen(false); setSecurityOpen(true); }}
                      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-[#34577f] hover:bg-[#edf4ff] hover:text-[#1264c5]"
                      role="menuitem"
                    >
                      <ShieldCheck size={17} aria-hidden="true" /> Keamanan Akun
                    </button>
                    <form action="/api/komunitas-belajar/auth/logout" method="post">
                      <button
                        type="submit"
                        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-[#b42318] hover:bg-[#fff1f0]"
                        role="menuitem"
                      >
                        <LogOut size={17} aria-hidden="true" /> Keluar
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] space-y-5 px-4 py-5 sm:px-6 lg:px-7 xl:px-8">
          {children}
        </main>
      </div>
      <AccountSecurityDialog profile={profile} open={securityOpen} onOpenChange={setSecurityOpen} />
    </div>
  );
}

function Sidebar({ config, allowedMenus, collapsed, mobileOpen, onClose }: { config: typeof roleConfig[DashboardView]; allowedMenus: Map<string, string>; collapsed: boolean; mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[#071d45]/50 transition lg:hidden ${mobileOpen ? "visible opacity-100" : "invisible opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[282px] flex-col bg-[#09245e] text-white shadow-2xl transition-[width,transform] duration-200 lg:translate-x-0 ${
          collapsed ? "lg:w-[84px]" : "lg:w-[282px]"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className={`flex min-h-[104px] items-center border-b border-white/10 ${collapsed ? "justify-between px-5 lg:justify-center lg:px-3" : "justify-between px-5"}`}>
          <Link
            href="/komunitas-belajar"
            className={`flex items-center gap-3 ${collapsed ? "lg:justify-center" : ""}`}
            onClick={onClose}
            aria-label="Komunitas Belajar Guru"
          >
            <Image src="/logo.png" alt="" width={48} height={48} className="h-12 w-12 shrink-0 object-contain" />
            <span className={collapsed ? "lg:sr-only" : ""}>
              <span className="block text-sm font-extrabold">Komunitas Belajar Guru</span>
              <span className="mt-1 block text-xs text-white/70">SD Negeri Dukuhwaru 01</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 lg:hidden"
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className={`min-h-0 flex-1 overflow-y-auto py-5 ${collapsed ? "px-3 lg:px-2" : "px-4"}`}>
          {config.groups.map((group, groupIndex) => {
            const items = group.items.filter((item) => allowedMenus.has(item.permissionKey ?? item.key));
            if (!items.length) return null;
            return (
              <div key={`${group.label ?? "main"}-${groupIndex}`} className={groupIndex ? "mt-6" : ""}>
                {group.label && (
                  <p className={collapsed ? "mb-2 px-3 text-[11px] font-bold tracking-[.12em] text-[#9ec7ff] lg:sr-only" : "mb-2 px-3 text-[11px] font-bold tracking-[.12em] text-[#9ec7ff]"}>
                    {group.label}
                  </p>
                )}
                <div className="space-y-1">
                  {items.map((item) => {
                    const isActive = pathname === item.href || (item.key === "dashboard" && pathname?.endsWith("/dashboard"));
                    return (
                      <Link
                        key={`${item.key}-${item.label}`}
                        href={item.href}
                        prefetch={true}
                        onClick={onClose}
                        className={`flex min-h-11 items-center gap-3 rounded-xl text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9ec7ff] ${
                          isActive
                            ? "bg-[#1453b8] text-white font-bold shadow-sm ring-1 ring-white/10"
                            : "font-semibold text-white/80 hover:bg-white/10 hover:text-white"
                        } ${collapsed ? "px-3 lg:justify-center lg:px-2" : "px-3"}`}
                        aria-label={collapsed ? item.label : undefined}
                        title={collapsed ? item.label : undefined}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <item.icon size={18} aria-hidden="true" />
                        <span className={collapsed ? "lg:sr-only" : ""}>{item.label}</span>
                        {item.href.startsWith("/") && (
                          <ChevronRight
                            className={`ml-auto size-[15px] transition-transform ${collapsed ? "lg:hidden" : ""} ${isActive ? "text-white" : "text-white/40"}`}
                            aria-hidden="true"
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className={`border-t border-white/10 ${collapsed ? "p-2" : "p-4"}`}>
          {!collapsed && (
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs font-bold text-white/70">Peran aktif</p>
              <p className="mt-1 text-sm font-extrabold">{config.label}</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function DashboardContent({ profile, view, data }: { profile: KbProfile; view: DashboardView; data: RoleDashboardData }) {
  return <><section className="rounded-xl border border-[#cfe0f5] bg-white px-5 py-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Aktivitas komunitas</p><p className="mt-1 text-lg font-extrabold text-[#173f70]">Ringkasan untuk {profile.full_name}</p><p className="mt-1 text-sm text-[#6683a6]">Data statistik mengikuti aktivitas akun dan kewenangan peran Anda.</p></section><DashboardContentBody profile={profile} view={view} data={data} /></>;
}

function maskIdentifier(identifier?: string | null): string {
  if (!identifier) return "Belum diatur";
  const str = identifier.trim();
  if (str.length <= 4) return str;
  return `${str.slice(0, 4)}${"X".repeat(str.length - 4)}`;
}

function DashboardContentBody({ profile, view, data }: { profile: KbProfile; view: DashboardView; data: RoleDashboardData }) {
  const statusTotal = data.status.reduce((sum, item) => sum + item.value, 0);
  return <><section className="relative overflow-hidden rounded-2xl bg-[#075bc5] px-6 py-7 text-white shadow-[0_12px_30px_rgba(15,91,197,.18)] sm:px-9 sm:py-8"><div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(4,77,174,.95),rgba(5,100,211,.72),rgba(5,100,211,.2))]" /><div className="pointer-events-none absolute inset-0 bg-cover bg-right opacity-25" style={{ backgroundImage: "url('/bg_kombel.webp')" }} /><div className="relative max-w-3xl"><div className="flex items-center gap-3"><BookOpen size={40} strokeWidth={1.8} aria-hidden="true" /><div><p className="text-xs font-bold uppercase tracking-[.18em] text-white/75">Komunitas Belajar Guru</p><h2 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">{view === "anggota" ? `Selamat datang, ${profile.full_name}` : "Komunitas Belajar Guru"}</h2></div></div><p className="mt-4 max-w-2xl text-sm leading-6 text-white/80">{view === "anggota" ? "Selesaikan tugas, ikuti kegiatan, dan pantau perkembangan administrasi Anda." : "Bersama belajar, berbagi, dan berinovasi untuk pendidikan yang lebih baik."}</p></div></section><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{data.stats.map((stat) => <article key={stat.label} className={`rounded-2xl border border-white/70 p-5 shadow-[0_8px_22px_rgba(23,83,158,.06)] ${toneClasses[stat.tone]}`}><div className="flex items-center justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/75"><BarChart3 size={22} aria-hidden="true" /></span><p className="text-3xl font-extrabold tracking-tight">{stat.value}</p></div><p className="mt-4 text-sm font-bold">{stat.label}</p></article>)}</section><section id="statistics" className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.8fr)]"><article className="rounded-2xl border border-[#dbe6f5] bg-white p-5 shadow-[0_8px_22px_rgba(23,83,158,.05)] sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Aktivitas komunitas</p><h2 className="mt-1 text-xl font-extrabold text-[#102d62]">Pengumpulan dan pemeriksaan</h2></div><span className="rounded-lg bg-[#edf4ff] px-3 py-2 text-xs font-bold text-[#1264c5]">6 bulan terakhir</span></div><div className="mt-5 h-[250px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.chart} margin={{ top: 8, right: 8, bottom: 4, left: -20 }}><CartesianGrid stroke="#e6eef8" vertical={false} /><XAxis dataKey="month" tick={{ fill: "#6683a6", fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: "#6683a6", fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dbe6f5", fontSize: 12 }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /><Line type="monotone" dataKey="submissions" name="Pengumpulan" stroke="#1473e6" strokeWidth={3} dot={{ r: 4, fill: "#1473e6" }} /><Line type="monotone" dataKey="reviewed" name="Pemeriksaan" stroke="#16b979" strokeWidth={3} dot={{ r: 4, fill: "#16b979" }} /></LineChart></ResponsiveContainer></div></article><article id="status" className="rounded-2xl border border-[#dbe6f5] bg-white p-5 shadow-[0_8px_22px_rgba(23,83,158,.05)] sm:p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Ringkasan status</p><h2 className="mt-1 text-xl font-extrabold text-[#102d62]">Status pengumpulan</h2><div className="mt-3 h-[190px] w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.status} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={3}>{data.status.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dbe6f5", fontSize: 12 }} /></PieChart></ResponsiveContainer></div><p className="-mt-28 text-center text-2xl font-extrabold text-[#102d62]">{statusTotal}</p><p className="mt-20 text-center text-xs font-semibold text-[#6683a6]">Total data terukur</p><div className="mt-4 space-y-2">{data.status.map((item) => <div key={item.name} className="flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-2 font-semibold text-[#34577f]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><span className="font-extrabold text-[#102d62]">{item.value}</span></div>)}</div></article></section><section id="activities" className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]"><article id="members" className="rounded-2xl border border-[#dbe6f5] bg-white p-5 shadow-[0_8px_22px_rgba(23,83,158,.05)] sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Aktivitas terbaru</p><h2 className="mt-1 text-xl font-extrabold text-[#102d62]">Perkembangan komunitas</h2></div><span className="text-xs font-semibold text-[#6683a6]">{data.scopeNote}</span></div>{data.activities.length ? <div className="mt-5 divide-y divide-[#edf2f8]">{data.activities.map((activity, index) => <div key={`${activity.title}-${activity.date}-${index}`} className="flex gap-3 py-4 first:pt-0"><span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f1ff] text-[#1264c5]"><ClipboardCheck size={17} aria-hidden="true" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm font-bold text-[#173f70]">{activity.title}</p><time className="text-xs font-semibold text-[#6683a6]">{activity.date}</time></div><p className="mt-1 text-xs leading-5 text-[#6683a6]">{activity.description}</p><span className="mt-2 inline-flex rounded-md bg-[#edf4ff] px-2 py-1 text-[11px] font-bold text-[#1264c5]">{activity.status}</span></div></div>)}</div> : <EmptyState title="Belum ada aktivitas" description="Aktivitas akan muncul setelah ada pengumpulan atau pemeriksaan yang tersimpan." />}</article><article id="profile" className="rounded-2xl border border-[#dbe6f5] bg-white p-5 shadow-[0_8px_22px_rgba(23,83,158,.05)] sm:p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Profil akses</p><h2 className="mt-1 text-xl font-extrabold text-[#102d62]">{profile.full_name}</h2><div className="mt-5 space-y-3 text-sm"><InfoRow label="Peran" value={roleConfig[view].label} /><InfoRow label="Identitas" value={maskIdentifier(profile.login_identifier)} /><InfoRow label="Status" value={profile.is_active ? "Aktif" : "Nonaktif"} /></div><Link href="/komunitas-belajar/keamanan-akun" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#bfd2e8] px-4 text-sm font-bold text-[#1264c5] hover:border-[#1970d2] hover:bg-[#edf4ff]">Keamanan Akun & Ubah Password <ChevronRight size={16} /></Link></article></section></>;
}

function InfoRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 border-b border-[#edf2f8] pb-3"><span className="text-[#6683a6]">{label}</span><span className="text-right font-bold text-[#173f70]">{value}</span></div>; }
function DashboardTaskSummary({ view, requirements }: { view: DashboardView; requirements: RoleDashboardData["requirements"] }) {
  if (view !== "anggota") return null;
  return (
    <section className="rounded-2xl border border-[#dbe6f5] bg-white p-5 shadow-[0_8px_22px_rgba(23,83,158,.05)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#1970d2]">Manajemen tugas</p>
          <h2 className="mt-1 text-xl font-extrabold text-[#102d62]">Tugas Kombel</h2>
          <p className="mt-1 text-sm text-[#6683a6]">Tugas aktif yang perlu Anda selesaikan.</p>
        </div>
        <Link href="/komunitas-belajar/ruang/tugas_kombel" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1264c5] px-3 text-xs font-bold text-white hover:bg-[#0d4e9b]">
          Buka Tugas Kombel <ChevronRight size={15} aria-hidden="true" />
        </Link>
      </div>
      {requirements.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {requirements.map((requirement) => {
            const locked = requirement.submission_status === "lengkap";
            const needsRevision = requirement.submission_status === "perlu_perbaikan";
            const isRevisionPending = requirement.submission_status === "menunggu_verifikasi_ulang";

            const badgeText = locked
              ? "Sudah Diverifikasi Lengkap"
              : needsRevision
              ? "Perlu Perbaikan"
              : isRevisionPending
              ? "Menunggu Verifikasi Ulang"
              : requirement.submission_id
              ? "Menunggu Verifikasi"
              : "Belum Dikerjakan";

            const badgeClass = locked
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : needsRevision
              ? "bg-red-50 text-red-700 border border-red-200"
              : isRevisionPending
              ? "bg-sky-50 text-sky-700 border border-sky-200"
              : requirement.submission_id
              ? "bg-amber-50 text-amber-800 border border-amber-200"
              : "bg-[#e8f1ff] text-[#1264c5]";

            const content = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-[#173f70]">{requirement.name}</h3>
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${badgeClass}`}>
                    {badgeText}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#6683a6]">{requirement.description || "Tidak ada keterangan tambahan."}</p>
                <p className="mt-3 text-xs font-semibold text-[#536f92]">
                  Batas waktu: {requirement.due_at ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(requirement.due_at)) : "Tidak dibatasi"}
                </p>
                <span className={`mt-3 inline-flex text-xs font-bold ${locked ? "text-[#64748b]" : needsRevision ? "text-red-700" : "text-[#1264c5]"}`}>
                  {locked ? "Terkunci setelah verifikasi KS" : needsRevision ? "Kirim revisi tugas" : "Buka pengumpulan"}
                </span>
              </>
            );

            return locked ? (
              <article key={requirement.id} className="cursor-not-allowed rounded-xl border border-[#e1eaf4] bg-[#f8fafc] p-4 opacity-80">
                {content}
              </article>
            ) : (
              <Link
                key={requirement.id}
                href={`/komunitas-belajar/ruang/upload_tugas?requirement_id=${requirement.id}`}
                className={`block rounded-xl border p-4 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  needsRevision
                    ? "border-red-200 bg-red-50/20 hover:border-red-400 hover:bg-red-50/40"
                    : "border-[#e1eaf4] hover:border-[#1264c5] hover:bg-[#f8fbff]"
                }`}
              >
                {content}
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Belum ada tugas aktif" description="Ketua Kombel belum menambahkan tugas untuk Anda." />
      )}
    </section>
  );
}
function EmptyState({ title, description }: { title: string; description: string }) { return <div className="mt-5 rounded-xl border border-dashed border-[#bfd2e8] bg-[#f8fbff] px-5 py-8 text-center"><p className="text-sm font-bold text-[#34577f]">{title}</p><p className="mt-2 text-xs leading-5 text-[#6683a6]">{description}</p></div>; }
