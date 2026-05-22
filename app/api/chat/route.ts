import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText, streamText } from "ai";
import type { ModelMessage } from "ai";
import type { AIProvider, AIRequestConfig, AIMode } from "@/lib/types";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

function sanitizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];

  return input.flatMap((message) => {
    if (!message || typeof message !== "object") return [];

    const { role, content } = message as { role?: unknown; content?: unknown };
    if (
      (role !== "user" && role !== "assistant" && role !== "system") ||
      typeof content !== "string"
    ) {
      return [];
    }

    return [{ role, content }];
  });
}

function getProviderDefaults(provider: AIProvider) {
  switch (provider) {
    case "openai":
      return {
        apiKey:
          process.env.OPENAI_API_KEY || process.env.AI_API_KEY,
        baseURL:
          process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL || "https://api.openai.com/v1",
        model:
          process.env.OPENAI_MODEL || process.env.AI_MODEL || "gpt-4o-mini",
      };
    case "anthropic":
      return {
        apiKey:
          process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY,
        baseURL:
          process.env.ANTHROPIC_BASE_URL || process.env.AI_BASE_URL,
        model:
          process.env.ANTHROPIC_MODEL || process.env.AI_MODEL || "claude-sonnet-4-5",
      };
    case "gemini":
      return {
        apiKey:
          process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
          process.env.GEMINI_API_KEY ||
          process.env.AI_API_KEY,
        baseURL:
          process.env.GEMINI_BASE_URL || process.env.AI_BASE_URL,
        model:
          process.env.GEMINI_MODEL || process.env.AI_MODEL || "gemini-2.5-flash",
      };
    case "ollama":
    default:
      return {
        apiKey:
          process.env.OLLAMA_API_KEY || process.env.AI_API_KEY || "ollama",
        baseURL:
          process.env.OLLAMA_BASE_URL || process.env.AI_BASE_URL || "http://localhost:11434/v1",
        model:
          process.env.OLLAMA_MODEL || process.env.AI_MODEL || "gemma4:e4b",
      };
  }
}

function resolveConfig(customConfig?: AIRequestConfig) {
  const provider = customConfig?.provider || "ollama";
  const defaults = getProviderDefaults(provider);
  const configuredModel = customConfig?.model || defaults.model;
  const model =
    provider === "ollama" &&
    (!configuredModel || configuredModel === "llama3" || configuredModel === "gemma4:31b")
      ? "gemma4:e4b"
      : configuredModel;

  return {
    provider,
    apiKey: customConfig?.apiKey || defaults.apiKey,
    baseURL: customConfig?.baseURL || defaults.baseURL,
    model,
  };
}

function requiresApiKey(provider: AIProvider) {
  return provider === "openai" || provider === "anthropic" || provider === "gemini";
}

function createLanguageModel({
  provider,
  apiKey,
  baseURL,
  model,
}: {
  provider: AIProvider;
  apiKey?: string;
  baseURL?: string;
  model: string;
}) {
  switch (provider) {
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey,
        baseURL,
      });
      return anthropic(model);
    }
    case "gemini": {
      const google = createGoogleGenerativeAI({
        apiKey,
        baseURL,
      });
      return google(model);
    }
    case "openai": {
      const openai = createOpenAI({
        apiKey,
        baseURL,
      });
      return openai(model);
    }
    case "ollama":
    default: {
      const ollama = createOpenAI({
        apiKey: apiKey || "ollama",
        baseURL,
      });
      return ollama(model);
    }
  }
}

function getModeSettings(mode?: AIMode) {
  switch (mode) {
    case "piloto":
      return {
        temperature: 0.8,
        maxOutputTokens: 1400,
      };
    case "ideas":
      return {
        temperature: 0.95,
        maxOutputTokens: 1600,
      };
    case "revision":
      return {
        temperature: 0.4,
        maxOutputTokens: 1000,
      };
    case "editorial":
      return {
        temperature: 0.35,
        maxOutputTokens: 1300,
      };
    case "copiloto":
    default:
      return {
        temperature: 0.7,
        maxOutputTokens: 700,
      };
  }
}

function getLastUserMessage(
  messages: ChatMessage[] = []
) {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
}

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function isMetaConversation(userText: string, assistantText: string) {
  const combined = normalizeText(`${userText}\n${assistantText}`);

  const metaSignals = [
    "qué inteligencia artificial eres",
    "que inteligencia artificial eres",
    "qué ia eres",
    "que ia eres",
    "qué modelo eres",
    "que modelo eres",
    "eres chatgpt",
    "eres claude",
    "eres llama",
    "quién eres",
    "quien eres",
    "cómo funcionas",
    "como funcionas",
    "qué puedes hacer",
    "que puedes hacer",
    "qué modelo usan",
    "que modelo usan",
    "api key",
    "openai",
    "anthropic",
    "gemini",
    "ollama",
    "meta ai",
    "modelo de lenguaje",
    "inteligencia artificial",
    "large language model",
  ];

  return metaSignals.some((signal) => combined.includes(signal));
}

function asksForNarrativeWriting(userText: string) {
  const normalized = normalizeText(userText);
  const writingSignals = [
    "continúa",
    "continua",
    "continua el capitulo",
    "continua el capítulo",
    "escribe",
    "redacta",
    "reescribe",
    "reformula como prosa",
    "convierte en escena",
    "convierte esta respuesta en una escena",
    "escribir como escena",
    "escena narrativa",
    "lista para insertarse",
    "lista para el manuscrito",
    "genera una escena",
    "genera un diálogo",
    "genera un dialogo",
    "haz una escena",
    "escribe la escena",
    "escribe el capítulo",
    "escribe el capitulo",
    "texto para insertar",
    "prosa",
    "narración",
    "narracion",
    "diálogo",
    "dialogo",
    "borrador",
  ];

  if (writingSignals.some((signal) => normalized.includes(signal))) {
    return true;
  }

  return (
    (normalized.includes("escena") && (normalized.includes("convierte") || normalized.includes("escribe"))) ||
    (normalized.includes("prosa") && (normalized.includes("reescribe") || normalized.includes("reformula")))
  );
}

function asksForEditorialReport(userText: string) {
  const normalized = normalizeText(userText);
  const reportSignals = [
    "informe editorial",
    "haz un informe",
    "informe",
    "diagnóstico",
    "diagnostico",
    "análisis",
    "analisis",
    "comentarios",
    "observaciones",
    "lista de cambios",
    "problemas de estilo",
    "problemas",
    "explica",
    "señala",
    "senala",
    "detalla",
  ];

  return reportSignals.some((signal) => normalized.includes(signal));
}

function looksLikeManuscriptText(content: string) {
  const normalized = content.trim();
  if (!normalized) return false;

  const lower = normalizeText(normalized);
  const disqualifiers = [
    "aquí tienes",
    "aqui tienes",
    "te propongo",
    "puedes usar",
    "opción 1",
    "opcion 1",
    "idea 1",
    "análisis",
    "analisis",
    "respuesta:",
    "como ia",
    "soy una inteligencia artificial",
    "me llamo péndola",
    "me llamo pendola",
    "estoy capacitada",
    "modelo de lenguaje",
  ];

  if (disqualifiers.some((signal) => lower.includes(signal))) {
    return false;
  }

  if (normalized.includes("\n- ") || normalized.includes("\n* ") || normalized.includes("1.")) {
    return false;
  }

  const sentenceCount = normalized
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;

  return sentenceCount >= 2;
}

function normalizeStructuredResponse({
  mode,
  messages,
  response,
}: {
  mode?: AIMode;
  messages: ChatMessage[];
  response: {
    type: "narrative_text" | "rewrite" | "ideas_list" | "analysis" | "qa";
    insertable: boolean;
    content: string;
  };
}) {
  const lastUserMessage = getLastUserMessage(messages);
  const metaConversation = isMetaConversation(lastUserMessage, response.content);
  const requestedNarrativeWriting = asksForNarrativeWriting(lastUserMessage);
  const requestedEditorialReport = mode === "editorial" && asksForEditorialReport(lastUserMessage);
  const requestedInsertableText =
    requestedNarrativeWriting || (mode === "editorial" && !requestedEditorialReport);
  const manuscriptReady = looksLikeManuscriptText(response.content);

  if (metaConversation) {
    return {
      ...response,
      type: "qa" as const,
      insertable: false,
    };
  }

  if (
    response.insertable &&
    (!requestedInsertableText || !manuscriptReady || (mode !== "piloto" && mode !== "editorial" && response.type !== "rewrite"))
  ) {
    return {
      ...response,
      type:
        response.type === "narrative_text" || response.type === "rewrite"
          ? "qa"
          : response.type,
      insertable: false,
    };
  }

  return {
    ...response,
    insertable:
      response.insertable &&
      requestedInsertableText &&
      manuscriptReady &&
      (mode === "piloto" || mode === "editorial" || response.type === "rewrite" || response.type === "narrative_text"),
  };
}

function ensureStructuredContent({
  mode,
  response,
}: {
  mode?: AIMode;
  response: {
    type: "narrative_text" | "rewrite" | "ideas_list" | "analysis" | "qa";
    insertable: boolean;
    content: string;
  };
}) {
  if (response.content.trim()) {
    return response;
  }

  const fallbackByMode: Record<AIMode, string> = {
    piloto:
      "No pude generar un fragmento narrativo utilizable en este intento. Prueba con una instrucción más específica sobre la escena, el tono o el objetivo del capítulo.",
    copiloto:
      "No devolví contenido utilizable en este intento. Reformula la petición con más detalle o pide una continuación más concreta.",
    ideas:
      "No pude generar ideas claras en este intento. Prueba pidiendo conflictos, giros, escenas o alternativas más específicas.",
    revision:
      "No pude generar una revisión útil en este intento. Vuelve a intentarlo indicando qué quieres revisar: tono, ritmo, claridad, coherencia o reescritura.",
    editorial:
      "No pude generar una corrección editorial utilizable en este intento. Prueba indicando si quieres una versión corregida completa, una revisión de estilo o una mejora de claridad.",
  };

  return {
    type: "qa" as const,
    insertable: false,
    content: fallbackByMode[mode ?? "copiloto"],
  };
}

function buildStructuredFallbackFromText({
  mode,
  messages,
  content,
}: {
  mode?: AIMode;
  messages: ChatMessage[];
  content: string;
}) {
  const trimmedContent = content.trim();
  const requestedNarrativeWriting = asksForNarrativeWriting(getLastUserMessage(messages));
  const requestedEditorialReport =
    mode === "editorial" && asksForEditorialReport(getLastUserMessage(messages));
  const likelyManuscriptText = looksLikeManuscriptText(trimmedContent);

  const responseType =
    mode === "ideas"
      ? "ideas_list"
      : mode === "editorial"
      ? requestedEditorialReport
        ? "analysis"
        : likelyManuscriptText
        ? "rewrite"
        : "analysis"
      : mode === "revision"
      ? "analysis"
      : requestedNarrativeWriting && likelyManuscriptText
      ? "narrative_text"
      : "qa";

  return ensureStructuredContent({
    mode,
    response: normalizeStructuredResponse({
      mode,
      messages,
      response: {
        type: responseType,
        insertable:
          (requestedNarrativeWriting || (mode === "editorial" && !requestedEditorialReport)) &&
          likelyManuscriptText,
        content: trimmedContent,
      },
    }),
  });
}

function buildPlainTextSystemPrompt(fullSystemPrompt: string) {
  return `${fullSystemPrompt}

Responde en texto plano limpio para el usuario final.
- No uses JSON.
- No uses XML.
- No expliques el formato de tu respuesta.
- No muestres razonamiento interno ni tu proceso paso a paso.
- Entrega solo el contenido final.`;
}

function looksLikeIncompleteResponse(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return true;

  if (/[,:;(\["'`-]$/.test(trimmed)) {
    return true;
  }

  if (!/[.!?…)"»]$/.test(trimmed) && trimmed.split(/\s+/).length > 12) {
    return true;
  }

  const trailingConnectorPattern =
    /\b(de|del|la|el|los|las|y|o|u|que|con|sin|para|por|en|un|una|al|como)$/i;

  return trailingConnectorPattern.test(trimmed);
}

function mergeContinuation(base: string, continuation: string) {
  const trimmedBase = base.trim();
  const trimmedContinuation = continuation.trim();

  if (!trimmedBase) return trimmedContinuation;
  if (!trimmedContinuation) return trimmedBase;

  return /[.!?…)"»]$/.test(trimmedBase)
    ? `${trimmedBase}\n\n${trimmedContinuation}`
    : `${trimmedBase} ${trimmedContinuation}`;
}

async function extendIncompletePlainTextResponse({
  languageModel,
  plainTextSystemPrompt,
  messages,
  initialContent,
  temperature,
  maxOutputTokens,
}: {
  languageModel: ReturnType<typeof createLanguageModel>;
  plainTextSystemPrompt: string;
  messages: ChatMessage[];
  initialContent: string;
  temperature: number;
  maxOutputTokens: number;
}) {
  let content = initialContent.trim();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!content || !looksLikeIncompleteResponse(content)) {
      break;
    }

    const continuationResult = await generateText({
      model: languageModel,
      system: `${plainTextSystemPrompt}

Continua exactamente desde la ultima idea o frase incompleta de tu respuesta anterior.
- No repitas contenido ya escrito.
- No reinicies la respuesta.
- Si estabas en una lista, continua la lista.
- Empieza directamente por la continuacion.
- Si estabas desarrollando una opcion o un apartado, terminalo antes de pasar al siguiente.`,
      messages: [
        ...messages,
        {
          role: "assistant",
          content,
        },
      ] as ModelMessage[],
      temperature,
      maxOutputTokens: Math.min(maxOutputTokens, 900),
    });

    const nextChunk = continuationResult.text.trim();
    if (!nextChunk) {
      break;
    }

    content = mergeContinuation(content, nextChunk);
  }

  return content;
}

async function generateStructuredFromPlainText({
  languageModel,
  fullSystemPrompt,
  messages,
  mode,
  modeSettings,
}: {
  languageModel: ReturnType<typeof createLanguageModel>;
  fullSystemPrompt: string;
  messages: ChatMessage[];
  mode?: AIMode;
  modeSettings: { temperature: number; maxOutputTokens: number };
}) {
  const plainTextSystemPrompt = buildPlainTextSystemPrompt(fullSystemPrompt);

  const initialResult = await generateText({
    model: languageModel,
    system: plainTextSystemPrompt,
    messages: messages as ModelMessage[],
    temperature: modeSettings.temperature,
    maxOutputTokens: modeSettings.maxOutputTokens,
  });

  let content = initialResult.text.trim();

  if (
    content &&
    (initialResult.finishReason === "length" || looksLikeIncompleteResponse(content))
  ) {
    content = await extendIncompletePlainTextResponse({
      languageModel,
      plainTextSystemPrompt,
      messages,
      initialContent: content,
      temperature: modeSettings.temperature,
      maxOutputTokens: modeSettings.maxOutputTokens,
    });
  }

  return buildStructuredFallbackFromText({
    mode,
    messages,
    content,
  });
}

export async function POST(req: Request) {
  try {
    const {
      messages: rawMessages,
      mode,
      systemPrompt,
      customConfig,
      contextText,
      structured,
      preferredLanguage,
    } = await req.json();
    const messages = sanitizeMessages(rawMessages);

    const { provider, apiKey, baseURL, model } = resolveConfig(customConfig);

    if (requiresApiKey(provider) && !apiKey) {
      return new Response(
        JSON.stringify({
          error: `Falta configurar la API key para el proveedor ${provider}.`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if ((provider === "openai" || provider === "ollama") && !baseURL) {
      return new Response(
        JSON.stringify({
          error: `No hay baseURL configurada para el proveedor ${provider}.`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!model) {
      return new Response(
        JSON.stringify({
          error: `No hay modelo configurado para el proveedor ${provider}.`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const baseSystemPrompt =
      systemPrompt ||
      (mode === "editorial"
        ? "Eres Péndola, una editora literaria profesional en español. Trabaja con criterio RAE práctico y normas panhispánicas. Prioriza ortografía, gramática, puntuación, claridad, naturalidad, ritmo y consistencia estilística. Conserva la voz del autor salvo error claro. Por defecto entrega texto corregido limpio listo para guardarse en la versión editorial; solo entrega diagnóstico o informe cuando se te pida explícitamente."
        : mode === "revision"
        ? "Eres Péndola, un editor literario exigente. Prioriza claridad, coherencia y propuestas concretas."
        : "Eres Péndola, un asistente literario experto. Estás ayudando a escribir y estructurar una novela o historia.");

    const requiredLanguage = preferredLanguage?.trim() || "español";
    const languageGuardrail = `IDIOMA OBLIGATORIO DE SALIDA: responde exclusivamente en ${requiredLanguage}. No cambies al inglés ni a otro idioma salvo que el usuario lo pida explícitamente en su último mensaje. Si el mensaje mezcla idiomas, mantén ${requiredLanguage} como idioma principal de toda la respuesta.`;
    const resourceGuardrail = "Si el contexto incluye extractos de recursos, PDFs o documentos, trátalos como texto ya leído y analízalos directamente. No respondas con frases como 'no puedo leer archivos' cuando el contenido ya viene transcrito en el contexto.";
    const fullSystemPrompt = contextText?.trim()
      ? `${baseSystemPrompt}\n\n${languageGuardrail}\n\n${resourceGuardrail}\n\nCONTEXTO NARRATIVO DISPONIBLE\n${contextText}`
      : `${baseSystemPrompt}\n\n${languageGuardrail}\n\n${resourceGuardrail}`;
    const modeSettings = getModeSettings(mode);
    const languageModel = createLanguageModel({
      provider,
      apiKey,
      baseURL,
      model,
    });

    if (structured) {
      if (provider === "ollama") {
        return Response.json(
          await generateStructuredFromPlainText({
            languageModel,
            fullSystemPrompt,
            messages,
            mode,
            modeSettings,
          })
        );
      }

      try {
        const result = await generateObject({
          model: languageModel,
          system: `${fullSystemPrompt}

Debes responder con una clasificación estructurada de tu salida.
- Usa "narrative_text" si estás entregando texto narrativo listo para insertar.
- Usa "rewrite" si estás reescribiendo un fragmento para reemplazar texto.
- Usa "ideas_list" si estás dando ideas, opciones o brainstorming.
- Usa "analysis" si estás analizando, revisando o comentando el texto.
- Usa "qa" si estás respondiendo una duda o conversación general.
- "insertable" solo puede ser true si el contenido está listo para integrarse directamente al manuscrito o a la versión editorial.
- Nunca marques como insertable respuestas meta sobre la IA, el modelo, el proveedor o el funcionamiento de la herramienta.
- Si la solicitud no pide texto narrativo para incluir, responde con insertable=false.`,
          messages: messages as ModelMessage[],
          schema: z.object({
            type: z.enum(["narrative_text", "rewrite", "ideas_list", "analysis", "qa"]),
            insertable: z.boolean(),
            content: z.string(),
          }),
          temperature: modeSettings.temperature,
          maxOutputTokens: modeSettings.maxOutputTokens,
        });

        const repairedContent = await extendIncompletePlainTextResponse({
          languageModel,
          plainTextSystemPrompt: buildPlainTextSystemPrompt(fullSystemPrompt),
          messages,
          initialContent: result.object.content,
          temperature: modeSettings.temperature,
          maxOutputTokens: modeSettings.maxOutputTokens,
        });

        return Response.json(
          ensureStructuredContent({
            mode,
            response: normalizeStructuredResponse({
              mode,
              messages,
              response: {
                ...result.object,
                content: repairedContent,
              },
            }),
          })
        );
      } catch (structuredError) {
        console.warn("Structured generation failed, falling back to plain text.", structuredError);
        return Response.json(
          await generateStructuredFromPlainText({
            languageModel,
            fullSystemPrompt,
            mode,
            messages,
            modeSettings,
          })
        );
      }
    }

    const result = streamText({
      model: languageModel,
      system: fullSystemPrompt,
      messages: messages as ModelMessage[],
      temperature: modeSettings.temperature,
      maxOutputTokens: modeSettings.maxOutputTokens,
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("API Chat Error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
