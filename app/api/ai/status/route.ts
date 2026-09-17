import { NextResponse } from "next/server";
import { getAiConfig } from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function GET() {
  const { configured, model } = getAiConfig();
  return NextResponse.json({
    configured,
    model: configured ? model : null,
  });
}
