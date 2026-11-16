import { NextResponse } from "next/server";
import { getKbGuides } from "@/lib/community-guides-server";

export async function GET() {
  try {
    const guides = await getKbGuides();
    return NextResponse.json({ guides });
  } catch (error) {
    console.error("GET public kb guides error:", error);
    return NextResponse.json({ error: "Gagal memuat panduan." }, { status: 500 });
  }
}

