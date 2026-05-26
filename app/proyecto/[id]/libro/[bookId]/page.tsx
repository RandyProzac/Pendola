"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Cloud,
  Clock3,
  Download,
  FileText,
  HardDrive,
  History,
  LayoutGrid,
  Link2,
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  Pencil,
  Image as ImageIcon,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Users,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useSupabaseAuth } from "@/components/auth/auth-gate";
import {
  NarrativeEditor,
  type NarrativeEditorHandle,
} from "@/components/editor/narrative-editor";
import { ChapterVersionsDialog } from "@/components/editor/chapter-versions-dialog";
import { CorkboardBoard } from "@/components/editor/corkboard-board";
import { AIPanel } from "@/components/editor/ai-panel";
import { ImageLibraryDialog } from "@/components/media/image-library-dialog";
import { buildNarrativeContext } from "@/lib/ai/context";
import { buildAIRequestConfig } from "@/lib/ai/provider";
import {
  buildBookTextExport,
  buildBookHtmlExport,
  buildChapterTextExport,
  buildChapterHtmlExport,
  buildFilename,
  downloadBackup,
  downloadBlob,
  downloadText,
  exportBookAsDocx,
  exportChapterAsDocx,
} from "@/lib/export/manuscript";
import { parseProjectBackup } from "@/lib/persistence/project-backup";
import { consumeRecoveryNotice, setRecoveryNotice, type RecoveryNotice } from "@/lib/persistence/recovery";
import {
  formatRelativeWorkspaceTime,
  loadWorkspaceResumeState,
  saveWorkspaceResumeState,
  type WorkspaceResumeState,
} from "@/lib/persistence/workspace-session";
import { PENDOLA_STORAGE_ERROR_EVENT } from "@/lib/persistence/storage-adapter";
import { estimatePageRange, getTrimSizeOption } from "@/lib/publishing";
import { makeBookPath, makeProjectPath, resolveEntityId } from "@/lib/routing";
import { getCurrentSupabaseUserId, isRemoteSyncEnabled } from "@/lib/supabase/runtime";
import {
  getPublicMediaUrl,
  removeMediaFile,
  uploadChapterCoverImage,
} from "@/lib/supabase/storage";
import { useProjectStore } from "@/lib/store";
import type { ChapterStatus, EntityMentionType, ProjectBackup, SaveStatus } from "@/lib/types";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string; bookId: string }>;
}

type BookViewMode = "write" | "corkboard";

const STATUS_CONFIG: Record<ChapterStatus, { label: string; color: string }> = {
  borrador: { label: "Borrador", color: "bg-amber-400" },
  generando: { label: "Generando", color: "bg-fuchsia-500" },
  revision: { label: "Revisión", color: "bg-sky-500" },
  aprobado: { label: "Aprobado", color: "bg-emerald-500" },
  completo: { label: "Completo", color: "bg-lime-500" },
};

const CHAPTER_STATUS_OPTIONS = Object.entries(STATUS_CONFIG) as Array<
  [ChapterStatus, (typeof STATUS_CONFIG)[ChapterStatus]]
>;

const WRITING_IDLE_THRESHOLD_MS = 30_000;
const WRITING_FLUSH_INTERVAL_MS = 15_000;

function formatProductivityDate(value?: string) {
  if (!value) return "Sin registro";

  return new Date(value).toLocaleString("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatTrackedDuration(totalSeconds = 0) {
  if (totalSeconds <= 0) return "0 min";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
  }

  return `${Math.max(1, minutes)} min`;
}

function formatWordsPerMinute(wordCount = 0, totalSeconds = 0) {
  if (wordCount <= 0 || totalSeconds < 60) return "Aún sin datos suficientes";

  const wordsPerMinute = wordCount / (totalSeconds / 60);
  if (!Number.isFinite(wordsPerMinute) || wordsPerMinute <= 0) {
    return "Aún sin datos suficientes";
  }

  return `${wordsPerMinute >= 10 ? Math.round(wordsPerMinute) : wordsPerMinute.toFixed(1)} palabras/min`;
}

function formatCompactPageEstimate(minPages: number, maxPages: number) {
  if (maxPages <= 0) return "0 p.";
  if (minPages === maxPages) return `${minPages} p.`;
  return `${minPages}–${maxPages} p.`;
}

function formatRelativeRecentActivity(lastWritingAt?: string) {
  if (!lastWritingAt) return "Sin actividad reciente";

  const diffMs = Date.now() - new Date(lastWritingAt).getTime();
  const diffHours = diffMs / 3_600_000;

  if (diffHours < 24) return "Activo hoy";
  if (diffHours < 48) return "Activo ayer";

  const diffDays = Math.floor(diffMs / 86_400_000);
  return `Activo hace ${diffDays} días`;
}

interface BackupImportPreview {
  backup: ProjectBackup;
  filename: string;
  exportedAtLabel: string;
  wordCount: number;
}

function buildBackupImportPreview(filename: string, backup: ProjectBackup): BackupImportPreview {
  return {
    backup,
    filename,
    exportedAtLabel: formatProductivityDate(backup.exportedAt),
    wordCount: backup.chapters.reduce((total, chapter) => total + (chapter.wordCount ?? 0), 0),
  };
}

export default function BookPage({ params }: PageProps) {
  const { id: projectSegment, bookId: bookSegment } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSupabaseAuth();
  const starterPrompt = searchParams.get("starter") ?? undefined;
  const editorRef = useRef<NarrativeEditorHandle>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const chapterCoverInputRef = useRef<HTMLInputElement>(null);
  const projectTitleInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosnapshotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const writingFlushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectionIntentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressSelectionClearRef = useRef(false);
  const pendingSelectionKeyRef = useRef<string | null>(null);
  const writingActivityRef = useRef<{
    chapterId: string | null;
    lastInputAt: number | null;
    lastCreditedAt: number | null;
    pendingMs: number;
  }>({
    chapterId: null,
    lastInputAt: null,
    lastCreditedAt: null,
    pendingMs: 0,
  });
  const pendingSaveRef = useRef<{
    chapterId: string;
    content: string;
    wordCount: number;
    chapterTitle: string;
  } | null>(null);
  const {
    projects,
    books,
    getChaptersByBook,
    createChapter,
    updateChapter,
    incrementChapterWritingTime,
    deleteChapter,
    reorderChapters,
    createChapterSnapshot,
    getChapterSnapshotsByChapter,
    restoreChapterSnapshot,
    exportProjectBackup,
    importProjectBackup,
    updateBook,
    getCharactersByProject,
    getScenariosByProject,
    getResourcesByProject,
    createCharacter,
    createScenario,
    addEntityMention,
    getEntityMentionsByChapter,
    syncEntityMentionsByChapter,
    setCurrentProject,
    updateProject,
    aiSettings,
    writerPreferences,
  } = useProjectStore();

  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [projectTitleDraft, setProjectTitleDraft] = useState("");
  const [isEditingProjectTitle, setIsEditingProjectTitle] = useState(false);
  const [showAI, setShowAI] = useState(true);
  const [mobileAIOpen, setMobileAIOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<BookViewMode>("write");
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [chapterCoverLibraryOpen, setChapterCoverLibraryOpen] = useState(false);
  const [backupImportPreview, setBackupImportPreview] = useState<BackupImportPreview | null>(null);
  const [isBackupDragActive, setIsBackupDragActive] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [isUploadingChapterCover, setIsUploadingChapterCover] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveStatus>("saved");
  const [selectedText, setSelectedText] = useState<{
    text: string;
    from: number;
    to: number;
    rect: { top: number; left: number; width: number; height: number };
    contextBefore: string;
    contextAfter: string;
  } | null>(null);
  const [pendingSelectedText, setPendingSelectedText] = useState<{
    text: string;
    from: number;
    to: number;
    rect: { top: number; left: number; width: number; height: number };
    contextBefore: string;
    contextAfter: string;
  } | null>(null);
  const [selectionMenuReady, setSelectionMenuReady] = useState(false);
  const [linkDialogType, setLinkDialogType] = useState<EntityMentionType | null>(null);
  const [resumeState, setResumeState] = useState<WorkspaceResumeState | null>(null);
  const [autoResumedChapterId, setAutoResumedChapterId] = useState<string | null>(null);
  const [recentRecoveryNotice, setRecentRecoveryNotice] = useState<RecoveryNotice | null>(null);

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
  const isResourceManagedMedia = (path?: string) =>
    !!path && resources.some((resource) => resource.mediaPath === path);
  const headerPreferenceKey =
    projectId && bookId ? `pendola:writing-header-collapsed:v2:${projectId}:${bookId}` : null;
  const workspaceSessionKey =
    projectId && bookId ? `pendola:workspace:writing:${projectId}:${bookId}` : null;

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

  useEffect(() => {
    if (!headerPreferenceKey) return;

    const storedValue = window.localStorage.getItem(headerPreferenceKey);
    setIsHeaderCollapsed(storedValue === null ? true : storedValue === "true");
  }, [headerPreferenceKey]);

  useEffect(() => {
    if (!workspaceSessionKey) return;
    setResumeState(loadWorkspaceResumeState(workspaceSessionKey));
  }, [workspaceSessionKey]);

  useEffect(() => {
    if (!workspaceSessionKey || selectedChapterId || chapters.length === 0) return;

    const storedSession = loadWorkspaceResumeState(workspaceSessionKey);
    if (!storedSession) return;

    if (chapters.some((chapter) => chapter.id === storedSession.chapterId)) {
      setSelectedChapterId(storedSession.chapterId);
      setAutoResumedChapterId(storedSession.chapterId);
      setResumeState(storedSession);
    }
  }, [chapters, selectedChapterId, workspaceSessionKey]);

  useEffect(() => {
    if (!headerPreferenceKey) return;
    window.localStorage.setItem(headerPreferenceKey, String(isHeaderCollapsed));
  }, [headerPreferenceKey, isHeaderCollapsed]);

  const effectiveSelectedChapterId =
    selectedChapterId && chapters.some((chapter) => chapter.id === selectedChapterId)
      ? selectedChapterId
      : chapters[0]?.id ?? null;

  const selectedChapter = chapters.find(
    (chapter) => chapter.id === effectiveSelectedChapterId
  );
  const selectedChapterCoverUrl = getPublicMediaUrl(selectedChapter?.coverImagePath);
  const bookTrackedWritingSeconds = chapters.reduce(
    (total, chapter) => total + (chapter.trackedWritingSeconds ?? 0),
    0
  );
  const activeTrimSize = project?.publicationSettings.trimSize ?? "5.5x8.5";
  const trimSizeOption = useMemo(
    () => getTrimSizeOption(activeTrimSize),
    [activeTrimSize]
  );
  const bookWordCount = chapters.reduce((total, chapter) => total + (chapter.wordCount ?? 0), 0);
  const chapterPageRange = useMemo(
    () => estimatePageRange(selectedChapter?.wordCount ?? 0, activeTrimSize),
    [activeTrimSize, selectedChapter?.wordCount]
  );
  const estimatedPageIndicatorLabel =
    chapterPageRange.basePages <= 0
      ? "Aprox. 0 p."
      : `Aprox. ${formatCompactPageEstimate(chapterPageRange.minPages, chapterPageRange.maxPages)}`;
  const chapterTrackedWritingSeconds = selectedChapter?.trackedWritingSeconds ?? 0;
  const chaptersWithTrackedTime = chapters.filter((chapter) => (chapter.trackedWritingSeconds ?? 0) > 0);
  const recentlyActiveChapters = chapters.filter((chapter) => {
    if (!chapter.lastWritingAt) return false;
    return Date.now() - new Date(chapter.lastWritingAt).getTime() <= 7 * 86_400_000;
  });
  const mostRecentlyActiveChapter = [...chaptersWithTrackedTime]
    .filter((chapter) => chapter.lastWritingAt)
    .sort((a, b) => (b.lastWritingAt ?? "").localeCompare(a.lastWritingAt ?? ""))[0];
  const chapterEntityMentions = selectedChapter
    ? getEntityMentionsByChapter(selectedChapter.id)
    : [];
  const chapterSnapshots = selectedChapter
    ? getChapterSnapshotsByChapter(selectedChapter.id, "writing")
    : [];
  const latestWritingSavedAt = selectedChapter?.updatedAt ?? resumeState?.lastSavedAt;
  const latestSnapshotAt = chapterSnapshots[0]?.createdAt;

  useEffect(() => {
    if (!workspaceSessionKey || !selectedChapter) return;

    const nextSession: WorkspaceResumeState = {
      chapterId: selectedChapter.id,
      chapterTitle: selectedChapter.title || "Capítulo sin título",
      lastVisitedAt: new Date().toISOString(),
      lastSavedAt: selectedChapter.updatedAt,
    };

    saveWorkspaceResumeState(workspaceSessionKey, nextSession);
    setResumeState(nextSession);
  }, [selectedChapter?.id, selectedChapter?.title, selectedChapter?.updatedAt, workspaceSessionKey]);

  const buildWritingContext = useCallback(
    (queryText = "") =>
      project
        ? buildNarrativeContext({
            project,
            book,
            currentChapter: selectedChapter,
            chapters,
            characters,
            scenarios,
            resources,
            workspace: "writing",
            queryText,
          })
        : "",
    [book, chapters, characters, project, resources, scenarios, selectedChapter]
  );

  const aiConfig = buildAIRequestConfig(aiSettings);
  const projectPath = project ? makeProjectPath(project) : null;

  const flushWritingActivity = useCallback(
    (force = false) => {
      const activity = writingActivityRef.current;
      if (!activity.chapterId || !activity.lastInputAt || !activity.lastCreditedAt) {
        return;
      }

      const now = Date.now();
      const sessionEnd = Math.min(now, activity.lastInputAt + WRITING_IDLE_THRESHOLD_MS);
      const delta = sessionEnd - activity.lastCreditedAt;

      if (delta > 0) {
        activity.pendingMs += delta;
        activity.lastCreditedAt = sessionEnd;
      }

      const wholeSeconds = Math.floor(activity.pendingMs / 1000);
      if (wholeSeconds > 0) {
        incrementChapterWritingTime(activity.chapterId, wholeSeconds);
        activity.pendingMs -= wholeSeconds * 1000;
      }

      if (force || sessionEnd >= activity.lastInputAt + WRITING_IDLE_THRESHOLD_MS) {
        activity.lastInputAt = null;
        activity.lastCreditedAt = null;
      }
    },
    [incrementChapterWritingTime]
  );

  const registerWritingActivity = useCallback(() => {
    if (!effectiveSelectedChapterId) return;

    const now = Date.now();
    const activity = writingActivityRef.current;

    if (activity.chapterId !== effectiveSelectedChapterId) {
      flushWritingActivity(true);
      activity.chapterId = effectiveSelectedChapterId;
      activity.lastInputAt = now;
      activity.lastCreditedAt = now;
      activity.pendingMs = 0;
      return;
    }

    if (
      !activity.lastInputAt ||
      !activity.lastCreditedAt ||
      now - activity.lastInputAt > WRITING_IDLE_THRESHOLD_MS
    ) {
      activity.lastInputAt = now;
      activity.lastCreditedAt = now;
      return;
    }

    activity.lastInputAt = now;
  }, [effectiveSelectedChapterId, flushWritingActivity]);

  const commitProjectTitle = () => {
    if (!project) return;

    const nextTitle = projectTitleDraft.trim() || project.title || "Nuevo Proyecto";
    setProjectTitleDraft(nextTitle);
    setIsEditingProjectTitle(false);

    if (nextTitle === project.title) return;

    updateProject(project.id, { title: nextTitle });

    if (book) {
      router.replace(
        makeBookPath(
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

  const clearSelectionMenu = () => {
    if (selectionIntentTimeoutRef.current) {
      clearTimeout(selectionIntentTimeoutRef.current);
      selectionIntentTimeoutRef.current = null;
    }
    pendingSelectionKeyRef.current = null;
    setSelectionMenuReady(false);
    setPendingSelectedText(null);
    setSelectedText(null);
  };

  const handleCreateEntityFromSelection = (entityType: EntityMentionType) => {
    if (!selectedText || !selectedChapter) return;

    if (entityType === "character") {
      const character = createCharacter(projectId, {
        name: selectedText.text,
      });
      const mention = addEntityMention({
        projectId,
        bookId,
        chapterId: selectedChapter.id,
        entityType,
        entityId: character.id,
        text: selectedText.text,
        from: selectedText.from,
        to: selectedText.to,
      });
      editorRef.current?.tagSelection("character", character.id, mention.id);
      toast.success("Personaje creado y vinculado", {
        description: `${selectedText.text} se agregó a tu panel de personajes.`,
      });
    } else {
      const scenario = createScenario(projectId, {
        name: selectedText.text,
      });
      const mention = addEntityMention({
        projectId,
        bookId,
        chapterId: selectedChapter.id,
        entityType,
        entityId: scenario.id,
        text: selectedText.text,
        from: selectedText.from,
        to: selectedText.to,
      });
      editorRef.current?.tagSelection("scenario", scenario.id, mention.id);
      toast.success("Escenario creado y vinculado", {
        description: `${selectedText.text} se agregó a tus escenarios.`,
      });
    }

    clearSelectionMenu();
  };

  const handleLinkExisting = (entityType: EntityMentionType, entityId: string) => {
    if (!selectedText || !selectedChapter) return;

    const mention = addEntityMention({
      projectId,
      bookId,
      chapterId: selectedChapter.id,
      entityType,
      entityId,
      text: selectedText.text,
      from: selectedText.from,
      to: selectedText.to,
    });
    editorRef.current?.tagSelection(entityType, entityId, mention.id);
    toast.success(
      entityType === "character" ? "Personaje vinculado" : "Escenario vinculado",
      {
        description: `La mención “${selectedText.text}” quedó asociada.`,
      }
    );
    clearSelectionMenu();
    setLinkDialogType(null);
  };

  const handleSelectionChange = (selection: {
    text: string;
    from: number;
    to: number;
    rect: { top: number; left: number; width: number; height: number };
    contextBefore: string;
    contextAfter: string;
  } | null) => {
    if (selectionMenuReady && selectedText) {
      return;
    }

    if (!selection && suppressSelectionClearRef.current) {
      suppressSelectionClearRef.current = false;
      return;
    }

    const selectionKey = selection
      ? `${selection.from}:${selection.to}:${selection.text}`
      : null;

    if (selectionKey === pendingSelectionKeyRef.current) {
      return;
    }

    if (selectionIntentTimeoutRef.current) {
      clearTimeout(selectionIntentTimeoutRef.current);
      selectionIntentTimeoutRef.current = null;
    }

    pendingSelectionKeyRef.current = selectionKey;
    setSelectionMenuReady(false);
    setSelectedText(null);
    setPendingSelectedText(selection);

    if (selection) {
      selectionIntentTimeoutRef.current = setTimeout(() => {
        if (pendingSelectionKeyRef.current !== selectionKey) return;
        setPendingSelectedText(null);
        setSelectedText(selection);
        setSelectionMenuReady(true);
        selectionIntentTimeoutRef.current = null;
      }, 1200);
    }
  };

  const handleEntityMentionsChange = useCallback(
    (
      mentions: Array<{
        mentionId?: string;
        entityType: "character" | "scenario";
        entityId?: string;
        text: string;
        from: number;
        to: number;
      }>
    ) => {
      if (!effectiveSelectedChapterId) return;
      syncEntityMentionsByChapter(effectiveSelectedChapterId, mentions);
    },
    [effectiveSelectedChapterId, syncEntityMentionsByChapter]
  );

  const persistPendingDraft = useCallback(
    (reason: "chapter_switch" | "before_unload" | "auto_interval") => {
      if (!pendingSaveRef.current) return false;

      const { chapterId, content, wordCount, chapterTitle } = pendingSaveRef.current;
      setSaveState("saving");
      createChapterSnapshot({
        chapterId,
        workspace: "writing",
        content,
        wordCount,
        chapterTitle,
        reason,
      });
      updateChapter(chapterId, { content, wordCount });
      pendingSaveRef.current = null;
      setSaveState("saved");
      return true;
    },
    [createChapterSnapshot, updateChapter]
  );

  const handleSelectChapter = (chapterId: string) => {
    if (pendingSaveRef.current && pendingSaveRef.current.chapterId !== chapterId) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      persistPendingDraft("chapter_switch");
    }
    setSelectedChapterId(chapterId);
    setAutoResumedChapterId((current) => (current === chapterId ? current : null));
    setSaveState("saved");
    setViewMode("write");
  };

  const handleNewChapter = () => {
    const chapter = createChapter(bookId, projectId, {
      title: `Capítulo ${chapters.length + 1}`,
      synopsis: "",
    });
    setSelectedChapterId(chapter.id);
    setSaveState("saved");
    setViewMode("write");
    toast.success("Capítulo creado");
  };

  const flushPendingSave = useCallback(
    (syncState = true) => {
      if (!pendingSaveRef.current) return;

      const { chapterId, content, wordCount } = pendingSaveRef.current;
      setSaveState("saving");
      updateChapter(chapterId, { content, wordCount });
      pendingSaveRef.current = null;
      if (syncState) {
        setSaveState("saved");
      }
    },
    [updateChapter]
  );

  const handleEditorUpdate = (content: string, wordCount: number) => {
    if (!effectiveSelectedChapterId) return;

    if (selectionMenuReady || selectedText || pendingSelectedText) {
      clearSelectionMenu();
    }

    pendingSaveRef.current = {
      chapterId: effectiveSelectedChapterId,
      content,
      wordCount,
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
      if (selectionIntentTimeoutRef.current) {
        clearTimeout(selectionIntentTimeoutRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (autosnapshotIntervalRef.current) {
        clearInterval(autosnapshotIntervalRef.current);
      }
      if (writingFlushIntervalRef.current) {
        clearInterval(writingFlushIntervalRef.current);
      }
      flushWritingActivity(true);
      flushPendingSave(false);
    };
  }, [flushPendingSave, flushWritingActivity]);

  useEffect(() => {
    flushWritingActivity(true);

    writingActivityRef.current.chapterId = effectiveSelectedChapterId;
    writingActivityRef.current.lastInputAt = null;
    writingActivityRef.current.lastCreditedAt = null;
    writingActivityRef.current.pendingMs = 0;
  }, [effectiveSelectedChapterId, flushWritingActivity]);

  useEffect(() => {
    writingFlushIntervalRef.current = setInterval(() => {
      flushWritingActivity();
    }, WRITING_FLUSH_INTERVAL_MS);

    return () => {
      if (writingFlushIntervalRef.current) {
        clearInterval(writingFlushIntervalRef.current);
      }
    };
  }, [flushWritingActivity]);

  useEffect(() => {
    if (
      pendingSaveRef.current &&
      effectiveSelectedChapterId &&
      pendingSaveRef.current.chapterId !== effectiveSelectedChapterId
    ) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      persistPendingDraft("chapter_switch");
    }
  }, [effectiveSelectedChapterId, persistPendingDraft]);

  useEffect(() => {
    if (!selectedChapter) return;

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
        workspace: "writing",
        reason: "auto_interval",
      });
    }, 20 * 60 * 1000);

    return () => {
      if (autosnapshotIntervalRef.current) {
        clearInterval(autosnapshotIntervalRef.current);
      }
    };
  }, [createChapterSnapshot, persistPendingDraft, selectedChapter]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!selectedChapter) return;

      flushWritingActivity(true);

      const saved = persistPendingDraft("before_unload");

      if (saved) {
        setRecoveryNotice({
          chapterId: selectedChapter.id,
          workspace: "writing",
          chapterTitle: selectedChapter.title,
          savedAt: new Date().toISOString(),
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [flushWritingActivity, persistPendingDraft, selectedChapter]);

  useEffect(() => {
    const recoveryNotice = consumeRecoveryNotice();
    if (recoveryNotice?.workspace === "writing") {
      setRecentRecoveryNotice(recoveryNotice);
      toast.success("Recuperación local aplicada", {
        description: `Se restauró el último guardado automático de “${recoveryNotice.chapterTitle}”.`,
      });
    }
  }, []);

  useEffect(() => {
    const handleStorageError = (event: Event) => {
      const detail =
        event instanceof CustomEvent && typeof event.detail === "string"
          ? event.detail
          : "No se pudo guardar el capítulo en el navegador.";
      setSaveState("error");
      toast.error("Error de guardado local", {
        description: detail,
      });
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

  const handleCreateManualSnapshot = () => {
    if (!selectedChapter) return;

    if (
      pendingSaveRef.current &&
      pendingSaveRef.current.chapterId === selectedChapter.id
    ) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      flushPendingSave();
    }

    const snapshot = createChapterSnapshot({
      chapterId: selectedChapter.id,
      workspace: "writing",
      reason: "manual",
    });

    if (snapshot) {
      toast.success("Versión guardada");
    }
  };

  const handleRestoreSnapshot = (snapshotId: string) => {
    if (
      pendingSaveRef.current &&
      selectedChapter &&
      pendingSaveRef.current.chapterId === selectedChapter.id
    ) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      flushPendingSave();
    }

    restoreChapterSnapshot(snapshotId);
    setVersionsOpen(false);
    setSaveState("saved");
    toast.success("Versión restaurada", {
      description: "Se creó un respaldo de seguridad del estado anterior antes de restaurar.",
    });
  };

  const handleExportChapterTxt = () => {
    if (!project || !book || !selectedChapter) return;

    const content = buildChapterTextExport({
      project,
      bookTitle: book.title,
      chapter: selectedChapter,
      chapterTitle: selectedChapter.title,
      workspaceLabel: "Escribir",
    });
    downloadText(content, buildFilename(`${project.title}-${selectedChapter.title}`, "txt"));
    toast.success("Capítulo exportado en TXT");
  };

  const handleExportChapterHtml = () => {
    if (!project || !book || !selectedChapter) return;

    const content = buildChapterHtmlExport({
      project,
      bookTitle: book.title,
      chapter: selectedChapter,
      chapterTitle: selectedChapter.title,
      workspaceLabel: "Escribir",
    });
    downloadText(content, buildFilename(`${project.title}-${selectedChapter.title}`, "html"), "text/html;charset=utf-8");
    toast.success("Capítulo exportado en HTML", {
      description: "Conserva mejor estructura, estilos e imágenes para leer, imprimir o mover fuera de Péndola.",
    });
  };

  const handleExportBookTxt = () => {
    if (!project || !book) return;

    const content = buildBookTextExport({
      project,
      bookTitle: book.title,
      chapters: chapters.map((chapter) => ({
        title: chapter.title,
        content: chapter.content,
        wordCount: chapter.wordCount,
      })),
      workspaceLabel: "Escribir",
    });
    downloadText(content, buildFilename(`${project.title}-${book.title}`, "txt"));
    toast.success("Libro exportado en TXT");
  };

  const handleExportBookHtml = () => {
    if (!project || !book) return;

    const content = buildBookHtmlExport({
      project,
      book,
      bookTitle: book.title,
      chapters: chapters.map((chapter) => ({
        title: chapter.title,
        content: chapter.content,
        wordCount: chapter.wordCount,
      })),
      workspaceLabel: "Escribir",
      publicationProfile: project.publicationSettings.targetProfile,
    });
    downloadText(content, buildFilename(`${project.title}-${book.title}`, "html"), "text/html;charset=utf-8");
    toast.success("Libro exportado en HTML", {
      description: "Ideal para revisar en navegador o guardar como PDF sin perder la composición del manuscrito.",
    });
  };

  const handleExportChapterDocx = async () => {
    if (!project || !book || !selectedChapter) return;

    const blob = await exportChapterAsDocx({
      project,
      book,
      bookTitle: book.title,
      chapter: {
        title: selectedChapter.title,
        content: selectedChapter.content,
        wordCount: selectedChapter.wordCount,
      },
      workspaceLabel: "Escribir",
      publicationProfile: project.publicationSettings.targetProfile,
    });
    downloadBlob(blob, buildFilename(`${project.title}-${selectedChapter.title}`, "docx"));
    toast.success("Capítulo exportado en DOCX");
  };

  const handleExportBookDocx = async () => {
    if (!project || !book) return;

    const blob = await exportBookAsDocx({
      project,
      book,
      bookTitle: book.title,
      chapters: chapters.map((chapter) => ({
        title: chapter.title,
        content: chapter.content,
        wordCount: chapter.wordCount,
      })),
      workspaceLabel: "Escribir",
      publicationProfile: project.publicationSettings.targetProfile,
    });
    downloadBlob(blob, buildFilename(`${project.title}-${book.title}`, "docx"));
    toast.success("Libro exportado en DOCX");
  };

  const handleExportBackup = () => {
    if (!project) return;

    const backup = exportProjectBackup(project.id);
    if (!backup) return;

    downloadBackup(backup, buildFilename(`${project.title}-backup`, "json"));
    toast.success("Respaldo del proyecto exportado");
  };

  const handleBackupDialogChange = (open: boolean) => {
    setBackupOpen(open);

    if (!open) {
      setIsBackupDragActive(false);
      setBackupImportPreview(null);
      setIsImportingBackup(false);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  };

  const prepareBackupImport = async (file: File) => {
    const backup = parseProjectBackup(await file.text());
    const preview = buildBackupImportPreview(file.name, backup);
    setBackupImportPreview(preview);
    return preview;
  };

  const handleImportBackupInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const preview = await prepareBackupImport(file);
      toast.success("Respaldo listo para importar", {
        description: `Se detectó el proyecto “${preview.backup.project.title}”.`,
      });
    } catch (error) {
      setBackupImportPreview(null);
      const message =
        error instanceof Error
          ? error.message
          : "El archivo no es un respaldo válido de Péndola.";
      toast.error("Importación fallida", { description: message });
    } finally {
      event.target.value = "";
    }
  };

  const handleBackupDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsBackupDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    try {
      const preview = await prepareBackupImport(file);
      toast.success("Respaldo listo para importar", {
        description: `Se detectó el proyecto “${preview.backup.project.title}”.`,
      });
    } catch (error) {
      setBackupImportPreview(null);
      const message =
        error instanceof Error
          ? error.message
          : "El archivo no es un respaldo válido de Péndola.";
      toast.error("Importación fallida", { description: message });
    }
  };

  const handleConfirmBackupImport = async () => {
    if (!backupImportPreview) return;

    setIsImportingBackup(true);

    try {
      const importedProject = importProjectBackup(backupImportPreview.backup);
      if (!importedProject) {
        throw new Error("No se pudo importar el respaldo.");
      }

      handleBackupDialogChange(false);
      toast.success("Proyecto importado", {
        description: `Se creó una copia local de “${importedProject.title}”.`,
      });
      router.push(`/proyecto/${importedProject.id}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo importar el respaldo seleccionado.";
      toast.error("Importación fallida", { description: message });
    } finally {
      setIsImportingBackup(false);
    }
  };

  const saveCopy = {
    saved: "Todo guardado automáticamente",
    saving: "Guardando cambios...",
    pending: "Cambios pendientes por guardar",
    error: "Error local de guardado",
  } satisfies Record<SaveStatus, string>;

  const handleDeleteChapter = (id: string) => {
    const remainingChapters = chapters.filter((chapter) => chapter.id !== id);
    deleteChapter(id);
    setDeleteId(null);
    if (effectiveSelectedChapterId === id) {
      setSelectedChapterId(remainingChapters[0]?.id ?? null);
    }
    setSaveState("saved");
    toast.success("Capítulo eliminado");
  };

  const handleChapterCoverUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedChapter) return;

    setIsUploadingChapterCover(true);

    try {
      const previousPath = selectedChapter.coverImagePath;
      const uploaded = await uploadChapterCoverImage(file, selectedChapter.projectId, selectedChapter.id);
      updateChapter(selectedChapter.id, { coverImagePath: uploaded.path });

      if (
        previousPath &&
        previousPath !== uploaded.path &&
        !isResourceManagedMedia(previousPath)
      ) {
        void removeMediaFile(previousPath).catch(() => undefined);
      }

      toast.success("Portada del capítulo actualizada");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo subir la portada del capítulo.";
      toast.error("No se pudo subir la portada", { description: message });
    } finally {
      setIsUploadingChapterCover(false);
      event.target.value = "";
    }
  };

  const handleRemoveChapterCover = async () => {
    if (!selectedChapter?.coverImagePath) return;

    const path = selectedChapter.coverImagePath;

    try {
      if (!isResourceManagedMedia(path)) {
        await removeMediaFile(path);
      }
      updateChapter(selectedChapter.id, { coverImagePath: undefined });
      toast.success("Portada del capítulo eliminada");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la portada del capítulo.";
      toast.error("No se pudo eliminar la portada", { description: message });
    }
  };

  const handleSelectChapterCoverFromLibrary = (mediaPath: string) => {
    if (!selectedChapter) return;

    updateChapter(selectedChapter.id, { coverImagePath: mediaPath });
    toast.success("Portada del capítulo actualizada", {
      description: "Ahora reutiliza una imagen que ya subiste en Recursos.",
    });
  };

  const isCloudSyncActive =
    Boolean(user?.id) &&
    isRemoteSyncEnabled() &&
    getCurrentSupabaseUserId() === user?.id;

  if (!project || !book) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <h2 className="text-xl font-semibold">Libro no encontrado</h2>
          <Button onClick={() => router.push("/")}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-background ${
        isFocusMode ? "bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_30%)]" : ""
      }`}
    >
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportBackupInput}
      />
      <input
        ref={chapterCoverInputRef}
        type="file"
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleChapterCoverUpload}
      />

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
                Editor principal del capítulo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                isCloudSyncActive
                  ? "rounded-full border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "rounded-full border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }
              title={
                isCloudSyncActive
                  ? `Sincronizando con Supabase${user?.email ? `: ${user.email}` : ""}`
                  : "Guardado local en este navegador"
              }
            >
              {isCloudSyncActive ? (
                <Cloud className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <HardDrive className="mr-1.5 h-3.5 w-3.5" />
              )}
              {isCloudSyncActive ? "Supabase" : "Local"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setExportOpen(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => handleBackupDialogChange(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Respaldos
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
                  : "Proyecto listo para escribir. Puedes usar la IA como apoyo o ignorarla por completo."}
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
                          Empieza a escribir desde cero.
                        </span>
                      </button>
                    ) : (
                      chapters.map((chapter) => {
                        const isActive = chapter.id === effectiveSelectedChapterId;
                        const statusInfo = STATUS_CONFIG[chapter.status];

                        return (
                          <div
                            key={chapter.id}
                            className={`group rounded-xl border px-3 py-2.5 transition-all ${
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
                                    <div
                                      className={`h-2 w-2 rounded-full ${statusInfo.color}`}
                                    />
                                    <p className="truncate text-sm font-medium">
                                      {chapter.title}
                                    </p>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {chapter.wordCount} palabras
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className="rounded-lg p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setDeleteId(chapter.id);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
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
              showAI && !isFocusMode && viewMode === "write" ? "xl:pr-[22rem]" : ""
            }`}
          >
            {!isFocusMode && (
	            <div className="border-b bg-background/92 px-4 py-3 backdrop-blur-xl md:px-6">
	              {selectedChapter ? (
	                <div className="mx-auto w-full max-w-5xl">
                    {selectedChapterCoverUrl ? (
                      <div className="mb-4 overflow-hidden rounded-3xl border bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedChapterCoverUrl}
                          alt={`Portada de ${selectedChapter.title}`}
                          className="h-44 w-full object-cover"
                        />
                      </div>
                    ) : null}
                    {recentRecoveryNotice?.workspace === "writing" &&
                    recentRecoveryNotice.chapterId === selectedChapter.id ? (
                      <div className="mb-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              Se recuperó tu último guardado automático
                            </p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              {recentRecoveryNotice.chapterTitle} · {formatRelativeWorkspaceTime(recentRecoveryNotice.savedAt)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              onClick={() => setVersionsOpen(true)}
                            >
                              <History className="mr-2 h-4 w-4" />
                              Ver versiones
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-xl"
                              onClick={() => setRecentRecoveryNotice(null)}
                            >
                              Entendido
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}
	                  <div className="flex items-start justify-between gap-3">
	                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Input
                          value={selectedChapter.title}
                          onChange={(event) =>
                            updateChapter(selectedChapter.id, {
                              title: event.target.value,
                            })
                          }
                          className="h-auto min-w-0 flex-1 border-none bg-transparent px-0 text-xl font-semibold leading-tight shadow-none focus-visible:ring-0 md:text-2xl"
                          placeholder="Título del capítulo"
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                                aria-label="Cambiar estado del capítulo"
                                title="Cambiar estado del capítulo"
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[selectedChapter.status].color}`}
                                />
                                <span>{STATUS_CONFIG[selectedChapter.status].label}</span>
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                              </button>
                            }
                          />
                          <DropdownMenuContent align="start" className="min-w-40">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Estado del capítulo</DropdownMenuLabel>
                              <DropdownMenuRadioGroup
                                value={selectedChapter.status}
                                onValueChange={(value) =>
                                  updateChapter(selectedChapter.id, {
                                    status: value as ChapterStatus,
                                  })
                                }
                              >
                                {CHAPTER_STATUS_OPTIONS.map(([value, config]) => (
                                  <DropdownMenuRadioItem key={value} value={value}>
                                    <span className={`h-2 w-2 rounded-full ${config.color}`} />
                                    <span>{config.label}</span>
                                  </DropdownMenuRadioItem>
                                ))}
                              </DropdownMenuRadioGroup>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Badge
                          variant="outline"
                          className="rounded-full px-2 py-0.5 text-[10px]"
                          title={`Capítulo actual · trim ${trimSizeOption.label} · cálculo orientativo`}
                        >
                          <FileText className="mr-1 h-3.5 w-3.5" />
                          {estimatedPageIndicatorLabel}
                        </Badge>
                        <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
                          {selectedChapter.wordCount} palabras
                        </Badge>
                        <Popover>
                          <PopoverTrigger
                            render={
                              <Button
                                variant="outline"
                                size="xs"
                                className="rounded-full"
                                aria-label="Ver productividad"
                              />
                            }
                          >
                            <Clock3 className="mr-1 h-3.5 w-3.5" />
                            {formatTrackedDuration(chapterTrackedWritingSeconds)}
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-96 rounded-2xl p-3">
                            <PopoverHeader>
                              <PopoverTitle className="flex items-center gap-2 text-sm">
                                <Clock3 className="h-4 w-4" />
                                Productividad
                              </PopoverTitle>
                              <PopoverDescription className="text-xs leading-5">
                                Tiempo registrado a partir de tu actividad de escritura en este dispositivo.
                              </PopoverDescription>
                            </PopoverHeader>
                            <div className="grid gap-2 text-sm">
                              <div className="rounded-xl border bg-card/40 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                  Capítulo
                                </p>
                                <p className="mt-1 font-medium">
                                  {formatTrackedDuration(chapterTrackedWritingSeconds)}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Creado {formatProductivityDate(selectedChapter.createdAt)}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Ritmo: {formatWordsPerMinute(selectedChapter.wordCount, chapterTrackedWritingSeconds)}
                                </p>
                              </div>
                              <div className="rounded-xl border bg-card/40 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                  Libro
                                </p>
                                <p className="mt-1 font-medium">
                                  {formatTrackedDuration(bookTrackedWritingSeconds)}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Creado {formatProductivityDate(book.createdAt)}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Ritmo: {formatWordsPerMinute(bookWordCount, bookTrackedWritingSeconds)}
                                </p>
                              </div>
                              <div className="rounded-xl border bg-card/40 px-3 py-2">
                                <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  Última actividad
                                </p>
                                <p className="mt-1 text-sm">
                                  {formatProductivityDate(selectedChapter.lastWritingAt)}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatRelativeRecentActivity(selectedChapter.lastWritingAt)}
                                </p>
                              </div>
                              <div className="rounded-xl border bg-card/40 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                  Cobertura del libro
                                </p>
                                <p className="mt-1 font-medium">
                                  {chaptersWithTrackedTime.length} de {chapters.length} capítulos con tiempo registrado
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {recentlyActiveChapters.length} con actividad en los últimos 7 días
                                </p>
                              </div>
                              <div className="rounded-xl border bg-card/40 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                  Último capítulo trabajado
                                </p>
                                <p className="mt-1 font-medium">
                                  {mostRecentlyActiveChapter?.title ?? "Sin registro aún"}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {mostRecentlyActiveChapter?.lastWritingAt
                                    ? formatProductivityDate(mostRecentlyActiveChapter.lastWritingAt)
                                    : "Empieza a escribir para ver este dato"}
                                </p>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {isHeaderCollapsed ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Button
                            variant="outline"
                            size="xs"
                            className="rounded-full"
                            onClick={() => setVersionsOpen(true)}
                          >
                            <History className="mr-1 h-3.5 w-3.5" />
                            Versiones
                          </Button>
                          <Button
                            variant={viewMode === "corkboard" ? "secondary" : "outline"}
                            size="xs"
                            className="rounded-full"
                            onClick={() =>
                              setViewMode((current) => (current === "write" ? "corkboard" : "write"))
                            }
                          >
                            <LayoutGrid className="mr-1 h-3.5 w-3.5" />
                            {viewMode === "corkboard" ? "Editor" : "Corkboard"}
                          </Button>
                          <Button
                            variant={isFocusMode ? "secondary" : "outline"}
                            size="xs"
                            className="rounded-full"
                            onClick={() => setIsFocusMode((current) => !current)}
                          >
                            {isFocusMode ? (
                              <Minimize2 className="mr-1 h-3.5 w-3.5" />
                            ) : (
                              <Maximize2 className="mr-1 h-3.5 w-3.5" />
                            )}
                            Focus
                          </Button>
                          <Button
                            variant={mobileAIOpen ? "secondary" : "outline"}
                            size="xs"
                            className="rounded-full xl:hidden"
                            onClick={() => setMobileAIOpen((value) => !value)}
                            disabled={viewMode === "corkboard"}
                          >
                            <Sparkles className="mr-1 h-3.5 w-3.5" />
                            {mobileAIOpen ? "Cerrar IA" : "Abrir IA"}
                          </Button>
                          <Button
                            variant={showAI ? "secondary" : "outline"}
                            size="xs"
                            className="hidden rounded-full xl:inline-flex"
                            onClick={() => setShowAI((value) => !value)}
                            disabled={viewMode === "corkboard"}
                          >
                            <Sparkles className="mr-1 h-3.5 w-3.5" />
                            {showAI ? "Ocultar IA" : "Mostrar IA"}
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-2 space-y-3">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px]">
                              {book.title}
                            </Badge>
                            {autoResumedChapterId === selectedChapter.id ? (
                              <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px]">
                                Retomado
                              </Badge>
                            ) : null}
                            <span>{chapters.length} capítulos</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>Último guardado {formatRelativeWorkspaceTime(latestWritingSavedAt)}</span>
                            <span>•</span>
                            <span>
                              {chapterSnapshots.length === 1
                                ? "1 versión reciente"
                                : `${chapterSnapshots.length} versiones recientes`}
                            </span>
                            {latestSnapshotAt ? (
                              <>
                                <span>•</span>
                                <span>último snapshot {formatRelativeWorkspaceTime(latestSnapshotAt)}</span>
                              </>
                            ) : null}
                          </div>
	                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              onClick={() => chapterCoverInputRef.current?.click()}
                              disabled={isUploadingChapterCover}
                            >
                              <ImageIcon className="mr-2 h-4 w-4" />
                              {isUploadingChapterCover
                                ? "Subiendo portada..."
                                : selectedChapterCoverUrl
                                ? "Reemplazar portada"
                                : "Portada del capítulo"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              onClick={() => setChapterCoverLibraryOpen(true)}
                            >
                              <ImageIcon className="mr-2 h-4 w-4" />
                              Elegir de recursos
                            </Button>
                            {selectedChapterCoverUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl text-destructive hover:text-destructive"
                                onClick={() => void handleRemoveChapterCover()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Quitar portada
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              onClick={() => setVersionsOpen(true)}
                            >
                              <History className="mr-2 h-4 w-4" />
                              Versiones
                            </Button>
                            <Button
                              variant={viewMode === "corkboard" ? "secondary" : "outline"}
                              size="sm"
                              className="rounded-xl"
                              onClick={() =>
                                setViewMode((current) => (current === "write" ? "corkboard" : "write"))
                              }
                            >
                              <LayoutGrid className="mr-2 h-4 w-4" />
                              {viewMode === "corkboard" ? "Volver al editor" : "Corkboard"}
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
                              disabled={viewMode === "corkboard"}
                            >
                              <Sparkles className="mr-2 h-4 w-4" />
                              {mobileAIOpen ? "Cerrar IA" : "Abrir IA"}
                            </Button>
                            <Button
                              variant={showAI ? "secondary" : "outline"}
                              size="sm"
                              className="hidden rounded-xl xl:inline-flex"
                              onClick={() => setShowAI((value) => !value)}
                              disabled={viewMode === "corkboard"}
                            >
                              <Sparkles className="mr-2 h-4 w-4" />
                              {showAI ? "Ocultar IA" : "Mostrar IA"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="mt-0.5 rounded-full"
                      onClick={() => setIsHeaderCollapsed((current) => !current)}
                      aria-label={isHeaderCollapsed ? "Expandir cabecera" : "Ocultar cabecera"}
                      title={isHeaderCollapsed ? "Expandir cabecera" : "Ocultar cabecera"}
                    >
                      {isHeaderCollapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-3xl border border-dashed bg-card/50 px-6 py-8 text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <h3 className="mt-4 text-lg font-medium">
                    Selecciona o crea un capítulo
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    El editor se enfoca en un capítulo por vez. Puedes empezar
                    desde cero o pedir ayuda a la IA después.
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
              {selectedChapter && viewMode === "corkboard" ? (
                <CorkboardBoard
                  chapters={chapters}
                  activeChapterId={selectedChapter.id}
                  onOpenChapter={(chapterId) => {
                    setSelectedChapterId(chapterId);
                    setViewMode("write");
                  }}
                  onUpdateSynopsis={(chapterId, synopsis) => updateChapter(chapterId, { synopsis })}
                  onReorder={(orderedChapterIds) => reorderChapters(bookId, orderedChapterIds)}
                />
              ) : selectedChapter ? (
                <div className="h-full">
                  <NarrativeEditor
                    key={selectedChapter.id}
                    ref={editorRef}
                    content={selectedChapter.content}
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
                    entityMentions={chapterEntityMentions}
                    onEditorPointerDown={() => {
                      if (selectionMenuReady || selectedText || pendingSelectedText) {
                        clearSelectionMenu();
                      }
                    }}
                    onEditorTypingStart={() => {
                      registerWritingActivity();
                      if (selectionMenuReady || selectedText || pendingSelectedText) {
                        clearSelectionMenu();
                      }
                    }}
                    onSelectionChange={handleSelectionChange}
                    onEntityMentionsChange={handleEntityMentionsChange}
                    placeholder="Empieza a escribir aquí. La IA está al costado si quieres ideas, revisión o una continuación."
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center px-6">
                  <div className="max-w-sm text-center">
                    <Sparkles className="mx-auto h-12 w-12 text-violet-500/30" />
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                      Cuando tengas un capítulo seleccionado, aquí aparecerá el
                      editor principal con inserción directa desde la IA.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t bg-background/80 px-6 py-2 text-[11px] text-muted-foreground md:px-8">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <span>{saveCopy[saveState]}</span>
                {selectedChapter ? (
                  <span>
                    Último guardado {formatRelativeWorkspaceTime(latestWritingSavedAt)}
                    {chapterSnapshots.length > 0
                      ? ` · ${chapterSnapshots.length} ${
                          chapterSnapshots.length === 1 ? "snapshot" : "snapshots"
                        }`
                      : " · sin snapshots todavía"}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {showAI && !isFocusMode && viewMode === "write" && (
            <div className="absolute inset-y-0 right-0 z-20 hidden w-[22rem] border-l bg-background xl:block">
              <AIPanel
                visible={showAI}
                className="w-full"
                projectId={project.id}
                chapterId={selectedChapter?.id}
                workspace="writing"
                projectTitle={project.title}
                chapterTitle={selectedChapter?.title}
                initialPrompt={starterPrompt}
                contextBuilder={buildWritingContext}
                customConfig={aiConfig}
                onInsertAtCursor={(text) => {
                  editorRef.current?.insertAtCursor(text);
                  toast.success("Texto insertado en el cursor");
                }}
                onAppendToEnd={(text) => {
                  editorRef.current?.appendToEnd(text);
                  toast.success("Texto agregado al final del capítulo");
                }}
                onReplaceSelection={(text) => {
                  editorRef.current?.replaceSelection(text);
                  toast.success("Selección reemplazada con texto de la IA");
                }}
              />
            </div>
          )}

          <Sheet open={mobileAIOpen && !isFocusMode && viewMode === "write"} onOpenChange={setMobileAIOpen}>
            <SheetContent
              side="bottom"
              className="h-[85dvh] max-h-[calc(100dvh-0.5rem)] rounded-t-[1.75rem] border-t bg-background p-0 xl:hidden"
            >
              <SheetHeader className="border-b px-4 py-3 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <SheetTitle>Mesa IA</SheetTitle>
                    <SheetDescription>
                      Ideas, revisión e inserción directa para este capítulo.
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
                  visible={mobileAIOpen && !isFocusMode && viewMode === "write"}
                  className="h-full w-full border-l-0"
                  compactMode
                  projectId={project.id}
                  chapterId={selectedChapter?.id}
                  workspace="writing"
                  projectTitle={project.title}
                  chapterTitle={selectedChapter?.title}
                  initialPrompt={starterPrompt}
                  contextBuilder={buildWritingContext}
                  customConfig={aiConfig}
                  onInsertAtCursor={(text) => {
                    editorRef.current?.insertAtCursor(text);
                    toast.success("Texto insertado en el cursor");
                  }}
                  onAppendToEnd={(text) => {
                    editorRef.current?.appendToEnd(text);
                    toast.success("Texto agregado al final del capítulo");
                  }}
                  onReplaceSelection={(text) => {
                    editorRef.current?.replaceSelection(text);
                    toast.success("Selección reemplazada con texto de la IA");
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
          workspace="writing"
          snapshots={chapterSnapshots}
          currentWordCount={selectedChapter.wordCount}
          currentContent={selectedChapter.content}
          currentUpdatedAt={selectedChapter.updatedAt}
          onCreateSnapshot={handleCreateManualSnapshot}
          onRestoreSnapshot={handleRestoreSnapshot}
        />
      )}

      {project ? (
        <ImageLibraryDialog
          projectId={project.id}
          open={chapterCoverLibraryOpen}
          onOpenChange={setChapterCoverLibraryOpen}
          onSelect={handleSelectChapterCoverFromLibrary}
          title="Elegir portada del capítulo"
          description="Usa una imagen ya subida en Recursos como portada del capítulo."
          confirmLabel="Usar como portada"
        />
      ) : null}

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Exportar manuscrito</DialogTitle>
            <DialogDescription>
              Descarga el capítulo actual o el libro completo usando el perfil definido en Publicación.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              className="h-auto flex-col items-start rounded-2xl px-4 py-4 text-left"
              onClick={() => {
                void handleExportChapterDocx();
                setExportOpen(false);
              }}
              disabled={!selectedChapter}
            >
              <span className="font-medium">Capítulo actual · DOCX</span>
              <span className="mt-1 text-xs text-muted-foreground">
                Formato editorial para trabajo en procesador de texto.
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start rounded-2xl px-4 py-4 text-left"
              onClick={() => {
                void handleExportBookDocx();
                setExportOpen(false);
              }}
            >
              <span className="font-medium">Libro completo · DOCX</span>
              <span className="mt-1 text-xs text-muted-foreground">
                Une todos los capítulos del libro actual en un solo documento.
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start rounded-2xl px-4 py-4 text-left"
              onClick={() => {
                handleExportChapterTxt();
                setExportOpen(false);
              }}
              disabled={!selectedChapter}
            >
              <span className="font-medium">Capítulo actual · TXT</span>
              <span className="mt-1 text-xs text-muted-foreground">
                Respaldo universal en texto plano.
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start rounded-2xl px-4 py-4 text-left"
              onClick={() => {
                handleExportBookTxt();
                setExportOpen(false);
              }}
            >
              <span className="font-medium">Libro completo · TXT</span>
              <span className="mt-1 text-xs text-muted-foreground">
                Copia plana y transportable del manuscrito actual.
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start rounded-2xl px-4 py-4 text-left"
              onClick={() => {
                handleExportChapterHtml();
                setExportOpen(false);
              }}
              disabled={!selectedChapter}
            >
              <span className="font-medium">Capítulo actual · HTML</span>
              <span className="mt-1 text-xs text-muted-foreground">
                Conserva mejor estructura, estilos e imágenes. Ideal para navegador o PDF.
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start rounded-2xl px-4 py-4 text-left"
              onClick={() => {
                handleExportBookHtml();
                setExportOpen(false);
              }}
            >
              <span className="font-medium">Libro completo · HTML</span>
              <span className="mt-1 text-xs text-muted-foreground">
                Salida visual más fiel para revisar, compartir o imprimir fuera de Péndola.
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={backupOpen} onOpenChange={handleBackupDialogChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Respaldo del proyecto</DialogTitle>
            <DialogDescription>
              Exporta una copia local en JSON o importa un respaldo existente. La importación crea un
              proyecto nuevo y no sobrescribe el que estás editando ahora.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-violet-500/10 p-2 text-violet-600">
                  <Download className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Exportar respaldo</p>
                  <p className="text-sm text-muted-foreground">
                    Descarga todo el proyecto actual: libros, capítulos, personajes, escenarios,
                    recursos y conversaciones.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div className="rounded-xl border bg-background px-3 py-2">
                  {books.filter((item) => item.projectId === project.id).length} libros
                </div>
                <div className="rounded-xl border bg-background px-3 py-2">
                  {chapters.length} capítulos
                </div>
                <div className="rounded-xl border bg-background px-3 py-2">
                  {characters.length} personajes
                </div>
                <div className="rounded-xl border bg-background px-3 py-2">
                  {scenarios.length} escenarios
                </div>
              </div>

              <Button
                className="mt-4 w-full rounded-xl"
                onClick={handleExportBackup}
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar backup JSON
              </Button>
            </div>

            <div className="space-y-4 rounded-2xl border bg-background p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Importar respaldo</p>
                <p className="text-sm text-muted-foreground">
                  Suelta aquí un `.json` de Péndola o selecciónalo manualmente para revisar sus datos
                  antes de importarlo.
                </p>
              </div>

              <div
                role="button"
                tabIndex={0}
                className={`rounded-2xl border border-dashed px-4 py-8 text-center transition ${
                  isBackupDragActive
                    ? "border-violet-500 bg-violet-500/5"
                    : "border-border bg-muted/20 hover:bg-muted/40"
                }`}
                onClick={() => importInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    importInputRef.current?.click();
                  }
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsBackupDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsBackupDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsBackupDragActive(false);
                }}
                onDrop={(event) => {
                  void handleBackupDrop(event);
                }}
              >
                <Upload className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">Arrastra un archivo JSON o haz clic aquí</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  El proyecto importado se crea como una copia local con IDs nuevos.
                </p>
              </div>

              {backupImportPreview ? (
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{backupImportPreview.backup.project.title}</p>
                      <p className="text-xs text-muted-foreground">{backupImportPreview.filename}</p>
                    </div>
                    <Badge variant="outline">v{backupImportPreview.backup.version}</Badge>
                  </div>

                  <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <div className="rounded-xl border bg-background px-3 py-2">
                      Exportado: {backupImportPreview.exportedAtLabel}
                    </div>
                    <div className="rounded-xl border bg-background px-3 py-2">
                      {backupImportPreview.wordCount.toLocaleString("es-PE")} palabras
                    </div>
                    <div className="rounded-xl border bg-background px-3 py-2">
                      {backupImportPreview.backup.books.length} libros · {backupImportPreview.backup.chapters.length} capítulos
                    </div>
                    <div className="rounded-xl border bg-background px-3 py-2">
                      {backupImportPreview.backup.characters.length} personajes · {backupImportPreview.backup.scenarios.length} escenarios
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed px-4 py-4 text-sm text-muted-foreground">
                  Aún no hay un respaldo cargado para revisar.
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleBackupDialogChange(false)}>
              Cerrar
            </Button>
            <Button
              onClick={() => void handleConfirmBackupImport()}
              disabled={!backupImportPreview || isImportingBackup}
            >
              {isImportingBackup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Importar como copia local
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar capítulo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se perderá el contenido del
              capítulo seleccionado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDeleteChapter(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!linkDialogType} onOpenChange={() => setLinkDialogType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {linkDialogType === "character" ? "Vincular personaje" : "Vincular escenario"}
            </DialogTitle>
            <DialogDescription>
              {selectedText
                ? `Selecciona una ficha existente para vincular “${selectedText.text}”.`
                : "Selecciona una ficha existente para completar el vínculo."}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-auto">
            {linkDialogType === "character" &&
              (characters.length > 0 ? (
                characters.map((character) => (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => handleLinkExisting("character", character.id)}
                    className="w-full rounded-xl border px-3 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <p className="text-sm font-medium">{character.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {character.drive || "Sin impulso narrativo definido todavía"}
                    </p>
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay personajes creados todavía.
                </p>
              ))}

            {linkDialogType === "scenario" &&
              (scenarios.length > 0 ? (
                scenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => handleLinkExisting("scenario", scenario.id)}
                    className="w-full rounded-xl border px-3 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <p className="text-sm font-medium">{scenario.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {scenario.description || "Sin descripción todavía"}
                    </p>
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay escenarios creados todavía.
                </p>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {pendingSelectedText && !selectionMenuReady && (
        <div
          className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-popover/95 px-3 py-2 text-xs text-muted-foreground shadow-lg ring-1 ring-foreground/10 backdrop-blur"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Preparando acciones...
        </div>
      )}

      {selectedText && selectionMenuReady && (
        <div
          className="fixed bottom-20 left-1/2 z-40 w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border bg-popover/95 p-2 shadow-lg ring-1 ring-foreground/10 backdrop-blur"
        >
          <div className="mb-2 flex items-center justify-between gap-3 px-2">
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              Selección: {selectedText.text}
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 rounded-lg px-2 text-xs text-muted-foreground"
              onClick={clearSelectionMenu}
            >
              Cerrar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 rounded-xl border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800"
              onClick={() => handleCreateEntityFromSelection("character")}
            >
              <Users className="h-3.5 w-3.5" />
              <Plus className="-ml-1 h-3 w-3" />
              Personaje
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 rounded-xl border-sky-200 bg-white text-sky-700 hover:bg-sky-50 hover:text-sky-800"
              onClick={() => setLinkDialogType("character")}
            >
              <Users className="h-3.5 w-3.5" />
              <Link2 className="h-3 w-3" />
              Vincular
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
              onClick={() => handleCreateEntityFromSelection("scenario")}
            >
              <MapPin className="h-3.5 w-3.5" />
              <Plus className="-ml-1 h-3 w-3" />
              Escenario
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 rounded-xl border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
              onClick={() => setLinkDialogType("scenario")}
            >
              <MapPin className="h-3.5 w-3.5" />
              <Link2 className="h-3 w-3" />
              Vincular
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
