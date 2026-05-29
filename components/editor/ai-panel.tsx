"use client";

import {
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Sparkles,
  Send,
  Copy,
  Check,
  Plus,
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
import { MarkdownMessage } from "@/components/ui/markdown-message";
import { generateConversationTitle } from "@/lib/ai/conversations";
import { detectPreferredLanguageFromText } from "@/lib/ai/language";
import { AI_MODE_CONFIG } from "@/lib/ai/modes";
import { prepareResourcePayload } from "@/lib/resources/extract";
import {
  formatTokenCount,
  formatUsd,
  sumConversationUsages,
  sumUsageSnapshots,
} from "@/lib/ai/usage";
import { getPublicMediaUrl } from "@/lib/supabase/storage";
import { useProjectStore } from "@/lib/store";
import type {
  AIMode,
  AIRequestConfig,
  AIChatMessage,
  AIConversation,
  AIConversationWorkspace,
  AIVisualResourcePayload,
  ResourceFileType,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  generated_image: {
    label: "Imagen generada",
    variantClass: "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-700",
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
  if (workspace === "editorial" || workspace === "project") {
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

function getAttachmentFileType(name: string): ResourceFileType {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["txt", "md", "rtf"].includes(ext)) return "text";
  return "other";
}

function inferMediaTypeFromUrl(imageUrl: string) {
  const lower = imageUrl.toLowerCase();

  if (lower.startsWith("data:image/png")) return "image/png";
  if (lower.startsWith("data:image/webp")) return "image/webp";
  if (lower.startsWith("data:image/gif")) return "image/gif";
  if (lower.startsWith("data:image/jpeg") || lower.startsWith("data:image/jpg")) {
    return "image/jpeg";
  }
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function shouldAttachProjectImages(messageContent: string) {
  const normalized = messageContent.toLowerCase();

  return [
    "imagen",
    "imagenes",
    "image",
    "foto",
    "fotos",
    "captura",
    "capturas",
    "portada",
    "visual",
    "visuales",
    "referencia",
    "referencias",
    "recurso",
    "recursos",
    "adjunta",
    "adjuntas",
    "adjunto",
    "adjuntos",
    "ilustracion",
    "ilustración",
  ].some((signal) => normalized.includes(signal));
}

function shouldGenerateImage(messageContent: string, hasImageInputs: boolean) {
  const normalized = messageContent.toLowerCase();
  const imageTerms = [
    "imagen",
    "imágenes",
    "imagenes",
    "illustración",
    "ilustración",
    "ilustracion",
    "portada",
    "poster",
    "afiche",
    "concept art",
    "arte conceptual",
    "referencia visual",
    "visual",
  ];
  const actionTerms = [
    "genera",
    "genera",
    "crea",
    "crear",
    "haz",
    "diseña",
    "disena",
    "ilustra",
    "convierte",
    "edita",
    "editar",
    "modifica",
  ];
  const asksForImage = imageTerms.some((term) => normalized.includes(term));
  const asksForAction = actionTerms.some((term) => normalized.includes(term));
  const asksForEdit = ["edita", "editar", "modifica", "convierte", "usa esta imagen"].some((term) =>
    normalized.includes(term)
  );

  return (asksForImage && asksForAction) || (hasImageInputs && asksForEdit);
}

interface ComposerAttachment {
  id: string;
  name: string;
  fileType: ResourceFileType;
  extractedContent?: string;
  imageUrl?: string;
  mediaType?: string;
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
  compactMode?: boolean;
  externalPromptRequest?: {
    id: string;
    prompt: string;
    mode?: AIMode;
  };
  quickActions?: Array<{
    id: string;
    label: string;
    onClick: () => void;
  }>;
  presentation?: "default" | "clean-chat";
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
  compactMode = false,
  externalPromptRequest,
  quickActions = [],
  presentation = "default",
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
    getResourcesByProject,
  } = useProjectStore();
  const [prompt, setPrompt] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [composerAttachments, setComposerAttachments] = useState<ComposerAttachment[]>([]);
  const [isPreparingAttachments, setIsPreparingAttachments] = useState(false);
  const [isDragOverComposer, setIsDragOverComposer] = useState(false);
  const initialPromptSent = useRef(false);
  const lastExternalPromptId = useRef<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const cleanChatScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const modeCopy = fixedMode ? AI_MODE_CONFIG[fixedMode] : null;
  const isCleanChat = presentation === "clean-chat";
  const effectiveRequestConfig = useMemo<AIRequestConfig>(() => {
    const provider = customConfig?.provider || aiSettings.provider;

    if (provider === "openai") {
      return {
        provider,
        apiKey: customConfig?.apiKey || aiSettings.openaiKey,
        model: customConfig?.model,
        baseURL: customConfig?.baseURL,
      };
    }

    if (provider === "anthropic") {
      return {
        provider,
        apiKey: customConfig?.apiKey || aiSettings.anthropicKey,
        model: customConfig?.model,
        baseURL: customConfig?.baseURL,
      };
    }

    if (provider === "gemini") {
      return {
        provider,
        apiKey: customConfig?.apiKey || aiSettings.geminiKey,
        model: customConfig?.model,
        baseURL: customConfig?.baseURL,
      };
    }

    return {
      provider: "ollama",
      apiKey: customConfig?.apiKey || aiSettings.ollamaKey,
      baseURL: customConfig?.baseURL || aiSettings.ollamaBaseUrl,
      model: customConfig?.model || aiSettings.ollamaModel,
    };
  }, [
    aiSettings.anthropicKey,
    aiSettings.geminiKey,
    aiSettings.ollamaBaseUrl,
    aiSettings.ollamaKey,
    aiSettings.ollamaModel,
    aiSettings.openaiKey,
    aiSettings.provider,
    customConfig?.apiKey,
    customConfig?.baseURL,
    customConfig?.model,
    customConfig?.provider,
  ]);
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
  const projectVisualResources = useMemo<AIVisualResourcePayload[]>(() => {
    const visualResources: AIVisualResourcePayload[] = [];

    getResourcesByProject(projectId)
      .filter((resource) => resource.fileType === "image")
      .forEach((resource) => {
        const imageUrl = resource.fileData || getPublicMediaUrl(resource.mediaPath) || "";
        if (!imageUrl) {
          return;
        }

        visualResources.push({
          id: resource.id,
          name: resource.name,
          description: resource.description || undefined,
          imageUrl,
          mediaType: inferMediaTypeFromUrl(imageUrl),
        });
      });

    return visualResources.slice(0, 3);
  }, [getResourcesByProject, projectId]);

  const attachmentVisualResources = useMemo<AIVisualResourcePayload[]>(() => {
    return composerAttachments
      .filter((attachment) => attachment.fileType === "image" && attachment.imageUrl)
      .map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        imageUrl: attachment.imageUrl as string,
        mediaType: attachment.mediaType,
      }));
  }, [composerAttachments]);

  const attachmentTextContext = useMemo(() => {
    const readableAttachments = composerAttachments.filter((attachment) => attachment.extractedContent?.trim());
    if (readableAttachments.length === 0) return "";

    return `ARCHIVOS ADJUNTOS EN ESTE MENSAJE\n${readableAttachments
      .map(
        (attachment) =>
          `Archivo: ${attachment.name}\n${attachment.extractedContent?.trim()}`
      )
      .join("\n\n")}`;
  }, [composerAttachments]);

  const processComposerFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setIsPreparingAttachments(true);
    const nextAttachments: ComposerAttachment[] = [];

    for (const file of files) {
      const fileType = getAttachmentFileType(file.name);

      if (fileType === "other") {
        toast.error(`"${file.name}" no es compatible todavía.`, {
          description: "Por ahora puedes adjuntar PDF, TXT, MD, RTF, JPG o PNG.",
        });
        continue;
      }

      try {
        const payload = await prepareResourcePayload(file, fileType);
        const imageUrl =
          fileType === "image"
            ? payload.fileData
            : undefined;

        nextAttachments.push({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          name: file.name,
          fileType,
          extractedContent: payload.extractedContent,
          imageUrl,
          mediaType: imageUrl ? inferMediaTypeFromUrl(imageUrl) : undefined,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo preparar el archivo.";

        toast.error(`No se pudo adjuntar "${file.name}"`, {
          description: message,
        });
      }
    }

    setComposerAttachments((current) => {
      const merged = [...current];

      nextAttachments.forEach((attachment) => {
        if (!merged.some((item) => item.id === attachment.id)) {
          merged.push(attachment);
        }
      });

      return merged.slice(0, 6);
    });

    setIsPreparingAttachments(false);
  }, []);

  const handleAttachmentUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    await processComposerFiles(Array.from(files));
    event.target.value = "";
  }, [processComposerFiles]);

  const handleComposerPaste = useCallback(async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files || []);
    if (files.length === 0) return;

    event.preventDefault();
    await processComposerFiles(files);
  }, [processComposerFiles]);

  const handleComposerDrop = useCallback(async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOverComposer(false);

    const files = Array.from(event.dataTransfer.files || []);
    if (files.length === 0) return;

    await processComposerFiles(files);
  }, [processComposerFiles]);

  const handleComposerDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.types.includes("Files")) {
      setIsDragOverComposer(true);
    }
  }, []);

  const handleComposerDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setIsDragOverComposer(false);
  }, []);

  const removeComposerAttachment = useCallback((id: string) => {
    setComposerAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }, []);

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
  const canApplyToManuscript = workspace !== "project";
  const canUseCreativeTransforms = !disableCreativeTransforms && workspace !== "project";
  const mode = fixedMode ?? activeConversation?.mode ?? "copiloto";
  const isLoading = activeConversation?.isGenerating ?? false;
  const isCenteredEmpty = isCleanChat && messages.length === 0 && !isLoading;
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
    const messageContent =
      (messageOverride ?? prompt).trim() ||
      (composerAttachments.length > 0
        ? "Analiza los archivos adjuntos y ayúdame con lo más relevante para este proyecto."
        : "");
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
    const baseContextText = contextBuilder?.(messageContent) ?? contextText;
    const resolvedContextText = attachmentTextContext
      ? [baseContextText, attachmentTextContext].filter(Boolean).join("\n\n")
      : baseContextText;
    const shouldAttachImages =
      effectiveRequestConfig.provider !== "ollama" &&
      (projectVisualResources.length > 0 || attachmentVisualResources.length > 0) &&
      (shouldAttachProjectImages(messageContent) || attachmentVisualResources.length > 0);
    const visualResources = shouldAttachImages
      ? [...attachmentVisualResources, ...projectVisualResources].slice(0, 4)
      : undefined;
    const imageGeneration =
      effectiveRequestConfig.provider === "gemini" &&
      shouldGenerateImage(messageContent, attachmentVisualResources.length > 0);

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
      customConfig: effectiveRequestConfig,
      preferredLanguage,
      systemPrompt: systemPromptOverride || resolvedModeConfig.buildSystemPrompt(preferredLanguage),
      visualResources,
      imageGeneration,
    });
    setComposerAttachments([]);
  }, [activeConversation, attachmentTextContext, attachmentVisualResources, chapterId, chapterTitle, contextBuilder, contextText, createAIConversation, effectiveRequestConfig, ensureConversationTitle, fixedMode, projectId, projectTitle, projectVisualResources, prompt, requestAIResponse, systemPromptOverride, updateAIConversation, workspace]);

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

  useEffect(() => {
    if (!isCleanChat) return;

    const scroller = cleanChatScrollRef.current;
    const anchor = bottomAnchorRef.current;
    if (!scroller || !anchor) return;

    requestAnimationFrame(() => {
      anchor.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [isCleanChat, isLoading, messages.length]);

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

  const cleanChatConversationList = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/50 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">Chats del proyecto</p>
            <p className="text-xs text-muted-foreground">
              {showArchived ? "Archivados" : "Recientes"}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 rounded-full px-3 text-muted-foreground"
            onClick={handleNewConversation}
          >
            <MessageSquarePlus className="mr-1 h-3.5 w-3.5" />
            Nueva
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={!showArchived ? "secondary" : "ghost"}
            className="h-8 rounded-full px-3 text-xs"
            onClick={() => setShowArchived(false)}
          >
            Activas
          </Button>
          <Button
            type="button"
            size="sm"
            variant={showArchived ? "secondary" : "ghost"}
            className="h-8 rounded-full px-3 text-xs"
            onClick={() => setShowArchived(true)}
          >
            Archivadas
            {archivedConversations.length ? ` (${archivedConversations.length})` : ""}
          </Button>
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="space-y-2">
          {conversations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 px-4 py-5 text-sm text-muted-foreground">
              {showArchived
                ? "No hay conversaciones archivadas todavía."
                : "Empieza una conversación nueva para guardar el historial aquí."}
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setActiveConversationId(conversation.id);
                  setDraftTitle(conversation.title);
                  setEditingTitle(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveConversationId(conversation.id);
                    setDraftTitle(conversation.title);
                    setEditingTitle(false);
                  }
                }}
                className={cn(
                  "group w-full rounded-2xl border px-3 py-3 text-left transition-colors",
                  activeConversation?.id === conversation.id
                    ? "border-violet-500/30 bg-violet-500/10"
                    : "border-transparent bg-muted/20 hover:border-border/60 hover:bg-muted/35",
                  "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-5">
                    {conversation.title}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    {conversation.archivedAt ? (
                      <Badge variant="outline" className="px-1.5 py-0 text-[9px]">
                        Archivada
                      </Badge>
                    ) : null}
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-background/70 hover:text-destructive group-hover:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (activeConversationId === conversation.id) {
                          setActiveConversationId(null);
                          setEditingTitle(false);
                        }
                        deleteAIConversation(conversation.id);
                      }}
                      title="Eliminar chat"
                      aria-label="Eliminar chat"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {conversation.messages.length > 0
                    ? conversation.messages[conversation.messages.length - 1].content
                    : "Sin mensajes todavía"}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  if (isCleanChat) {
    return (
      <div
        className={cn(
          "grid h-full min-h-0 w-full grid-cols-1 gap-4 bg-transparent lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-0",
          className
        )}
      >
        <aside className="hidden h-[calc(100dvh-11rem)] min-h-0 self-start overflow-hidden rounded-[1.75rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,244,245,0.96))] shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.94))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] lg:sticky lg:top-6 lg:flex">
          {cleanChatConversationList}
        </aside>

        <div className="flex h-[calc(100dvh-11rem)] min-h-0 flex-col lg:pl-5">
          <div className="mb-3 flex items-center justify-end gap-2 lg:hidden">
            <Button
              type="button"
              size="sm"
              variant={showArchived ? "secondary" : "ghost"}
              className="h-8 rounded-full px-3 text-muted-foreground"
              onClick={() => setShowArchived((current) => !current)}
            >
              <Archive className="mr-1 h-3.5 w-3.5" />
              {showArchived ? "Activas" : `Archivadas${archivedConversations.length ? ` (${archivedConversations.length})` : ""}`}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-full px-3 text-muted-foreground"
              onClick={handleNewConversation}
            >
              <MessageSquarePlus className="mr-1 h-3.5 w-3.5" />
              Nueva
            </Button>
          </div>

          {/* Messages */}
          <div
            ref={cleanChatScrollRef}
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y px-0",
              isCenteredEmpty && "mt-[5vh] flex-none"
            )}
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div
              className={cn(
                "mx-auto w-full max-w-4xl space-y-8 px-0 py-6",
                isCenteredEmpty && "space-y-6 py-0"
              )}
            >
              {messages.length === 0 && (
                <div className="border-0 bg-transparent px-0 py-20 text-center text-muted-foreground">
                  <Sparkles className="mx-auto mb-5 h-10 w-10 text-violet-500/30" />
                  <p className="mx-auto max-w-3xl text-2xl font-medium leading-[1.28] text-foreground md:text-3xl">
                    {resolvedEmptyStateText}
                  </p>
                </div>
              )}

              {messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={cn(
                    msg.role === "user"
                      ? "ml-auto max-w-2xl rounded-[2rem] bg-muted/70 px-5 py-4"
                      : "mr-0 max-w-3xl bg-transparent px-0 py-0"
                  )}
                >
                  <div className={cn("flex items-start justify-between gap-2", msg.role === "assistant" && "mb-2")}>
                    <div className="mb-1.5 flex items-center gap-1.5">
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
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-background hover:text-foreground"
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
                  {msg.role === "assistant" ? (
                    <MarkdownMessage content={msg.content} />
                  ) : (
                    <p className="whitespace-pre-wrap text-[15px] leading-8">
                      {msg.content}
                    </p>
                  )}
                  {msg.generatedImage?.dataUrl ? (
                    <div className="mt-5 max-w-2xl overflow-hidden rounded-[1.75rem] border border-border/70 bg-background/40">
                      <img
                        src={msg.generatedImage.dataUrl}
                        alt={msg.generatedImage.prompt || "Imagen generada por IA"}
                        className="h-auto w-full object-cover"
                      />
                      <div className="px-4 py-3 text-xs text-muted-foreground">
                        {msg.generatedImage.resourceId
                          ? `Guardada en Recursos${msg.generatedImage.resourceName ? ` como “${msg.generatedImage.resourceName}”` : ""}.`
                          : "Imagen generada por IA."}
                      </div>
                    </div>
                  ) : null}
                  {msg.role === "assistant" && msg.responseType && (
                    <div className="mt-5 flex flex-wrap items-center gap-2">
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
                  {((canApplyToManuscript && shouldShowInsertionActions(msg)) ||
                    shouldShowContinueGenerating(msg, index, messages, isLoading) ||
                    shouldShowAppendToEndAction(msg, workspace) ||
                    (canUseCreativeTransforms && shouldShowConvertToScene(msg)) ||
                    (canUseCreativeTransforms && shouldShowRewriteAsProse(msg))) &&
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
                          <Sparkles className="mr-1 h-3 w-3" />
                          Seguir generando
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="mr-0 max-w-3xl border-0 bg-transparent px-0">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 animate-pulse text-violet-500" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {resolvedAssistantLabel}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-violet-500/50" style={{ animationDelay: "0ms" }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-violet-500/50" style={{ animationDelay: "150ms" }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-violet-500/50" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={bottomAnchorRef} />
            </div>
          </div>

          {/* Input */}
          <div className="shrink-0 border-t-0 bg-transparent px-0 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {typeof budgetProgress === "number" && !isCenteredEmpty ? (
              <div
                className={cn(
                  "mx-auto mb-3 w-full max-w-4xl rounded-full border bg-background/70 px-3 py-2.5",
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
                <Progress value={budgetProgress} className="gap-0" aria-label="Consumo de IA" />
              </div>
            ) : null}
            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.md,.rtf,.jpg,.jpeg,.png,.webp,.gif"
              className="hidden"
              onChange={(event) => {
                void handleAttachmentUpload(event);
              }}
            />
            {composerAttachments.length > 0 ? (
              <div className="mx-auto mb-3 flex w-full max-w-4xl flex-wrap gap-2">
                {composerAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1.5 text-[11px] text-muted-foreground"
                  >
                    <span className="max-w-[180px] truncate">{attachment.name}</span>
                    <button
                      type="button"
                      onClick={() => removeComposerAttachment(attachment.id)}
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={`Quitar ${attachment.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {messages.length > 0 && quickActions.length > 0 ? (
              <div className="mx-auto mb-3 flex w-full max-w-4xl gap-2 overflow-x-auto pb-1">
                {quickActions.map((action) => (
                  <Button
                    key={action.id}
                    type="button"
                    variant="ghost"
                    className="shrink-0 rounded-full border px-3 text-xs text-muted-foreground"
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : null}
            <div
              className={cn(
                "rounded-3xl transition-colors",
                isDragOverComposer && "bg-violet-500/8 ring-2 ring-violet-400/40 ring-offset-2 ring-offset-background",
                isCenteredEmpty && "mt-3"
              )}
              onDrop={(event) => {
                void handleComposerDrop(event);
              }}
              onDragOver={handleComposerDragOver}
              onDragLeave={handleComposerDragLeave}
            >
              <div className="mx-auto w-full max-w-5xl">
                <div className="flex items-end gap-3 rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] px-5 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:border-zinc-700/35 dark:bg-[linear-gradient(180deg,rgba(39,39,42,0.96),rgba(24,24,27,0.95))]">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mb-1 h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={isPreparingAttachments || isLoading}
                    aria-label="Adjuntar archivos"
                    title="Adjuntar archivos"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                  <Textarea
                    placeholder={resolvedInputPlaceholder}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onPaste={(event) => {
                      void handleComposerPaste(event);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                    className="min-h-12 flex-1 resize-none border-none !bg-transparent px-0 py-1 text-base leading-7 text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-none focus-visible:ring-0 dark:text-white dark:placeholder:text-zinc-500 dark:!bg-transparent"
                  />
                  <div className="shrink-0 pl-2">
                    <Button
                      onClick={() => {
                        void handleSend();
                      }}
                      size="icon"
                      disabled={(!prompt.trim() && composerAttachments.length === 0) || isLoading || isPreparingAttachments}
                      className="h-11 w-11 rounded-full bg-foreground text-background hover:bg-foreground/90 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-100"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {(isPreparingAttachments || composerAttachments.length > 0) && (
                  <div className="mt-3 flex items-center gap-2 px-2 text-xs text-muted-foreground">
                    {isPreparingAttachments ? (
                      <span>Preparando adjuntos...</span>
                    ) : (
                      <span>
                        {composerAttachments.length} adjunto{composerAttachments.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-[22rem] flex-col overflow-hidden border-l bg-card/72 backdrop-blur-xl",
        compactMode && "w-full border-l-0 bg-background/95 backdrop-blur-none",
        isCleanChat && "w-full border-l-0 bg-transparent backdrop-blur-none",
        isCenteredEmpty && "justify-start",
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "shrink-0 border-b bg-background/75 px-4 py-4",
          compactMode && "px-3 py-3",
          isCleanChat && "border-b-0 bg-transparent px-0 py-2"
        )}
      >
        {compactMode ? (
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-500">
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
        ) : isCleanChat ? (
          activeConversation || archivedConversations.length > 0 ? (
            <div className="mb-3 flex items-center justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant={showArchived ? "secondary" : "ghost"}
                className="h-8 rounded-full px-3 text-muted-foreground"
                onClick={() => setShowArchived((current) => !current)}
              >
                <Archive className="mr-1 h-3.5 w-3.5" />
                {showArchived ? "Activas" : `Archivadas${archivedConversations.length ? ` (${archivedConversations.length})` : ""}`}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 rounded-full px-3 text-muted-foreground"
                onClick={handleNewConversation}
              >
                <MessageSquarePlus className="mr-1 h-3.5 w-3.5" />
                Nueva
              </Button>
            </div>
          ) : null
        ) : (
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
        )}

        {activeConversation && (
          <div
            className={cn(
              "rounded-2xl border bg-card/55 p-3",
              compactMode && "p-2.5",
              isCleanChat && "rounded-3xl border-border/70 bg-background/70 p-3.5"
            )}
          >
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
              <ScrollArea className={cn("mt-3 max-h-28", compactMode && "mt-2 max-h-20")}>
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
      <ScrollArea
        className={cn(
          "min-h-0 flex-1 touch-pan-y",
          isCleanChat && "px-0",
          isCenteredEmpty && "mt-[5vh] flex-none"
        )}
      >
        <div
          className={cn(
            "space-y-4 px-4 py-4",
            isCleanChat && "mx-auto w-full max-w-4xl space-y-8 px-0 py-6",
            isCenteredEmpty && "space-y-6 py-0"
          )}
        >
          {messages.length === 0 && (
            <div
              className={cn(
                "rounded-2xl border border-dashed bg-muted/20 px-5 py-8 text-center text-muted-foreground",
                isCleanChat && "border-0 bg-transparent px-0 py-20"
              )}
            >
              <Sparkles className={cn("mx-auto mb-3 h-9 w-9 text-violet-500/30", isCleanChat && "mb-5 h-10 w-10")} />
              <p
                className={cn(
                  "text-sm leading-6",
                  isCleanChat && "mx-auto max-w-2xl text-3xl font-medium leading-tight text-foreground",
                  isCenteredEmpty && "max-w-3xl text-2xl leading-[1.28] md:text-3xl"
                )}
              >
                {resolvedEmptyStateText}
              </p>
              {quickActions.length > 0 && !isCenteredEmpty ? (
                <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-3">
                  {quickActions.map((action) => (
                    <Button
                      key={action.id}
                      type="button"
                      variant="outline"
                      className="rounded-full px-4"
                      onClick={action.onClick}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              ) : null}
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
                ,
                isCleanChat &&
                  (msg.role === "user"
                    ? "ml-auto mr-0 max-w-2xl rounded-[2rem] border-0 bg-muted/70 px-5 py-4 shadow-none"
                    : "mr-0 max-w-3xl border-0 bg-transparent px-0 py-0 shadow-none")
              )}
            >
              <div className={cn("flex items-start justify-between gap-2", isCleanChat && msg.role === "assistant" && "mb-2")}>
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
              {msg.role === "assistant" ? (
                <MarkdownMessage content={msg.content} />
              ) : (
                <p className={cn("whitespace-pre-wrap text-sm leading-7", isCleanChat && "text-[15px] leading-8")}>
                  {msg.content}
                </p>
              )}
              {msg.role === "assistant" && msg.responseType && (
                <div className={cn("mt-3 flex flex-wrap items-center gap-2", isCleanChat && "mt-5")}>
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
              {((canApplyToManuscript && shouldShowInsertionActions(msg)) ||
                shouldShowContinueGenerating(msg, index, messages, isLoading) ||
                shouldShowAppendToEndAction(msg, workspace) ||
                (canUseCreativeTransforms && shouldShowConvertToScene(msg)) ||
                (canUseCreativeTransforms && shouldShowRewriteAsProse(msg))) &&
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

                  {canApplyToManuscript && shouldShowInsertionActions(msg) && (
                    <>
                      {onReplaceSelection ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          onClick={() => onReplaceSelection(msg.content)}
                        >
                          <Replace className="h-3 w-3 mr-1" />
                          {workspace === "editorial" ? "Aplicar a selección" : "Reemplazar selección"}
                        </Button>
                      ) : null}
                      {onInsertAtCursor ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          onClick={() => onInsertAtCursor(msg.content)}
                        >
                          <BetweenHorizonalStart className="h-3 w-3 mr-1" />
                          {workspace === "editorial" ? "Insertar en cursor" : "Insertar aquí"}
                        </Button>
                      ) : null}
                      {onAppendToEnd ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          onClick={() => onAppendToEnd(msg.content)}
                        >
                          <ArrowDownToLine className="h-3 w-3 mr-1" />
                          {workspace === "editorial" ? "Añadir al final" : "Enviar al final"}
                        </Button>
                      ) : null}
                    </>
                  )}

                  {shouldShowAppendToEndAction(msg, workspace) && onAppendToEnd && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() => onAppendToEnd(msg.content)}
                    >
                      <ArrowDownToLine className="h-3 w-3 mr-1" />
                      Insertar al final
                    </Button>
                  )}

                  {canUseCreativeTransforms && shouldShowConvertToScene(msg) && (
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

                  {canUseCreativeTransforms && shouldShowRewriteAsProse(msg) && (
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
            <div className={cn("mr-4 rounded-2xl border bg-muted/65 p-3.5", isCleanChat && "mr-0 max-w-3xl border-0 bg-transparent px-0")}>
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
      <div
        className={cn(
          "shrink-0 border-t bg-background/82 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]",
          isCleanChat && "border-t-0 bg-transparent px-0 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
        )}
      >
        {typeof budgetProgress === "number" && !isCenteredEmpty ? (
          <div
            className={cn(
              "mb-3 rounded-2xl border bg-card/70 px-3 py-2.5",
              budgetState === "warning" && "border-amber-300 bg-amber-50/70 dark:bg-amber-500/10",
              budgetState === "exceeded" && "border-rose-300 bg-rose-50/70 dark:bg-rose-500/10",
              isCleanChat && "mx-auto w-full max-w-4xl rounded-full bg-background/70"
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
        <input
          ref={attachmentInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.rtf,.jpg,.jpeg,.png,.webp,.gif"
          className="hidden"
          onChange={(event) => {
            void handleAttachmentUpload(event);
          }}
        />
        {composerAttachments.length > 0 ? (
          <div className={cn("mb-3 flex flex-wrap gap-2", isCleanChat && "mx-auto w-full max-w-4xl")}>
            {composerAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1.5 text-[11px] text-muted-foreground"
              >
                <span className="max-w-[180px] truncate">{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => removeComposerAttachment(attachment.id)}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={`Quitar ${attachment.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {messages.length > 0 && quickActions.length > 0 && isCleanChat ? (
          <div className="mx-auto mb-3 flex w-full max-w-4xl gap-2 overflow-x-auto pb-1">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                type="button"
                variant="ghost"
                className="shrink-0 rounded-full border px-3 text-xs text-muted-foreground"
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}
        <div
          className={cn(
            "rounded-3xl transition-colors",
            isDragOverComposer && "bg-violet-500/8 ring-2 ring-violet-400/40 ring-offset-2 ring-offset-background",
            isCenteredEmpty && "mt-3"
          )}
          onDrop={(event) => {
            void handleComposerDrop(event);
          }}
          onDragOver={handleComposerDragOver}
          onDragLeave={handleComposerDragLeave}
        >
          {isCleanChat ? (
            <div className="mx-auto w-full max-w-5xl">
              <div className="flex items-end gap-3 rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] px-5 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:border-zinc-700/35 dark:bg-[linear-gradient(180deg,rgba(39,39,42,0.96),rgba(24,24,27,0.95))]">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mb-1 h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={isPreparingAttachments || isLoading}
                  aria-label="Adjuntar archivos"
                  title="Adjuntar archivos"
                >
                  <Plus className="h-5 w-5" />
                </Button>
                <Textarea
                  placeholder={resolvedInputPlaceholder}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onPaste={(event) => {
                    void handleComposerPaste(event);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  className="min-h-12 flex-1 resize-none border-none !bg-transparent px-0 py-1 text-base leading-7 text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-none focus-visible:ring-0 dark:text-white dark:placeholder:text-zinc-500 dark:!bg-transparent"
                />
                <div className="shrink-0 pl-2">
                  <Button
                    onClick={() => {
                      void handleSend();
                    }}
                    size="icon"
                    disabled={(!prompt.trim() && composerAttachments.length === 0) || isLoading || isPreparingAttachments}
                    className="h-11 w-11 rounded-full bg-foreground text-background hover:bg-foreground/90 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-100"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {(isPreparingAttachments || composerAttachments.length > 0) && (
                <div className="mt-3 flex items-center gap-2 px-2 text-xs text-muted-foreground">
                  {isPreparingAttachments ? (
                    <span>Preparando adjuntos...</span>
                  ) : (
                    <span>
                      {composerAttachments.length} adjunto{composerAttachments.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-[1.75rem] border bg-card/75 px-4 pt-3 pb-3">
                <Textarea
                  placeholder={resolvedInputPlaceholder}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onPaste={(event) => {
                    void handleComposerPaste(event);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={2}
                  className="min-h-20 w-full resize-none border-none bg-transparent px-0 pt-0 pb-2 text-sm shadow-none focus-visible:border-none focus-visible:ring-0"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:bg-background/70 hover:text-foreground"
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={isPreparingAttachments || isLoading}
                    aria-label="Adjuntar archivos"
                    title="Adjuntar archivos"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {fixedMode ? resolvedPanelTitle : "Auto"}
                  </Badge>
                  {isPreparingAttachments ? (
                    <span className="text-[11px] text-muted-foreground">Preparando adjuntos...</span>
                  ) : composerAttachments.length > 0 ? (
                    <span className="text-[11px] text-muted-foreground">
                      {composerAttachments.length} adjunto{composerAttachments.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
                <Button
                  onClick={() => {
                    void handleSend();
                  }}
                  size="sm"
                  disabled={(!prompt.trim() && composerAttachments.length === 0) || isLoading || isPreparingAttachments}
                  className="h-8 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 text-xs text-white"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Enviar
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
