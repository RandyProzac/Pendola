"use client";

import { ImageIcon, Check, Paperclip } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useProjectStore } from "@/lib/store";
import { getPublicMediaUrl } from "@/lib/supabase/storage";

interface ImageLibraryDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (mediaPath: string) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

export function ImageLibraryDialog({
  projectId,
  open,
  onOpenChange,
  onSelect,
  title = "Biblioteca visual",
  description = "Reutiliza imágenes que ya subiste a este proyecto.",
  confirmLabel = "Usar imagen",
}: ImageLibraryDialogProps) {
  const { getResourcesByProject } = useProjectStore();
  const imageResources = useMemo(
    () =>
      getResourcesByProject(projectId).filter(
        (resource) => resource.fileType === "image" && !!resource.mediaPath
      ),
    [getResourcesByProject, projectId]
  );
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const selectedResource = imageResources.find((resource) => resource.mediaPath === selectedPath);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setSelectedPath(null);
        }
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] max-w-4xl flex-col overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)]">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
        {imageResources.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
              <Paperclip className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Aún no hay imágenes reutilizables</p>
            <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
              Sube imágenes desde Recursos para poder reutilizarlas como portada o insertarlas dentro del editor.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <ScrollArea className="max-h-[420px] rounded-2xl border">
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {imageResources.map((resource) => {
                  const resourceUrl = getPublicMediaUrl(resource.mediaPath);
                  const isSelected = resource.mediaPath === selectedPath;

                  return (
                    <button
                      key={resource.id}
                      type="button"
                      onClick={() => setSelectedPath(resource.mediaPath || null)}
                      className={`overflow-hidden rounded-2xl border text-left transition ${
                        isSelected
                          ? "border-violet-500 ring-2 ring-violet-500/20"
                          : "border-border hover:border-violet-500/30"
                      }`}
                    >
                      <div className="relative bg-muted">
                        {resourceUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resourceUrl}
                            alt={resource.name}
                            className="h-36 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-36 items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                        )}
                        {isSelected ? (
                          <div className="absolute right-3 top-3 rounded-full bg-background/90 p-1 text-violet-500 shadow-sm">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        ) : null}
                      </div>
                      <div className="space-y-2 p-3">
                        <p className="truncate text-sm font-medium">{resource.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Badge variant="secondary" className="text-[10px]">
                            Recurso
                          </Badge>
                          <span>
                            {new Date(resource.createdAt).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="rounded-2xl border bg-muted/20 p-4">
              {selectedResource?.mediaPath ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-2xl border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getPublicMediaUrl(selectedResource.mediaPath) || ""}
                      alt={selectedResource.name}
                      className="h-56 w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{selectedResource.name}</p>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                      {selectedResource.description?.trim()
                        ? selectedResource.description
                        : "Esta imagen ya está en Supabase y se puede reutilizar sin volver a subirla."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-[260px] items-center justify-center text-center text-sm text-muted-foreground">
                  Selecciona una imagen para verla en detalle.
                </div>
              )}
            </div>
          </div>
        )}
        </div>

        <DialogFooter className="px-4 sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            onClick={() => {
              if (!selectedPath) return;
              onSelect(selectedPath);
              onOpenChange(false);
              setSelectedPath(null);
            }}
            disabled={!selectedPath}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
