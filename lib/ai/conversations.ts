import type { AIMode } from "@/lib/types";

function toSentenceCase(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizePrompt(prompt: string) {
  return prompt
    .replace(/\s+/g, " ")
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .trim();
}

function trimTitle(value: string, max = 52) {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trim()}...`;
}

export function generateConversationTitle({
  prompt,
  chapterTitle,
  mode,
  isGlobal = false,
}: {
  prompt: string;
  chapterTitle?: string;
  mode: AIMode;
  isGlobal?: boolean;
}) {
  const normalizedPrompt = normalizePrompt(prompt);

  const modePrefix =
    mode === "revision"
      ? "Revision"
      : mode === "ideas"
      ? "Ideas"
      : mode === "editorial"
      ? "Editorial"
      : mode === "piloto"
      ? "Escritura"
      : "Copiloto";

  if (!normalizedPrompt) {
    if (chapterTitle) return `${modePrefix}: ${chapterTitle}`;
    return isGlobal ? `${modePrefix}: Proyecto` : "Nueva conversación";
  }

  const compactPrompt = trimTitle(toSentenceCase(normalizedPrompt));
  if (chapterTitle) return `${modePrefix}: ${chapterTitle} · ${compactPrompt}`;
  if (isGlobal) return `${modePrefix}: ${compactPrompt}`;
  return compactPrompt;
}
