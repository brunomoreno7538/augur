import type { Consumptio } from "./providers/types"

export interface Pretium {
  immissa: number
  emissa: number
}

export const PRETIA: Readonly<Record<string, Pretium>> = {
  "claude-haiku-4-5": { immissa: 1, emissa: 5 },
  "gpt-4o-mini": { immissa: 0.15, emissa: 0.6 },
  "llama3.1": { immissa: 0, emissa: 0 },
  fake: { immissa: 0, emissa: 0 },
}

export const USD_AD_BRL = 5.0

export function computaPretiumBRL(consumptio: Consumptio, exemplar: string): number {
  const pretium = PRETIA[exemplar] ?? { immissa: 0, emissa: 0 }
  const usd =
    (consumptio.signaImmissa / 1_000_000) * pretium.immissa +
    (consumptio.signaEmissa / 1_000_000) * pretium.emissa
  return usd * USD_AD_BRL
}

export function summariumPretii(vocationes: number, consumptio: Consumptio, exemplar: string): string {
  const brl = computaPretiumBRL(consumptio, exemplar)
  return `You spent R$${brl.toFixed(4)} on ${vocationes} divination(s) — ${consumptio.signaImmissa} in / ${consumptio.signaEmissa} out tokens (${exemplar}).`
}
