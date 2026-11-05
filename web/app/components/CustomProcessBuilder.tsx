"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Code, FileText, Check, AlertTriangle, HelpCircle, Sliders } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface SchemaField {
  name: string;
  type: "string" | "integer" | "boolean" | "array";
  description: string;
  required: boolean;
}

interface CustomProcessBuilderProps {
  onSave: (processData: any) => void;
  initialData?: any;
}

export default function CustomProcessBuilder({ onSave, initialData }: CustomProcessBuilderProps) {
  const { t, tr } = useLanguage();
  const [activeTab, setActiveTab] = useState<"form" | "advanced" | "json">("form");
  const [jsonText, setJsonText] = useState("");
  const [isValidJson, setIsValidJson] = useState(true);
  const [jsonError, setJsonError] = useState("");

  const [actionSchemaText, setActionSchemaText] = useState("");
  const [taskSchemaText, setTaskSchemaText] = useState("");
  const [isValidActionSchema, setIsValidActionSchema] = useState(true);
  const [isValidTaskSchema, setIsValidTaskSchema] = useState(true);

  const [actionSchemaMode, setActionSchemaMode] = useState<"visual" | "json">("visual");
  const [taskSchemaMode, setTaskSchemaMode] = useState<"visual" | "json">("visual");
  const [actionFields, setActionFields] = useState<SchemaField[]>([]);
  const [taskFields, setTaskFields] = useState<SchemaField[]>([]);

  // Default empty process template
  const defaultProcess = {
    processName: "Proceso Personalizado",
    allowFollowUps: true,
    allowDoubtConfirmation: true,
    allowKnowledgeConsultation: true,
    generateTaskSummaries: true,
    saveTaskSummariesToOutput: true,
    systemPrompt: "Eres un consultor de tecnología senior. Ayuda a la empresa a estructurar sus necesidades.",
    tasks: [
      {
        id: "TASK_1",
        name: "Identificación de Necesidades",
        description: "Preguntas básicas sobre el negocio",
        actions: [
          {
            id: "ACTION_1",
            type: "question",
            content: "¿Cuáles son las principales prioridades de digitalización en tu negocio hoy?",
            outputVar: "prioridades_negocio"
          }
        ]
      }
    ]
  };

  const [formState, setFormState] = useState<any>(initialData || defaultProcess);

  // Helper: Build JSON Schema from visual fields list
  const buildSchemaFromFields = (fields: SchemaField[]) => {
    if (fields.length === 0) return undefined;
    
    const properties: Record<string, any> = {};
    const required: string[] = [];
    
    for (const field of fields) {
      if (!field.name.trim()) continue;
      
      let typeConfig: any = { type: field.type };
      if (field.type === "integer") {
        if (field.name.toLowerCase().includes("qualification") || field.name.toLowerCase().includes("calificacion")) {
          typeConfig.minimum = 0;
          typeConfig.maximum = 5;
        }
      } else if (field.type === "array") {
        typeConfig.items = { type: "string" };
      }
      
      if (field.description.trim()) {
        typeConfig.description = field.description;
      }
      
      properties[field.name.trim()] = typeConfig;
      if (field.required) {
        required.push(field.name.trim());
      }
    }
    
    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
      additionalProperties: false
    };
  };

  // Helper: Parse visual fields list from JSON Schema
  const parseFieldsFromSchema = (schema: any): SchemaField[] => {
    if (!schema || schema.type !== "object" || !schema.properties) return [];
    
    const fields: SchemaField[] = [];
    const requiredList = schema.required || [];
    
    for (const [name, prop] of Object.entries(schema.properties)) {
      const propConfig = prop as any;
      let type: any = propConfig.type || "string";
      if (type !== "string" && type !== "integer" && type !== "boolean" && type !== "array") {
        type = "string";
      }
      fields.push({
        name,
        type,
        description: propConfig.description || "",
        required: requiredList.includes(name)
      });
    }
    
    return fields;
  };

  // Sync formState -> local visual fields (on load, preset, or json tab edit)
  useEffect(() => {
    const actSchema = formState.hooks?.afterActionAnswer?.outputSchema;
    const parsedActFields = parseFieldsFromSchema(actSchema);
    const nonActionFields = actionFields.filter((f: SchemaField) => f.name.trim() !== "");
    if (JSON.stringify(parsedActFields) !== JSON.stringify(nonActionFields)) {
      setActionFields(parsedActFields);
    }

    const tskSchema = formState.hooks?.afterTask?.outputSchema;
    const parsedTskFields = parseFieldsFromSchema(tskSchema);
    const nonTaskFields = taskFields.filter((f: SchemaField) => f.name.trim() !== "");
    if (JSON.stringify(parsedTskFields) !== JSON.stringify(nonTaskFields)) {
      setTaskFields(parsedTskFields);
    }
  }, [formState]);

  // Helpers to update visual schema fields
  const updateActionFields = (newFields: SchemaField[]) => {
    setActionFields(newFields);
    const schema = buildSchemaFromFields(newFields);
    setFormState((prev: any) => {
      const prevHooks = prev.hooks || {};
      const prevHook = prevHooks.afterActionAnswer || {};
      const updatedHook = { ...prevHook };
      if (schema) {
        updatedHook.outputSchema = schema;
      } else {
        delete updatedHook.outputSchema;
      }
      return {
        ...prev,
        hooks: { ...prevHooks, afterActionAnswer: updatedHook }
      };
    });
  };

  const updateTaskFields = (newFields: SchemaField[]) => {
    setTaskFields(newFields);
    const schema = buildSchemaFromFields(newFields);
    setFormState((prev: any) => {
      const prevHooks = prev.hooks || {};
      const prevHook = prevHooks.afterTask || {};
      const updatedHook = { ...prevHook };
      if (schema) {
        updatedHook.outputSchema = schema;
      } else {
        delete updatedHook.outputSchema;
      }
      return {
        ...prev,
        hooks: { ...prevHooks, afterTask: updatedHook }
      };
    });
  };

  // Sync FormState -> JSON Text on form changes
  useEffect(() => {
    if (activeTab === "form" || activeTab === "advanced") {
      setJsonText(JSON.stringify(formState, null, 2));
      setIsValidJson(true);
      setJsonError("");
    }
  }, [formState, activeTab]);

  // Sync FormState -> Local Schema texts (when they change from outside, like preset or json tab)
  useEffect(() => {
    const actSchema = formState.hooks?.afterActionAnswer?.outputSchema;
    if (actSchema) {
      try {
        const currentParsed = actionSchemaText ? JSON.parse(actionSchemaText) : null;
        if (JSON.stringify(currentParsed) !== JSON.stringify(actSchema)) {
          setActionSchemaText(JSON.stringify(actSchema, null, 2));
          setIsValidActionSchema(true);
        }
      } catch (e) {
        setActionSchemaText(JSON.stringify(actSchema, null, 2));
        setIsValidActionSchema(true);
      }
    } else {
      setActionSchemaText("");
      setIsValidActionSchema(true);
    }

    const tskSchema = formState.hooks?.afterTask?.outputSchema;
    if (tskSchema) {
      try {
        const currentParsed = taskSchemaText ? JSON.parse(taskSchemaText) : null;
        if (JSON.stringify(currentParsed) !== JSON.stringify(tskSchema)) {
          setTaskSchemaText(JSON.stringify(tskSchema, null, 2));
          setIsValidTaskSchema(true);
        }
      } catch (e) {
        setTaskSchemaText(JSON.stringify(tskSchema, null, 2));
        setIsValidTaskSchema(true);
      }
    } else {
      setTaskSchemaText("");
      setIsValidTaskSchema(true);
    }
  }, [formState]);

  // Handlers for schema text changes
  const handleActionSchemaChange = (val: string) => {
    setActionSchemaText(val);
    if (!val.trim()) {
      setIsValidActionSchema(true);
      setFormState((prev: any) => {
        const prevHooks = prev.hooks || {};
        const prevHook = prevHooks.afterActionAnswer || {};
        const updatedHook = { ...prevHook };
        delete updatedHook.outputSchema;
        return {
          ...prev,
          hooks: {
            ...prevHooks,
            afterActionAnswer: updatedHook
          }
        };
      });
      return;
    }

    try {
      const parsed = JSON.parse(val);
      setIsValidActionSchema(true);
      setFormState((prev: any) => {
        const prevHooks = prev.hooks || {};
        const prevHook = prevHooks.afterActionAnswer || {};
        return {
          ...prev,
          hooks: {
            ...prevHooks,
            afterActionAnswer: {
              ...prevHook,
              outputSchema: parsed
            }
          }
        };
      });
    } catch (e) {
      setIsValidActionSchema(false);
    }
  };

  const handleTaskSchemaChange = (val: string) => {
    setTaskSchemaText(val);
    if (!val.trim()) {
      setIsValidTaskSchema(true);
      setFormState((prev: any) => {
        const prevHooks = prev.hooks || {};
        const prevHook = prevHooks.afterTask || {};
        const updatedHook = { ...prevHook };
        delete updatedHook.outputSchema;
        return {
          ...prev,
          hooks: {
            ...prevHooks,
            afterTask: updatedHook
          }
        };
      });
      return;
    }

    try {
      const parsed = JSON.parse(val);
      setIsValidTaskSchema(true);
      setFormState((prev: any) => {
        const prevHooks = prev.hooks || {};
        const prevHook = prevHooks.afterTask || {};
        return {
          ...prev,
          hooks: {
            ...prevHooks,
            afterTask: {
              ...prevHook,
              outputSchema: parsed
            }
          }
        };
      });
    } catch (e) {
      setIsValidTaskSchema(false);
    }
  };

  // Sync JSON Text -> FormState on JSON changes
  const handleJsonChange = (val: string) => {
    setJsonText(val);
    try {
      const parsed = JSON.parse(val);
      setIsValidJson(true);
      setJsonError("");
      setFormState(parsed);
    } catch (e: any) {
      setIsValidJson(false);
      setJsonError(e.message);
    }
  };

  // Trigger Save
  const handleStart = () => {
    if (isValidJson) {
      onSave(formState);
    }
  };

  // Helper: Update Profile Option
  const updateProfile = (key: string, value: any) => {
    setFormState((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Helper: Update Hook Option
  const updateHook = (hookType: "afterActionAnswer" | "afterTask", key: string, value: any) => {
    setFormState((prev: any) => {
      const prevHooks = prev.hooks || {};
      const prevHook = prevHooks[hookType] || {};
      return {
        ...prev,
        hooks: {
          ...prevHooks,
          [hookType]: {
            ...prevHook,
            [key]: value,
          }
        }
      };
    });
  };

  // Helper: Update Hook Schema JSON
  const updateHookJson = (hookType: "afterActionAnswer" | "afterTask", key: string, value: string) => {
    setFormState((prev: any) => {
      const prevHooks = prev.hooks || {};
      const prevHook = prevHooks[hookType] || {};
      let parsedValue: any = value;
      try {
        parsedValue = JSON.parse(value);
      } catch (e) {
        // Keep string if it's currently invalid JSON during typing
      }
      return {
        ...prev,
        hooks: {
          ...prevHooks,
          [hookType]: {
            ...prevHook,
            [key]: parsedValue,
          }
        }
      };
    });
  };

  // Helper: Add KnowledgeBase Document
  const addDoc = () => {
    setFormState((prev: any) => {
      const kb = prev.knowledgeBase || [];
      return {
        ...prev,
        knowledgeBase: [...kb, { name: "", path: "" }]
      };
    });
  };

  // Helper: Update KnowledgeBase Document
  const updateDoc = (idx: number, key: string, value: string) => {
    setFormState((prev: any) => {
      const kb = [...(prev.knowledgeBase || [])];
      kb[idx] = { ...kb[idx], [key]: value };
      return { ...prev, knowledgeBase: kb };
    });
  };

  // Helper: Remove KnowledgeBase Document
  const removeDoc = (idx: number) => {
    setFormState((prev: any) => {
      const kb = (prev.knowledgeBase || []).filter((_: any, i: number) => i !== idx);
      return { ...prev, knowledgeBase: kb };
    });
  };

  // Helper: Apply Preset Schema for hooks
  const applyPresetSchema = (hookType: "afterActionAnswer" | "afterTask", presetType: "qualification" | "boolean" | "summary") => {
    let schema: any = {};
    if (presetType === "qualification") {
      schema = {
        type: "object",
        properties: {
          qualification: {
            type: "integer",
            minimum: 0,
            maximum: 5,
            description: "Puntuación de madurez (0 a 5)"
          },
          qualification_reasoning: {
            type: "string",
            description: "Justificación detallada de la puntuación"
          }
        },
        required: ["qualification", "qualification_reasoning"],
        additionalProperties: false
      };
    } else if (presetType === "boolean") {
      schema = {
        type: "object",
        properties: {
          approved: {
            type: "boolean",
            description: "Indica si cumple con los criterios mínimos"
          },
          reasoning: {
            type: "string",
            description: "Justificación del resultado de la validación"
          }
        },
        required: ["approved", "reasoning"],
        additionalProperties: false
      };
    } else if (presetType === "summary") {
      schema = {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "Síntesis redactada de las respuestas"
          },
          key_points: {
            type: "array",
            items: { type: "string" },
            description: "Puntos clave identificados"
          }
        },
        required: ["summary", "key_points"],
        additionalProperties: false
      };
    }

    // Set the output schema directly
    setFormState((prev: any) => {
      const prevHooks = prev.hooks || {};
      const prevHook = prevHooks[hookType] || {};
      return {
        ...prev,
        hooks: {
          ...prevHooks,
          [hookType]: {
            ...prevHook,
            outputSchema: schema
          }
        }
      };
    });
  };

  // Helper: Update Task Fields
  const updateTask = (taskIdx: number, key: string, value: any) => {
    setFormState((prev: any) => {
      const updatedTasks = [...prev.tasks];
      updatedTasks[taskIdx] = {
        ...updatedTasks[taskIdx],
        [key]: value,
      };
      return { ...prev, tasks: updatedTasks };
    });
  };

  // Helper: Add Task
  const addTask = () => {
    setFormState((prev: any) => {
      const newTask = {
        id: `TASK_${prev.tasks.length + 1}`,
        name: `Nueva Tarea ${prev.tasks.length + 1}`,
        description: "Descripción de la tarea",
        actions: [
          {
            id: `ACTION_T${prev.tasks.length + 1}_1`,
            type: "question",
            content: "Pregunta del consultor",
            outputVar: "variable_salida"
          }
        ]
      };
      return { ...prev, tasks: [...prev.tasks, newTask] };
    });
  };

  // Helper: Remove Task
  const removeTask = (taskIdx: number) => {
    setFormState((prev: any) => {
      const updatedTasks = prev.tasks.filter((_: any, idx: number) => idx !== taskIdx);
      return { ...prev, tasks: updatedTasks };
    });
  };

  // Helper: Add Action to Task
  const addAction = (taskIdx: number) => {
    setFormState((prev: any) => {
      const updatedTasks = [...prev.tasks];
      const targetTask = updatedTasks[taskIdx];
      const newAction = {
        id: `ACTION_T${taskIdx + 1}_${targetTask.actions.length + 1}`,
        type: "question",
        content: "Nueva pregunta o instrucción",
        outputVar: `var_salida_${targetTask.actions.length + 1}`
      };
      updatedTasks[taskIdx] = {
        ...targetTask,
        actions: [...targetTask.actions, newAction],
      };
      return { ...prev, tasks: updatedTasks };
    });
  };

  // Helper: Update Action Fields
  const updateAction = (taskIdx: number, actionIdx: number, key: string, value: any) => {
    setFormState((prev: any) => {
      const updatedTasks = [...prev.tasks];
      const targetTask = updatedTasks[taskIdx];
      const updatedActions = [...targetTask.actions];
      
      updatedActions[actionIdx] = {
        ...updatedActions[actionIdx],
        [key]: value,
      };
      
      updatedTasks[taskIdx] = {
        ...targetTask,
        actions: updatedActions,
      };
      
      return { ...prev, tasks: updatedTasks };
    });
  };

  // Helper: Remove Action from Task
  const removeAction = (taskIdx: number, actionIdx: number) => {
    setFormState((prev: any) => {
      const updatedTasks = [...prev.tasks];
      const targetTask = updatedTasks[taskIdx];
      const updatedActions = targetTask.actions.filter((_: any, idx: number) => idx !== actionIdx);
      
      updatedTasks[taskIdx] = {
        ...targetTask,
        actions: updatedActions,
      };
      
      return { ...prev, tasks: updatedTasks };
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-[500px] border border-zinc-400 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 shadow-xl overflow-hidden">
      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-zinc-400 dark:border-zinc-800 bg-zinc-400/10 dark:bg-zinc-900/30 px-6 py-4">
        <div>
          <h3 className="font-bold text-zinc-950 dark:text-white text-base">{tr("Creador de Proceso Personalizado", "Custom Process Builder")}</h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">{tr("Diseña las tareas, preguntas e instrucciones de la entrevista.", "Design interview tasks, questions and instructions.")}</p>
        </div>
        <div className="flex bg-zinc-400/15 dark:bg-zinc-800 p-1 rounded-lg border border-zinc-400 dark:border-zinc-700">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "form"
                ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-xs border border-zinc-400 dark:border-zinc-700"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            {tr("Formulario", "Form")}
          </button>
          <button
            onClick={() => setActiveTab("advanced")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "advanced"
                ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-xs border border-zinc-400 dark:border-zinc-700"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            {tr("Ajustes Avanzados", "Advanced Settings")}
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "json"
                ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-xs border border-zinc-400 dark:border-zinc-700"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            {tr("JSON Crudo", "Raw JSON")}
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 p-6 overflow-y-auto max-h-[500px]">
        {activeTab === "form" && (
          <div className="space-y-6">
            {/* Profile Config */}
            <div className="p-4 rounded-xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-400">Configuración General</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-white cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600 pb-0.5 inline-block peer">
                    Nombre del Proceso
                  </label>
                  <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                    Nombre de la evaluación. Se utiliza como identificador en la secuencia y como prefijo para los ficheros JSON de salida.
                  </span>
                  <input
                    type="text"
                    value={formState.processName || ""}
                    onChange={(e) => updateProfile("processName", e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-indigo-600"
                  />
                </div>
                <div className="space-y-1.5 col-span-1 md:col-span-2 relative">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-white cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600 pb-0.5 inline-block peer">
                    System Prompt del Agente
                  </label>
                  <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                    Instrucciones de comportamiento que guiarán la personalidad y el enfoque del agente de IA durante toda la entrevista.
                  </span>
                  <textarea
                    rows={2}
                    value={formState.systemPrompt || ""}
                    onChange={(e) => updateProfile("systemPrompt", e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-indigo-600"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-zinc-400 dark:border-zinc-800">
                <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-400 cursor-pointer relative">
                  <input
                    type="checkbox"
                    checked={formState.allowFollowUps !== false}
                    onChange={(e) => updateProfile("allowFollowUps", e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600 pb-0.5 peer">
                    Habilitar Repreguntas
                  </span>
                  <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                    Si está activado, el agente evaluará la suficiencia de cada respuesta y podrá realizar repreguntas de seguimiento para profundizar en los detalles.
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-400 cursor-pointer relative">
                  <input
                    type="checkbox"
                    checked={formState.allowDoubtConfirmation !== false}
                    onChange={(e) => updateProfile("allowDoubtConfirmation", e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600 pb-0.5 peer">
                    Confirmar Dudas
                  </span>
                  <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                    Permite al agente detectar si el usuario plantea alguna pregunta o duda, y responder a ella antes de volver a formular la pregunta original.
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-400 cursor-pointer relative">
                  <input
                    type="checkbox"
                    checked={formState.allowKnowledgeConsultation !== false}
                    onChange={(e) => updateProfile("allowKnowledgeConsultation", e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600 pb-0.5 peer">
                    Base de Conocimiento
                  </span>
                  <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                    Habilita la consulta automática a documentos y guías metodológicas de referencia cargadas en el sistema para responder dudas con mayor precisión.
                  </span>
                </label>
              </div>
            </div>

            {/* Tasks Config */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-400">Tareas de Evaluación ({formState.tasks?.length || 0})</h4>
                <button
                  onClick={addTask}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40 rounded-lg px-2.5 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Añadir Tarea
                </button>
              </div>

              {formState.tasks?.map((task: any, taskIdx: number) => (
                <div 
                  key={taskIdx} 
                  className="p-4 rounded-xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4 relative group"
                >
                  <button
                    onClick={() => removeTask(taskIdx)}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar Tarea"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1 relative">
                      <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600 pb-0.5 inline-block peer">
                        ID de Tarea
                      </label>
                      <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                        Identificador único de la tarea (ej. 'TASK_1'). Sirve para ordenar y encadenar las tareas en el flujo lógico.
                      </span>
                      <input
                        type="text"
                        value={task.id || ""}
                        onChange={(e) => updateTask(taskIdx, "id", e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2 relative">
                      <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600 pb-0.5 inline-block peer">
                        Nombre de la Tarea
                      </label>
                      <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                        Nombre descriptivo de esta fase de la evaluación (ej. 'Identificación de Necesidades').
                      </span>
                      <input
                        type="text"
                        value={task.name || ""}
                        onChange={(e) => updateTask(taskIdx, "name", e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Actions mapping */}
                  <div className="space-y-3 pl-3 border-l-2 border-zinc-400 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Acciones del Consultor ({task.actions?.length || 0})</div>
                      <button
                        onClick={() => addAction(taskIdx)}
                        className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" /> Añadir Acción
                      </button>
                    </div>

                    {task.actions?.map((action: any, actionIdx: number) => (
                      <div 
                        key={actionIdx} 
                        className="p-3 rounded-lg border border-zinc-400 dark:border-zinc-800 bg-zinc-400/10 dark:bg-zinc-950 relative group/action space-y-2.5"
                      >
                        <button
                          onClick={() => removeAction(taskIdx, actionIdx)}
                          className="absolute top-2 right-2 text-zinc-400 hover:text-rose-500 opacity-0 group-hover/action:opacity-100 transition-opacity"
                          title="Eliminar Acción"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1 relative">
                            <label className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400 cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-700 pb-0.5 inline-block peer">Tipo de Acción</label>
                            <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                              Define el comportamiento:<br/>- Pregunta Chatbot: Pide respuesta al usuario.<br/>- Razonamiento Interno: Evalúa la información en privado.<br/>- Bucle Dinámico: Validación recurrente.
                            </span>
                            <select
                              value={action.type || "question"}
                              onChange={(e) => updateAction(taskIdx, actionIdx, "type", e.target.value)}
                              className="w-full text-[11px] p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 text-zinc-900 dark:text-white"
                            >
                              <option value="question">Pregunta Chatbot</option>
                              <option value="internal">Razonamiento Interno</option>
                              <option value="loop_validation">Bucle Dinámico</option>
                            </select>
                          </div>
                          <div className="space-y-1 relative">
                            <label className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400 cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-700 pb-0.5 inline-block peer">ID Acción</label>
                            <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                              Identificador interno único para esta acción de la tarea (ej. 'ACTION_1').
                            </span>
                            <input
                              type="text"
                              value={action.id || ""}
                              onChange={(e) => updateAction(taskIdx, actionIdx, "id", e.target.value)}
                              className="w-full text-[11px] p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 text-zinc-900 dark:text-white"
                            />
                          </div>
                          <div className="space-y-1 relative">
                            <label className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400 cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-700 pb-0.5 inline-block peer">Variable Salida Zod</label>
                            <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                              Clave donde se guardará el resultado estructurado de esta acción en el JSON de resultados final (ej. 'mis_necesidades').
                            </span>
                            <input
                              type="text"
                              value={action.outputVar || ""}
                              onChange={(e) => updateAction(taskIdx, actionIdx, "outputVar", e.target.value)}
                              className="w-full text-[11px] p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 text-zinc-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-1 relative">
                          <label className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400 cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-700 pb-0.5 inline-block peer">Contenido o Pregunta Formulada</label>
                          <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                            Pregunta que el chatbot enviará al usuario, o consigna base para las directrices de razonamiento interno del modelo.
                          </span>
                          <textarea
                            rows={1}
                            value={action.content || ""}
                            onChange={(e) => updateAction(taskIdx, actionIdx, "content", e.target.value)}
                            className="w-full text-[11px] p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 text-zinc-900 dark:text-white"
                          />
                        </div>

                        {action.type === "internal" && (
                          <div className="space-y-1 relative">
                            <label className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400 cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-700 pb-0.5 inline-block peer">Instrucciones de Razonamiento del LLM</label>
                            <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                              Pautas metodológicas privadas (rúbricas de calificación, fórmulas, criterios) que el LLM debe ejecutar antes de estructurar el resultado.
                            </span>
                            <textarea
                              rows={2}
                              value={action.instruction || ""}
                              onChange={(e) => updateAction(taskIdx, actionIdx, "instruction", e.target.value)}
                              className="w-full text-[11px] p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "advanced" && (
          <div className="space-y-6">
            {/* Advanced Settings */}
            <div className="p-4 rounded-xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-400">Ajustes Avanzados del Motor</h4>

              {/* answerSufficiencyPrompt */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-semibold text-zinc-800 dark:text-white cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600 pb-0.5 inline-block peer">
                  Instrucciones de Suficiencia de Respuesta (answerSufficiencyPrompt)
                </label>
                <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-full max-w-[500px] z-50 leading-normal font-normal">
                  Define el criterio personalizado que utilizará el LLM para decidir si la respuesta del usuario contiene suficiente detalle antes de avanzar a la siguiente pregunta.
                </span>
                <textarea
                  rows={3}
                  value={formState.answerSufficiencyPrompt || ""}
                  onChange={(e) => updateProfile("answerSufficiencyPrompt", e.target.value)}
                  placeholder="e.g. Asegúrate de que el usuario proporciona ejemplos específicos de herramientas digitales..."
                  className="w-full text-xs p-2.5 rounded-lg border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-indigo-600 font-sans"
                />
              </div>

              {/* Hook afterActionAnswer */}
              <div className="border-t border-zinc-400 dark:border-zinc-800 pt-4 space-y-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-400">Hook Post-Respuesta (afterActionAnswer)</h5>
                <p className="text-[10px] text-zinc-600 dark:text-zinc-400">Ejecuta un razonamiento privado del LLM inmediatamente después de que el usuario responda a una pregunta.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-semibold text-zinc-800 dark:text-white cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600 pb-0.5 inline-block peer">
                      Instrucción del Hook
                    </label>
                    <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                      Pauta para guiar la evaluación o resumen de la respuesta. Puede hacer referencia a variables como {`{summary}`} o {`{question}`}.
                    </span>
                    <textarea
                      rows={3}
                      value={formState.hooks?.afterActionAnswer?.instruction || ""}
                      onChange={(e) => updateHook("afterActionAnswer", "instruction", e.target.value)}
                      placeholder="e.g. Evalúa la respuesta en una escala de 0 a 5..."
                      className="w-full text-xs p-2.5 rounded-lg border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-indigo-600 font-sans"
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-between">
                    <div className="space-y-1.5 relative">
                      <label className="text-xs font-semibold text-zinc-800 dark:text-white cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600 pb-0.5 inline-block peer">
                        Variable de Salida (outputVar)
                      </label>
                      <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                        Clave opcional bajo la cual se guardará el objeto estructurado de retorno en el JSON de salida.
                      </span>
                      <input
                        type="text"
                        value={formState.hooks?.afterActionAnswer?.outputVar || ""}
                        onChange={(e) => updateHook("afterActionAnswer", "outputVar", e.target.value)}
                        placeholder="e.g. calificacion_accion"
                        className="w-full text-xs p-2.5 rounded-lg border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-indigo-600"
                      />
                    </div>

                    <div className="space-y-2 mt-2">
                      <div className="flex justify-between items-center relative">
                        <label className="text-xs font-semibold text-zinc-800 dark:text-white cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600 pb-0.5 inline-block peer">
                          Esquema de Salida JSON (outputSchema)
                        </label>
                        <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                          Definición de esquema JSON estricto para validar la estructura del Hook.
                        </span>
                        
                        <div className="flex bg-zinc-400/15 dark:bg-zinc-800 p-0.5 rounded-md text-[9px] font-semibold border border-zinc-400 dark:border-zinc-700">
                          <button
                            type="button"
                            onClick={() => setActionSchemaMode("visual")}
                            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${actionSchemaMode === "visual" ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-xs border border-zinc-400 dark:border-zinc-700" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}
                          >
                            Visual
                          </button>
                          <button
                            type="button"
                            onClick={() => setActionSchemaMode("json")}
                            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${actionSchemaMode === "json" ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-xs border border-zinc-400 dark:border-zinc-700" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}
                          >
                            Código JSON
                          </button>
                        </div>
                      </div>

                      {actionSchemaMode === "visual" ? (
                        <div className="space-y-2 mt-1 bg-zinc-400/10 dark:bg-zinc-900/30 p-3 rounded-xl border border-zinc-400 dark:border-zinc-800">
                          <div className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Parámetros del Objeto de Retorno</div>
                          
                          <div className="space-y-2">
                            {actionFields.map((field, idx) => (
                              <div key={idx} className="flex gap-1.5 items-start bg-white dark:bg-zinc-950 p-2 rounded-lg border border-zinc-400 dark:border-zinc-800 shadow-xs">
                                <div className="flex-1 space-y-1">
                                  <input
                                    type="text"
                                    value={field.name}
                                    onChange={(e) => {
                                      const updated = [...actionFields];
                                      updated[idx].name = e.target.value;
                                      updateActionFields(updated);
                                    }}
                                    placeholder="Clave (ej. nota)"
                                    className="w-full text-[10px] p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono focus:outline-indigo-500"
                                  />
                                </div>
                                
                                <div className="w-20">
                                  <select
                                    value={field.type}
                                    onChange={(e) => {
                                      const updated = [...actionFields];
                                      updated[idx].type = e.target.value as any;
                                      updateActionFields(updated);
                                    }}
                                    className="w-full text-[10px] p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-indigo-500"
                                  >
                                    <option value="string">Texto</option>
                                    <option value="integer">Número</option>
                                    <option value="boolean">Sí/No</option>
                                    <option value="array">Lista</option>
                                  </select>
                                </div>

                                <div className="flex-[2] space-y-1">
                                  <input
                                    type="text"
                                    value={field.description}
                                    onChange={(e) => {
                                      const updated = [...actionFields];
                                      updated[idx].description = e.target.value;
                                      updateActionFields(updated);
                                    }}
                                    placeholder="Descripción para la IA"
                                    className="w-full text-[10px] p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-indigo-500"
                                  />
                                </div>

                                <div className="flex items-center gap-1 self-center h-8 px-1.5">
                                  <input
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(e) => {
                                      const updated = [...actionFields];
                                      updated[idx].required = e.target.checked;
                                      updateActionFields(updated);
                                    }}
                                    id={`req-act-${idx}`}
                                    className="rounded border-zinc-400 dark:border-zinc-700 text-indigo-650 focus:ring-indigo-550 w-3 h-3 cursor-pointer"
                                  />
                                  <label htmlFor={`req-act-${idx}`} className="text-[9px] text-zinc-600 dark:text-zinc-400 font-bold select-none cursor-pointer">Req</label>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = actionFields.filter((_, i) => i !== idx);
                                    updateActionFields(updated);
                                  }}
                                  className="text-rose-500 hover:text-rose-600 p-1.5 self-center"
                                  title="Eliminar Parámetro"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              updateActionFields([...actionFields, { name: "", type: "string", description: "", required: true }]);
                            }}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 mt-1.5 cursor-pointer"
                          >
                            + Añadir Parámetro
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1 mt-1 relative">
                          <textarea
                            rows={4}
                            value={actionSchemaText}
                            onChange={(e) => handleActionSchemaChange(e.target.value)}
                            placeholder='e.g. {\n  "type": "object",\n  "properties": {\n    "qualification": { "type": "integer" }\n  }\n}'
                            className={`w-full text-[10px] font-mono p-2 rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 ${
                              isValidActionSchema 
                                ? "border-zinc-400 dark:border-zinc-800 focus:ring-indigo-500 focus:border-indigo-500" 
                                : "border-rose-500 dark:border-rose-500 focus:ring-rose-500 focus:border-rose-500"
                            }`}
                          />
                          {!isValidActionSchema && (
                            <div className="text-[9px] text-rose-500 font-semibold mt-0.5">JSON inválido o mal estructurado</div>
                          )}
                          <div className="flex flex-wrap gap-1 items-center mt-1">
                            <span className="text-[8px] font-bold text-zinc-600 dark:text-zinc-400 uppercase mr-1">Plantillas:</span>
                            <button
                              type="button"
                              onClick={() => applyPresetSchema("afterActionAnswer", "qualification")}
                              className="text-[9px] bg-zinc-400/15 dark:bg-zinc-800 hover:bg-zinc-400/30 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-400 font-semibold px-2.5 py-0.5 rounded-lg border border-zinc-400 dark:border-zinc-700 transition-all cursor-pointer"
                            >
                              Calificación (0-5)
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPresetSchema("afterActionAnswer", "boolean")}
                              className="text-[9px] bg-zinc-400/15 dark:bg-zinc-800 hover:bg-zinc-400/30 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-400 font-semibold px-2.5 py-0.5 rounded-lg border border-zinc-400 dark:border-zinc-700 transition-all cursor-pointer"
                            >
                              Aprobación (Sí/No)
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPresetSchema("afterActionAnswer", "summary")}
                              className="text-[9px] bg-zinc-400/15 dark:bg-zinc-800 hover:bg-zinc-400/30 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-400 font-semibold px-2.5 py-0.5 rounded-lg border border-zinc-400 dark:border-zinc-700 transition-all cursor-pointer"
                            >
                              Resumen y Puntos
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hook afterTask */}
              <div className="border-t border-zinc-400 dark:border-zinc-800 pt-4 space-y-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-400">Hook Post-Tarea (afterTask)</h5>
                <p className="text-[10px] text-zinc-600 dark:text-zinc-400">Ejecuta un razonamiento privado del LLM inmediatamente después de finalizar todas las acciones de una tarea completa.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-semibold text-zinc-800 dark:text-white cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600 pb-0.5 inline-block peer">
                      Instrucción del Hook
                    </label>
                    <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                      Pauta para resumir o calificar la tarea en conjunto. Puede hacer referencia a las variables de salida de las acciones de la tarea.
                    </span>
                    <textarea
                      rows={3}
                      value={formState.hooks?.afterTask?.instruction || ""}
                      onChange={(e) => updateHook("afterTask", "instruction", e.target.value)}
                      placeholder="e.g. Sintetiza las necesidades de la tarea..."
                      className="w-full text-xs p-2.5 rounded-lg border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-indigo-600 font-sans"
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-between">
                    <div className="space-y-1.5 relative">
                      <label className="text-xs font-semibold text-zinc-800 dark:text-white cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600 pb-0.5 inline-block peer">
                        Variable de Salida (outputVar)
                      </label>
                      <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                        Clave opcional bajo la cual se guardará el objeto estructurado de retorno de esta tarea en el JSON de salida.
                      </span>
                      <input
                        type="text"
                        value={formState.hooks?.afterTask?.outputVar || ""}
                        onChange={(e) => updateHook("afterTask", "outputVar", e.target.value)}
                        placeholder="e.g. resumen_fase"
                        className="w-full text-xs p-2.5 rounded-lg border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-indigo-600"
                      />
                    </div>

                    <div className="space-y-2 mt-2">
                      <div className="flex justify-between items-center relative">
                        <label className="text-xs font-semibold text-zinc-800 dark:text-white cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600 pb-0.5 inline-block peer">
                          Esquema de Salida JSON (outputSchema)
                        </label>
                        <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                          Definición de esquema JSON estricto para validar la estructura del Hook.
                        </span>
                        
                        <div className="flex bg-zinc-400/15 dark:bg-zinc-800 p-0.5 rounded-md text-[9px] font-semibold border border-zinc-400 dark:border-zinc-700">
                          <button
                            type="button"
                            onClick={() => setTaskSchemaMode("visual")}
                            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${taskSchemaMode === "visual" ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-xs border border-zinc-400 dark:border-zinc-700" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}
                          >
                            Visual
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaskSchemaMode("json")}
                            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${taskSchemaMode === "json" ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-xs border border-zinc-400 dark:border-zinc-700" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}
                          >
                            Código JSON
                          </button>
                        </div>
                      </div>

                      {taskSchemaMode === "visual" ? (
                        <div className="space-y-2 mt-1 bg-zinc-400/10 dark:bg-zinc-900/30 p-3 rounded-xl border border-zinc-400 dark:border-zinc-800">
                          <div className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Parámetros del Objeto de Retorno</div>
                          
                          <div className="space-y-2">
                            {taskFields.map((field, idx) => (
                              <div key={idx} className="flex gap-1.5 items-start bg-white dark:bg-zinc-950 p-2 rounded-lg border border-zinc-400 dark:border-zinc-800 shadow-xs">
                                <div className="flex-1 space-y-1">
                                  <input
                                    type="text"
                                    value={field.name}
                                    onChange={(e) => {
                                      const updated = [...taskFields];
                                      updated[idx].name = e.target.value;
                                      updateTaskFields(updated);
                                    }}
                                    placeholder="Clave (ej. resumen)"
                                    className="w-full text-[10px] p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono focus:outline-indigo-500"
                                  />
                                </div>
                                
                                <div className="w-20">
                                  <select
                                    value={field.type}
                                    onChange={(e) => {
                                      const updated = [...taskFields];
                                      updated[idx].type = e.target.value as any;
                                      updateTaskFields(updated);
                                    }}
                                    className="w-full text-[10px] p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-indigo-500"
                                  >
                                    <option value="string">Texto</option>
                                    <option value="integer">Número</option>
                                    <option value="boolean">Sí/No</option>
                                    <option value="array">Lista</option>
                                  </select>
                                </div>

                                <div className="flex-[2] space-y-1">
                                  <input
                                    type="text"
                                    value={field.description}
                                    onChange={(e) => {
                                      const updated = [...taskFields];
                                      updated[idx].description = e.target.value;
                                      updateTaskFields(updated);
                                    }}
                                    placeholder="Descripción para la IA"
                                    className="w-full text-[10px] p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-indigo-500"
                                  />
                                </div>

                                <div className="flex items-center gap-1 self-center h-8 px-1.5">
                                  <input
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(e) => {
                                      const updated = [...taskFields];
                                      updated[idx].required = e.target.checked;
                                      updateTaskFields(updated);
                                    }}
                                    id={`req-tsk-${idx}`}
                                    className="rounded border-zinc-400 dark:border-zinc-700 text-indigo-650 focus:ring-indigo-550 w-3 h-3 cursor-pointer"
                                  />
                                  <label htmlFor={`req-tsk-${idx}`} className="text-[9px] text-zinc-600 dark:text-zinc-400 font-bold select-none cursor-pointer">Req</label>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = taskFields.filter((_, i) => i !== idx);
                                    updateTaskFields(updated);
                                  }}
                                  className="text-rose-500 hover:text-rose-600 p-1.5 self-center"
                                  title="Eliminar Parámetro"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              updateTaskFields([...taskFields, { name: "", type: "string", description: "", required: true }]);
                            }}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 mt-1.5 cursor-pointer"
                          >
                            + Añadir Parámetro
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1 mt-1 relative">
                          <textarea
                            rows={4}
                            value={taskSchemaText}
                            onChange={(e) => handleTaskSchemaChange(e.target.value)}
                            placeholder='e.g. {\n  "type": "object",\n  "properties": {\n    "summary": { "type": "string" }\n  }\n}'
                            className={`w-full text-[10px] font-mono p-2 rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 ${
                              isValidTaskSchema 
                                ? "border-zinc-400 dark:border-zinc-800 focus:ring-indigo-500 focus:border-indigo-500" 
                                : "border-rose-500 dark:border-rose-500 focus:ring-rose-500 focus:border-rose-500"
                            }`}
                          />
                          {!isValidTaskSchema && (
                            <div className="text-[9px] text-rose-500 font-semibold mt-0.5">JSON inválido o mal estructurado</div>
                          )}
                          <div className="flex flex-wrap gap-1 items-center mt-1">
                            <span className="text-[8px] font-bold text-zinc-600 dark:text-zinc-400 uppercase mr-1">Plantillas:</span>
                            <button
                              type="button"
                              onClick={() => applyPresetSchema("afterTask", "qualification")}
                              className="text-[9px] bg-zinc-400/15 dark:bg-zinc-800 hover:bg-zinc-400/30 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-400 font-semibold px-2.5 py-0.5 rounded-lg border border-zinc-400 dark:border-zinc-700 transition-all cursor-pointer"
                            >
                              Calificación (0-5)
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPresetSchema("afterTask", "boolean")}
                              className="text-[9px] bg-zinc-400/15 dark:bg-zinc-800 hover:bg-zinc-400/30 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-400 font-semibold px-2.5 py-0.5 rounded-lg border border-zinc-400 dark:border-zinc-700 transition-all cursor-pointer"
                            >
                              Aprobación (Sí/No)
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPresetSchema("afterTask", "summary")}
                              className="text-[9px] bg-zinc-400/15 dark:bg-zinc-800 hover:bg-zinc-400/30 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-400 font-semibold px-2.5 py-0.5 rounded-lg border border-zinc-400 dark:border-zinc-700 transition-all cursor-pointer"
                            >
                              Resumen y Puntos
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Base de Conocimiento (knowledgeBase) */}
              <div className="border-t border-zinc-400 dark:border-zinc-800 pt-4 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-400">Base de Conocimiento de Referencia (knowledgeBase)</h5>
                <p className="text-[10px] text-zinc-600 dark:text-zinc-400">Carga o pega documentos metodológicos de referencia que el agente consultará para resolver dudas de manera precisa.</p>
                
                <div className="space-y-4">
                  {(formState.knowledgeBase || []).map((doc: any, docIdx: number) => (
                    <div key={docIdx} className="p-4 rounded-xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-3 relative group">
                      <button
                        type="button"
                        onClick={() => removeDoc(docIdx)}
                        className="absolute top-4 right-4 text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:underline"
                      >
                        Eliminar Documento
                      </button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1 relative">
                          <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600 pb-0.5 inline-block peer">Nombre del Documento</label>
                          <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                            Nombre identificativo del documento metodológico (ej. 'Guía AHP de Decisión').
                          </span>
                          <input
                            type="text"
                            value={doc.name || ""}
                            onChange={(e) => updateDoc(docIdx, "name", e.target.value)}
                            placeholder="ej. Guía ALTUS de Madurez"
                            className="w-full text-xs p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 text-zinc-900 dark:text-white"
                          />
                        </div>
                        
                        <div className="space-y-1 relative">
                          <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600 pb-0.5 inline-block peer">Cargar Fichero de Texto</label>
                          <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                            Sube un archivo (.txt, .md, .json) para extraer y cargar su texto automáticamente en el contenido de abajo.
                          </span>
                          <input
                            type="file"
                            accept=".txt,.md,.json,.csv,.xml"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const text = event.target?.result as string;
                                  updateDoc(docIdx, "content", text);
                                  if (!doc.name) {
                                    const cleanName = file.name.replace(/\.[^/.]+$/, "");
                                    updateDoc(docIdx, "name", cleanName);
                                  }
                                };
                                reader.readAsText(file);
                              }
                            }}
                            className="w-full text-xs p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 text-zinc-900 dark:text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-950/20 file:text-indigo-600 dark:file:text-indigo-400 file:cursor-pointer"
                          />
                          <p className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-1">Solo texto plano. Para PDF o Word, copia y pega el texto directamente abajo.</p>
                        </div>
                      </div>

                      <div className="space-y-1 relative">
                        <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600 pb-0.5 inline-block peer font-sans">Contenido de la Guía de Referencia</label>
                        <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-0 peer-hover:delay-500 bg-zinc-950 text-white border border-zinc-700 p-2.5 text-[10px] w-64 z-50 leading-normal font-normal">
                          Texto que el consultor de IA leerá y procesará como contexto metodológico. Puedes pegarlo a mano o cargarlo mediante el botón superior.
                        </span>
                        <textarea
                          rows={4}
                          value={doc.content || ""}
                          onChange={(e) => updateDoc(docIdx, "content", e.target.value)}
                          placeholder="Pega el texto de referencia o arrastra/carga un fichero..."
                          className="w-full text-xs p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-800 text-zinc-900 dark:text-white font-sans"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addDoc}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 mt-1"
                  >
                    + Añadir Documento de Referencia
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "json" && (
          <div className="h-full flex flex-col gap-3">
            <textarea
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              className={`w-full font-mono text-[11px] p-4 border rounded-xl flex-1 focus:outline-none min-h-[350px] ${
                isValidJson 
                  ? "bg-zinc-950 text-white border-zinc-800" 
                  : "bg-rose-950/20 text-rose-200 border-rose-800"
              }`}
            />
            {!isValidJson && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>JSON Inválido: {jsonError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-zinc-400 dark:border-zinc-800 px-6 py-4 bg-zinc-400/10 dark:bg-zinc-900/30 flex items-center justify-between">
        <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
          {isValidJson && isValidActionSchema && isValidTaskSchema ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{tr("Listo para añadir", "Ready to add")}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                {!isValidJson 
                  ? tr("Corrige el JSON del proceso para continuar", "Fix process JSON to continue") 
                  : tr("Corrige el esquema JSON inválido en Ajustes Avanzados", "Fix invalid JSON schema in Advanced Settings")}
              </span>
            </>
          )}
        </div>
        <button
          onClick={handleStart}
          disabled={!isValidJson || !isValidActionSchema || !isValidTaskSchema}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
        >
          {tr("Añadir a la Secuencia", "Add to Sequence")}
        </button>
      </div>
    </div>
  );
}
