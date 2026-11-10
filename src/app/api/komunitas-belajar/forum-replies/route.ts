import { NextResponse } from "next/server";
import { z } from "zod";
import { createKbAdminClient, getCurrentKbProfile } from "@/lib/kb/auth";
import { notifyForumEntryAuthorAboutReply } from "@/lib/kb/notifications";

const replySchema = z.object({ entry_id: z.string().uuid(), body: z.string().trim().min(1).max(3000) });

export async function GET(request: Request) {
  const entryId = new URL(request.url).searchParams.get("entry_id");
  if (!entryId || !z.string().uuid().safeParse(entryId).success) return NextResponse.json({ error: "Topik forum tidak valid." }, { status: 400 });
  const admin = createKbAdminClient();
  const { data: entry } = await admin.from("kb_community_entries").select("id").eq("id", entryId).eq("menu_key", "forum").eq("is_published", true).maybeSingle();
  if (!entry) return NextResponse.json({ error: "Topik forum tidak ditemukan." }, { status: 404 });
  const { data, error } = await admin.from("kb_forum_replies").select("id, entry_id, body, created_by, created_at, updated_at").eq("entry_id", entryId).order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Balasan forum belum dapat dimuat." }, { status: 503 });
  const profileIds = [...new Set((data ?? []).map((reply) => reply.created_by).filter(Boolean))] as string[];
  const { data: authors } = profileIds.length ? await admin.from("kb_profiles").select("id, full_name, role, teacher_type").in("id", profileIds) : { data: [] };
  return NextResponse.json({ replies: (data ?? []).map((reply) => ({ ...reply, author: authors?.find((author) => author.id === reply.created_by) ?? null })) });
}

export async function POST(request: Request) {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  const parsed = replySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Isi balasan belum valid." }, { status: 400 });
  const admin = createKbAdminClient();
  const { data: entry } = await admin.from("kb_community_entries").select("id, title, created_by").eq("id", parsed.data.entry_id).eq("menu_key", "forum").eq("is_published", true).maybeSingle();
  if (!entry) return NextResponse.json({ error: "Topik forum tidak ditemukan." }, { status: 404 });
  const { data, error } = await admin.from("kb_forum_replies").insert({ ...parsed.data, created_by: profile.id }).select("id, entry_id, body, created_by, created_at, updated_at").single();
  if (error || !data) return NextResponse.json({ error: "Balasan forum gagal disimpan." }, { status: 503 });
  if (entry.created_by) await notifyForumEntryAuthorAboutReply(admin, { replyId: data.id, entryId: entry.id, entryTitle: entry.title, entryAuthorId: entry.created_by, authorId: profile.id, authorName: profile.full_name });
  return NextResponse.json({ reply: { ...data, author: { full_name: profile.full_name, role: profile.role, teacher_type: profile.teacher_type } } }, { status: 201 });
}
