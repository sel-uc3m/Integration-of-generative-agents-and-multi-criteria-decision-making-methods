"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Send,
  Moon,
  Sun,
  RefreshCw,
  History,
  MessageSquare,
  Settings,
  CheckCircle,
  Plus,
  Sliders,
  FileJson,
  HelpCircle,
  ChevronRight,
  Database,
  ArrowUp,
  ArrowDown,
  Trash2,
  AlertCircle,
  X,
  Sparkles,
  AudioWaveform,
  Languages
} from "lucide-react";
import { useLanguage } from "./context/LanguageContext";
import CustomProcessBuilder from "./components/CustomProcessBuilder";
import ResultsDashboard from "./components/ResultsDashboard";
import LocalVisualizer from "./components/LocalVisualizer";
import InteractiveTabularInput from "./components/InteractiveTabularInput";
import FormattedMessageContent from "./components/FormattedMessageContent";

interface ProcessDescriptor {
  type: "file" | "custom";
  fileName?: string;
  customData?: any;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  type?: "question" | "confirmation" | "result" | "info";
  timestamp: string;
}

/** Parse and dispatch SSE events from a streaming fetch response. */
async function readSSEStream(
  response: Response,
  onEvent: (event: string, data: unknown) => void
): Promise<void> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by double newline
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      if (!part.trim()) continue;
      let event = "message";
      let dataStr = "";
      for (const line of part.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7);
        else if (line.startsWith("data: ")) dataStr = line.slice(6);
      }
      if (dataStr) {
        try { onEvent(event, JSON.parse(dataStr)); } catch { /* ignore malformed */ }
      }
    }
  }
}

export default function Home() {
  const { language, toggleLanguage, t, tr } = useLanguage();

  // Theme & Tabs State
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"setup" | "chat" | "history">("setup");
  const [chatViewMode, setChatViewMode] = useState<"both" | "chat" | "visualizer">("both");

  // API Data State
  const [availableProcesses, setAvailableProcesses] = useState<Array<{ name: string; file: string }>>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]); //TODO: Probablemente se podría definir el tipo a usar
  const [pastResultsList, setPastResultsList] = useState<any[]>([]); //TODO: Probablemente se podría definir el tipo a usar

  // Setup Form State
  const [selectedProcessFile, setSelectedProcessFile] = useState("");
  const [selectedSequence, setSelectedSequence] = useState<ProcessDescriptor[]>([]);
  const [processSource, setProcessSource] = useState<"file" | "custom">("file");
  const [customProcessData, setCustomProcessData] = useState<any>(null); //TODO: Entiendo que debería de haber un tipo para los CustomProcess

  // Chat State
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [activeInterrupt, setActiveInterrupt] = useState<any>(null);
  const [sessionResults, setSessionResults] = useState<any>(null); //TODO: Es posible que no se haya definido aun una salida correcta aun, pero cuando se haya definido hay que ponerlo

  // History Detail State
  const [selectedResultFile, setSelectedResultFile] = useState<string | null>(null);
  const [selectedResultData, setSelectedResultData] = useState<any>(null);

  // Ollama Models State
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");

  // Toast / Inline notification state
  const [toastError, setToastError] = useState<string | null>(null);

  useEffect(() => {
    if (toastError) {
      const timer = setTimeout(() => setToastError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toastError]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch Ollama models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch("/api/models");
        const data = await res.json();
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models);
          // Default to deepseek-r1:7b if available, otherwise first model
          const defaultModel = data.models.includes("deepseek-r1:7b")
            ? "deepseek-r1:7b"
            : data.models[0];
          setSelectedModel(defaultModel);
        }
      } catch (e) {
        console.error("Failed to fetch models:", e);
      }
    };
    fetchModels();
  }, []);

  // Apply dark mode styling to document element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Load processes, active sessions, and results list on mount

  // Scroll chat to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchProcesses = useCallback(async () => {
    try {
      const res = await fetch("/api/processes");
      const data = await res.json();
      if (Array.isArray(data)) {
        setAvailableProcesses(data);
        if (data.length > 0) {
          setSelectedProcessFile(data[0].file);
        }
      }
    } catch (e) {
      console.error("Failed to fetch processes:", e);
    }
  }, []);

  // Check for tab or session query params on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "history" || tabParam === "chat" || tabParam === "setup") {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const getSavedSessionIds = useCallback((): string[] => {
    if (typeof window === "undefined") return ["demo-caso-estudio"];
    try {
      const saved = localStorage.getItem("tfm_user_sessions");
      const list = saved ? JSON.parse(saved) : [];
      if (Array.isArray(list) && list.length > 0) {
        if (!list.includes("demo-caso-estudio")) {
          return ["demo-caso-estudio", ...list];
        }
        return list;
      }
      return ["demo-caso-estudio"];
    } catch {
      return ["demo-caso-estudio"];
    }
  }, []);

  const fetchPastResults = useCallback(async () => {
    try {
      const savedIds = getSavedSessionIds();
      const res = await fetch(`/api/results?ids=${encodeURIComponent(savedIds.join(","))}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setPastResultsList(data);
        if (data.length > 0) {
          handleViewResult(data[0].fileName);
        }
      }
    } catch (e) {
      console.error("Failed to fetch past results:", e);
    }
  }, [getSavedSessionIds]);

  const fetchActiveSessions = useCallback(async () => {
    try {
      const savedIds = getSavedSessionIds();
      const res = await fetch(`/api/sessions?ids=${encodeURIComponent(savedIds.join(","))}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setActiveSessions(data);
      }
    } catch (e) {
      console.error("Failed to fetch active sessions:", e);
    }
  }, [getSavedSessionIds]);

  // Load standard sequential methodology pipeline: 1. ALTUS -> 2. SIPAC -> 3. AHP
  const handleLoadFullPipeline = useCallback(() => {
    const sequenceOrder = ["altus", "sipac", "ahp"];
    const resolvedSequence: ProcessDescriptor[] = [];

    sequenceOrder.forEach((key) => {
      const match = availableProcesses.find((p) =>
        p.file.toLowerCase().includes(key) || p.name.toLowerCase().includes(key)
      );
      if (match) {
        resolvedSequence.push({ type: "file", fileName: match.file });
      }
    });

    if (resolvedSequence.length > 0) {
      setSelectedSequence(resolvedSequence);
    }
  }, [availableProcesses]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProcesses();
      fetchPastResults();
      fetchActiveSessions();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchProcesses, fetchPastResults, fetchActiveSessions]);

  // Start Evaluation Session
  const handleStartSession = async () => {
    setIsWaitingForResponse(true);
    try {
      const payload: any = {
        processSource,
        modelConfig: { model: selectedModel }
      };
      if (processSource === "file") {
        payload.pipeline = selectedSequence;
      } else {
        payload.customProcess = customProcessData;
      }

      const res = await fetch("/api/session/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok || !res.body) {
        setToastError(t.errorStartingSession);
        return;
      }

      await readSSEStream(res, (event, data: any) => {
        if (event === "completed") {
          if (data.error) {
            setToastError(t.errorStartingSessionPrefix + data.error);
            return;
          }
          // data is SessionInfo (has sessionId) when there is an interrupt waiting
          if (data.sessionId) {
            // Save sessionId to localStorage for user privacy/ownership
            try {
              const saved = localStorage.getItem("tfm_user_sessions");
              const list = saved ? JSON.parse(saved) : [];
              if (Array.isArray(list) && !list.includes(data.sessionId)) {
                list.push(data.sessionId);
                localStorage.setItem("tfm_user_sessions", JSON.stringify(list));
              }
            } catch (err) {
              console.error("Failed to save session ID to localStorage:", err);
            }

            setCurrentSessionId(data.sessionId);
            setSessionResults(null);

            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const initialMessages: Message[] = [
              {
                role: "system",
                content: t.sessionStartedSystem(data.processName, data.sessionId),
                timestamp: time,
                type: "info"
              }
            ];

            if (data.firstInterrupt) {
              setActiveInterrupt(data.firstInterrupt);
              initialMessages.push({
                role: "assistant",
                content: data.firstInterrupt.question || data.firstInterrupt.prompt,
                timestamp: time,
                type: data.firstInterrupt.type || "question"
              });
            }

            setMessages(initialMessages);
            setActiveTab("chat");
            fetchActiveSessions();
          }
        } else if (event === "error") {
          setToastError(t.errorStartingSessionPrefix + (data.message || t.unknownError));
        }
      });
    } catch (e) {
      console.error("Failed starting session:", e);
      setToastError(t.errorConnectingServer);
    } finally {
      setIsWaitingForResponse(false);
    }
  };

  // Submit User Answer
  const handleSendMessage = async (customAnswer?: string) => {
    const answer = customAnswer !== undefined ? customAnswer : textInput;
    if (!answer.trim() || !currentSessionId) return;

    if (customAnswer === undefined) setTextInput("");
    setIsWaitingForResponse(true);

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: "user", content: answer, timestamp: time }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSessionId,
          answer,
        }),
      });

      if (!res.ok || !res.body) {
        setMessages(prev => [...prev, {
          role: "system",
          content: t.connectionError,
          timestamp: time,
          type: "info"
        }]);
        return;
      }

      await readSSEStream(res, (event, data: any) => {
        if (event === "process_transition") {
          // Show transition banner before the next interrupt arrives
          setMessages(prev => [...prev, {
            role: "system",
            content: t.processTransitionSystem(data.nextProcessName),
            timestamp: time,
            type: "info"
          }]);
        } else if (event === "completed") {
          if (data.error) {
            setMessages(prev => [...prev, {
              role: "system",
              content: t.engineErrorPrefix + data.error,
              timestamp: time,
              type: "info"
            }]);
            return;
          }

          if (data.status === "interrupted") {
            setActiveInterrupt(data.interrupt);
            setMessages(prev => [...prev, {
              role: "assistant",
              content: data.interrupt.question || data.interrupt.prompt,
              timestamp: time,
              type: data.interrupt.type
            }]);
          } else if (data.status === "completed") {
            setActiveInterrupt(null);
            setSessionResults(data.results);
            setMessages(prev => [...prev, {
              role: "system",
              content: t.evaluationCompletedSystem,
              timestamp: time,
              type: "result"
            }]);
            fetchPastResults();
          }
        } else if (event === "error") {
          setMessages(prev => [...prev, {
            role: "system",
            content: t.engineErrorPrefix + data.message,
            timestamp: time,
            type: "info"
          }]);
        }
      });
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setIsWaitingForResponse(false);
    }
  };

  // Reload a past session result to display the dashboard
  const handleViewResult = async (fileName: string) => {
    setSelectedResultFile(fileName);
    try {
      const res = await fetch(`/api/results/${fileName}`);
      const data = await res.json();
      setSelectedResultData(data.outputJson || data);
    } catch (e) {
      console.error("Failed loading result content:", e);
    }
  };

  // Resume an active in-memory session
  const handleResumeActiveSession = async (session: any) => {
    setCurrentSessionId(session.sessionId);
    setSessionResults(null);
    setIsWaitingForResponse(true);

    try {
      const res = await fetch(`/api/session/${session.sessionId}`);
      const state = await res.json();

      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const historyMessages: Message[] = [
        {
          role: "system",
          content: t.sessionResumedSystem(session.processName),
          timestamp: time,
          type: "info"
        }
      ];

      // Recover transcript messages if any, or append current interrupt
      if (state.interrupt) {
        setActiveInterrupt(state.interrupt);
        historyMessages.push({
          role: "assistant",
          content: state.interrupt.question || state.interrupt.prompt,
          timestamp: time,
          type: state.interrupt.type
        });
      }

      setMessages(historyMessages);
      setActiveTab("chat");
    } catch (e) {
      console.error("Failed to resume session:", e);
    } finally {
      setIsWaitingForResponse(false);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen font-sans transition-colors duration-300 ${
      darkMode ? "bg-zinc-950 text-white" : "bg-zinc-50/50 text-zinc-900"
    }`}>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between shadow-xs gap-3">
        <div
          onClick={() => setActiveTab("setup")}
          className="flex items-center gap-3 cursor-pointer select-none group min-w-0"
        >
          <div className="bg-gradient-to-br from-indigo-600 to-sky-600 p-2.5 rounded-xl shadow-md flex items-center justify-center transition-all group-hover:scale-105 shrink-0">
            <Sliders className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-zinc-950 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors truncate">
                AI-DRIVEN DTGEP
              </h1>
            </div>
            <p className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold tracking-wider uppercase truncate">
              {t.brandSubtitle}
            </p>
          </div>
        </div>

        {/* Center / Navigation Tabs */}
        <nav className="flex items-center bg-zinc-200/60 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-300/80 dark:border-zinc-800 shrink-0">
          <button
            onClick={() => setActiveTab("setup")}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "setup"
                ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.tabSetup}</span>
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            disabled={!currentSessionId}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "chat"
                ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white disabled:opacity-40"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.tabChat}</span>
            {currentSessionId && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "history"
                ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.tabHistory}</span>
            <span className="text-[10px] font-mono opacity-80">({pastResultsList.length})</span>
          </button>
        </nav>

        {/* Right Actions: Active LLM Pill, Language Toggle & Theme Toggle */}
        <div className="flex items-center gap-2">
          {selectedModel && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">{t.modelLabel}</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-200 truncate max-w-[130px]">{selectedModel}</span>
            </div>
          )}

          {/* Language Toggle Button */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shadow-2xs font-bold text-xs"
            title={t.toggleLanguage}
          >
            <Languages className="w-3.5 h-3.5 text-indigo-600 dark:text-sky-400" />
            <span className="font-mono uppercase">{language}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 sm:p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shadow-2xs"
            title={t.toggleTheme}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl lg:max-w-[1700px] w-full mx-auto p-4 md:p-6 flex flex-col relative">

        {/* Toast Notification Banner */}
        {toastError && (
          <div className="mb-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{toastError}</span>
            </div>
            <button
              onClick={() => setToastError(null)}
              className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 transition-colors cursor-pointer"
              title={t.closeNotification}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: SETUP SCREEN */}
        {activeTab === "setup" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">

            {/* Left side: Select predefined templates */}
            <div className="lg:col-span-1 p-6 rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-md space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-zinc-950 dark:text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600 dark:text-sky-400" />
                  {t.pipelineConfigTitle}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{t.pipelineConfigDesc}</p>
              </div>

              {/* Source Choice */}
              <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={() => setProcessSource("file")}
                  className={`text-xs font-bold py-2 rounded-lg transition-all cursor-pointer ${
                    processSource === "file"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200 dark:border-zinc-700"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {t.templatePredefined}
                </button>
                <button
                  onClick={() => setProcessSource("custom")}
                  className={`text-xs font-bold py-2 rounded-lg transition-all cursor-pointer ${
                    processSource === "custom"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200 dark:border-zinc-700"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {t.templateCustom}
                </button>
              </div>

              {processSource === "file" ? (
                <div className="space-y-4">
                  {/* Quick Preset Action */}
                  <button
                    type="button"
                    onClick={handleLoadFullPipeline}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-50/90 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-sky-300 text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:scale-[1.01]"
                    title={t.loadFullPipelineTooltip}
                  >
                    <AudioWaveform className="w-4 h-4 text-indigo-600 dark:text-sky-400 shrink-0" />
                    {t.loadFullPipelineBtn}
                  </button>

                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-zinc-900 dark:text-white flex items-center justify-between">
                      <span>{t.executionSequence}</span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono font-medium">{t.phasesCount(selectedSequence.length)}</span>
                    </label>

                    {selectedSequence.length === 0 ? (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 italic p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl text-center">
                        {t.noProcessesAdded}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {selectedSequence.map((item, index) => {
                          let name = "";
                          let subtitle = "";
                          let key = "";
                          if (item.type === "file") {
                            const process = availableProcesses.find((p) => p.file === item.fileName);
                            name = process ? process.name : item.fileName || "";
                            subtitle = item.fileName || "";
                            key = `${item.fileName}-${index}`;
                          } else {
                            name = item.customData?.processName || t.customProcessDefaultName;
                            subtitle = t.customProcessInMemory;
                            key = `custom-${index}`;
                          }
                          return (
                            <div
                              key={key}
                              className="flex items-center gap-2.5 p-3 bg-zinc-50/80 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xs hover:border-indigo-400 transition-all"
                            >
                              <div className="w-6 h-6 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                  {name}
                                </div>
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                                  {subtitle}
                                </div>
                              </div>

                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => {
                                    const newSeq = [...selectedSequence];
                                    const temp = newSeq[index];
                                    newSeq[index] = newSeq[index - 1];
                                    newSeq[index - 1] = temp;
                                    setSelectedSequence(newSeq);
                                  }}
                                  className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-400/20 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer transition-colors"
                                  title={t.moveUp}
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === selectedSequence.length - 1}
                                  onClick={() => {
                                    const newSeq = [...selectedSequence];
                                    const temp = newSeq[index];
                                    newSeq[index] = newSeq[index + 1];
                                    newSeq[index + 1] = temp;
                                    setSelectedSequence(newSeq);
                                  }}
                                  className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-400/20 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer transition-colors"
                                  title={t.moveDown}
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newSeq = selectedSequence.filter((_, i) => i !== index);
                                    setSelectedSequence(newSeq);
                                  }}
                                  className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors"
                                  title={t.removeFromSeq}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-300">{t.addPhaseLabel}</label>
                    <select
                      id="add-process-select"
                      className="w-full text-xs p-3 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedSequence([...selectedSequence, { type: "file", fileName: e.target.value }]);
                          e.target.value = ""; // reset select
                        }
                      }}
                    >
                      <option value="" disabled>{t.selectPhasePlaceholder}</option>
                      {availableProcesses.map((p) => (
                        <option key={p.file} value={p.file}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-300">{t.llmEngineLabel}</label>
                    {availableModels.length === 0 ? (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 italic py-1">{t.loadingModels}</div>
                    ) : (
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full text-xs p-3 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono"
                      >
                        {availableModels.map((model) => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <button
                    onClick={handleStartSession}
                    disabled={isWaitingForResponse || selectedSequence.length === 0}
                    className="w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 hover:from-indigo-500 hover:to-sky-500 disabled:opacity-40 text-white font-black text-xs sm:text-sm py-4 rounded-xl shadow-lg hover:shadow-indigo-500/25 active:scale-[0.99] flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isWaitingForResponse ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {t.startingEvaluation}
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        {t.startEvaluation(selectedSequence.length)}
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                    {t.customBuilderDesc}
                  </div>
                </div>
              )}
            </div>

            {/* Right side: Process builder or Active Sessions list */}
            <div className="lg:col-span-2 space-y-6">
              {processSource === "custom" ? (
                <CustomProcessBuilder
                  onSave={(data) => {
                    const newSeqItem: ProcessDescriptor = {
                      type: "custom",
                      customData: data
                    };
                    setSelectedSequence(prev => [...prev, newSeqItem]);
                    setProcessSource("file");
                  }}
                />
              ) : (
                <div className="p-6 rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-zinc-950 dark:text-white uppercase tracking-wider">
                        {t.activeSessionsTitle}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.activeSessionsDesc}</p>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {t.activeCount(activeSessions.length)}
                    </span>
                  </div>

                  {activeSessions.length === 0 ? (
                    <div className="text-zinc-500 dark:text-zinc-400 text-xs italic py-8 text-center bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                      {t.noActiveSessions}
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950">
                      {activeSessions.map((session) => (
                        <div key={session.sessionId} className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                          <div className="space-y-1">
                            <div className="text-xs font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>{session.processName}</span>
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">ID: {session.sessionId}</div>
                          </div>
                          <button
                            onClick={() => handleResumeActiveSession(session)}
                            className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-sky-400 border border-indigo-200 dark:border-indigo-800/60 rounded-lg px-3.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all cursor-pointer shadow-2xs"
                          >
                            {t.resumeBtn}
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVE CHAT SCREEN */}
        {activeTab === "chat" && (
          <div className="flex flex-col gap-4 flex-1">
            {/* View Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between bg-white dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm gap-3">
              <div className="flex items-center gap-2.5 text-xs font-extrabold text-zinc-950 dark:text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{t.activeSessionLabel}</span>
                <span className="font-mono text-xs text-indigo-600 dark:text-sky-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/40 truncate max-w-[140px] sm:max-w-[240px]">{currentSessionId}</span>
              </div>

              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold">
                <button
                  onClick={() => setChatViewMode("both")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    chatViewMode === "both"
                      ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                  }`}
                  title={t.viewBothTooltip}
                >
                  {t.viewBoth}
                </button>
                <button
                  onClick={() => setChatViewMode("chat")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    chatViewMode === "chat"
                      ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                  }`}
                  title={t.viewDialogueTooltip}
                >
                  {t.viewDialogue}
                </button>
                <button
                  onClick={() => setChatViewMode("visualizer")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    chatViewMode === "visualizer"
                      ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                  }`}
                  title={t.viewGraphTooltip}
                >
                  {t.viewGraph}
                </button>
              </div>
            </div>

            <div className={`grid grid-cols-1 ${chatViewMode === "both" ? "lg:grid-cols-12" : "grid-cols-1"} gap-6 flex-1 items-stretch`}>
              {/* Chat column */}
              {(chatViewMode === "both" || chatViewMode === "chat") && (
                <div className={`${chatViewMode === "both" ? "lg:col-span-5" : "col-span-12"} flex flex-col h-[650px] lg:h-[740px] border border-zinc-300 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 shadow-lg overflow-hidden`}>
                  {/* Chat header */}
                  <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-zinc-950 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-sky-400" />
                        {t.interviewHeader}
                      </span>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate max-w-[180px]">ID: {currentSessionId}</div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[10px] uppercase font-extrabold text-emerald-700 dark:text-emerald-300 tracking-wider">{t.statusActive}</span>
                    </div>
                  </div>

                  {/* Chat message logs */}
                  <div className="flex-1 p-5 overflow-y-auto space-y-4">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex flex-col max-w-[90%] ${
                          msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1 px-1 text-zinc-400">
                          {msg.role === "user" ? t.roleYou : msg.role === "system" ? t.roleSystem : t.roleConsultant}
                        </div>
                        <div className={`px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          msg.role === "user"
                            ? "bg-sky-700 dark:bg-sky-600 text-white rounded-br-none font-medium"
                            : msg.type === "info"
                              ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800"
                              : msg.type === "confirmation"
                                ? "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 rounded-bl-none font-medium"
                                : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-bl-none text-zinc-900 dark:text-zinc-100 font-medium"
                        }`}>
                          <FormattedMessageContent content={msg.content} />
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono mt-1 px-1">{msg.timestamp}</span>
                      </div>
                    ))}
                    {isWaitingForResponse && (
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 mr-auto shadow-xs">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-sky-400" />
                        <span className="font-semibold">{t.consultantAnalyzing}</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40">
                    {/* Interactive Tabular Assistant for SIPAC/AHP structured steps */}
                    {activeInterrupt && activeInterrupt.type !== "confirmation" && (
                      <InteractiveTabularInput
                        activeInterrupt={activeInterrupt}
                        onSubmit={(formattedAnswer) => handleSendMessage(formattedAnswer)}
                        onSyncText={(text) => setTextInput(text)}
                        disabled={isWaitingForResponse}
                        darkMode={darkMode}
                      />
                    )}

                    {activeInterrupt?.type === "confirmation" ? (
                      // Doubt confirmation flow: buttons instead of input box
                      <div className="flex flex-col gap-3">
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300 text-center">
                          {t.doubtClarificationPrompt}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => handleSendMessage("si")}
                            className="py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center"
                          >
                            {t.doubtClarifyYes}
                          </button>
                          <button
                            onClick={() => handleSendMessage("no")}
                            className="py-3 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-extrabold text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 transition-all cursor-pointer text-center"
                          >
                            {t.doubtClarifyNo}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Standard text response input box
                      <div className="flex items-end gap-2">
                        <div className="flex-1 relative">
                          <textarea
                            rows={2}
                            placeholder={t.inputPlaceholder}
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            disabled={isWaitingForResponse || !activeInterrupt}
                            className="w-full text-xs p-3 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-50 resize-none transition-all"
                          />
                        </div>
                        <button
                          onClick={() => handleSendMessage()}
                          disabled={isWaitingForResponse || !activeInterrupt || !textInput.trim()}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white p-3 rounded-xl shadow-md flex items-center justify-center transition-all cursor-pointer shrink-0 mb-1"
                          title={t.sendTooltip}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Results/Dashboard Sidebar column */}
              {(chatViewMode === "both" || chatViewMode === "visualizer") && (
                <div className={`${chatViewMode === "both" ? "lg:col-span-7" : "col-span-12"} flex flex-col`}>
                  {sessionResults ? (
                    // If session is complete, display Dashboard!
                    <ResultsDashboard
                      data={sessionResults}
                      processType={selectedProcessFile || "custom"}
                    />
                  ) : currentSessionId ? (
                    // While running, show real-time graph and LLM traces
                    <div className="rounded-2xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg overflow-hidden flex-1 min-h-[650px] flex flex-col relative">
                      <LocalVisualizer
                        sessionId={currentSessionId}
                        isActive={true}
                        darkMode={darkMode}
                      />
                    </div>
                  ) : (
                    // While running, show helpful information card
                    <div className="p-6 rounded-2xl border border-zinc-400 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg flex flex-col justify-center text-center h-full min-h-[300px]">
                      <HelpCircle className="w-12 h-12 text-indigo-500/80 mx-auto mb-4 animate-pulse" />
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{t.interviewInProgressTitle}</h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xs mx-auto mt-2 leading-relaxed">
                        {t.interviewInProgressDesc}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PAST RESULTS / HISTORY */}
        {activeTab === "history" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">

            {/* List of past results files */}
            <div className="lg:col-span-1 p-6 rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-md space-y-4 lg:sticky lg:top-24">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-zinc-950 dark:text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600 dark:text-sky-400" />
                    {t.historyTitle}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.historyDesc}</p>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {pastResultsList.length}
                </span>
              </div>

              {pastResultsList.length === 0 ? (
                <div className="text-zinc-500 dark:text-zinc-400 text-xs italic py-8 text-center bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  {t.noSavedResults}
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950 max-h-[calc(100vh-14rem)] overflow-y-auto">
                  {pastResultsList.map((file) => {
                    const isSelected = selectedResultFile === file.fileName;
                    return (
                      <button
                        key={file.fileName}
                        onClick={() => handleViewResult(file.fileName)}
                        className={`w-full text-left p-4 flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-indigo-50/80 dark:bg-indigo-950/60 ring-1 ring-indigo-500/50 shadow-xs"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">{file.fileName}</div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-mono">{new Date(file.mtime).toLocaleString()}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Results Dashboard visualization container */}
            <div className="lg:col-span-2">
              {selectedResultData ? (
                <ResultsDashboard
                  data={selectedResultData}
                  processType={selectedResultFile || ""}
                />
              ) : (
                <div className="p-12 rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-md text-center">
                  <FileJson className="w-12 h-12 text-zinc-400 dark:text-zinc-500 mx-auto mb-4" />
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{t.selectEvaluationTitle}</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t.selectEvaluationDesc}</p>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
