export type Language = "es" | "en";

export interface TranslationDictionary {
  brandTitle: string;
  brandSubtitle: string;
  tabSetup: string;
  tabChat: string;
  tabHistory: string;
  modelLabel: string;
  toggleTheme: string;
  toggleLanguage: string;
  closeNotification: string;
  pipelineConfigTitle: string;
  pipelineConfigDesc: string;
  templatePredefined: string;
  templateCustom: string;
  loadFullPipelineBtn: string;
  loadFullPipelineTooltip: string;
  executionSequence: string;
  phasesCount: (count: number) => string;
  noProcessesAdded: string;
  customProcessInMemory: string;
  customProcessDefaultName: string;
  moveUp: string;
  moveDown: string;
  removeFromSeq: string;
  addPhaseLabel: string;
  selectPhasePlaceholder: string;
  llmEngineLabel: string;
  loadingModels: string;
  startEvaluation: (count: number) => string;
  startingEvaluation: string;
  customBuilderDesc: string;
  activeSessionsTitle: string;
  activeSessionsDesc: string;
  activeCount: (count: number) => string;
  noActiveSessions: string;
  resumeBtn: string;
  errorStartingSession: string;
  errorStartingSessionPrefix: string;
  errorConnectingServer: string;
  sessionStartedSystem: (processName: string, id: string) => string;
  connectionError: string;
  processTransitionSystem: (nextName: string) => string;
  engineErrorPrefix: string;
  unknownError: string;
  evaluationCompletedSystem: string;
  sessionResumedSystem: (processName: string) => string;
  activeSessionLabel: string;
  viewBoth: string;
  viewDialogue: string;
  viewGraph: string;
  viewBothTooltip: string;
  viewDialogueTooltip: string;
  viewGraphTooltip: string;
  interviewHeader: string;
  statusActive: string;
  roleYou: string;
  roleSystem: string;
  roleConsultant: string;
  consultantAnalyzing: string;
  doubtClarificationPrompt: string;
  doubtClarifyYes: string;
  doubtClarifyNo: string;
  inputPlaceholder: string;
  sendTooltip: string;
  interviewInProgressTitle: string;
  interviewInProgressDesc: string;
  structuredDataItems: (count: number) => string;
  structuredDataLines: (count: number) => string;
  copyRawJson: string;
  viewJson: string;
  hideJson: string;
  historyTitle: string;
  historyDesc: string;
  noSavedResults: string;
  selectEvaluationTitle: string;
  selectEvaluationDesc: string;
  hideTraces: string;
  showTraces: string;
  stepCounter: (current: number, total: number) => string;
  firstStepTooltip: string;
  prevStepTooltip: string;
  nextStepTooltip: string;
  lastStepTooltip: string;
  traceInspector: string;
  activeStepLabel: string;
  nodeLabel: string;
  loadingCanvas: string;
  consolidatedAnswerLabel: string;
  tabularTitle: string;
  tabularSubmit: string;
  tabularAddRow: string;
  tabularDeleteRow: string;
  tabularReset: string;
  tabularImportance: string;
  tabularQuality: string;
  tabularImpact: string;
  dashboardSummary: string;
  dashboardExport: string;
  dashboardMaximize: string;
  dashboardMinimize: string;
  dashboardFilterAll: string;
  healthStable: string;
  healthEvolving: string;
  healthReplaceable: string;
  healthWarning: string;
  healthStableDesc: string;
  healthEvolvingDesc: string;
  healthReplaceableDesc: string;
  healthWarningDesc: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  es: {
    // Brand & Header
    brandTitle: "AI-DRIVEN DTGEP",
    brandSubtitle: "Plataforma Agéntica de Preproyecto",
    tabSetup: "Configuración",
    tabChat: "Entrevista",
    tabHistory: "Historial",
    modelLabel: "Modelo:",
    toggleTheme: "Alternar modo oscuro/claro",
    toggleLanguage: "Cambiar idioma (ES/EN)",
    closeNotification: "Cerrar notificación",

    // Setup Tab
    pipelineConfigTitle: "1. Configuración de Pipeline",
    pipelineConfigDesc: "Selecciona el tipo de proceso de evaluación o define uno personalizado.",
    templatePredefined: "Plantilla Predefinida",
    templateCustom: "Configuración Custom",
    loadFullPipelineBtn: "Cargar Pipeline AI-Driven DTGEP",
    loadFullPipelineTooltip: "Cargar la secuencia metodológica completa: ALTUS -> SIPAC -> AHP",
    executionSequence: "Secuencia de Ejecución",
    phasesCount: (count: number) => `(${count} ${count === 1 ? "fase" : "fases"})`,
    noProcessesAdded: "Ningún proceso añadido. Usa el selector inferior o el botón superior para cargar el pipeline.",
    customProcessInMemory: "Proceso Personalizado (En Memoria)",
    customProcessDefaultName: "Proceso Personalizado",
    moveUp: "Mover arriba",
    moveDown: "Mover abajo",
    removeFromSeq: "Eliminar de la secuencia",
    addPhaseLabel: "Añadir Fase al Pipeline",
    selectPhasePlaceholder: "-- Selecciona una fase metodológica para añadir --",
    llmEngineLabel: "Motor de Razonamiento LLM",
    loadingModels: "Cargando modelos desde Ollama...",
    startEvaluation: (count: number) => `Iniciar Evaluación Agéntica (${count} ${count === 1 ? "fase" : "fases"})`,
    startingEvaluation: "Iniciando Evaluación Agéntica...",
    customBuilderDesc: "Usa el editor de la derecha para estructurar las tareas. Una vez completado, pulsa el botón en la parte inferior del editor para iniciar.",
    activeSessionsTitle: "Sesiones Activas en Memoria",
    activeSessionsDesc: "Sesiones abiertas en curso en el servidor local de LangGraph.",
    activeCount: (count: number) => `${count} activas`,
    noActiveSessions: "No hay sesiones en curso en este momento. Selecciona una plantilla a la izquierda y pulsa Iniciar.",
    resumeBtn: "Reanudar",

    // Notifications & System Messages
    errorStartingSession: "Error iniciando sesión: respuesta inesperada del servidor",
    errorStartingSessionPrefix: "Error iniciando sesión: ",
    errorConnectingServer: "No se pudo conectar con el servidor para iniciar la sesión.",
    sessionStartedSystem: (processName: string, id: string) => `Sesión iniciada para el proceso "${processName}". Identificador: ${id}`,
    connectionError: "Error de conexión con el servidor.",
    processTransitionSystem: (nextName: string) => `Transición automática: Iniciando proceso "${nextName}"`,
    engineErrorPrefix: "Error del motor: ",
    unknownError: "Error desconocido",
    evaluationCompletedSystem: "Evaluación completada. Resultados cargados exitosamente.",
    sessionResumedSystem: (processName: string) => `Reanudada sesión de "${processName}"`,

    // Chat / Interview Tab
    activeSessionLabel: "Sesión Activa:",
    viewBoth: "Ambos",
    viewDialogue: "Diálogo",
    viewGraph: "Grafo / Salida",
    viewBothTooltip: "Mostrar diálogo y grafo simultáneamente",
    viewDialogueTooltip: "Ver solo el chat de entrevista",
    viewGraphTooltip: "Ver solo el grafo / resultados",
    interviewHeader: "Entrevista Consultiva",
    statusActive: "Activo",
    roleYou: "Tú",
    roleSystem: "Sistema",
    roleConsultant: "Consultor DTGEP",
    consultantAnalyzing: "El consultor está analizando...",
    doubtClarificationPrompt: "¿Requieres aclaración antes de responder?",
    doubtClarifyYes: "Sí, aclarar pregunta",
    doubtClarifyNo: "No, continuar entrevista",
    inputPlaceholder: "Escribe tu respuesta... (Enter para enviar, Shift+Enter para nueva línea)",
    sendTooltip: "Enviar respuesta (Enter)",
    interviewInProgressTitle: "Entrevista en Curso",
    interviewInProgressDesc: "Responde a las preguntas del consultor a la izquierda. Los resultados y gráficos del diagnóstico se cargarán en este panel inmediatamente al completar el proceso.",

    // Formatted Content
    structuredDataItems: (count: number) => `Datos estructurados (${count} elementos)`,
    structuredDataLines: (count: number) => `Datos estructurados (${count} líneas)`,
    copyRawJson: "Copiar JSON crudo",
    viewJson: "Ver JSON",
    hideJson: "Ocultar",

    // History Tab
    historyTitle: "Historial de Resultados",
    historyDesc: "Carga ficheros JSON de evaluaciones previas guardadas en disco.",
    noSavedResults: "No se encontraron ficheros de resultados guardados.",
    selectEvaluationTitle: "Selecciona una Evaluación",
    selectEvaluationDesc: "Elige un archivo del listado izquierdo para cargar sus gráficos correspondientes.",

    // Visualizer
    hideTraces: "Ocultar Trazas",
    showTraces: "Mostrar Trazas",
    stepCounter: (current: number, total: number) => `Paso ${current} / ${total}`,
    firstStepTooltip: "Primer Paso",
    prevStepTooltip: "Paso Anterior",
    nextStepTooltip: "Siguiente Paso",
    lastStepTooltip: "Último Paso (Presente)",
    traceInspector: "Inspector de Trazas",
    activeStepLabel: "Paso Activo:",
    nodeLabel: "Nodo:",
    loadingCanvas: "Cargando Canvas...",
    consolidatedAnswerLabel: "Respuesta Consolidada (Historial Completo)",

    // Tabular Input
    tabularTitle: "Asistente de Entrada Estructurada",
    tabularSubmit: "Confirmar y Enviar",
    tabularAddRow: "Añadir Fila",
    tabularDeleteRow: "Eliminar",
    tabularReset: "Restablecer",
    tabularImportance: "Importancia",
    tabularQuality: "Calidad",
    tabularImpact: "Impacto",

    // Dashboard General
    dashboardSummary: "Resumen de Resultados",
    dashboardExport: "Exportar Reporte",
    dashboardMaximize: "Maximizar Pantalla",
    dashboardMinimize: "Minimizar Pantalla",
    dashboardFilterAll: "Todos",

    // Health Statuses
    healthStable: "Estable",
    healthEvolving: "En Evolución",
    healthReplaceable: "Reemplazable",
    healthWarning: "Advertencia",
    healthStableDesc: "Calidad e impacto altos (activo consolidado)",
    healthEvolvingDesc: "Alto impacto estratégico, margen de mejora",
    healthReplaceableDesc: "Calidad adecuada pero bajo impacto en metas",
    healthWarningDesc: "Baja calidad y bajo impacto (crítico o en riesgo)"
  },
  en: {
    // Brand & Header
    brandTitle: "AI-DRIVEN DTGEP",
    brandSubtitle: "Agentic Pre-Project Decision Platform",
    tabSetup: "Configuration",
    tabChat: "Interview",
    tabHistory: "History",
    modelLabel: "Model:",
    toggleTheme: "Toggle dark/light mode",
    toggleLanguage: "Switch language (ES/EN)",
    closeNotification: "Close notification",

    // Setup Tab
    pipelineConfigTitle: "1. Pipeline Configuration",
    pipelineConfigDesc: "Select an evaluation process template or define a custom one.",
    templatePredefined: "Predefined Template",
    templateCustom: "Custom Configuration",
    loadFullPipelineBtn: "Load AI-Driven DTGEP Pipeline",
    loadFullPipelineTooltip: "Load full methodological sequence: ALTUS -> SIPAC -> AHP",
    executionSequence: "Execution Sequence",
    phasesCount: (count: number) => `(${count} ${count === 1 ? "phase" : "phases"})`,
    noProcessesAdded: "No processes added. Use the selector below or the button above to load the pipeline.",
    customProcessInMemory: "Custom Process (In-Memory)",
    customProcessDefaultName: "Custom Process",
    moveUp: "Move up",
    moveDown: "Move down",
    removeFromSeq: "Remove from sequence",
    addPhaseLabel: "Add Phase to Pipeline",
    selectPhasePlaceholder: "-- Select a methodological phase to add --",
    llmEngineLabel: "LLM Reasoning Engine",
    loadingModels: "Loading models from Ollama...",
    startEvaluation: (count: number) => `Start Agentic Evaluation (${count} ${count === 1 ? "phase" : "phases"})`,
    startingEvaluation: "Starting Agentic Evaluation...",
    customBuilderDesc: "Use the editor on the right to structure tasks. Once finished, click the button at the bottom of the editor to launch.",
    activeSessionsTitle: "Active Sessions in Memory",
    activeSessionsDesc: "Open sessions currently in progress on the local LangGraph server.",
    activeCount: (count: number) => `${count} active`,
    noActiveSessions: "No active sessions at this time. Select a template on the left and click Start.",
    resumeBtn: "Resume",

    // Notifications & System Messages
    errorStartingSession: "Error starting session: unexpected server response",
    errorStartingSessionPrefix: "Error starting session: ",
    errorConnectingServer: "Could not connect to the server to start the session.",
    sessionStartedSystem: (processName: string, id: string) => `Session started for process "${processName}". ID: ${id}`,
    connectionError: "Server connection error.",
    processTransitionSystem: (nextName: string) => `Automatic transition: Starting process "${nextName}"`,
    engineErrorPrefix: "Engine error: ",
    unknownError: "Unknown error",
    evaluationCompletedSystem: "Evaluation completed. Results successfully loaded.",
    sessionResumedSystem: (processName: string) => `Resumed session for "${processName}"`,

    // Chat / Interview Tab
    activeSessionLabel: "Active Session:",
    viewBoth: "Both",
    viewDialogue: "Dialogue",
    viewGraph: "Graph / Output",
    viewBothTooltip: "Show dialogue and graph simultaneously",
    viewDialogueTooltip: "View interview chat only",
    viewGraphTooltip: "View graph / results only",
    interviewHeader: "Consultative Interview",
    statusActive: "Active",
    roleYou: "You",
    roleSystem: "System",
    roleConsultant: "DTGEP Consultant",
    consultantAnalyzing: "The consultant is analyzing...",
    doubtClarificationPrompt: "Do you require clarification before answering?",
    doubtClarifyYes: "Yes, clarify question",
    doubtClarifyNo: "No, continue interview",
    inputPlaceholder: "Type your answer... (Enter to send, Shift+Enter for new line)",
    sendTooltip: "Send answer (Enter)",
    interviewInProgressTitle: "Interview in Progress",
    interviewInProgressDesc: "Answer the consultant's questions on the left. Diagnostic results and charts will load into this panel immediately upon completion.",

    // Formatted Content
    structuredDataItems: (count: number) => `Structured data (${count} items)`,
    structuredDataLines: (count: number) => `Structured data (${count} lines)`,
    copyRawJson: "Copy raw JSON",
    viewJson: "View JSON",
    hideJson: "Hide",

    // History Tab
    historyTitle: "Results History",
    historyDesc: "Load previous evaluation JSON files saved on disk.",
    noSavedResults: "No saved result files found.",
    selectEvaluationTitle: "Select an Evaluation",
    selectEvaluationDesc: "Choose a file from the list on the left to load its corresponding charts.",

    // Visualizer
    hideTraces: "Hide Traces",
    showTraces: "Show Traces",
    stepCounter: (current: number, total: number) => `Step ${current} / ${total}`,
    firstStepTooltip: "First Step",
    prevStepTooltip: "Previous Step",
    nextStepTooltip: "Next Step",
    lastStepTooltip: "Last Step (Present)",
    traceInspector: "Trace Inspector",
    activeStepLabel: "Active Step:",
    nodeLabel: "Node:",
    loadingCanvas: "Loading Canvas...",
    consolidatedAnswerLabel: "Consolidated Answer (Full History)",

    // Tabular Input
    tabularTitle: "Structured Input Assistant",
    tabularSubmit: "Confirm and Submit",
    tabularAddRow: "Add Row",
    tabularDeleteRow: "Delete",
    tabularReset: "Reset",
    tabularImportance: "Importance",
    tabularQuality: "Quality",
    tabularImpact: "Impact",

    // Dashboard General
    dashboardSummary: "Results Summary",
    dashboardExport: "Export Report",
    dashboardMaximize: "Maximize Screen",
    dashboardMinimize: "Minimize Screen",
    dashboardFilterAll: "All",

    // Health Statuses
    healthStable: "Stable",
    healthEvolving: "Evolving",
    healthReplaceable: "Replaceable",
    healthWarning: "Warning",
    healthStableDesc: "High quality and high impact (consolidated asset)",
    healthEvolvingDesc: "High strategic impact, room for improvement",
    healthReplaceableDesc: "Adequate quality but low impact on goals",
    healthWarningDesc: "Low quality and low impact (critical or at risk)"
  }
};
