import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageKbUsers } from "@/lib/kb/auth";
import {
  type GuideRole,
  type KbGuideItem,
  MAX_GUIDE_FILE_SIZE,
} from "@/lib/community-guides";
import {
  addOrUpdateKbGuide,
  deleteKbGuide,
  getKbGuides,
  saveUploadedGuideFile,
} from "@/lib/community-guides-server";

const VALID_ROLES: GuideRole[] = [
  "ketua_sekretaris",
  "kepala_sekolah",
  "guru",
  "pengawas_dabin",
];

export async function GET() {
  const isSuperAdmin = await canManageKbUsers();
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Akses ditolak. Fitur ini khusus untuk Super Admin." }, { status: 403 });
  }

  try {
    const guides = await getKbGuides();
    return NextResponse.json({ guides });
  } catch (error) {
    console.error("GET admin kb guides error:", error);
    return NextResponse.json({ error: "Gagal memuat panduan." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const isSuperAdmin = await canManageKbUsers();
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Akses ditolak. Fitur ini khusus untuk Super Admin." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const id = (formData.get("id") as string | null)?.trim();
    const role = (formData.get("role") as string | null)?.trim() as GuideRole;
    const title = (formData.get("title") as string | null)?.trim() ?? "";
    const description = (formData.get("description") as string | null)?.trim() ?? "";
    const file = formData.get("file") as File | null;

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Pilihan peran tidak valid." }, { status: 400 });
    }

    if (!title || title.length < 2 || title.length > 120) {
      return NextResponse.json({ error: "Judul panduan harus berisi 2 - 120 karakter." }, { status: 400 });
    }

    if (description.length > 500) {
      return NextResponse.json({ error: "Keterangan panduan maksimal 500 karakter." }, { status: 400 });
    }

    const currentGuides = await getKbGuides();
    const existing = id ? currentGuides.find((g) => g.id === id) : null;

    // If new item, file is required
    if (!existing && (!file || !(file instanceof File) || file.size === 0)) {
      return NextResponse.json({ error: "Wajib memilih file dokumen PDF panduan." }, { status: 400 });
    }

    let fileUrl = existing?.file_url ?? "";
    let storagePath = existing?.storage_path ?? "";
    let originalName = existing?.original_name ?? "";
    let fileSize = existing?.file_size ?? 0;

    if (file && file instanceof File && file.size > 0) {
      if (file.size > MAX_GUIDE_FILE_SIZE) {
        return NextResponse.json(
          { error: "Ukuran file melebihi 1 MB. Maksimal ukuran file PDF adalah 1 MB." },
          { status: 400 }
        );
      }

      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        return NextResponse.json({ error: "Hanya dokumen berformat PDF yang diperbolehkan." }, { status: 400 });
      }

      const uploadResult = await saveUploadedGuideFile(file, role);
      fileUrl = uploadResult.file_url;
      storagePath = uploadResult.storage_path;
      originalName = uploadResult.original_name;
      fileSize = uploadResult.file_size;
    }

    const guideItem: KbGuideItem = {
      id: existing?.id ?? crypto.randomUUID(),
      role,
      title,
      description,
      original_name: originalName,
      file_url: fileUrl,
      storage_path: storagePath,
      file_size: fileSize,
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = await addOrUpdateKbGuide(guideItem);
    return NextResponse.json({ ok: true, guide: guideItem, guides: updated });
  } catch (error) {
    console.error("POST admin kb guides error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan panduan." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const isSuperAdmin = await canManageKbUsers();
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Akses ditolak. Fitur ini khusus untuk Super Admin." }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { id?: string };
    if (!body.id || typeof body.id !== "string") {
      return NextResponse.json({ error: "ID panduan tidak valid." }, { status: 400 });
    }

    const updated = await deleteKbGuide(body.id);
    return NextResponse.json({ ok: true, guides: updated });
  } catch (error) {
    console.error("DELETE admin kb guides error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus panduan." },
      { status: 500 }
    );
  }
}

