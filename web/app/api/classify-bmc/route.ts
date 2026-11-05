import { NextRequest, NextResponse } from "next/server";

const BMC_BLOCKS = [
  "Key Partners",
  "Key Activities",
  "Key Resources",
  "Value Propositions",
  "Customer Relationships",
  "Channels",
  "Customer Segments",
  "Cost Structure",
  "Revenue Streams"
] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, companyDescription, objectives } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Missing or invalid items array" }, { status: 400 });
    }

    const systemPrompt = `You are a high-precision Business Model Canvas classifier.
Your task is to classify a list of business assets, proposals, and software artifacts into the standard 9 blocks of the Business Model Canvas:
1. Key Partners (suppliers, partners, strategic alliances)
2. Key Activities (actions needed to run the business: development, operations, customer support, marketing)
3. Key Resources (knowledge repositories, databases, personnel, infrastructure, SaaS platforms, intellectual assets)
4. Value Propositions (the core products, services, custom offerings, or differentiators value)
5. Customer Relationships (personal assistance, self-service, automated customer interactions, CRM)
6. Channels (how to reach customers: e-commerce portal, mobile app, offline sales, emails)
7. Customer Segments (stakeholders, target client groups, niches)
8. Cost Structure (major costs, maintenance, hosting fees)
9. Revenue Streams (how the business makes money: transaction fees, subscription fees, retail margins)

For each item in the list, classify it into exactly one of these 9 categories.
Use the exact English name of the category:
- "Key Partners"
- "Key Activities"
- "Key Resources"
- "Value Propositions"
- "Customer Relationships"
- "Channels"
- "Customer Segments"
- "Cost Structure"
- "Revenue Streams"

Provide a short, clear, 1-sentence justification in Spanish for why the item belongs to that category, referencing the company context if provided.

You MUST respond with a valid JSON object strictly matching this format:
{
  "classifications": [
    {
      "item": "Item Name",
      "category": "Exact Category Name",
      "justification": "Explicación breve de por qué se asocia a esta categoría en español."
    }
  ]
}`;

    const userPrompt = `Company Description: ${companyDescription || "Not provided"}
Business Objectives: ${objectives || "Not provided"}

List of items to classify:
${items.map((item, idx) => `${idx + 1}. "${item}"`).join("\n")}

Return the JSON classifications:`;

    // 1. Try Ollama Native/Proxy
    try {
      const rawBase = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
      const ollamaUrl = rawBase.replace(/\/v1\/?$/, "");
      const model = process.env.EVAL_MODEL || "deepseek-r1:7b";
      const res = await fetch(`${ollamaUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" }
        }),
        signal: AbortSignal.timeout(15000), // Timeout 15s
      });

      if (res.ok) {
        const data = await res.json();
        const contentText = data.choices?.[0]?.message?.content;
        if (contentText) {
          const parsed = parseLLMResponse(contentText);
          if (parsed) return NextResponse.json(parsed);
        }
      }
    } catch (e: any) {
      console.warn("Ollama classification failed, trying fallbacks:", e.message);
    }

    // 2. Try DeepSeek if API key available
    if (process.env.DEEPSEEK_API_KEY) {
      try {
        const res = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
          }),
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
          const data = await res.json();
          const contentText = data.choices?.[0]?.message?.content;
          if (contentText) {
            const parsed = parseLLMResponse(contentText);
            if (parsed) return NextResponse.json(parsed);
          }
        }
      } catch (e: any) {
        console.warn("DeepSeek classification failed:", e.message);
      }
    }

    // 3. Try Gemini if API key available
    if (process.env.GOOGLE_API_KEY) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: systemPrompt + "\n\n" + userPrompt
                }]
              }],
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: "OBJECT",
                  properties: {
                    classifications: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          item: { type: "STRING" },
                          category: { type: "STRING" },
                          justification: { type: "STRING" }
                        },
                        required: ["item", "category", "justification"]
                      }
                    }
                  },
                  required: ["classifications"]
                }
              }
            }),
            signal: AbortSignal.timeout(8000),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            return NextResponse.json(parsed);
          }
        }
      } catch (e: any) {
        console.warn("Gemini classification failed:", e.message);
      }
    }

    // 4. Rule-based static fallback if all LLMs are down
    console.warn("All LLM connections failed. Using static heuristic fallback.");
    const fallbackClassifications = items.map((item) => {
      const lower = item.toLowerCase();
      let category = "Key Resources"; // default

      if (lower.includes("plataforma") || lower.includes("tienda online") || lower.includes("e-commerce") || lower.includes("canal")) {
        category = "Channels";
      } else if (lower.includes("socio") || lower.includes("proveedor") || lower.includes("distribuidor") || lower.includes("partner")) {
        category = "Key Partners";
      } else if (lower.includes("modelo de negocio") || lower.includes("oferta") || lower.includes("propuesta")) {
        category = "Value Propositions";
      } else if (lower.includes("proceso") || lower.includes("automatización") || lower.includes("capacitación") || lower.includes("gestión")) {
        category = "Key Activities";
      } else if (lower.includes("suscripción") || lower.includes("pago") || lower.includes("venta") || lower.includes("ingreso")) {
        category = "Revenue Streams";
      } else if (lower.includes("coste") || lower.includes("gasto") || lower.includes("estructura")) {
        category = "Cost Structure";
      } else if (lower.includes("cliente") || lower.includes("usuario") || lower.includes("segmento")) {
        category = "Customer Segments";
      } else if (lower.includes("relación") || lower.includes("atención") || lower.includes("comunicación")) {
        category = "Customer Relationships";
      }

      return {
        item,
        category,
        justification: "Clasificación heurística estática (falló conexión con LLM)."
      };
    });

    return NextResponse.json({ classifications: fallbackClassifications, fallback: true });

  } catch (error: any) {
    console.error("Critical error in classify-bmc API route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function parseLLMResponse(text: string) {
  let clean = text.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
  }
  try {
    return JSON.parse(clean);
  } catch (e) {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (inner) {
        console.error("Regex match JSON parse failed:", inner);
      }
    }
    return null;
  }
}
