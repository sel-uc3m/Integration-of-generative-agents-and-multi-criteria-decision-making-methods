"use client";

import React, { useState } from "react";
import { Code, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface FormattedMessageContentProps {
  content: string;
}

export default function FormattedMessageContent({ content }: FormattedMessageContentProps) {
  const { t } = useLanguage();
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);

  // Look for JSON blocks: either markdown fences ```json ... ``` or raw [ ... ] / { ... }
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
    content.match(/(\[\s*\{[\s\S]*\}\s*\])/) ||
    content.match(/(\{\s*"[\s\S]*"\s*:\s*[\s\S]*\})/);

  if (!jsonMatch) {
    // Standard plain text
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  const rawJsonString = jsonMatch[1] || jsonMatch[0];
  const startIndex = content.indexOf(rawJsonString);
  const beforeText = content.slice(0, startIndex).replace(/```(?:json)?\s*$/, "").trim();
  const endIndex = startIndex + rawJsonString.length;
  const afterText = content.slice(endIndex).replace(/^\s*```/, "").trim();

  // Try parsing JSON to count items or inspect type
  let parsedItemCount: number | null = null;
  try {
    const parsed = JSON.parse(rawJsonString);
    if (Array.isArray(parsed)) {
      parsedItemCount = parsed.length;
    } else if (parsed && typeof parsed === "object") {
      const keys = Object.keys(parsed);
      parsedItemCount = keys.length;
    }
  } catch {
    // If not strict JSON, treat as raw code block
  }

  // If JSON is very short (less than 120 chars), just display as inline code block
  if (rawJsonString.length < 120) {
    return (
      <div className="space-y-2">
        {beforeText && <div className="whitespace-pre-wrap">{beforeText}</div>}
        <pre className="p-2.5 rounded-xl bg-zinc-900 text-zinc-100 text-[11px] font-mono overflow-x-auto border border-zinc-800">
          {rawJsonString}
        </pre>
        {afterText && <div className="whitespace-pre-wrap">{afterText}</div>}
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(rawJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2.5">
      {beforeText && <div className="whitespace-pre-wrap leading-relaxed">{beforeText}</div>}

      {/* Compact Collapsible JSON Preview Pill */}
      <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/40 p-2.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-sky-200 min-w-0">
            <Code className="w-4 h-4 text-indigo-600 dark:text-sky-400 shrink-0" />
            <span className="truncate">
              {parsedItemCount !== null ? t.structuredDataItems(parsedItemCount) : t.structuredDataLines(rawJsonString.split('\n').length)}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
              title={t.copyRawJson}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-sky-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              <span>{showRawJson ? t.hideJson : t.viewJson}</span>
              {showRawJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {showRawJson && (
          <pre className="mt-2.5 p-3 rounded-lg bg-zinc-950 text-zinc-200 text-[11px] font-mono overflow-x-auto max-h-56 overflow-y-auto border border-zinc-800/80">
            {rawJsonString}
          </pre>
        )}
      </div>

      {afterText && <div className="whitespace-pre-wrap leading-relaxed">{afterText}</div>}
    </div>
  );
}
