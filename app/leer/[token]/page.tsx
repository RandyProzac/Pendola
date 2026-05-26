import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Clock3 } from "lucide-react";
import { NarrativeRenderer } from "@/components/editor/narrative-renderer";
import { PublicReadActions } from "@/components/public/public-read-actions";
import { Badge } from "@/components/ui/badge";
import { fetchPublicProjectReadModel } from "@/lib/supabase/public-reader";
import { getPublicMediaUrl } from "@/lib/supabase/storage";

export const metadata: Metadata = {
  title: "Lectura compartida — Péndola",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

function toAnchorId(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function formatReadingDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default async function PublicReadProjectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = await fetchPublicProjectReadModel(token);

  if (!payload) {
    return (
      <div className="min-h-screen bg-background px-6 py-16 text-foreground">
        <div className="mx-auto flex max-w-3xl flex-col items-center rounded-[2rem] border bg-card px-8 py-14 text-center shadow-sm">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10 text-violet-500">
            <BookOpen className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Lectura no disponible</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            Este enlace ya no está activo o no corresponde a un proyecto compartido.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex rounded-full border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            Ir a Péndola
          </Link>
        </div>
      </div>
    );
  }

  const { project, books, chapters } = payload;
  const coverUrl = getPublicMediaUrl(project.coverImagePath);
  const chaptersByBook = new Map(
    books.map((book) => [
      book.id,
      chapters
        .filter((chapter) => chapter.bookId === book.id)
        .sort((left, right) => left.order - right.order),
    ])
  );
  const authorLine = project.penName || project.authorName;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.14),transparent_28%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] text-foreground">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-8 px-4 py-6 sm:gap-10 sm:px-6 sm:py-8 lg:px-10 xl:px-12 2xl:px-16">
        <section className="overflow-hidden rounded-[2rem] border bg-card shadow-sm">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div className="flex flex-col justify-between px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
              <div>
                <Badge variant="outline" className="mb-4 border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-200">
                  Lectura compartida
                </Badge>
                <h1 className="max-w-5xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl xl:text-6xl">
                  {project.title}
                </h1>
                {authorLine ? (
                  <p className="mt-3 text-sm uppercase tracking-[0.18em] text-muted-foreground">
                    {authorLine}
                  </p>
                ) : null}
                {project.premise ? (
                  <p className="mt-6 max-w-4xl text-base leading-8 text-muted-foreground sm:text-lg xl:text-[1.15rem]">
                    {project.premise}
                  </p>
                ) : null}
              </div>

              <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {project.genre ? <Badge variant="secondary">{project.genre}</Badge> : null}
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4" />
                  Actualizado el {formatReadingDate(project.updatedAt)}
                </span>
                </div>
                <PublicReadActions />
              </div>
            </div>

            <div
              className="relative min-h-[240px] border-t xl:min-h-full xl:border-l xl:border-t-0"
              style={{ backgroundColor: project.coverColor }}
            >
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt={`Portada de ${project.title}`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.42))]" />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[1.75rem] border bg-card p-4 shadow-sm sm:p-5 xl:sticky xl:top-6">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Índice
            </p>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
              {books.map((book) => {
                const scopedChapters = chaptersByBook.get(book.id) ?? [];
                return (
                  <div key={book.id} className="space-y-2">
                    <a
                      href={`#libro-${book.id}`}
                      className="block text-sm font-medium text-foreground transition-colors hover:text-violet-500"
                    >
                      {book.title}
                    </a>
                    <div className="space-y-1 pl-3">
                      {scopedChapters.map((chapter) => (
                        <a
                          key={chapter.id}
                          href={`#capitulo-${chapter.id}-${toAnchorId(chapter.title)}`}
                          className="block text-sm leading-6 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {chapter.title}
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="space-y-8">
            {books.map((book) => {
              const scopedChapters = chaptersByBook.get(book.id) ?? [];

              return (
                <article
                  key={book.id}
                  id={`libro-${book.id}`}
                  className="rounded-[1.75rem] border bg-card px-4 py-5 shadow-sm sm:px-7 sm:py-7 lg:px-10 lg:py-9"
                >
                  <header className="border-b pb-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      Libro
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                      {book.title}
                    </h2>
                  </header>

                  <div className="mt-8 space-y-10">
                    {scopedChapters.map((chapter) => {
                      const chapterAnchor = `capitulo-${chapter.id}-${toAnchorId(chapter.title)}`;
                      const hasReadableContent = chapter.content.trim().length > 0;

                      return (
                        <section key={chapter.id} id={chapterAnchor} className="scroll-mt-8">
                          <div className="mb-5 flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-semibold sm:text-2xl">{chapter.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {chapter.wordCount.toLocaleString("es-ES")} palabras
                            </Badge>
                          </div>
                          {hasReadableContent ? (
                            <NarrativeRenderer content={chapter.content} plainMentions maxWidth="88ch" />
                          ) : (
                            <p className="text-sm italic text-muted-foreground">
                              Este capítulo todavía no tiene contenido para lectura.
                            </p>
                          )}
                        </section>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </section>
        </section>
      </div>
    </div>
  );
}
