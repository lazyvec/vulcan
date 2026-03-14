// 모델별 토큰 단가 (USD per 1M tokens)
// 2026-03 기준 OpenClaw 에이전트 모델

interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // GPT-5.4
  "gpt-5.4": { inputPer1M: 2.0, outputPer1M: 8.0 },
  "gpt-5.4-codex": { inputPer1M: 2.0, outputPer1M: 8.0 },
  // Gemini 3.1 Pro
  "gemini-3.1-pro-preview": { inputPer1M: 1.25, outputPer1M: 5.0 },
  "gemini-3.1-pro": { inputPer1M: 1.25, outputPer1M: 5.0 },
  // Gemini 3 Flash
  "gemini-3-flash": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "gemini-3.0-flash": { inputPer1M: 0.075, outputPer1M: 0.3 },
  // Claude (참고용)
  "claude-opus-4-6": { inputPer1M: 15.0, outputPer1M: 75.0 },
  "claude-sonnet-4-6": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "claude-haiku-4-5": { inputPer1M: 0.8, outputPer1M: 4.0 },
};

// 알 수 없는 모델은 중간 가격대 적용
const FALLBACK_PRICING: ModelPricing = { inputPer1M: 2.0, outputPer1M: 8.0 };

export function getModelPricing(model: string): ModelPricing {
  const normalized = model.toLowerCase().trim();
  return MODEL_PRICING[normalized] ?? FALLBACK_PRICING;
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = getModelPricing(model);
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // 6자리 소수
}
