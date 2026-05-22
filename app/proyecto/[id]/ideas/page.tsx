"use client";

import { use, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Grip, Lightbulb, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { resolveEntityId } from "@/lib/routing";
import { useProjectStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { IdeaNote, IdeaNoteColor } from "@/lib/types";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string }>;
}

const IDEA_COLOR_STYLES: Record<
  IdeaNoteColor,
  {
    card: string;
    dot: string;
    label: string;
  }
> = {
  paper: {
    card: "border-stone-300/80 bg-[#f8f2e8] text-stone-900",
    dot: "bg-[#eadfce]",
    label: "Papel",
  },
  sun: {
    card: "border-amber-300/80 bg-[#fff1b8] text-amber-950",
    dot: "bg-amber-200",
    label: "Sol",
  },
  blush: {
    card: "border-rose-300/80 bg-[#ffd8de] text-rose-950",
    dot: "bg-rose-200",
    label: "Blush",
  },
  mint: {
    card: "border-emerald-300/80 bg-[#d9f6ea] text-emerald-950",
    dot: "bg-emerald-200",
    label: "Mint",
  },
};

export default function IdeasPage({ params }: PageProps) {
  const { id: projectSegment } = use(params);
  const isMobile = useIsMobile();
  const {
    projects,
    books,
    chapters,
    getIdeaNotesByProject,
    createIdeaNote,
    updateIdeaNote,
    deleteIdeaNote,
    setCurrentProject,
  } = useProjectStore();

  const projectId = resolveEntityId(
    projectSegment,
    projects.map((item) => item.id)
  );
  const project = projects.find((item) => item.id === projectId);
  const ideaNotes = getIdeaNotesByProject(projectId);
  const projectBooks = books
    .filter((book) => book.projectId === projectId)
    .sort((a, b) => a.order - b.order);
  const chapterOptions = projectBooks.flatMap((book) =>
    chapters
      .filter((chapter) => chapter.bookId === book.id)
      .sort((a, b) => a.order - b.order)
      .map((chapter) => ({
        id: chapter.id,
        label: `Cap. ${chapter.order}: ${chapter.title}`,
        helper: book.title,
      }))
  );

  useEffect(() => {
    if (project) {
      setCurrentProject(project.id);
    }
  }, [project, setCurrentProject]);

  const [dragPositions, setDragPositions] = useState<Record<string, { x: number; y: number }>>(
    {}
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const dragStateRef = useRef<{
    id: string;
    originX: number;
    originY: number;
    pointerOffsetX: number;
    pointerOffsetY: number;
  } | null>(null);

  useEffect(() => {
    if (isMobile) {
      dragStateRef.current = null;
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const nextX = Math.max(16, dragState.originX + event.clientX - dragState.pointerOffsetX);
      const nextY = Math.max(16, dragState.originY + event.clientY - dragState.pointerOffsetY);

      setDragPositions((current) => ({
        ...current,
        [dragState.id]: { x: nextX, y: nextY },
      }));
    };

    const handlePointerUp = () => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const nextPosition = dragPositionsRef.current[dragState.id];
      const ideaNote = ideaNotes.find((item) => item.id === dragState.id);

      if (
        ideaNote &&
        nextPosition &&
        (ideaNote.x !== nextPosition.x || ideaNote.y !== nextPosition.y)
      ) {
        updateIdeaNote(dragState.id, nextPosition);
      }

      dragStateRef.current = null;
      setDraggingId(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [ideaNotes, isMobile, updateIdeaNote]);

  useEffect(() => {
    dragPositionsRef.current = dragPositions;
  }, [dragPositions]);

  const getPositionForNote = (ideaNote: IdeaNote) =>
    dragPositions[ideaNote.id] ?? { x: ideaNote.x, y: ideaNote.y };

  const getChapterLabel = (chapterId?: string) =>
    chapterOptions.find((chapter) => chapter.id === chapterId)?.label;

  const getChapterHelper = (chapterId?: string) =>
    chapterOptions.find((chapter) => chapter.id === chapterId)?.helper;

  const handleCreateIdea = () => {
    if (!project) return;

    if (chapterOptions.length === 0) {
      toast.error("Necesitas al menos un capítulo", {
        description: "Cada idea ahora se vincula a un capítulo específico.",
      });
      return;
    }

    createIdeaNote(project.id, {
      title: "Nueva idea",
      content: "",
      chapterId: chapterOptions[0]?.id,
    });
    toast.success("Idea creada", {
      description: "Ya puedes desarrollarla o moverla por el canvas.",
    });
  };

  const handleDeleteIdea = (ideaNote: IdeaNote) => {
    deleteIdeaNote(ideaNote.id);
    toast.success("Idea eliminada", {
      description: ideaNote.title.trim() || "La nota salió del tablero.",
    });
  };

  const handleDragStart =
    (ideaNote: IdeaNote) => (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (isMobile) return;

      event.preventDefault();
      const currentPosition = getPositionForNote(ideaNote);
      dragStateRef.current = {
        id: ideaNote.id,
        originX: currentPosition.x,
        originY: currentPosition.y,
        pointerOffsetX: event.clientX,
        pointerOffsetY: event.clientY,
      };
      setDraggingId(ideaNote.id);
    };

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Proyecto no encontrado</p>
      </div>
    );
  }

  const desktopIdeas = [...ideaNotes].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const canvasWidth = desktopIdeas.reduce(
    (max, ideaNote) => Math.max(max, getPositionForNote(ideaNote).x + 360),
    1100
  );
  const canvasHeight = desktopIdeas.reduce(
    (max, ideaNote) => Math.max(max, getPositionForNote(ideaNote).y + 340),
    720
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#f5efe3]">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#f8f3ea]/90 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-6">
          <SidebarTrigger />
          <Lightbulb className="h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-stone-900">Ideas</h1>
          </div>
          <Button
            size="sm"
            onClick={handleCreateIdea}
            className="bg-stone-900 text-stone-50 hover:bg-stone-800"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva idea
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col p-4 md:p-6">
        <section className="mb-4 rounded-[1.75rem] border border-stone-300/70 bg-[#f9f4eb] p-5 shadow-[0_12px_40px_rgba(120,94,55,0.08)]">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/12">
              <Lightbulb className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900">Tablero suelto de hallazgos</p>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-600">
                Suelta chispas, escenas, frases, intuiciones o imágenes mentales antes de que se
                evaporen. Este espacio está pensado como una mesa de trabajo viva: ideas rápidas,
                movibles y siempre a mano dentro del proyecto.
              </p>
            </div>
          </div>
        </section>

        {ideaNotes.length === 0 ? (
          <div
            className="flex flex-1 items-center justify-center overflow-hidden rounded-[2rem] border border-stone-300/70 p-8"
            style={{
              backgroundColor: "#f2eadb",
              backgroundImage:
                "radial-gradient(circle, rgba(147, 120, 88, 0.18) 1.4px, transparent 1.5px), linear-gradient(180deg, rgba(255,255,255,0.44), rgba(255,255,255,0))",
              backgroundSize: "22px 22px, 100% 100%",
            }}
          >
            <div className="max-w-lg rounded-[2rem] border border-stone-300/80 bg-[#fcf8f1]/90 p-8 text-center shadow-[0_18px_50px_rgba(91,70,39,0.12)] backdrop-blur">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-amber-500/14">
                <Lightbulb className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-semibold text-stone-900">Aún no hay ideas en el mat</h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Crea tu primera nota y empieza a dejar pistas sueltas para la historia: escenas,
                títulos, líneas de diálogo o intuiciones narrativas.
              </p>
              <Button
                onClick={handleCreateIdea}
                className="mt-6 bg-amber-600 text-white hover:bg-amber-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear primera idea
              </Button>
            </div>
          </div>
        ) : isMobile ? (
          <div className="space-y-4">
            {ideaNotes.map((ideaNote) => {
              const colorStyle = IDEA_COLOR_STYLES[ideaNote.color];

              return (
                <article
                  key={ideaNote.id}
                  className={`rounded-[1.6rem] border p-4 shadow-[0_16px_36px_rgba(91,70,39,0.10)] ${colorStyle.card}`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/35 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-stone-700">
                      <span className={`h-2.5 w-2.5 rounded-full ${colorStyle.dot}`} />
                      Nota
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-stone-700 hover:bg-black/5 hover:text-stone-900"
                      onClick={() => handleDeleteIdea(ideaNote)}
                      aria-label="Eliminar idea"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <Input
                    value={ideaNote.title}
                    onChange={(event) =>
                      updateIdeaNote(ideaNote.id, { title: event.target.value })
                    }
                    placeholder="Título opcional"
                    className="mb-3 border-black/10 bg-white/50 text-base font-semibold placeholder:text-black/35"
                  />

                  <Textarea
                    value={ideaNote.content}
                    onChange={(event) =>
                      updateIdeaNote(ideaNote.id, { content: event.target.value })
                    }
                    placeholder="Desarrolla la idea..."
                    rows={6}
                    className="resize-none border-black/10 bg-white/45 leading-6 placeholder:text-black/40"
                  />

                  <div className="mt-3">
                    <label className="block text-xs font-medium uppercase tracking-[0.16em] text-stone-500">
                      Capítulo
                    </label>
                    <select
                      value={ideaNote.chapterId || ""}
                      onChange={(event) =>
                        updateIdeaNote(ideaNote.id, {
                          chapterId: event.target.value || undefined,
                        })
                      }
                      className={cn(
                        "mt-1 flex h-11 w-full items-center rounded-xl border border-black/10 bg-white/50 px-3 text-sm text-stone-800 outline-none transition-colors",
                        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      )}
                    >
                      <option value="" disabled>
                        Vincular a un capítulo
                      </option>
                      {chapterOptions.map((chapter) => (
                        <option key={chapter.id} value={chapter.id}>
                          {chapter.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(Object.keys(IDEA_COLOR_STYLES) as IdeaNoteColor[]).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateIdeaNote(ideaNote.id, { color })}
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${
                          ideaNote.color === color
                            ? "border-stone-900 bg-stone-900 text-white"
                            : "border-black/10 bg-white/45 text-stone-700"
                        }`}
                      >
                        {IDEA_COLOR_STYLES[color].label}
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div
            className="relative flex-1 overflow-auto rounded-[2rem] border border-stone-300/70"
            style={{
              backgroundColor: "#f2eadb",
              backgroundImage:
                "radial-gradient(circle, rgba(147, 120, 88, 0.16) 1.4px, transparent 1.5px), linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0))",
              backgroundSize: "22px 22px, 100% 100%",
            }}
          >
            <div
              className="relative"
              style={{
                width: `${canvasWidth}px`,
                height: `${canvasHeight}px`,
                minWidth: "100%",
                minHeight: "100%",
              }}
            >
              {desktopIdeas.map((ideaNote) => {
                const colorStyle = IDEA_COLOR_STYLES[ideaNote.color];
                const currentPosition = getPositionForNote(ideaNote);
                const isDragging = draggingId === ideaNote.id;

                return (
                  <article
                    key={ideaNote.id}
                    className={`absolute w-[320px] rounded-[1.8rem] border p-4 shadow-[0_18px_42px_rgba(91,70,39,0.13)] transition-shadow ${colorStyle.card}`}
                    style={{
                      left: `${currentPosition.x}px`,
                      top: `${currentPosition.y}px`,
                      transform: `scale(${isDragging ? 1.015 : 1})`,
                      zIndex: isDragging ? 30 : 10,
                    }}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onPointerDown={handleDragStart(ideaNote)}
                        className="inline-flex cursor-grab items-center gap-2 rounded-full border border-black/10 bg-white/35 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-stone-700 active:cursor-grabbing"
                        aria-label={`Mover idea ${ideaNote.title || "sin título"}`}
                      >
                        <Grip className="h-3.5 w-3.5" />
                        <span className={`h-2.5 w-2.5 rounded-full ${colorStyle.dot}`} />
                        Mover
                      </button>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-stone-700 hover:bg-black/5 hover:text-stone-900"
                        onClick={() => handleDeleteIdea(ideaNote)}
                        aria-label="Eliminar idea"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <Input
                      value={ideaNote.title}
                      onChange={(event) =>
                        updateIdeaNote(ideaNote.id, { title: event.target.value })
                      }
                      placeholder="Título opcional"
                      className="mb-3 border-black/10 bg-white/52 text-base font-semibold placeholder:text-black/35"
                    />

                    <Textarea
                      value={ideaNote.content}
                      onChange={(event) =>
                        updateIdeaNote(ideaNote.id, { content: event.target.value })
                      }
                      placeholder="Desarrolla la idea..."
                      rows={7}
                      className="resize-none border-black/10 bg-white/48 leading-6 placeholder:text-black/40"
                    />

                    <div className="mt-3">
                      <label className="block text-xs font-medium uppercase tracking-[0.16em] text-stone-500">
                        Capítulo
                      </label>
                      <select
                        value={ideaNote.chapterId || ""}
                        onChange={(event) =>
                          updateIdeaNote(ideaNote.id, {
                            chapterId: event.target.value || undefined,
                          })
                        }
                        className={cn(
                          "mt-1 flex h-11 w-full items-center rounded-xl border border-black/10 bg-white/52 px-3 text-sm text-stone-800 outline-none transition-colors",
                          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        )}
                      >
                        <option value="" disabled>
                          Vincular a un capítulo
                        </option>
                        {chapterOptions.map((chapter) => (
                          <option key={chapter.id} value={chapter.id}>
                            {chapter.label}
                          </option>
                        ))}
                      </select>
                      {ideaNote.chapterId && (
                        <p className="mt-2 text-xs text-stone-500">
                          Vinculada a {getChapterLabel(ideaNote.chapterId) || "un capítulo"}
                          {getChapterHelper(ideaNote.chapterId)
                            ? ` · ${getChapterHelper(ideaNote.chapterId)}`
                            : ""}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(Object.keys(IDEA_COLOR_STYLES) as IdeaNoteColor[]).map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => updateIdeaNote(ideaNote.id, { color })}
                          className={`rounded-full border px-3 py-1.5 text-xs transition ${
                            ideaNote.color === color
                              ? "border-stone-900 bg-stone-900 text-white"
                              : "border-black/10 bg-white/45 text-stone-700"
                          }`}
                        >
                          {IDEA_COLOR_STYLES[color].label}
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
