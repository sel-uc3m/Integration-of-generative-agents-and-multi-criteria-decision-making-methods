import { describe, expect, it } from "vitest";
import { classifyResponse } from "../../src/llm.js";
import { classifyResponseCases } from "./fixtures/classifyResponseCases.js";

const describeIfEnabled = process.env.RUN_LLM_TESTS === "1" ? describe : describe.skip;

describeIfEnabled("LLM evals - classifyResponse", () => {
  it.each(classifyResponseCases)(
    "$name",
    async ({ question, response, expectedIntent, minConfidence }) => {
      const actual = await classifyResponse(response, question);

      expect(actual.intent).toBe(expectedIntent);
      expect(actual.confidence).toBeGreaterThanOrEqual(minConfidence);
    },
  );
});