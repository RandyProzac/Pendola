"use client";

import { use, useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Image as ImageIcon, MessageSquare, Sparkles, Upload, UserCircle2 } from "lucide-react";
import { AIPanel } from "@/components/editor/ai-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import dynamic from "next/dynamic";
const Slider = dynamic(() => import("@/components/ui/slider").then(mod => mod.Slider), { ssr: false });
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { resolveEntityId } from "@/lib/routing";
import { useProjectStore } from "@/lib/store";
import { getPublicMediaUrl, uploadResourceImage } from "@/lib/supabase/storage";
import {
  ATTRIBUTE_LABELS,
  MOTIVATION_FIELDS,
  VALUE_SECTORS,
} from "@/lib/constants";
import {
  buildAxisNarrativeSummary,
  buildCharacterTraitSummary,
  CHARACTER_TRAIT_AXES,
  deriveCharacterArchetypes,
  getAxisAverage,
  TRAIT_AXIS_META,
  type ArchetypeMeta,
  type TraitPoleMeta,
} from "@/lib/characters/archetypes";
import { buildAIRequestConfig } from "@/lib/ai/provider";
import type { Character, CharacterTraits, CharacterAttributes } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string; pid: string }>;
}

function buildCharacterImagePrompt(character: Character) {
  const details = [
    character.age ? `${character.age} años` : null,
    character.physicalDescription?.trim() || null,
    character.drive ? `Impulso central: ${character.drive}.` : null,
    character.wish ? `Deseo visible: ${character.wish}.` : null,
    character.vice ? `Falla o sombra: ${character.vice}.` : null,
    character.origin ? `Origen o pasado: ${character.origin}.` : null,
    character.persona ? `Máscara social: ${character.persona}.` : null,
    character.dominantValue
      ? `Valor dominante: ${character.dominantValue}${character.valueSector ? ` dentro de ${character.valueSector}` : ""}.`
      : null,
    character.notes ? `Notas útiles: ${character.notes}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    `Retrato cinematográfico de personaje para novela.`,
    `Personaje: ${character.name}.`,
    details,
    `Plano medio o retrato editorial, luz natural dramática, textura realista, vestuario coherente con su oficio y contexto, expresión contenida pero intensa, fondo sugerente y atmosférico, alta fidelidad facial, estilo fotográfico realista.`,
    `Evitar texto, marcas de agua, manos deformes, ojos extraños, anatomía inconsistente, duplicaciones.`,
  ]
    .filter(Boolean)
    .join(" ");
}

// Dot rating component (1-5)
function DotRating({
  value,
  onChange,
  max = 5,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className={`h-4 w-4 rounded-full border-2 transition-all cursor-pointer ${
            i < value
              ? "bg-violet-500 border-violet-500"
              : "border-muted-foreground/30 hover:border-violet-500/50"
          }`}
          aria-label={`${i + 1} de ${max}`}
        />
      ))}
    </div>
  );
}

function ArchetypeTooltipBadge({
  archetype,
  active,
}: {
  archetype: ArchetypeMeta;
  active: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
          active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground hover:text-foreground"
        )}
      >
        {archetype.name}
      </TooltipTrigger>
      <TooltipContent className="block max-w-sm space-y-2 p-3">
        <p className="text-sm font-semibold">{archetype.name}</p>
        <p className="text-xs leading-5 opacity-90">{archetype.tagline}</p>
        <p className="text-xs leading-5 opacity-90">{archetype.description}</p>
        <p className="text-[11px] leading-5 opacity-80">
          Ejemplos: {archetype.examples.join(", ")}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function TraitPoleTooltip({
  pole,
}: {
  pole: TraitPoleMeta;
}) {
  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex items-center rounded-full border border-dashed border-border/80 px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground">
        {pole.label}
      </TooltipTrigger>
      <TooltipContent className="block max-w-xs p-3">
        <p className="text-xs font-semibold">{pole.label}</p>
        <p className="mt-1 text-xs leading-5 opacity-90">{pole.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Field with AI suggestion button
function FieldWithAI({
  label,
  description,
  placeholder,
  value,
  onChange,
  multiline = false,
  contextQuery = "",
}: {
  label: string;
  description: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  contextQuery?: string;
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    let generatedContent = "";
    let systemPrompt = `Eres un experto escritor de novelas. Tu trabajo es redactar o mejorar el campo "${label}" del desarrollo de un personaje.\n`;
    if (contextQuery) systemPrompt += `\nESTE ES EL CONTEXTO DEL PERSONAJE:\n${contextQuery}\n`;
    
    if (value && value.trim().length > 0) {
       systemPrompt += `\nIDEA ACTUAL DEL AUTOR:\n"${value}"\n\nTAREA: Expande, mejora y dale un tono mucho más literario y descriptivo a esa idea.`;
    } else {
       systemPrompt += `\nTAREA: Inventa una propuesta creativa y detallada para este campo desde cero.`;
    }

    systemPrompt += `\n\nREGLA ESTRICTA: Tu respuesta debe contener ÚNICAMENTE el texto redactado para el campo. NO saludes, no digas "Aquí tienes", NO uses comillas para envolver todo, simplemente devuelve el texto puro.`;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "ideas",
          projectTitle: "Desarrollo de Personaje",
          messages: [{ role: "user", content: systemPrompt }]
        })
      });

      if (!response.ok) throw new Error("Error fetching AI");
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        onChange(""); // Se limpia para empezar a escribir el nuevo
        while (true) {
          const { done, value: chunkValue } = await reader.read();
          if (done) break;
          
          generatedContent += decoder.decode(chunkValue, { stream: true });
          onChange(generatedContent);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-1.5 relative">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <Tooltip>
          <TooltipTrigger
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`inline-flex items-center justify-center h-6 px-2 text-[10px] rounded-md transition-all cursor-pointer ${
              isGenerating 
                ? "bg-violet-500/20 text-violet-500 cursor-not-allowed"
                : "text-muted-foreground hover:text-violet-500 hover:bg-accent"
            }`}
          >
            <Sparkles className={`h-3 w-3 mr-1 ${isGenerating ? "animate-spin" : ""}`} />
            {isGenerating ? "Generando..." : "Mejorar con IA"}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {value ? "Mejorar lo que has escrito usando la IA" : "Generar ideas automáticamente"}
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
          disabled={isGenerating}
          className={`resize-none text-sm transition-all ${isGenerating ? "opacity-70 ring-1 ring-violet-500/50" : ""}`}
        />
      ) : (
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isGenerating}
          className={`text-sm transition-all ${isGenerating ? "opacity-70 ring-1 ring-violet-500/50" : ""}`}
        />
      )}
      <p className="text-[11px] text-muted-foreground">{description}</p>
    </div>
  );
}

export default function CharacterPage({ params }: PageProps) {
  const { id: projectSegment, pid: characterSegment } = use(params);
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const {
    characters,
    updateCharacter,
    aiSettings,
    addResource,
    getResourcesByProject,
  } = useProjectStore();
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingLibraryImage, setIsUploadingLibraryImage] = useState(false);
  const characterId = resolveEntityId(
    characterSegment,
    characters.map((item) => item.id)
  );

  const character = characters.find((c) => c.id === characterId);
  const projectId = character?.projectId || "";
  const imageResources = useMemo(
    () =>
      getResourcesByProject(projectId).filter(
        (resource) => resource.fileType === "image" && !!resource.mediaPath
      ),
    [getResourcesByProject, projectId]
  );
  const characterImagePrompt = useMemo(
    () => (character ? buildCharacterImagePrompt(character) : ""),
    [character]
  );
  const characterTraitSummary = useMemo(
    () => (character ? buildCharacterTraitSummary(character) : ""),
    [character]
  );

  const characterContext = character
    ? [
        `Nombre: ${character.name}`,
        `Edad: ${character.age || "desconocida"}`,
        characterTraitSummary ? `Perfil de rasgos: ${characterTraitSummary}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "";
  const update = useCallback(
    (data: Partial<Character>) => {
      updateCharacter(characterId, data);
    },
    [characterId, updateCharacter]
  );

  const updateTrait = useCallback(
    (axis: keyof CharacterTraits, key: string, value: number) => {
      if (!character) return;
      const newTraits = {
        ...character.traits,
        [axis]: { ...character.traits[axis], [key]: value },
      };

      updateCharacter(characterId, {
        traits: newTraits,
        archetypes: deriveCharacterArchetypes(newTraits),
      });
    },
    [character, characterId, updateCharacter]
  );

  const updateAttribute = useCallback(
    (category: keyof CharacterAttributes, key: string, value: number) => {
      if (!character) return;
      updateCharacter(characterId, {
        attributes: {
          ...character.attributes,
          [category]: { ...character.attributes[category], [key]: value },
        },
      });
    },
    [character, characterId, updateCharacter]
  );

  const copyCharacterImagePrompt = useCallback(async () => {
    if (!characterImagePrompt.trim()) return;

    try {
      await navigator.clipboard.writeText(characterImagePrompt);
      toast.success("Prompt copiado", {
        description: "Ya puedes pegarlo en tu generador de imágenes.",
      });
    } catch {
      toast.error("No se pudo copiar el prompt");
    }
  }, [characterImagePrompt]);

  const handleAvatarUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !character) return;

      setIsUploadingAvatar(true);

      try {
        const uploaded = await uploadResourceImage(file, character.projectId);

        addResource(character.projectId, {
          name: file.name,
          fileType: "image",
          mediaPath: uploaded.path,
          description: `Referencia visual subida desde la ficha de ${character.name}.`,
        });

        update({ imageUrl: uploaded.publicUrl || undefined });
        toast.success("Avatar actualizado");
      } catch (error) {
        toast.error("No se pudo subir el avatar", {
          description:
            error instanceof Error ? error.message : "No se pudo subir la imagen.",
        });
      } finally {
        setIsUploadingAvatar(false);
        event.target.value = "";
      }
    },
    [addResource, character, update]
  );

  const handleLibraryUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || !character) return;

      setIsUploadingLibraryImage(true);

      try {
        for (const file of Array.from(files)) {
          const uploaded = await uploadResourceImage(file, character.projectId);
          addResource(character.projectId, {
            name: file.name,
            fileType: "image",
            mediaPath: uploaded.path,
            description: `Referencia visual asociada a ${character.name}.`,
          });
        }

        toast.success("Biblioteca actualizada", {
          description: "Las imágenes ya están disponibles en esta ficha y en Recursos.",
        });
      } catch (error) {
        toast.error("No se pudieron subir las imágenes", {
          description:
            error instanceof Error ? error.message : "Error al subir imágenes.",
        });
      } finally {
        setIsUploadingLibraryImage(false);
        event.target.value = "";
      }
    },
    [addResource, character]
  );

  const handleUseLibraryImageAsAvatar = useCallback(
    (mediaPath?: string) => {
      if (!mediaPath) return;
      const publicUrl = getPublicMediaUrl(mediaPath);
      if (!publicUrl) {
        toast.error("No se pudo usar esa imagen como avatar");
        return;
      }

      update({ imageUrl: publicUrl });
      toast.success("Avatar actualizado desde la biblioteca");
    },
    [update]
  );

  if (!character) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Personaje no encontrado</p>
      </div>
    );
  }

  const selectedSector = VALUE_SECTORS.find((s) => s.name === character.valueSector);
  const interviewContext = [
    `Nombre: ${character.name}`,
    character.age ? `Edad: ${character.age}` : null,
    character.physicalDescription ? `Descripción física: ${character.physicalDescription}` : null,
    character.drive ? `Impulso: ${character.drive}` : null,
    character.wish ? `Deseo: ${character.wish}` : null,
    character.void ? `Vacío: ${character.void}` : null,
    character.vice ? `Falla: ${character.vice}` : null,
    character.origin ? `Origen: ${character.origin}` : null,
    character.persona ? `Máscara: ${character.persona}` : null,
    character.expedition ? `Transformación: ${character.expedition}` : null,
    characterTraitSummary ? `Rasgos: ${characterTraitSummary}` : null,
    character.notes ? `Notas: ${character.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const interviewSystemPrompt = `Eres ${character.name}. Responde en primera persona, como si fueras este personaje dentro del universo de la historia. Usa únicamente lo que se sabe de su ficha y, cuando falte algo, improvisa de forma coherente con su voz, motivaciones y contradicciones. No hables como asistente, no expliques tu proceso, no rompas personaje salvo que el usuario pida explícitamente un análisis fuera del rol. Mantén respuestas útiles para que el autor entienda mejor al personaje.`;
  const aiConfig = buildAIRequestConfig(aiSettings);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-6">
          <SidebarTrigger />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/proyecto/${projectSegment}/personajes`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {character.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.imageUrl}
              alt={`Avatar de ${character.name}`}
              className="h-10 w-10 rounded-full border object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              {character.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <Input
              value={character.name}
              onChange={(e) => update({ name: e.target.value })}
              className="border-none bg-transparent text-lg font-semibold p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Nombre del personaje"
            />
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[10px]">{character.archetypes.direction}</Badge>
            <Badge variant="outline" className="text-[10px]">{character.archetypes.energy}</Badge>
            <Badge variant="outline" className="text-[10px]">{character.archetypes.process}</Badge>
            <Badge variant="outline" className="text-[10px]">{character.archetypes.boundary}</Badge>
          </div>
          <Button className="rounded-xl" onClick={() => setInterviewOpen(true)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Entrevistar
          </Button>
        </div>
      </header>

      <div className="flex-1 p-6">
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(event) => {
            void handleAvatarUpload(event);
          }}
        />
        <input
          ref={libraryInputRef}
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          multiple
          className="hidden"
          onChange={(event) => {
            void handleLibraryUpload(event);
          }}
        />
        <Tabs defaultValue="general" className="max-w-5xl">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="motivaciones">Motivaciones</TabsTrigger>
            <TabsTrigger value="atributos">Atributos</TabsTrigger>
            <TabsTrigger value="rasgos">Rasgos</TabsTrigger>
            <TabsTrigger value="valores">Valores</TabsTrigger>
            <TabsTrigger value="imagenes">Imágenes</TabsTrigger>
          </TabsList>

          {/* TAB: General */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Información General</CardTitle>
                <CardDescription>Datos básicos de tu personaje</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Nombre</Label>
                    <Input
                      value={character.name}
                      onChange={(e) => update({ name: e.target.value })}
                      placeholder="Nombre completo del personaje"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      El nombre con el que aparecerá en la historia
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Edad</Label>
                    <Input
                      type="number"
                      value={character.age || ""}
                      onChange={(e) => update({ age: parseInt(e.target.value) || undefined })}
                      placeholder="Ej: 32"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      La edad del personaje al inicio de la historia
                    </p>
                  </div>
                </div>
                <FieldWithAI
                  label="Descripción física"
                  description="Aspecto físico: altura, complexión, rasgos faciales, vestimenta habitual"
                  placeholder="Ej: Alto y delgado, cabello oscuro hasta los hombros, cicatriz en la mejilla izquierda..."
                  value={character.physicalDescription || ""}
                  onChange={(v) => update({ physicalDescription: v })}
                  multiline
                  contextQuery={characterContext}
                />
                <FieldWithAI
                  label="Notas adicionales"
                  description="Cualquier información extra que quieras recordar sobre este personaje"
                  placeholder="Notas libres..."
                  value={character.notes}
                  onChange={(v) => update({ notes: v })}
                  multiline
                  contextQuery={characterContext}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Motivaciones */}
          <TabsContent value="motivaciones" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Motivaciones del Personaje</CardTitle>
                <CardDescription>
                  Las fuerzas internas que mueven a tu personaje. Cada campo define un aspecto distinto de su psicología.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {MOTIVATION_FIELDS.map((field) => (
                  <FieldWithAI
                    key={field.key}
                    label={field.label}
                    description={field.description}
                    placeholder={field.placeholder}
                    value={(character as unknown as Record<string, string>)[field.key] || ""}
                    onChange={(v) => update({ [field.key]: v })}
                    multiline
                    contextQuery={characterContext}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Atributos */}
          <TabsContent value="atributos" className="space-y-6">
            {(Object.entries(ATTRIBUTE_LABELS) as [keyof CharacterAttributes, typeof ATTRIBUTE_LABELS.physical][]).map(
              ([category, data]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="text-base">Atributos {data.title}</CardTitle>
                    <CardDescription>
                      Puntúa del 1 al 5. 1 = deficiente, 2 = normal, 3 = capaz, 4 = excepcional, 5 = legendario
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.attributes.map((attr) => (
                      <div key={attr.key} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{attr.label}</p>
                          <p className="text-[11px] text-muted-foreground">{attr.description}</p>
                        </div>
                        <DotRating
                          value={(character.attributes[category] as Record<string, number>)[attr.key]}
                          onChange={(v) => updateAttribute(category, attr.key, v)}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            )}
          </TabsContent>

          {/* TAB: Rasgos */}
          <TabsContent value="rasgos" className="space-y-6">
            {CHARACTER_TRAIT_AXES.map((axis) => {
              const data = TRAIT_AXIS_META[axis];
              const values = character.traits[axis];
              const avg = getAxisAverage(character.traits, axis);
              const summary = buildAxisNarrativeSummary(axis, avg, character.name);

              return (
                <Card key={axis}>
                  <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{data.title}</CardTitle>
                        <CardDescription className="max-w-2xl leading-6">
                          {data.description}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 self-start">
                        <ArchetypeTooltipBadge
                          archetype={data.leftArchetype}
                          active={avg <= 50}
                        />
                        <span className="text-xs text-muted-foreground">↔</span>
                        <ArchetypeTooltipBadge
                          archetype={data.rightArchetype}
                          active={avg > 50}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {data.sliders.map((slider) => {
                      const val = (values as Record<string, number>)[slider.key];

                      return (
                        <div key={slider.key} className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <TraitPoleTooltip pole={slider.left} />
                            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                              {val}/100
                            </span>
                            <TraitPoleTooltip pole={slider.right} />
                          </div>
                          <div className="relative py-2">
                            <div className="pointer-events-none absolute left-1/2 top-1/2 h-5 w-px -translate-x-1/2 -translate-y-1/2 bg-border" />
                            <Slider
                              value={[val]}
                              onValueChange={(v) =>
                                updateTrait(
                                  axis,
                                  slider.key,
                                  Array.isArray(v) ? v[0] : v
                                )
                              }
                              min={0}
                              max={100}
                              step={1}
                              className="cursor-pointer"
                            />
                          </div>
                        </div>
                      );
                    })}

                    <div className="space-y-3 border-t pt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={summary.isAmbivalent ? "secondary" : "default"}
                          className="rounded-full"
                        >
                          {summary.headline}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Promedio del eje: {summary.average}/100
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {summary.summary}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* TAB: Valores */}
          <TabsContent value="valores" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rueda de Valores</CardTitle>
                <CardDescription>
                  Selecciona el sector de valores que define a tu personaje, y luego su valor dominante dentro de ese sector.
                  Los valores determinan lo que tu personaje considera importante en la vida.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sector Selection */}
                <div className="space-y-3">
                  <Label>Sector de valores</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {VALUE_SECTORS.map((sector) => (
                      <button
                        key={sector.name}
                        type="button"
                        onClick={() =>
                          update({
                            valueSector: sector.name,
                            dominantValue: "",
                          })
                        }
                        className={`relative p-3 rounded-lg border text-center transition-all cursor-pointer ${
                          character.valueSector === sector.name
                            ? "border-2 shadow-md"
                            : "hover:border-foreground/20"
                        }`}
                        style={{
                          borderColor:
                            character.valueSector === sector.name
                              ? sector.color
                              : undefined,
                          backgroundColor:
                            character.valueSector === sector.name
                              ? `${sector.color}15`
                              : undefined,
                        }}
                      >
                        <div
                          className="h-3 w-3 rounded-full mx-auto mb-1.5"
                          style={{ backgroundColor: sector.color }}
                        />
                        <p className="text-xs font-medium">{sector.name}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Cada sector representa una orientación moral y filosófica del personaje
                  </p>
                </div>

                {/* Value Selection */}
                {selectedSector && (
                  <div className="space-y-3">
                    <Label>
                      Valor dominante en <span className="font-semibold">{selectedSector.name}</span>
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedSector.values.map((val) => (
                        <Badge
                          key={val}
                          variant={character.dominantValue === val ? "default" : "outline"}
                          className="cursor-pointer text-sm py-1.5 px-3 transition-all hover:shadow-sm"
                          style={
                            character.dominantValue === val
                              ? { backgroundColor: selectedSector.color, borderColor: selectedSector.color }
                              : {}
                          }
                          onClick={() => update({ dominantValue: val })}
                        >
                          {val}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      El valor dominante es lo que tu personaje prioriza por encima de todo dentro de su sector
                    </p>
                  </div>
                )}

                {/* Summary */}
                {character.valueSector && character.dominantValue && (
                  <div className="rounded-lg border p-4 bg-card">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Tu personaje valora: </span>
                      <span className="font-semibold">{character.dominantValue}</span>
                      <span className="text-muted-foreground"> dentro del sector </span>
                      <span
                        className="font-semibold"
                        style={{ color: selectedSector?.color }}
                      >
                        {character.valueSector}
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="imagenes" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Avatar del personaje</CardTitle>
                  <CardDescription>
                    Elige la imagen principal con la que quieres identificar a {character.name} en la app.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center rounded-2xl border bg-muted/20 p-6 text-center">
                    {character.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={character.imageUrl}
                        alt={`Avatar actual de ${character.name}`}
                        className="h-40 w-40 rounded-3xl border object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-40 w-40 items-center justify-center rounded-3xl border bg-background text-muted-foreground">
                        <UserCircle2 className="h-16 w-16" />
                      </div>
                    )}
                    <p className="mt-4 text-sm font-medium">
                      {character.imageUrl ? "Avatar actual" : "Aún no hay avatar personalizado"}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">
                      Puedes subir una imagen nueva o reutilizar una de la biblioteca visual del proyecto.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="rounded-xl"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {isUploadingAvatar ? "Subiendo..." : character.imageUrl ? "Reemplazar avatar" : "Subir avatar"}
                    </Button>
                    {character.imageUrl ? (
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => update({ imageUrl: undefined })}
                      >
                        Quitar avatar
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">Prompt visual</CardTitle>
                      <CardDescription>
                        Prompt base construido con la ficha del personaje para copiar y pegar en un generador de imágenes.
                      </CardDescription>
                    </div>
                    <Button variant="outline" className="rounded-xl" onClick={() => void copyCharacterImagePrompt()}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={characterImagePrompt}
                    readOnly
                    rows={10}
                    className="resize-none bg-muted/20 text-sm leading-6"
                  />
                  <p className="text-[11px] leading-5 text-muted-foreground">
                    Este prompt se actualiza según el nombre, edad, descripción física, motivaciones y notas del personaje.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">Biblioteca de imágenes</CardTitle>
                    <CardDescription>
                      Sube referencias visuales del personaje y reutiliza cualquiera como avatar principal.
                    </CardDescription>
                  </div>
                  <Button
                    className="rounded-xl"
                    onClick={() => libraryInputRef.current?.click()}
                    disabled={isUploadingLibraryImage}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploadingLibraryImage ? "Subiendo..." : "Subir imágenes"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {imageResources.length === 0 ? (
                  <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium">Todavía no hay referencias visuales</p>
                    <p className="mt-2 max-w-md text-xs leading-6 text-muted-foreground">
                      Sube imágenes aquí para reunir inspiración del personaje. También quedarán disponibles en Recursos.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {imageResources.map((resource) => {
                      const resourceUrl = getPublicMediaUrl(resource.mediaPath);
                      const isCurrentAvatar = !!resourceUrl && resourceUrl === character.imageUrl;

                      return (
                        <div key={resource.id} className="overflow-hidden rounded-2xl border bg-card">
                          <div className="relative h-52 bg-muted">
                            {resourceUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={resourceUrl}
                                alt={resource.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-muted-foreground">
                                <ImageIcon className="h-8 w-8" />
                              </div>
                            )}
                            {isCurrentAvatar ? (
                              <Badge className="absolute left-3 top-3 rounded-full">Avatar actual</Badge>
                            ) : null}
                          </div>
                          <div className="space-y-3 p-4">
                            <div>
                              <p className="truncate text-sm font-medium">{resource.name}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {new Date(resource.createdAt).toLocaleDateString("es-ES", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant={isCurrentAvatar ? "secondary" : "outline"}
                                className="flex-1 rounded-xl"
                                onClick={() => handleUseLibraryImageAsAvatar(resource.mediaPath)}
                              >
                                {isCurrentAvatar ? "Usada como avatar" : "Usar como avatar"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={interviewOpen} onOpenChange={setInterviewOpen}>
        <DialogContent className="max-w-5xl p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Entrevistar a {character.name}</DialogTitle>
            <DialogDescription>
              Haz preguntas libres y deja que el personaje responda en primera persona desde su ficha actual.
            </DialogDescription>
          </DialogHeader>
          <div className="h-[72vh]">
            <AIPanel
              visible={interviewOpen}
              className="h-full"
              projectId={character.projectId}
              projectTitle={`Entrevista a ${character.name}`}
              panelTitle={`Entrevista a ${character.name}`}
              panelDescription="Haz preguntas sobre pasado, contradicciones, deseos, miedos o relaciones para descubrir su voz."
              assistantLabel={character.name}
              inputPlaceholder={`Pregúntale algo a ${character.name}...`}
              emptyStateText={`Empieza con algo como “¿qué es lo que más temes?” o “¿qué ocultas de verdad?”.`}
              contextText={interviewContext}
              customConfig={aiConfig}
              fixedMode="copiloto"
              systemPromptOverride={interviewSystemPrompt}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
