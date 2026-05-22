import type { EntityMentionType } from "@/lib/types";

const PLACE_CONTEXT_TERMS = [
  "ciudad",
  "pueblo",
  "aldea",
  "castillo",
  "bosque",
  "selva",
  "calle",
  "avenida",
  "palacio",
  "iglesia",
  "universidad",
  "escuela",
  "reino",
  "continente",
  "camino",
  "puente",
  "torre",
  "puerto",
  "plaza",
  "casa de",
];

const CHARACTER_CONTEXT_TERMS = [
  "dijo",
  "preguntó",
  "respondió",
  "miró",
  "sonrió",
  "pensó",
  "susurró",
  "gritó",
  "ella",
  "él",
  "senor",
  "señor",
  "señora",
  "doctor",
  "madre",
  "padre",
  "hija",
  "hijo",
  "amigo",
  "amiga",
];

function countMatches(text: string, terms: string[]) {
  return terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);
}

export function inferEntityTypeHint(selection: {
  text: string;
  contextBefore?: string;
  contextAfter?: string;
}) {
  const selectedText = selection.text.trim();
  const surrounding = `${selection.contextBefore || ""} ${selection.contextAfter || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const placeScore = countMatches(surrounding, PLACE_CONTEXT_TERMS);
  const characterScore = countMatches(surrounding, CHARACTER_CONTEXT_TERMS);
  const looksLikeFullName = /^[A-ZÁÉÍÓÚÑ][\p{L}'-]+(?:\s+[A-ZÁÉÍÓÚÑ][\p{L}'-]+)+$/u.test(
    selectedText
  );
  const looksLikeSinglePlaceName = /^[A-ZÁÉÍÓÚÑ][\p{L}'-]+$/u.test(selectedText);

  const finalCharacterScore = characterScore + (looksLikeFullName ? 2 : 0);
  const finalPlaceScore = placeScore + (looksLikeSinglePlaceName ? 1 : 0);

  if (finalCharacterScore >= finalPlaceScore + 2) {
    return {
      type: "character" as EntityMentionType,
      confidence: "high" as const,
      reason: "Por el contexto, parece más un personaje que un lugar.",
    };
  }

  if (finalPlaceScore >= finalCharacterScore + 2) {
    return {
      type: "scenario" as EntityMentionType,
      confidence: "high" as const,
      reason: "Por el contexto, parece más un escenario o lugar que un personaje.",
    };
  }

  if (looksLikeFullName) {
    return {
      type: "character" as EntityMentionType,
      confidence: "medium" as const,
      reason: "Tiene forma de nombre propio de personaje.",
    };
  }

  if (looksLikeSinglePlaceName) {
    return {
      type: "scenario" as EntityMentionType,
      confidence: "low" as const,
      reason: "Podría ser un lugar, pero el nombre es ambiguo.",
    };
  }

  return null;
}
