function getBrowserLanguageLabel() {
  if (typeof navigator === "undefined") return "español";
  const locale = navigator.language?.toLowerCase() || "es";
  if (locale.startsWith("es")) return "español";
  if (locale.startsWith("en")) return "inglés";
  if (locale.startsWith("pt")) return "portugués";
  if (locale.startsWith("fr")) return "francés";
  if (locale.startsWith("it")) return "italiano";
  if (locale.startsWith("de")) return "alemán";
  return navigator.language || "español";
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function detectExplicitLanguageRequest(text: string) {
  if (
    includesAny(text, [
      "en español",
      "en espanol",
      "responde en español",
      "responde en espanol",
      "contesta en español",
      "contesta en espanol",
      "solo en español",
      "solo en espanol",
      "reply in spanish",
      "answer in spanish",
      "respond in spanish",
    ])
  ) {
    return "español";
  }

  if (
    includesAny(text, [
      "en inglés",
      "en ingles",
      "responde en inglés",
      "responde en ingles",
      "contesta en inglés",
      "contesta en ingles",
      "solo en inglés",
      "solo en ingles",
      "in english",
      "reply in english",
      "answer in english",
      "respond in english",
    ])
  ) {
    return "inglés";
  }

  if (
    includesAny(text, [
      "en portugués",
      "en portugues",
      "responde en portugués",
      "responde en portugues",
      "em português",
      "em portugues",
      "responda em português",
      "responda em portugues",
      "in portuguese",
      "reply in portuguese",
    ])
  ) {
    return "portugués";
  }

  if (
    includesAny(text, [
      "en francés",
      "en frances",
      "responde en francés",
      "responde en frances",
      "in french",
      "reply in french",
    ])
  ) {
    return "francés";
  }

  if (
    includesAny(text, [
      "en italiano",
      "responde en italiano",
      "in italian",
      "reply in italian",
    ])
  ) {
    return "italiano";
  }

  if (
    includesAny(text, [
      "en alemán",
      "en aleman",
      "responde en alemán",
      "responde en aleman",
      "in german",
      "reply in german",
    ])
  ) {
    return "alemán";
  }

  return null;
}

export function detectPreferredLanguageFromText(text?: string) {
  const normalized = text?.toLowerCase().trim() || "";
  if (!normalized) return "español";

  return detectExplicitLanguageRequest(normalized) ?? "español";
}

export function getBrowserLanguagePreference() {
  return getBrowserLanguageLabel();
}
