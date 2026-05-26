"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Paperclip,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIPanel } from "@/components/editor/ai-panel";
import { AI_MODE_CONFIG } from "@/lib/ai/modes";
import { makeBookPath, makeEditorialBookPath, resolveEntityId } from "@/lib/routing";
import { useProjectStore } from "@/lib/store";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function IAProjectPage({ params }: PageProps) {
  const { id: projectSegment } = use(params);
  const router = useRouter();
  const {
    projects,
    getBooksByProject,
    getChaptersByBook,
    getResourcesByProject,
    getCharactersByProject,
    getScenariosByProject,
  } = useProjectStore();

  const projectId = resolveEntityId(
    projectSegment,
    projects.map((item) => item.id)
  );
  const project = projects.find((item) => item.id === projectId);

  if (!project) return null;

  const books = getBooksByProject(projectId);
  const firstBook = books[0];
  const firstChapter = firstBook ? getChaptersByBook(firstBook.id)[0] : undefined;
  const resources = getResourcesByProject(projectId);
  const characters = getCharactersByProject(projectId);
  const scenarios = getScenariosByProject(projectId);

  const projectContext = [
    project.premise?.trim() ? `Premisa del proyecto:\n${project.premise.trim()}` : "",
    project.creativeProfile?.trim()
      ? `Perfil creativo y memoria global:\n${project.creativeProfile.trim()}`
      : "",
    project.aiInstructions?.trim()
      ? `Cómo debe responder Péndola:\n${project.aiInstructions.trim()}`
      : "",
    project.editorialInstructions?.trim()
      ? `Criterio editorial del proyecto:\n${project.editorialInstructions.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const modeHighlights = [
    {
      key: "copiloto",
      title: "Copiloto",
      description: AI_MODE_CONFIG.copiloto.emptyState,
    },
    {
      key: "ideas",
      title: "Ideas",
      description: AI_MODE_CONFIG.ideas.emptyState,
    },
    {
      key: "revision",
      title: "Revisión",
      description: AI_MODE_CONFIG.revision.emptyState,
    },
  ] as const;

  return (
    <div className="flex min-h-screen flex-col bg-muted/10">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-auto flex-wrap items-center gap-3 px-4 py-3 sm:h-14 sm:flex-nowrap sm:px-6 sm:py-0">
          <SidebarTrigger />
          <Sparkles className="h-5 w-5 text-violet-500" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold">Mesa IA</h1>
          </div>
          {firstBook ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="order-3 w-full rounded-xl sm:order-none sm:w-auto"
                onClick={() => router.push(makeBookPath(project, firstBook))}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Escribir
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full rounded-xl sm:w-auto"
                onClick={() => router.push(makeEditorialBookPath(project, firstBook))}
              >
                <FileText className="mr-2 h-4 w-4" />
                Editorial
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <div className="flex-1 p-4 md:p-8">
        <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <section className="space-y-6">
            <div className="rounded-[1.75rem] border bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.2),transparent_36%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.88))]">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-500">
                  <WandSparkles className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-700/80 dark:text-violet-300/80">
                    IA del proyecto
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Conversa con Péndola desde la perspectiva completa del proyecto.
                  </h2>
                  <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                    Esta mesa sirve para pedir ideas, diagnosticar bloqueos o revisar decisiones narrativas
                    sin depender de un capítulo concreto. Péndola tomará como memoria el perfil creativo,
                    las instrucciones globales y tus referencias cargadas.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border bg-card/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Recursos
                </p>
                <p className="mt-2 text-2xl font-semibold">{resources.length}</p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  Archivos que la IA puede tener presentes como contexto real.
                </p>
              </div>
              <div className="rounded-2xl border bg-card/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Personajes
                </p>
                <p className="mt-2 text-2xl font-semibold">{characters.length}</p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  Voces, impulsos y tensiones que ya forman parte del proyecto.
                </p>
              </div>
              <div className="rounded-2xl border bg-card/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Escenarios
                </p>
                <p className="mt-2 text-2xl font-semibold">{scenarios.length}</p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  Lugares y atmósferas disponibles para pensar escenas y estructura.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {modeHighlights.map((mode) => (
                <div key={mode.key} className="rounded-2xl border bg-card/70 p-4">
                  <p className="text-sm font-semibold">{mode.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {mode.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border bg-card/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Contexto disponible para la IA</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    La mesa IA ya conoce la premisa, la memoria creativa y las instrucciones del proyecto.
                    Si además quieres apoyarte en material documental, completa tus recursos descriptivos.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">Proyecto completo</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => router.push(`/proyecto/${projectSegment}/personalizacion`)}
                >
                  Ajustar memoria global
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => router.push(`/proyecto/${projectSegment}/recursos`)}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  Gestionar recursos
                </Button>
              </div>
              {firstChapter ? (
                <p className="mt-4 text-xs leading-6 text-muted-foreground">
                  Si luego quieres insertar texto directo en un capítulo, abre{" "}
                  <span className="font-medium text-foreground">{firstChapter.title}</span> desde
                  `Escribir` o `Editorial`.
                </p>
              ) : null}
            </div>
          </section>

          <section className="min-h-[60dvh] overflow-hidden rounded-[1.75rem] border bg-card/70 shadow-[0_18px_60px_rgba(15,23,42,0.08)] xl:min-h-[720px]">
            <AIPanel
              visible
              projectId={project.id}
              workspace="writing"
              projectTitle={project.title}
              contextText={projectContext}
              panelTitle="Mesa IA del proyecto"
              panelDescription="Ideas y diagnóstico del proyecto."
              assistantLabel="Péndola IA"
              inputPlaceholder="Pide ideas, revisa una decisión del proyecto o destraba un problema narrativo..."
              emptyStateText="Abre una conversación general sobre el proyecto: tono, estructura, personajes, conflictos o próximos movimientos."
              className="h-full w-full border-l-0 bg-transparent"
            />
          </section>
        </div>
      </div>
    </div>
  );
}
