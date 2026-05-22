"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
import { makeCharacterPath, resolveEntityId } from "@/lib/routing";
import { useProjectStore } from "@/lib/store";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CharactersPage({ params }: PageProps) {
  const { id: projectSegment } = use(params);
  const router = useRouter();
  const {
    projects,
    getCharactersByProject,
    createCharacter,
    deleteCharacter,
  } = useProjectStore();

  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const projectId = resolveEntityId(
    projectSegment,
    projects.map((item) => item.id)
  );
  const project = projects.find((p) => p.id === projectId);
  const characters = getCharactersByProject(projectId);

  const filteredCharacters = characters.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleNewCharacter = () => {
    const character = createCharacter(projectId, { name: "Nuevo Personaje" });
    router.push(makeCharacterPath(project!, character));
    toast.success("Personaje creado", { description: "Completa la ficha de tu nuevo personaje." });
  };

  const handleDeleteCharacter = (charId: string) => {
    deleteCharacter(charId);
    setDeleteId(null);
    toast.success("Personaje eliminado");
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Proyecto no encontrado</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-6">
          <SidebarTrigger />
          <Users className="h-5 w-5 text-violet-500" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Personajes</h1>
          </div>
          <Button size="sm" onClick={handleNewCharacter}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Personaje
          </Button>
        </div>
      </header>

      <div className="p-6 space-y-5">
        <section className="max-w-3xl rounded-2xl border bg-muted/20 p-5">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
              <Users className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">Archivo vivo de personajes</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Reune aquí protagonistas, antagonistas y secundarios con suficiente densidad narrativa:
                impulso, valores, arquetipos y notas. La idea es que esta pantalla ayude a identificar
                rápido quiénes están sosteniendo tu historia.
              </p>
            </div>
          </div>
        </section>

        {/* Search */}
        {characters.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar personaje..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-xl border-border/70 bg-background pl-9"
            />
          </div>
        )}

        {/* Empty State */}
        {characters.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-500/10">
              <Users className="h-10 w-10 text-violet-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Sin personajes aún</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Los personajes son el corazón de tu historia. Crea fichas detalladas con motivaciones,
              rasgos, atributos y valores para dar vida a tus protagonistas.
            </p>
            <Button onClick={handleNewCharacter} className="bg-gradient-to-r from-violet-600 to-indigo-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Crear primer personaje
            </Button>
          </div>
        )}

        {/* Character Grid */}
        {filteredCharacters.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCharacters.map((character) => {
              const path = makeCharacterPath(project, character);

              return (
                <Card
                  key={character.id}
                  className="group relative overflow-hidden border transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-500/30 hover:shadow-lg hover:shadow-black/10"
                >
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-3 top-3 z-20 rounded-full bg-background/90 text-muted-foreground opacity-100 shadow-sm ring-1 ring-black/5 hover:bg-destructive/10 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                    onClick={() => {
                      setDeleteId(character.id);
                    }}
                    aria-label={`Eliminar personaje ${character.name}`}
                    title="Eliminar personaje"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>

                  <Link
                    href={path}
                    className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-2"
                    onClick={() => {
                      router.prefetch(path);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        {character.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={character.imageUrl}
                            alt={`Avatar de ${character.name}`}
                            className="h-12 w-12 shrink-0 rounded-2xl border object-cover shadow-sm"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-base font-semibold text-white shadow-sm">
                            {character.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <CardTitle className="line-clamp-2 text-lg font-semibold">
                            {character.name}
                          </CardTitle>
                          <CardDescription className="mt-1 text-sm">
                            {character.age ? `${character.age} años` : "Sin edad definida"}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-xs">{character.archetypes.direction}</Badge>
                        <Badge variant="outline" className="text-xs">{character.archetypes.energy}</Badge>
                        <Badge variant="outline" className="text-xs">{character.archetypes.process}</Badge>
                        <Badge variant="outline" className="text-xs">{character.archetypes.boundary}</Badge>
                      </div>

                      {character.drive && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            Impulso
                          </p>
                          <p className="line-clamp-2 text-sm leading-6">{character.drive}</p>
                        </div>
                      )}
                      {character.valueSector && (
                        <div className="border-t pt-2 text-xs text-muted-foreground">
                          Valor dominante:{" "}
                          <span className="text-foreground">{character.valueSector}</span>
                          {character.dominantValue && (
                            <span className="text-foreground"> → {character.dominantValue}</span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Link>
                </Card>
              );
            })}

            <Link
              href="#"
              onClick={(event) => {
                event.preventDefault();
                handleNewCharacter();
              }}
              className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-2"
            >
              <Card className="flex min-h-[220px] items-center justify-center border-dashed transition-colors duration-300 hover:border-violet-500/50 hover:bg-violet-500/[0.03]">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-muted-foreground/35 bg-background">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Nuevo personaje</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Añade otra voz importante al elenco.
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar personaje?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el personaje y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDeleteCharacter(deleteId)}
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
