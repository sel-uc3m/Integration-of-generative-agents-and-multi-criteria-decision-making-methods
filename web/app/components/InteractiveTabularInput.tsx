"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Table as TableIcon,
  Sliders,
  Check,
  CheckCircle,
  Plus,
  Trash2,
  Star,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Copy,
  Send,
  HelpCircle,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Layers,
  Activity,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  X
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export interface InteractiveTabularInputProps {
  activeInterrupt: any;
  onSubmit: (formattedAnswer: string) => void;
  onSyncText?: (formattedText: string) => void;
  disabled?: boolean;
  darkMode?: boolean;
}

type TabularStepType =
  | "sipac_assets"      // STEP_5_VALIDAR_ACTIVOS_IMPORTANCIA
  | "sipac_artifacts"   // STEP_7_VALIDAR_ARTEFACTOS
  | "sipac_indicators"  // STEP_9_MEDICION_EXACTA
  | "ahp_criteria"      // STEP_2_CONFIRM_CRITERIA
  | "generic";

interface AssetRow {
  id: string;
  objetivo: string;
  proceso: string;
  activo: string;
  giaTipo: string;
  importancia: number; // 1 to 5
}

interface ArtifactRow {
  id: string;
  proceso: string;
  activo: string;
  ci: string;
  artefacto: string;
  confirmed: boolean;
}

interface IndicatorRow {
  id: string;
  artefacto: string;
  activo: string;
  nombre: string;
  tipo: number; // 1 = Calidad, 2 = Impacto
  minimo: number;
  maximo: number;
  sentido: number; // 1 = Mayor mejor, -1 = Menor mejor
  actual: number;
  meta: number;
}

interface AhpCriterionRow {
  id: string;
  nombre: string;
  descripcion: string;
  included: boolean;
}

/**
 * Safely extracts JSON from raw text or prompt if markdown code blocks or brackets exist.
 */
function extractJsonFromText(text: string): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // try regex match
    const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export default function InteractiveTabularInput({
  activeInterrupt,
  onSubmit,
  onSyncText,
  disabled = false,
  darkMode = false,
}: InteractiveTabularInputProps) {
  const { t, tr } = useLanguage();
  // Detect step type from actionId
  const stepType = useMemo<TabularStepType | null>(() => {
    if (!activeInterrupt) return null;
    const actionId = (activeInterrupt.actionId || "").toUpperCase();

    if (actionId.includes("STEP_5") || actionId.includes("IMPORTANCIA")) {
      return "sipac_assets";
    }
    if (actionId.includes("STEP_7") || actionId.includes("ARTEFACTOS")) {
      return "sipac_artifacts";
    }
    if (actionId.includes("STEP_9") || actionId.includes("MEDICION") || actionId.includes("INDICADOR")) {
      return "sipac_indicators";
    }
    if (actionId.includes("CRITERIA") || actionId.includes("CRITERIOS") || actionId.includes("AHP")) {
      return "ahp_criteria";
    }

    return null;
  }, [activeInterrupt]);

  // Drawer open / collapse and full-screen state
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Tabular data states
  const [assetRows, setAssetRows] = useState<AssetRow[]>([]);
  const [artifactRows, setArtifactRows] = useState<ArtifactRow[]>([]);
  const [indicatorRows, setIndicatorRows] = useState<IndicatorRow[]>([]);
  const [ahpCriteriaRows, setAhpCriteriaRows] = useState<AhpCriterionRow[]>([]);

  // Initialize data when activeInterrupt changes
  useEffect(() => {
    if (!activeInterrupt || !stepType) return;

    const outputJson = activeInterrupt.outputJson || {};
    const questionText = activeInterrupt.question || activeInterrupt.prompt || "";

    if (stepType === "sipac_assets") {
      const source = outputJson.activos_propuestos || extractJsonFromText(questionText);
      const rows: AssetRow[] = [];

      if (Array.isArray(source)) {
        source.forEach((item: any, itemIdx: number) => {
          const obj = item.objetivo_negocio || "Objetivo Estratégico";
          const procs = item.procesos || [];
          procs.forEach((procObj: any, pIdx: number) => {
            const proc = procObj.proceso || "Proceso";
            const acts = procObj.activos || [];
            acts.forEach((act: any, aIdx: number) => {
              rows.push({
                id: `asset-${itemIdx}-${pIdx}-${aIdx}`,
                objetivo: obj,
                proceso: proc,
                activo: act.activo_especifico || act.nombre || "Activo Intangible",
                giaTipo: act.gia_tipo ? `GIA ${act.gia_tipo}` : "GIA",
                importancia: act.importancia_activo || 4,
              });
            });
          });
        });
      }

      // Default fallback rows if source had none
      if (rows.length === 0) {
        rows.push({
          id: "asset-default-1",
          objetivo: "Mejora Operacional",
          proceso: "Gestión Comercial",
          activo: "Cartera de clientes y CRM",
          giaTipo: "GIA 2",
          importancia: 4,
        });
      }

      setAssetRows(rows);
    } else if (stepType === "sipac_artifacts") {
      const source = outputJson.activos_ci_artefactos || extractJsonFromText(questionText);
      const rows: ArtifactRow[] = [];

      if (Array.isArray(source)) {
        source.forEach((item: any, itemIdx: number) => {
          const procs = item.procesos || [];
          procs.forEach((procObj: any, pIdx: number) => {
            const proc = procObj.proceso || "Proceso";
            const acts = procObj.activos || [];
            acts.forEach((act: any, aIdx: number) => {
              const suggested = Array.isArray(act.artefactos_propuestos) && act.artefactos_propuestos.length > 0
                ? act.artefactos_propuestos[0]
                : (act.artefacto || act.artefo || "Sistema Informático");

              rows.push({
                id: `art-${itemIdx}-${pIdx}-${aIdx}`,
                proceso: proc,
                activo: act.activo_especifico || "Activo",
                ci: act.intellectus_ci || "Capital Tecnológico",
                artefacto: suggested,
                confirmed: true,
              });
            });
          });
        });
      }

      if (rows.length === 0) {
        rows.push({
          id: "art-default-1",
          proceso: "Comercial",
          activo: "CRM y Clientes",
          ci: "Capital Relacional",
          artefacto: "CRM Cloud Integrado",
          confirmed: true,
        });
      }

      setArtifactRows(rows);
    } else if (stepType === "sipac_indicators") {
      const source = outputJson.indicadores_propuestos || extractJsonFromText(questionText);
      const rows: IndicatorRow[] = [];

      if (Array.isArray(source)) {
        source.forEach((item: any, itemIdx: number) => {
          const procs = item.procesos || [];
          procs.forEach((procObj: any, pIdx: number) => {
            const acts = procObj.activos || [];
            acts.forEach((act: any, aIdx: number) => {
              const arts = act.artefactos || act.artefactos_propuestos || [];
              arts.forEach((artObj: any, artIdx: number) => {
                const artName = typeof artObj === "string" ? artObj : (artObj.artefacto || artObj.artefo || artObj.name || "Herramienta");
                const inds = (artObj.indicadores || []);
                inds.forEach((ind: any, indIdx: number) => {
                  const min = typeof ind.minimo === "number" ? ind.minimo : 0;
                  const max = typeof ind.maximo === "number" ? ind.maximo : 100;
                  const sentido = ind.sentido === -1 ? -1 : 1;
                  
                  // Generate realistic initial actual & meta based on min/max and direction
                  const span = max - min;
                  const defaultActual = sentido === 1 
                    ? Math.round(min + span * 0.3) 
                    : Math.round(min + span * 0.7);
                  const defaultMeta = sentido === 1 
                    ? Math.round(min + span * 0.8) 
                    : Math.round(min + span * 0.25);

                  rows.push({
                    id: `ind-${itemIdx}-${pIdx}-${aIdx}-${artIdx}-${indIdx}`,
                    artefacto: artName,
                    activo: act.activo_especifico || "Activo",
                    nombre: ind.nombre || `KPI ${indIdx + 1}`,
                    tipo: ind.tipo === 2 ? 2 : 1,
                    minimo: min,
                    maximo: max,
                    sentido,
                    actual: defaultActual,
                    meta: defaultMeta,
                  });
                });
              });
            });
          });
        });
      }

      if (rows.length === 0) {
        rows.push({
          id: "ind-default-1",
          artefacto: "Plataforma Digital",
          activo: "Atención Cliente",
          nombre: "Tiempo de respuesta (horas)",
          tipo: 1,
          minimo: 1,
          maximo: 48,
          sentido: -1,
          actual: 24,
          meta: 4,
        });
        rows.push({
          id: "ind-default-2",
          artefacto: "Plataforma Digital",
          activo: "Atención Cliente",
          nombre: "Tasa de satisfacción (%)",
          tipo: 2,
          minimo: 0,
          maximo: 100,
          sentido: 1,
          actual: 65,
          meta: 90,
        });
      }

      setIndicatorRows(rows);
    } else if (stepType === "ahp_criteria") {
      const source = outputJson.ahp_suggested_criteria?.criterios_sugeridos || extractJsonFromText(questionText)?.criterios_sugeridos || [];
      const rows: AhpCriterionRow[] = [];

      if (Array.isArray(source)) {
        source.forEach((c: any, idx: number) => {
          rows.push({
            id: `crit-${idx}`,
            nombre: c.nombre || `Criterio ${idx + 1}`,
            descripcion: c.descripcion || "Relevante para los objetivos estratégicos",
            included: true,
          });
        });
      }

      if (rows.length === 0) {
        rows.push(
          { id: "c-1", nombre: "Coste de implementación", descripcion: "Inversión económica requerida", included: true },
          { id: "c-2", nombre: "Viabilidad técnica", descripcion: "Complejidad de integración y soporte", included: true },
          { id: "c-3", nombre: "Impacto en objetivos estratégicos", descripcion: "Retorno y alineación con metas", included: true }
        );
      }

      setAhpCriteriaRows(rows);
    }
  }, [activeInterrupt, stepType]);

  // Serializer: converts current table data to a clean text answer that LLMs reliably parse
  const generateFormattedAnswer = useCallback((): string => {
    if (!stepType) return "";

    if (stepType === "sipac_assets") {
      const lines = assetRows.map(
        (r) => `- Proceso: "${r.proceso}" | Activo: "${r.activo}" (${r.giaTipo}) -> Importancia: ${r.importancia}/5`
      );
      return `Confirmo los siguientes activos intangibles y sus importancias (escala 1 a 5):\n${lines.join("\n")}`;
    }

    if (stepType === "sipac_artifacts") {
      const lines = artifactRows
        .filter((r) => r.confirmed && r.artefacto.trim())
        .map(
          (r) => `- Para el activo "${r.activo}" (${r.ci}): Artefacto tecnológico propuesto -> "${r.artefacto}"`
        );
      return `Confirmo los siguientes artefactos tecnológicos definitivos para cada activo:\n${lines.join("\n")}`;
    }

    if (stepType === "sipac_indicators") {
      const lines = indicatorRows.map(
        (r) =>
          `- Indicador "${r.nombre}" (Artefacto: "${r.artefacto}"): Valor Actual = ${r.actual}, Valor Meta = ${r.meta} (Rango [${r.minimo}, ${r.maximo}], Sentido ${r.sentido === 1 ? "Mayor mejor" : "Menor mejor"})`
      );
      return `Valores actuales y metas establecidos para los indicadores de evaluación:\n${lines.join("\n")}`;
    }

    if (stepType === "ahp_criteria") {
      const included = ahpCriteriaRows.filter((c) => c.included && c.nombre.trim());
      const lines = included.map((c, i) => `${i + 1}. "${c.nombre}": ${c.descripcion}`);
      return `Acepto y confirmo los siguientes criterios finales para el modelo AHP:\n${lines.join("\n")}`;
    }

    return "";
  }, [stepType, assetRows, artifactRows, indicatorRows, ahpCriteriaRows]);

  // Handle direct submit from table
  const handleSubmitFromTable = () => {
    const text = generateFormattedAnswer();
    if (text) {
      if (isMaximized) setIsMaximized(false);
      onSubmit(text);
    }
  };

  // Handle sync/copy to chat input
  const handleCopyToChat = () => {
    const text = generateFormattedAnswer();
    if (text && onSyncText) {
      onSyncText(text);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    }
  };

  // Quick autofill for fast testing / demos
  const handleAutoTuneValues = () => {
    if (stepType === "sipac_assets") {
      setAssetRows((prev) =>
        prev.map((r, i) => ({
          ...r,
          importancia: (i % 2 === 0 ? 5 : 4),
        }))
      );
    } else if (stepType === "sipac_indicators") {
      setIndicatorRows((prev) =>
        prev.map((r) => {
          const span = r.maximo - r.minimo;
          return {
            ...r,
            actual: r.sentido === 1 ? Math.round(r.minimo + span * 0.35) : Math.round(r.minimo + span * 0.65),
            meta: r.sentido === 1 ? Math.round(r.minimo + span * 0.85) : Math.round(r.minimo + span * 0.2),
          };
        })
      );
    }
  };

  if (!stepType) return null;

  // Render Table Content
  const renderTableBody = () => (
    <>
      {/* 1. SIPAC STEP 5: ASSETS & IMPORTANCE (1-5) */}
      {stepType === "sipac_assets" && (
        <div className="space-y-3">
          <div className={`${isMaximized ? "max-h-[60vh]" : "max-h-56 sm:max-h-64"} overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-100/90 dark:bg-zinc-900/90 sticky top-0 z-10 text-zinc-700 dark:text-zinc-300 font-extrabold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3">Proceso Organizacional</th>
                  <th className="py-2.5 px-3">Activo Intangible Específico</th>
                  <th className="py-2.5 px-3">GIA</th>
                  <th className="py-2.5 px-3 text-center">Importancia (1 - 5)</th>
                  <th className="py-2.5 px-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
                {assetRows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-zinc-800 dark:text-zinc-200 max-w-[160px] truncate" title={row.proceso}>
                      {row.proceso}
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.activo}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAssetRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, activo: val } : r))
                          );
                        }}
                        className="w-full text-xs font-bold py-1 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                        {row.giaTipo}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((score) => {
                          const isSelected = row.importancia === score;
                          return (
                            <button
                              key={score}
                              type="button"
                              onClick={() => {
                                setAssetRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, importancia: score } : r))
                                );
                              }}
                              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg font-black text-xs transition-all cursor-pointer flex items-center justify-center ${
                                isSelected
                                  ? score >= 4
                                    ? "bg-emerald-500 text-white shadow-xs scale-105"
                                    : score === 3
                                    ? "bg-amber-500 text-white shadow-xs scale-105"
                                    : "bg-zinc-600 text-white shadow-xs scale-105"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                              }`}
                              title={`Importancia ${score} de 5`}
                            >
                              {score}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => setAssetRows((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                        title="Eliminar activo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setAssetRows((prev) => [
                  ...prev,
                  {
                    id: `custom-asset-${Date.now()}`,
                    objetivo: "General",
                    proceso: prev[0]?.proceso || "Proceso Operativo",
                    activo: "Nuevo Activo Intangible",
                    giaTipo: "GIA 11",
                    importancia: 4,
                  },
                ]);
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Activo Intangible</span>
            </button>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
              {assetRows.length} activos listados
            </div>
          </div>
        </div>
      )}

      {/* 2. SIPAC STEP 7: ARTIFACTS VALIDATION */}
      {stepType === "sipac_artifacts" && (
        <div className="space-y-3">
          <div className={`${isMaximized ? "max-h-[60vh]" : "max-h-56 sm:max-h-64"} overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-100/90 dark:bg-zinc-900/90 sticky top-0 z-10 text-zinc-700 dark:text-zinc-300 font-extrabold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3">Activo Intangible</th>
                  <th className="py-2.5 px-3">Intellectus (CI)</th>
                  <th className="py-2.5 px-3">Artefacto Tecnológico Propuesto</th>
                  <th className="py-2.5 px-3 text-center w-24">Confirmar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
                {artifactRows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-zinc-100 max-w-[150px] truncate" title={row.activo}>
                      {row.activo}
                      <div className="text-[10px] text-zinc-500 font-mono">{row.proceso}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 capitalize">
                        {row.ci}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.artefacto}
                        onChange={(e) => {
                          const val = e.target.value;
                          setArtifactRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, artefacto: val } : r))
                          );
                        }}
                        className="w-full text-xs font-bold py-1 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="Nombre del software o herramienta..."
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.confirmed}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setArtifactRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, confirmed: val } : r))
                          );
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SIPAC STEP 9: INDICATORS CALIBRATION (ACTUAL vs META) */}
      {stepType === "sipac_indicators" && (
        <div className="space-y-3">
          <div className={`${isMaximized ? "max-h-[60vh]" : "max-h-60 sm:max-h-72"} overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-100/90 dark:bg-zinc-900/90 sticky top-0 z-10 text-zinc-700 dark:text-zinc-300 font-extrabold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3">Artefacto</th>
                  <th className="py-2.5 px-3">Indicador / KPI</th>
                  <th className="py-2.5 px-2 text-center">Rango [Mín - Máx]</th>
                  <th className="py-2.5 px-2 text-center">Sentido</th>
                  <th className="py-2.5 px-3 text-center w-28">Valor Actual</th>
                  <th className="py-2.5 px-3 text-center w-28">Valor Meta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
                {indicatorRows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="py-2 px-3 font-semibold text-zinc-800 dark:text-zinc-200 max-w-[130px] truncate" title={row.artefacto}>
                      {row.artefacto}
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-bold text-zinc-900 dark:text-white max-w-[170px] truncate" title={row.nombre}>
                        {row.nombre}
                      </div>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        row.tipo === 1 ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      }`}>
                        {row.tipo === 1 ? "Tipo 1 (Calidad)" : "Tipo 2 (Impacto)"}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center font-mono text-[11px] text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      [{row.minimo} - {row.maximo}]
                    </td>
                    <td className="py-2 px-2 text-center">
                      {row.sentido === 1 ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                          <ArrowUp className="w-3 h-3" /> Mayor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                          <ArrowDown className="w-3 h-3" /> Menor
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={row.actual}
                        min={row.minimo}
                        max={row.maximo}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setIndicatorRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, actual: val } : r))
                          );
                        }}
                        className="w-full text-xs font-bold py-1 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={row.meta}
                        min={row.minimo}
                        max={row.maximo}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setIndicatorRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, meta: val } : r))
                          );
                        }}
                        className="w-full text-xs font-bold py-1 px-2 rounded-lg border border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/50 text-indigo-900 dark:text-sky-200 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. AHP STEP 2: CRITERIA CONFIRMATION */}
      {stepType === "ahp_criteria" && (
        <div className="space-y-3">
          <div className={`${isMaximized ? "max-h-[60vh]" : "max-h-56 sm:max-h-64"} overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-100/90 dark:bg-zinc-900/90 sticky top-0 z-10 text-zinc-700 dark:text-zinc-300 font-extrabold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">Activo</th>
                  <th className="py-2.5 px-3">Nombre del Criterio</th>
                  <th className="py-2.5 px-3">Justificación / Descripción</th>
                  <th className="py-2.5 px-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
                {ahpCriteriaRows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.included}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setAhpCriteriaRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, included: val } : r))
                          );
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.nombre}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAhpCriteriaRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, nombre: val } : r))
                          );
                        }}
                        className="w-full text-xs font-bold py-1 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.descripcion}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAhpCriteriaRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, descripcion: val } : r))
                          );
                        }}
                        className="w-full text-xs py-1 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => setAhpCriteriaRows((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                        title="Eliminar criterio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setAhpCriteriaRows((prev) => [
                  ...prev,
                  {
                    id: `crit-custom-${Date.now()}`,
                    nombre: "Nuevo Criterio",
                    descripcion: "Descripción del criterio",
                    included: true,
                  },
                ]);
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Criterio Personalizado</span>
            </button>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
              {ahpCriteriaRows.filter((c) => c.included).length} activos seleccionados
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons Bar */}
      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyToChat}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 transition-all cursor-pointer shadow-2xs"
            title="Copia el resumen formateado al chat para editarlo antes de enviar"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedNotification ? "¡Copiado al chat!" : "Copiar al chat"}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleSubmitFromTable}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-extrabold text-xs shadow-md hover:shadow-indigo-500/20 active:scale-[0.99] transition-all cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Enviar respuesta desde tabla</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Inline Drawer Container */}
      <div className="mb-3 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/70 via-white to-white dark:from-indigo-950/30 dark:via-zinc-950 dark:to-zinc-950 shadow-md overflow-hidden transition-all duration-300">
        {/* Top Header Bar with toggle & info */}
        <div className="px-4 py-2.5 bg-indigo-100/70 dark:bg-indigo-950/60 border-b border-indigo-200/80 dark:border-indigo-900/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200 truncate">
                  {stepType === "sipac_assets" && tr("SIPAC Paso 5 · Activos e Importancias", "SIPAC Step 5 · Assets & Importance")}
                  {stepType === "sipac_artifacts" && tr("SIPAC Paso 7 · Artefactos Propuestos", "SIPAC Step 7 · Proposed Artifacts")}
                  {stepType === "sipac_indicators" && tr("SIPAC Paso 9 · Calibración de Indicadores", "SIPAC Step 9 · Indicator Calibration")}
                  {stepType === "ahp_criteria" && tr("AHP Paso 2 · Criterios de Decisión", "AHP Step 2 · Decision Criteria")}
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-200/80 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-300 font-mono">
                  {tr("Tabla Guiada", "Guided Table")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleAutoTuneValues}
              className="hidden md:flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200/60 dark:hover:bg-indigo-900/60 rounded-lg transition-colors cursor-pointer"
              title={tr("Pre-cargar valores sugeridos", "Pre-load suggested values")}
            >
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>{tr("Sugeridos", "Suggested")}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMaximized(true)}
              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title={tr("Maximizar tabla a pantalla completa", "Maximize table to full screen")}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title={isExpanded ? tr("Colapsar tabla", "Collapse table") : tr("Desplegar tabla", "Expand table")}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="p-3 sm:p-4 space-y-3">
            {renderTableBody()}
          </div>
        )}
      </div>

      {/* 2. Maximized Modal View */}
      {isMaximized && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                    {stepType === "sipac_assets" && tr("SIPAC Paso 5 · Edición de Activos e Importancia", "SIPAC Step 5 · Asset & Importance Editing")}
                    {stepType === "sipac_artifacts" && tr("SIPAC Paso 7 · Edición de Artefactos de Software", "SIPAC Step 7 · Software Artifact Editing")}
                    {stepType === "sipac_indicators" && tr("SIPAC Paso 9 · Calibración de Indicadores (Actual vs Meta)", "SIPAC Step 9 · Indicator Calibration (Actual vs Target)")}
                    {stepType === "ahp_criteria" && tr("AHP Paso 2 · Criterios de Evaluación y Priorización", "AHP Step 2 · Evaluation Criteria & Prioritization")}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {tr("Modo extendido de alta productividad. Edita los valores y pulsa enviar para continuar la entrevista.", "Extended high-productivity mode. Edit the values and submit to continue the interview.")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoTuneValues}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-sky-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{tr("Cargar Sugeridos", "Load Suggested")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMaximized(false)}
                  className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title={tr("Cerrar vista maximizada", "Close maximized view")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {renderTableBody()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
