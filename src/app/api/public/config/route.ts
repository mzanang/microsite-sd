import { NextResponse } from "next/server";
import { getPublishedConfig } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const response = NextResponse.json(await getPublishedConfig());
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
