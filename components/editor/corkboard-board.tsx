"use client";

import type { DragEvent } from "react";
import { GripHorizontal, MoveHorizontal, PenSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Chapter, ChapterStatus } from "@/lib/types";

const STATUS_COPY: Record<ChapterStatus, { label: string; tone: string }> = {
  borrador: { label: "Borrador", tone: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  generando: { label: "Generando", tone: "bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/20" },
  revision: { label: "Revisión", tone: "bg-sky-500/10 text-sky-700 border-sky-500/20" },
  aprobado: { label: "Aprobado", tone: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  completo: { label: "Completo", tone: "bg-lime-500/10 text-lime-700 border-lime-500/20" },
};

interface CorkboardBoardProps {
  chapters: Chapter[];
  activeChapterId?: string | null;
  onOpenChapter: (chapterId: string) => void;
  onUpdateSynopsis: (chapterId: string, synopsis: string) => void;
  onReorder: (orderedChapterIds: string[]) => void;
}

export function CorkboardBoard({
  chapters,
  activeChapterId,
  onOpenChapter,
  onUpdateSynopsis,
  onReorder,
}: CorkboardBoardProps) {
  const handleDragStart = (chapterId: string) => (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", chapterId);
  };

  const handleDrop = (targetChapterId: string) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sourceChapterId = event.dataTransfer.getData("text/plain");
    if (!sourceChapterId || sourceChapterId === targetChapterId) return;

    const nextOrder = [...chapters];
    const sourceIndex = nextOrder.findIndex((chapter) => chapter.id === sourceChapterId);
    const targetIndex = nextOrder.findIndex((chapter) => chapter.id === targetChapterId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const [moved] = nextOrder.splice(sourceIndex, 1);
    nextOrder.splice(targetIndex, 0, moved);
    onReorder(nextOrder.map((chapter) => chapter.id));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b bg-background/80 px-6 py-4 md:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Corkboard
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Reordena capítulos y resume su función narrativa sin salir del libro.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
            <MoveHorizontal className="h-3.5 w-3.5" />
            Arrastra tarjetas para cambiar el orden
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 md:px-8">
        <div className="mx-auto flex w-max min-w-full gap-4 pb-4">
          {chapters.map((chapter) => {
            const statusCopy = STATUS_COPY[chapter.status];
            const isActive = chapter.id === activeChapterId;

            return (
              <div
                key={chapter.id}
                draggable
                onDragStart={handleDragStart(chapter.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop(chapter.id)}
                className={`w-[20rem] shrink-0 rounded-[1.5rem] border bg-card p-4 shadow-sm transition-all ${
                  isActive ? "border-violet-500/40 shadow-violet-500/10" : "hover:border-border"
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Capítulo {chapter.order}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold leading-tight">{chapter.title}</h3>
                  </div>
                  <GripHorizontal className="mt-1 h-4 w-4 text-muted-foreground" />
                </div>

                <div className="mb-4 flex items-center justify-between gap-3">
                  <Badge variant="outline" className={`rounded-full ${statusCopy.tone}`}>
                    {statusCopy.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{chapter.wordCount} palabras</span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Sinopsis
                  </p>
                  <Textarea
                    value={chapter.synopsis}
                    onChange={(event) => onUpdateSynopsis(chapter.id, event.target.value)}
                    placeholder="Resume la función narrativa de este capítulo."
                    rows={7}
                    className="resize-none rounded-2xl bg-background"
                  />
                </div>

                <Button className="mt-4 w-full rounded-xl" onClick={() => onOpenChapter(chapter.id)}>
                  <PenSquare className="mr-2 h-4 w-4" />
                  Abrir capítulo
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
