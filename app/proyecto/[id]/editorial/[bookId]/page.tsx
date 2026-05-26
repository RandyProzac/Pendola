"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  Copy,
  Download,
  FileText,
  History,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  NarrativeEditor,
  type NarrativeEditorHandle,
} from "@/components/editor/narrative-editor";
import { ChapterVersionsDialog } from "@/components/editor/chapter-versions-dialog";
import { AIPanel } from "@/components/editor/ai-panel";
import { buildNarrativeContext } from "@/lib/ai/context";
import { buildAIRequestConfig } from "@/lib/ai/provider";
import {
  buildBookTextExport,
  buildChapterTextExport,
  buildFilename,
  downloadBlob,
  downloadText,
  exportBookAsDocx,
  exportChapterAsDocx,
} from "@/lib/export/manuscript";
import { consumeRecoveryNotice, setRecoveryNotice } from "@/lib/persistence/recovery";
import { PENDOLA_STORAGE_ERROR_EVENT } from "@/lib/persistence/storage-adapter";
import {
  makeEditorialBookPath,
  makeProjectPath,
  resolveEntityId,
} from "@/lib/routing";
import { useProjectStore } from "@/lib/store";
import type { SaveStatus } from "@/lib/types";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string; bookId: string }>;
}

type EditorialQuickActionKey =
  | "ortografia_rae"
  | "estilo"
  | "claridad"
  | "ritmo"
  | "informe_editorial"
  | "pulido_integral";

const EDITORIAL_QUICK_ACTIONS: Array<{
  key: EditorialQuickActionKey;
  label: string;
  shortLabel: string;
}> = [
  { key: "ortografia_rae", label: "Ortografía RAE", shortLabel: "Ortografía RAE" },
  { key: "estilo", label: "Estilo", shortLabel: "Estilo" },
  { key: "claridad", label: "Claridad", shortLabel: "Claridad" },
  { key: "ritmo", label: "Ritmo", shortLabel: "Ritmo" },
  { key: "informe_editorial", label: "Informe editorial", shortLabel: "Informe" },
  { key: "pulido_integral", label: "Pulido integral", shortLabel: "Pulido integral" },
];

function buildEditorialSystemPrompt(editorialInstructions?: string) {
  const projectCriteria = editorialInstructions?.trim()
    ? `CRITERIO EDITORIAL DEL PROYECTO\n${editorialInstructions.trim()}`
    : null;

  return [
    "Eres Péndola en una mesa editorial profesional de manuscritos en español.",
    "Trabajas con criterio RAE práctico y normas panhispánicas.",
    "Corrige ortografía, acentuación, puntuación, gramática, sintaxis, claridad, naturalidad, ritmo y consistencia estilística.",
    "Conserva la voz del autor, el registro narrativo y las licencias expresivas válidas. No neutralices el texto ni lo vuelvas académico en exceso.",
    "No actúes como coautora creativa ni expandas escenas salvo que el usuario lo pida de forma explícita.",
    "Si la tarea es de corrección o pulido, entrega solo el texto final limpio, listo para guardarse en Editorial, sin prefacios ni explicaciones.",
    "Si la tarea pide informe, diagnóstico o comentarios, responde con análisis estructurado y no con texto insertable.",
    projectCriteria,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildEditorialQuickActionPrompt(action: EditorialQuickActionKey) {
  switch (action) {
    case "ortografia_rae":
      return `Corrige este capítulo con criterio RAE práctico.

Objetivo:
- Corrige ortografía, tildes, puntuación y gramática.
- No reestilices más de lo necesario.
- Conserva la voz del autor y el contenido.

Salida:
- Devuelve solo la versión corregida limpia, lista para reemplazar la copia editorial.`;
    case "estilo":
      return `Haz una corrección de estilo sobre este capítulo.

Objetivo:
- Limpia repeticiones, cacofonías, fraseo torpe y cambios de registro innecesarios.
- Mejora la fluidez sin volver el texto impersonal.
- Respeta la intención, la voz y el contenido narrativo.

Salida:
- Devuelve solo la versión corregida limpia, lista para reemplazar la copia editorial.`;
    case "claridad":
      return `Mejora la claridad de este capítulo.

Objetivo:
- Resuelve ambigüedades, referencias confusas y sobrecarga sintáctica.
- Mejora comprensión, precisión y legibilidad.
- Mantén la voz autoral siempre que no afecte la claridad.

Salida:
- Devuelve solo la versión corregida limpia, lista para reemplazar la copia editorial.`;
    case "ritmo":
      return `Mejora el ritmo de este capítulo.

Objetivo:
- Ajusta longitud de frases, transiciones, redundancias y cadencia.
- Mantén tensión, respiración narrativa y naturalidad.
- No inventes contenido nuevo ni cambies la intención de la escena.

Salida:
- Devuelve solo la versión corregida limpia, lista para reemplazar la copia editorial.`;
    case "informe_editorial":
      return `Haz un informe editorial de este capítulo.

Analiza el texto con criterio RAE práctico y enfoque de edición narrativa.

Salida obligatoria:
- Ortografía y puntuación
- Sintaxis y claridad
- Estilo y ritmo
- Observaciones de voz
- Cambios prioritarios

Incluye ejemplos y recomendaciones concretas.
No devuelvas una reescritura completa ni texto listo para insertar.`;
    case "pulido_integral":
    default:
      return `Haz un pulido editorial integral de este capítulo.

Objetivo:
- Corrige ortografía, puntuación, gramática, claridad, estilo y ritmo.
- Conserva la voz del autor y la intención narrativa.
- No expandas ni reimagines creativamente el contenido.

Salida:
- Devuelve solo la versión final corregida limpia, lista para reemplazar la copia editorial.`;
  }
}

export default function EditorialBookPage({ params }: PageProps) {
  const { id: projectSegment, bookId: bookSegment } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const starterPrompt = searchParams.get("starter") ?? undefined;
  const editorRef = useRef<NarrativeEditorHandle>(null);
  const projectTitleInputRef = useRef<HTMLInputElement>(null);
  const promptRequestCounterRef = useRef(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosnapshotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingSaveRef = useRef<{
    draftId: string;
    content: string;
    wordCount: number;
    chapterId: string;
    chapterTitle: string;
  } | null>(null);

  const {
    projects,
    books,
    getChaptersByBook,
    editorialDrafts,
    getEditorialDraftByChapter,
    createEditorialDraftFromChapter,
    updateEditorialDraft,
    refreshEditorialDraftFromChapter,
    applyEditorialDraftToChapter,
    createChapterSnapshot,
    getChapterSnapshotsByChapter,
    restoreChapterSnapshot,
    createChapter,
    updateBook,
    updateProject,
    updateChapter,
    getCharactersByProject,
    getScenariosByProject,
    getResourcesByProject,
    setCurrentProject,
    aiSettings,
    isEditorialDraftOutdated,
    writerPreferences,
  } = useProjectStore();

  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [projectTitleDraft, setProjectTitleDraft] = useState("");
  const [isEditingProjectTitle, setIsEditingProjectTitle] = useState(false);
  const [showAI, setShowAI] = useState(true);
  const [mobileAIOpen, setMobileAIOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [saveState, setSaveState] = useState<SaveStatus>("saved");
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false);
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false);
  const [editorialPromptRequest, setEditorialPromptRequest] = useState<{
    id: string;
    prompt: string;
  } | null>(null);

  const projectId = resolveEntityId(
    projectSegment,
    projects.map((item) => item.id)
  );
  const bookId = resolveEntityId(
    bookSegment,
    books.map((item) => item.id)
  );

  const project = projects.find((item) => item.id === projectId);
  const book = books.find((item) => item.id === bookId);
  const chapters = getChaptersByBook(bookId);
  const characters = getCharactersByProject(projectId);
  const scenarios = getScenariosByProject(projectId);
  const resources = getResourcesByProject(projectId);
  const bookEditorialDrafts = editorialDrafts.filter((draft) => draft.bookId === bookId);

  useEffect(() => {
    if (project) {
      setCurrentProject(project.id);
    }
  }, [project, setCurrentProject]);

  useEffect(() => {
    if (isEditingProjectTitle) {
      projectTitleInputRef.current?.focus();
      projectTitleInputRef.current?.select();
    }
  }, [isEditingProjectTitle]);

  const effectiveSelectedChapterId =
    selectedChapterId && chapters.some((chapter) => chapter.id === selectedChapterId)
      ? selectedChapterId
      : chapters[0]?.id ?? null;

  const selectedChapter = chapters.find(
    (chapter) => chapter.id === effectiveSelectedChapterId
  );
  const selectedDraft = selectedChapter
    ? getEditorialDraftByChapter(selectedChapter.id)
    : undefined;
  const draftOutdated = selectedChapter
    ? isEditorialDraftOutdated(selectedChapter.id)
    : false;
  const chapterSnapshots = selectedChapter
    ? getChapterSnapshotsByChapter(selectedChapter.id, "editorial")
    : [];

  const totalEditorialWords = bookEditorialDrafts.reduce(
    (sum, draft) => sum + draft.wordCount,
    0
  );
  const buildEditorialContext = useCallback(
    (queryText = "") =>
      project && selectedChapter
        ? buildNarrativeContext({
            project,
            book,
            currentChapter: selectedChapter,
            editorialDraft: selectedDraft,
            chapters,
            characters,
            scenarios,
            resources,
            mode: "editorial",
            workspace: "editorial",
            queryText,
          })
        : "",
    [book, chapters, characters, project, resources, scenarios, selectedChapter, selectedDraft]
  );
  const aiConfig = buildAIRequestConfig(aiSettings);
  const projectPath = project ? makeProjectPath(project) : null;
  const editorialSystemPrompt = buildEditorialSystemPrompt(project?.editorialInstructions);

  const commitProjectTitle = () => {
    if (!project) return;

    const nextTitle = projectTitleDraft.trim() || project.title || "Nuevo Proyecto";
    setProjectTitleDraft(nextTitle);
    setIsEditingProjectTitle(false);

    if (nextTitle === project.title) return;

    updateProject(project.id, { title: nextTitle });

    if (book) {
      router.replace(
        makeEditorialBookPath(
          {
            ...project,
            title: nextTitle,
          },
          book
        )
      );
    }
  };

  const cancelProjectTitleEdit = () => {
    if (!project) return;
    setProjectTitleDraft(project.title);
    setIsEditingProjectTitle(false);
  };

  const handleSelectChapter = (chapterId: string) => {
    if (
      pendingSaveRef.current &&
      pendingSaveRef.current.chapterId !== chapterId
    ) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      persistPendingDraft("chapter_switch");
    }
    setSelectedChapterId(chapterId);
    setSaveState("saved");
  };

  const handleNewChapter = () => {
    const chapter = createChapter(bookId, projectId, {
      title: `Capítulo ${chapters.length + 1}`,
      synopsis: "",
    });
    setSelectedChapterId(chapter.id);
    setSaveState("saved");
    toast.success("Capítulo creado");
  };

  const handleCreateEditorialCopy = () => {
    if (!selectedChapter) return;

    createEditorialDraftFromChapter(selectedChapter);
    setSaveState("saved");
    toast.success("Copia editorial creada", {
      description: "Ahora puedes editar esta versión sin tocar Escribir.",
    });
  };

  const handleEditorialQuickAction = (action: EditorialQuickActionKey) => {
    if (!selectedDraft) return;

    promptRequestCounterRef.current += 1;
    setShowAI(true);
    setEditorialPromptRequest({
      id: `${action}-${promptRequestCounterRef.current}`,
      prompt: buildEditorialQuickActionPrompt(action),
    });
  };

  const persistPendingDraft = useCallback(
    (reason: "chapter_switch" | "before_unload" | "auto_interval") => {
      if (!pendingSaveRef.current) return false;

      const { draftId, content, wordCount, chapterId, chapterTitle } = pendingSaveRef.current;
      setSaveState("saving");
      createChapterSnapshot({
        chapterId,
        workspace: "editorial",
        content,
        wordCount,
        chapterTitle,
        reason,
      });
      updateEditorialDraft(draftId, { content, wordCount });
      pendingSaveRef.current = null;
      setSaveState("saved");
      return true;
    },
    [createChapterSnapshot, updateEditorialDraft]
  );

  const flushPendingSave = useCallback(
    (syncState = true) => {
      if (!pendingSaveRef.current) return;

      const { draftId, content, wordCount } = pendingSaveRef.current;
      setSaveState("saving");
      updateEditorialDraft(draftId, { content, wordCount });
      pendingSaveRef.current = null;
      if (syncState) {
        setSaveState("saved");
      }
    },
    [updateEditorialDraft]
  );

  const handleEditorUpdate = (content: string, wordCount: number) => {
    if (!selectedDraft) return;

    pendingSaveRef.current = {
      draftId: selectedDraft.id,
      content,
      wordCount,
      chapterId: selectedChapter?.id || selectedDraft.chapterId,
      chapterTitle: selectedChapter?.title || "Capítulo sin título",
    };
    setSaveState("pending");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      flushPendingSave();
      saveTimeoutRef.current = null;
    }, 700);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (autosnapshotIntervalRef.current) {
        clearInterval(autosnapshotIntervalRef.current);
      }
      flushPendingSave(false);
    };
  }, [flushPendingSave]);

  useEffect(() => {
    if (
      pendingSaveRef.current &&
      selectedDraft &&
      pendingSaveRef.current.draftId !== selectedDraft.id
    ) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      persistPendingDraft("chapter_switch");
    }
  }, [persistPendingDraft, selectedDraft]);

  useEffect(() => {
    if (!selectedChapter || !selectedDraft) return;

    autosnapshotIntervalRef.current = setInterval(() => {
      if (
        pendingSaveRef.current &&
        pendingSaveRef.current.chapterId === selectedChapter.id
      ) {
        persistPendingDraft("auto_interval");
        return;
      }

      createChapterSnapshot({
        chapterId: selectedChapter.id,
        workspace: "editorial",
        reason: "auto_interval",
      });
    }, 20 * 60 * 1000);

    return () => {
      if (autosnapshotIntervalRef.current) {
        clearInterval(autosnapshotIntervalRef.current);
      }
    };
  }, [createChapterSnapshot, persistPendingDraft, selectedChapter, selectedDraft]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!selectedChapter) return;

      const saved = persistPendingDraft("before_unload");
      if (saved) {
        setRecoveryNotice({
          chapterId: selectedChapter.id,
          workspace: "editorial",
          chapterTitle: selectedChapter.title,
          savedAt: new Date().toISOString(),
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [persistPendingDraft, selectedChapter]);

  useEffect(() => {
    const recoveryNotice = consumeRecoveryNotice();
    if (recoveryNotice?.workspace === "editorial") {
      toast.success("Recuperación editorial aplicada", {
        description: `Se restauró el último guardado automático de “${recoveryNotice.chapterTitle}”.`,
      });
    }
  }, []);

  useEffect(() => {
    const handleStorageError = (event: Event) => {
      const detail =
        event instanceof CustomEvent && typeof event.detail === "string"
          ? event.detail
          : "No se pudo guardar la copia editorial en el navegador.";
      setSaveState("error");
      toast.error("Error de guardado local", { description: detail });
    };

    window.addEventListener(PENDOLA_STORAGE_ERROR_EVENT, handleStorageError);
    return () => window.removeEventListener(PENDOLA_STORAGE_ERROR_EVENT, handleStorageError);
  }, []);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setIsFocusMode((current) => !current);
      }

      if (event.key === "Escape") {
        setIsFocusMode(false);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  const handleRefreshFromWriting = () => {
    if (!selectedChapter) return;

    refreshEditorialDraftFromChapter(selectedChapter);
    setRefreshConfirmOpen(false);
    setSaveState("saved");
    toast.success("Copia editorial actualizada", {
      description: "La versión editorial se reemplazó con el contenido actual de Escribir.",
    });
  };

  const handleApplyToWriting = () => {
    if (!selectedChapter || !selectedDraft) return;

    flushPendingSave(false);
    applyEditorialDraftToChapter(selectedChapter.id);
    setApplyConfirmOpen(false);
    setSaveState("saved");
    toast.success("Versión editorial aplicada", {
      description: "El capítulo en Escribir ahora usa el texto editorial actual.",
    });
  };

  const handleCopyEditorialText = async () => {
    if (!selectedDraft) return;

    await navigator.clipboard.writeText(selectedDraft.content);
    toast.success("Texto editorial copiado");
  };

  const handleCreateManualSnapshot = () => {
    if (!selectedChapter) return;

    if (
      pendingSaveRef.current &&
      pendingSaveRef.current.chapterId === selectedChapter.id
    ) {
      persistPendingDraft("auto_interval");
    }

    const snapshot = createChapterSnapshot({
      chapterId: selectedChapter.id,
      workspace: "editorial",
      reason: "manual",
    });

    if (snapshot) {
      toast.success("Versión editorial guardada");
    }
  };

  const handleRestoreSnapshot = (snapshotId: string) => {
    restoreChapterSnapshot(snapshotId);
    setVersionsOpen(false);
    setSaveState("saved");
    toast.success("Versión editorial restaurada", {
      description: "Se creó un respaldo de seguridad del estado anterior antes de restaurar.",
    });
  };

  const handleExportEditorialChapterTxt = () => {
    if (!project || !book || !selectedChapter || !selectedDraft) return;

    const content = buildChapterTextExport({
      project,
      bookTitle: book.title,
      chapter: selectedDraft,
      chapterTitle: selectedChapter.title,
      workspaceLabel: "Editorial",
    });
    downloadText(content, buildFilename(`${project.title}-${selectedChapter.title}-editorial`, "txt"));
    toast.success("Capítulo editorial exportado en TXT");
  };

  const handleExportEditorialBookTxt = () => {
    if (!project || !book) return;

    const content = buildBookTextExport({
      project,
      bookTitle: book.title,
      chapters: chapters
        .map((chapter) => {
          const draft = getEditorialDraftByChapter(chapter.id);
          if (!draft) return null;
          return {
            title: chapter.title,
            content: draft.content,
            wordCount: draft.wordCount,
          };
        })
        .filter(Boolean) as Array<{ title: string; content: string; wordCount: number }>,
      workspaceLabel: "Editorial",
    });
    downloadText(content, buildFilename(`${project.title}-${book.title}-editorial`, "txt"));
    toast.success("Libro editorial exportado en TXT");
  };

  const handleExportEditorialChapterDocx = async () => {
    if (!project || !book || !selectedChapter || !selectedDraft) return;

    const blob = await exportChapterAsDocx({
      project,
      book,
      bookTitle: book.title,
      chapter: {
        title: selectedChapter.title,
        content: selectedDraft.content,
        wordCount: selectedDraft.wordCount,
      },
      workspaceLabel: "Editorial",
      publicationProfile: project.publicationSettings.targetProfile,
    });
    downloadBlob(blob, buildFilename(`${project.title}-${selectedChapter.title}-editorial`, "docx"));
    toast.success("Capítulo editorial exportado en DOCX");
  };

  const handleExportEditorialBookDocx = async () => {
    if (!project || !book) return;

    const blob = await exportBookAsDocx({
      project,
      book,
      bookTitle: book.title,
      chapters: chapters
        .map((chapter) => {
          const draft = getEditorialDraftByChapter(chapter.id);
          if (!draft) return null;
          return {
            title: chapter.title,
            content: draft.content,
            wordCount: draft.wordCount,
          };
        })
        .filter(Boolean) as Array<{ title: string; content: string; wordCount: number }>,
      workspaceLabel: "Editorial",
      publicationProfile: project.publicationSettings.targetProfile,
    });
    downloadBlob(blob, buildFilename(`${project.title}-${book.title}-editorial`, "docx"));
    toast.success("Libro editorial exportado en DOCX");
  };

  const saveCopy = {
    saved: "Todo guardado automáticamente en Editorial",
    saving: "Guardando cambios editoriales...",
    pending: "Cambios editoriales pendientes por guardar",
    error: "Error local de guardado en Editorial",
  } satisfies Record<SaveStatus, string>;

  if (!project || !book) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <h2 className="text-xl font-semibold">Libro editorial no encontrado</h2>
          <Button onClick={() => router.push("/")}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-screen flex-col overflow-hidden bg-background ${
        isFocusMode ? "bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_30%)]" : ""
      }`}
    >
      {!isFocusMode && (
      <div className="border-b bg-background/85 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-4 px-5">
          <SidebarTrigger />
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className="h-4 w-4 rounded-sm"
              style={{ backgroundColor: project.coverColor }}
            />
            <div className="min-w-0">
              {isEditingProjectTitle ? (
                <Input
                  ref={projectTitleInputRef}
                  value={projectTitleDraft}
                  onChange={(event) => setProjectTitleDraft(event.target.value)}
                  onBlur={commitProjectTitle}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitProjectTitle();
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelProjectTitleEdit();
                    }
                  }}
                  className="h-8 border-border bg-background px-2 text-sm font-semibold shadow-none focus-visible:ring-1"
                  placeholder="Título del proyecto"
                  aria-label="Editar título del proyecto activo"
                />
              ) : (
                <div className="flex items-center gap-1">
                  <p className="truncate text-sm font-semibold">{project.title}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setProjectTitleDraft(project.title);
                      setIsEditingProjectTitle(true);
                    }}
                    aria-label="Editar título del proyecto"
                    title="Editar título del proyecto"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <p className="truncate text-xs text-muted-foreground">
                Mesa editorial del capítulo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setExportOpen(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`hidden w-[260px] shrink-0 border-r bg-muted/20 xl:flex xl:flex-col ${
            isFocusMode ? "!hidden" : ""
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b px-4 py-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-violet-500" />
                <Input
                  value={book.title}
                  onChange={(event) =>
                    updateBook(bookId, { title: event.target.value })
                  }
                  className="h-8 border-none bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
                  placeholder="Título del libro"
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {project.premise?.trim()
                  ? project.premise
                  : "Editorial te ayuda a pulir el manuscrito sin tocar el borrador original."}
              </p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <section className="flex min-h-0 flex-1 flex-col px-3 py-4">
                <div className="mb-3 flex items-center justify-between px-1">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Capítulos
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {chapters.length} en este libro
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 gap-1 rounded-xl"
                    onClick={handleNewChapter}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nuevo
                  </Button>
                </div>

                <ScrollArea className="min-h-0 flex-1 pr-1">
                  <div className="space-y-2 pb-3">
                    {chapters.length === 0 ? (
                      <button
                        type="button"
                        onClick={handleNewChapter}
                        className="flex w-full flex-col items-center rounded-2xl border border-dashed px-4 py-6 text-center transition-colors hover:border-violet-500/40 hover:bg-violet-500/5"
                      >
                        <FileText className="mb-2 h-8 w-8 text-muted-foreground/40" />
                        <span className="text-sm font-medium">Crear primer capítulo</span>
                        <span className="mt-1 text-xs text-muted-foreground">
                          Luego podrás crear su versión editorial.
                        </span>
                      </button>
                    ) : (
                      chapters.map((chapter) => {
                        const isActive = chapter.id === effectiveSelectedChapterId;
                        const chapterDraft = getEditorialDraftByChapter(chapter.id);
                        const chapterOutdated = isEditorialDraftOutdated(chapter.id);
                        const indicatorColor = !chapterDraft
                          ? "bg-muted-foreground/30"
                          : chapterOutdated
                          ? "bg-amber-400"
                          : "bg-emerald-500";
                        const helperText = !chapterDraft
                          ? "Sin copia editorial"
                          : chapterOutdated
                          ? "Desactualizado"
                          : `${chapterDraft.wordCount} palabras`;

                        return (
                          <div
                            key={chapter.id}
                            className={`rounded-xl border px-3 py-2.5 transition-all ${
                              isActive
                                ? "border-violet-500/40 bg-violet-500/8 shadow-sm"
                                : "border-transparent bg-background/70 hover:border-border hover:bg-background"
                            }`}
                          >
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => handleSelectChapter(chapter.id)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  handleSelectChapter(chapter.id);
                                }
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${indicatorColor}`} />
                                    <p className="truncate text-sm font-medium">
                                      {chapter.title}
                                    </p>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {helperText}
                                  </p>
                                </div>
                                <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
                                  {chapterDraft ? "Editorial" : "Base"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </section>

            </div>
          </div>
        </aside>

        <section className="relative flex min-w-0 flex-1 overflow-hidden bg-background">
          <div
            className={`flex min-w-0 flex-1 flex-col transition-[padding-right] duration-200 ${
              showAI && !isFocusMode ? "xl:pr-[22rem]" : ""
            }`}
          >
            {!isFocusMode && (
            <div className="border-b bg-background/92 px-6 py-5 backdrop-blur-xl md:px-8">
              {selectedChapter ? (
                <div className="mx-auto grid w-full max-w-5xl gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
                  <div className="min-w-0">
                    <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px]">
                        {book.title}
                      </Badge>
                      <span>{chapters.length} capítulos</span>
                      <span>•</span>
                      <span>{totalEditorialWords} palabras editoriales</span>
                    </div>
                    <Input
                      value={selectedChapter.title}
                      onChange={(event) =>
                        updateChapter(selectedChapter.id, {
                          title: event.target.value,
                        })
                      }
                      className="h-auto border-none bg-transparent px-0 text-3xl font-semibold shadow-none focus-visible:ring-0"
                      placeholder="Título del capítulo"
                    />
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {selectedDraft
                        ? "Esta versión editorial vive aparte del borrador. Usa acciones rápidas para corregir con criterio RAE práctico o abre el prompt libre en el panel derecho para un ajuste más específico."
                        : "Crea una copia editorial desde Escribir para empezar a corregir este capítulo sin tocar el manuscrito base."}
                    </p>
                    {selectedDraft && (
                      <div className="mt-5 rounded-2xl border bg-card/50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Acciones editoriales
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Atajos para corregir o diagnosticar el capítulo actual. El prompt libre sigue disponible en el panel IA.
                            </p>
                          </div>
                          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px]">
                            Base: RAE práctica
                          </Badge>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {EDITORIAL_QUICK_ACTIONS.map((action) => (
                            <Button
                              key={action.key}
                              type="button"
                              variant={action.key === "pulido_integral" ? "secondary" : "outline"}
                              size="sm"
                              className="rounded-xl"
                              onClick={() => handleEditorialQuickAction(action.key)}
                            >
                              <Sparkles className="mr-2 h-4 w-4" />
                              {action.shortLabel}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 xl:sticky xl:top-5">
                    <div className="rounded-2xl border bg-card/70 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Estado editorial
                          </p>
                          <p className="text-sm font-medium">
                            {selectedDraft ? "Borrador editorial activo" : "Sin copia editorial"}
                          </p>
                          <p className="text-xs leading-5 text-muted-foreground">
                            {selectedDraft
                              ? draftOutdated
                                ? "El manuscrito base cambió y esta versión quedó desactualizada."
                                : "Esta copia está lista para seguir corrigiéndose."
                              : "Primero crea una copia desde Escribir para abrir la mesa editorial."}
                          </p>
                        </div>
                        <div className="rounded-xl border bg-background px-3 py-2 text-right">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                            Palabras
                          </p>
                          <p className="mt-1 text-2xl font-semibold leading-none">
                            {selectedDraft?.wordCount ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border bg-background/90 p-3">
                      {!selectedDraft ? (
                        <Button className="h-11 w-full rounded-xl" onClick={handleCreateEditorialCopy}>
                          <FileText className="mr-2 h-4 w-4" />
                          Crear copia desde Escribir
                        </Button>
                      ) : (
                        <div className="grid gap-2">
                          <Button
                            className="h-11 w-full rounded-xl"
                            onClick={() => setApplyConfirmOpen(true)}
                          >
                            Aplicar a Escribir
                          </Button>
                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              onClick={handleCopyEditorialText}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copiar
                            </Button>
                            {draftOutdated ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                onClick={() => setRefreshConfirmOpen(true)}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Actualizar desde Escribir
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                disabled
                              >
                                Sincronizado con Escribir
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => setVersionsOpen(true)}
                        disabled={!selectedDraft}
                      >
                        <History className="mr-2 h-4 w-4" />
                        Versiones
                      </Button>
                      <Button
                        variant={isFocusMode ? "secondary" : "outline"}
                        size="sm"
                        className="rounded-xl"
                        onClick={() => setIsFocusMode((current) => !current)}
                      >
                        {isFocusMode ? (
                          <Minimize2 className="mr-2 h-4 w-4" />
                        ) : (
                          <Maximize2 className="mr-2 h-4 w-4" />
                        )}
                        {isFocusMode ? "Salir de focus" : "Modo focus"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => {
                          if (!projectPath) return;
                          router.push(`${projectPath}/personalizacion`);
                        }}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Personalización
                      </Button>
                      <Button
                        variant={mobileAIOpen ? "secondary" : "outline"}
                        size="sm"
                        className="rounded-xl xl:hidden"
                        onClick={() => setMobileAIOpen((value) => !value)}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {mobileAIOpen ? "Cerrar IA" : "Abrir IA"}
                      </Button>
                      <Button
                        variant={showAI ? "secondary" : "outline"}
                        size="sm"
                        className="hidden rounded-xl xl:inline-flex"
                        onClick={() => setShowAI((value) => !value)}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {showAI ? "Ocultar IA" : "Mostrar IA"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-3xl border border-dashed bg-card/50 px-6 py-8 text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <h3 className="mt-4 text-lg font-medium">
                    Selecciona o crea un capítulo
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Editorial trabaja capítulo por capítulo. Primero debe existir el manuscrito base.
                  </p>
                  <Button className="mt-5" onClick={handleNewChapter}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo capítulo
                  </Button>
                </div>
              )}
            </div>
            )}

            <div className="flex-1 overflow-hidden">
              {selectedChapter && selectedDraft ? (
                <div className="h-full">
                  {!isFocusMode && draftOutdated && (
                    <div className="border-b bg-amber-500/10 px-6 py-3 text-sm text-amber-900 md:px-8">
                      El manuscrito en Escribir cambió desde la última copia editorial.
                      Actualiza desde Escribir si quieres reiniciar esta versión editorial.
                    </div>
                  )}
                  <NarrativeEditor
                    key={selectedDraft.id}
                    ref={editorRef}
                    content={selectedDraft.content}
                    onUpdate={handleEditorUpdate}
                    showToolbar={!isFocusMode}
                    focusMode={isFocusMode}
                    writerPreferences={writerPreferences}
                    editorialSettings={project.publicationSettings}
                    mediaUploadContext={{
                      projectId: selectedChapter.projectId,
                      chapterId: selectedChapter.id,
                    }}
                    mediaLibraryProjectId={selectedChapter.projectId}
                    placeholder="Aquí vive la versión editorial: corrige, pule y deja el texto listo para revisión."
                  />
                </div>
              ) : selectedChapter ? (
                <div className="flex h-full items-center justify-center px-6">
                  <div className="max-w-md rounded-3xl border bg-card/60 px-8 py-10 text-center">
                    <Sparkles className="mx-auto h-12 w-12 text-violet-500/30" />
                    <h3 className="mt-4 text-lg font-medium">
                      Aún no existe la copia editorial
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Crea una copia desde Escribir para empezar a corregir ortografía, estilo,
                      claridad y ritmo sin tocar el manuscrito base.
                    </p>
                    <Button className="mt-5" onClick={handleCreateEditorialCopy}>
                      <FileText className="mr-2 h-4 w-4" />
                      Crear copia desde Escribir
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center px-6">
                  <div className="max-w-sm text-center">
                    <Sparkles className="mx-auto h-12 w-12 text-violet-500/30" />
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                      Cuando selecciones un capítulo, aquí aparecerá su versión editorial separada.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t bg-background/80 px-6 py-2 text-[11px] text-muted-foreground md:px-8">
              {saveCopy[saveState]}
            </div>
          </div>

          {showAI && !isFocusMode && (
            <div className="absolute inset-y-0 right-0 z-20 hidden w-[22rem] border-l bg-background xl:block">
              <AIPanel
                visible={showAI}
                className="w-full"
                projectId={project.id}
                chapterId={selectedChapter?.id}
                workspace="editorial"
                projectTitle={project.title}
                chapterTitle={selectedChapter?.title}
                initialPrompt={starterPrompt}
                contextBuilder={buildEditorialContext}
                customConfig={aiConfig}
                fixedMode="editorial"
                systemPromptOverride={editorialSystemPrompt}
                panelTitle="Mesa editorial IA"
                panelDescription="Corrección y pulido editorial."
                assistantLabel="Editora IA"
                inputPlaceholder="Prompt libre editorial: pide un ajuste puntual, una corrección completa o un informe específico..."
                disableCreativeTransforms
                externalPromptRequest={editorialPromptRequest ?? undefined}
                onInsertAtCursor={(text) => {
                  editorRef.current?.insertAtCursor(text);
                  toast.success("Texto insertado en la versión editorial");
                }}
                onAppendToEnd={(text) => {
                  editorRef.current?.appendToEnd(text);
                  toast.success("Texto agregado al final de la versión editorial");
                }}
                onReplaceSelection={(text) => {
                  editorRef.current?.replaceSelection(text);
                  toast.success("Selección editorial reemplazada con texto corregido");
                }}
              />
            </div>
          )}

          <Sheet open={mobileAIOpen && !isFocusMode} onOpenChange={setMobileAIOpen}>
            <SheetContent
              side="bottom"
              className="h-[85vh] rounded-t-[1.75rem] border-t bg-background p-0 xl:hidden"
            >
              <SheetHeader className="border-b px-4 py-3 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <SheetTitle>Mesa editorial IA</SheetTitle>
                    <SheetDescription>
                      Corrección, pulido e informes editoriales para este capítulo.
                    </SheetDescription>
                  </div>
                  <SheetClose
                    render={
                      <Button variant="ghost" size="icon-sm" className="shrink-0 rounded-full" />
                    }
                  >
                    <ChevronDown className="h-4 w-4" />
                    <span className="sr-only">Cerrar IA</span>
                  </SheetClose>
                </div>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-hidden touch-pan-y">
                <AIPanel
                  visible={mobileAIOpen && !isFocusMode}
                  className="h-full w-full border-l-0"
                  projectId={project.id}
                  chapterId={selectedChapter?.id}
                  workspace="editorial"
                  projectTitle={project.title}
                  chapterTitle={selectedChapter?.title}
                  initialPrompt={starterPrompt}
                  contextBuilder={buildEditorialContext}
                  customConfig={aiConfig}
                  fixedMode="editorial"
                  systemPromptOverride={editorialSystemPrompt}
                  panelTitle="Mesa editorial IA"
                  panelDescription="Corrección y pulido editorial."
                  assistantLabel="Editora IA"
                  inputPlaceholder="Prompt libre editorial: pide un ajuste puntual, una corrección completa o un informe específico..."
                  disableCreativeTransforms
                  externalPromptRequest={editorialPromptRequest ?? undefined}
                  onInsertAtCursor={(text) => {
                    editorRef.current?.insertAtCursor(text);
                    toast.success("Texto insertado en la versión editorial");
                  }}
                  onAppendToEnd={(text) => {
                    editorRef.current?.appendToEnd(text);
                    toast.success("Texto agregado al final de la versión editorial");
                  }}
                  onReplaceSelection={(text) => {
                    editorRef.current?.replaceSelection(text);
                    toast.success("Selección editorial reemplazada con texto corregido");
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>
        </section>
      </div>

      {selectedChapter && (
        <ChapterVersionsDialog
          open={versionsOpen}
          onOpenChange={setVersionsOpen}
          chapterTitle={selectedChapter.title}
          workspace="editorial"
          snapshots={chapterSnapshots}
          currentWordCount={selectedDraft?.wordCount ?? 0}
          currentContent={selectedDraft?.content ?? ""}
          currentUpdatedAt={selectedDraft?.updatedAt}
          onCreateSnapshot={handleCreateManualSnapshot}
          onRestoreSnapshot={handleRestoreSnapshot}
        />
      )}

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Exportar versión editorial</DialogTitle>
            <DialogDescription>
              Descarga la copia editorial usando el perfil definido en Publicación.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              className="h-auto flex-col items-start rounded-2xl px-4 py-4 text-left"
              onClick={() => {
                void handleExportEditorialChapterDocx();
                setExportOpen(false);
              }}
              disabled={!selectedDraft}
            >
              <span className="font-medium">Capítulo editorial · DOCX</span>
              <span className="mt-1 text-xs text-muted-foreground">
                La copia editorial del capítulo actual, lista para revisión externa.
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start rounded-2xl px-4 py-4 text-left"
              onClick={() => {
                void handleExportEditorialBookDocx();
                setExportOpen(false);
              }}
            >
              <span className="font-medium">Libro editorial · DOCX</span>
              <span className="mt-1 text-xs text-muted-foreground">
                Une todas las copias editoriales existentes del libro actual.
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start rounded-2xl px-4 py-4 text-left"
              onClick={() => {
                handleExportEditorialChapterTxt();
                setExportOpen(false);
              }}
              disabled={!selectedDraft}
            >
              <span className="font-medium">Capítulo editorial · TXT</span>
              <span className="mt-1 text-xs text-muted-foreground">
                Respaldo plano de la copia editorial actual.
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start rounded-2xl px-4 py-4 text-left"
              onClick={() => {
                handleExportEditorialBookTxt();
                setExportOpen(false);
              }}
            >
              <span className="font-medium">Libro editorial · TXT</span>
              <span className="mt-1 text-xs text-muted-foreground">
                Solo se incluyen capítulos que ya tienen copia editorial creada.
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={refreshConfirmOpen} onOpenChange={setRefreshConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Actualizar desde Escribir?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción reemplazará el contenido editorial actual con el manuscrito más reciente de Escribir.
              Perderás las correcciones editoriales no publicadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRefreshFromWriting}>
              Actualizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={applyConfirmOpen} onOpenChange={setApplyConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aplicar versión editorial a Escribir?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto reemplazará el contenido del capítulo en Escribir con la versión editorial actual.
              El draft editorial seguirá guardado por separado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyToWriting}>
              Aplicar a Escribir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
