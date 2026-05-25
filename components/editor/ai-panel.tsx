"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Sparkles,
  Send,
  Copy,
  Check,
  ArrowDownToLine,
  BetweenHorizonalStart,
  Replace,
  MessageSquarePlus,
  Pencil,
  X,
  Trash2,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { generateConversationTitle } from "@/lib/ai/conversations";
import { detectPreferredLanguageFromText } from "@/lib/ai/language";
import { AI_MODE_CONFIG } from "@/lib/ai/modes";
import {
  formatTokenCount,
  formatUsd,
  sumConversationUsages,
  sumUsageSnapshots,
} from "@/lib/ai/usage";
import { useProjectStore } from "@/lib/store";
import type {
  AIMode,
  AIRequestConfig,
  AIChatMessage,
  AIConversation,
  AIConversationWorkspace,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const RESPONSE_TYPE_META: Record<
  NonNullable<AIChatMessage["responseType"]>,
  { label: string; variantClass: string }
> = {
  narrative_text: {
    label: "Fragmento para el manuscrito",
    variantClass: "border-violet-500/20 bg-violet-500/10 text-violet-700",
  },
  rewrite: {
    label: "Reescritura",
    variantClass: "border-sky-500/20 bg-sky-500/10 text-sky-700",
  },
  ideas_list: {
    label: "Ideas",
    variantClass: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  },
  analysis: {
    label: "Análisis",
    variantClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  },
  qa: {
    label: "Respuesta",
    variantClass: "border-muted bg-muted/50 text-foreground",
  },
};

function inferAIModeFromPrompt(text: string): AIMode {
  const normalized = text.toLowerCase().trim();

  if (
    /(revisa|revision|revisión|corrige|analiza|analisis|análisis|coherencia|tono|ritmo|mejora|mejorar)/.test(
      normalized
    )
  ) {
    return "revision";
  }

  if (
    /(ideas|brainstorm|lluvia de ideas|variantes|opciones|giros|conflictos|nombres|alternativas)/.test(
      normalized
    )
  ) {
    return "ideas";
  }

  if (
    /(continúa|continua|escribe|redacta|genera|escena|capítulo|capitulo|diálogo|dialogo|prosa|borrador|reescribe)/.test(
      normalized
    )
  ) {
    return "piloto";
  }

  return "copiloto";
}

function shouldShowInsertionActions(message: AIChatMessage) {
  return (
    message.role === "assistant" &&
    message.insertable === true &&
    (message.responseType === "narrative_text" || message.responseType === "rewrite")
  );
}

function shouldShowAppendToEndAction(
  message: AIChatMessage,
  workspace?: AIConversationWorkspace
) {
  if (workspace === "editorial") {
    return false;
  }

  return (
    message.role === "assistant" &&
    message.content.trim().length > 0 &&
    !shouldShowInsertionActions(message) &&
    (message.responseType === "ideas_list" || message.responseType === "analysis" || message.responseType === "qa")
  );
}

function shouldShowConvertToScene(message: AIChatMessage) {
  return (
    message.role === "assistant" &&
    (message.responseType === "ideas_list" || message.responseType === "analysis" || message.responseType === "qa")
  );
}

function shouldShowRewriteAsProse(message: AIChatMessage) {
  return (
    message.role === "assistant" &&
    (message.responseType === "analysis" || message.responseType === "ideas_list")
  );
}

function shouldShowContinueGenerating(
  message: AIChatMessage,
  index: number,
  messages: AIChatMessage[],
  isLoading: boolean
) {
  return (
    !isLoading &&
    message.role === "assistant" &&
    message.content.trim().length > 0 &&
    index === messages.length - 1
  );
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, value));
}

interface AIPanelProps {
  visible: boolean;
  projectId: string;
  chapterId?: string;
  workspace?: AIConversationWorkspace;
  projectTitle?: string;
  chapterTitle?: string;
  initialPrompt?: string;
  contextText?: string;
  contextBuilder?: (messageContent: string) => string;
  customConfig?: AIRequestConfig;
  fixedMode?: AIMode;
  systemPromptOverride?: string;
  panelTitle?: string;
  panelDescription?: string;
  assistantLabel?: string;
  inputPlaceholder?: string;
  emptyStateText?: string;
  disableCreativeTransforms?: boolean;
  externalPromptRequest?: {
    id: string;
    prompt: string;
    mode?: AIMode;
  };
  className?: string;
  onInsertAtCursor?: (text: string) => void;
  onAppendToEnd?: (text: string) => void;
  onReplaceSelection?: (text: string) => void;
}

export function AIPanel({
  visible,
  projectId,
  chapterId,
  workspace = "writing",
  projectTitle,
  chapterTitle,
  initialPrompt,
  contextText,
  contextBuilder,
  customConfig,
  fixedMode,
  systemPromptOverride,
  panelTitle,
  assistantLabel,
  inputPlaceholder,
  emptyStateText,
  disableCreativeTransforms = false,
  externalPromptRequest,
  className,
  onInsertAtCursor,
  onAppendToEnd,
  onReplaceSelection,
}: AIPanelProps) {
  const {
    aiConversations,
    aiSettings,
    createAIConversation,
    updateAIConversation,
    deleteAIConversation,
    requestAIResponse,
  } = useProjectStore();
  const [prompt, setPrompt] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const initialPromptSent = useRef(false);
  const lastExternalPromptId = useRef<string | null>(null);
  const modeCopy = fixedMode ? AI_MODE_CONFIG[fixedMode] : null;
  const resolvedPanelTitle =
    panelTitle || (workspace === "editorial" ? "IA editorial" : "IA");
  const resolvedAssistantLabel =
    assistantLabel || (workspace === "editorial" ? "Editor IA" : "Péndola IA");
  const resolvedInputPlaceholder =
    inputPlaceholder ||
    modeCopy?.placeholder ||
    "Escribe lo que necesitas: continuar, revisar, reescribir o pedir ideas...";
  const resolvedEmptyStateText =
    emptyStateText ||
    modeCopy?.emptyState ||
    "Describe lo que necesitas: continuar, revisar, reescribir o pedir ideas. La IA adaptará su ayuda automáticamente.";
  const responseTypeMeta = useMemo(() => {
    if (workspace !== "editorial") {
      return RESPONSE_TYPE_META;
    }

    return {
      ...RESPONSE_TYPE_META,
      narrative_text: {
        label: "Texto corregido",
        variantClass: "border-violet-500/20 bg-violet-500/10 text-violet-700",
      },
      rewrite: {
        label: "Corrección editorial",
        variantClass: "border-sky-500/20 bg-sky-500/10 text-sky-700",
      },
      analysis: {
        label: "Informe editorial",
        variantClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
      },
    };
  }, [workspace]);

  const allConversations = useMemo(
    () =>
      aiConversations
        .filter((conversation) => {
          if (conversation.projectId !== projectId) return false;
          if ((conversation.workspace || "writing") !== workspace) return false;
          return conversation.chapterId === chapterId;
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [aiConversations, chapterId, projectId, workspace]
  );
  const activeConversations = useMemo(
    () => allConversations.filter((conversation) => !conversation.archivedAt),
    [allConversations]
  );
  const archivedConversations = useMemo(
    () => allConversations.filter((conversation) => conversation.archivedAt),
    [allConversations]
  );
  const conversations = showArchived ? archivedConversations : activeConversations;

  const activeConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === activeConversationId) ??
      conversations[0] ??
      null,
    [activeConversationId, conversations]
  );

  const messages = activeConversation?.messages ?? [];
  const mode = fixedMode ?? activeConversation?.mode ?? "copiloto";
  const isLoading = activeConversation?.isGenerating ?? false;
  const conversationUsage = useMemo(
    () =>
      sumUsageSnapshots(
        messages
          .filter((message) => message.role === "assistant")
          .map((message) => message.usage)
      ),
    [messages]
  );
  const globalUsage = useMemo(
    () =>
      sumConversationUsages(aiConversations, {
        since: aiSettings.budgetCycleStartedAt,
      }),
    [aiConversations, aiSettings.budgetCycleStartedAt]
  );
  const budgetUsd =
    typeof aiSettings.monthlyBudgetUsd === "number" && aiSettings.monthlyBudgetUsd > 0
      ? aiSettings.monthlyBudgetUsd
      : undefined;
  const budgetProgress =
    budgetUsd && typeof globalUsage?.estimatedCostUsd === "number"
      ? clampProgress((globalUsage.estimatedCostUsd / budgetUsd) * 100)
      : undefined;
  const budgetState =
    typeof budgetProgress !== "number"
      ? "idle"
      : budgetProgress >= 100
      ? "exceeded"
      : budgetProgress >= 80
      ? "warning"
      : "ok";
  const ensureConversationTitle = useCallback(
    (
      conversation: AIConversation,
      messageContent: string,
      nextMode: AIMode
    ) => {
      if (conversation.title !== "Nueva conversación") return;
      updateAIConversation(conversation.id, {
        title: generateConversationTitle({
          prompt: messageContent,
          chapterTitle,
          mode: nextMode,
        }),
      });
    },
    [chapterTitle, updateAIConversation]
  );

  const handleSend = useCallback(async (messageOverride?: string, modeOverride?: AIMode) => {
    const messageContent = (messageOverride ?? prompt).trim();
    if (!messageContent) return;

    let targetConversation = activeConversation;
    if (!targetConversation) {
      targetConversation = createAIConversation({
        projectId,
        chapterId,
        workspace,
        title: "Nueva conversación",
        mode: fixedMode || "copiloto",
      });
      setActiveConversationId(targetConversation.id);
      setDraftTitle(targetConversation.title);
    }

    if (targetConversation.isGenerating) return;

    const resolvedMode = modeOverride || fixedMode || inferAIModeFromPrompt(messageContent);
    const resolvedModeConfig = AI_MODE_CONFIG[resolvedMode];
    const preferredLanguage = detectPreferredLanguageFromText(messageContent);
    const resolvedContextText = contextBuilder?.(messageContent) ?? contextText;

    updateAIConversation(targetConversation.id, { mode: resolvedMode });
    ensureConversationTitle(targetConversation, messageContent, resolvedMode);
    if (!messageOverride) {
      setPrompt("");
    }

    await requestAIResponse({
      conversationId: targetConversation.id,
      messageContent,
      mode: resolvedMode,
      projectTitle,
      chapterTitle,
      contextText: resolvedContextText,
      customConfig,
      preferredLanguage,
      systemPrompt: systemPromptOverride || resolvedModeConfig.buildSystemPrompt(preferredLanguage),
    });
  }, [activeConversation, chapterId, chapterTitle, contextBuilder, contextText, createAIConversation, customConfig, ensureConversationTitle, fixedMode, projectId, projectTitle, prompt, requestAIResponse, systemPromptOverride, updateAIConversation, workspace]);

  useEffect(() => {
    if (!visible || !initialPrompt || initialPromptSent.current) return;
    initialPromptSent.current = true;
    const timeoutId = window.setTimeout(() => {
      void handleSend(initialPrompt);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [handleSend, initialPrompt, visible]);

  useEffect(() => {
    if (!visible || !externalPromptRequest) return;
    if (lastExternalPromptId.current === externalPromptRequest.id) return;

    lastExternalPromptId.current = externalPromptRequest.id;
    const timeoutId = window.setTimeout(() => {
      void handleSend(externalPromptRequest.prompt, externalPromptRequest.mode);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [externalPromptRequest, handleSend, visible]);

  const handleCopy = (messageId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId((current) => (current === messageId ? null : current)), 2000);
  };

  const handleNewConversation = () => {
    const created = createAIConversation({
      projectId,
      chapterId,
      workspace,
      title: "Nueva conversación",
      mode: fixedMode || mode,
    });
    setShowArchived(false);
    setActiveConversationId(created.id);
    setDraftTitle(created.title);
    setEditingTitle(false);
    initialPromptSent.current = false;
  };

  const handleSaveTitle = () => {
    if (!activeConversation) return;
    const nextTitle = draftTitle.trim() || "Nueva conversación";
    updateAIConversation(activeConversation.id, { title: nextTitle });
    setDraftTitle(nextTitle);
    setEditingTitle(false);
  };

  const handleCancelTitleEdit = () => {
    if (!activeConversation) return;
    setDraftTitle(activeConversation.title);
    setEditingTitle(false);
  };

  const handleTransformRequest = (instruction: string, sourceContent: string) => {
    const transformPrompt = `${instruction}\n\nBase para transformar:\n${sourceContent}`;
    void handleSend(transformPrompt);
  };

  const handleToggleArchive = () => {
    if (!activeConversation) return;

    const nextArchivedAt = activeConversation.archivedAt
      ? undefined
      : new Date().toISOString();

    updateAIConversation(activeConversation.id, {
      archivedAt: nextArchivedAt,
    });

    if (!activeConversation.archivedAt) {
      setActiveConversationId(null);
      setEditingTitle(false);
      setShowArchived(false);
    }
  };

  const handleContinueGenerating = (sourceContent: string) => {
    const continuePrompt = `Continúa exactamente desde donde se cortó tu respuesta anterior.

Reglas:
- No repitas nada de lo ya escrito.
- No reinicies la explicación.
- Sigue desde la última idea incompleta o desde la última opción abierta.
- Si estabas desarrollando una lista de opciones, termina primero la opción en curso y luego continúa con las siguientes.
- Entrega solo la continuación, en el mismo tono y formato.`;

    void handleSend(`${continuePrompt}\n\nTexto ya generado:\n${sourceContent}`, mode);
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-[22rem] flex-col overflow-hidden border-l bg-card/72 backdrop-blur-xl",
        className
      )}
    >
      {/* Header */}
      <div className="shrink-0 border-b bg-background/75 px-4 py-4">
        <div className="mb-4 rounded-2xl border bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.88))] p-4 dark:bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.18),transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.9),rgba(15,23,42,0.84))]">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-500">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-semibold">{resolvedPanelTitle}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={showArchived ? "secondary" : "outline"}
                className="h-8 rounded-xl px-2.5"
                onClick={() => setShowArchived((current) => !current)}
              >
                <Archive className="mr-1 h-3.5 w-3.5" />
                {showArchived ? "Activas" : `Archivadas ${archivedConversations.length ? `(${archivedConversations.length})` : ""}`}
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-8 rounded-xl px-2.5" onClick={handleNewConversation}>
                <MessageSquarePlus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

        </div>

        {activeConversation && (
          <div className="rounded-2xl border bg-card/55 p-3">
            <div className="flex items-center gap-2">
              {editingTitle ? (
                <>
                  <Input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleSaveTitle();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        handleCancelTitleEdit();
                      }
                    }}
                    className="h-9 rounded-xl text-xs"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={handleSaveTitle}
                    title="Guardar título"
                    aria-label="Guardar título"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={handleCancelTitleEdit}
                    title="Cancelar edición"
                    aria-label="Cancelar edición"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium"
                  onClick={() => {
                    setDraftTitle(activeConversation.title);
                    setEditingTitle(true);
                  }}
                >
                  {activeConversation.title}
                </button>
              )}
              {!editingTitle && (
                <>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setDraftTitle(activeConversation.title);
                      setEditingTitle(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={handleToggleArchive}
                    title={activeConversation.archivedAt ? "Mover a activas" : "Archivar conversación"}
                    aria-label={activeConversation.archivedAt ? "Mover a activas" : "Archivar conversación"}
                  >
                    {activeConversation.archivedAt ? (
                      <ArchiveRestore className="h-3.5 w-3.5" />
                    ) : (
                      <Archive className="h-3.5 w-3.5" />
                    )}
                  </button>
                </>
              )}
              {activeConversation && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    deleteAIConversation(activeConversation.id);
                    setActiveConversationId(null);
                    setEditingTitle(false);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {conversations.length > 0 && (
              <ScrollArea className="mt-3 max-h-28">
                <div className="space-y-1.5">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => {
                        setActiveConversationId(conversation.id);
                        setDraftTitle(conversation.title);
                        setEditingTitle(false);
                      }}
                      className={cn(
                        "w-full rounded-xl px-3 py-2 text-left text-xs transition-colors",
                        conversation.id === activeConversation.id
                          ? "bg-violet-500/10 text-foreground"
                          : "text-muted-foreground hover:bg-accent"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium">{conversation.title}</p>
                        {conversation.archivedAt ? (
                          <Badge variant="outline" className="px-1.5 py-0 text-[9px]">
                            Archivada
                          </Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-[11px] opacity-80">
                        {conversation.messages.length > 0
                          ? conversation.messages[conversation.messages.length - 1].content
                          : "Sin mensajes todavía"}
                      </p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

      </div>

      {/* Messages */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 px-4 py-4">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-dashed bg-muted/20 px-5 py-8 text-center text-muted-foreground">
              <Sparkles className="mx-auto mb-3 h-9 w-9 text-violet-500/30" />
              <p className="text-sm leading-6">
                {resolvedEmptyStateText}
              </p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={msg.id}
              className={cn(
                "rounded-2xl p-3.5 text-sm shadow-sm",
                msg.role === "user"
                  ? "ml-4 border border-violet-500/12 bg-violet-500/10"
                  : "mr-4 border bg-muted/70"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  {msg.role === "assistant" ? (
                    <Sparkles className="h-3 w-3 text-violet-500" />
                  ) : null}
                  <span className="text-xs font-medium text-muted-foreground">
                    {msg.role === "user" ? "Tú" : resolvedAssistantLabel}
                  </span>
                </div>
                {msg.role === "assistant" && (
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-background hover:text-foreground cursor-pointer"
                    title="Copiar respuesta"
                    aria-label="Copiar respuesta"
                  >
                    {copiedMessageId === msg.id ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-7">
                {msg.content}
              </p>
              {msg.role === "assistant" && msg.responseType && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2 py-1 text-[10px] font-medium",
                      responseTypeMeta[msg.responseType].variantClass
                    )}
                  >
                    {responseTypeMeta[msg.responseType].label}
                  </span>
                  {msg.usage ? (
                    <span className="inline-flex rounded-full border border-border/70 bg-background/60 px-2 py-1 text-[10px] text-muted-foreground">
                      {msg.usage.source === "cache" ? "Cache" : `${formatTokenCount(msg.usage.totalTokens)} tok`}
                      {typeof msg.usage.estimatedCostUsd === "number"
                        ? ` · ${formatUsd(msg.usage.estimatedCostUsd)}`
                        : ""}
                    </span>
                  ) : null}
                </div>
              )}
              {(shouldShowInsertionActions(msg) ||
                shouldShowContinueGenerating(msg, index, messages, isLoading) ||
                shouldShowAppendToEndAction(msg, workspace) ||
                (!disableCreativeTransforms && shouldShowConvertToScene(msg)) ||
                (!disableCreativeTransforms && shouldShowRewriteAsProse(msg))) &&
                msg.content.trim() && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {shouldShowContinueGenerating(msg, index, messages, isLoading) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() => handleContinueGenerating(msg.content)}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Seguir generando
                    </Button>
                  )}

                  {shouldShowInsertionActions(msg) && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={() => onReplaceSelection?.(msg.content)}
                      >
                        <Replace className="h-3 w-3 mr-1" />
                        {workspace === "editorial" ? "Aplicar a selección" : "Reemplazar selección"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={() => onInsertAtCursor?.(msg.content)}
                      >
                        <BetweenHorizonalStart className="h-3 w-3 mr-1" />
                        {workspace === "editorial" ? "Insertar en cursor" : "Insertar aquí"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={() => onAppendToEnd?.(msg.content)}
                      >
                        <ArrowDownToLine className="h-3 w-3 mr-1" />
                        {workspace === "editorial" ? "Añadir al final" : "Enviar al final"}
                      </Button>
                    </>
                  )}

                  {shouldShowAppendToEndAction(msg, workspace) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() => onAppendToEnd?.(msg.content)}
                    >
                      <ArrowDownToLine className="h-3 w-3 mr-1" />
                      Insertar al final
                    </Button>
                  )}

                  {!disableCreativeTransforms && shouldShowConvertToScene(msg) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() =>
                        handleTransformRequest(
                          "Convierte esta respuesta en una escena breve, narrativa y lista para insertarse en el capítulo actual. No expliques el proceso; entrega solo el texto narrativo.",
                          msg.content
                        )
                      }
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Reescribir como escena
                    </Button>
                  )}

                  {!disableCreativeTransforms && shouldShowRewriteAsProse(msg) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() =>
                        handleTransformRequest(
                          "Reescribe esta respuesta como prosa narrativa fluida y utilizable dentro del capítulo actual. No des análisis; entrega solo el texto resultante.",
                          msg.content
                        )
                      }
                    >
                      <Replace className="h-3 w-3 mr-1" />
                      Reescribir como prosa
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="mr-4 rounded-2xl border bg-muted/65 p-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-3 w-3 text-violet-500 animate-pulse" />
                <span className="text-xs font-medium text-muted-foreground">
                  {resolvedAssistantLabel}
                </span>
              </div>
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-violet-500/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 rounded-full bg-violet-500/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 rounded-full bg-violet-500/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="shrink-0 border-t bg-background/82 p-3">
        {typeof budgetProgress === "number" ? (
          <div
            className={cn(
              "mb-3 rounded-2xl border bg-card/70 px-3 py-2.5",
              budgetState === "warning" && "border-amber-300 bg-amber-50/70 dark:bg-amber-500/10",
              budgetState === "exceeded" && "border-rose-300 bg-rose-50/70 dark:bg-rose-500/10"
            )}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>Consumo de IA</span>
              <span>
                {formatUsd(globalUsage?.estimatedCostUsd)} / {formatUsd(budgetUsd)}
              </span>
            </div>
            <Progress
              value={budgetProgress}
              className="gap-0"
              aria-label="Consumo de IA"
            />
            {budgetState === "warning" ? (
              <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
                Vas por encima del 80% de tu presupuesto de referencia.
              </p>
            ) : null}
            {budgetState === "exceeded" ? (
              <p className="mt-2 text-[11px] text-rose-700 dark:text-rose-300">
                Ya superaste tu presupuesto de referencia. Puedes reiniciar el medidor desde Ajustes / Perfil.
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="flex gap-2">
          <Textarea
            placeholder={resolvedInputPlaceholder}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={2}
            className="min-h-24 flex-1 resize-none rounded-2xl bg-card/75 text-sm"
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {fixedMode ? resolvedPanelTitle : "Auto"}
          </Badge>
          <Button
            onClick={() => {
              void handleSend();
            }}
            size="sm"
            disabled={!prompt.trim() || isLoading}
            className="h-8 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 text-xs text-white"
          >
            <Send className="h-3 w-3 mr-1" />
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
