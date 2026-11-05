import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  ReferenceLine
} from "recharts";
import {
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Star,
  Award,
  TrendingUp,
  Layers,
  ChevronDown,
  ChevronUp,
  Users,
  Briefcase,
  GitBranch,
  Settings,
  Sparkles,
  RefreshCw,
  HelpCircle as QuestionIcon,
  Crown,
  Maximize2,
  Minimize2,
  BarChart3,
  PieChart as PieIcon,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  FileText,
  Activity,
  Compass,
  Info,
  GripVertical,
  X,
  ArrowUpRight,
  Eye,
  Check,
  RotateCcw
} from "lucide-react";
import {
  calcAltusScores,
  ALTUS_ARCHITECTURAL_LEVELS,
  ALTUS_CAPABILITIES_CONFIG,
  ALTUS_ACTION_RECOMMENDATIONS,
  type AltusAnalysis,
  type AltusCapacidad
} from "@tfm/core/dist/altus_logic.js";
import { calcSipacScores, classifySipacQuadrant } from "@tfm/core/dist/sipac_logic.js";
import { calcAhp } from "@tfm/core/dist/ahp_logic.js";
import { RECHARTS_THEME, COLOR_TOKENS, CHART_PALETTE, getSaatyStatus } from "@/app/theme/tokens";
import { useLanguage } from "../context/LanguageContext";

interface ResultsDashboardProps {
  data: any;
  processType: "altus" | "sipac" | "ahp" | "custom" | string;
}

// Custom Tooltip for ALTUS Bar & Line Charts with high contrast and rich stats
const CustomAltusTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="p-3 bg-zinc-950 text-white rounded-xl shadow-2xl border border-zinc-700 text-xs space-y-1.5 z-50 min-w-[200px] pointer-events-none">
        <div className="font-bold flex items-center justify-between gap-3 border-b border-zinc-800 pb-1.5">
          <span className="text-white">{dataPoint.name || label}</span>
          {dataPoint.code && (
            <span className="font-mono text-2xs px-1.5 py-0.5 rounded bg-indigo-900/70 text-indigo-400 font-bold border border-indigo-700/60">
              {dataPoint.code}
            </span>
          )}
        </div>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => {
            const isPct = entry.name?.toLowerCase().includes('%') || entry.name?.toLowerCase().includes('cobertura') || entry.name?.toLowerCase().includes('logro') || entry.dataKey === 'cobertura';
            return (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
                  <span>{entry.name}:</span>
                </span>
                <span className="font-mono font-bold text-white">
                  {typeof entry.value === 'number' 
                    ? (isPct ? `${entry.value.toFixed(1)}%` : `${entry.value} pts`)
                    : entry.value}
                </span>
              </div>
            );
          })}
        </div>
        {dataPoint.cobertura !== undefined && !payload.some((p: any) => p.dataKey === 'cobertura') && (
          <div className="text-2xs text-zinc-400 pt-1.5 border-t border-zinc-800 flex justify-between">
            <span>% Cobertura Alcanzada:</span>
            <span className="font-bold font-mono text-indigo-400">{dataPoint.cobertura}%</span>
          </div>
        )}
        {dataPoint.avg !== undefined && (
          <div className="text-2xs text-zinc-400 pt-1.5 border-t border-zinc-800 flex justify-between">
            <span>Media Likert:</span>
            <span className="font-bold font-mono text-emerald-400">{dataPoint.avg} / 5.0</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// Custom Tooltip for BSC Stacked Bar Charts
const CustomBscTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 bg-zinc-950 text-white rounded-xl shadow-2xl border border-zinc-700 text-xs space-y-1.5 z-50 min-w-[180px] pointer-events-none">
        <div className="font-bold border-b border-zinc-800 pb-1.5 text-white">
          {label}
        </div>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => {
            const rawCount = entry.payload?.rawCounts?.[entry.name];
            return (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
                  <span>{entry.name}:</span>
                </span>
                <span className="font-mono font-bold text-white">
                  {entry.value}% {rawCount !== undefined ? `(${rawCount} caps)` : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export default function ResultsDashboard({ data: rawData, processType }: ResultsDashboardProps) {
  const { t, tr } = useLanguage();
  const data = rawData?.outputJson || rawData;

  // State for ALTUS Views
  const [altusTab, setAltusTab] = useState<"analysis" | "health" | "scorecard" | "details">("analysis");
  const [altusSelectedMl, setAltusSelectedMl] = useState<number>(0); // 0 = Todos / Global, 1 = ML1, 2 = ML2, 3 = ML3, 4 = ML4
  const [altusDimFilter, setAltusDimFilter] = useState<string>("ALL");
  const [altusStatusFilter, setAltusStatusFilter] = useState<string>("ALL");
  const [altusSearchQuery, setAltusSearchQuery] = useState<string>("");
  const [altusExpandedCapId, setAltusExpandedCapId] = useState<string | null>(null);
  const [hoveredArchCode, setHoveredArchCode] = useState<string | null>(null);

  // State for SIPAC Views & Canvas
  const [sipacTab, setSipacTab] = useState<"canvas" | "matrix">("canvas");
  const [hoveredSipacItem, setHoveredSipacItem] = useState<string | null>(null);
  const [hoveredBmcBlock, setHoveredBmcBlock] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [sipacBoard, setSipacBoard] = useState<Record<string, string>>({});
  const [sipacUnassigned, setSipacUnassigned] = useState<string[]>([]);
  const [sipacClassifications, setSipacClassifications] = useState<Record<string, { category: string; justification: string }>>({});
  const [sipacHealthMap, setSipacHealthMap] = useState<Record<string, "stable" | "evolving" | "replaceable" | "warning">>({});
  const [isClassifying, setIsClassifying] = useState(false);
  const [agentFeedback, setAgentFeedback] = useState<string | null>(null);
  const [agentFeedbackType, setAgentFeedbackType] = useState<"success" | "warning" | "info">("info");

  const getHealthInfo = (item: string) => {
    const status = sipacHealthMap[item] || "evolving";
    switch (status) {
      case "stable":
        return {
          status: "stable" as const,
          label: tr("Estable", "Stable"),
          badgeBg: "bg-emerald-100 dark:bg-emerald-950/70",
          badgeText: "text-emerald-800 dark:text-emerald-300",
          badgeBorder: "border-emerald-300 dark:border-emerald-800",
          cardBg: "bg-emerald-50/60 dark:bg-emerald-950/25",
          cardBorder: "border-emerald-300 dark:border-emerald-800/80",
          cardHoverBorder: "hover:border-emerald-500 dark:hover:border-emerald-400",
          dotColor: "bg-emerald-500",
          description: tr("Calidad e impacto altos (activo consolidado)", "High quality and high impact (consolidated asset)"),
        };
      case "evolving":
        return {
          status: "evolving" as const,
          label: tr("En Evolución", "Evolving"),
          badgeBg: "bg-sky-100 dark:bg-sky-950/70",
          badgeText: "text-sky-800 dark:text-sky-300",
          badgeBorder: "border-sky-300 dark:border-sky-800",
          cardBg: "bg-sky-50/60 dark:bg-sky-950/25",
          cardBorder: "border-sky-300 dark:border-sky-800/80",
          cardHoverBorder: "hover:border-sky-500 dark:hover:border-sky-400",
          dotColor: "bg-sky-500",
          description: tr("Alto impacto estratégico, margen de mejora", "High strategic impact, room for improvement"),
        };
      case "replaceable":
        return {
          status: "replaceable" as const,
          label: tr("Reemplazable", "Replaceable"),
          badgeBg: "bg-amber-100 dark:bg-amber-950/70",
          badgeText: "text-amber-800 dark:text-amber-300",
          badgeBorder: "border-amber-300 dark:border-amber-800",
          cardBg: "bg-amber-50/60 dark:bg-amber-950/25",
          cardBorder: "border-amber-300 dark:border-amber-800/80",
          cardHoverBorder: "hover:border-amber-500 dark:hover:border-amber-400",
          dotColor: "bg-amber-500",
          description: tr("Calidad adecuada pero bajo impacto en metas", "Adequate quality but low impact on goals"),
        };
      case "warning":
      default:
        return {
          status: "warning" as const,
          label: tr("Advertencia", "Warning"),
          badgeBg: "bg-rose-100 dark:bg-rose-950/70",
          badgeText: "text-rose-800 dark:text-rose-300",
          badgeBorder: "border-rose-300 dark:border-rose-800",
          cardBg: "bg-rose-50/60 dark:bg-rose-950/25",
          cardBorder: "border-rose-300 dark:border-rose-800/80",
          cardHoverBorder: "hover:border-rose-500 dark:hover:border-rose-400",
          dotColor: "bg-rose-500",
          description: tr("Baja calidad y bajo impacto (crítico o en riesgo)", "Low quality and low impact (critical or at risk)"),
        };
    }
  };
  
  // State for accordion expanders
  const [expandedArtifact, setExpandedArtifact] = useState<string | null>(null);

  // State for Fullscreen/Maximize Mode
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  // Escape key handler to exit maximize mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMaximized) {
        setIsMaximized(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMaximized]);

  // Auto-detect available methodologies in data
  const availableMethods = useMemo(() => {
    const methods: string[] = [];
    const keys = Object.keys(data || {});
    const cleanType = (processType || "").toLowerCase();

    const isAltus = cleanType.includes("altus") || !!data?.altus || keys.some(k => k.includes("CONF") || k.includes("FORM") || k.includes("OPER") || k.includes("PRO") || k.includes("VAL") || k.includes("SOCI") || k.includes("MEMO"));
    const isSipac = cleanType.includes("sipac") || !!data?.sipac || !!data?.sipac_final_output || !!data?.activos_propuestos || !!data?.activos_ci_artefactos;
    const isAhp = cleanType.includes("ahp") || !!data?.ahp || !!data?.comparaciones_pareadas || !!data?.matriz_comparaciones || !!data?.ahp_prioridades;

    if (isAltus) methods.push("altus");
    if (isSipac) methods.push("sipac");
    if (isAhp) methods.push("ahp");

    if (methods.length === 0) methods.push("custom");
    return methods;
  }, [data, processType]);

  const [activeMethod, setActiveMethod] = useState<string>(() => {
    const cleanType = (processType || "").toLowerCase();
    if (cleanType.includes("altus")) return "altus";
    if (cleanType.includes("sipac")) return "sipac";
    if (cleanType.includes("ahp")) return "ahp";
    return availableMethods[0] || "altus";
  });

  useEffect(() => {
    const cleanType = (processType || "").toLowerCase();
    if (cleanType.includes("altus")) setActiveMethod("altus");
    else if (cleanType.includes("sipac")) setActiveMethod("sipac");
    else if (cleanType.includes("ahp")) setActiveMethod("ahp");
    else if (!availableMethods.includes(activeMethod)) {
      setActiveMethod(availableMethods[0] || "custom");
    }
  }, [processType, availableMethods]);

  // Initialize SIPAC items when data changes
  useEffect(() => {
    if (data && (processType.toLowerCase().includes("sipac") || data.sipac || data.activos_propuestos || data.sipac_final_output)) {
      const items: string[] = [];
      const newBoard: Record<string, string> = { ...sipacBoard };
      const newClassifications: Record<string, { category: string; justification: string }> = { ...sipacClassifications };
      const newHealthMap: Record<string, "stable" | "evolving" | "replaceable" | "warning"> = {};

      // 1. Check if precalculated results exist in data.sipac_processed
      if (Array.isArray(data.sipac_processed)) {
        data.sipac_processed.forEach((p: any) => {
          if (p.quadrant) {
            if (p.activo) newHealthMap[p.activo] = p.quadrant;
            if (p.artefacto) newHealthMap[p.artefacto] = p.quadrant;
          }
        });
      }

      const extractFromProcs = (procsList: any[]) => {
        if (!Array.isArray(procsList)) return;
        procsList.forEach((procObj: any) => {
          const subProcs = procObj.procesos || procObj.Procesos || [procObj];
          subProcs.forEach((proc: any) => {
            const assets = proc.Activos || proc.activos || [];
            assets.forEach((asset: any) => {
              const assetName = asset.activo_especifico || asset.nombre || asset.name;
              if (!assetName) return;

              // Determine health for asset
              let assetHealth: "stable" | "evolving" | "replaceable" | "warning" | null = newHealthMap[assetName] || null;

              if (!assetHealth && (asset.cuadrante || asset.estado_salud || asset.salud || asset.quadrant)) {
                const s = String(asset.cuadrante || asset.estado_salud || asset.salud || asset.quadrant).toLowerCase();
                if (s.includes("stable") || s.includes("estable") || s.includes("saludable")) assetHealth = "stable";
                else if (s.includes("evolving") || s.includes("evolucion") || s.includes("evolución")) assetHealth = "evolving";
                else if (s.includes("replaceable") || s.includes("reemplazable")) assetHealth = "replaceable";
                else if (s.includes("warning") || s.includes("advertencia") || s.includes("nocivo") || s.includes("crítico") || s.includes("critico")) assetHealth = "warning";
              }

              if (!assetHealth && Array.isArray(asset.indicadores)) {
                const validInds = asset.indicadores.filter((i: any) => typeof i.actual === "number" && typeof i.meta === "number" && (i.actual !== 0 || i.meta !== 0));
                if (validInds.length > 0) {
                  const sc = calcSipacScores(validInds);
                  assetHealth = classifySipacQuadrant(sc.V_calidad, sc.W_impacto);
                }
              }

              if (!assetHealth && typeof asset.importancia_activo === "number") {
                if (asset.importancia_activo >= 5) assetHealth = "stable";
                else if (asset.importancia_activo === 4) assetHealth = "evolving";
                else if (asset.importancia_activo === 3) assetHealth = "replaceable";
                else assetHealth = "warning";
              }

              if (assetHealth) {
                newHealthMap[assetName] = assetHealth;
              }

              if (!items.includes(assetName)) {
                items.push(assetName);
                if (asset.bmc_block) {
                  newBoard[assetName] = asset.bmc_block;
                  newClassifications[assetName] = {
                    category: asset.bmc_block,
                    justification: "Clasificación determinada por el motor de inferencia en la fase SIPAC."
                  };
                }
              }

              const artifacts = asset.artefactos || asset.artefactos_propuestos || [];
              artifacts.forEach((art: any) => {
                const artName = typeof art === "string" ? art : art.artefacto || art.artefo || art.name;
                if (!artName) return;

                let artHealth: "stable" | "evolving" | "replaceable" | "warning" | null = newHealthMap[artName] || null;
                if (!artHealth && typeof art === "object" && Array.isArray(art.indicadores)) {
                  const validInds = art.indicadores.filter((i: any) => typeof i.actual === "number" && typeof i.meta === "number" && (i.actual !== 0 || i.meta !== 0));
                  if (validInds.length > 0) {
                    const sc = calcSipacScores(validInds);
                    artHealth = classifySipacQuadrant(sc.V_calidad, sc.W_impacto);
                  }
                }
                if (!artHealth) {
                  artHealth = assetHealth;
                }
                if (artHealth) {
                  newHealthMap[artName] = artHealth;
                }

                if (!items.includes(artName)) {
                  items.push(artName);
                  if (asset.bmc_block) {
                    newBoard[artName] = asset.bmc_block;
                    newClassifications[artName] = {
                      category: asset.bmc_block,
                      justification: "Artefacto derivado del activo y clasificado en el lienzo BMC."
                    };
                  }
                }
              });
            });
          });
        });
      };

      const sources = [
        data.sipac_final_output,
        data.activos_artefactos_final,
        data.activos_confirmados_importancia,
        data.activos_propuestos,
        data.activos_ci_artefactos,
        data.sipac_pre_final_output,
        data.sipac?.procesos,
        data.sipac?.artefactos
      ];

      for (const src of sources) {
        if (src) {
          if (Array.isArray(src)) {
            extractFromProcs(src);
          } else if (src.Procesos || src.procesos) {
            extractFromProcs(src.Procesos || src.procesos);
          }
        }
      }

      // Also check if data.sipac.artefactos has direct names
      if (data.sipac?.artefactos && Array.isArray(data.sipac.artefactos)) {
        data.sipac.artefactos.forEach((a: any) => {
          const name = typeof a === "string" ? a : a.artefactoNombre || a.nombre || a.artefacto;
          if (name && !items.includes(name)) items.push(name);
        });
      }

      // Fallback deterministic distribution based on index if no health was found
      const fallbackCycle: ("stable" | "evolving" | "replaceable" | "warning")[] = [
        "stable",
        "evolving",
        "stable",
        "replaceable",
        "evolving",
        "warning"
      ];
      items.forEach((item, idx) => {
        if (!newHealthMap[item]) {
          newHealthMap[item] = fallbackCycle[idx % fallbackCycle.length];
        }
      });

      const unassigned = items.filter(it => !newBoard[it]);

      setSipacBoard(newBoard);
      setSipacClassifications(newClassifications);
      setSipacUnassigned(unassigned);
      setSipacHealthMap(newHealthMap);
      setAgentFeedback(
        items.length > 0 
          ? `Lienzo de Modelo de Negocio cargado con ${items.length} activos y propuestas organizadas.` 
          : "Lienzo de Modelo de Negocio cargado. Arrastra las propuestas y activos al bloque correspondiente del canvas."
      );
      setAgentFeedbackType("info");
    }
  }, [data, processType]);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <HelpCircle className="w-12 h-12 text-zinc-500 animate-pulse mb-4" />
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">No hay datos de resultados</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xs mt-2">Completa la entrevista o carga una sesión previa para visualizar el panel.</p>
      </div>
    );
  }

  // --- ALTUS VISUALIZATION EXACTA SEGÚN EXCEL ALTUS-ASSESMENT-TEMPLATE.xlsx ---
  const renderAltus = () => {
    // 1. Extraer capacidades desde cualquier formato soportado (array ground-truth, diccionario record:X_DIM:Y, etc.)
    const rawCapsList: AltusCapacidad[] = [];

    if (data.altus?.capacities && Array.isArray(data.altus.capacities)) {
      data.altus.capacities.forEach((cap: any) => {
        const score = cap.expectedScore !== undefined ? Number(cap.expectedScore) : Number(cap.score ?? cap.qualification ?? cap.puntuacion ?? 0);
        const rawId = cap.capacityId || cap.id || "";
        const name = cap.capacityName || cap.name || rawId;
        const justification = cap.fullContext || cap.initialVagueResponse || cap.justification || cap.qualification_reasoning || "";
        const question = cap.question || "";
        
        rawCapsList.push({
          key: rawId,
          score,
          name: name.length > 40 ? name.substring(0, 37) + "..." : name,
          fullName: name,
          justification,
          question
        });
      });
    } else {
      Object.entries(data).forEach(([key, value]: any) => {
        if (value && (value.puntuacion !== undefined || value.score !== undefined || value.qualification !== undefined || value.calificacion !== undefined)) {
          const score = Number(value.puntuacion !== undefined ? value.puntuacion :
                               value.score !== undefined ? value.score :
                               value.qualification !== undefined ? value.qualification :
                               value.calificacion);
          const cleanKey = key.replace(/^record:/, '');
          const name = value.capacidad_evaluada || value.capacidad || value.question || cleanKey;
          const justification = value.justificacion || value.justification || value.qualification_reasoning || value.summary || "";
          const question = value.question || "";

          rawCapsList.push({
            key: cleanKey,
            score,
            name: name.length > 40 ? name.substring(0, 37) + "..." : name,
            fullName: name,
            justification,
            question
          });
        }
      });
    }

    if (rawCapsList.length === 0) {
      return (
        <div className="p-8 text-center border border-dashed border-zinc-400 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Sin datos ALTUS disponibles</h4>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">No se encontraron puntuaciones de madurez tecnológica en el archivo cargado.</p>
        </div>
      );
    }

    // 2. Calcular analítica matemática completa del modelo ALTUS
    const altusAnalysis: AltusAnalysis = calcAltusScores(rawCapsList);
    const { mlSummaries, globalSummary, balancedScoreCard } = altusAnalysis;

    // Colores oficiales según especificación y tokens del TFM
    const STATUS_COLORS = {
      BAD: '#ef4444',   // Rojo / Crimson (Puntuación 0 o 1)
      MID: '#f59e0b',   // Ámbar / Dorado (Puntuación 2 o 3)
      GOOD: '#10b981',  // Verde Esmeralda (Puntuación 4 o 5)
    };

    const ML_COLORS = [
      '#3ba1da', // ML1: Azure Blue
      '#10b981', // ML2: Emerald Green
      '#f59e0b', // ML3: Amber
      '#8b5cf6', // ML4: Purple
    ];

    const ARCH_COLORS = [
      '#3ba1da', // CONF: Azure
      '#06b6d4', // FORM: Cyan
      '#0d9488', // OPER: Teal
      '#f59e0b', // PRO: Amber
      '#ec4899', // VAL: Pink
      '#8b5cf6', // SOCI: Purple
      '#64748b', // MEMO: Slate
    ];

    // Datos para la vista actual seleccionada (Global o ML individual)
    const currentMlData = altusSelectedMl === 0
      ? {
          name: "Global (Todos los Niveles)",
          reachedScore: globalSummary.totalReached,
          maxScore: globalSummary.totalMax,
          achievement: globalSummary.globalAchievement,
          statusCounts: globalSummary.statusCounts,
          archLevels: globalSummary.archLevels,
        }
      : mlSummaries[altusSelectedMl - 1];

    // Dataset para Gráfico 1 (Logro: Puntos Máximos vs Alcanzados - Sheet Analysis)
    const achievementChartData = currentMlData.archLevels.map(arch => ({
      code: arch.code,
      name: arch.name,
      enName: arch.enName,
      max: arch.max,
      alcanzado: arch.reached,
      cobertura: Math.round(arch.coveragePct * 10) / 10,
    })).filter(d => altusSelectedMl === 0 || d.max > 0);

    // Dataset para Gráfico 2 (Radar y Barras de % Cobertura - Sheet Analysis)
    const coverageChartData = currentMlData.archLevels.map(arch => ({
      code: arch.code,
      name: arch.name,
      enName: arch.enName,
      cobertura: Math.round(arch.coveragePct * 10) / 10,
      reached: arch.reached,
      max: arch.max,
    })).filter(d => altusSelectedMl === 0 || d.max > 0);

    // Dataset para Gráfico de Estado General (Donut Chart BAD/MID/GOOD - Sheet Analysis ARCH LEVELS)
    const statusDonutData = [
      { name: "BAD (0 - 1) Sin Evidencia", value: currentMlData.statusCounts.bad, color: STATUS_COLORS.BAD, status: "BAD" },
      { name: "MID (2 - 3) En Desarrollo", value: currentMlData.statusCounts.mid, color: STATUS_COLORS.MID, status: "MID" },
      { name: "GOOD (4 - 5) Optimizado", value: currentMlData.statusCounts.good, color: STATUS_COLORS.GOOD, status: "GOOD" },
    ].filter(d => d.value > 0);

    // Dataset para Gráfico de Puntuación Media Likert 0-5 (Sheet Analysis ARCH LEVELS)
    const avgLikertChartData = currentMlData.archLevels.map(arch => ({
      code: arch.code,
      name: arch.name,
      avg: Math.round(arch.avgLikert * 100) / 100,
      count: arch.count,
    })).filter(d => altusSelectedMl === 0 || d.count > 0);

    // Filtrado de capacidades detalladas
    const filteredCapabilities = rawCapsList.filter(cap => {
      const { dim, ml } = (altusAnalysis as any).parseKey ? (altusAnalysis as any).parseKey(cap.key) : { dim: cap.key.split('_')[1]?.split(':')[0] || 'CONF', ml: 1 };
      
      // Match ML filter
      if (altusSelectedMl !== 0) {
        const mlMatch = cap.key.startsWith(`${altusSelectedMl}_`) || cap.key.includes(`ML${altusSelectedMl}`) || (ml === altusSelectedMl);
        if (!mlMatch) return false;
      }

      // Match Dimension filter
      if (altusDimFilter !== "ALL") {
        if (!cap.key.toUpperCase().includes(altusDimFilter)) return false;
      }

      // Match Status filter
      if (altusStatusFilter !== "ALL") {
        if (altusStatusFilter === "BAD" && cap.score > 1) return false;
        if (altusStatusFilter === "MID" && (cap.score < 2 || cap.score > 3)) return false;
        if (altusStatusFilter === "GOOD" && cap.score < 4) return false;
      }

      // Match Search query
      if (altusSearchQuery.trim()) {
        const q = altusSearchQuery.toLowerCase();
        const matchesKey = cap.key.toLowerCase().includes(q);
        const matchesName = (cap.fullName || cap.name || "").toLowerCase().includes(q);
        const matchesJust = (cap.justification || "").toLowerCase().includes(q);
        const matchesQ = (cap.question || "").toLowerCase().includes(q);
        if (!matchesKey && !matchesName && !matchesJust && !matchesQ) return false;
      }

      return true;
    });

    return (
      <div className="space-y-6">
        
        {/* ========================================================================= */}
        {/* 1. SECCIÓN SUPERIOR: KPIS DE LOGRO DE NIVELES DE MADUREZ (ML1 a ML4)      */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card Global */}
          <div 
            onClick={() => setAltusSelectedMl(0)}
            className={`col-span-2 lg:col-span-1 p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-sm group hover:-translate-y-1 hover:shadow-md ${
              altusSelectedMl === 0
                ? "border-indigo-600 dark:border-sky-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/30"
                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-indigo-400 dark:hover:border-sky-500"
            }`}
            title="Haz clic para ver el resumen consolidado global"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-black tracking-wider text-zinc-500 dark:text-zinc-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                Total Modelo ALTUS
              </span>
              <Award className="w-4 h-4 text-sky-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="my-2.5">
              <div className="text-3xl font-black text-zinc-950 dark:text-white tracking-tight group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                {globalSummary.globalAchievement.toFixed(1)}%
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono font-medium mt-0.5">
                {globalSummary.totalReached} / {globalSummary.totalMax} pts totales
              </div>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-600 to-sky-500 h-full rounded-full transition-all duration-500 group-hover:brightness-110" 
                style={{ width: `${Math.min(100, Math.max(0, globalSummary.globalAchievement))}%` }}
              />
            </div>
          </div>

          {/* 4 Cards para ML1, ML2, ML3, ML4 */}
          {mlSummaries.map((ml) => (
            <div 
              key={ml.ml}
              onClick={() => setAltusSelectedMl(ml.ml === altusSelectedMl ? 0 : ml.ml)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between shadow-sm group hover:-translate-y-1 hover:shadow-md ${
                altusSelectedMl === ml.ml
                  ? 'border-indigo-600 dark:border-sky-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/30'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-indigo-400 dark:hover:border-sky-500'
              }`}
              title={`Haz clic para enfocar los gráficos en el Nivel de Madurez ${ml.ml}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-black tracking-wider text-zinc-600 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-sky-400 transition-colors">
                  ML{ml.ml} ({ml.name.split(' ')[1].replace(/[()]/g, '')})
                </span>
                <span className={`w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125 ${
                  ml.achievement >= 50 ? 'bg-emerald-500' : ml.achievement >= 20 ? 'bg-amber-500' : 'bg-rose-500'
                }`} />
              </div>
              <div className="my-2.5">
                <div className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  {ml.achievement.toFixed(1)}%
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono font-medium mt-0.5">
                  {ml.reachedScore} / {ml.maxScore} pts ({ml.statusCounts.total} caps)
                </div>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500 group-hover:brightness-110" 
                  style={{ 
                    width: `${Math.min(100, Math.max(0, ml.achievement))}%`,
                    backgroundColor: ML_COLORS[ml.ml - 1]
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Resumen de Estados Likert Globales con Hover Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-400/10 dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-zinc-900 dark:text-white">{tr("Estado del Diagnóstico Likert:", "Likert Diagnosis Status:")}</span>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">{tr("Media General:", "Overall Average:")} <strong>{globalSummary.globalAvgLikert.toFixed(2)} / 5.0</strong></span>
          </div>
          <div className="flex items-center gap-2.5 text-xs">
            <span 
              onClick={() => { setAltusTab("details"); setAltusStatusFilter("BAD"); }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-900 font-medium hover:scale-105 hover:shadow-xs transition-all cursor-pointer"
              title={tr("Filtrar capacidades críticas", "Filter critical capabilities")}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              {tr("Críticas (BAD 0-1):", "Critical (BAD 0-1):")} <strong>{globalSummary.statusCounts.bad}</strong>
            </span>
            <span 
              onClick={() => { setAltusTab("details"); setAltusStatusFilter("MID"); }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-900 font-medium hover:scale-105 hover:shadow-xs transition-all cursor-pointer"
              title={tr("Filtrar capacidades en desarrollo", "Filter capabilities in development")}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {tr("En Desarrollo (MID 2-3):", "In Development (MID 2-3):")} <strong>{globalSummary.statusCounts.mid}</strong>
            </span>
            <span 
              onClick={() => { setAltusTab("details"); setAltusStatusFilter("GOOD"); }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-900 font-medium hover:scale-105 hover:shadow-xs transition-all cursor-pointer"
              title={tr("Filtrar capacidades consolidadas", "Filter consolidated capabilities")}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {tr("Consolidadas (GOOD 4-5):", "Consolidated (GOOD 4-5):")} <strong>{globalSummary.statusCounts.good}</strong>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. PESTAÑAS METODOLÓGICAS DE ALTUS (Excel Sheets: Analysis, Arch, BSC)    */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between border-b border-zinc-400 dark:border-zinc-800 pb-3 gap-2">
          <div className="flex items-center gap-1.5 bg-zinc-400/15 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-400 dark:border-zinc-800">
            <button
              onClick={() => setAltusTab("analysis")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                altusTab === "analysis"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs border border-zinc-400 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-400/20 dark:hover:bg-zinc-800/60"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
              {tr("1. Logro y Cobertura (Analysis)", "1. Achievement & Coverage (Analysis)")}
            </button>
            <button
              onClick={() => setAltusTab("health")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                altusTab === "health"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs border border-zinc-400 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-400/20 dark:hover:bg-zinc-800/60"
              }`}
            >
              <PieIcon className="w-3.5 h-3.5 text-emerald-500" />
              {tr("2. Salud y Medias (Arch Levels)", "2. Health & Means (Arch Levels)")}
            </button>
            <button
              onClick={() => setAltusTab("scorecard")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                altusTab === "scorecard"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs border border-zinc-400 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-400/20 dark:hover:bg-zinc-800/60"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
              {tr("3. Balanced ScoreCard & Evolución", "3. Balanced ScoreCard & Evolution")}
            </button>
            <button
              onClick={() => setAltusTab("details")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                altusTab === "details"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs border border-zinc-400 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-400/20 dark:hover:bg-zinc-800/60"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-sky-500" />
              {tr("4. Detalle 51 Capacidades", "4. Detailed 51 Capabilities")}
            </button>
          </div>

          {/* Selector de Nivel de Madurez para filtrado */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-400 mr-1">{tr("Filtro ML:", "ML Filter:")}</span>
            {[
              { id: 0, label: tr("Global", "Global") },
              { id: 1, label: "ML1" },
              { id: 2, label: "ML2" },
              { id: 3, label: "ML3" },
              { id: 4, label: "ML4" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setAltusSelectedMl(btn.id)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  altusSelectedMl === btn.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-zinc-400/15 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-400/30 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-TAB 1: ANÁLISIS DE LOGRO Y COBERTURA (Excel Sheet 'Analysis')          */}
        {/* ========================================================================= */}
        {altusTab === "analysis" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Gráfico 1: Logro de Niveles Arquitectónicos (Max vs Reached) - Excel Analysis Charts 9-12 */}
              <div className="p-4 rounded-xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs hover:shadow-md transition-shadow flex flex-col group">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Logro de Niveles Arquitectónicos · {currentMlData.name}
                    </h4>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                      Comparativa de Puntos Máximos Teóricos vs Puntos Alcanzados (Escala en Puntos)
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-400/20 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400">
                    Max: {currentMlData.maxScore} pts
                  </span>
                </div>
                <div className="h-64 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={achievementChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_PALETTE.grid} className="dark:stroke-zinc-800/60" />
                      <XAxis dataKey="code" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" />
                      <YAxis domain={[0, 'auto']} tick={{ fontSize: 9 }} />
                      <Tooltip content={<CustomAltusTooltip />} cursor={{ fill: 'rgba(59, 161, 218, 0.08)' }} />
                      <Legend 
                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                        formatter={(val) => val === 'max' ? 'Techo Máximo Teórico' : 'Puntos Alcanzados'}
                      />
                      <Bar dataKey="max" name="Techo Máximo Posible" fill="#94a3b8" radius={[3, 3, 0, 0]} maxBarSize={28} className="transition-opacity hover:opacity-85" />
                      <Bar dataKey="alcanzado" name="Puntos Alcanzados" fill={COLOR_TOKENS.altus[500]} radius={[3, 3, 0, 0]} maxBarSize={28} className="transition-opacity hover:opacity-85" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 2: Porcentaje de Cobertura Alcanzada (%) - Excel Analysis Charts 1,4,6,8 */}
              <div className="p-4 rounded-xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs hover:shadow-md transition-shadow flex flex-col group">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Cobertura Alcanzada (%) por Nivel Arquitectónico
                    </h4>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                      Porcentaje de cumplimiento respecto al techo máximo (% Coverage)
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                    Logro: {currentMlData.achievement.toFixed(1)}%
                  </span>
                </div>
                <div className="h-64 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={coverageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_PALETTE.grid} className="dark:stroke-zinc-800/60" />
                      <XAxis dataKey="code" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 9 }} />
                      <Tooltip content={<CustomAltusTooltip />} cursor={{ fill: 'rgba(59, 161, 218, 0.08)' }} />
                      <Bar dataKey="cobertura" name="Cobertura Alcanzada" fill={COLOR_TOKENS.altus[500]} radius={[3, 3, 0, 0]} maxBarSize={35} className="transition-opacity hover:opacity-85">
                        {coverageChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={ARCH_COLORS[index % ARCH_COLORS.length]} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Gráfico 3: Radar Chart de Cobertura Multidimensional (Excel Analysis Charts 2,3,5,7) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <div className="lg:col-span-1 p-4 rounded-xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs hover:shadow-md transition-shadow flex flex-col group">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Huella Radar de Cobertura
                </h4>
                <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mb-4">
                  Visualización poligonal de los 7 niveles arquitectónicos
                </p>
                <div className="h-64 flex-1 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="65%" data={coverageChartData}>
                      <PolarGrid stroke={RECHARTS_THEME.altus.gridColor} className="dark:stroke-zinc-800" />
                      <PolarAngleAxis dataKey="code" tick={{ fontSize: 9 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 8 }} />
                      <Radar 
                        name="Cobertura" 
                        dataKey="cobertura" 
                        stroke={RECHARTS_THEME.altus.radarStroke} 
                        fill={RECHARTS_THEME.altus.radarFill} 
                        fillOpacity={0.4} 
                      />
                      <Tooltip content={<CustomAltusTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tabla de Análisis Numérico Exacto conforme a Excel Analysis U9:Y37 */}
              <div className="lg:col-span-2 p-4 rounded-xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                      Matriz de Análisis Numérico ALTUS ({currentMlData.name})
                    </h4>
                    <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400">Sheet: Analysis</span>
                  </div>
                  <div className="border border-zinc-400 dark:border-zinc-800 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-zinc-400/15 dark:bg-zinc-900 border-b border-zinc-400 dark:border-zinc-800 font-bold text-zinc-800 dark:text-white">
                          <th className="p-2.5">Nivel Arquitectónico</th>
                          <th className="p-2.5 text-center">Código</th>
                          <th className="p-2.5 text-right">Techo Máximo</th>
                          <th className="p-2.5 text-right">Puntos Alcanzados</th>
                          <th className="p-2.5 text-right">% Cobertura Dimensión</th>
                          <th className="p-2.5 text-right">% Aportación al Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-400 dark:divide-zinc-900 font-mono">
                        {currentMlData.archLevels.map((arch) => {
                          const mlTotalMax = currentMlData.maxScore || 1;
                          const mlContribPct = (arch.reached / mlTotalMax) * 100;
                          return (
                            <tr key={arch.code} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-950/25 transition-colors group cursor-default">
                              <td className="p-2.5 font-sans font-medium text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {arch.name}
                              </td>
                              <td className="p-2.5 text-center font-bold text-indigo-600 dark:text-indigo-400">
                                <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 group-hover:scale-110 transition-transform">
                                  {arch.code}
                                </span>
                              </td>
                              <td className="p-2.5 text-right text-zinc-600 dark:text-zinc-400">{arch.max} pts</td>
                              <td className="p-2.5 text-right font-bold text-zinc-900 dark:text-white">{arch.reached} pts</td>
                              <td className="p-2.5 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                {arch.coveragePct.toFixed(1)}%
                              </td>
                              <td className="p-2.5 text-right text-zinc-600 dark:text-zinc-400">
                                {mlContribPct.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-zinc-400/10 dark:bg-zinc-900/50 font-bold border-t border-zinc-400 dark:border-zinc-800">
                          <td className="p-2.5 font-sans text-zinc-900 dark:text-white">TOTAL {currentMlData.name}</td>
                          <td className="p-2.5 text-center text-zinc-600">-</td>
                          <td className="p-2.5 text-right text-zinc-900 dark:text-white font-mono">{currentMlData.maxScore} pts</td>
                          <td className="p-2.5 text-right text-indigo-600 dark:text-indigo-400 font-mono">{currentMlData.reachedScore} pts</td>
                          <td className="p-2.5 text-right text-indigo-600 dark:text-indigo-400 font-mono">{currentMlData.achievement.toFixed(1)}%</td>
                          <td className="p-2.5 text-right font-mono">100.0%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-TAB 2: SALUD Y MEDIAS LIKERT 0-5 (Excel Sheet 'Analysis ARCH LEVELS') */}
        {/* ========================================================================= */}
        {altusTab === "health" && (() => {
          // Calcular desglose exacto de BAD/MID/GOOD y promedios por nivel arquitectónico
          const archHealthBreakdown = currentMlData.archLevels.map((arch) => {
            const capsForDim = rawCapsList.filter(cap => {
              const isDim = cap.key.toUpperCase().includes(arch.code);
              if (altusSelectedMl !== 0) {
                const mlMatch = cap.key.startsWith(`${altusSelectedMl}_`) || cap.key.includes(`ML${altusSelectedMl}`);
                return isDim && mlMatch;
              }
              return isDim;
            });

            const bad = capsForDim.filter(c => c.score <= 1).length;
            const mid = capsForDim.filter(c => c.score >= 2 && c.score <= 3).length;
            const good = capsForDim.filter(c => c.score >= 4).length;
            const total = capsForDim.length || arch.count || 1;
            const avg = arch.avgLikert;

            return {
              ...arch,
              bad,
              mid,
              good,
              total,
              avg: Math.round(avg * 100) / 100,
              status: avg >= 4.0 ? "Consolidado" : avg >= 2.0 ? "En Desarrollo" : "Crítico"
            };
          });

          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                
                {/* Gráfico 1: Estado General de Madurez (Donut BAD/MID/GOOD - Charts 1,3,5,7) */}
                <div className="p-5 rounded-xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          Estado General de Madurez · {currentMlData.name}
                        </h4>
                        <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                          Proporción global de capacidades según su calificación Likert
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-400/20 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400">
                        {currentMlData.statusCounts.total} Capacidades
                      </span>
                    </div>

                    <div className="h-56 w-full flex items-center justify-center my-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <Pie
                            data={statusDonutData}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {statusDonutData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color} 
                                className="cursor-pointer transition-transform hover:scale-105"
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val, name) => [`${val} capacidades (${((Number(val) / (currentMlData.statusCounts.total || 1)) * 100).toFixed(1)}%)`, name]} />
                          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-zinc-400/60 dark:border-zinc-800 text-center">
                    <div 
                      onClick={() => { setAltusTab("details"); setAltusStatusFilter("BAD"); }}
                      className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-900 hover:scale-105 hover:shadow-xs transition-all cursor-pointer"
                      title="Haz clic para ver las capacidades críticas en detalle"
                    >
                      <div className="text-sm font-black text-rose-600 dark:text-rose-400">{currentMlData.statusCounts.bad}</div>
                      <div className="text-[9px] text-rose-700 dark:text-rose-400 font-bold uppercase mt-0.5">BAD (0-1)</div>
                      <div className="text-[8px] text-rose-600/80 font-mono mt-0.5">
                        {((currentMlData.statusCounts.bad / (currentMlData.statusCounts.total || 1)) * 100).toFixed(0)}% del total
                      </div>
                    </div>
                    <div 
                      onClick={() => { setAltusTab("details"); setAltusStatusFilter("MID"); }}
                      className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-900 hover:scale-105 hover:shadow-xs transition-all cursor-pointer"
                      title="Haz clic para ver las capacidades en desarrollo"
                    >
                      <div className="text-sm font-black text-amber-600 dark:text-amber-400">{currentMlData.statusCounts.mid}</div>
                      <div className="text-[9px] text-amber-700 dark:text-amber-400 font-bold uppercase mt-0.5">MID (2-3)</div>
                      <div className="text-[8px] text-amber-600/80 font-mono mt-0.5">
                        {((currentMlData.statusCounts.mid / (currentMlData.statusCounts.total || 1)) * 100).toFixed(0)}% del total
                      </div>
                    </div>
                    <div 
                      onClick={() => { setAltusTab("details"); setAltusStatusFilter("GOOD"); }}
                      className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-900 hover:scale-105 hover:shadow-xs transition-all cursor-pointer"
                      title="Haz clic para ver las capacidades consolidadas"
                    >
                      <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{currentMlData.statusCounts.good}</div>
                      <div className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold uppercase mt-0.5">GOOD (4-5)</div>
                      <div className="text-[8px] text-emerald-600/80 font-mono mt-0.5">
                        {((currentMlData.statusCounts.good / (currentMlData.statusCounts.total || 1)) * 100).toFixed(0)}% del total
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gráfico 2: Puntuación Media por Nivel Arquitectónico (Charts 2,4,6,8) */}
                <div className="p-5 rounded-xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          Puntuación Media por Nivel Arquitectónico (0 a 5)
                        </h4>
                        <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                          Media Likert de las capacidades de cada dimensión en {currentMlData.name}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-400/20 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400">
                        Escala 0.0 - 5.0
                      </span>
                    </div>

                    <div className="h-56 w-full my-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={avgLikertChartData} margin={{ top: 10, right: 15, left: 0, bottom: 25 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_PALETTE.grid} className="dark:stroke-zinc-800/60" />
                          <XAxis dataKey="code" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" />
                          <YAxis domain={[0, 5]} tickCount={6} width={28} tick={{ fontSize: 9 }} />
                          <Tooltip content={<CustomAltusTooltip />} cursor={{ fill: 'rgba(59, 161, 218, 0.08)' }} />
                          <ReferenceLine y={2.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Crítico (2.0)', position: 'top', fontSize: 8, fill: '#ef4444' }} />
                          <ReferenceLine y={4.0} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Consolidado (4.0)', position: 'top', fontSize: 8, fill: '#10b981' }} />
                          <Bar dataKey="avg" name="Puntuación Media" radius={[4, 4, 0, 0]} maxBarSize={32} className="transition-opacity hover:opacity-85">
                            {avgLikertChartData.map((entry, index) => {
                              const c = entry.avg >= 4 ? STATUS_COLORS.GOOD : entry.avg >= 2 ? STATUS_COLORS.MID : STATUS_COLORS.BAD;
                              return <Cell key={`cell-${index}`} fill={c} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-400/10 dark:bg-zinc-900 border border-zinc-400/60 dark:border-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>
                      Dimensiones en <strong>rojo (&lt; 2.0)</strong> requieren plan de mitigación inmediato; en <strong>ámbar (2.0 - 3.9)</strong> denotan procesos en maduración; y en <strong>verde (≥ 4.0)</strong> fortalezas optimizadas.
                    </span>
                  </div>
                </div>

              </div>

              {/* Tabla de Desglose de Salud y Medias por Dimensión (Sheet 'Analysis ARCH LEVELS') */}
              <div className="p-5 rounded-xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                      Matriz de Salud y Desglose Likert por Dimensión Arquitectónica ({currentMlData.name})
                    </h4>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                      Promedios y recuentos de estado según la hoja oficial de cálculo de niveles arquitectónicos
                    </p>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400">Sheet: Analysis ARCH LEVELS</span>
                </div>

                <div className="border border-zinc-400 dark:border-zinc-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-zinc-400/15 dark:bg-zinc-900 border-b border-zinc-400 dark:border-zinc-800 font-bold text-zinc-800 dark:text-white">
                        <th className="p-3">Dimensión Arquitectónica</th>
                        <th className="p-3 text-center">Código</th>
                        <th className="p-3 text-center">Capacidades</th>
                        <th className="p-3 text-center">Media Likert</th>
                        <th className="p-3 text-center">BAD (0-1)</th>
                        <th className="p-3 text-center">MID (2-3)</th>
                        <th className="p-3 text-center">GOOD (4-5)</th>
                        <th className="p-3 text-right">Diagnóstico</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-400 dark:divide-zinc-900">
                      {archHealthBreakdown.map((arch) => (
                        <tr key={arch.code} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-950/25 transition-colors group cursor-default">
                          <td className="p-3 font-medium text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {arch.name}
                          </td>
                          <td className="p-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 group-hover:scale-110 transition-transform font-mono">
                              {arch.code}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-zinc-700 dark:text-zinc-400">
                            {arch.total}
                          </td>
                          <td className="p-3 text-center font-mono font-bold">
                            <div className="inline-flex items-center gap-2">
                              <span className={arch.avg >= 4 ? 'text-emerald-600 dark:text-emerald-400' : arch.avg >= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}>
                                {arch.avg.toFixed(2)} / 5.0
                              </span>
                              <div className="w-12 bg-zinc-400/20 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden inline-block">
                                <div 
                                  className="h-full rounded-full" 
                                  style={{ 
                                    width: `${Math.min(100, Math.max(0, (arch.avg / 5) * 100))}%`,
                                    backgroundColor: arch.avg >= 4 ? '#10b981' : arch.avg >= 2 ? '#f59e0b' : '#ef4444'
                                  }} 
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center font-mono text-rose-600 dark:text-rose-400 font-bold">
                            {arch.bad}
                          </td>
                          <td className="p-3 text-center font-mono text-amber-600 dark:text-amber-400 font-bold">
                            {arch.mid}
                          </td>
                          <td className="p-3 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {arch.good}
                          </td>
                          <td className="p-3 text-right">
                            <span className={`inline-block px-2 py-0.5 rounded text-2xs font-bold uppercase ${
                              arch.avg >= 4.0 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                                : arch.avg >= 2.0
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-300 dark:border-rose-900'
                            }`}>
                              {arch.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-zinc-400/10 dark:bg-zinc-900/50 font-bold border-t border-zinc-400 dark:border-zinc-800 text-[11px]">
                        <td className="p-3 text-zinc-900 dark:text-white">TOTAL MODELO ({currentMlData.name})</td>
                        <td className="p-3 text-center text-zinc-600">-</td>
                        <td className="p-3 text-center font-mono text-zinc-900 dark:text-white">{currentMlData.statusCounts.total}</td>
                        <td className="p-3 text-center font-mono text-indigo-600 dark:text-indigo-400">
                          {(currentMlData.archLevels.reduce((s, a) => s + (a.avgLikert || 0), 0) / (currentMlData.archLevels.filter(a => a.count > 0).length || 1)).toFixed(2)} / 5.0
                        </td>
                        <td className="p-3 text-center font-mono text-rose-600 dark:text-rose-400">{currentMlData.statusCounts.bad}</td>
                        <td className="p-3 text-center font-mono text-amber-600 dark:text-amber-400">{currentMlData.statusCounts.mid}</td>
                        <td className="p-3 text-center font-mono text-emerald-600 dark:text-emerald-400">{currentMlData.statusCounts.good}</td>
                        <td className="p-3 text-right font-mono text-zinc-600 dark:text-zinc-400">100% Evaluado</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* SUB-TAB 3: BALANCED SCORECARD Y EVOLUCIÓN (Sheet 'BalanceScoreCArdConf')   */}
        {/* ========================================================================= */}
        {altusTab === "scorecard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Gráfico 1: Evolución de Madurez y Capacidades del Modelo ALTUS (Chart 1 BSC) */}
              <div className="p-4 rounded-xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs hover:shadow-md transition-shadow flex flex-col group">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      Evolución de Madurez y Capacidades del Modelo ALTUS
                    </h4>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                      Distribución porcentual de capacidades de cada dimensión a través de ML1, ML2, ML3 y ML4 (100% Apilado)
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">100% Stacked</span>
                </div>

                <div className="h-72 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={balancedScoreCard.evolution} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_PALETTE.grid} className="dark:stroke-zinc-800/60" />
                      <XAxis dataKey="code" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 9 }} />
                      <Tooltip content={<CustomBscTooltip />} cursor={{ fill: 'rgba(59, 161, 218, 0.08)' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="ML1" name="ML1 (Inicial)" stackId="a" fill={ML_COLORS[0]} className="transition-opacity hover:opacity-85" />
                      <Bar dataKey="ML2" name="ML2 (En Desarrollo)" stackId="a" fill={ML_COLORS[1]} className="transition-opacity hover:opacity-85" />
                      <Bar dataKey="ML3" name="ML3 (Definido)" stackId="a" fill={ML_COLORS[2]} className="transition-opacity hover:opacity-85" />
                      <Bar dataKey="ML4" name="ML4 (Optimizado)" stackId="a" fill={ML_COLORS[3]} className="transition-opacity hover:opacity-85" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 2: Cobertura de Niveles Arquitectónicos por Nivel de Madurez (Chart 2 BSC) */}
              <div className="p-4 rounded-xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs hover:shadow-md transition-shadow flex flex-col group">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      Distribución de Niveles Arquitectónicos por Nivel de Madurez
                    </h4>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                      Composición y peso de cada dimensión arquitectónica dentro de cada Nivel de Madurez (100% Apilado)
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">100% Stacked</span>
                </div>

                <div className="h-72 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={balancedScoreCard.distributionByMl} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_PALETTE.grid} className="dark:stroke-zinc-800/60" />
                      <XAxis dataKey="ml" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 9 }} />
                      <Tooltip content={<CustomBscTooltip />} cursor={{ fill: 'rgba(59, 161, 218, 0.08)' }} />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                      {ALTUS_ARCHITECTURAL_LEVELS.map((arch, idx) => (
                        <Bar 
                          key={arch.code} 
                          dataKey={arch.name} 
                          name={arch.name}
                          stackId="arch" 
                          fill={ARCH_COLORS[idx % ARCH_COLORS.length]} 
                          className="transition-opacity hover:opacity-85"
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* 4 Donut Charts de composición por ML (Charts 3,4,5,6 en BSC) */}
            <div className="p-4 rounded-xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs hover:shadow-md transition-shadow">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white mb-3">
                Composición Arquitectónica por Nivel de Madurez (Donuts ML1 a ML4)
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {(['ML1', 'ML2', 'ML3', 'ML4'] as const).map((mlKey, idx) => {
                  const item = balancedScoreCard.distributionByMl.find(d => d.ml === mlKey);
                  const donutData = ALTUS_ARCHITECTURAL_LEVELS.map((arch, archIdx) => ({
                    name: arch.name,
                    code: arch.code,
                    value: item ? Number(item[arch.name] || 0) : 0,
                    color: ARCH_COLORS[archIdx % ARCH_COLORS.length]
                  })).filter(d => d.value > 0);

                  return (
                    <div key={mlKey} className="p-3 rounded-xl bg-zinc-400/10 dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 flex flex-col items-center hover:-translate-y-0.5 hover:shadow-sm hover:border-indigo-400 transition-all">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white mb-2">{mlKey} ({item?.total} caps)</span>
                      <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={donutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={55}
                              dataKey="value"
                            >
                              {donutData.map((entry, eIdx) => (
                                <Cell key={`c-${eIdx}`} fill={entry.color} className="cursor-pointer hover:scale-105 transition-transform" />
                              ))}
                            </Pie>
                            <Tooltip formatter={(val, name) => [`${val}%`, name]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-center mt-1 text-[9px] font-mono">
                        {donutData.map(d => (
                          <span key={d.code} className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-950 border border-zinc-400 dark:border-zinc-800 hover:border-indigo-500 transition-colors">
                            {d.code}: {d.value}%
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Matriz Oficial de Recomendaciones de Mejora (Tabla BalanceScoreCArdConf Rows 37-49) */}
            <div className="p-4 rounded-xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <Compass className="w-4 h-4 text-indigo-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                  Guía de Acciones Sugeridas ALTUS (Matriz de Intervención según Calificación / Moda)
                </h4>
              </div>
              <div className="border border-zinc-400 dark:border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-400/15 dark:bg-zinc-900 border-b border-zinc-400 dark:border-zinc-800 font-bold text-zinc-800 dark:text-white">
                      <th className="p-3 w-28">Calificación</th>
                      <th className="p-3">Acción sobre Mecanismos y Creación de Evidencias</th>
                      <th className="p-3">Acción sobre Herramientas Tecnológicas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-400 dark:divide-zinc-900">
                    {ALTUS_ACTION_RECOMMENDATIONS.map((rec) => (
                      <tr key={rec.range} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/25 transition-colors group cursor-default">
                        <td className="p-3 font-mono font-bold text-zinc-900 dark:text-white">
                          <span className={`inline-block px-2 py-1 rounded text-2xs transition-transform group-hover:scale-105 ${
                            rec.color === 'rose' ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-900' :
                            rec.color === 'amber' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-900' :
                            rec.color === 'sky' ? 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-300 dark:border-sky-900' :
                            'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-900'
                          }`}>
                            {rec.label}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-700 dark:text-zinc-400 leading-relaxed">
                          {rec.evidenceAction}
                        </td>
                        <td className="p-3 text-zinc-700 dark:text-zinc-400 leading-relaxed">
                          {rec.toolAction}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-TAB 4: DETALLE DE 51 CAPACIDADES EVALUADAS                            */}
        {/* ========================================================================= */}
        {altusTab === "details" && (
          <div className="space-y-4">
            {/* Barra de Filtros */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-zinc-400/10 dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800">
              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar capacidad, pregunta o justificación..."
                  value={altusSearchQuery}
                  onChange={(e) => setAltusSearchQuery(e.target.value)}
                  className="w-full text-xs p-1.5 bg-transparent border-none focus:outline-none text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Dimensión Filter */}
                <select
                  value={altusDimFilter}
                  onChange={(e) => setAltusDimFilter(e.target.value)}
                  className="text-xs p-1.5 rounded-lg border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white hover:border-indigo-400 transition-colors"
                >
                  <option value="ALL">Todas las Dimensiones</option>
                  {ALTUS_ARCHITECTURAL_LEVELS.map(a => (
                    <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={altusStatusFilter}
                  onChange={(e) => setAltusStatusFilter(e.target.value)}
                  className="text-xs p-1.5 rounded-lg border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white hover:border-indigo-400 transition-colors"
                >
                  <option value="ALL">Todos los Estados</option>
                  <option value="BAD">BAD (0 - 1)</option>
                  <option value="MID">MID (2 - 3)</option>
                  <option value="GOOD">GOOD (4 - 5)</option>
                </select>
              </div>
            </div>

            {/* Contador de resultados */}
            <div className="text-[10px] text-zinc-600 dark:text-zinc-400 px-1 font-mono">
              Mostrando {filteredCapabilities.length} de {rawCapsList.length} capacidades evaluadas
            </div>

            {/* Lista interactiva de capacidades */}
            <div className="divide-y divide-zinc-400 dark:divide-zinc-800 border border-zinc-400 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950 shadow-2xs">
              {filteredCapabilities.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 italic">
                  No se encontraron capacidades que coincidan con los filtros seleccionados.
                </div>
              ) : (
                filteredCapabilities.map((cap) => {
                  const isExpanded = altusExpandedCapId === cap.key;
                  const isGood = cap.score >= 4;
                  const isBad = cap.score <= 1;

                  return (
                    <div 
                      key={cap.key}
                      className="p-4 hover:bg-zinc-400/15 dark:hover:bg-zinc-900/40 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-150 group cursor-pointer"
                      onClick={() => setAltusExpandedCapId(isExpanded ? null : cap.key)}
                    >
                      <div className="flex items-start justify-between gap-3 select-none">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-mono font-bold text-xs shrink-0 transition-transform group-hover:scale-110 ${
                            isGood ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800' :
                            isBad ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-300 dark:border-rose-800' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                          }`}>
                            {cap.score}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">{cap.key}</span>
                              <span className="text-xs font-bold text-zinc-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{cap.fullName || cap.name}</span>
                            </div>
                            {cap.question && (
                              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 italic truncate mt-0.5 max-w-xl">
                                "{cap.question}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono uppercase transition-all group-hover:shadow-2xs ${
                            isGood ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900' :
                            isBad ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900' :
                            'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                          }`}>
                            {isGood ? 'GOOD' : isBad ? 'BAD' : 'MID'}
                          </span>
                          <div className="p-1 rounded-md text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Contenido expandido con justificación y detalles */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-zinc-400 dark:border-zinc-800 space-y-2 text-xs">
                          {cap.question && (
                            <div>
                              <span className="font-bold text-zinc-900 dark:text-white">Pregunta Auditoría:</span>
                              <p className="text-zinc-700 dark:text-zinc-400 italic mt-0.5 bg-zinc-400/10 dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-400/40 dark:border-zinc-800">
                                {cap.question}
                              </p>
                            </div>
                          )}
                          {cap.justification && (
                            <div>
                              <span className="font-bold text-zinc-900 dark:text-white">Justificación / Evidencia Extraída:</span>
                              <p className="text-zinc-700 dark:text-zinc-400 mt-0.5 bg-zinc-400/10 dark:bg-zinc-900 p-2.5 rounded-lg leading-relaxed border border-zinc-400/40 dark:border-zinc-800">
                                {cap.justification}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>
    );
  };

  // --- SIPAC INTERACTIVE BUSINESS MODEL CANVAS & INTANGIBLES MATRIX ---
  const handleDragStart = (e: React.DragEvent, item: string) => {
    e.dataTransfer.setData("text/plain", item);
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, block: string) => {
    e.preventDefault();
    const item = e.dataTransfer.getData("text/plain");
    if (!item) return;

    // Place item on board
    placeItem(item, block);
    setDraggedItem(null);
  };

  const placeItem = async (item: string, block: string) => {
    const updatedBoard = { ...sipacBoard, [item]: block };
    setSipacBoard(updatedBoard);
    setSipacUnassigned(prev => prev.filter(i => i !== item));

    // Validate with agent classifications
    if (sipacClassifications[item]) {
      const correctBlock = sipacClassifications[item].category;
      const justification = sipacClassifications[item].justification;
      
      if (correctBlock.toLowerCase().replace(/\s/g, "") === block.toLowerCase().replace(/\s/g, "")) {
        setAgentFeedback(`¡Excelente! El consultor coincide en colocar "${item}" en "${block}": ${justification}`);
        setAgentFeedbackType("success");
      } else {
        setAgentFeedback(`Nota del consultor: Has colocado "${item}" en "${block}". El modelo matemático sugiere que encaja mejor en "${correctBlock}" porque: ${justification}`);
        setAgentFeedbackType("warning");
      }
    } else {
      // Fetch classification on the fly for single item validation
      setAgentFeedback(`Consultando al consultor sobre la ubicación de "${item}"...`);
      setAgentFeedbackType("info");
      try {
        const response = await fetch("/api/classify-bmc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [item],
            companyDescription: data.datos_empresa,
            objectives: data.objetivos_negocio
          })
        });
        if (response.ok) {
          const resData = await response.json();
          const classification = resData.classifications?.[0];
          if (classification) {
            const correctBlock = classification.category;
            const justification = classification.justification;

            // Store classification
            setSipacClassifications(prev => ({
              ...prev,
              [item]: { category: correctBlock, justification }
            }));

            if (correctBlock.toLowerCase().replace(/\s/g, "") === block.toLowerCase().replace(/\s/g, "")) {
              setAgentFeedback(`¡Ubicación validada por el consultor! "${item}" pertenece a "${block}": ${justification}`);
              setAgentFeedbackType("success");
            } else {
              setAgentFeedback(`El consultor sugiere cambiar la ubicación: Has colocado "${item}" en "${block}". Estaría mejor en "${correctBlock}" porque: ${justification}`);
              setAgentFeedbackType("warning");
            }
          }
        }
      } catch (err) {
        console.error("Error classifying single item:", err);
      }
    }
  };

  const askAgentToDistribute = async () => {
    setIsClassifying(true);
    setAgentFeedback("El consultor está analizando las propuestas y ordenando el Business Model Canvas...");
    setAgentFeedbackType("info");

    const allItems = [...sipacUnassigned, ...Object.keys(sipacBoard)];

    try {
      const response = await fetch("/api/classify-bmc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: allItems,
          companyDescription: data.datos_empresa,
          objectives: data.objetivos_negocio
        })
      });

      if (!response.ok) throw new Error("Failed to classify");

      const resData = await response.json();
      const classifications = resData.classifications || [];

      const newBoard: Record<string, string> = {};
      const newClassifs: Record<string, { category: string; justification: string }> = {};

      classifications.forEach((c: any) => {
        newBoard[c.item] = c.category;
        newClassifs[c.item] = { category: c.category, justification: c.justification };
      });

      setSipacBoard(newBoard);
      setSipacUnassigned([]);
      setSipacClassifications(newClassifs);
      setAgentFeedback("¡Completado! El consultor ha ordenado de forma óptima todos los activos y artefactos del preproyecto en las 9 casillas del Business Model Canvas basándose en el impacto estratégico.");
      setAgentFeedbackType("success");
    } catch (error) {
      console.error("Error auto-classifying:", error);
      setAgentFeedback("Error al conectar con el consultor. Por favor, realiza el arrastre manual.");
      setAgentFeedbackType("warning");
    } finally {
      setIsClassifying(false);
    }
  };

  const resetCanvas = () => {
    const allItems = [...sipacUnassigned, ...Object.keys(sipacBoard)];
    setSipacBoard({});
    setSipacUnassigned(allItems);
    setAgentFeedback("Lienzo reiniciado. Arrastra las tarjetas para empezar de nuevo.");
    setAgentFeedbackType("info");
  };

  const renderSipac = () => {
    // Canvas blocks mapping with unified neutral aesthetic so asset health colors stand out
    const neutralBlockStyle = {
      color: "border-zinc-300 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/30 hover:bg-zinc-100/70 dark:hover:bg-zinc-900/50 hover:border-zinc-400 dark:hover:border-zinc-700",
      headerColor: "text-zinc-900 dark:text-zinc-100",
      badgeColor: "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700"
    };

    const blocks = [
      { 
        id: "Key Partners", 
        title: "Asociaciones Clave", 
        desc: "¿Quiénes son nuestros socios clave?", 
        ...neutralBlockStyle,
        gridArea: "1 / 1 / 3 / 2" 
      },
      { 
        id: "Key Activities", 
        title: "Actividades Clave", 
        desc: "¿Qué actividades requiere nuestra propuesta?", 
        ...neutralBlockStyle,
        gridArea: "1 / 2 / 2 / 3" 
      },
      { 
        id: "Key Resources", 
        title: "Recursos Clave", 
        desc: "¿Qué recursos clave necesitamos?", 
        ...neutralBlockStyle,
        gridArea: "2 / 2 / 3 / 3" 
      },
      { 
        id: "Value Propositions", 
        title: "Propuestas de Valor", 
        desc: "¿Qué valor entregamos al cliente?", 
        ...neutralBlockStyle,
        gridArea: "1 / 3 / 3 / 4" 
      },
      { 
        id: "Customer Relationships", 
        title: "Relaciones con Clientes", 
        desc: "¿Qué tipo de relación esperan?", 
        ...neutralBlockStyle,
        gridArea: "1 / 4 / 2 / 5" 
      },
      { 
        id: "Channels", 
        title: "Canales", 
        desc: "¿A través de qué canales?", 
        ...neutralBlockStyle,
        gridArea: "2 / 4 / 3 / 5" 
      },
      { 
        id: "Customer Segments", 
        title: "Segmentos de Clientes", 
        desc: "¿Para quién creamos valor?", 
        ...neutralBlockStyle,
        gridArea: "1 / 5 / 3 / 6" 
      },
      { 
        id: "Cost Structure", 
        title: "Estructura de Costes", 
        desc: "¿Cuáles son los costes más importantes?", 
        ...neutralBlockStyle,
        gridArea: "3 / 1 / 4 / 4" 
      },
      { 
        id: "Revenue Streams", 
        title: "Fuentes de Ingreso", 
        desc: "¿Por qué valor están dispuestos a pagar?", 
        ...neutralBlockStyle,
        gridArea: "3 / 4 / 4 / 6" 
      }
    ];

    // Extraer artefactos e indicadores si existen en SIPAC
    const sipacArtefactos: any[] = data.sipac?.artefactos || [];
    const sipacIndicadores: any[] = data.sipac?.indicadores || [];

    return (
      <div className="space-y-6">
        {/* Sub-tabs for SIPAC */}
        <div className="flex items-center justify-between border-b border-zinc-400 dark:border-zinc-800 pb-2">
          <div className="flex items-center gap-1.5 bg-zinc-400/15 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-400 dark:border-zinc-800">
            <button
              onClick={() => setSipacTab("canvas")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                sipacTab === "canvas"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs border border-zinc-400 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-400/20 dark:hover:bg-zinc-800/60"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              {tr("Lienzo Business Model Canvas (BMC)", "Business Model Canvas (BMC)")}
            </button>
            {sipacIndicadores.length > 0 && (
              <button
                onClick={() => setSipacTab("matrix")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  sipacTab === "matrix"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs border border-zinc-400 dark:border-zinc-700"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-400/20 dark:hover:bg-zinc-800/60"
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                {tr("Matriz de Intangibles e Indicadores", "Intangibles & Indicators Matrix")}
              </button>
            )}
          </div>
        </div>

        {/* VIEW 1: BUSINESS MODEL CANVAS */}
        {sipacTab === "canvas" && (
          <div className="space-y-6">
            {/* Controls and Feedback Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-400/10 dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 hover:border-indigo-400 transition-colors shadow-2xs">
              <div className="flex-1 flex items-start gap-3">
                <Sparkles className={`w-5 h-5 mt-0.5 shrink-0 ${
                  agentFeedbackType === "success" ? "text-emerald-500 animate-pulse" :
                  agentFeedbackType === "warning" ? "text-amber-500" : "text-indigo-500 animate-pulse"
                }`} />
                <p className="text-xs text-zinc-700 dark:text-zinc-400 leading-relaxed">
                  <strong>Feedback del Consultor: </strong>{agentFeedback}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={askAgentToDistribute}
                  disabled={isClassifying || (sipacUnassigned.length === 0 && Object.keys(sipacBoard).length === 0)}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] disabled:opacity-50"
                  title="Ordenar automáticamente todas las propuestas con IA"
                >
                  {isClassifying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Clasificando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Auto-Ordenar con IA
                    </>
                  )}
                </button>
                <button
                  onClick={resetCanvas}
                  className="px-3 py-1.5 rounded-lg border border-zinc-400 dark:border-zinc-800 hover:bg-zinc-400/20 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white text-zinc-700 dark:text-zinc-400 text-xs font-medium transition-all hover:scale-[1.02] flex items-center gap-1"
                  title="Reiniciar el lienzo BMC"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reiniciar
                </button>
              </div>
            </div>

            {/* Leyenda de Salud de Activos Intangibles (SIPAC) */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5 pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                    Leyenda de Salud de Activos Intangibles
                  </h5>
                </div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                  Diagnóstico 2×2 SIPAC (Calidad vs Impacto)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-300/80 dark:border-emerald-800/80">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-0.5 shadow-2xs" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300">Estable (Saludable)</div>
                    <div className="text-[9px] text-emerald-700/80 dark:text-emerald-400/80 leading-tight mt-0.5">Calidad e impacto altos</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-sky-50/70 dark:bg-sky-950/20 border border-sky-300/80 dark:border-sky-800/80">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0 mt-0.5 shadow-2xs" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-sky-900 dark:text-sky-300">En Evolución</div>
                    <div className="text-[9px] text-sky-700/80 dark:text-sky-400/80 leading-tight mt-0.5">Alto impacto, margen de mejora</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-300/80 dark:border-amber-800/80">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-0.5 shadow-2xs" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-amber-900 dark:text-amber-300">Reemplazable</div>
                    <div className="text-[9px] text-amber-700/80 dark:text-amber-400/80 leading-tight mt-0.5">Calidad buena, bajo impacto</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-rose-50/70 dark:bg-rose-950/20 border border-rose-300/80 dark:border-rose-800/80">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mt-0.5 shadow-2xs" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-rose-900 dark:text-rose-300">Advertencia (Crítico)</div>
                    <div className="text-[9px] text-rose-700/80 dark:text-rose-400/80 leading-tight mt-0.5">Baja calidad y bajo impacto</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer superior: Activos Intangibles por ubicar */}
            {sipacUnassigned.length > 0 ? (
              <div className="p-3.5 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 mb-2.5 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                      Activos por colocar en el Canvas
                    </h4>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {sipacUnassigned.length} {sipacUnassigned.length === 1 ? "pendiente" : "pendientes"}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Arrastra las tarjetas a los bloques inferiores o pulsa <span className="font-semibold text-indigo-600 dark:text-indigo-400">Ubicar</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {sipacUnassigned.map((item) => {
                    const healthInfo = getHealthInfo(item);
                    return (
                      <div
                        key={item}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onMouseEnter={() => setHoveredSipacItem(item)}
                        onMouseLeave={() => setHoveredSipacItem(null)}
                        className={`p-2.5 rounded-xl border shadow-2xs cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 select-none group relative flex flex-col justify-between ${healthInfo.cardBg} ${healthInfo.cardBorder} ${healthInfo.cardHoverBorder}`}
                      >
                        <div className="flex items-start justify-between gap-1.5 mb-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <GripVertical className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-500 transition-colors shrink-0" />
                            <div className="text-xs font-semibold text-zinc-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate" title={item}>
                              {item}
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 font-mono ${healthInfo.badgeBg} ${healthInfo.badgeText} ${healthInfo.badgeBorder}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${healthInfo.dotColor}`} />
                            {healthInfo.label}
                          </span>
                        </div>

                        {/* Quick Placement button on Hover / Tap */}
                        <div className="pt-1.5 border-t border-zinc-300/40 dark:border-zinc-800/60 flex items-center justify-between">
                          <span className="text-[9px] text-zinc-400 font-mono">Arrastra ↓</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const correctBlock = sipacClassifications[item]?.category || "Value Propositions";
                              placeItem(item, correctBlock);
                            }}
                            className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-all text-[9px] font-bold flex items-center gap-1 border border-indigo-200 dark:border-indigo-800"
                            title="Ubicar automáticamente"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            Ubicar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-2.5 px-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                    ¡Todos los activos intangibles han sido ubicados en el Canvas!
                  </span>
                  <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 hidden md:inline">
                    (Puedes seguir reubicando activos arrastrándolos entre bloques o devolverlos pulsando la cruz de cada tarjeta)
                  </span>
                </div>
              </div>
            )}

            {/* Business Model Canvas Grid (Full Width) */}
            <div className="w-full overflow-x-auto pb-1">
              <div className="min-w-[800px] lg:min-w-0 w-full grid grid-cols-5 grid-rows-3 gap-3 h-[540px]">
                {blocks.map((block) => {
                  const blockItems = Object.entries(sipacBoard)
                    .filter(([_, value]) => value === block.id)
                    .map(([key]) => key);

                  return (
                    <div
                      key={block.id}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, block.id)}
                      style={{ gridArea: block.gridArea }}
                      className={`p-3 rounded-xl border-2 border-dashed shadow-2xs flex flex-col transition-all duration-200 overflow-hidden group cursor-default hover:shadow-md hover:scale-[1.005] ${block.color} ${
                        draggedItem ? 'ring-2 ring-indigo-500/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5 pb-1.5 mb-2 border-b border-zinc-300 dark:border-zinc-800">
                        <div>
                          <h5 className={`text-[10px] font-extrabold uppercase tracking-wider leading-tight transition-colors ${block.headerColor}`}>
                            {block.title}
                          </h5>
                          <span className="text-[8px] text-zinc-600 dark:text-zinc-400 font-medium leading-none block mt-0.5">{block.desc}</span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border transition-transform group-hover:scale-110 ${block.badgeColor}`}>
                          {blockItems.length}
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                        {blockItems.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-center text-[9px] text-zinc-500 dark:text-zinc-400 italic p-2 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-lg group-hover:border-indigo-400/80 transition-colors">
                            Arrastra aquí
                          </div>
                        ) : (
                          blockItems.map((item) => {
                            const isCorrect = sipacClassifications[item] && 
                              sipacClassifications[item].category.toLowerCase().replace(/\s/g, "") === block.id.toLowerCase().replace(/\s/g, "");
                            const healthInfo = getHealthInfo(item);
                            
                            return (
                              <div
                                key={item}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item)}
                                className={`p-2 rounded-lg text-[11px] font-semibold border shadow-2xs select-none transition-all duration-150 flex flex-col gap-1 cursor-grab active:cursor-grabbing hover:scale-[1.01] hover:shadow-md group/card relative ${healthInfo.cardBg} ${healthInfo.cardBorder} ${healthInfo.cardHoverBorder}`}
                              >
                                <div className="text-zinc-900 dark:text-white leading-tight flex items-start justify-between gap-1.5">
                                  <span className="group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors truncate" title={item}>{item}</span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className={`inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 font-mono ${healthInfo.badgeBg} ${healthInfo.badgeText} ${healthInfo.badgeBorder}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${healthInfo.dotColor}`} />
                                      {healthInfo.label}
                                    </span>
                                    {isCorrect && (
                                      <span title="Validado por el consultor IA">
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                      </span>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Devolver a lista unassigned
                                        const newBoard = { ...sipacBoard };
                                        delete newBoard[item];
                                        setSipacBoard(newBoard);
                                        setSipacUnassigned(prev => [...prev, item]);
                                      }}
                                      className="opacity-0 group-hover/card:opacity-100 p-0.5 rounded text-zinc-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                                      title="Devolver a lista de pendientes"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Validation check justification if available */}
                                {sipacClassifications[item] && (
                                  <div className="text-[9px] font-medium text-zinc-600 dark:text-zinc-400 border-t border-zinc-300/40 dark:border-zinc-800 pt-1 mt-0.5 leading-normal italic">
                                    {sipacClassifications[item].justification}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: MATRIZ DE INTANGIBLES E INDICADORES (SIPAC Matrix) */}
        {sipacTab === "matrix" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-400 dark:border-zinc-800">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                    Evaluación de Indicadores de Activos Intangibles (Metodología SIPAC)
                  </h4>
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Gaps de Calidad (V) e Impacto (W) calculados para cada artefacto
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-900">
                  {sipacIndicadores.length} Indicadores
                </span>
              </div>

              <div className="border border-zinc-400 dark:border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-400/15 dark:bg-zinc-900 border-b border-zinc-400 dark:border-zinc-800 font-bold text-zinc-800 dark:text-white">
                      <th className="p-3">Artefacto</th>
                      <th className="p-3">Indicador</th>
                      <th className="p-3 text-right">Mínimo</th>
                      <th className="p-3 text-right">Meta (Target)</th>
                      <th className="p-3 text-right">Máximo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-400 dark:divide-zinc-900">
                    {sipacIndicadores.map((ind, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/25 transition-colors group cursor-default">
                        <td className="p-3 font-semibold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {ind.artefactoNombre}
                        </td>
                        <td className="p-3 text-zinc-700 dark:text-zinc-400">
                          {ind.indicadorNombre}
                        </td>
                        <td className="p-3 text-right font-mono text-zinc-600 dark:text-zinc-400">{ind.min}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{ind.target}</td>
                        <td className="p-3 text-right font-mono text-zinc-600 dark:text-zinc-400">{ind.max}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  // --- AHP PRIORITIZATION VISUALIZATION (MATRICES AND SCORING) ---
  const renderAhp = () => {
    // 1. Extract inputs
    const criteriaKeys: string[] = data.ahp_final_criteria?.criterios_finales || 
                                   (data.ahp_suggested_criteria?.criterios_sugeridos?.map((c: any) => c.nombre)) ||
                                   ["Criterio 1", "Criterio 2", "Criterio 3"];
    
    const critComps = data.ahp_criteria_comparisons?.comparaciones_criterios || [];
    const altData = data.ahp_alternatives_comparisons?.matrices_alternativas || [];

    // Extract unique alternatives (artifacts)
    const artifactsSet = new Set<string>();
    altData.forEach((alt: any) => {
      alt.comparaciones?.forEach((comp: any) => {
        if (comp.item_a) artifactsSet.add(comp.item_a);
        if (comp.item_b) artifactsSet.add(comp.item_b);
      });
    });
    let artifacts = Array.from(artifactsSet);

    // Fallbacks if no comparisons executed yet
    if (artifacts.length === 0) {
      const rankingObj = data.ranking || data.resultados_prioridades || data.ahp_results || {};
      if (Array.isArray(rankingObj)) {
        artifacts = rankingObj.map((r: any) => r.name || r.item || r.artefacto);
      } else {
        artifacts = Object.keys(rankingObj);
      }
    }

    if (artifacts.length === 0) {
      artifacts = ["Plataforma E-commerce integrada", "SaaS Base de Conocimientos", "ERP de Inventario Local"];
    }

    // 2. Perform AHP Calculations (prioritizing backend-processed outputs)
    let criteriaWeights: number[] = [];
    let criteriaCR = 0;
    let isCriteriaConsistent = true;
    let altWeightsPerCriteria: number[][] = [];
    let scores: Array<{ name: string; score: number }> = [];

    if (data.ahp_processed) {
      const p = data.ahp_processed;
      criteriaWeights = p.criteriaResult.weights;
      criteriaCR = p.criteriaResult.consistencyRatio;
      isCriteriaConsistent = p.criteriaResult.isConsistent;
      altWeightsPerCriteria = p.altWeightsPerCriteria;
      artifacts = p.artifacts;
      scores = [...p.scores];
    } else {
      criteriaWeights = new Array(criteriaKeys.length).fill(1 / criteriaKeys.length);
      try {
        // Build and calculate criteria
        if (criteriaKeys.length > 0 && critComps.length > 0) {
          const critMatrix = buildMatrix(criteriaKeys, critComps);
          const critRes = calcAhp(critMatrix);
          criteriaWeights = critRes.weights;
          criteriaCR = critRes.consistencyRatio;
          isCriteriaConsistent = critRes.isConsistent;
        }

        // Build and calculate alternatives for each criteria
        for (let i = 0; i < criteriaKeys.length; i++) {
          const critName = criteriaKeys[i];
          const altItem = altData.find((a: any) => 
            a.criterio.toLowerCase().trim() === critName.toLowerCase().trim() || 
            critName.toLowerCase().includes(a.criterio.toLowerCase().trim())
          );

          if (altItem && altItem.comparaciones && altItem.comparaciones.length > 0) {
            const altMatrix = buildMatrix(artifacts, altItem.comparaciones);
            const altRes = calcAhp(altMatrix);
            altWeightsPerCriteria.push(altRes.weights);
          } else {
            // Uniform distribution fallback
            altWeightsPerCriteria.push(new Array(artifacts.length).fill(1 / artifacts.length));
          }
        }
      } catch (err) {
        console.error("AHP Calculation failed in dashboard:", err);
      }

      // Calculate final scores
      scores = artifacts.map((art, artIdx) => {
        let score = 0;
        for (let critIdx = 0; critIdx < criteriaKeys.length; critIdx++) {
          const critWeight = criteriaWeights[critIdx] || 0;
          const localWeights = altWeightsPerCriteria[critIdx] || [];
          const altWeight = localWeights[artIdx] || 0;
          score += critWeight * altWeight;
        }
        return { name: art, score };
      });
    }

    // Always sort descending: highest weight = highest priority = Rank 1
    scores.sort((a, b) => b.score - a.score);

    // Prepare chart data
    const chartData = scores.map(s => ({
      name: s.name.length > 25 ? s.name.substring(0, 22) + "..." : s.name,
      fullName: s.name,
      Prioridad: Math.round(s.score * 1000) / 10,
    }));

    // Find descriptions of criteria if available
    const criteriaDetails = criteriaKeys.map((crit, idx) => {
      const detail = data.ahp_suggested_criteria?.criterios_sugeridos?.find((c: any) => 
        c.nombre.toLowerCase().trim() === crit.toLowerCase().trim()
      );
      return {
        name: crit,
        weight: criteriaWeights[idx] || 0,
        description: detail?.descripcion || "Criterio de priorización de propuestas."
      };
    });

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Consistency indicator card */}
          <div className="p-4 rounded-xl bg-zinc-400/10 dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs ${
              isCriteriaConsistent ? 'bg-emerald-500 shadow-md shadow-emerald-100 dark:shadow-none' : 'bg-rose-500'
            }`}>
              {isCriteriaConsistent ? "OK" : "CR!"}
            </div>
            <div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">Ratio de Consistencia (CR)</div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white">
                {criteriaCR.toFixed(4)}
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {isCriteriaConsistent ? "Juicio consistente (< 0.10)" : "Consistencia alta (> 0.10), revisar"}
              </div>
            </div>
          </div>

          {/* Crown proposal recommendation card */}
          <div className="p-4 rounded-xl bg-zinc-400/10 dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 flex items-center gap-3">
            <Crown className="w-10 h-10 text-violet-500" />
            <div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">Alternativa Recomendada (AHP)</div>
              <div className="text-sm font-extrabold text-zinc-900 dark:text-white truncate max-w-[200px]" title={scores[0]?.name}>
                {scores[0]?.name || "Ninguna"}
              </div>
              <div className="text-[10px] text-violet-600 dark:text-violet-400 font-bold mt-0.5">
                Peso Relativo: {(scores[0]?.score * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Priorities Graph */}
        <div className="p-4 rounded-xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-white mb-4">Pesos Globales de Prioridad (AHP)</h4>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_PALETTE.grid} className="dark:stroke-zinc-800/60" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 9 }} />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Prioridad']}
                  labelFormatter={(index) => chartData[index as any]?.fullName || index}
                />
                <Bar dataKey="Prioridad" fill={RECHARTS_THEME.ahp.barFill} radius={[0, 4, 4, 0]} maxBarSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priorities Matrix Table (Criteria vs Alternatives) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-white">Matriz de Priorización de Alternativas</h4>
            <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-400/20 dark:bg-zinc-800 px-2 py-0.5 rounded">AHP Decision Matrix</span>
          </div>

          <div className="border border-zinc-400 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-400/15 dark:bg-zinc-900 border-b border-zinc-400 dark:border-zinc-800">
                    <th className="p-3 font-bold text-zinc-800 dark:text-white">Alternativa (Artefacto)</th>
                    {criteriaKeys.map((crit, idx) => (
                      <th key={crit} className="p-3 font-bold text-zinc-800 dark:text-white text-right">
                        <div>{crit}</div>
                        <div className="text-[9px] text-zinc-500 dark:text-zinc-400 font-normal">w = {(criteriaWeights[idx] * 100).toFixed(1)}%</div>
                      </th>
                    ))}
                    <th className="p-3 font-bold text-violet-650 dark:text-violet-400 text-right bg-violet-50/30 dark:bg-violet-950/10">Prioridad Global</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-400 dark:divide-zinc-900">
                  {scores.map((alt, altIdx) => {
                    const originalIdx = artifacts.indexOf(alt.name);
                    const isTop = altIdx === 0;

                    return (
                      <tr key={alt.name} className={`hover:bg-zinc-400/10 dark:hover:bg-zinc-900/30 transition-colors ${
                        isTop ? 'bg-violet-50/10 dark:bg-violet-950/5' : ''
                      }`}>
                        <td className="p-3 font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                          {isTop ? (
                            <Crown className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                          ) : (
                            <span className="text-zinc-500 dark:text-zinc-400 w-3 text-center">{altIdx + 1}</span>
                          )}
                          <span className="truncate max-w-[240px]" title={alt.name}>{alt.name}</span>
                        </td>
                        
                        {criteriaKeys.map((_, critIdx) => {
                          const localWeights = altWeightsPerCriteria[critIdx] || [];
                          const val = localWeights[originalIdx] || 0;
                          return (
                            <td key={critIdx} className="p-3 text-right font-mono text-zinc-700 dark:text-zinc-400">
                              {(val * 100).toFixed(1)}%
                            </td>
                          );
                        })}

                        <td className="p-3 text-right font-mono font-bold text-violet-650 dark:text-violet-400 bg-violet-50/30 dark:bg-violet-950/10">
                          {(alt.score * 100).toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Criteria Weights & Details list */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-white">Criterios de Decisión Empleados</h4>
          <div className="divide-y divide-zinc-400 dark:divide-zinc-800 border border-zinc-400 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950 shadow-2xs">
            {criteriaDetails.map((crit, index) => (
              <div key={index} className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center hover:bg-zinc-400/10 dark:hover:bg-zinc-900/30 transition-colors">
                <div className="sm:w-1/3 shrink-0 flex items-center gap-2">
                  <div className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 font-mono font-bold text-2xs">
                    {(crit.weight * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">{crit.name}</div>
                </div>
                <div className="text-xs text-zinc-700 dark:text-zinc-400 leading-relaxed">
                  {crit.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Matrix building helper
  function buildMatrix(items: string[], comparisons: any[]): number[][] {
    const n = items.length;
    const matrix = Array.from({ length: n }, () => new Array(n).fill(1));
    if (!comparisons || comparisons.length === 0) return matrix;

    for (const comp of comparisons) {
      const idxA = items.findIndex((i) => i.toLowerCase().trim() === comp.item_a.toLowerCase().trim());
      const idxB = items.findIndex((i) => i.toLowerCase().trim() === comp.item_b.toLowerCase().trim());

      if (idxA === -1 || idxB === -1 || idxA === idxB) continue;

      let scoreA = 1;
      let scoreB = 1;

      const ganador = String(comp.ganador || "").toLowerCase().trim();
      const itemAStr = comp.item_a.toLowerCase().trim();
      const itemBStr = comp.item_b.toLowerCase().trim();

      if (ganador === "empate") {
        scoreA = 1;
        scoreB = 1;
      } else if (ganador === itemAStr || ganador.includes(itemAStr)) {
        scoreA = Number(comp.peso_saaty) || 1;
        scoreB = 1 / scoreA;
      } else if (ganador === itemBStr || ganador.includes(itemBStr)) {
        scoreB = Number(comp.peso_saaty) || 1;
        scoreA = 1 / scoreB;
      }

      matrix[idxA][idxB] = scoreA;
      matrix[idxB][idxA] = scoreB;
    }

    return matrix;
  }

  return (
    <>
      {/* Backdrop overlay when maximized */}
      {isMaximized && (
        <div 
          onClick={() => setIsMaximized(false)} 
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-md z-40" 
        />
      )}

      <div className={`transition-all duration-200 ${
        isMaximized 
          ? "fixed inset-3 md:inset-6 z-50 p-6 rounded-2xl border-2 border-indigo-500/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl shadow-2xl space-y-6 flex flex-col max-h-[calc(100vh-1.5rem)] md:max-h-[calc(100vh-3rem)] overflow-hidden" 
          : "p-6 rounded-2xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg space-y-6"
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-400 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-extrabold text-zinc-950 dark:text-white flex items-center gap-2 uppercase tracking-wide">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              {tr("Dashboard de Resultados", "Results Dashboard")}
            </h3>

            {/* Multi-methodology switcher if available */}
            {availableMethods.length > 1 && (
              <div className="flex items-center gap-1 bg-zinc-400/15 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-400 dark:border-zinc-800">
                {availableMethods.map((m) => (
                  <button
                    key={m}
                    onClick={() => setActiveMethod(m)}
                    className={`px-2.5 py-1 rounded text-2xs font-bold uppercase transition-all cursor-pointer ${
                      activeMethod === m
                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs border border-zinc-400 dark:border-zinc-700"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    {m === "altus" ? tr("ALTUS (Madurez)", "ALTUS (Maturity)") : m === "sipac" ? tr("SIPAC (Intangibles)", "SIPAC (Intangibles)") : m === "ahp" ? tr("AHP (Priorización)", "AHP (Prioritization)") : "Custom"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Fullscreen / Maximize Toggle */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-lg border border-zinc-400 dark:border-zinc-800 hover:bg-zinc-400/20 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all hover:scale-105 shadow-2xs flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title={isMaximized ? tr("Restaurar tamaño (Esc)", "Restore size (Esc)") : tr("Expandir a pantalla completa", "Expand to full screen")}
            >
              {isMaximized ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="hidden sm:inline">{tr("Restaurar", "Restore")}</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="hidden sm:inline">{tr("Pantalla Completa", "Full Screen")}</span>
                </>
              )}
            </button>

            <span className="text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 border border-indigo-500/40 dark:border-indigo-800">
              {activeMethod.toUpperCase()} Diagnóstico
            </span>
          </div>
        </div>

        <div className={isMaximized ? "overflow-y-auto pr-2 scrollbar-thin flex-1 max-h-[calc(100vh-9rem)]" : "space-y-6"}>
          {activeMethod === "altus" && renderAltus()}
          {activeMethod === "sipac" && renderSipac()}
          {activeMethod === "ahp" && renderAhp()}
          {activeMethod === "custom" && (
            <div className="text-zinc-700 dark:text-zinc-400 text-xs">
              <h4 className="font-semibold text-zinc-900 dark:text-white">Estructura Custom de Datos:</h4>
              <pre className="mt-2 p-4 rounded-xl bg-zinc-400/10 dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 text-2xs font-mono overflow-auto max-h-96">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
