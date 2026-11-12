import "server-only";

import { createKbAdminClient } from "@/lib/kb/auth";

type AdminClient = ReturnType<typeof createKbAdminClient>;

type LinkedSession = {
  id: string;
  meeting_number: number | null;
  event_date: string;
  material_entry_id: string | null;
  material_title: string | null;
};

export async function getLinkedSessionMap(admin: AdminClient, sessionIds: string[]) {
  if (!sessionIds.length) return new Map<string, LinkedSession>();

  const { data: sessions } = await admin
    .from("kb_attendance_sessions")
    .select("id, meeting_number, event_date, material_entry_id")
    .in("id", sessionIds);

  const materialIds = [...new Set((sessions ?? []).map((session) => session.material_entry_id).filter(Boolean))] as string[];
  const { data: materials } = materialIds.length
    ? await admin.from("kb_community_entries").select("id, title").in("id", materialIds)
    : { data: [] as Array<{ id: string; title: string }> };
  const materialMap = new Map((materials ?? []).map((material) => [material.id, material.title]));

  return new Map(
    (sessions ?? []).map((session) => [
      session.id,
      {
        ...session,
        material_title: session.material_entry_id ? materialMap.get(session.material_entry_id) ?? null : null,
      },
    ])
  );
}
