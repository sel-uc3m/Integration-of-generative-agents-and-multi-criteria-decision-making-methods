import type { VerbosityMode } from "./types.js";

let currentMode: VerbosityMode = "verbose";
const originalConsoleLog = console.log.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleError = console.error.bind(console);

const NODE_COLOR_PALETTE = [
  25,
  31,
  37,
  38,
  44,
  45,
  51,
  73,
  74,
  75,
  80,
  81,
  87,
  111,
];

const RESET = "\x1b[0m";

type ConsoleChannel = "log" | "warn" | "error";

function supportsColor(): boolean {
  return Boolean(process.stdout.isTTY);
}

function colorize(message: string, colorCode: number): string {
  if (!supportsColor()) return message;
  return `\x1b[38;5;${colorCode}m${message}${RESET}`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function colorForNode(nodeName: string): number {
  const index = hashString(nodeName) % NODE_COLOR_PALETTE.length;
  return NODE_COLOR_PALETTE[index];
}

function colorizeLeadingTag(message: string, tag: string, colorCode: number): string {
  if (!message.startsWith(tag)) return message;
  return `${colorize(tag, colorCode)}${message.slice(tag.length)}`;
}

function formatMessage(channel: ConsoleChannel, message: string): string {
  const traceNodeMatch = message.match(/^(\[Trace\])(\[([^\]]+)\])(.*)$/);
  if (traceNodeMatch) {
    const tracePrefix = traceNodeMatch[1];
    const nodeTag = traceNodeMatch[2];
    const nodeName = traceNodeMatch[3];
    const rest = traceNodeMatch[4];
    return `${tracePrefix}${colorize(nodeTag, colorForNode(nodeName))}${rest}`;
  }

  if (message.startsWith("[LLM]")) return colorizeLeadingTag(message, "[LLM]", 81);
  if (message.startsWith("[Scripted]")) return colorizeLeadingTag(message, "[Scripted]", 75);
  if (message.startsWith("[Log/System]")) return colorizeLeadingTag(message, "[Log/System]", 39);
  if (message.startsWith("[Log/Graph]")) return colorizeLeadingTag(message, "[Log/Graph]", 45);
  if (message.startsWith("[Log/Tasks]")) return colorizeLeadingTag(message, "[Log/Tasks]", 69);
  if (message.startsWith("[Log/Output]")) return colorizeLeadingTag(message, "[Log/Output]", 33);
  if (message.startsWith("[Error]")) return colorizeLeadingTag(message, "[Error]", 196);

  if (channel === "warn") return colorize(message, 220);
  if (channel === "error") return colorize(message, 196);
  return message;
}

function formatArgs(channel: ConsoleChannel, args: unknown[]): unknown[] {
  if (args.length === 0) return args;
  const [first, ...rest] = args;
  if (typeof first !== "string") return args;
  return [formatMessage(channel, first), ...rest];
}

function shouldSuppressLog(channel: ConsoleChannel, message: unknown): boolean {
  if (currentMode === "verbose") return false;
  if (channel === "warn" || channel === "error") return false;
  if (typeof message !== "string") return false;
  return (
    message.startsWith("[Trace]") ||
    message.startsWith("[LLM]") ||
    message.startsWith("[Scripted]") ||
    message.startsWith("[Log/Tasks]") ||
    message.startsWith("[Log/Stream]")
  );
}

export function setVerbosityMode(mode: VerbosityMode) {
  currentMode = mode;
  console.log = (...args: unknown[]) => {
    if (shouldSuppressLog("log", args[0])) return;
    originalConsoleLog(...formatArgs("log", args));
  };

  console.warn = (...args: unknown[]) => {
    if (shouldSuppressLog("warn", args[0])) return;
    originalConsoleWarn(...formatArgs("warn", args));
  };

  console.error = (...args: unknown[]) => {
    if (shouldSuppressLog("error", args[0])) return;
    originalConsoleError(...formatArgs("error", args));
  };
}

export function createLogger() {
  return {
    info(message: string) {
      console.log(message);
    },
    verbose(message: string) {
      if (currentMode === "verbose") console.log(message);
    },
    warn(message: string) {
      console.warn(message);
    },
    error(message: string, error?: unknown) {
      if (error === undefined) {
        console.error(message);
        return;
      }
      console.error(message, error);
    },
  };
}
