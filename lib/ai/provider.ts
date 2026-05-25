import type { AIRequestConfig, AISettings } from "@/lib/types";

export function buildAIRequestConfig(settings: AISettings): AIRequestConfig {
  switch (settings.provider) {
    case "openai":
      return {
        provider: settings.provider,
        apiKey: settings.openaiKey?.trim() || undefined,
      };
    case "anthropic":
      return {
        provider: settings.provider,
        apiKey: settings.anthropicKey?.trim() || undefined,
      };
    case "gemini":
      return {
        provider: settings.provider,
        apiKey: settings.geminiKey?.trim() || undefined,
      };
    case "ollama":
    default:
      return {
        provider: "ollama",
        baseURL: settings.ollamaBaseUrl?.trim() || undefined,
        apiKey: settings.ollamaKey?.trim() || undefined,
        model: settings.ollamaModel?.trim() || undefined,
      };
  }
}
