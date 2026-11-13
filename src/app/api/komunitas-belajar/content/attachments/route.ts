import { NextResponse } from "next/server";
import { createKbAdminClient, getCurrentKbProfile } from "@/lib/kb/auth";

const bucket = "kb-administrasi";
const maxFiles = 5;
const maxFileSize = 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const profile = await getCurrentKbProfile();
  if (!profile || (profile.role !== "super_admin" && !(profile.role === "guru" && ["ketua", "sekretaris"].includes(profile.community_position ?? "")))) return NextResponse.json({ error: "Hanya pengelola komunitas yang dapat mengunggah lampiran." }, { status: 403 });
  const files = (await request.formData()).getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length || files.length > maxFiles) return NextResponse.json({ error: "Pilih 1 sampai 5 foto." }, { status: 400 });
  if (files.some((file) => file.size > maxFileSize || !allowedTypes.has(file.type))) return NextResponse.json({ error: "Setiap foto wajib JPG, PNG, atau WEBP dengan ukuran maksimal 1 MB." }, { status: 400 });
  const admin = createKbAdminClient();
  const uploaded: Array<{ path: string; name: string; size: number; mime_type: string }> = [];
  for (const file of files) {
    const extension = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    const path = `community/${profile.id}/${crypto.randomUUID()}.${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await admin.storage.from(bucket).upload(path, bytes, { contentType: file.type, upsert: false });
    if (result.error) {
      if (uploaded.length) await admin.storage.from(bucket).remove(uploaded.map((item) => item.path));
      return NextResponse.json({ error: "Foto gagal diunggah." }, { status: 500 });
    }
    uploaded.push({ path, name: file.name.slice(0, 180), size: bytes.byteLength, mime_type: file.type });
  }
  return NextResponse.json({ attachments: uploaded }, { status: 201 });
}
