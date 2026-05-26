"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Feather,
  BookOpen,
  Clock,
  Sparkles,
  Copy,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { estimatePageRange } from "@/lib/publishing";
import { useProjectStore } from "@/lib/store";
import { makeProjectPath } from "@/lib/routing";
import { getPublicMediaUrl } from "@/lib/supabase/storage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  planificando: {
    label: "Planificando",
    className: "border-border bg-background text-muted-foreground",
  },
  escribiendo: {
    label: "Escribiendo",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  revisando: {
    label: "Revisando",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  completado: {
    label: "Completado",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
};

function formatCompactPageEstimate(minPages: number, maxPages: number) {
  if (maxPages <= 0) return "0 p.";
  if (minPages === maxPages) return `${minPages} p.`;
  return `${minPages}–${maxPages} p.`;
}

export default function DashboardPage() {
  const router = useRouter();
  const {
    projects,
    getBooksByProject,
    chapters,
    characters,
    createProject,
    createBook,
    createChapter,
    deleteProject,
  } = useProjectStore();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getProjectStats = (projectId: string) => {
    const books = getBooksByProject(projectId);
    const projectChapters = chapters.filter((c) => c.projectId === projectId);
    const projectCharacters = characters.filter((c) => c.projectId === projectId);
    const totalWords = projectChapters.reduce((acc, c) => acc + c.wordCount, 0);

    return {
      books: books.length,
      chapters: projectChapters.length,
      characters: projectCharacters.length,
      words: totalWords,
    };
  };

  const getProjectInitial = (title: string) => {
    const trimmed = title.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : "P";
  };

  const handleDuplicateProject = (projectId: string) => {
    const sourceProject = projects.find((project) => project.id === projectId);
    if (!sourceProject) return;

    const clonedProject = createProject({
      title: `${sourceProject.title} (copia)`,
      type: sourceProject.type,
      genre: sourceProject.genre,
      premise: sourceProject.premise,
      theme: sourceProject.theme,
      antiTheme: sourceProject.antiTheme,
      creativeProfile: sourceProject.creativeProfile,
      aiInstructions: sourceProject.aiInstructions,
      editorialInstructions: sourceProject.editorialInstructions,
      coverColor: sourceProject.coverColor,
      coverImagePath: sourceProject.coverImagePath,
      status: sourceProject.status,
    });

    const sourceBooks = getBooksByProject(projectId);

    sourceBooks.forEach((book) => {
      const clonedBook = createBook(clonedProject.id, {
        title: book.title,
        synopsis: book.synopsis,
        status: book.status,
        order: book.order,
      });

      chapters
        .filter((chapter) => chapter.bookId === book.id)
          .sort((a, b) => a.order - b.order)
          .forEach((chapter) => {
          createChapter(clonedBook.id, clonedProject.id, {
            title: chapter.title,
            coverImagePath: chapter.coverImagePath,
            content: chapter.content,
            wordCount: chapter.wordCount,
            status: chapter.status,
            order: chapter.order,
            beatNumber: chapter.beatNumber,
          });
        });
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-auto flex-wrap items-center gap-3 px-4 py-3 sm:h-14 sm:flex-nowrap sm:px-6 sm:py-0">
          <SidebarTrigger />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold">Mis Proyectos</h1>
          </div>
          <Button onClick={() => router.push("/proyecto/nuevo")} size="sm" className="order-3 w-full sm:order-none sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Proyecto
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-4 sm:p-6">
        {projects.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="mb-8">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-violet-600/20 to-indigo-700/20 flex items-center justify-center">
                <Feather className="h-12 w-12 text-violet-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Bienvenido a Péndola
            </h2>
            <p className="text-muted-foreground max-w-md mb-8">
              Tu plataforma inteligente para dar vida a historias extraordinarias.
              Comienza creando tu primer proyecto.
            </p>
            <Button
              size="lg"
              onClick={() => router.push("/proyecto/nuevo")}
              className="bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white shadow-lg shadow-violet-500/25"
            >
              <Plus className="h-5 w-5 mr-2" />
              Crear mi primer proyecto
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push("/demo/proyecto-prueba")}
              className="mt-3 text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              ¿No sabes por dónde empezar? Carga el proyecto demo
            </Button>

            {/* Feature cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 max-w-3xl w-full">
              <div className="flex flex-col items-center p-4 rounded-lg border bg-card text-card-foreground">
                <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-3">
                  <BookOpen className="h-5 w-5 text-violet-500" />
                </div>
                <h3 className="font-medium text-sm mb-1">Planifica</h3>
                <p className="text-xs text-muted-foreground text-center">
                  Personajes profundos, escenarios vivos y estructuras narrativas
                </p>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg border bg-card text-card-foreground">
                <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-3">
                  <Feather className="h-5 w-5 text-violet-500" />
                </div>
                <h3 className="font-medium text-sm mb-1">Escribe</h3>
                <p className="text-xs text-muted-foreground text-center">
                  Editor inteligente con IA que entiende tu historia
                </p>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg border bg-card text-card-foreground">
                <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-3">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                </div>
                <h3 className="font-medium text-sm mb-1">Da vida</h3>
                <p className="text-xs text-muted-foreground text-center">
                  Genera imágenes, revisa coherencia y publica
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Project Grid */
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const stats = getProjectStats(project.id);
              const projectBooks = getBooksByProject(project.id);
              const booksWithPages = projectBooks.map((book) => {
                const bookWordCount = chapters
                  .filter((chapter) => chapter.bookId === book.id)
                  .reduce((total, chapter) => total + (chapter.wordCount ?? 0), 0);
                const pageRange = estimatePageRange(
                  bookWordCount,
                  project.publicationSettings.trimSize
                );

                return {
                  id: book.id,
                  title: book.title,
                  pageLabel: formatCompactPageEstimate(pageRange.minPages, pageRange.maxPages),
                };
              });
              const statusInfo = STATUS_LABELS[project.status] || STATUS_LABELS.planificando;
              const projectPath = makeProjectPath(project);

              return (
                <Card
                  key={project.id}
                  className="group relative overflow-hidden border pt-0 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-500/30 hover:shadow-lg hover:shadow-black/10"
                >
                  <div className="absolute right-3 top-3 z-20 flex items-start gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm ring-1 ring-black/5 transition-all hover:bg-accent hover:text-foreground md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => {
                            handleDuplicateProject(project.id);
                          }}
                        >
                          <Copy className="h-4 w-4" />
                          Duplicar proyecto
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            setDeleteId(project.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar proyecto
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Link
                    href={projectPath}
                    className="block overflow-hidden rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500/60"
                    onClick={() => {
                      useProjectStore.getState().setCurrentProject(project.id);
                    }}
                    aria-label={`Abrir proyecto ${project.title}`}
                  >
                    {project.coverImagePath ? (
                      <div className="relative h-36 overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getPublicMediaUrl(project.coverImagePath) || ""}
                          alt={`Portada de ${project.title}`}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-slate-950/10 to-transparent" />
                        <div
                          className="absolute inset-x-0 top-0 h-2"
                          style={{ backgroundColor: project.coverColor }}
                        />
                      </div>
                    ) : (
                      <div
                        className="relative flex h-32 items-end overflow-hidden px-4 py-3 text-white"
                        style={{ backgroundColor: project.coverColor }}
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.28))]" />
                        <div className="relative flex items-end justify-between gap-4">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.22em] text-white/72">
                              {project.type || "Proyecto"}
                            </p>
                            <p className="mt-1 font-serif text-4xl leading-none text-white/95">
                              {getProjectInitial(project.title)}
                            </p>
                          </div>
                          {project.genre ? (
                            <p className="line-clamp-2 max-w-[10rem] text-right text-xs text-white/78">
                              {project.genre}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )}
                    <CardHeader className="pt-5 pb-3">
                      <div className="space-y-2">
                        <CardTitle className="line-clamp-2 text-lg font-semibold">
                          {project.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 text-sm leading-6">
                          {project.premise || "Sin premisa definida"}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Palabras escritas
                        </p>
                        <p className="text-2xl font-bold tracking-tight">
                          {stats.words.toLocaleString("es-ES")}
                        </p>
                      </div>

                      {booksWithPages.length > 0 && (
                        <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            Libros
                          </p>
                          <div className="space-y-1.5">
                            {booksWithPages.map((book) => (
                              <div
                                key={book.id}
                                className="flex items-center justify-between gap-3 text-sm"
                              >
                                <span className="line-clamp-1 text-foreground/85">
                                  {book.title}
                                </span>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  {book.pageLabel}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 border-t pt-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className={statusInfo.className}>
                          {statusInfo.label}
                        </Badge>
                        <span>{stats.books} libros</span>
                        <span>{stats.chapters} capítulos</span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {new Date(project.updatedAt).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              );
            })}

            {/* New project card */}
            <Link href="/proyecto/nuevo" className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-2">
              <Card className="flex min-h-[220px] items-center justify-center border-dashed transition-colors duration-300 hover:border-violet-500/50 hover:bg-violet-500/[0.03]">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-muted-foreground/35 bg-background">
                    <Plus className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Nuevo Proyecto</span>
                  <span className="text-xs text-muted-foreground">Empieza otra historia desde cero</span>
                </div>
              </Card>
            </Link>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción borrará también sus libros, capítulos y datos
              asociados guardados localmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteId) return;
                deleteProject(deleteId);
                setDeleteId(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
