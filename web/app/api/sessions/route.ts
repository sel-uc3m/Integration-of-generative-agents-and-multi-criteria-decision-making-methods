import { NextRequest, NextResponse } from "next/server";
import { listSessions } from "@/app/services/graphService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids");
    const allowedIds = idsParam ? idsParam.split(",").map(id => id.trim()).filter(Boolean) : [];

    const list = listSessions(allowedIds);
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
