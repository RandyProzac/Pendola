"use client";

import { use, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Compass,
  FileText,
  Files,
  Paperclip,
  ShieldAlert,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIPanel } from "@/components/editor/ai-panel";
import { buildProjectContext, resolveProjectContextMode } from "@/lib/ai/context";
import { AI_MODE_CONFIG } from "@/lib/ai/modes";
import type { AIMode } from "@/lib/types";
import { makeBookPath, makeEditorialBookPath, resolveEntityId } from "@/lib/routing";
import { useProjectStore } from "@/lib/store";

interface PageProps {
  params: Promise<{ id: string }>;
}

const PROJECT_AUDIT_QUICK_ACTIONS: Array<{
  key: string;
  label: string;
  icon: typeof ShieldAlert;
  prompt: string;
  mode: AIMode;
}> = [
  {
    key: "incongruencias",
    label: "Buscar incongruencias",
    icon: ShieldAlert,
    mode: "revision",
    prompt: `Audita todo el proyecto y busca incongruencias o contradicciones narrativas.

Quiero una respuesta breve, por tandas.
Entrega solo los 3 hallazgos más prioritarios en este bloque.

Usa esta estructura:
- Hallazgos críticos
- Incongruencias o contradicciones
- Huecos de causalidad
- Personajes con motivación débil o inconsistente
- Preguntas abiertas que el texto deja sin resolver
- Recomendaciones concretas

Cita libro, capítulo y personaje o escenario implicado cuando sea posible.
No escribas una respuesta larga.
Al final añade una sola línea: "Si quieres, sigo con la siguiente tanda."`,
  },
  {
    key: "huecos",
    label: "Detectar huecos de guion",
    icon: Files,
    mode: "revision",
    prompt: `Audita todo el proyecto y detecta huecos de guion, vacíos causales o saltos de lógica.

Necesito una revisión global del manuscrito con foco en:
- hechos que ocurren sin causa suficiente
- consecuencias que no se sostienen
- escenas o decisiones que parecen aparecer demasiado pronto o demasiado tarde
- promesas narrativas que no se pagan

Entrega solo 3 hallazgos prioritarios en esta respuesta.
Sé concreto y breve.

Respóndeme con:
- Hallazgos críticos
- Huecos de causalidad
- Preguntas abiertas sin resolver
- Recomendaciones concretas

Al final añade: "Si quieres, sigo con la siguiente tanda."`,
  },
  {
    key: "continuidad",
    label: "Revisar continuidad de personajes",
    icon: Compass,
    mode: "revision",
    prompt: `Lee todo el proyecto y revisa la continuidad de personajes.

Quiero que detectes:
- cambios de voz o conducta sin transición
- motivaciones que se debilitan o se contradicen
- relaciones que cambian sin suficiente desarrollo
- conocimientos, heridas, decisiones o reacciones que no respetan lo ya ocurrido

Entrega solo 3 hallazgos prioritarios en este bloque.

Responde con:
- Hallazgos críticos
- Personajes con motivación débil o inconsistente
- Incongruencias o contradicciones
- Recomendaciones concretas

Al final añade: "Si quieres, sigo con la siguiente tanda."`,
  },
  {
    key: "mundo",
    label: "Revisar lógica del mundo",
    icon: ShieldAlert,
    mode: "revision",
    prompt: `Audita todo el proyecto y revisa la lógica del mundo narrativo.

Quiero que evalúes reglas, atmósferas, límites, capacidades, consecuencias y coherencia entre escenarios y acontecimientos.

Entrega solo 3 hallazgos prioritarios.
No te extiendas.

Devuelve:
- Hallazgos críticos
- Incongruencias o contradicciones
- Huecos de causalidad
- Preguntas abiertas que el texto deja sin resolver
- Recomendaciones concretas

Al final añade: "Si quieres, sigo con la siguiente tanda."`,
  },
  {
    key: "ritmo",
    label: "Revisar ritmo y progresión del conflicto",
    icon: WandSparkles,
    mode: "revision",
    prompt: `Lee todo el proyecto y revisa el ritmo narrativo y la progresión del conflicto.

Quiero detectar:
- capítulos que estancan el avance
- escalada insuficiente o irregular
- repeticiones de función dramática
- puntos donde el conflicto principal pierde tensión

Entrega solo 3 hallazgos prioritarios en esta respuesta.
Sé directo.

Responde con:
- Hallazgos críticos
- Huecos de causalidad
- Preguntas abiertas
- Recomendaciones concretas

Al final añade: "Si quieres, sigo con la siguiente tanda."`,
  },
];

export default function IAProjectPage({ params }: PageProps) {
  const { id: projectSegment } = use(params);
  const router = useRouter();
  const [externalPromptRequest, setExternalPromptRequest] = useState<{
    id: string;
    prompt: string;
    mode: AIMode;
  } | null>(null);
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
  const chapters = useMemo(
    () => books.flatMap((book) => getChaptersByBook(book.id)),
    [books, getChaptersByBook]
  );
  const buildGlobalProjectContext = useCallback(
    (messageContent: string) =>
      buildProjectContext({
        project,
        books,
        chapters,
        characters,
        scenarios,
        resources,
        queryText: messageContent,
        mode: resolveProjectContextMode(messageContent),
      }),
    [books, chapters, characters, project, resources, scenarios]
  );
  const launchAuditPrompt = useCallback((prompt: string, mode: AIMode) => {
    setExternalPromptRequest({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      prompt,
      mode,
    });
  }, []);

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
                    sin depender de un capítulo concreto. El chat normal usa memoria global resumida;
                    las auditorías profundas leen el proyecto completo antes de devolverte hallazgos.
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
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold">Auditoría narrativa profunda</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Dispara revisiones globales del proyecto para buscar contradicciones, huecos de guion,
                    continuidad floja o problemas de ritmo. Cada auditoría responde por bloques cortos,
                    no como un informe gigante, para ahorrar tokens y mantener foco.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  Solo este proyecto
                </Badge>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {PROJECT_AUDIT_QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.key}
                      type="button"
                      variant="outline"
                      className="justify-start rounded-xl px-4 py-5 text-left"
                      onClick={() => launchAuditPrompt(action.prompt, action.mode)}
                    >
                      <Icon className="mr-2 h-4 w-4 shrink-0" />
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border bg-card/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Contexto disponible para la IA</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    La mesa IA global usa un workspace propio por proyecto. Eso evita que los chats de capítulos
                    aparezcan aquí y refuerza que ninguna conversación de otro proyecto contamine este análisis.
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
              workspace="project"
              projectTitle={project.title}
              contextBuilder={buildGlobalProjectContext}
              panelTitle="Mesa IA del proyecto"
              panelDescription="Ideas y diagnóstico del proyecto."
              assistantLabel="Péndola IA"
              inputPlaceholder="Pregunta por el proyecto completo, pide una auditoría o revisa coherencia, personajes, mundo y conflicto..."
              emptyStateText="Abre una conversación global del proyecto o lanza una auditoría profunda. Este espacio está separado de los chats por capítulo."
              externalPromptRequest={externalPromptRequest ?? undefined}
              className="h-full w-full border-l-0 bg-transparent"
            />
          </section>
        </div>
      </div>
    </div>
  );
}
