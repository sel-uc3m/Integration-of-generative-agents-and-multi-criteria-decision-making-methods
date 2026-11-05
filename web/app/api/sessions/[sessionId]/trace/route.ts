import { NextRequest, NextResponse } from "next/server";
import { getOrCreateTrace } from "@/app/services/traceService";
import { getTraceFromDb } from "@/app/services/dbService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }
    
    const dbTrace = getTraceFromDb(sessionId);
    if (dbTrace) {
      return NextResponse.json({
        sessionId,
        activeNode: dbTrace.active_node,
        nodeHistory: JSON.parse(dbTrace.node_history || "[]"),
        llmCalls: JSON.parse(dbTrace.llm_calls || "[]"),
        nodeRuns: JSON.parse(dbTrace.node_runs || "[]"),
      });
    }

    const trace = getOrCreateTrace(sessionId);
    return NextResponse.json(trace);
  } catch (error: any) {
    console.error("Failed to fetch trace:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
