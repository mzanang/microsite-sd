import { NextResponse } from "next/server";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function POST() { if (!supabaseConfigured()) return NextResponse.json({ error: "Supabase belum dikonfigurasi di environment." }, { status: 503 }); const supabase = await createClient(); const { data } = await supabase.auth.getUser(); if (!data.user) return NextResponse.json({ error: "Sesi admin tidak ditemukan." }, { status: 401 }); const { data: result, error } = await supabase.rpc("publish_microsite", { p_microsite_slug: "sd-negeri-dukuhwaru-01", p_publisher: data.user.id }); if (error) return NextResponse.json({ error: "Publikasi gagal", details: error.message }, { status: 500 }); revalidatePath("/"); return NextResponse.json({ ok: true, result }); }
