"use client";

import { type KeyboardEvent, use, useState } from "react";
import {
  Plus,
  MapPin,
  Search,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { resolveEntityId } from "@/lib/routing";
import { useProjectStore } from "@/lib/store";
import { SCENARIO_TYPES } from "@/lib/constants";
import type { ScenarioType } from "@/lib/types";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string }>;
}

function FieldWithAI({
  label,
  description,
  placeholder,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  description: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <Tooltip>
          <TooltipTrigger className="inline-flex items-center justify-center h-6 px-2 text-[10px] text-muted-foreground hover:text-violet-500 rounded-md hover:bg-accent cursor-pointer">
            <Sparkles className="h-3 w-3 mr-1" />
            IA
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              Dejar que la IA sugiera este campo
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      {multiline ? (
        <Textarea
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="resize-none text-sm"
        />
      ) : (
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm"
        />
      )}
      <p className="text-[11px] text-muted-foreground">{description}</p>
    </div>
  );
}

export default function ScenariosPage({ params }: PageProps) {
  const { id: projectSegment } = use(params);
  const {
    projects,
    getScenariosByProject,
    createScenario,
    updateScenario,
    deleteScenario,
  } = useProjectStore();
  const projectId = resolveEntityId(
    projectSegment,
    projects.map((item) => item.id)
  );

  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const project = projects.find((p) => p.id === projectId);
  const scenarios = getScenariosByProject(projectId);
  const editingScenario = scenarios.find((s) => s.id === editId);

  const filteredScenarios = scenarios.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.type.toLowerCase().includes(search.toLowerCase())
  );

  const handleNewScenario = () => {
    const scenario = createScenario(projectId, { name: "Nuevo Escenario" });
    setEditId(scenario.id);
    toast.success("Escenario creado", {
      description: "Completa los detalles de tu nuevo escenario.",
    });
  };

  const handleDeleteScenario = (id: string) => {
    deleteScenario(id);
    setDeleteId(null);
    if (editId === id) setEditId(null);
    toast.success("Escenario eliminado");
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>, callback: () => void) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    callback();
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
          <MapPin className="h-5 w-5 text-emerald-500" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Escenarios</h1>
          </div>
          <Button size="sm" onClick={handleNewScenario}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Escenario
          </Button>
        </div>
      </header>

      <div className="p-6 space-y-5">
        <section className="max-w-3xl rounded-2xl border bg-muted/20 p-5">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <MapPin className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">Mapa sensible de lugares</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Reúne aquí interiores, exteriores y espacios clave con una descripción clara,
                atmósfera reconocible e importancia narrativa. La meta es que cada lugar se pueda
                identificar rápido y luego abrir para desarrollarlo con más detalle.
              </p>
            </div>
          </div>
        </section>

        {/* Search */}
        {scenarios.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar escenario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-xl border-border/70 bg-background pl-9"
            />
          </div>
        )}

        {/* Empty State */}
        {scenarios.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10">
              <MapPin className="h-10 w-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Sin escenarios aún</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Los escenarios dan vida al mundo de tu historia. Define lugares con
              atmósfera, tipo y personajes asociados.
            </p>
            <Button
              onClick={handleNewScenario}
              className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear primer escenario
            </Button>
          </div>
        )}

        {/* Scenarios Grid */}
        {filteredScenarios.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredScenarios.map((scenario) => {
              const sType = SCENARIO_TYPES.find(
                (t) => t.value === scenario.type
              );
              return (
                <Card
                  key={scenario.id}
                  role="button"
                  tabIndex={0}
                  className="group relative overflow-hidden border transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-black/10 focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2"
                  onClick={() => setEditId(scenario.id)}
                  onKeyDown={(event) => handleCardKeyDown(event, () => setEditId(scenario.id))}
                >
                  <div className="absolute right-3 top-3 z-20">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-full bg-background/90 text-muted-foreground opacity-100 shadow-sm ring-1 ring-black/5 hover:bg-destructive/10 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(scenario.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="line-clamp-2 text-lg font-semibold">
                          {scenario.name}
                        </CardTitle>
                        <CardDescription className="mt-1 text-sm">
                          {sType?.label || "Sin tipo"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {scenario.description && (
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {scenario.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {scenario.atmosphere && (
                        <Badge variant="outline" className="text-xs">
                          Atmósfera: {scenario.atmosphere}
                        </Badge>
                      )}
                      {scenario.narrativeImportance && (
                        <Badge variant="outline" className="text-xs">
                          Rol narrativo
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Card
              role="button"
              tabIndex={0}
              className="flex min-h-[220px] items-center justify-center border-dashed transition-colors duration-300 hover:border-emerald-500/50 hover:bg-emerald-500/[0.03] focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2"
              onClick={handleNewScenario}
              onKeyDown={(event) => handleCardKeyDown(event, handleNewScenario)}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-muted-foreground/35 bg-background">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Nuevo escenario</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Añade otro lugar importante al mundo de la historia.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Escenario</DialogTitle>
            <DialogDescription>
              Define los detalles de este lugar. Cada campo es opcional, completa
              lo que necesites.
            </DialogDescription>
          </DialogHeader>

          {editingScenario && (
            <div className="space-y-5 py-2">
              <FieldWithAI
                label="Nombre"
                description="El nombre con el que se identifica este lugar en la historia"
                placeholder="Ej: La Torre de los Alquimistas"
                value={editingScenario.name}
                onChange={(v) => updateScenario(editingScenario.id, { name: v })}
              />

              <div className="space-y-1.5">
                <Label>Tipo de escenario</Label>
                <Select
                  value={editingScenario.type}
                  onValueChange={(v) =>
                    updateScenario(editingScenario.id, {
                      type: (v ?? "otro") as ScenarioType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCENARIO_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label} — {type.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  La categoría general del espacio. Ayuda a ambientar escenas.
                </p>
              </div>

              <FieldWithAI
                label="Descripción"
                description="Cómo es este lugar visualmente: colores, texturas, tamaño, estado"
                placeholder="Ej: Una torre imponente de piedra negra, rodeada de niebla constante..."
                value={editingScenario.description}
                onChange={(v) =>
                  updateScenario(editingScenario.id, { description: v })
                }
                multiline
              />

              <FieldWithAI
                label="Atmósfera"
                description="La sensación emocional que transmite este lugar. Misterio, calidez, peligro..."
                placeholder="Ej: Inquietante y solemne, con ecos que resuenan"
                value={editingScenario.atmosphere}
                onChange={(v) =>
                  updateScenario(editingScenario.id, { atmosphere: v })
                }
              />

              <FieldWithAI
                label="Importancia narrativa"
                description="¿Qué papel juega este lugar en la historia? ¿Qué eventos ocurren aquí?"
                placeholder="Ej: Aquí ocurre la confrontación final del Acto II"
                value={editingScenario.narrativeImportance}
                onChange={(v) =>
                  updateScenario(editingScenario.id, {
                    narrativeImportance: v,
                  })
                }
                multiline
              />

              <FieldWithAI
                label="Notas"
                description="Cualquier información adicional sobre este escenario"
                placeholder="Notas libres..."
                value={editingScenario.notes}
                onChange={(v) =>
                  updateScenario(editingScenario.id, { notes: v })
                }
                multiline
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar escenario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el escenario y
              todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDeleteScenario(deleteId)}
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
