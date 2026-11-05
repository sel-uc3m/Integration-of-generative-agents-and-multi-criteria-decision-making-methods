import { NextResponse } from "next/server";

export async function GET() {
  const rawBase = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const ollamaUrl = rawBase.replace(/\/v1\/?$/, "");

  try {
    // 1. Query Ollama native tags endpoint
    const res = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      throw new Error(`Ollama returned status ${res.status}`);
    }

    const data = await res.json();
    const models: string[] = (data.models || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => m.name || m.model)
      .filter(Boolean);

    if (models.length > 0) {
      return NextResponse.json({ models });
    }
  } catch (error: any) {
    console.warn("Could not fetch models from Ollama /api/tags, trying /v1/models:", error.message);
  }

  try {
    // 2. Fallback to Ollama OpenAI-compatible endpoint
    const res = await fetch(`${ollamaUrl}/v1/models`, {
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const models = (data.data || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((m: any) => m.id)
        .filter(Boolean);
      if (models.length > 0) {
        return NextResponse.json({ models });
      }
    }
  } catch (error: any) {
    console.warn("Could not fetch models from Ollama /v1/models:", error.message);
  }

  // 3. Fallback to default configured model
  const fallbackModel = process.env.EVAL_MODEL || "deepseek-r1:7b";
  return NextResponse.json({ models: [fallbackModel], fallback: true });
}
