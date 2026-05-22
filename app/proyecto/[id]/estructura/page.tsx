"use client";

import { use, useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  Panel,
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Compass, Map as MapIcon, Users, MapPin, BookOpen, Zap } from "lucide-react";
import { resolveEntityId } from "@/lib/routing";
import { useProjectStore } from "@/lib/store";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface MapNodeData extends Record<string, unknown> {
  label: string;
  sublabel: string;
  type: "root" | "personaje" | "escenario" | "capitulo";
  isRoot?: boolean;
}

type MapNode = Node<MapNodeData, "custom">;

function CustomNode({ data }: NodeProps<MapNode>) {
  const Icon =
    data.type === "personaje"
      ? Users
      : data.type === "escenario"
      ? MapPin
      : data.type === "capitulo"
      ? BookOpen
      : MapIcon;

  const colorClass =
    data.type === "personaje"
      ? "bg-blue-500/10 border-blue-500/50 text-blue-500"
      : data.type === "escenario"
      ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500"
      : data.type === "capitulo"
      ? "bg-violet-500/10 border-violet-500/50 text-violet-500"
      : "bg-orange-500/10 border-orange-500/50 text-orange-500";

  return (
    <div
      className={`flex w-[220px] items-center gap-3 rounded-2xl border bg-card/96 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur ${
        data.isRoot ? "border-primary/45 bg-primary/[0.04]" : "border-border/70"
      }`}
    >
      <Handle type="target" position={Position.Top} className="h-2 w-2" />
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{data.label}</p>
        <p className="truncate text-xs text-muted-foreground">{data.sublabel}</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="h-2 w-2" />
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

export default function EstructuraPage({ params }: PageProps) {
  const { id: projectSegment } = use(params);
  const { resolvedTheme } = useTheme();
  const { projects, books, getChaptersByBook, getCharactersByProject, getScenariosByProject } =
    useProjectStore();

  const projectId = resolveEntityId(
    projectSegment,
    projects.map((item) => item.id)
  );
  const project = projects.find((item) => item.id === projectId);

  const initialNodes = useMemo<MapNode[]>(() => {
    if (!project) return [];

    const nodes: MapNode[] = [];
    const characters = getCharactersByProject(projectId);
    const scenarios = getScenariosByProject(projectId);
    const projectBooks = books.filter((book) => book.projectId === projectId);

    nodes.push({
      id: "root",
      type: "custom",
      position: { x: 400, y: 50 },
      data: {
        label: project.title,
        sublabel: "Proyecto principal",
        type: "root",
        isRoot: true,
      },
    });

    let bookY = 200;
    projectBooks.forEach((book) => {
      const bookId = `book-${book.id}`;
      nodes.push({
        id: bookId,
        type: "custom",
        position: { x: 200, y: bookY },
        data: {
          label: book.title,
          sublabel: "Libro",
          type: "capitulo",
        },
      });

      const chapters = getChaptersByBook(book.id);
      chapters.forEach((chapter, index) => {
        nodes.push({
          id: `chap-${chapter.id}`,
          type: "custom",
          position: { x: 50, y: bookY + 100 + index * 80 },
          data: {
            label: chapter.title,
            sublabel: `${chapter.wordCount} palabras`,
            type: "capitulo",
          },
        });
      });

      bookY += chapters.length * 80 + 150;
    });

    characters.forEach((character, index) => {
      nodes.push({
        id: `char-${character.id}`,
        type: "custom",
        position: { x: 400, y: 200 + index * 100 },
        data: {
          label: character.name,
          sublabel: character.archetypes.direction,
          type: "personaje",
        },
      });
    });

    scenarios.forEach((scenario, index) => {
      nodes.push({
        id: `scen-${scenario.id}`,
        type: "custom",
        position: { x: 600, y: 200 + index * 100 },
        data: {
          label: scenario.name,
          sublabel: scenario.type,
          type: "escenario",
        },
      });
    });

    return nodes;
  }, [books, getChaptersByBook, getCharactersByProject, getScenariosByProject, project, projectId]);

  const initialEdges = useMemo<Edge[]>(() => {
    if (!project) return [];

    const edges: Edge[] = [];
    const projectBooks = books.filter((book) => book.projectId === projectId);
    const characters = getCharactersByProject(projectId);
    const scenarios = getScenariosByProject(projectId);

    projectBooks.forEach((book) => {
      edges.push({
        id: `e-root-book-${book.id}`,
        source: "root",
        target: `book-${book.id}`,
        animated: true,
      });

      const chapters = getChaptersByBook(book.id);
      chapters.forEach((chapter) => {
        edges.push({
          id: `e-book-${book.id}-chap-${chapter.id}`,
          source: `book-${book.id}`,
          target: `chap-${chapter.id}`,
        });
      });
    });

    characters.forEach((character) => {
      edges.push({
        id: `e-root-char-${character.id}`,
        source: "root",
        target: `char-${character.id}`,
      });
    });

    scenarios.forEach((scenario) => {
      edges.push({
        id: `e-root-scen-${scenario.id}`,
        source: "root",
        target: `scen-${scenario.id}`,
      });
    });

    return edges;
  }, [books, getChaptersByBook, getCharactersByProject, getScenariosByProject, project, projectId]);

  const [nodes, setNodes, onNodesChange] = useNodesState<MapNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((currentEdges) => addEdge(params, currentEdges)),
    [setEdges]
  );

  const handleAutoLayout = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  };

  if (!project) return null;

  return (
    <div className="flex h-screen flex-col">
      <header className="sticky top-0 z-40 shrink-0 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-6">
          <SidebarTrigger />
          <Compass className="h-5 w-5 text-indigo-500" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Estructura Narrativa</h1>
          </div>
          <Button size="sm" variant="outline" onClick={handleAutoLayout}>
            <Zap className="mr-2 h-4 w-4 text-yellow-500" />
            Rearmar grafo
          </Button>
        </div>
      </header>

      <div className="grid shrink-0 gap-4 border-b bg-muted/10 px-6 py-5 md:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.5rem] border bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] p-5 dark:bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.16),transparent_36%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.88))]">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
              <Compass className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-700/80 dark:text-indigo-300/80">
                Mapa narrativo
              </p>
              <h2 className="text-xl font-semibold tracking-tight">
                Visualiza cómo se conectan libros, capítulos, personajes y escenarios.
              </h2>
              <p className="text-sm leading-7 text-muted-foreground">
                Esta vista sirve para identificar densidad, huecos y agrupaciones del proyecto. Puedes arrastrar
                nodos para reorganizar la lectura y rehacer el layout cuando quieras volver a un mapa limpio.
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border bg-card/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Libros</p>
            <p className="mt-2 text-2xl font-semibold">{books.filter((book) => book.projectId === projectId).length}</p>
          </div>
          <div className="rounded-2xl border bg-card/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Personajes</p>
            <p className="mt-2 text-2xl font-semibold">{getCharactersByProject(projectId).length}</p>
          </div>
          <div className="rounded-2xl border bg-card/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Escenarios</p>
            <p className="mt-2 text-2xl font-semibold">{getScenariosByProject(projectId).length}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-muted/20">
        <ReactFlow<MapNode, Edge>
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          colorMode={resolvedTheme === "dark" ? "dark" : "light"}
          fitView
          attributionPosition="bottom-right"
        >
          <Background gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              switch ((node.data as unknown as MapNodeData | undefined)?.type) {
                case "personaje":
                  return "#3b82f6";
                case "escenario":
                  return "#10b981";
                case "capitulo":
                  return "#8b5cf6";
                default:
                  return "#f97316";
              }
            }}
            maskColor={
              resolvedTheme === "dark"
                ? "rgba(0, 0, 0, 0.4)"
                : "rgba(255, 255, 255, 0.6)"
            }
          />
          <Panel position="top-left" className="m-4 rounded-2xl border bg-card/88 p-4 shadow-sm backdrop-blur">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Leyenda</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-xs text-muted-foreground">Personajes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-muted-foreground">Escenarios</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-violet-500" />
                <span className="text-xs text-muted-foreground">Libros y capítulos</span>
              </div>
            </div>
            <div className="mt-4 max-w-[220px] text-xs leading-6 text-muted-foreground">
              <p>Arrastra nodos para reorganizar el mapa y conecta puntos para explorar relaciones.</p>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
