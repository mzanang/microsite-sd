import { NextResponse } from "next/server";
import { z } from "zod";
import { createKbAdminClient, getCurrentKbProfile } from "@/lib/kb/auth";

const menuKeys = ["materi", "dokumentasi", "praktik_baik", "forum"] as const;
const attachmentSchema = z.object({ path: z.string().min(1), name: z.string().max(180), size: z.number().int().positive(), mime_type: z.string().max(100) });
const entrySchema = z.object({
  menu_key: z.enum(menuKeys),
  title: z.string().trim().min(2).max(180),
  body: z.string().trim().max(10000).default(""),
  external_url: z.string().trim().url().optional().or(z.literal("")),
  session_id: z.string().uuid().nullable().optional(),
  meeting_number: z.number().int().min(1).max(9999).nullable().optional(),
  event_date: z.string().date().nullable().optional(),
  category: z.string().trim().max(100).default(""),
  attachments: z.array(attachmentSchema).max(5).optional().default([]),
  is_pinned: z.boolean().optional(),
});
const idSchema = z.string().uuid();

function canManage(profile: Awaited<ReturnType<typeof getCurrentKbProfile>>) {
  return Boolean(profile && (profile.role === "super_admin" || (profile.role === "guru" && ["ketua", "sekretaris"].includes(profile.community_position ?? ""))));
}

function canCreate(profile: Awaited<ReturnType<typeof getCurrentKbProfile>>, menu: string) {
  return Boolean(profile && (canManage(profile) || menu === "forum"));
}

async function hydrateEntries(admin: ReturnType<typeof createKbAdminClient>, entries: Array<Record<string, unknown>>) {
  const paths = entries.flatMap((entry) => Array.isArray(entry.attachments) ? entry.attachments.filter((item): item is { path: string } => Boolean(item && typeof item === "object" && "path" in item && typeof item.path === "string")) : []);
  const signedUrls = new Map<string, string>();
  await Promise.all(paths.map(async (item) => { const result = await admin.storage.from("kb-administrasi").createSignedUrl(item.path, 3600); if (result.data?.signedUrl) signedUrls.set(item.path, result.data.signedUrl); }));
  return entries.map((entry) => ({ ...entry, attachments: Array.isArray(entry.attachments) ? entry.attachments.map((item) => ({ ...item, url: item && typeof item === "object" && "path" in item ? signedUrls.get(String(item.path)) ?? null : null })) : [] }));
}

export async function GET(request: Request) {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const menu = params.get("menu");
  if (!menu || !menuKeys.includes(menu as (typeof menuKeys)[number])) return NextResponse.json({ error: "Menu konten tidak valid." }, { status: 400 });
  const admin = createKbAdminClient();
  let query = admin.from("kb_community_entries").select("id, menu_key, title, body, external_url, session_id, meeting_number, event_date, category, attachments, is_published, is_pinned, created_by, created_at, updated_at").eq("menu_key", menu).order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
  const sessionId = params.get("session_id");
  if (sessionId) query = query.eq("session_id", sessionId);
  if (!canManage(profile)) query = query.eq("is_published", true);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Konten belum dapat dimuat. Terapkan migrasi menu komunitas terlebih dahulu." }, { status: 503 });
  return NextResponse.json({ entries: await hydrateEntries(admin, (data ?? []) as Array<Record<string, unknown>>) });
}

export async function POST(request: Request) {
  const profile = await getCurrentKbProfile();
  const body = await request.json().catch(() => null);
  const menu = body && typeof body === "object" && "menu_key" in body ? String(body.menu_key) : "";
  if (!canCreate(profile, menu)) return NextResponse.json({ error: menu === "forum" ? "Sesi tidak ditemukan." : "Hanya Ketua Kombel yang dapat menambah konten." }, { status: profile ? 403 : 401 });
  const parsed = entrySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data konten belum valid." }, { status: 400 });
  if (parsed.data.external_url && !parsed.data.external_url.startsWith("https://")) return NextResponse.json({ error: "Link konten harus menggunakan HTTPS." }, { status: 400 });
  const admin = createKbAdminClient();
  const { data, error } = await admin.from("kb_community_entries").insert({ ...parsed.data, external_url: parsed.data.external_url || null, session_id: parsed.data.session_id || null, meeting_number: parsed.data.meeting_number || null, event_date: parsed.data.event_date || null, created_by: profile?.id }).select("id, menu_key, title, body, external_url, session_id, meeting_number, event_date, category, attachments, is_published, is_pinned, created_by, created_at, updated_at").single();
  if (error || !data) return NextResponse.json({ error: "Konten gagal disimpan." }, { status: 503 });
  return NextResponse.json({ entry: (await hydrateEntries(admin, [data]))[0] }, { status: 201 });
}

export async function PATCH(request: Request) {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.id !== "string" || !idSchema.safeParse(body.id).success) return NextResponse.json({ error: "Konten tidak valid." }, { status: 400 });
  const admin = createKbAdminClient();
  const { data: existing } = await admin.from("kb_community_entries").select("created_by, menu_key").eq("id", body.id).maybeSingle();
  if (!existing || (!canManage(profile) && !(existing.menu_key === "forum" && existing.created_by === profile.id))) return NextResponse.json({ error: "Anda tidak dapat mengubah konten ini." }, { status: 403 });
  const parsed = entrySchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Perubahan konten belum valid." }, { status: 400 });
  const changes = { ...parsed.data, ...(parsed.data.external_url !== undefined ? { external_url: parsed.data.external_url || null } : {}), ...(parsed.data.session_id !== undefined ? { session_id: parsed.data.session_id || null } : {}), updated_at: new Date().toISOString() };
  const { data, error } = await admin.from("kb_community_entries").update(changes).eq("id", body.id).select("id, menu_key, title, body, external_url, session_id, meeting_number, event_date, category, attachments, is_published, is_pinned, created_by, created_at, updated_at").single();
  if (error || !data) return NextResponse.json({ error: "Konten tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ entry: (await hydrateEntries(admin, [data]))[0] });
}

export async function DELETE(request: Request) {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  if (!body || typeof body.id !== "string" || !idSchema.safeParse(body.id).success) return NextResponse.json({ error: "Konten tidak valid." }, { status: 400 });
  const admin = createKbAdminClient();
  const { data: entry } = await admin.from("kb_community_entries").select("created_by, menu_key, attachments").eq("id", body.id).maybeSingle();
  if (!entry || (!canManage(profile) && !(entry.menu_key === "forum" && entry.created_by === profile.id))) return NextResponse.json({ error: "Anda tidak dapat menghapus konten ini." }, { status: 403 });
  const { error } = await admin.from("kb_community_entries").delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: "Konten gagal dihapus." }, { status: 503 });
  const paths = Array.isArray(entry.attachments) ? entry.attachments.flatMap((item) => item && typeof item === "object" && "path" in item && typeof item.path === "string" ? [item.path] : []) : [];
  if (paths.length) await admin.storage.from("kb-administrasi").remove(paths);
  return NextResponse.json({ ok: true });
}
