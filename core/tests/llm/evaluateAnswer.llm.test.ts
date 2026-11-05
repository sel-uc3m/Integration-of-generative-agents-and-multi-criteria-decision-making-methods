import { describe, expect, it } from "vitest";
import { evaluateAnswer } from "../../src/llm.js";
import { evaluateAnswerCases } from "./fixtures/evaluateAnswerCases.js";

const describeIfEnabled = process.env.RUN_LLM_TESTS === "1" ? describe : describe.skip;

describeIfEnabled("LLM evals - evaluateAnswer", () => {
  it.each(evaluateAnswerCases)(
    "$name",
    async ({ question, answer, followUpAttempts, expected, expectedNextStep }) => {
      const actual = await evaluateAnswer(question, answer, followUpAttempts);
      expect(actual.verdict).toBe(expected);
      expect(actual.nextStep).toBe(expectedNextStep);
    },
  );
});
