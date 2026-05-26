"use client";

import { use, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  FileText,
  Image as ImageIcon,
  File,
  ArrowRight,
  Paperclip,
  Bot,
  PenSquare,
  BookMarked,
  Upload,
  Trash2,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageLibraryDialog } from "@/components/media/image-library-dialog";
import { resolveEntityId } from "@/lib/routing";
import { useProjectStore } from "@/lib/store";
import { getPublicMediaUrl, removeMediaFile, uploadProjectCoverImage } from "@/lib/supabase/storage";
import type { ResourceFileType } from "@/lib/types";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string }>;
}

const FILE_ICONS: Record<ResourceFileType, typeof FileText> = {
  pdf: FileText,
  image: ImageIcon,
  text: FileText,
  other: File,
};

const FILE_COLORS: Record<ResourceFileType, string> = {
  pdf: "text-red-500 bg-red-500/10",
  image: "text-blue-500 bg-blue-500/10",
  text: "text-amber-500 bg-amber-500/10",
  other: "text-gray-500 bg-gray-500/10",
};

export default function PersonalizacionPage({ params }: PageProps) {
  const { id: projectSegment } = use(params);
  const router = useRouter();
  const { projects, getResourcesByProject, updateProject } = useProjectStore();
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const projectId = resolveEntityId(
    projectSegment,
    projects.map((item) => item.id)
  );
  const project = projects.find((item) => item.id === projectId);
  const resources = getResourcesByProject(projectId);
  const projectCoverUrl = getPublicMediaUrl(project?.coverImagePath);
  const isResourceManagedMedia = (path?: string) =>
    !!path && resources.some((resource) => resource.mediaPath === path);

  const handleProjectCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !project) return;

    setIsUploadingCover(true);

    try {
      const previousPath = project.coverImagePath;
      const uploaded = await uploadProjectCoverImage(file, project.id);
      updateProject(project.id, {
        coverImagePath: uploaded.path,
      });

      if (
        previousPath &&
        previousPath !== uploaded.path &&
        !isResourceManagedMedia(previousPath)
      ) {
        void removeMediaFile(previousPath).catch(() => undefined);
      }

      toast.success("Portada actualizada", {
        description: "La portada del proyecto ya quedó guardada en Supabase.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo subir la portada del proyecto.";
      toast.error("No se pudo subir la portada", { description: message });
    } finally {
      setIsUploadingCover(false);
      event.target.value = "";
    }
  };

  const handleRemoveProjectCover = async () => {
    if (!project?.coverImagePath) return;

    const path = project.coverImagePath;

    try {
      if (!isResourceManagedMedia(path)) {
        await removeMediaFile(path);
      }
      updateProject(project.id, { coverImagePath: undefined });
      toast.success("Portada eliminada");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la portada del proyecto.";
      toast.error("No se pudo eliminar la portada", { description: message });
    }
  };

  const handleSelectProjectCoverFromLibrary = (mediaPath: string) => {
    if (!project) return;

    updateProject(project.id, { coverImagePath: mediaPath });
    toast.success("Portada actualizada", {
      description: "La portada del proyecto ahora reutiliza una imagen ya subida.",
    });
  };

  if (!project) return null;

  return (
    <div className="flex min-h-screen flex-col bg-muted/10">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-auto flex-wrap items-center gap-3 px-4 py-3 sm:h-14 sm:flex-nowrap sm:px-6 sm:py-0">
          <SidebarTrigger />
          <Sparkles className="h-5 w-5 text-violet-500" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold">Personalización</h1>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="order-3 w-full rounded-xl sm:order-none sm:w-auto"
            onClick={() => router.push(`/proyecto/${projectSegment}/recursos`)}
          >
            <Paperclip className="mr-2 h-4 w-4" />
            Abrir recursos
          </Button>
        </div>
      </header>

      <div className="flex-1 p-4 md:p-8">
        <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <div className="rounded-[1.75rem] border bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.18),transparent_36%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.88))]">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-500">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-700/80 dark:text-violet-300/80">
                    Personalidad del proyecto
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Ajusta la memoria creativa y editorial de Péndola para este universo.
                  </h2>
                  <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                    Esta sección define cómo debe pensar la app cuando trabaja contigo: qué no debe olvidar,
                    cómo debe responderte y con qué criterio tiene que intervenir en el manuscrito.
                  </p>
                </div>
              </div>
            </div>

            <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-background to-cyan-500/10">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Memoria global del proyecto</CardTitle>
                    <CardDescription className="mt-1 max-w-2xl">
                      Define el marco creativo que Péndola debe tener siempre presente
                      antes de ayudarte a escribir, revisar o proponer escenas.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <PenSquare className="h-4 w-4 text-violet-500" />
                    <h2 className="text-sm font-semibold">Perfil creativo / contexto del proyecto</h2>
                  </div>
                  <Textarea
                    value={project.creativeProfile}
                    onChange={(event) =>
                      updateProject(project.id, {
                        creativeProfile: event.target.value,
                      })
                    }
                    rows={11}
                    placeholder="Ej. Referencias emocionales, reglas del mundo, obsesiones temáticas, tono literario, límites del proyecto, tipo de lector, autores de referencia, cosas que jamás deben olvidarse."
                    className="resize-y border-violet-500/15 bg-background/80 text-sm leading-6"
                  />
                  <p className="text-xs text-muted-foreground">
                    Aquí va el contexto estable del proyecto y de tu proceso como autor.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-cyan-500" />
                    <h2 className="text-sm font-semibold">Cómo debe responder Péndola</h2>
                  </div>
                  <Textarea
                    value={project.aiInstructions}
                    onChange={(event) =>
                      updateProject(project.id, {
                        aiInstructions: event.target.value,
                      })
                    }
                    rows={10}
                    placeholder="Ej. Responde siempre en español neutro. Sé concreta. No expliques obviedades. Propón opciones cuando haya bloqueo. Si escribes escenas, evita clichés y prioriza tensión contenida."
                    className="resize-y border-cyan-500/15 bg-background/80 text-sm leading-6"
                  />
                  <p className="text-xs text-muted-foreground">
                    Define el tono, el grado de intervención y las restricciones de la IA para este proyecto.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BookMarked className="h-4 w-4 text-emerald-500" />
                    <h2 className="text-sm font-semibold">Criterio editorial</h2>
                  </div>
                  <Textarea
                    value={project.editorialInstructions}
                    onChange={(event) =>
                      updateProject(project.id, {
                        editorialInstructions: event.target.value,
                      })
                    }
                    rows={8}
                    placeholder="Ej. Usa ortografía y puntuación con criterio RAE práctico. Conserva la voz del narrador. No neutralices localismos válidos. Cuida el ritmo de párrafo, la claridad sintáctica y el tratamiento consistente de diálogos, cursivas y énfasis."
                    className="resize-y border-emerald-500/15 bg-background/80 text-sm leading-6"
                  />
                  <p className="text-xs text-muted-foreground">
                    Esta guía se aplica específicamente en `Editorial` para corrección, estilo, claridad y ritmo.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Portada del proyecto</CardTitle>
                    <CardDescription className="mt-1">
                      Sube una imagen JPG o PNG para representar visualmente este proyecto.
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Supabase</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleProjectCoverUpload}
                />

                {projectCoverUrl ? (
                  <div className="overflow-hidden rounded-2xl border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={projectCoverUrl}
                      alt={`Portada de ${project.title}`}
                      className="h-52 w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed bg-muted/25 text-center">
                    <div className="max-w-xs px-6">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-semibold text-white shadow-sm" style={{ backgroundColor: project.coverColor }}>
                        {project.title.trim().charAt(0).toUpperCase() || "P"}
                      </div>
                      <p className="text-sm font-medium">Todavía no hay portada</p>
                      <p className="mt-2 text-xs leading-6 text-muted-foreground">
                        La portada aparecerá aquí y también en la tarjeta del proyecto del dashboard.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    className="rounded-xl"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={isUploadingCover}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploadingCover ? "Subiendo..." : projectCoverUrl ? "Reemplazar portada" : "Subir portada"}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setIsLibraryOpen(true)}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Elegir de recursos
                  </Button>
                  {projectCoverUrl && (
                    <Button
                      variant="outline"
                      className="rounded-xl text-destructive hover:text-destructive"
                      onClick={() => void handleRemoveProjectCover()}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Quitar portada
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Formatos aceptados: JPG y PNG. Recomendación: 1600×900 o similar.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Referencias del proyecto</CardTitle>
                    <CardDescription className="mt-1">
                      Recursos que Péndola puede usar como referencia contextual.
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{resources.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {resources.length === 0 ? (
                  <div className="rounded-2xl border border-dashed bg-muted/30 p-5 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                      <Paperclip className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium">Todavía no hay referencias subidas</p>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                      Sube PDFs, textos o imágenes en `Recursos` para que la IA los tenga presentes como guía del proyecto.
                    </p>
                    <Button
                      className="mt-4 rounded-xl"
                      onClick={() => router.push(`/proyecto/${projectSegment}/recursos`)}
                    >
                      Ir a Recursos
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {resources.slice(0, 5).map((resource) => {
                        const Icon = FILE_ICONS[resource.fileType];

                        return (
                          <div
                            key={resource.id}
                            className="flex items-start gap-3 rounded-2xl border bg-card/60 p-3 transition-colors hover:bg-card"
                          >
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${FILE_COLORS[resource.fileType]}`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium">{resource.name}</p>
                                <Badge variant="outline" className="text-xs">
                                  {resource.fileType.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                {resource.description?.trim()
                                  ? resource.description
                                  : "Sin descripción todavía. Puedes completarla en Recursos para orientar mejor a la IA."}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-2xl border bg-muted/20 p-4">
                      <p className="text-sm font-medium">Cómo se usarán</p>
                      <p className="mt-2 text-xs leading-6 text-muted-foreground">
                        Péndola incorporará estas referencias como contexto del proyecto cuando le pidas ideas, análisis o texto narrativo.
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => router.push(`/proyecto/${projectSegment}/recursos`)}
                    >
                      Gestionar recursos
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
      <ImageLibraryDialog
        projectId={project.id}
        open={isLibraryOpen}
        onOpenChange={setIsLibraryOpen}
        onSelect={handleSelectProjectCoverFromLibrary}
        title="Elegir portada del proyecto"
        description="Usa una imagen que ya subiste en Recursos sin volver a cargarla."
        confirmLabel="Usar como portada"
      />
    </div>
  );
}
