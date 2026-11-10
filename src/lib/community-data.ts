import { defaultConfig } from "@/lib/default-config";
import { createKbAdminClient } from "@/lib/kb/auth";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export type PublicCommunityProfile = {
  name: string;
  teacher_type: string;
  title: string;
  community_position: "ketua" | "anggota" | null;
};

export type PublicCommunityData = {
  school: {
    name: string;
    description: string;
    address: string;
    logo_url: string;
  };
  principal: PublicCommunityProfile | null;
  teachers: PublicCommunityProfile[];
};

export type PublicCommunityDocument = { id: string; title: string; description: string; original_name: string; public_url: string; created_at: string };
export type PublicCommunityForumReply = { id: string; body: string; created_at: string; author_name: string; author_role: string };
export type PublicCommunityEntry = { id: string; menu_key: "materi" | "dokumentasi" | "praktik_baik" | "forum"; title: string; body: string; external_url: string | null; event_date: string | null; meeting_number: number | null; category: string; attachments: Array<{ path: string; name: string; size: number; mime_type: string; url: string | null }>; created_by: string | null; author_name: string; replies: PublicCommunityForumReply[]; created_at: string };
export type PublicCommunityTask = { id: string; name: string; description: string; collection_method: "file" | "link" | "both"; due_at: string | null; created_at: string; completed_count: number; pending_count: number };
export type PublicCommunityAttendanceCounts = { hadir: number; sakit: number; izin: number; alpa: number };
export type PublicCommunityAttendance = { id: string; title: string; event_date: string; location: string; notes: string; active_from: string | null; active_until: string | null; material_title: string; counts: PublicCommunityAttendanceCounts };
export type PublicCommunityContent = { documents: PublicCommunityDocument[]; entries: PublicCommunityEntry[]; tasks: PublicCommunityTask[]; attendance: PublicCommunityAttendance[] };

const fallbackData: PublicCommunityData = {
  school: {
    name: defaultConfig.microsite.title,
    description: "Portal informasi dan kegiatan Komunitas Belajar Guru SD Negeri Dukuhwaru 01.",
    address: defaultConfig.microsite.address,
    logo_url: "/logo.png",
  },
  principal: null,
  teachers: [],
};

function parseProfile(value: unknown): PublicCommunityProfile | null {
  if (!value || typeof value !== "object") return null;
  const profile = value as Record<string, unknown>;
  const name = typeof profile.name === "string" ? profile.name.trim() : "";
  if (!name) return null;
  return {
    name,
    teacher_type: typeof profile.teacher_type === "string" && profile.teacher_type.trim() ? profile.teacher_type : "Guru",
    title: typeof profile.title === "string" ? profile.title : "",
    community_position: profile.community_position === "ketua" || profile.community_position === "anggota" ? profile.community_position : null,
  };
}

function parseOverview(value: unknown): PublicCommunityData | null {
  if (!value || typeof value !== "object") return null;
  const overview = value as Record<string, unknown>;
  const schoolValue = overview.school && typeof overview.school === "object" ? overview.school as Record<string, unknown> : null;
  const schoolName = typeof schoolValue?.name === "string" && schoolValue.name.trim() ? schoolValue.name : fallbackData.school.name;
  const teachers = Array.isArray(overview.teachers) ? overview.teachers.map(parseProfile).filter((profile): profile is PublicCommunityProfile => Boolean(profile)).sort((a, b) => Number(b.community_position === "ketua") - Number(a.community_position === "ketua") || a.name.localeCompare(b.name, "id")) : [];
  return {
    school: {
      name: schoolName,
      description: typeof schoolValue?.description === "string" && schoolValue.description.trim() ? schoolValue.description : fallbackData.school.description,
      address: typeof schoolValue?.address === "string" ? schoolValue.address : fallbackData.school.address,
      logo_url: typeof schoolValue?.logo_url === "string" && schoolValue.logo_url.trim() ? schoolValue.logo_url : fallbackData.school.logo_url,
    },
    principal: parseProfile(overview.principal),
    teachers,
  };
}

export async function getPublicCommunityData(): Promise<PublicCommunityData> {
  if (!supabaseConfigured()) return fallbackData;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_kb_public_overview");
    if (error) return fallbackData;
    return parseOverview(data) ?? fallbackData;
  } catch {
    return fallbackData;
  }
}

export async function getPublicCommunityDocuments(): Promise<PublicCommunityDocument[]> {
  if (!supabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("kb_public_documents").select("id, title, description, original_name, storage_path, created_at").eq("is_published", true).order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((item) => ({ id: item.id, title: item.title, description: item.description, original_name: item.original_name, public_url: supabase.storage.from("kb-public-documents").getPublicUrl(item.storage_path).data.publicUrl, created_at: item.created_at }));
  } catch {
    return [];
  }
}

export async function getPublicCommunityContent(): Promise<PublicCommunityContent> {
  const documents = await getPublicCommunityDocuments();
  if (!supabaseConfigured()) return { documents, entries: [], tasks: [], attendance: [] };
  try {
    const admin = createKbAdminClient();
    const [{ data: entries, error: entriesError }, { data: tasks, error: tasksError }, { data: sessions, error: sessionsError }] = await Promise.all([
      admin.from("kb_community_entries").select("id, menu_key, title, body, external_url, event_date, meeting_number, category, attachments, created_by, created_at").eq("is_published", true).in("menu_key", ["materi", "dokumentasi", "praktik_baik", "forum"]).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }),
      admin.from("kb_document_requirements").select("id, name, description, collection_method, due_at, created_at").eq("is_active", true).order("created_at", { ascending: false }),
      admin.from("kb_attendance_sessions").select("id, title, event_date, location, notes, active_from, active_until, material_entry_id").order("event_date", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    if (entriesError || tasksError || sessionsError) return { documents, entries: [], tasks: [], attendance: [] };
    const entryRows = (entries ?? []) as Array<Record<string, unknown>>;
    const forumEntryIds = entryRows.filter((entry) => entry.menu_key === "forum").map((entry) => String(entry.id));
    const forumCreatorIds = entryRows.filter((entry) => entry.menu_key === "forum" && typeof entry.created_by === "string").map((entry) => String(entry.created_by));
    const [{ data: forumAuthors }, { data: forumReplies }] = await Promise.all([
      forumCreatorIds.length ? admin.from("kb_profiles").select("id, full_name, role").in("id", forumCreatorIds) : Promise.resolve({ data: [] }),
      forumEntryIds.length ? admin.from("kb_forum_replies").select("id, entry_id, body, created_by, created_at").in("entry_id", forumEntryIds).order("created_at", { ascending: true }) : Promise.resolve({ data: [] }),
    ]);
    const replyCreatorIds = [...new Set((forumReplies ?? []).map((reply) => reply.created_by).filter(Boolean))] as string[];
    const { data: replyAuthors } = replyCreatorIds.length ? await admin.from("kb_profiles").select("id, full_name, role").in("id", replyCreatorIds) : { data: [] };
    const authorById = new Map((forumAuthors ?? []).map((author) => [author.id, author]));
    const replyAuthorById = new Map((replyAuthors ?? []).map((author) => [author.id, author]));
    const repliesByEntry = new Map<string, PublicCommunityForumReply[]>();
    for (const reply of forumReplies ?? []) {
      const author = replyAuthorById.get(reply.created_by ?? "");
      const current = repliesByEntry.get(reply.entry_id) ?? [];
      current.push({ id: reply.id, body: reply.body, created_at: reply.created_at, author_name: author?.full_name ?? "Anggota komunitas", author_role: author?.role ?? "guru" });
      repliesByEntry.set(reply.entry_id, current);
    }
    const paths = entryRows.flatMap((entry) => Array.isArray(entry.attachments) ? entry.attachments.flatMap((attachment) => attachment && typeof attachment === "object" && "path" in attachment && typeof attachment.path === "string" ? [attachment.path] : []) : []);
    const signedUrls = new Map<string, string>();
    await Promise.all(paths.map(async (path) => { const result = await admin.storage.from("kb-administrasi").createSignedUrl(path, 3600); if (result.data?.signedUrl) signedUrls.set(path, result.data.signedUrl); }));
    const normalizedEntries = entryRows.map((entry) => ({
      id: String(entry.id),
      menu_key: entry.menu_key as PublicCommunityEntry["menu_key"],
      title: String(entry.title ?? ""),
      body: String(entry.body ?? ""),
      external_url: typeof entry.external_url === "string" ? entry.external_url : null,
      event_date: typeof entry.event_date === "string" ? entry.event_date : null,
      meeting_number: typeof entry.meeting_number === "number" ? entry.meeting_number : null,
      category: String(entry.category ?? ""),
      created_by: typeof entry.created_by === "string" ? entry.created_by : null,
      author_name: authorById.get(String(entry.created_by ?? ""))?.full_name ?? "Pengelola komunitas",
      replies: repliesByEntry.get(String(entry.id)) ?? [],
      attachments: Array.isArray(entry.attachments) ? entry.attachments.flatMap((attachment) => {
        if (!attachment || typeof attachment !== "object") return [];
        const item = attachment as Record<string, unknown>;
        if (typeof item.path !== "string" || typeof item.name !== "string") return [];
        return [{ path: item.path, name: item.name, size: Number(item.size ?? 0), mime_type: String(item.mime_type ?? ""), url: signedUrls.get(item.path) ?? null }];
      }) : [],
      created_at: String(entry.created_at ?? ""),
    }));
    const materialTitles = new Map(normalizedEntries.filter((entry) => entry.menu_key === "materi").map((entry) => [entry.id, entry.title]));
    const taskIds = (tasks ?? []).map((task) => task.id);
    const { data: taskSubmissions } = taskIds.length
      ? await admin.from("kb_submissions").select("requirement_id, teacher_profile_id").in("requirement_id", taskIds)
      : { data: [] as Array<{ requirement_id: string; teacher_profile_id: string }> };
    const { data: activeParticipants } = await admin.from("kb_profiles").select("id").eq("role", "guru").eq("is_active", true);
    const participantCount = activeParticipants?.length ?? 0;
    const taskCompleted = new Map<string, number>();
    for (const submission of taskSubmissions ?? []) taskCompleted.set(submission.requirement_id, (taskCompleted.get(submission.requirement_id) ?? 0) + 1);
    const sessionIds = (sessions ?? []).map((session) => session.id);
    const { data: attendanceRecords } = sessionIds.length
      ? await admin.from("kb_attendance_records").select("session_id, status").in("session_id", sessionIds)
      : { data: [] as Array<{ session_id: string; status: string }> };
    const attendanceCounts = new Map<string, PublicCommunityAttendanceCounts>();
    for (const sessionId of sessionIds) attendanceCounts.set(sessionId, { hadir: 0, sakit: 0, izin: 0, alpa: 0 });
    for (const record of attendanceRecords ?? []) {
      const counts = attendanceCounts.get(record.session_id);
      if (!counts) continue;
      if (record.status === "hadir") counts.hadir += 1;
      else if (record.status === "sakit") counts.sakit += 1;
      else if (record.status === "izin") counts.izin += 1;
      else counts.alpa += 1;
    }
    for (const counts of attendanceCounts.values()) counts.alpa = Math.max(participantCount - counts.hadir - counts.sakit - counts.izin - counts.alpa, 0) + counts.alpa;
    return {
      documents,
      entries: normalizedEntries,
      tasks: (tasks ?? []).map((task) => ({ ...task, completed_count: taskCompleted.get(task.id) ?? 0, pending_count: Math.max(participantCount - (taskCompleted.get(task.id) ?? 0), 0) })) as PublicCommunityTask[],
      attendance: (sessions ?? []).map((session) => ({ ...session, material_title: materialTitles.get(session.material_entry_id) ?? "Materi kegiatan", counts: attendanceCounts.get(session.id) ?? { hadir: 0, sakit: 0, izin: 0, alpa: 0 } })) as PublicCommunityAttendance[],
    };
  } catch {
    return { documents, entries: [], tasks: [], attendance: [] };
  }
}
