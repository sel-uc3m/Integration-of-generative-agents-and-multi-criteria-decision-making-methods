import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

/**
 * Attaches a robust custom structured output handler to a ChatOpenAI instance.
 * Handles local model peculiarities, think tags (DeepSeek-R1), markdown code fences,
 * and key-value text fallbacks.
 */
export function attachCustomStructuredOutput(instance: ChatOpenAI): void {
  (instance as any).withStructuredOutput = function (
    outputSchema: any,
    _config?: any,
  ) {
    return {
      async invoke(messages: any[], options: any) {
        const isArraySchema =
          outputSchema instanceof z.ZodArray ||
          (outputSchema && typeof outputSchema === "object" && outputSchema.type === "array");

        let schemaInstructions = "";
        let formatTypeDirective = "valid JSON matching the schema";

        if (outputSchema instanceof z.ZodObject) {
          const shape = outputSchema.shape;
          const properties = Object.entries(shape)
            .map(([key, value]) => {
              const description = (value as any).description || "";
              return `- "${key}": ${description}`;
            })
            .join("\n");
          schemaInstructions = `The output MUST be a JSON object with exactly these keys:\n${properties}`;
          formatTypeDirective = "a raw, valid JSON object (starting with { and ending with })";
        } else if (isArraySchema) {
          schemaInstructions = `The output MUST be a JSON Array conforming strictly to this JSON Schema:\n${JSON.stringify(outputSchema, null, 2)}`;
          formatTypeDirective = "a raw, valid JSON array (starting with [ and ending with ])";
        } else if (
          outputSchema &&
          typeof outputSchema === "object" &&
          (outputSchema.type === "object" || "properties" in outputSchema)
        ) {
          schemaInstructions = `The output MUST be a JSON Object conforming strictly to this JSON Schema:\n${JSON.stringify(outputSchema, null, 2)}`;
          formatTypeDirective = "a raw, valid JSON object (starting with { and ending with })";
        } else {
          schemaInstructions = `The output MUST be structured JSON conforming to the requested format.`;
        }

        const formattingPrompt =
          `\n\nCRITICAL OUTPUT FORMATTING INSTRUCTION:\n` +
          `You must respond ONLY with ${formatTypeDirective}.\n` +
          `Do NOT wrap the JSON in markdown code blocks (do NOT use \`\`\`json or \`\`\`).\n` +
          `Do NOT include any preamble, introduction, or explanation outside of the JSON.\n` +
          `${schemaInstructions}`;

        const messagesCopy = [...messages];
        const systemMessageIndex = messagesCopy.findIndex(
          (msg) => msg instanceof SystemMessage,
        );
        if (systemMessageIndex !== -1) {
          messagesCopy[systemMessageIndex] = new SystemMessage(
            messagesCopy[systemMessageIndex].content + formattingPrompt,
          );
        } else if (messagesCopy.length > 0) {
          const lastIdx = messagesCopy.length - 1;
          const lastMsg = messagesCopy[lastIdx];
          if (lastMsg instanceof HumanMessage) {
            messagesCopy[lastIdx] = new HumanMessage(
              lastMsg.content + formattingPrompt,
            );
          }
        }

        const response = await instance.invoke(messagesCopy, options);
        const text =
          typeof response.content === "string"
            ? response.content.trim()
            : JSON.stringify(response.content);

        let cleanText = text;
        cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

        const safeValidateWithSchema = (parsed: any) => {
          // 1. Zod schema validation
          if (outputSchema instanceof z.ZodType) {
            try {
              return outputSchema.parse(parsed);
            } catch (err) {
              if (
                parsed &&
                typeof parsed === "object" &&
                !Array.isArray(parsed) &&
                outputSchema instanceof z.ZodObject
              ) {
                const shape = (outputSchema as z.ZodObject<any>).shape;
                const keys = Object.keys(shape);
                if (keys.length === 1 && !(keys[0] in parsed)) {
                  const fallbackObj = {
                    [keys[0]]:
                      Object.keys(parsed).length === 0
                        ? ""
                        : JSON.stringify(parsed),
                  };
                  return outputSchema.parse(fallbackObj);
                }
              }
              throw err;
            }
          }

          // 2. JSON Schema validation
          if (outputSchema && typeof outputSchema === "object") {
            if (outputSchema.type === "array") {
              if (!Array.isArray(parsed)) {
                throw new Error(
                  `Validation Error: Expected a JSON Array (e.g. [...]), but received ${
                    typeof parsed === "object" && parsed !== null
                      ? `JSON Object with keys [${Object.keys(parsed).join(", ")}]`
                      : typeof parsed
                  }. Make sure your output starts with [ and ends with ].`
                );
              }
              if (parsed.length === 0) {
                throw new Error(
                  `Validation Error: Expected a non-empty JSON Array with business data, but received an empty array [].`
                );
              }

              const itemsSchema = outputSchema.items;
              if (itemsSchema && typeof itemsSchema === "object" && Array.isArray(itemsSchema.required)) {
                for (let i = 0; i < parsed.length; i++) {
                  const item = parsed[i];
                  if (typeof item !== "object" || item === null || Array.isArray(item)) {
                    throw new Error(
                      `Validation Error: Array item at index ${i} must be a JSON object, received ${typeof item}`
                    );
                  }
                  for (const reqField of itemsSchema.required) {
                    if (!(reqField in item)) {
                      throw new Error(
                        `Validation Error: Missing required field "${reqField}" in array item at index ${i}. Present keys: [${Object.keys(
                          item
                        ).join(", ")}]`
                      );
                    }
                  }
                }
              }
              return parsed;
            }

            if (outputSchema.type === "object") {
              if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
                throw new Error(
                  `Validation Error: Expected a JSON Object (e.g. {...}), but received ${
                    Array.isArray(parsed) ? "JSON Array [...]" : typeof parsed
                  }.`
                );
              }
              if (Array.isArray(outputSchema.required)) {
                for (const reqField of outputSchema.required) {
                  if (!(reqField in parsed)) {
                    throw new Error(
                      `Validation Error: Missing required field "${reqField}" in JSON object. Present keys: [${Object.keys(
                        parsed
                      ).join(", ")}]`
                    );
                  }
                }
              }
              return parsed;
            }
          }

          return parsed;
        };

        // 1. Extract markdown code blocks ```json ... ``` first if present
        const markdownBlocks = [
          ...cleanText.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi),
        ];
        for (const block of markdownBlocks) {
          const blockContent = block[1].trim();
          try {
            const parsed = JSON.parse(blockContent);
            return safeValidateWithSchema(parsed);
          } catch {
            const candidateRegex = isArraySchema ? /\[[\s\S]*?\]/g : /\{[\s\S]*?\}/g;
            const blockJsonCandidates = blockContent.match(candidateRegex);
            if (blockJsonCandidates) {
              for (const candidate of blockJsonCandidates) {
                try {
                  const extractedParsed = JSON.parse(candidate);
                  return safeValidateWithSchema(extractedParsed);
                } catch {
                  // Continue searching candidates
                }
              }
            }
          }
        }

        if (cleanText.startsWith("```")) {
          cleanText = cleanText
            .replace(/^```[a-zA-Z]*\n?/, "")
            .replace(/\n?```$/, "")
            .trim();
        }

        try {
          const parsed = JSON.parse(cleanText);
          return safeValidateWithSchema(parsed);
        } catch (e) {
          const candidateRegex = isArraySchema ? /\[[\s\S]*?\]/g : /\{[\s\S]*?\}/g;
          const jsonCandidates = cleanText.match(candidateRegex);
          if (jsonCandidates) {
            for (const candidate of jsonCandidates) {
              try {
                const extractedParsed = JSON.parse(candidate);
                return safeValidateWithSchema(extractedParsed);
              } catch {
                // Try next candidate
              }
            }
          }

          // Fallback for models returning key-value format
          if (outputSchema instanceof z.ZodObject) {
            const extractedObj: Record<string, any> = {};
            const lines = cleanText.split("\n");
            for (const line of lines) {
              const match = line.match(
                /\*?\*?([a-zA-Z0-9_\s]+)\*?\*?:\s*(.+)/,
              );
              if (match) {
                const key = match[1]
                  .trim()
                  .toLowerCase()
                  .replace(/[\s-_]/g, "");
                let val: any = match[2].trim().replace(/^["']|["']$/g, "");
                if (val.toLowerCase() === "true") val = true;
                else if (val.toLowerCase() === "false") val = false;
                else if (!isNaN(Number(val)) && val !== "") val = Number(val);

                if (key === "verdict")
                  extractedObj.verdict = val.toString().toLowerCase();
                else if (key === "confidence")
                  extractedObj.confidence = Number(val);
                else if (key === "nextstep")
                  extractedObj.nextStep = val.toString().toLowerCase();
                else if (key === "question") extractedObj.question = val;
                else if (key === "razonamiento" || key === "reasoning")
                  extractedObj.reasoning = val;
              }
            }
            if (Object.keys(extractedObj).length > 0) {
              try {
                return outputSchema.parse(extractedObj);
              } catch {
                // Fall through to error logging
              }
            }
          }
          console.error(
            `[LLM][CustomStructuredOutput] Failed to parse output: "${cleanText}". Error: ${e}`,
          );
          throw e;
        }
      },
    };
  };
}
