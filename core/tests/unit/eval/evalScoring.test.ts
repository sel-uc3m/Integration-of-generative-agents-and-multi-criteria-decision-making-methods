import { describe, it, expect } from "vitest";
import { solveBipartiteMatching, dotProduct, magnitude, fallbackNgramSimilarity } from "../../../eval/scoring.js";
import { extractJsonFromText } from "../../../eval/config.js";
import { extractSipacEntities, scoreAltusOutput } from "../../../eval/evaluators.js";
import { parseEvalArgs } from "../../../eval/runner.js";

describe("Evaluation Module Unit Tests", () => {
  describe("Bipartite Matching Algorithm", () => {
    it("matches 1-to-1 maximum weight assignments without conflicts", () => {
      const scoreMatrix = [
        [0.9, 0.2],
        [0.8, 0.95],
      ];
      const matches = solveBipartiteMatching(scoreMatrix);
      expect(matches).toEqual([
        [1, 1], // highest score 0.95
        [0, 0], // remaining highest 0.9
      ]);
    });

    it("handles empty matrices gracefully", () => {
      expect(solveBipartiteMatching([])).toEqual([]);
      expect(solveBipartiteMatching([[]])).toEqual([]);
    });

    it("ignores zero-score pairs", () => {
      const scoreMatrix = [
        [0.0, 0.0],
        [0.0, 0.0],
      ];
      expect(solveBipartiteMatching(scoreMatrix)).toEqual([]);
    });
  });

  describe("Embedding & Math Utilities", () => {
    it("computes dot product and magnitude correctly", () => {
      const a = [1, 2, 3];
      const b = [4, 5, 6];
      expect(dotProduct(a, b)).toBe(32);
      expect(magnitude([3, 4])).toBe(5);
    });

    it("computes fallback n-gram Jaccard similarity", () => {
      expect(fallbackNgramSimilarity("sistema crm ventas", "sistema crm ventas")).toBe(1.0);
      expect(fallbackNgramSimilarity("sistema crm ventas", "sistema erp inventario")).toBeCloseTo(1 / 5, 2);
      expect(fallbackNgramSimilarity("", "algo")).toBe(0.0);
    });
  });

  describe("LLM JSON Extraction", () => {
    it("strips think tags and extracts JSON markdown fences", () => {
      const raw = `<think>
Analyzing the response...
The reasoning is clear.
</think>
\`\`\`json
{
  "score": 3,
  "reasoning": "Identical concept."
}
\`\`\``;
      const parsed = extractJsonFromText(raw);
      expect(parsed).toEqual({ score: 3, reasoning: "Identical concept." });
    });

    it("extracts bare JSON object when no markdown fences exist", () => {
      const raw = `Here is the evaluation result: {"score": 2, "reasoning": "Good."} Have a nice day!`;
      const parsed = extractJsonFromText(raw);
      expect(parsed).toEqual({ score: 2, reasoning: "Good." });
    });
  });

  describe("SIPAC Entity Extractor", () => {
    it("extracts entities from structured variable output", () => {
      const outputJson = {
        activos_propuestos: [
          {
            procesos: [
              {
                activos: [
                  {
                    gia_tipo: "1",
                    activo_especifico: "Know-how de patronaje",
                    intellectus_ci: ["Capital Humano", "Capital Tecnológico"],
                    artefactos: ["Manual de diseño", "Fichas técnicas"],
                    indicadores: ["Tiempo de patronaje", "Tasa de error"],
                  },
                ],
              },
            ],
          },
        ],
      };

      const extracted = extractSipacEntities(outputJson);
      expect(extracted.gia).toContain("GIA 1");
      expect(extracted.activosIntangibles).toContain("Know-how de patronaje");
      expect(extracted.intellectusCi).toContain("Capital Humano");
      expect(extracted.intellectusCi).toContain("Capital Tecnológico");
      expect(extracted.artefactos).toContain("Manual de diseño");
      expect(extracted.indicadores).toContain("Tiempo de patronaje");
    });
  });

  describe("ALTUS Scoring", () => {
    it("computes accuracy and MAE against expected scores", () => {
      const capacities = [
        { capacityId: "C1", capacityName: "Cap 1", question: "Q1", expectedScore: 3, fullContext: "", initialVagueResponse: "" },
        { capacityId: "C2", capacityName: "Cap 2", question: "Q2", expectedScore: 4, fullContext: "", initialVagueResponse: "" },
      ];

      const outputJson = {
        "C1": { qualification: 3 },
        "C2": { score: 2 },
      };

      const scores = scoreAltusOutput(outputJson, capacities);
      expect(scores.accuracy).toBe(0.5);
      expect(scores.mae).toBe(1.0);
      expect(scores.correctCount).toBe(1);
      expect(scores.totalCount).toBe(2);
    });
  });

  describe("CLI Args Parsing", () => {
    it("parses models, module filters, and fresh flags", () => {
      const args = ["--models=gpt-4o,claude-3-5", "--module=sipac", "--fresh=sipac", "--case=G1"];
      const parsed = parseEvalArgs(args);

      expect(parsed.models).toEqual(["gpt-4o", "claude-3-5"]);
      expect(parsed.targetModule).toBe("sipac");
      expect(parsed.shouldRunSipac).toBe(true);
      expect(parsed.shouldRunAltus).toBe(false);
      expect(parsed.isFreshSipac).toBe(true);
      expect(parsed.isFreshAltus).toBe(false);
      expect(parsed.targetCases).toEqual(["g1"]);
    });
  });
});
