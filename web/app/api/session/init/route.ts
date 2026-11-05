import { NextRequest } from "next/server";
import { initSession } from "@/app/services/graphService";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        const sessionInfo = await initSession(
          {
            processSource: body.processSource,
            fileName: body.fileName,
            fileNames: body.fileNames,
            pipeline: body.pipeline,
            customProcess: body.customProcess,
            modelConfig: body.modelConfig,
          },
          send
        );
        send("completed", sessionInfo);
      } catch (error: any) {
        console.error("Failed to init session:", error);
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
