import { NextRequest, NextResponse } from "next/server";
import { getSessionState } from "@/app/services/graphService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const state = await getSessionState(sessionId);
    return NextResponse.json(state);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
