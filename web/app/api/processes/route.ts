import { NextResponse } from "next/server";
import { listQuestionsFiles } from "@/app/services/graphService";

export async function GET() {
  try {
    const files = await listQuestionsFiles();
    return NextResponse.json(files);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
