"use client";

import { type KeyboardEvent, use, useCallback, useEffect, useRef, useState } from "react";
import {
  Paperclip,
  FileText,
  Image,
  File,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { prepareResourcePayload } from "@/lib/resources/extract";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { resolveEntityId } from "@/lib/routing";
import { useProjectStore } from "@/lib/store";
import {
  getPublicMediaUrl,
  removeMediaFile,
  uploadResourceImage,
} from "@/lib/supabase/storage";
import type { Resource, ResourceFileType } from "@/lib/types";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string }>;
}

const FILE_ICONS: Record<ResourceFileType, typeof FileText> = {
  pdf: FileText,
  image: Image,
  text: FileText,
  other: File,
};

const FILE_COLORS: Record<ResourceFileType, string> = {
  pdf: "text-red-500 bg-red-500/10",
  image: "text-blue-500 bg-blue-500/10",
  text: "text-amber-500 bg-amber-500/10",
  other: "text-gray-500 bg-gray-500/10",
};

function getFileType(name: string): ResourceFileType {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["txt", "md", "rtf"].includes(ext)) return "text";
  return "other";
}

function isLegacyBrokenResource(name: string, fileType: ResourceFileType, createdAt: string) {
  return (
    fileType === "image" &&
    createdAt.startsWith("2026-04-10") &&
    name.startsWith("Alcalde, poblacion y teck en inauguracion de tanque de ag")
  );
}

export default function ResourcesPage({ params }: PageProps) {
  const { id: projectSegment } = use(params);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    projects,
    getResourcesByProject,
    addResource,
    updateResource,
    deleteResource,
  } = useProjectStore();
  const projectId = resolveEntityId(
    projectSegment,
    projects.map((item) => item.id)
  );

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const project = projects.find((p) => p.id === projectId);
  const resources = getResourcesByProject(projectId);
  const previewResource = resources.find((r) => r.id === previewId);

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>, callback: () => void) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    callback();
  };

  const performResourceDeletion = useCallback(async (
    resource: Resource,
    options?: { silent?: boolean }
  ) => {
    const silent = options?.silent ?? false;

    try {
      if (resource.mediaPath) {
        await removeMediaFile(resource.mediaPath);
      }

      deleteResource(resource.id);

      if (!silent) {
        toast.success("Recurso eliminado");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar el archivo del bucket.";

      if (!silent) {
        toast.error("No se pudo eliminar el recurso", {
          description: message,
        });
      }
    }
  }, [deleteResource]);

  useEffect(() => {
    const staleResource = resources.find((resource) =>
      isLegacyBrokenResource(resource.name, resource.fileType, resource.createdAt)
    );

    if (staleResource) {
      void performResourceDeletion(staleResource, { silent: true });
    }
  }, [performResourceDeletion, resources]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
      const fileType = getFileType(file.name);

      try {
        const payload = await prepareResourcePayload(file, fileType);
        const uploadedImage =
          fileType === "image"
            ? await uploadResourceImage(file, projectId)
            : null;

        addResource(projectId, {
          name: file.name,
          fileType,
          fileData: uploadedImage ? undefined : payload.fileData,
          mediaPath: uploadedImage?.path,
          extractedContent: payload.extractedContent,
          extractionMethod: payload.extractionMethod,
          description: "",
        });

        const extractedLength = payload.extractedContent?.length ?? 0;
        const supportsAutomaticReading = fileType === "pdf" || fileType === "text";
        const description = supportsAutomaticReading
          ? extractedLength > 0
            ? payload.extractionMethod === "ocr"
              ? "La IA ya puede leer este archivo mediante OCR."
              : "La IA ya puede leer el contenido textual de este archivo."
            : "El archivo se subio, pero no se pudo extraer texto util de forma automatica."
          : "El archivo se guardo como recurso. Puedes anadir una descripcion manual para darle mas contexto a la IA.";

        toast.success(`"${file.name}" subido`, {
          description,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo procesar este archivo.";

        toast.error(`No se pudo subir "${file.name}"`, {
          description: message,
        });
      }
    }

    setIsUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteResource = async (id: string) => {
    const resource = resources.find((item) => item.id === id);
    if (!resource) {
      setDeleteId(null);
      return;
    }

    setDeleteId(null);
    await performResourceDeletion(resource);
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Proyecto no encontrado</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-auto flex-wrap items-center gap-3 px-4 py-3 sm:h-14 sm:flex-nowrap sm:px-6 sm:py-0">
          <SidebarTrigger />
          <Paperclip className="h-5 w-5 text-orange-500" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold">Recursos</h1>
          </div>
          <Button
            size="sm"
            disabled={isUploading}
            className="order-3 w-full sm:order-none sm:w-auto"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Procesando..." : "Subir Archivo"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md,.rtf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </header>

      <div className="space-y-5 p-4 sm:p-6">
        {/* Info Banner */}
        <div className="max-w-3xl rounded-2xl border bg-muted/20 p-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
              <Paperclip className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">Archivos de referencia para la IA</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Sube PDFs o textos para que la IA lea su contenido al responder.
                Si un PDF viene escaneado, intentaremos leerlo con OCR.
                Las imagenes JPG y PNG se guardan como recurso visual reutilizable y puedes complementar con una descripcion manual.
                Por ejemplo: modelos narrativos, fichas de mundo, mapas conceptuales.
              </p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {resources.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-500/10">
              <Paperclip className="h-10 w-10 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Sin recursos aún</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Adjunta archivos de referencia para que la IA entienda mejor tu visión creativa.
              Acepta PDF, imagenes JPG/PNG y textos simples.
            </p>
            <Button
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-orange-500 to-amber-600 text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir primer recurso
            </Button>
          </div>
        )}

        {/* Resources Grid */}
        {resources.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => {
              const FileIcon = FILE_ICONS[resource.fileType];
              const colorClass = FILE_COLORS[resource.fileType];

              return (
                <Card
                  key={resource.id}
                  role="button"
                  tabIndex={0}
                  className="group relative overflow-hidden border transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-500/30 hover:shadow-lg hover:shadow-black/10 focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2"
                  onClick={() => setPreviewId(resource.id)}
                  onKeyDown={(event) => handleCardKeyDown(event, () => setPreviewId(resource.id))}
                >
                  <div className="absolute right-3 top-3 z-20">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-full bg-background/90 text-muted-foreground opacity-100 shadow-sm ring-1 ring-black/5 hover:bg-destructive/10 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                      aria-label={`Eliminar recurso ${resource.name}`}
                      title="Eliminar recurso"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(resource.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className={`flex h-12 w-12 rounded-2xl items-center justify-center ${colorClass}`}>
                          <FileIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-base font-semibold">
                            {resource.name}
                          </CardTitle>
                          <CardDescription className="mt-1 text-sm">
                            {new Date(resource.createdAt).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">
                        {resource.fileType.toUpperCase()}
                      </Badge>
                      {resource.extractedContent ? (
                        <Badge variant="outline" className="text-xs text-emerald-700 dark:text-emerald-300">
                          IA lista para leerlo
                        </Badge>
                      ) : null}
                    </div>
                    {resource.extractedContent && (
                      <p className="line-clamp-2 text-xs text-emerald-700 dark:text-emerald-300">
                        {resource.extractionMethod === "ocr"
                          ? "Texto extraido por OCR y disponible para la IA"
                          : "Texto extraido y disponible para la IA"}
                      </p>
                    )}
                    {resource.description && (
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {resource.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Upload More card */}
            <Card
              role="button"
              tabIndex={0}
              className="flex min-h-[220px] items-center justify-center border-dashed transition-colors duration-300 hover:border-orange-500/50 hover:bg-orange-500/[0.03] focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => handleCardKeyDown(event, () => fileInputRef.current?.click())}
            >
              <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-muted-foreground/35 bg-background">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">Subir más</span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Añade nuevas referencias visuales o textuales.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewId} onOpenChange={() => setPreviewId(null)}>
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] max-w-lg flex-col overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)]">
          <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              {previewResource?.name}
            </DialogTitle>
            <DialogDescription>
              Detalles del recurso subido
            </DialogDescription>
          </DialogHeader>
          {previewResource && (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-2 sm:px-6">
              {previewResource.fileType === "image" &&
              (previewResource.mediaPath || previewResource.fileData) ? (
                <div className="rounded-lg overflow-hidden border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getPublicMediaUrl(previewResource.mediaPath) || previewResource.fileData}
                    alt={previewResource.name}
                    className="w-full max-h-64 object-contain bg-muted"
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label>Descripción del recurso</Label>
                <Textarea
                  placeholder="Describe brevemente qué contiene este archivo y cómo debe usarlo la IA..."
                  value={previewResource.description}
                  onChange={(e) => {
                    updateResource(previewResource.id, {
                      description: e.target.value,
                    });
                  }}
                  rows={3}
                  className="resize-none text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Esta descripción ayuda a la IA a entender el propósito del archivo
                </p>
              </div>
              {previewResource.extractedContent && (
                <div className="space-y-1.5">
                  <Label>Texto disponible para la IA</Label>
                  <div className="max-h-40 overflow-auto rounded-md border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
                    {previewResource.extractedContent}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {previewResource.extractionMethod === "ocr"
                      ? "Este contenido se obtuvo con OCR y se usa como referencia real cuando hablas con la IA."
                      : "Este contenido se usa como referencia real cuando hablas con la IA."}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-[10px]">
                  {previewResource.fileType.toUpperCase()}
                </Badge>
                <span>•</span>
                <span>
                  Subido el{" "}
                  {new Date(previewResource.createdAt).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          )}
          <DialogFooter className="px-4 sm:px-6">
            {previewResource && (
              <Button
                variant="destructive"
                onClick={() => {
                  setPreviewId(null);
                  setDeleteId(previewResource.id);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar recurso
              </Button>
            )}
            <Button variant="outline" onClick={() => setPreviewId(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar recurso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El archivo se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDeleteResource(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
