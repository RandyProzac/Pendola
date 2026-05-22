"use client";

import { use, useEffect, useMemo, useState } from "react";
import { BookMarked, Calculator, CheckCircle2, FileOutput, Image as ImageIcon, TriangleAlert } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resolveEntityId } from "@/lib/routing";
import { useProjectStore } from "@/lib/store";
import { getPublicMediaUrl } from "@/lib/supabase/storage";
import {
  buildPublicationPreflight,
  estimateKdpPrintRoyalty,
  estimatePageCount,
  estimateSpineWidthInches,
  formatAudiobookDuration,
  normalizeCommaSeparatedList,
  PUBLICATION_PROFILE_OPTIONS,
  TRIM_SIZE_OPTIONS,
  validateCoverForProfile,
  type CoverValidationResult,
} from "@/lib/publishing";

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function getStatusTone(status: "complete" | "warning" | "blocked") {
  if (status === "complete") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "warning") return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300";
}

export default function PublicacionPage({ params }: PageProps) {
  const { id: projectSegment } = use(params);
  const {
    projects,
    books,
    chapters,
    updateProject,
    updateBook,
    setCurrentProject,
  } = useProjectStore();
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [coverDimensions, setCoverDimensions] = useState<{ width?: number; height?: number }>({});

  const projectId = resolveEntityId(
    projectSegment,
    projects.map((item) => item.id)
  );
  const project = projects.find((item) => item.id === projectId);
  const projectBooks = books
    .filter((item) => item.projectId === projectId)
    .sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (project) {
      setCurrentProject(project.id);
    }
  }, [project, setCurrentProject]);

  useEffect(() => {
    if (!selectedBookId && projectBooks[0]) {
      setSelectedBookId(projectBooks[0].id);
    }
  }, [projectBooks, selectedBookId]);

  const selectedBook =
    projectBooks.find((book) => book.id === selectedBookId) || projectBooks[0];

  const selectedChapters = useMemo(
    () =>
      selectedBook
        ? chapters
            .filter((chapter) => chapter.bookId === selectedBook.id)
            .sort((a, b) => a.order - b.order)
        : [],
    [chapters, selectedBook]
  );

  const selectedWordCount = useMemo(
    () => selectedChapters.reduce((total, chapter) => total + chapter.wordCount, 0),
    [selectedChapters]
  );

  const coverUrl = getPublicMediaUrl(project?.coverImagePath);

  useEffect(() => {
    if (!coverUrl) {
      setCoverDimensions({});
      return;
    }

    const image = new window.Image();
    image.onload = () => {
      setCoverDimensions({ width: image.width, height: image.height });
    };
    image.onerror = () => {
      setCoverDimensions({});
    };
    image.src = coverUrl;
  }, [coverUrl]);

  const coverValidation: CoverValidationResult | null = useMemo(() => {
    if (!project) return null;
    return validateCoverForProfile({
      profile: project.publicationSettings.targetProfile,
      coverPath: project.coverImagePath,
      width: coverDimensions.width,
      height: coverDimensions.height,
    });
  }, [coverDimensions.height, coverDimensions.width, project]);

  const pageCount = project
    ? estimatePageCount(selectedWordCount, project.publicationSettings.trimSize)
    : 0;
  const spineWidth = estimateSpineWidthInches(pageCount);
  const royalty = selectedBook
    ? estimateKdpPrintRoyalty(selectedBook.publicationSettings.priceUsd, pageCount)
    : { printingCost: 0, grossRoyalty: 0, netRoyalty: 0 };
  const preflight = project && selectedBook && coverValidation
    ? buildPublicationPreflight({
        project,
        book: selectedBook,
        wordCount: selectedWordCount,
        chapterCount: selectedChapters.length,
        coverValidation,
      })
    : [];

  if (!project) return null;

  const selectedProfile = PUBLICATION_PROFILE_OPTIONS.find(
    (option) => option.id === project.publicationSettings.targetProfile
  );

  return (
    <div className="flex min-h-screen flex-col bg-muted/10">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-6">
          <SidebarTrigger />
          <BookMarked className="h-5 w-5 text-violet-500" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Publicación</h1>
          </div>
          {selectedProfile ? (
            <Badge variant="outline" className="border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300">
              {selectedProfile.label}
            </Badge>
          ) : null}
        </div>
      </header>

      <div className="flex-1 p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-[1.75rem] border bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.18),transparent_36%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.88))]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-500">
                <FileOutput className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-700/80 dark:text-violet-300/80">
                  Capa editorial
                </p>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Prepara el proyecto para exportar, validar y publicar sin salir de Péndola.
                </h2>
                <p className="max-w-4xl text-sm leading-7 text-muted-foreground">
                  Esta primera versión centraliza metadatos, checklist, cálculos editoriales, validación
                  de portada y el perfil de salida que usará el exportador DOCX.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
            <section className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración general</CardTitle>
                  <CardDescription>
                    Datos compartidos por el proyecto y sus libros publicados.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Autor</label>
                    <Input
                      value={project.publicationSettings.authorName}
                      onChange={(event) =>
                        updateProject(project.id, {
                          publicationSettings: {
                            ...project.publicationSettings,
                            authorName: event.target.value,
                          },
                        })
                      }
                      placeholder="Nombre del autor"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Seudónimo</label>
                    <Input
                      value={project.publicationSettings.penName}
                      onChange={(event) =>
                        updateProject(project.id, {
                          publicationSettings: {
                            ...project.publicationSettings,
                            penName: event.target.value,
                          },
                        })
                      }
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Idioma editorial</label>
                    <Select
                      value={project.publicationSettings.language}
                      onValueChange={(value) =>
                        updateProject(project.id, {
                          publicationSettings: {
                            ...project.publicationSettings,
                            language: value as typeof project.publicationSettings.language,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Objetivo</label>
                    <Select
                      value={project.publicationSettings.publicationGoal}
                      onValueChange={(value) =>
                        updateProject(project.id, {
                          publicationSettings: {
                            ...project.publicationSettings,
                            publicationGoal: value as typeof project.publicationSettings.publicationGoal,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self_publish">Self-publishing</SelectItem>
                        <SelectItem value="traditional">Tradicional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Perfil de exportación</label>
                    <Select
                      value={project.publicationSettings.targetProfile}
                      onValueChange={(value) =>
                        updateProject(project.id, {
                          publicationSettings: {
                            ...project.publicationSettings,
                            targetProfile: value as typeof project.publicationSettings.targetProfile,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PUBLICATION_PROFILE_OPTIONS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trim size</label>
                    <Select
                      value={project.publicationSettings.trimSize}
                      onValueChange={(value) =>
                        updateProject(project.id, {
                          publicationSettings: {
                            ...project.publicationSettings,
                            trimSize: value as typeof project.publicationSettings.trimSize,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIM_SIZE_OPTIONS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Año de copyright</label>
                    <Input
                      value={project.publicationSettings.copyrightYear}
                      onChange={(event) =>
                        updateProject(project.id, {
                          publicationSettings: {
                            ...project.publicationSettings,
                            copyrightYear: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estilo de comillas</label>
                    <Select
                      value={project.publicationSettings.quotationStyle}
                      onValueChange={(value) =>
                        updateProject(project.id, {
                          publicationSettings: {
                            ...project.publicationSettings,
                            quotationStyle: value as typeof project.publicationSettings.quotationStyle,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="latinas">Latinas «…»</SelectItem>
                        <SelectItem value="inglesas">Inglesas "…"</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Categorías BISAC</label>
                    <Input
                      value={project.publicationSettings.bisacCategories.join(", ")}
                      onChange={(event) =>
                        updateProject(project.id, {
                          publicationSettings: {
                            ...project.publicationSettings,
                            bisacCategories: normalizeCommaSeparatedList(event.target.value),
                          },
                        })
                      }
                      placeholder="FIC027020, FIC019000"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Keywords</label>
                    <Input
                      value={project.publicationSettings.keywords.join(", ")}
                      onChange={(event) =>
                        updateProject(project.id, {
                          publicationSettings: {
                            ...project.publicationSettings,
                            keywords: normalizeCommaSeparatedList(event.target.value),
                          },
                        })
                      }
                      placeholder="niebla, faro, memoria, archipiélago"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Libro listo para publicar</CardTitle>
                  <CardDescription>
                    Ajustes específicos por libro para sinopsis, precio y datos comerciales.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {projectBooks.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
                      Crea al menos un libro dentro del proyecto para completar su ficha de publicación.
                    </div>
                  ) : (
                    <Tabs value={selectedBook?.id} onValueChange={setSelectedBookId}>
                      <TabsList className="mb-5 w-full justify-start overflow-x-auto" variant="line">
                        {projectBooks.map((book) => (
                          <TabsTrigger key={book.id} value={book.id}>
                            {book.title}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {projectBooks.map((book) => (
                        <TabsContent key={book.id} value={book.id} className="space-y-5">
                          <div className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Subtítulo</label>
                              <Input
                                value={book.publicationSettings.subtitle}
                                onChange={(event) =>
                                  updateBook(book.id, {
                                    publicationSettings: {
                                      ...book.publicationSettings,
                                      subtitle: event.target.value,
                                    },
                                  })
                                }
                                placeholder="Opcional"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">ISBN-13</label>
                              <Input
                                value={book.publicationSettings.isbn}
                                onChange={(event) =>
                                  updateBook(book.id, {
                                    publicationSettings: {
                                      ...book.publicationSettings,
                                      isbn: event.target.value,
                                    },
                                  })
                                }
                                placeholder="978..."
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-sm font-medium">Tagline</label>
                              <Input
                                value={book.publicationSettings.tagline}
                                onChange={(event) =>
                                  updateBook(book.id, {
                                    publicationSettings: {
                                      ...book.publicationSettings,
                                      tagline: event.target.value,
                                    },
                                  })
                                }
                                placeholder="Una línea breve para banners o promo"
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-sm font-medium">Sinopsis corta</label>
                              <Textarea
                                rows={4}
                                value={book.publicationSettings.shortSynopsis}
                                onChange={(event) =>
                                  updateBook(book.id, {
                                    publicationSettings: {
                                      ...book.publicationSettings,
                                      shortSynopsis: event.target.value,
                                    },
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-sm font-medium">Sinopsis larga</label>
                              <Textarea
                                rows={7}
                                value={book.publicationSettings.longSynopsis}
                                onChange={(event) =>
                                  updateBook(book.id, {
                                    publicationSettings: {
                                      ...book.publicationSettings,
                                      longSynopsis: event.target.value,
                                    },
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Precio base USD</label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={book.publicationSettings.priceUsd}
                                onChange={(event) =>
                                  updateBook(book.id, {
                                    publicationSettings: {
                                      ...book.publicationSettings,
                                      priceUsd: Number(event.target.value || 0),
                                    },
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Sinopsis actual del libro</label>
                              <div className="rounded-xl border bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
                                {book.synopsis || "Todavía no hay synopsis base en este libro."}
                              </div>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-sm font-medium">Acerca del autor</label>
                              <Textarea
                                rows={6}
                                value={book.publicationSettings.aboutAuthor}
                                onChange={(event) =>
                                  updateBook(book.id, {
                                    publicationSettings: {
                                      ...book.publicationSettings,
                                      aboutAuthor: event.target.value,
                                    },
                                  })
                                }
                              />
                            </div>
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            </section>

            <aside className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Pre-flight
                  </CardTitle>
                  <CardDescription>
                    Checklist previo al export final del libro seleccionado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {preflight.map((item) => (
                    <div key={item.id} className="rounded-2xl border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{item.label}</p>
                        <Badge variant="outline" className={getStatusTone(item.status)}>
                          {item.status === "complete"
                            ? "Listo"
                            : item.status === "warning"
                              ? "Atención"
                              : "Bloqueante"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs leading-6 text-muted-foreground">{item.detail}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-cyan-500" />
                    Estimaciones
                  </CardTitle>
                  <CardDescription>
                    Cálculos rápidos a partir del manuscrito del libro activo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Páginas estimadas
                    </p>
                    <p className="mt-2 text-3xl font-semibold">{pageCount}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedWordCount.toLocaleString("es-ES")} palabras · trim {project.publicationSettings.trimSize}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border bg-muted/20 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Lomo estimado
                      </p>
                      <p className="mt-2 text-2xl font-semibold">{spineWidth}"</p>
                      <p className="mt-1 text-xs text-muted-foreground">Ancho orientativo para print.</p>
                    </div>
                    <div className="rounded-2xl border bg-muted/20 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Audiobook
                      </p>
                      <p className="mt-2 text-2xl font-semibold">{formatAudiobookDuration(selectedWordCount)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Estimado con 9.300 palabras/hora.</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Royalty estimado KDP Print
                    </p>
                    <div className="mt-3 grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Costo impresión</span>
                        <span>{formatCurrency(royalty.printingCost)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Royalty bruto</span>
                        <span>{formatCurrency(royalty.grossRoyalty)}</span>
                      </div>
                      <div className="flex items-center justify-between font-medium">
                        <span>Royalty neto</span>
                        <span>{formatCurrency(royalty.netRoyalty)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-amber-500" />
                    Portada
                  </CardTitle>
                  <CardDescription>
                    Validación base contra el perfil de exportación seleccionado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Estado de la portada</p>
                      <Badge
                        variant="outline"
                        className={coverValidation?.passes ? getStatusTone("complete") : getStatusTone("blocked")}
                      >
                        {coverValidation?.passes ? "Válida" : "Revisar"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {coverDimensions.width && coverDimensions.height
                        ? `${coverDimensions.width}×${coverDimensions.height}px`
                        : "Dimensiones pendientes o no disponibles."}
                    </p>
                  </div>
                  {(coverValidation?.warnings || []).map((warning) => (
                    <div key={warning} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-6 text-amber-800 dark:text-amber-200">
                      <div className="flex items-start gap-2">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{warning}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
