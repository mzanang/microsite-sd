import { NextResponse } from "next/server";
import { createKbAdminClient, getCurrentKbProfile } from "@/lib/kb/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentKbProfile();
  if (!profile) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  const { id } = await params;
  const admin = createKbAdminClient();
  const { data: submission } = await admin.from("kb_submissions").select("id, teacher_profile_id").eq("id", id).maybeSingle();
  if (!submission) return NextResponse.json({ error: "Pengumpulan tidak ditemukan." }, { status: 404 });
  const allowed = submission.teacher_profile_id === profile.id || ["super_admin", "kepala_sekolah", "pengawas_dabin"].includes(profile.role) || (profile.role === "guru" && profile.community_position === "ketua");
  if (!allowed) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const { data: version } = await admin
    .from("kb_submission_versions")
    .select("storage_path, original_name, mime_type, file_size, created_at")
    .eq("submission_id", id)
    .eq("collection_method", "file")
    .order("version_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!version?.storage_path) return NextResponse.json({ error: "Pengumpulan ini menggunakan link." }, { status: 400 });
  const { data, error } = await admin.storage.from("kb-administrasi").createSignedUrl(version.storage_path, 300);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "Dokumen tidak dapat dibuka." }, { status: 503 });
  return NextResponse.json({
    url: data.signedUrl,
    name: version.original_name,
    mime_type: version.mime_type,
    file_size: version.file_size,
    created_at: version.created_at,
  });
}
