import type { Book, Chapter, Character, EditorialDraft, Project, Resource, Scenario } from "@/lib/types";
import { buildCharacterTraitSummary } from "@/lib/characters/archetypes";

const MAX_SECTION_LENGTH = 1600;
const MAX_CHAPTER_SNIPPET = 2200;
const MAX_RESOURCE_SNIPPET = 1400;
const MAX_RESOURCE_SECTION_LENGTH = 5200;
const MAX_HEURISTIC_CHAPTERS = 4;

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function htmlToPlainText(content: string) {
  if (!content?.trim()) return "";

  return collapseWhitespace(
    content
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|blockquote|h[1-6])>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
  );
}

export function countWordsFromContent(content: string) {
  const plainText = htmlToPlainText(content);
  if (!plainText) return 0;

  return plainText
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean).length;
}

function trimSection(value: string, maxLength: number) {
  const normalized = collapseWhitespace(value);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
}

function buildCharacterSummary(character: Character) {
  const parts = [
    character.physicalDescription,
    buildCharacterTraitSummary(character),
    character.drive && `Impulso: ${character.drive}`,
    character.wish && `Deseo: ${character.wish}`,
    character.void && `Vacío: ${character.void}`,
    character.vice && `Falla: ${character.vice}`,
    character.origin && `Origen: ${character.origin}`,
    character.persona && `Máscara: ${character.persona}`,
    character.expedition && `Transformación: ${character.expedition}`,
    character.notes && `Notas: ${character.notes}`,
  ].filter(Boolean);

  return parts.length > 0
    ? `${character.name}: ${trimSection(parts.join(" | "), 420)}`
    : `${character.name}: personaje sin ficha desarrollada todavía.`;
}

function buildScenarioSummary(scenario: Scenario) {
  const parts = [
    scenario.description,
    scenario.atmosphere && `Atmósfera: ${scenario.atmosphere}`,
    scenario.narrativeImportance && `Importancia: ${scenario.narrativeImportance}`,
    scenario.notes && `Notas: ${scenario.notes}`,
  ].filter(Boolean);

  return `${scenario.name}: ${trimSection(parts.join(" | "), 320)}`;
}

function buildResourceSummary(resource: Resource) {
  const raw = resource.extractedContent || resource.description || "";
  if (!raw.trim()) return `${resource.name}: recurso sin contenido legible todavía.`;
  return `${resource.name}: ${trimSection(raw, MAX_RESOURCE_SNIPPET)}`;
}

function buildResourcesSection(resources: Resource[]) {
  if (resources.length === 0) return "Sin recursos o notas adicionales.";

  const orderedResources = [...resources].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  const entries: string[] = [];
  let consumedLength = 0;

  for (const resource of orderedResources) {
    const summary = buildResourceSummary(resource);
    const entryLength = summary.length + 1;

    if (consumedLength + entryLength > MAX_RESOURCE_SECTION_LENGTH && entries.length > 0) {
      break;
    }

    entries.push(summary);
    consumedLength += entryLength;
  }

  return entries.join("\n");
}

function tokenizeReferenceText(value: string) {
  return Array.from(
    new Set(
      collapseWhitespace(value)
        .toLowerCase()
        .split(/[^a-z0-9áéíóúñü]+/i)
        .filter((token) => token.length >= 4)
    )
  )
}

function scoreTextAgainstTerms(text: string, terms: string[]) {
  if (terms.length === 0) return 0

  const lowered = text.toLowerCase()
  return terms.reduce((score, term) => (lowered.includes(term) ? score + 1 : score), 0)
}

function pickRelevantCharacters(
  characters: Character[],
  referenceText: string,
  maxItems = 6
) {
  const lowered = referenceText.toLowerCase();
  const matched = characters.filter((character) =>
    lowered.includes(character.name.toLowerCase())
  );

  if (matched.length >= maxItems) return matched.slice(0, maxItems);

  const remaining = characters.filter(
    (character) => !matched.some((item) => item.id === character.id)
  );

  return [...matched, ...remaining].slice(0, maxItems);
}

function pickRelevantScenarios(
  scenarios: Scenario[],
  referenceText: string,
  maxItems = 4
) {
  const lowered = referenceText.toLowerCase()
  const matched = scenarios.filter((scenario) => lowered.includes(scenario.name.toLowerCase()))

  if (matched.length >= maxItems) return matched.slice(0, maxItems)

  const remaining = scenarios.filter((scenario) => !matched.some((item) => item.id === scenario.id))
  return [...matched, ...remaining].slice(0, maxItems)
}

function pickRelevantPreviousChapters(
  chapters: Chapter[],
  currentChapter: Chapter | undefined,
  referenceText: string
) {
  const previousChapters = chapters
    .filter((chapter) => currentChapter && chapter.id !== currentChapter.id && chapter.order < currentChapter.order)
    .sort((a, b) => a.order - b.order)

  const terms = tokenizeReferenceText(referenceText)
  const scored = previousChapters.map((chapter) => ({
    chapter,
    score: scoreTextAgainstTerms(
      `${chapter.title}\n${htmlToPlainText(chapter.content)}`,
      terms
    ),
  }))

  const matching = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.chapter.order - a.chapter.order)
    .slice(0, MAX_HEURISTIC_CHAPTERS)
    .map((item) => item.chapter)

  const fallback = previousChapters
    .slice(-3)
    .filter((chapter) => !matching.some((item) => item.id === chapter.id))

  return [...matching, ...fallback].slice(0, MAX_HEURISTIC_CHAPTERS)
}

function pickRelevantResources(resources: Resource[], referenceText: string) {
  const terms = tokenizeReferenceText(referenceText)
  const scored = resources.map((resource) => ({
    resource,
    score: scoreTextAgainstTerms(
      `${resource.name}\n${resource.description}\n${resource.extractedContent || ''}`,
      terms
    ),
  }))

  const matching = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.resource.createdAt.localeCompare(a.resource.createdAt))
    .map((item) => item.resource)

  if (matching.length > 0) {
    return matching.slice(0, 5)
  }

  return [...resources].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4)
}

export interface NarrativeContextInput {
  project: Project;
  book?: Book;
  currentChapter?: Chapter;
  editorialDraft?: EditorialDraft;
  chapters?: Chapter[];
  characters?: Character[];
  scenarios?: Scenario[];
  resources?: Resource[];
  mode?: string;
  workspace?: "writing" | "editorial";
  queryText?: string;
}

export function buildNarrativeContext({
  project,
  book,
  currentChapter,
  editorialDraft,
  chapters = [],
  characters = [],
  scenarios = [],
  resources = [],
  mode,
  workspace = "writing",
  queryText = "",
}: NarrativeContextInput) {
  const chapterText = currentChapter ? htmlToPlainText(currentChapter.content) : "";
  const editorialText = editorialDraft ? htmlToPlainText(editorialDraft.content) : "";
  const referenceText = [project.title, project.premise, chapterText, queryText]
    .filter(Boolean)
    .join("\n");
  const previousChapters = pickRelevantPreviousChapters(chapters, currentChapter, referenceText);

  const chapterHistory = previousChapters.length
    ? previousChapters
        .map((chapter) => {
          const summarySource = htmlToPlainText(chapter.content);
          return `Capítulo ${chapter.order} - ${chapter.title}: ${trimSection(summarySource, 500) || "Sin contenido todavía."}`;
        })
        .join("\n")
    : "No hay capítulos anteriores con contenido.";

  const relevantCharacters = pickRelevantCharacters(
    characters,
    referenceText
  );
  const relevantScenarios = pickRelevantScenarios(scenarios, referenceText);
  const relevantResources = pickRelevantResources(resources, referenceText);

  const sections = [
    "CONTEXTO DEL PROYECTO",
    `Proyecto: ${project.title}`,
    book ? `Libro: ${book.title}` : null,
    project.genre ? `Género: ${project.genre}` : null,
    project.premise ? `Premisa: ${trimSection(project.premise, MAX_SECTION_LENGTH)}` : null,
    project.theme ? `Tema: ${trimSection(project.theme, 400)}` : null,
    project.antiTheme ? `Antitema: ${trimSection(project.antiTheme, 400)}` : null,
    project.creativeProfile
      ? `Perfil creativo global: ${trimSection(project.creativeProfile, MAX_SECTION_LENGTH)}`
      : null,
    project.aiInstructions
      ? `Instrucciones globales para Péndola: ${trimSection(project.aiInstructions, MAX_SECTION_LENGTH)}`
      : null,
    workspace === "editorial" && project.editorialInstructions
      ? `Criterio editorial del proyecto: ${trimSection(project.editorialInstructions, MAX_SECTION_LENGTH)}`
      : null,
    `Espacio de trabajo: ${workspace === "editorial" ? "Editorial" : "Escribir"}`,
    mode ? `Modo activo: ${mode}` : null,
    "",
    "CAPÍTULO ACTUAL",
    currentChapter
      ? `Capítulo ${currentChapter.order}: ${currentChapter.title}`
      : "No hay capítulo actual seleccionado.",
    chapterText
      ? `Texto del capítulo actual: ${trimSection(chapterText, MAX_CHAPTER_SNIPPET)}`
      : "Texto del capítulo actual: vacío o todavía no escrito.",
    workspace === "editorial"
      ? editorialDraft
        ? `Texto editorial actual: ${trimSection(editorialText, MAX_CHAPTER_SNIPPET)}`
        : "Texto editorial actual: todavía no existe una copia editorial para este capítulo."
      : null,
    workspace === "editorial" && editorialDraft && currentChapter
      ? editorialDraft.sourceChapterUpdatedAt === currentChapter.updatedAt
        ? "Estado editorial: sincronizado con Escribir."
        : "Estado editorial: desactualizado respecto al manuscrito en Escribir."
      : null,
    "",
    "HISTORIAL RECIENTE",
    chapterHistory,
    "",
    "PERSONAJES RELEVANTES",
    relevantCharacters.length > 0
      ? relevantCharacters.map(buildCharacterSummary).join("\n")
      : "No hay personajes cargados todavía.",
    "",
    "ESCENARIOS Y RECURSOS",
    relevantScenarios.length > 0
      ? relevantScenarios.map(buildScenarioSummary).join("\n")
      : "Sin escenarios definidos.",
    buildResourcesSection(relevantResources),
    "",
    "INSTRUCCIONES DE CONTEXTO",
    "Asume que este contexto ya fue leído antes de responder.",
    "No pidas otra vez datos que ya estén presentes aquí, salvo que falte una decisión creativa real.",
    "Prioriza continuidad, coherencia narrativa y referencias exactas al material existente.",
    "Si aquí aparecen extractos de recursos o PDFs, trátalos como material ya leído. No digas que no puedes leer archivos si su contenido ya está transcrito en este contexto.",
    workspace === "editorial"
      ? "En Editorial, prioriza corrección ortográfica, gramática, puntuación, claridad, ritmo, consistencia y buenas prácticas editoriales. Conserva la voz del autor."
      : null,
  ].filter(Boolean);

  return sections.join("\n");
}
