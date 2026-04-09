import type { Sententia } from "./parser/ast"

export interface Configuratio {
  oraculum: string
  exemplar: string
  temperatura: number
  aerarium: number
  spatiumMemoriae: number
  memor: boolean
  fasciculusMemoriae: string
  conatus: number
}

export interface PartesConfigurationis {
  oraculum?: string
  exemplar?: string
  temperatura?: number
  aerarium?: number
  spatiumMemoriae?: number
  memor?: boolean
  fasciculusMemoriae?: string
  conatus?: number
}

export const CONFIGURATIO_PRAEDEFINITA = {
  oraculum: "fake",
  temperatura: 0.7,
  aerarium: 1000,
  spatiumMemoriae: 4000,
  memor: false,
  fasciculusMemoriae: ".augur-cache.json",
  conatus: 2,
} as const

export function exemplarPraedefinitum(oraculum: string): string {
  switch (oraculum) {
    case "anthropic":
      return "claude-haiku-4-5"
    case "openai":
      return "gpt-4o-mini"
    case "openrouter":
      return "openai/gpt-4o-mini"
    case "ollama":
      return "llama3.1"
    default:
      return "fake"
  }
}

export function extraheCaput(programma: Sententia[]): PartesConfigurationis {
  const caput: PartesConfigurationis = {}
  for (const s of programma) {
    if (s.genus !== "Praeceptum") continue
    if (s.clavis === "oracle") caput.oraculum = String(s.valor)
    else if (s.clavis === "model") caput.exemplar = String(s.valor)
    else if (s.clavis === "temperature") caput.temperatura = Number(s.valor)
    else if (s.clavis === "budget") caput.aerarium = Number(s.valor)
  }
  return caput
}

export function componeConfigurationem(
  caput: PartesConfigurationis,
  mandata: PartesConfigurationis,
): Configuratio {
  const oraculum = mandata.oraculum ?? caput.oraculum ?? CONFIGURATIO_PRAEDEFINITA.oraculum
  return {
    oraculum,
    exemplar: mandata.exemplar ?? caput.exemplar ?? exemplarPraedefinitum(oraculum),
    temperatura: mandata.temperatura ?? caput.temperatura ?? CONFIGURATIO_PRAEDEFINITA.temperatura,
    aerarium: mandata.aerarium ?? caput.aerarium ?? CONFIGURATIO_PRAEDEFINITA.aerarium,
    spatiumMemoriae: mandata.spatiumMemoriae ?? caput.spatiumMemoriae ?? CONFIGURATIO_PRAEDEFINITA.spatiumMemoriae,
    memor: mandata.memor ?? caput.memor ?? CONFIGURATIO_PRAEDEFINITA.memor,
    fasciculusMemoriae:
      mandata.fasciculusMemoriae ?? caput.fasciculusMemoriae ?? CONFIGURATIO_PRAEDEFINITA.fasciculusMemoriae,
    conatus: mandata.conatus ?? caput.conatus ?? CONFIGURATIO_PRAEDEFINITA.conatus,
  }
}
