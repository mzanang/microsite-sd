import { defaultConfig } from "@/lib/default-config";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export type PublicCommunityProfile = {
  name: string;
  teacher_type: string;
  title: string;
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
  };
}

function parseOverview(value: unknown): PublicCommunityData | null {
  if (!value || typeof value !== "object") return null;
  const overview = value as Record<string, unknown>;
  const schoolValue = overview.school && typeof overview.school === "object" ? overview.school as Record<string, unknown> : null;
  const schoolName = typeof schoolValue?.name === "string" && schoolValue.name.trim() ? schoolValue.name : fallbackData.school.name;
  const teachers = Array.isArray(overview.teachers) ? overview.teachers.map(parseProfile).filter((profile): profile is PublicCommunityProfile => Boolean(profile)) : [];
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
