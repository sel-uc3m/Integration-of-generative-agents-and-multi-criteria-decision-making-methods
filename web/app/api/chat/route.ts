import { NextRequest } from "next/server";
import { submitAnswer } from "@/app/services/graphService";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, answer } = body;

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Missing sessionId" }), { status: 400 });
  }
  if (answer === undefined) {
    return new Response(JSON.stringify({ error: "Missing answer" }), { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        const result = await submitAnswer(sessionId, answer, send);
        send("completed", result);
      } catch (error: any) {
        console.error("Failed in chat route:", error);
        send("error", { message: error.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
