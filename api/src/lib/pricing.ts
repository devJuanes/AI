import { config } from '../config.js'

/** Precios API — modelo básico llama3.2:1b (competitivo vs DeepSeek/Groq en tier entry) */
export const pricing = {
  /** USD mínimo por recarga */
  minRechargeUsd: Number(process.env.BILLING_MIN_RECHARGE_USD ?? 5),
  /** Tokens totales (prompt + completion) incluidos por cada USD */
  tokensPerUsd: Number(process.env.BILLING_TOKENS_PER_USD ?? 200_000),
  /** 200k tokens/USD → 1M tokens = $5 */
  modelLabel: config.defaultChatModel,
  usdCopRate: Number(process.env.BILLING_USD_COP_RATE ?? 4200),
  presetAmountsUsd: [5, 10, 50, 100] as const,
}

export function tokensToUsd(tokens: number): number {
  if (tokens <= 0) return 0
  return tokens / pricing.tokensPerUsd
}

export function usdToTokens(usd: number): number {
  return Math.floor(usd * pricing.tokensPerUsd)
}

export function usdToCop(usd: number): number {
  return Math.round(usd * pricing.usdCopRate)
}

export function copToUsd(cop: number): number {
  return cop / pricing.usdCopRate
}

export function getPricingPublic() {
  return {
    minRechargeUsd: pricing.minRechargeUsd,
    tokensPerUsd: pricing.tokensPerUsd,
    model: pricing.modelLabel,
    usdCopRate: pricing.usdCopRate,
    presetAmountsUsd: [...pricing.presetAmountsUsd],
    /** Referencia: cuántos tokens incluye $1 y $5 */
    examples: {
      perUsd: usdToTokens(1),
      per5Usd: usdToTokens(5),
    },
  }
}

export function roundUsd(n: number): number {
  return Math.round(n * 10_000) / 10_000
}
