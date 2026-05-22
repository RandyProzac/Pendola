"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Feather, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useTheme } from "@/components/providers/theme-provider";
import { useProjectStore } from "@/lib/store";
import { makeBookPath } from "@/lib/routing";
import { cn } from "@/lib/utils";

export default function NewProjectPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { createProject, createBook, createChapter, setCurrentProject } =
    useProjectStore();

  const [title, setTitle] = useState("");
  const [premise, setPremise] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const suggestedTitle = useMemo(() => {
    if (title.trim()) return title.trim();
    if (!premise.trim()) return "Nuevo Proyecto";
    return premise.trim().slice(0, 42);
  }, [premise, title]);

  const handleCreate = () => {
    if (isCreating) return;

    setIsCreating(true);

    const project = createProject({
      title: suggestedTitle,
      type: "novela",
      premise: premise.trim(),
      editorialInstructions:
        "Aplica una corrección editorial con criterio RAE práctico: ortografía, puntuación, gramática, claridad y ritmo, preservando la voz del autor salvo error claro.",
      status: "escribiendo",
    });

    const book = createBook(project.id, {
      title: suggestedTitle,
      synopsis: premise.trim(),
      status: "borrador",
    });

    createChapter(book.id, project.id, {
      title: "Capítulo 1",
      status: "borrador",
      content: "",
      wordCount: 0,
    });

    setCurrentProject(project.id);

    const searchParams = new URLSearchParams();
    if (premise.trim()) {
      searchParams.set(
        "starter",
        `Esta es la premisa inicial del proyecto: "${premise.trim()}". Ayúdame a empezar a escribir el primer capítulo con un enfoque de copiloto.`
      );
    }

    const query = searchParams.toString();
    router.push(`${makeBookPath(project, book)}${query ? `?${query}` : ""}`);
  };

  const isDark = resolvedTheme === "dark";

  return (
    <div
      className={cn(
        "min-h-screen transition-colors",
        isDark
          ? "bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.18),_transparent_38%),linear-gradient(180deg,_rgba(15,23,42,0.96),_rgba(15,23,42,1))] text-white"
          : "bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_36%),linear-gradient(180deg,_rgba(248,250,252,1),_rgba(241,245,249,1))] text-slate-950"
      )}
    >
      <header
        className={cn(
          "sticky top-0 z-40 border-b backdrop-blur-xl",
          isDark
            ? "border-white/10 bg-slate-950/60"
            : "border-slate-200/80 bg-white/75"
        )}
      >
        <div className="flex h-14 items-center gap-4 px-6">
          <SidebarTrigger />
          <div className="flex-1">
            <h1
              className={cn(
                "text-sm font-semibold tracking-[0.18em] uppercase",
                isDark ? "text-white/80" : "text-slate-700"
              )}
            >
              Nuevo Proyecto
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="flex flex-col justify-center">
            <div
              className={cn(
                "mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl border shadow-[0_20px_80px_rgba(124,58,237,0.18)]",
                isDark
                  ? "border-white/10 bg-white/5"
                  : "border-slate-200 bg-white/70"
              )}
            >
              <Feather className={cn("h-7 w-7", isDark ? "text-violet-300" : "text-violet-600")} />
            </div>
            <p
              className={cn(
                "mb-4 text-xs font-semibold uppercase tracking-[0.28em]",
                isDark ? "text-violet-200/80" : "text-violet-700/80"
              )}
            >
              Escritura con apoyo inteligente
            </p>
            <h2
              className={cn(
                "max-w-xl text-4xl font-semibold tracking-tight md:text-5xl",
                isDark ? "text-white" : "text-slate-950"
              )}
            >
              Empieza con una idea breve y entra directo al capítulo.
            </h2>
            <p
              className={cn(
                "mt-5 max-w-xl text-base leading-7",
                isDark ? "text-slate-300" : "text-slate-600"
              )}
            >
              Péndola crea el proyecto, abre el editor y deja a la IA lista en el
              sidebar para ayudarte a destrabar escenas, revisar tono o proponer
              texto sin quitarte el control.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div
                className={cn(
                  "rounded-2xl border p-4",
                  isDark
                    ? "border-white/10 bg-white/5"
                    : "border-slate-200 bg-white/65"
                )}
              >
                <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-950")}>
                  1. Premisa opcional
                </p>
                <p className={cn("mt-2 text-sm", isDark ? "text-slate-300" : "text-slate-600")}>
                  Puedes escribir una idea mínima o empezar totalmente en blanco.
                </p>
              </div>
              <div
                className={cn(
                  "rounded-2xl border p-4",
                  isDark
                    ? "border-white/10 bg-white/5"
                    : "border-slate-200 bg-white/65"
                )}
              >
                <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-950")}>
                  2. Capítulo primero
                </p>
                <p className={cn("mt-2 text-sm", isDark ? "text-slate-300" : "text-slate-600")}>
                  La unidad principal es el capítulo, no una suite de pantallas.
                </p>
              </div>
              <div
                className={cn(
                  "rounded-2xl border p-4",
                  isDark
                    ? "border-white/10 bg-white/5"
                    : "border-slate-200 bg-white/65"
                )}
              >
                <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-950")}>
                  3. IA copiloto
                </p>
                <p className={cn("mt-2 text-sm", isDark ? "text-slate-300" : "text-slate-600")}>
                  La IA acompaña desde el costado y puede insertar texto directo.
                </p>
              </div>
            </div>
          </section>

          <section
            className={cn(
              "rounded-[2rem] border p-6 shadow-[0_30px_120px_rgba(15,23,42,0.20)] backdrop-blur-2xl",
              isDark
                ? "border-white/10 bg-white/8"
                : "border-slate-200/80 bg-white/72"
            )}
          >
            <div
              className={cn(
                "rounded-[1.5rem] border p-6",
                isDark
                  ? "border-white/10 bg-slate-950/60"
                  : "border-slate-200 bg-white/88"
              )}
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/20">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-950")}>
                    Crea tu espacio de escritura
                  </p>
                  <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
                    La IA aparecerá en el sidebar derecho del editor.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="project-title"
                    className={cn(
                      "text-xs font-medium uppercase tracking-[0.22em]",
                      isDark ? "text-slate-400" : "text-slate-500"
                    )}
                  >
                    Título opcional
                  </label>
                  <Input
                    id="project-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ej. La ciudad sumergida"
                    className={cn(
                      "h-12",
                      isDark
                        ? "border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                        : "border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="project-premise"
                    className={cn(
                      "text-xs font-medium uppercase tracking-[0.22em]",
                      isDark ? "text-slate-400" : "text-slate-500"
                    )}
                  >
                    Idea, premisa o petición inicial
                  </label>
                  <Textarea
                    id="project-premise"
                    value={premise}
                    onChange={(event) => setPremise(event.target.value)}
                    placeholder="Quiero escribir una novela sobre una restauradora de archivos que descubre mensajes ocultos en libros intervenidos."
                    rows={8}
                    className={cn(
                      "resize-none",
                      isDark
                        ? "border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                        : "border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                    )}
                  />
                  <p className={cn("text-sm leading-6", isDark ? "text-slate-400" : "text-slate-500")}>
                    Puedes dejarlo vacío. Si escribes algo, la IA lo tomará como
                    contexto inicial en el sidebar cuando se abra el editor.
                  </p>
                </div>

                <div
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm",
                    isDark
                      ? "border-violet-400/20 bg-violet-500/10 text-violet-100"
                      : "border-violet-200 bg-violet-50 text-violet-900"
                  )}
                >
                  Se creará un proyecto, un libro inicial y un capítulo vacío para
                  empezar a escribir de inmediato.
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
                  Título sugerido:{" "}
                  <span className={cn("font-medium", isDark ? "text-slate-200" : "text-slate-800")}>
                    {suggestedTitle}
                  </span>
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    className={cn(
                      "border",
                      isDark
                        ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                        : "border-slate-200 bg-white text-slate-900 hover:bg-slate-100"
                    )}
                    onClick={() => router.push("/")}
                  >
                    Volver
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="h-11 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 px-5 text-white shadow-lg shadow-violet-500/25 hover:opacity-95"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Crear y abrir editor
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
