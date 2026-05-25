import type { AIConversation, AIProvider, AIUsageSnapshot } from "@/lib/types";

type TokenPricing = {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
};

const GEMINI_PRICING: Array<{ pattern: RegExp; pricing: TokenPricing }> = [
  {
    pattern: /^gemini-2\.5-flash-lite/i,
    pricing: {
      inputPerMillionUsd: 0.1,
      outputPerMillionUsd: 0.4,
    },
  },
  {
    pattern: /^gemini-2\.5-flash/i,
    pricing: {
      inputPerMillionUsd: 0.3,
      outputPerMillionUsd: 2.5,
    },
  },
  {
    pattern: /^gemini-2\.0-flash-lite/i,
    pricing: {
      inputPerMillionUsd: 0.075,
      outputPerMillionUsd: 0.3,
    },
  },
  {
    pattern: /^gemini-2\.0-flash/i,
    pricing: {
      inputPerMillionUsd: 0.1,
      outputPerMillionUsd: 0.4,
    },
  },
];

const GEMINI_CONTEXT_WINDOWS: Array<{ pattern: RegExp; inputLimit: number }> = [
  { pattern: /^gemini-2\.5-flash-lite/i, inputLimit: 1_000_000 },
  { pattern: /^gemini-2\.5-flash/i, inputLimit: 1_000_000 },
  { pattern: /^gemini-2\.0-flash-lite/i, inputLimit: 1_000_000 },
  { pattern: /^gemini-2\.0-flash/i, inputLimit: 1_000_000 },
];

function findGeminiPricing(model?: string) {
  if (!model) return undefined;
  return GEMINI_PRICING.find((entry) => entry.pattern.test(model))?.pricing;
}

export function estimateUsageCostUsd({
  provider,
  model,
  inputTokens,
  outputTokens,
}: {
  provider?: AIProvider;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}) {
  if (provider !== "gemini") {
    return undefined;
  }

  const pricing = findGeminiPricing(model);
  if (!pricing) {
    return undefined;
  }

  const inputCost = ((inputTokens ?? 0) / 1_000_000) * pricing.inputPerMillionUsd;
  const outputCost = ((outputTokens ?? 0) / 1_000_000) * pricing.outputPerMillionUsd;

  return Number((inputCost + outputCost).toFixed(6));
}

export function getApproxInputTokenLimit({
  provider,
  model,
}: {
  provider?: AIProvider;
  model?: string;
}) {
  if (provider !== "gemini" || !model) {
    return undefined;
  }

  return GEMINI_CONTEXT_WINDOWS.find((entry) => entry.pattern.test(model))?.inputLimit;
}

export function formatTokenCount(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("es-PE", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

export function formatUsd(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 0.01 ? 4 : 2,
    maximumFractionDigits: value < 0.01 ? 4 : 2,
  }).format(value);
}

export function sumUsageSnapshots(usages: Array<AIUsageSnapshot | undefined>): AIUsageSnapshot | undefined {
  const present = usages.filter((usage): usage is AIUsageSnapshot => Boolean(usage));
  if (present.length === 0) {
    return undefined;
  }

  const sumField = (key: keyof Pick<
    AIUsageSnapshot,
    "inputTokens" | "outputTokens" | "totalTokens" | "reasoningTokens" | "cachedInputTokens" | "estimatedCostUsd"
  >) => {
    const values = present
      .map((usage) => usage[key])
      .filter((value): value is number => typeof value === "number" && !Number.isNaN(value));

    if (values.length === 0) {
      return undefined;
    }

    return Number(values.reduce((total, value) => total + value, 0).toFixed(6));
  };

  return {
    inputTokens: sumField("inputTokens"),
    outputTokens: sumField("outputTokens"),
    totalTokens: sumField("totalTokens"),
    reasoningTokens: sumField("reasoningTokens"),
    cachedInputTokens: sumField("cachedInputTokens"),
    estimatedCostUsd: sumField("estimatedCostUsd"),
  };
}

export function sumConversationUsages(
  conversations: AIConversation[],
  options?: { since?: string }
) {
  const since = options?.since ? new Date(options.since).getTime() : undefined;

  return sumUsageSnapshots(
    conversations.flatMap((conversation) =>
      conversation.messages
        .filter((message) => {
          if (message.role !== "assistant") return false;
          if (since == null) return true;
          const timestamp = new Date(message.timestamp).getTime();
          return Number.isFinite(timestamp) && timestamp >= since;
        })
        .map((message) => message.usage)
    )
  );
}
