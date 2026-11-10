"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Clock3 } from "lucide-react";

type NotificationItem = { id: string; notification_type: string; title: string; body: string; link_url: string | null; read_at: string | null; created_at: string; available_at: string };

export function NotificationBell({ initialCount }: { initialCount: number }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialCount);

  const load = useCallback(async () => {
    const response = await fetch("/api/komunitas-belajar/notifications", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return;
    setNotifications(body.notifications ?? []);
    setUnreadCount(body.unreadCount ?? 0);
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(interval);
  }, [load]);

  async function markRead(id: string) {
    await fetch("/api/komunitas-belajar/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    setUnreadCount((current) => Math.max(0, current - 1));
  }

  async function markAllRead() {
    await fetch("/api/komunitas-belajar/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ all: true }) });
    setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
  }

  return <div className="relative">
    <button type="button" onClick={() => setOpen((current) => !current)} className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#123e77] hover:bg-[#edf4ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1264c5]" aria-label={unreadCount ? `${unreadCount} notifikasi belum dibaca` : "Notifikasi"} aria-expanded={open} aria-haspopup="dialog"><Bell size={21} aria-hidden="true" />{unreadCount > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef3340] px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}</button>
    {open && <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-[#dbe6f5] bg-white shadow-[0_18px_45px_rgba(18,58,112,.18)]" role="dialog" aria-label="Notifikasi">
      <div className="flex items-center justify-between gap-3 border-b border-[#edf2f8] px-4 py-3"><div><p className="text-sm font-extrabold text-[#102d62]">Notifikasi</p><p className="mt-1 text-xs text-[#6683a6]">Informasi baru untuk akun Anda</p></div><button type="button" onClick={() => void markAllRead()} disabled={!unreadCount} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-[#1264c5] hover:bg-[#edf4ff] disabled:cursor-not-allowed disabled:opacity-40"><CheckCheck size={14} aria-hidden="true" />Tandai dibaca</button></div>
      <div className="max-h-[min(70vh,24rem)] overflow-y-auto p-2">{notifications.length ? notifications.map((item) => <div key={item.id} className={`rounded-xl p-3 ${item.read_at ? "" : "bg-[#f0f6ff]"}`}>{item.link_url ? <Link href={item.link_url} onClick={() => { void markRead(item.id); setOpen(false); }} className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1264c5]"><NotificationContent item={item} /></Link> : <button type="button" onClick={() => void markRead(item.id)} className="block w-full text-left"><NotificationContent item={item} /></button>}</div>) : <div className="px-4 py-8 text-center"><Bell className="mx-auto text-[#9bb2ce]" size={24} aria-hidden="true" /><p className="mt-3 text-sm font-bold text-[#34577f]">Belum ada notifikasi</p><p className="mt-1 text-xs leading-5 text-[#6683a6]">Tugas baru dan pengingat presensi akan muncul di sini.</p></div>}</div>
    </div>}
  </div>;
}

function NotificationContent({ item }: { item: NotificationItem }) {
  return <><div className="flex items-start gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#1264c5]"><Clock3 size={16} aria-hidden="true" /></span><div className="min-w-0"><p className="text-xs font-extrabold text-[#173f70]">{item.title}</p><p className="mt-1 text-xs leading-5 text-[#536f92]">{item.body}</p><time className="mt-2 block text-[11px] font-semibold text-[#8aa1bd]">{new Date(item.created_at).toLocaleString("id-ID")}</time></div></div></>;
}
