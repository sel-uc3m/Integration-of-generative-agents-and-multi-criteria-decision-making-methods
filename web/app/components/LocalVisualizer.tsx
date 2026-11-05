"use client";

import React, { useState, useEffect, useRef } from "react";
import { Cpu, ChevronDown, ChevronUp, Clock, Code, AlertCircle, Play, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SkipBack, SkipForward, Target, Focus } from "lucide-react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
} from "@xyflow/react";

// Import `@xyflow/react` default stylesheet
import "@xyflow/react/dist/style.css";
import { COLOR_TOKENS } from "@/app/theme/tokens";
import { useLanguage } from "../context/LanguageContext";

interface LLMCall {
  id: string;
  model: string;
  prompts: string[];
  response?: string;
  timestamp: string;
  durationMs?: number;
  node?: string | null;
}

interface NodeVisit {
  node: string;
  timestamp: string;
}

interface NodeRun {
  runId: string;
  node: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputs?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  outputs?: any;
  timestamp: string;
  durationMs?: number;
}

interface SessionTrace {
  sessionId: string;
  activeNode: string | null;
  nodeHistory: NodeVisit[];
  llmCalls: LLMCall[];
  nodeRuns: NodeRun[];
}

interface LocalVisualizerProps {
  sessionId: string;
  isActive: boolean;
  darkMode?: boolean;
}

// Static node position layout for TFM LangGraph
const staticGraphNodes = [
  { id: "START", type: "input", label: "START", pos: { x: 280, y: 15 } },
  { id: "taskLoader", label: "taskLoader", pos: { x: 280, y: 80 } },
  { id: "extractAction", label: "extractAction", pos: { x: 280, y: 165 } },
  { id: "executeInternalAction", label: "executeInternalAction", pos: { x: 50, y: 250 } },
  { id: "questionManager", label: "questionManager", pos: { x: 450, y: 250 } },
  { id: "knowledgeConsultant", label: "knowledgeConsultant", pos: { x: 670, y: 400 } },
  { id: "doubtConfirmer", label: "doubtConfirmer", pos: { x: 670, y: 300 } },
  { id: "contextProcessor", label: "contextProcessor", pos: { x: 450, y: 430 } },
  { id: "architect", label: "architect", pos: { x: 450, y: 520 } },
  { id: "actionAnswerSummarizer", label: "actionAnswerSummarizer", pos: { x: 280, y: 610 } },
  { id: "executeActionHook", label: "executeActionHook", pos: { x: 280, y: 690 } },
  { id: "saveToOutput", label: "saveToOutput", pos: { x: 280, y: 770 } },
  { id: "taskSummarizer", label: "taskSummarizer", pos: { x: 50, y: 850 } },
  { id: "executeTaskHook", label: "executeTaskHook", pos: { x: 50, y: 930 } },
  { id: "END", type: "output", label: "END", pos: { x: 510, y: 80 } },
];

// Connection edges
const staticGraphEdges = [
  { id: "e-start-loader", source: "START", target: "taskLoader" },
  { id: "e-loader-end", source: "taskLoader", target: "END", label: "empty" },
  { id: "e-loader-extract", source: "taskLoader", target: "extractAction", label: "hasTask" },
  { id: "e-extract-question", source: "extractAction", target: "questionManager", label: "question" },
  { id: "e-extract-internal", source: "extractAction", target: "executeInternalAction", label: "internal" },
  { id: "e-question-consultant", source: "questionManager", target: "knowledgeConsultant", label: "doubt" },
  { id: "e-question-confirmer", source: "questionManager", target: "doubtConfirmer", label: "confirm_doubt" },
  { id: "e-question-processor", source: "questionManager", target: "contextProcessor", label: "response" },
  { id: "e-confirmer-consultant", source: "doubtConfirmer", target: "knowledgeConsultant", label: "doubt" },
  { id: "e-confirmer-processor", source: "doubtConfirmer", target: "contextProcessor", label: "response" },
  { id: "e-consultant-question", source: "knowledgeConsultant", target: "questionManager" },
  { id: "e-processor-architect", source: "contextProcessor", target: "architect" },
  { id: "e-architect-summarizer", source: "architect", target: "actionAnswerSummarizer", label: "stop" },
  { id: "e-architect-question", source: "architect", target: "questionManager", label: "ask_follow_up" },
  { id: "e-internal-summarizer", source: "executeInternalAction", target: "actionAnswerSummarizer" },
  { id: "e-summarizer-hook", source: "actionAnswerSummarizer", target: "executeActionHook" },
  { id: "e-hook-save", source: "executeActionHook", target: "saveToOutput" },
  { id: "e-save-summarizer", source: "saveToOutput", target: "taskSummarizer", label: "empty" },
  { id: "e-save-extract", source: "saveToOutput", target: "extractAction", label: "hasAction" },
  { id: "e-tasksummarizer-hook", source: "taskSummarizer", target: "executeTaskHook" },
  { id: "e-taskhook-loader", source: "executeTaskHook", target: "taskLoader" },
];

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  onNodeClick: any;
  darkMode: boolean;
  activeNode: string | null;
}

// Inner helper component to utilize `useReactFlow` hook inside a ReactFlowProvider
const FlowCanvas: React.FC<FlowCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  darkMode,
  activeNode,
}) => {
  const { setCenter, fitView } = useReactFlow();
  const lastFocusedNode = useRef<string | null>(null);
  const [isViewportMoved, setIsViewportMoved] = useState(false);

  // Smoothly center and zoom on the active/interrupted node in real-time only when activeNode changes
  useEffect(() => {
    if (!activeNode) {
      lastFocusedNode.current = null;
      setIsViewportMoved(false);
      return;
    }

    if (activeNode !== lastFocusedNode.current) {
      const node = nodes.find(n => n.id === activeNode);
      if (node) {
        // Node width is 140px, height is ~35px. Center: x + 70, y + 18
        setCenter(node.position.x + 70, node.position.y + 18, {
          zoom: 1.35,
          duration: 900,
        });
        lastFocusedNode.current = activeNode;
        setIsViewportMoved(false); // Reset on programmatic focus
      }
    }
  }, [activeNode, nodes, setCenter]);

  const handleRecenter = () => {
    if (activeNode) {
      const node = nodes.find(n => n.id === activeNode);
      if (node) {
        setCenter(node.position.x + 70, node.position.y + 18, {
          zoom: 1.35,
          duration: 800,
        });
        setIsViewportMoved(false);
        return;
      }
    }
    fitView({ duration: 800, padding: 0.15 });
    setIsViewportMoved(false);
  };

  // Only trigger viewport-moved state if the movement started from a user input gesture
  const handleMoveStart = (event?: any) => {
    if (event) {
      setIsViewportMoved(true);
    }
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodesDraggable={false}
      onMoveStart={handleMoveStart}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.3}
      maxZoom={2.0}
      proOptions={{ hideAttribution: true }}
      className="text-zinc-900 dark:text-white"
    >
      <Background
        variant={BackgroundVariant.Cross}
        color={darkMode ? "rgba(73, 114, 148, 0.25)" : "rgba(109, 147, 177, 0.18)"}
        gap={26}
        size={5}
      />
      <Controls
        showInteractive={false}
        className="bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 rounded-lg overflow-hidden [&_button]:!bg-white [&_button]:dark:!bg-zinc-900 [&_button]:!border-zinc-400 [&_button]:dark:!border-zinc-800 [&_button]:hover:!bg-zinc-400/20 [&_button]:dark:hover:!bg-zinc-800 [&_svg]:!fill-zinc-700 [&_svg]:dark:!fill-zinc-400"
      />
      <button
        onClick={handleRecenter}
        className={`absolute bottom-4 right-4 z-10 p-2.5 rounded-xl border transition-all duration-300 active:scale-95 cursor-pointer shadow-md backdrop-blur-md ${
          isViewportMoved
            ? "border-indigo-400 dark:border-indigo-800 bg-indigo-50/95 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/90 dark:hover:bg-indigo-900/40 ring-4 ring-indigo-500/10 dark:ring-indigo-400/5 animate-pulse"
            : "border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-400/15 dark:hover:bg-zinc-900 opacity-60 hover:opacity-100"
        }`}
        title={activeNode ? "Recentrar en el nodo activo" : "Recentrar vista completa"}
      >
        <Focus className="w-4 h-4" />
      </button>
    </ReactFlow>
  );
};

const renderNodeInspectorCard = (run: NodeRun, darkMode: boolean) => {
  const { node, inputs, outputs } = run;
  const inAction = inputs?.currentAction;
  const outAction = outputs?.currentAction || inAction;
  const inTask = inputs?.currentTask;
  const outTask = outputs?.currentTask || inTask;

  const preStyle = "p-2 bg-zinc-400/10 dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 rounded-md font-mono text-[9px] text-zinc-900 dark:text-zinc-400 overflow-x-auto whitespace-pre-wrap select-all max-h-[160px] leading-tight";
  const boxStyle = "space-y-3.5";
  const labelStyle = "font-bold text-[9px] text-zinc-700 dark:text-zinc-400 uppercase tracking-wider block mb-1";

  switch (node) {
    case "taskLoader": {
      const taskQueue = inputs?.taskQueue || [];
      const loadedTask = outTask;
      const loadedActions = outputs?.actionQueue || [];
      return (
        <div className={boxStyle}>
          {loadedTask ? (
            <div>
              <span className={labelStyle}>Tarea Cargada</span>
              <div className="font-bold text-zinc-900 dark:text-white text-xs">
                {loadedTask.name} <span className="text-[10px] font-mono font-normal opacity-50">({loadedTask.id})</span>
              </div>
            </div>
          ) : (
            <div className="text-zinc-600 dark:text-zinc-400 italic text-[10px]">No se cargó ninguna tarea.</div>
          )}
          {loadedActions.length > 0 && (
            <div>
              <span className={labelStyle}>Acciones Cargadas en Cola ({loadedActions.length})</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {loadedActions.map((act: any, i: number) => (
                  <span key={i} className="text-[9px] font-mono bg-zinc-400/15 dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-400">
                    {act.id} <span className="opacity-50">({act.type})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {taskQueue.length > 0 && (
            <div className="text-zinc-600 dark:text-zinc-400 text-[9px] border-t border-zinc-400 dark:border-zinc-800 pt-2">
              Tareas restantes en la cola general del proceso: {taskQueue.length}
            </div>
          )}
        </div>
      );
    }

    case "extractAction": {
      const currentAction = outAction;
      const loopMetadata = currentAction?.loopMetadata;
      return (
        <div className={boxStyle}>
          {currentAction ? (
            <div className="space-y-3">
              <div>
                <span className={labelStyle}>Acción Extraída de la Cola</span>
                <div className="font-bold text-zinc-900 dark:text-white">
                  {currentAction.id} <span className="text-[9px] font-mono font-normal bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">Tipo: {currentAction.type}</span>
                </div>
              </div>
              {currentAction.content && (
                <div>
                  <span className={labelStyle}>Pregunta Original (Stakeholder)</span>
                  <div className="text-zinc-800 dark:text-white leading-relaxed italic border-l-2 border-zinc-400 dark:border-zinc-700 pl-2">
                    "{currentAction.content}"
                  </div>
                </div>
              )}
              {currentAction.instruction && (
                <div>
                  <span className={labelStyle}>Instrucción / Prompt de Razonamiento Interno</span>
                  <pre className={preStyle}>{currentAction.instruction}</pre>
                </div>
              )}
              {loopMetadata && (
                <div className="text-[9px] bg-amber-500/10 text-amber-500 p-2.5 rounded border border-amber-500/20">
                  <strong>Bucle de iteración (loop_validation):</strong> Evaluando elemento indexado <code>#{loopMetadata.itemIndex}</code> de la variable de origen <code>{loopMetadata.sourceVar}</code>.
                </div>
              )}
            </div>
          ) : (
            <div className="text-zinc-600 dark:text-zinc-400 italic text-[10px]">No hay acción activa extraída.</div>
          )}
        </div>
      );
    }

    case "questionManager": {
      const qText = outAction?.followUpQuestion || outAction?.content || inAction?.content;
      const response = outAction?.result;
      const doubtEx = outAction?.doubtExplanation;
      const turnsCount = (outAction?.transcript || []).length;
      const resolvedFromMemory = outAction?.result && turnsCount === 0;

      return (
        <div className={boxStyle}>
          <div className="space-y-3">
            <div>
              <span className={labelStyle}>Pregunta Formulada</span>
              <div className="text-zinc-900 dark:text-white leading-relaxed font-semibold">
                {qText || <span className="italic text-zinc-500 dark:text-zinc-400">Ninguna</span>}
              </div>
            </div>

            {doubtEx && (
              <div className="p-2.5 border border-blue-500/25 bg-blue-500/5 rounded text-[10px] text-blue-400 leading-relaxed">
                <strong>Duda detectada y aclarada:</strong> {doubtEx}
              </div>
            )}

            <div>
              <span className={labelStyle}>Respuesta Obtenida</span>
              {resolvedFromMemory ? (
                <div className="space-y-1.5">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 rounded-md select-all italic leading-relaxed">
                    "{response}"
                  </div>
                  <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    ✓ Evitada pregunta redundante: deducción realizada a partir de la memoria.
                  </span>
                </div>
              ) : response ? (
                <div className="p-2.5 bg-zinc-900 text-white border border-zinc-800 rounded-md select-all italic leading-relaxed">
                  "{response}"
                </div>
              ) : (
                <div className="text-zinc-600 dark:text-zinc-400 italic text-[10px] animate-pulse">Esperando respuesta del stakeholder...</div>
              )}
            </div>
          </div>
        </div>
      );
    }

    case "doubtConfirmer": {
      const response = inAction?.result;
      const confirmed = outAction?.doubtConfirmed;
      return (
        <div className={boxStyle}>
          <div className="space-y-2.5">
            <div>
              <span className={labelStyle}>Mensaje del Stakeholder</span>
              <div className="italic text-zinc-800 dark:text-white leading-relaxed">"{response}"</div>
            </div>
            <div>
              <span className={labelStyle}>Veredicto de Confirmación</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  confirmed === true
                    ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                    : confirmed === false
                      ? "bg-zinc-400/20 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 border border-zinc-400 dark:border-zinc-700"
                      : "bg-zinc-400/20 dark:bg-zinc-800 text-zinc-500 animate-pulse"
                }`}>
                  {confirmed === true ? "Confirmado como duda" : confirmed === false ? "Procesado como respuesta a la pregunta" : "Evaluando..."}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    case "knowledgeConsultant": {
      const response = inAction?.result;
      const doubtEx = outAction?.doubtExplanation;
      return (
        <div className={boxStyle}>
          <div className="space-y-2.5">
            <div>
              <span className={labelStyle}>Duda Detectada</span>
              <div className="italic text-zinc-800 dark:text-white leading-relaxed">"{response}"</div>
            </div>
            <div>
              <span className={labelStyle}>Aclaración/Explicación Generada</span>
              {doubtEx ? (
                <div className="p-2.5 bg-zinc-900 text-white border border-zinc-800 rounded-md leading-relaxed select-all">
                  {doubtEx}
                </div>
              ) : (
                <div className="text-zinc-600 dark:text-zinc-400 italic text-[10px] animate-pulse">Generando aclaración para el usuario...</div>
              )}
            </div>
          </div>
        </div>
      );
    }

    case "contextProcessor": {
      return (
        <div className={boxStyle}>
          <div className="text-zinc-700 dark:text-zinc-400 text-[10px] leading-relaxed">
            Limpieza de variables de duda temporales completada con éxito. El estado temporal de dudas ha sido reestablecido para permitir que el arquitecto evalúe el contenido de la respuesta limpia de forma aislada.
          </div>
        </div>
      );
    }

    case "architect": {
      const nextStep = outAction?.nextStep;
      const followUp = outAction?.followUpPrompt;
      const attempts = (outAction?.transcript ?? []).filter((t: any) => t.role === "user" && t.type === "answer").length;
      return (
        <div className={boxStyle}>
          <div className="space-y-3">
            <div>
              <span className={labelStyle}>Evaluación de Suficiencia</span>
              <div className="flex items-center gap-2 mt-1">
                {nextStep === "stop" ? (
                  <span className="bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    ✓ Completa / Suficiente
                  </span>
                ) : nextStep === "ask_follow_up" ? (
                  <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    ⚠ Insuficiente / Repreguntar (Intento #{attempts})
                  </span>
                ) : (
                  <span className="text-zinc-600 dark:text-zinc-400 italic text-[10px] animate-pulse">Evaluando calidad de la respuesta...</span>
                )}
              </div>
            </div>

            {nextStep === "ask_follow_up" && followUp && (
              <div>
                <span className={labelStyle}>Pregunta de Profundización Generada</span>
                <div className="p-2.5 bg-amber-500/5 text-amber-600 dark:text-amber-500 border border-amber-500/20 rounded-md italic leading-relaxed select-all">
                  "{followUp}"
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    case "executeInternalAction": {
      const inst = inAction?.instruction;
      const result = outAction?.result;
      const outVar = inAction?.outputVar;
      return (
        <div className={boxStyle}>
          <div className="space-y-3">
            <div>
              <span className={labelStyle}>Instrucción Base de Consultoría</span>
              <div className="p-2 bg-zinc-400/10 dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 rounded-md font-mono text-[9px] max-h-[100px] overflow-y-auto whitespace-pre-wrap leading-tight text-zinc-800 dark:text-zinc-400 select-all">
                {inst}
              </div>
            </div>
            {outVar && (
              <div>
                <span className={labelStyle}>Variable a Escribir en Output</span>
                <code className="text-indigo-400 font-mono text-[9px] bg-indigo-500/10 px-1.5 py-0.5 rounded">{outVar}</code>
              </div>
            )}
            <div>
              <span className={labelStyle}>Resultado de Razonamiento Autónomo</span>
              {result ? (
                <pre className={preStyle}>{result}</pre>
              ) : (
                <div className="text-zinc-600 dark:text-zinc-400 italic text-[10px] animate-pulse">Llamando al razonador LLM...</div>
              )}
            </div>
          </div>
        </div>
      );
    }

    case "actionAnswerSummarizer": {
      const completeAnswer = outAction?.completeAnswer;
      const summary = outAction?.summary;
      return (
        <div className={boxStyle}>
          <div className="space-y-3">
            <div>
              <span className={labelStyle}>Respuesta Consolidada (Historial Completo)</span>
              <div className="p-2.5 bg-zinc-400/10 dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 rounded-md text-[10px] max-h-[100px] overflow-y-auto leading-relaxed select-all text-zinc-800 dark:text-zinc-400">
                {completeAnswer}
              </div>
            </div>
            <div>
              <span className={labelStyle}>Resumen Sintetizado para Memoria</span>
              {summary ? (
                <div className="p-2.5 bg-zinc-900 text-white border border-zinc-800 rounded-md leading-relaxed select-all italic">
                  "{summary}"
                </div>
              ) : (
                <div className="text-zinc-600 dark:text-zinc-400 italic text-[10px] animate-pulse">Sintetizando respuestas del diálogo...</div>
              )}
            </div>
          </div>
        </div>
      );
    }

    case "saveToOutput": {
      const task_id = inTask?.id;
      const action_id = inAction?.id;
      const outputKey = task_id && action_id ? `record:${task_id}:${action_id}` : "record:key";
      const outputVar = inAction?.outputVar;
      return (
        <div className={boxStyle}>
          <div className="space-y-2.5">
            <div>
              <span className={labelStyle}>Clave en output.json</span>
              <code className="text-emerald-500 dark:text-emerald-400 font-mono text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{outputKey}</code>
            </div>
            {outputVar && (
              <div>
                <span className={labelStyle}>Variable Escrita en variables.json</span>
                <div className="text-[10px] text-zinc-700 dark:text-zinc-400">
                  Clave: <code className="text-indigo-400 font-mono">{outputVar}</code>
                </div>
              </div>
            )}
            <div className="text-[9px] text-zinc-600 dark:text-zinc-400 leading-normal border-t border-zinc-400 dark:border-zinc-800 pt-2.5">
              Los cambios han sido volcados en el sistema de almacenamiento persistido en disco.
            </div>
          </div>
        </div>
      );
    }

    case "taskSummarizer": {
      const taskId = inTask?.id;
      const taskName = inTask?.name;
      const summary = outputs?.taskSummaries?.[taskId] || outputs?.outputJson?.[`${taskId}:summary`]?.summary;
      return (
        <div className={boxStyle}>
          <div className="space-y-2.5">
            <div>
              <span className={labelStyle}>Tarea Finalizada</span>
              <div className="font-bold text-zinc-900 dark:text-white text-xs">{taskName}</div>
            </div>
            <div>
              <span className={labelStyle}>Resumen Ejecutivo Generado (Medio Plazo)</span>
              {summary ? (
                <div className="p-2.5 bg-zinc-900 text-white border border-zinc-800 rounded-md leading-relaxed select-all">
                  {summary}
                </div>
              ) : (
                <div className="text-zinc-600 dark:text-zinc-400 italic text-[10px] animate-pulse">Sintetizando respuestas de la tarea...</div>
              )}
            </div>
          </div>
        </div>
      );
    }

    default: {
      return (
        <div className={boxStyle}>
          <span className="text-[10px] text-zinc-600 dark:text-zinc-400 italic">No se requiere visualización de negocio específica para el nodo "{node}". Cambia a la pestaña JSON para inspeccionar los datos técnicos de entrada/salida.</span>
        </div>
      );
    }
  }
};

export default function LocalVisualizer({ sessionId, isActive, darkMode = true }: LocalVisualizerProps) {
  const { t, tr } = useLanguage();
  const [trace, setTrace] = useState<SessionTrace | null>(null);
const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<"llm" | "inspector">("llm");
  const [isMounted, setIsMounted] = useState(false);
  const [showRawJsonMap, setShowRawJsonMap] = useState<Record<string, boolean>>({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const prevRunsLength = useRef(0);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Prevent Next.js hydration issues by rendering ReactFlow only on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Poll trace data
  useEffect(() => {
    let isMounted = true;
    let pollInterval: NodeJS.Timeout;

    const fetchTrace = async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}/trace`);
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data: SessionTrace = await res.json();
        if (isMounted) {
          setTrace(data);
          setLoading(false);
          // Auto-select latest step index if following execution in real-time
          if (data.nodeRuns && data.nodeRuns.length > prevRunsLength.current) {
            setSelectedStepIndex(data.nodeRuns.length - 1);
            prevRunsLength.current = data.nodeRuns.length;
          }
        }
      } catch (err) {
        console.error("Failed to load session trace", err);
      }
    };

    fetchTrace();
    if (isActive) {
      pollInterval = setInterval(fetchTrace, 1500);
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [sessionId, isActive]);

  // Sync selectedStepIndex with trace nodes length on new data
  useEffect(() => {
    if (!trace) return;
    const runsCount = trace.nodeRuns.length;
    if (runsCount === 0) return;

    if (selectedStepIndex === null || selectedStepIndex === prevRunsLength.current - 1) {
      setSelectedStepIndex(runsCount - 1);
    }
    prevRunsLength.current = runsCount;
  }, [trace, selectedStepIndex]);

    // Sync ReactFlow nodes and edges with trace data
  useEffect(() => {
    if (!trace) return;

    // Resolve visited and active states based on selectedStepIndex (Time Travel)
    const isTimelineMode = selectedStepIndex !== null && selectedStepIndex < trace.nodeRuns.length;
    const currentRun = isTimelineMode && selectedStepIndex !== null ? trace.nodeRuns[selectedStepIndex] : null;

    const visitedSet = currentRun && selectedStepIndex !== null
      ? new Set(trace.nodeRuns.slice(0, selectedStepIndex + 1).map(r => r.node))
      : new Set(trace.nodeHistory.map(h => h.node));

    const active = currentRun ? currentRun.node : trace.activeNode;

    // Calculate active runs up to currently selected step to count visits and predecessor
    const activeRuns = selectedStepIndex !== null
      ? trace.nodeRuns.slice(0, selectedStepIndex + 1)
      : trace.nodeRuns;

    const visitCounts: Record<string, number> = {};
    activeRuns.forEach(r => {
      visitCounts[r.node] = (visitCounts[r.node] || 0) + 1;
    });

    if (activeRuns.length === 0) {
      const historyList = selectedStepIndex !== null
        ? trace.nodeHistory.slice(0, selectedStepIndex + 1)
        : trace.nodeHistory;
      historyList.forEach(h => {
        visitCounts[h.node] = (visitCounts[h.node] || 0) + 1;
      });
    }

    // Determine the predecessor node (the node active just before the current one)
    let predecessorNode: string | null = null;
    if (activeRuns.length > 1) {
      predecessorNode = activeRuns[activeRuns.length - 2].node;
    } else if (activeRuns.length === 0 && trace.nodeHistory.length > 1) {
      const historyList = selectedStepIndex !== null
        ? trace.nodeHistory.slice(0, selectedStepIndex + 1)
        : trace.nodeHistory;
      if (historyList.length > 1) {
        predecessorNode = historyList[historyList.length - 2].node;
      }
    }

    // Build nodes list with explicit style objects to override default style sheet
    const formattedNodes = staticGraphNodes.map(n => {
      const isVisited = visitedSet.has(n.id);
      const isActiveNode = active === n.id;
      const isSelected = selectedNode === n.id;
      const visits = visitCounts[n.id] || 0;

      let background = "";
      let border = "";
      let color = "";

      if (isActiveNode) {
        // Active node (Azure Blue brand accent)
        background = darkMode ? COLOR_TOKENS.altus[950] : COLOR_TOKENS.altus[50];
        border = darkMode ? `2px solid ${COLOR_TOKENS.altus[400]}` : `2px solid ${COLOR_TOKENS.altus[500]}`;
        color = darkMode ? COLOR_TOKENS.neutral[50] : COLOR_TOKENS.neutral[950];
      } else if (n.id === predecessorNode) {
        // Predecessor node (Warm Amber transition)
        background = darkMode ? COLOR_TOKENS.accent[950] : COLOR_TOKENS.accent[50];
        border = darkMode ? `2px solid ${COLOR_TOKENS.accent[600]}` : `2px solid ${COLOR_TOKENS.accent[400]}`;
        color = darkMode ? COLOR_TOKENS.accent[300] : COLOR_TOKENS.accent[800];
      } else if (isVisited) {
        // Visited nodes (Pastel Emerald Green)
        background = darkMode ? COLOR_TOKENS.success[950] : COLOR_TOKENS.success[50];
        border = darkMode ? `1.5px solid ${COLOR_TOKENS.success[600]}` : `1.5px solid ${COLOR_TOKENS.success[500]}`;
        color = darkMode ? COLOR_TOKENS.success[200] : COLOR_TOKENS.success[800];
      } else {
        // Unvisited nodes (Crisp white card, slate-blue border, high-contrast dark text)
        background = darkMode ? COLOR_TOKENS.neutral[900] : "#ffffff";
        border = darkMode ? `1.5px solid ${COLOR_TOKENS.neutral[700]}` : `1.5px solid ${COLOR_TOKENS.neutral[300]}`;
        color = darkMode ? COLOR_TOKENS.neutral[100] : COLOR_TOKENS.neutral[950];
      }

      const nodeStyle = {
        background,
        border,
        color,
        padding: "8px 10px",
        borderRadius: "6px",
        textAlign: "center" as const,
        fontSize: "10px",
        fontWeight: (isActiveNode ? "bold" : "600") as any,
        boxShadow: isActiveNode
          ? `0 0 0 3px rgba(59, 161, 218, 0.3), 0 3px 10px rgba(59, 161, 218, 0.35)`
          : isSelected
            ? `0 0 0 2px ${COLOR_TOKENS.altus[500]}`
            : `0 2px 5px rgba(9, 20, 26, 0.08)`,
        opacity: 1,
        width: 140,
      };

      // Wrap label text and add a tiny custom bubble badge if it has been visited multiple times (e.g. cycles)
      const labelElement = (
        <span className="relative inline-block select-none font-semibold">
          {n.label}
          {visits > 1 && (
            <span
              style={{
                position: "absolute",
                top: "-10px",
                right: "-22px",
                padding: "1px 5px",
                borderRadius: "9999px",
                fontSize: "7.5px",
                fontWeight: "bold",
                lineHeight: "1",
                border: darkMode ? `1px solid ${COLOR_TOKENS.accent[800]}` : `1px solid ${COLOR_TOKENS.accent[200]}`,
                background: darkMode ? COLOR_TOKENS.accent[950] : COLOR_TOKENS.accent[100],
                color: darkMode ? COLOR_TOKENS.accent[300] : COLOR_TOKENS.accent[800],
              }}
              title={`Visitado ${visits} veces`}
            >
              x{visits}
            </span>
          )}
        </span>
      );

      return {
        id: n.id,
        type: n.type || "default",
        data: { label: labelElement },
        position: n.pos,
        style: nodeStyle,
      };
    });

    // Build edges list
    const formattedEdges = staticGraphEdges.map(e => {
      const isSourceVisited = visitedSet.has(e.source);
      const isTargetVisited = visitedSet.has(e.target);
      const isHighlighted = isSourceVisited && isTargetVisited;

      const isActiveTransition = predecessorNode === e.source && active === e.target;

      const labelStyle = darkMode
        ? { fill: COLOR_TOKENS.neutral[400], fontSize: 8, fontFamily: "monospace" }
        : { fill: COLOR_TOKENS.neutral[700], fontSize: 8, fontFamily: "monospace", fontWeight: "bold" };

      const labelBgStyle = darkMode
        ? { fill: COLOR_TOKENS.neutral[950], fillOpacity: 0.9 }
        : { fill: "#ffffff", fillOpacity: 0.95 };

      let strokeColor = "";
      if (isActiveTransition) {
        strokeColor = darkMode ? COLOR_TOKENS.accent[400] : COLOR_TOKENS.accent[600]; // Warm Amber
      } else if (isHighlighted) {
        strokeColor = darkMode ? COLOR_TOKENS.success[500] : COLOR_TOKENS.success[600]; // Emerald Green
      } else {
        strokeColor = darkMode ? COLOR_TOKENS.neutral[700] : COLOR_TOKENS.neutral[400]; // Slate Gray
      }

      const strokeWidth = isActiveTransition ? 2 : (isHighlighted ? 1.5 : 1);

      return {
        ...e,
        animated: isActiveTransition || (isHighlighted && active === e.target),
        style: {
          stroke: strokeColor,
          strokeWidth,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: strokeColor,
        },
        labelStyle,
        labelBgStyle,
        labelBgPadding: [3, 1] as [number, number],
        labelBgBorderRadius: 4,
      };
    });

    setNodes(formattedNodes);
    setEdges(formattedEdges);
  }, [trace, darkMode, selectedNode, selectedStepIndex, setNodes, setEdges]);

  if (loading || !trace) {
    return (
      <div className="p-6 rounded-2xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg flex flex-col justify-center items-center h-full min-h-[300px]">
        <Cpu className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{t.loadingCanvas}</h4>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{tr("Conectando al servidor del motor entrevistador.", "Connecting to interview engine server.")}</p>
      </div>
    );
  }

  // Handle clicking on nodes
  const handleNodeClick = (_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
    setBottomTab("inspector");
    setIsDrawerOpen(true);
  };

  const getActionStartIndices = () => {
    if (!trace || !trace.nodeRuns) return [];
    const indices: number[] = [];
    let lastActionId: string | undefined = undefined;

    trace.nodeRuns.forEach((run, index) => {
      const actionId = run.inputs?.currentAction?.id;
      if (actionId !== lastActionId || index === 0) {
        indices.push(index);
        lastActionId = actionId;
      }
    });
    return indices;
  };

  const handlePrevAction = () => {
    if (selectedStepIndex === null) return;
    const indices = getActionStartIndices();
    const prevIndex = [...indices].reverse().find(idx => idx < selectedStepIndex);
    if (prevIndex !== undefined) {
      setSelectedStepIndex(prevIndex);
    }
  };

  const handleNextAction = () => {
    if (selectedStepIndex === null) return;
    const indices = getActionStartIndices();
    const nextIndex = indices.find(idx => idx > selectedStepIndex);
    if (nextIndex !== undefined) {
      setSelectedStepIndex(nextIndex);
    }
  };

  const selectedNodeRuns = trace.nodeRuns && selectedStepIndex !== null
    ? trace.nodeRuns.slice(0, selectedStepIndex + 1).filter(r => r.node === selectedNode)
    : [];

  const isTimeTraveling = selectedStepIndex !== null && trace && selectedStepIndex < trace.nodeRuns.length - 1;
  const currentStepRun = trace && selectedStepIndex !== null ? trace.nodeRuns[selectedStepIndex] : null;

  return (
    <div className="w-full h-full relative flex overflow-hidden select-none">

      {/* 1. React Flow Canvas (Main Centered Area) */}
      <div className="flex-1 h-full relative bg-zinc-400/10 dark:bg-zinc-950">

        {/* Floating Badge (Top Left): Title */}
        <div className="absolute top-4 left-4 z-10 bg-white/95 dark:bg-zinc-900/95 border border-zinc-400 dark:border-zinc-800 px-3 py-1.5 rounded-xl shadow-md backdrop-blur-xs flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
          <span className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
            {tr("Ejecución de Motor de Educción", "Elicitation Engine Execution")}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
        </div>

        {/* Time Travel Warning Banner */}
        {isTimeTraveling && currentStepRun && (
          <button
            onClick={() => setSelectedStepIndex(trace.nodeRuns.length - 1)}
            className="absolute top-16 left-4 z-30 bg-amber-50/95 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-500/40 dark:border-amber-900/60 px-3.5 py-2 rounded-xl shadow-md backdrop-blur-md text-xs font-bold hover:text-amber-700 dark:hover:text-amber-200 underline decoration-dotted underline-offset-2 cursor-pointer transition-all active:scale-95"
            title={tr("Volver al paso de ejecución actual", "Return to current execution step")}
          >
            {tr("Volver al paso actual", "Return to current step")}
          </button>
        )}

        {/* Floating Toggle Drawer Button (Top Right) */}
        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="absolute top-4 right-4 z-40 bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 hover:bg-zinc-400/15 dark:hover:bg-zinc-800 text-zinc-800 dark:text-white px-3.5 py-2 rounded-xl shadow-md backdrop-blur-xs flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer"
        >
          {isDrawerOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          <span>{isDrawerOpen ? t.hideTraces : t.showTraces}</span>
        </button>

        {/* Canvas */}
        {isMounted ? (
          <ReactFlowProvider>
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              darkMode={darkMode}
              activeNode={currentStepRun ? currentStepRun.node : trace.activeNode}
            />
          </ReactFlowProvider>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400 animate-pulse">
            {tr("Iniciando canvas...", "Initializing canvas...")}
          </div>
        )}

        {/* Time Travel Timeline Bar (Bottom Center) */}
        {trace && trace.nodeRuns.length > 0 && selectedStepIndex !== null && (() => {
          const actionIndices = getActionStartIndices();
          const hasPrevAction = actionIndices.some(idx => idx < selectedStepIndex);
          const hasNextAction = actionIndices.some(idx => idx > selectedStepIndex);
          const taskName = currentStepRun?.inputs?.currentTask?.name
            ? `${tr("Tarea", "Task")}: ${currentStepRun.inputs.currentTask.name}`
            : `${t.nodeLabel} ${currentStepRun?.node}`;

          return (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-white/95 dark:bg-zinc-900/95 border border-zinc-400 dark:border-zinc-800 px-4 py-2 rounded-2xl shadow-xl backdrop-blur-xs flex items-center gap-3.5 text-xs">
              {/* First Step */}
              <button
                disabled={selectedStepIndex === 0}
                onClick={() => setSelectedStepIndex(0)}
                className="p-1 rounded-lg text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                title={t.firstStepTooltip}
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              {/* Prev Action */}
              <button
                disabled={!hasPrevAction}
                onClick={handlePrevAction}
                className="p-1 rounded-lg text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                title={tr("Acción Anterior", "Previous Action")}
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Prev Step */}
              <button
                disabled={selectedStepIndex === 0}
                onClick={() => setSelectedStepIndex(prev => prev !== null ? Math.max(0, prev - 1) : 0)}
                className="p-1 rounded-lg text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                title={t.prevStepTooltip}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Step indicator with hover details */}
              <div className="flex flex-col items-center min-w-[125px] select-none text-center">
                <div className="font-mono text-xs font-black text-zinc-900 dark:text-white">
                  {t.stepCounter(selectedStepIndex + 1, trace.nodeRuns.length)}
                </div>
                {currentStepRun && (
                  <div
                    title={taskName}
                    className="text-[10px] text-zinc-700 dark:text-zinc-400 font-mono font-semibold mt-0.5 truncate max-w-[150px] hover:max-w-[280px] transition-all duration-200 cursor-help"
                  >
                    {taskName}
                  </div>
                )}
              </div>

              {/* Next Step */}
              <button
                disabled={selectedStepIndex === trace.nodeRuns.length - 1}
                onClick={() => setSelectedStepIndex(prev => prev !== null ? Math.min(trace.nodeRuns.length - 1, prev + 1) : 0)}
                className="p-1 rounded-lg text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                title={t.nextStepTooltip}
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Next Action */}
              <button
                disabled={!hasNextAction}
                onClick={handleNextAction}
                className="p-1 rounded-lg text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                title={tr("Siguiente Acción", "Next Action")}
              >
                <ChevronsRight className="w-4 h-4" />
              </button>

              {/* Present / Last Step */}
              <button
                disabled={selectedStepIndex === trace.nodeRuns.length - 1}
                onClick={() => setSelectedStepIndex(trace.nodeRuns.length - 1)}
                className="p-1 rounded-lg text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                title={t.lastStepTooltip}
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })()}
      </div>

      {/* 2. Slide-out Inspector Drawer (Right Panel) */}
      <div
        className={`absolute top-0 right-0 h-full w-[380px] sm:w-[440px] bg-white/95 dark:bg-zinc-950/95 border-l border-zinc-400 dark:border-zinc-800 shadow-2xl z-50 transition-transform duration-300 ease-in-out flex flex-col ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="px-4 py-3.5 border-b border-zinc-400 dark:border-zinc-800 flex items-center justify-between bg-zinc-400/10 dark:bg-zinc-900/30">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-xs uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-indigo-500" />
            <span>{t.traceInspector}</span>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-400/20 dark:hover:bg-zinc-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs Selector */}
        <div className="flex border-b border-zinc-400 dark:border-zinc-800 bg-zinc-400/10 dark:bg-zinc-900/30 p-1 gap-1">
          <button
            onClick={() => setBottomTab("llm")}
            className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              bottomTab === "llm"
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs border border-zinc-400 dark:border-zinc-700"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
            }`}
          >
            Peticiones LLM ({trace.llmCalls.length})
          </button>
          <button
            onClick={() => setBottomTab("inspector")}
            className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              bottomTab === "inspector"
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs border border-zinc-400 dark:border-zinc-700"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
            }`}
          >
            Inspector {selectedNode ? `(${selectedNode})` : ""}
          </button>
        </div>

        {/* Scrollable Tabs Content */}
        <div className="p-4 flex-1 overflow-y-auto text-xs">

          {/* TAB: LLM CALLS LOG */}
          {bottomTab === "llm" && (
            <div className="space-y-3">
              {trace.llmCalls.length === 0 ? (
                <div className="text-zinc-600 dark:text-zinc-400 italic text-center py-8">
                  Ninguna llamada a LLM realizada por ahora en esta sesión.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {trace.llmCalls.map((call, index) => {
                    const isExpanded = expandedCallId === call.id;
                    const isPending = !call.response;

                    return (
                      <div
                        key={call.id}
                        className={`border rounded-lg transition-all ${
                          isPending
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-zinc-500 dark:hover:border-zinc-700"
                        }`}
                      >
                        <button
                          onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                          className="w-full text-left p-3 flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 truncate pr-4">
                            <div className={`p-1 rounded ${isPending ? 'bg-amber-500/20 text-amber-500' : 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'}`}>
                              <Cpu className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate">
                              <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                <span>LLM Call #{index + 1}</span>
                                {call.node && (
                                  <span className="bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider">
                                    {call.node}
                                  </span>
                                )}
                                <span className="text-[9px] font-mono opacity-50 font-normal">({call.model})</span>
                              </div>
                              <div className="text-[9px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2 mt-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{new Date(call.timestamp).toLocaleTimeString()}</span>
                                {call.durationMs && (
                                  <>
                                    <span>•</span>
                                    <span>Duración: {call.durationMs}ms</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500 dark:text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-zinc-400 dark:border-zinc-800 p-3.5 space-y-3">
                            <div className="space-y-1">
                              <div className="font-bold text-zinc-600 dark:text-zinc-400 uppercase text-[9px]">Petición (Prompt)</div>
                              <div className="p-2.5 bg-zinc-400/10 dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 rounded-md max-h-[180px] overflow-y-auto font-mono text-[9px] whitespace-pre-wrap select-all">
                                {call.prompts.join("\n\n---\n\n")}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="font-bold text-zinc-600 dark:text-zinc-400 uppercase text-[9px]">Respuesta</div>
                              {isPending ? (
                                <div className="p-3 border border-dashed border-amber-500/20 rounded-md text-center text-zinc-600 dark:text-zinc-400 italic text-[10px] animate-pulse">
                                  Procesando respuesta en servidor local...
                                </div>
                              ) : (
                                <div className="p-2.5 bg-zinc-900 text-white border border-zinc-800 rounded-md max-h-[220px] overflow-y-auto font-mono text-[9px] whitespace-pre-wrap select-all">
                                  {call.response}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: NODE INSPECTOR */}
          {bottomTab === "inspector" && (
            <div className="space-y-4">
              {!selectedNode ? (
                // Timeline travel details if no node selected
                currentStepRun ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-400 dark:border-zinc-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-indigo-500 animate-pulse" />
                        <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[10px]">
                          {t.activeStepLabel} {currentStepRun.node}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const id = currentStepRun.runId;
                            setShowRawJsonMap(prev => ({ ...prev, [id]: !prev[id] }));
                          }}
                          className="text-indigo-500 text-[9px] hover:text-indigo-400 font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 cursor-pointer border border-indigo-500/20 transition-all"
                        >
                          {showRawJsonMap[currentStepRun.runId] ? tr("Ver Resumen", "View Summary") : t.viewJson}
                        </button>
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-600 dark:text-zinc-400 flex items-center justify-between font-mono bg-zinc-400/10 dark:bg-zinc-900/30 p-2 rounded-lg border border-zinc-400 dark:border-zinc-800">
                      <span>{new Date(currentStepRun.timestamp).toLocaleTimeString()}</span>
                      {currentStepRun.durationMs && <span>{tr("Duración", "Duration")}: {currentStepRun.durationMs}ms</span>}
                    </div>

                    <div className="mt-3">
                      {showRawJsonMap[currentStepRun.runId] ? (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className="font-bold text-zinc-600 dark:text-zinc-400 uppercase text-[9px]">Inputs</div>
                            <pre className="p-2 bg-zinc-400/10 dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 rounded-md max-h-[160px] overflow-auto font-mono text-[9px] leading-tight">
                              {JSON.stringify(currentStepRun.inputs, null, 2)}
                            </pre>
                          </div>
                          <div className="space-y-1">
                            <div className="font-bold text-zinc-600 dark:text-zinc-400 uppercase text-[9px]">Outputs</div>
                            {currentStepRun.outputs ? (
                              <pre className="p-2 bg-zinc-900 text-white border border-zinc-800 rounded-md max-h-[160px] overflow-auto font-mono text-[9px] leading-tight">
                                {JSON.stringify(currentStepRun.outputs, null, 2)}
                              </pre>
                            ) : (
                              <div className="p-2 border border-dashed border-zinc-400 dark:border-zinc-800 rounded-md text-zinc-600 dark:text-zinc-400 italic text-[10px]">
                                {tr("Ejecución en curso o interrumpida...", "Execution in progress or interrupted...")}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        renderNodeInspectorCard(currentStepRun, darkMode)
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-zinc-600 dark:text-zinc-400 italic text-center py-10 flex flex-col items-center justify-center gap-2">
                    <Cpu className="w-8 h-8 text-zinc-500" />
                    <span>{tr("Ningún nodo seleccionado. Haz click en cualquier nodo del grafo interactivo superior para inspeccionar sus inputs y outputs.", "No node selected. Click any node in the interactive graph above to inspect its inputs and outputs.")}</span>
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-400 dark:border-zinc-800 pb-2">
                    <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-indigo-500" />
                      {t.nodeLabel} {selectedNode}
                      <button
                        onClick={() => setSelectedNode(null)}
                        className="text-[9px] bg-zinc-400/20 dark:bg-zinc-800 hover:bg-zinc-400/30 text-zinc-700 dark:text-zinc-400 px-1.5 py-0.5 rounded cursor-pointer transition-all font-bold ml-1.5"
                      >
                        {tr("Limpiar", "Clear")}
                      </button>
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                      {tr("Ejecuciones", "Runs")}: {selectedNodeRuns.length}
                    </span>
                  </div>

                  {selectedNodeRuns.length === 0 ? (
                    <div className="text-zinc-600 dark:text-zinc-400 italic py-6 text-center">
                      Este nodo aún no se ha ejecutado en el historial seleccionado.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {selectedNodeRuns.map((run, idx) => {
                        const isRaw = !!showRawJsonMap[run.runId];
                        return (
                          <div key={run.runId} className="border border-zinc-400 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900/40">
                            {/* Run header */}
                            <div className="bg-zinc-400/15 dark:bg-zinc-900/60 px-3 py-2 border-b border-zinc-400 dark:border-zinc-800 flex items-center justify-between text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                              <span className="font-bold text-zinc-900 dark:text-white">Ejecución #{idx + 1}</span>
                              <div className="flex items-center gap-3 text-[9px]">
                                <span>{new Date(run.timestamp).toLocaleTimeString()}</span>
                                {run.durationMs && <span>• {run.durationMs}ms</span>}
                                <button
                                  onClick={() => setShowRawJsonMap(prev => ({ ...prev, [run.runId]: !isRaw }))}
                                  className="text-indigo-500 hover:text-indigo-400 font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 cursor-pointer transition-all border border-indigo-500/20"
                                >
                                  {isRaw ? "Ver Resumen" : "Ver JSON"}
                                </button>
                              </div>
                            </div>

                            {/* Run details */}
                            <div className="p-3">
                              {isRaw ? (
                                <div className="space-y-3">
                                  {/* Node inputs */}
                                  <div className="space-y-1">
                                    <div className="font-bold text-zinc-600 dark:text-zinc-400 uppercase text-[9px]">Estado de Entrada (Inputs)</div>
                                    <pre className="p-2 bg-zinc-400/10 dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 rounded-md max-h-[140px] overflow-auto font-mono text-[9px] text-zinc-900 dark:text-white leading-tight">
                                      {JSON.stringify(run.inputs, null, 2)}
                                    </pre>
                                  </div>

                                  {/* Node outputs */}
                                  <div className="space-y-1">
                                    <div className="font-bold text-zinc-600 dark:text-zinc-400 uppercase text-[9px]">Modificaciones de Estado (Outputs / Actualizaciones)</div>
                                    {run.outputs ? (
                                      <pre className="p-2 bg-zinc-900 text-white border border-zinc-800 rounded-md max-h-[140px] overflow-auto font-mono text-[9px] leading-tight">
                                        {JSON.stringify(run.outputs, null, 2)}
                                      </pre>
                                    ) : (
                                      <div className="p-2 border border-dashed border-zinc-400 dark:border-zinc-800 rounded-md text-zinc-600 dark:text-zinc-400 italic text-[10px]">
                                        Ejecución en curso o interrumpida...
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                renderNodeInspectorCard(run, darkMode)
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
