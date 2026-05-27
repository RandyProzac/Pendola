"use client";

import { use, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Compass,
  FileText,
  Files,
  ShieldAlert,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AIPanel } from "@/components/editor/ai-panel";
import { buildProjectContext, resolveProjectContextMode } from "@/lib/ai/context";
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

Usa markdown claro con esta estructura:
## Hallazgos críticos
## Incongruencias o contradicciones
## Huecos de causalidad
## Personajes con motivación débil o inconsistente
## Preguntas abiertas que el texto deja sin resolver
## Recomendaciones concretas

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

Respóndeme en markdown con:
## Hallazgos críticos
## Huecos de causalidad
## Preguntas abiertas sin resolver
## Recomendaciones concretas

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

Responde en markdown con:
## Hallazgos críticos
## Personajes con motivación débil o inconsistente
## Incongruencias o contradicciones
## Recomendaciones concretas

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

Devuelve en markdown:
## Hallazgos críticos
## Incongruencias o contradicciones
## Huecos de causalidad
## Preguntas abiertas que el texto deja sin resolver
## Recomendaciones concretas

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

Responde en markdown con:
## Hallazgos críticos
## Huecos de causalidad
## Preguntas abiertas
## Recomendaciones concretas

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
  const quickActions = useMemo(
    () =>
      PROJECT_AUDIT_QUICK_ACTIONS.map((action) => ({
        id: action.key,
        label: action.label,
        onClick: () => launchAuditPrompt(action.prompt, action.mode),
      })),
    [launchAuditPrompt]
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
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

      <div className="flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
          <section className="min-h-[68dvh] overflow-hidden">
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
              emptyStateText="Conversa con tu proyecto."
              externalPromptRequest={externalPromptRequest ?? undefined}
              quickActions={quickActions}
              presentation="clean-chat"
              className="h-full w-full border-l-0 bg-transparent"
            />
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3 text-xs text-muted-foreground/85">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <WandSparkles className="h-3.5 w-3.5 text-violet-500" />
                IA del proyecto
              </span>
              <span>{resources.length} recursos</span>
              <span>{characters.length} personajes</span>
              <span>{scenarios.length} escenarios</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="transition-colors hover:text-foreground"
                onClick={() => router.push(`/proyecto/${projectSegment}/personalizacion`)}
              >
                Memoria global
              </button>
              <button
                type="button"
                className="transition-colors hover:text-foreground"
                onClick={() => router.push(`/proyecto/${projectSegment}/recursos`)}
              >
                Recursos
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
