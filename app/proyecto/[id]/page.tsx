"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/lib/store";
import { makeBookPath, resolveEntityId } from "@/lib/routing";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectPage({ params }: PageProps) {
  const { id: projectSegment } = use(params);
  const router = useRouter();
  const { projects, getBooksByProject, createBook, createChapter, setCurrentProject } =
    useProjectStore();
  const id = resolveEntityId(
    projectSegment,
    projects.map((item) => item.id)
  );

  const project = projects.find((item) => item.id === id);
  const books = getBooksByProject(id);
  const firstBook = books[0];

  useEffect(() => {
    if (!project) return;
    setCurrentProject(id);

    if (firstBook) {
      router.replace(makeBookPath(project, firstBook));
    }
  }, [firstBook, id, project, router, setCurrentProject]);

  const handleCreateBook = () => {
    if (!project) return;
    const book = createBook(project.id, {
      title: `${project.title} - Libro 1`,
      synopsis: project.premise,
    });
    createChapter(book.id, project.id, {
      title: "Capítulo 1",
      content: "",
      wordCount: 0,
    });
    router.replace(makeBookPath(project, book));
  };

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <h2 className="text-xl font-semibold">Proyecto no encontrado</h2>
          <Button onClick={() => router.push("/")}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  if (!firstBook) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 p-6">
        <div className="max-w-md rounded-3xl border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
            <BookOpen className="h-7 w-7 text-violet-500" />
          </div>
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Este proyecto todavía no tiene un libro inicial. Crea uno y te llevo
            directo al editor del primer capítulo.
          </p>
          <Button className="mt-6" onClick={handleCreateBook}>
            <Plus className="mr-2 h-4 w-4" />
            Crear libro inicial
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
