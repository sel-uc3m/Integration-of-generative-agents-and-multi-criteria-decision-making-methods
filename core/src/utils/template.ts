/**
 * Resolves a nested property path (e.g. "a.b.c") in an object.
 */
export function resolvePath(obj: any, path: string): unknown {
  if (obj === null || obj === undefined) return undefined;
  if (path in obj) return obj[path];
  return path.split('.').reduce((acc, part) => (acc !== null && acc !== undefined ? acc[part] : undefined), obj);
}

/**
 * Replaces placeholders like {variable_name} or {object.property} with values from context data.
 * If a variable is not found in data, it preserves the original placeholder.
 */
export function interpolateTemplate(
  text: string,
  data: Record<string, unknown>,
  options: { prettyPrintObjects?: boolean } = { prettyPrintObjects: true }
): string {
  if (!text) return "";
  return text.replace(/\{([^{}]+)\}/g, (match, key) => {
    const trimmedKey = key.trim();
    const val = resolvePath(data, trimmedKey);
    if (val !== undefined) {
      if (typeof val === "object" && val !== null) {
        return options.prettyPrintObjects ? JSON.stringify(val, null, 2) : JSON.stringify(val);
      }
      return String(val);
    }
    return match;
  });
}

/**
 * Cleans and strips markdown fences and thinking blocks from LLM generated JSON strings.
 */
export function cleanJsonString(text: string): string {
  if (!text) return "";
  let clean = text.trim();
  
  // Strip <think> tags (e.g. DeepSeek-R1)
  clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Extract from markdown code fences if present
  const markdownMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (markdownMatch) {
    clean = markdownMatch[1].trim();
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
  }

  return clean;
}

/**
 * Safely parses JSON after cleaning code fences, with fallback candidate extraction.
 */
export function safeParseJson<T = unknown>(text: string, fallback?: T): T {
  const cleaned = cleanJsonString(text);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try candidate JSON block extraction
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]) as T;
      } catch {
        // Continue to fallback
      }
    }
    if (fallback !== undefined) return fallback;
    throw new Error(`Failed to parse JSON: "${text}"`);
  }
}
