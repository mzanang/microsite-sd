import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageKbUsers } from "@/lib/kb/auth";
import {
  getCommunityLandingConfig,
  saveCommunityLandingConfig,
} from "@/lib/community-landing-config-server";

const fieldSchema = z.object({
  label: z.string().trim().min(1, "Label tidak boleh kosong").max(100),
  value: z.string().trim().max(300),
});

const faqSchema = z.object({
  id: z.string().trim().min(1),
  question: z.string().trim().min(3, "Pertanyaan minimal 3 karakter").max(250),
  answer: z.string().trim().min(3, "Jawaban minimal 3 karakter").max(2000),
});

const configSchema = z.object({
  schoolProfileLeft: z.array(fieldSchema),
  schoolProfileRight: z.array(fieldSchema),
  faqItems: z.array(faqSchema),
});

export async function GET() {
  try {
    const config = await getCommunityLandingConfig();
    const isSuperAdmin = await canManageKbUsers();
    return NextResponse.json({ config, isSuperAdmin });
  } catch (error) {
    console.error("GET landing config error:", error);
    return NextResponse.json({ error: "Gagal memuat konfigurasi." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const isSuperAdmin = await canManageKbUsers();
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Akses ditolak. Fitur ini khusus untuk Super Admin." }, { status: 403 });
  }

  try {
    const json = await request.json();
    const parsed = configSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Format data tidak valid.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await saveCommunityLandingConfig(parsed.data);
    return NextResponse.json({ ok: true, config: parsed.data });
  } catch (error) {
    console.error("POST landing config error:", error);
    return NextResponse.json({ error: "Gagal menyimpan konfigurasi." }, { status: 500 });
  }
}

