import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { createKbAdminClient } from "@/lib/kb/auth";
import { supabaseConfigured } from "@/lib/supabase/server";
import {
  type GuideRole,
  type KbGuideItem,
  MAX_GUIDE_FILE_SIZE,
} from "@/lib/community-guides";

const LOCAL_GUIDES_PATH = path.join(process.cwd(), "src", "data", "community-guides.json");
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "panduan");
const BUCKET_NAME = "kb-public-documents";

async function ensureUploadsDir() {
  try {
    await fs.mkdir(LOCAL_UPLOADS_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

export async function getKbGuides(): Promise<KbGuideItem[]> {
  // 1. Try reading from Supabase microsite_settings
  if (supabaseConfigured()) {
    try {
      const admin = createKbAdminClient();
      const { data: site } = await admin
        .from("microsites")
        .select("id")
        .eq("slug", "sd-negeri-dukuhwaru-01")
        .maybeSingle();

      if (site) {
        const { data: row } = await admin
          .from("microsite_settings")
          .select("settings")
          .eq("microsite_id", site.id)
          .maybeSingle();

        const guides = (row?.settings as Record<string, unknown> | undefined)?.kb_guides;
        if (Array.isArray(guides) && guides.length > 0) {
          return guides as KbGuideItem[];
        }
      }
    } catch (err) {
      console.warn("Failed to read kb_guides from Supabase:", err);
    }
  }

  // 2. Fallback to local JSON file
  try {
    const raw = await fs.readFile(LOCAL_GUIDES_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as KbGuideItem[];
    }
  } catch {
    // If not found, return empty
  }

  return [];
}

async function persistGuides(guides: KbGuideItem[]) {
  // 1. Always save to local JSON file
  try {
    const dir = path.dirname(LOCAL_GUIDES_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(LOCAL_GUIDES_PATH, JSON.stringify(guides, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write community-guides.json:", err);
  }

  // 2. Try saving to Supabase microsite_settings
  if (supabaseConfigured()) {
    try {
      const admin = createKbAdminClient();
      const { data: site } = await admin
        .from("microsites")
        .select("id")
        .eq("slug", "sd-negeri-dukuhwaru-01")
        .maybeSingle();

      if (site) {
        const { data: existing } = await admin
          .from("microsite_settings")
          .select("settings")
          .eq("microsite_id", site.id)
          .maybeSingle();

        const currentSettings = (existing?.settings as Record<string, unknown> | undefined) ?? {};
        const updatedSettings = {
          ...currentSettings,
          kb_guides: guides,
        };

        if (existing) {
          await admin
            .from("microsite_settings")
            .update({ settings: updatedSettings })
            .eq("microsite_id", site.id);
        } else {
          await admin
            .from("microsite_settings")
            .insert({ microsite_id: site.id, settings: updatedSettings });
        }
      }
    } catch (err) {
      console.warn("Failed to persist kb_guides to Supabase:", err);
    }
  }
}

export async function saveUploadedGuideFile(
  file: File,
  role: GuideRole
): Promise<{ file_url: string; storage_path: string; original_name: string; file_size: number }> {
  if (file.size > MAX_GUIDE_FILE_SIZE) {
    throw new Error("Ukuran file melebihi batas maksimal 1 MB.");
  }

  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    throw new Error("Hanya file dokumen PDF yang diperbolehkan.");
  }

  await ensureUploadsDir();

  const fileExt = ".pdf";
  const safeBaseName = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);
  const randomSuffix = crypto.randomUUID().slice(0, 8);
  const fileName = `panduan_${role}_${safeBaseName}_${randomSuffix}${fileExt}`;
  const localFilePath = path.join(LOCAL_UPLOADS_DIR, fileName);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Write to public/uploads/panduan
  await fs.writeFile(localFilePath, buffer);
  let fileUrl = `/uploads/panduan/${fileName}`;
  const storagePath = `panduan/${fileName}`;

  // Optionally upload to Supabase Storage if configured
  if (supabaseConfigured()) {
    try {
      const admin = createKbAdminClient();
      const upload = await admin.storage
        .from(BUCKET_NAME)
        .upload(storagePath, buffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (!upload.error) {
        const { data: publicUrlData } = admin.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);
        if (publicUrlData?.publicUrl) {
          fileUrl = publicUrlData.publicUrl;
        }
      }
    } catch (err) {
      console.warn("Supabase bucket upload failed, using local public path:", err);
    }
  }

  return {
    file_url: fileUrl,
    storage_path: storagePath,
    original_name: file.name,
    file_size: file.size,
  };
}

export async function addOrUpdateKbGuide(guide: KbGuideItem): Promise<KbGuideItem[]> {
  const current = await getKbGuides();
  const index = current.findIndex((g) => g.id === guide.id);

  let updated: KbGuideItem[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...guide, updated_at: new Date().toISOString() };
  } else {
    updated = [guide, ...current];
  }

  await persistGuides(updated);
  return updated;
}

export async function deleteKbGuide(id: string): Promise<KbGuideItem[]> {
  const current = await getKbGuides();
  const target = current.find((g) => g.id === id);

  if (target) {
    // Attempt removing local file if local
    if (target.file_url.startsWith("/uploads/panduan/")) {
      const fileName = path.basename(target.file_url);
      const filePath = path.join(LOCAL_UPLOADS_DIR, fileName);
      try {
        await fs.unlink(filePath);
      } catch {
        // ignore if not found
      }
    }

    // Attempt removing from Supabase bucket
    if (target.storage_path && supabaseConfigured()) {
      try {
        const admin = createKbAdminClient();
        await admin.storage.from(BUCKET_NAME).remove([target.storage_path]);
      } catch {
        // ignore
      }
    }
  }

  const updated = current.filter((g) => g.id !== id);
  await persistGuides(updated);
  return updated;
}

