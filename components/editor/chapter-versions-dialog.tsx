"use client";

import { useState } from "react";
import { History, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChapterSnapshot, ChapterSnapshotWorkspace } from "@/lib/types";

const SNAPSHOT_REASON_LABEL: Record<string, string> = {
  manual: "Guardado manual",
  auto_interval: "Auto guardado periódico",
  chapter_switch: "Cambio de capítulo",
  before_unload: "Cierre o recarga",
  restore_safety: "Respaldo previo a restaurar",
  apply_editorial: "Antes de aplicar Editorial",
  refresh_editorial: "Antes de refrescar Editorial",
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

function formatSnapshotDate(value: string) {
  return new Date(value).toLocaleString("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatRelativeTime(value: string) {
  const target = new Date(value).getTime();
  const now = Date.now();
  const diffMs = target - now;
  const diffMinutes = Math.round(diffMs / 60_000);

  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMs / 3_600_000);
  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffMs / 86_400_000);
  return relativeTimeFormatter.format(diffDays, "day");
}

function htmlPreviewToText(content: string) {
  return content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractReadableParagraphs(content: string) {
  return content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote|section|article)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function formatWordDelta(delta: number) {
  if (delta === 0) return "Igual que el estado actual";
  if (delta > 0) return `+${delta} palabras frente al estado actual`;
  return `${delta} palabras frente al estado actual`;
}

interface ChapterVersionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterTitle: string;
  workspace: ChapterSnapshotWorkspace;
  snapshots: ChapterSnapshot[];
  currentWordCount?: number;
  currentContent?: string;
  currentUpdatedAt?: string;
  onCreateSnapshot: () => void;
  onRestoreSnapshot: (snapshotId: string) => void;
}

export function ChapterVersionsDialog({
  open,
  onOpenChange,
  chapterTitle,
  workspace,
  snapshots,
  currentWordCount = 0,
  currentContent = "",
  currentUpdatedAt,
  onCreateSnapshot,
  onRestoreSnapshot,
}: ChapterVersionsDialogProps) {
  const workspaceLabel = workspace === "editorial" ? "Editorial" : "Escribir";
  const currentPreview = htmlPreviewToText(currentContent);
  const currentParagraphs = extractReadableParagraphs(currentContent);
  const [comparisonSnapshotId, setComparisonSnapshotId] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Versiones de {chapterTitle || "este capítulo"}
          </DialogTitle>
          <DialogDescription>
            Restaurar una versión crea antes un respaldo de seguridad del estado actual en {workspaceLabel}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-2xl border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">{snapshots.length} snapshots guardados</p>
            <p className="text-xs text-muted-foreground">
              Se conservan automáticamente las 25 versiones más recientes por espacio.
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onCreateSnapshot}>
            <Save className="mr-2 h-4 w-4" />
            Guardar versión actual
          </Button>
        </div>

        <div className="rounded-2xl border bg-background px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Estado actual en {workspaceLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {currentWordCount} palabras
                {currentUpdatedAt ? ` · actualizado ${formatSnapshotDate(currentUpdatedAt)}` : ""}
              </p>
            </div>
            <span className="rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Versión vigente
            </span>
          </div>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {currentPreview || "(Sin texto legible en el estado actual)"}
          </p>
        </div>

        <ScrollArea className="max-h-[26rem] pr-2">
          <div className="space-y-3">
            {snapshots.length === 0 ? (
              <div className="rounded-2xl border border-dashed px-5 py-8 text-center">
                <p className="text-sm font-medium">Aún no hay versiones guardadas</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Cuando hagas un snapshot manual o automático, aparecerá aquí para restaurarlo después.
                </p>
              </div>
            ) : (
              snapshots.map((snapshot) => {
                const isComparing = comparisonSnapshotId === snapshot.id;
                const snapshotPreview = htmlPreviewToText(snapshot.content);
                const snapshotParagraphs = extractReadableParagraphs(snapshot.content);
                const hasVisibleChanges = currentPreview !== snapshotPreview;

                return (
                  <div key={snapshot.id} className="rounded-2xl border bg-background px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{formatSnapshotDate(snapshot.createdAt)}</p>
                          <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                            {formatRelativeTime(snapshot.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {SNAPSHOT_REASON_LABEL[snapshot.reason] || snapshot.reason} · {snapshot.wordCount} palabras
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatWordDelta(snapshot.wordCount - currentWordCount)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() =>
                            setComparisonSnapshotId((current) =>
                              current === snapshot.id ? null : snapshot.id
                            )
                          }
                        >
                          {isComparing ? "Ocultar comparación" : "Comparar"}
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-xl"
                          onClick={() => {
                            setComparisonSnapshotId(snapshot.id);
                          }}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Revisar antes de restaurar
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl bg-muted/30 px-3 py-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Vista previa guardada
                      </p>
                      <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">
                        {snapshotPreview || "(Sin texto legible)"}
                      </p>
                    </div>

                    {isComparing && (
                      <div className="mt-4 rounded-2xl border bg-muted/20 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">Comparación rápida</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {hasVisibleChanges
                                ? "Revisa el estado actual frente a esta versión antes de restaurarla."
                                : "No hay diferencias visibles en el extracto comparado."}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="rounded-xl"
                            onClick={() => onRestoreSnapshot(snapshot.id)}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restaurar esta versión
                          </Button>
                        </div>

                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                          <div className="rounded-xl border bg-background">
                            <div className="border-b px-3 py-3">
                              <p className="text-sm font-medium">Estado actual</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {currentWordCount} palabras
                                {currentUpdatedAt ? ` · ${formatSnapshotDate(currentUpdatedAt)}` : ""}
                              </p>
                            </div>
                            <ScrollArea className="h-56 px-3 py-3">
                              <div className="space-y-3">
                                {currentParagraphs.length > 0 ? (
                                  currentParagraphs.map((paragraph, index) => (
                                    <p
                                      key={`current-${index}`}
                                      className={`rounded-lg px-3 py-2 text-sm leading-6 ${
                                        paragraph !== snapshotParagraphs[index]
                                          ? "bg-amber-500/10 text-foreground"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {paragraph}
                                    </p>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    (Sin texto legible en el estado actual)
                                  </p>
                                )}
                              </div>
                            </ScrollArea>
                          </div>

                          <div className="rounded-xl border bg-background">
                            <div className="border-b px-3 py-3">
                              <p className="text-sm font-medium">Versión guardada</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {snapshot.wordCount} palabras · {formatSnapshotDate(snapshot.createdAt)}
                              </p>
                            </div>
                            <ScrollArea className="h-56 px-3 py-3">
                              <div className="space-y-3">
                                {snapshotParagraphs.length > 0 ? (
                                  snapshotParagraphs.map((paragraph, index) => (
                                    <p
                                      key={`snapshot-${index}`}
                                      className={`rounded-lg px-3 py-2 text-sm leading-6 ${
                                        paragraph !== currentParagraphs[index]
                                          ? "bg-emerald-500/10 text-foreground"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {paragraph}
                                    </p>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    (Sin texto legible en esta versión guardada)
                                  </p>
                                )}
                              </div>
                            </ScrollArea>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
