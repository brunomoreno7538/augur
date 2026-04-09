import type { Configuratio } from "../config"
import { OraculumAnthropicum } from "./anthropic"
import { Aerarium, Diarium, OraculumIterans } from "./budget"
import { OraculumMemor } from "./cache"
import { OraculumFictum } from "./fake"
import { OraculumOllama } from "./ollama"
import { OraculumOpenAI } from "./openai"
import type { Oraculum } from "./types"

export interface OptionesCreandi {
  paranoicus?: boolean
}

export function creaOraculum(
  config: Configuratio,
  optiones: OptionesCreandi = {},
): { oraculum: Oraculum; aerarium: Aerarium } {
  const fundamentum = creaFundamentum(config)
  const iterans = config.conatus > 0 ? new OraculumIterans(fundamentum, config.conatus) : fundamentum
  const interior = optiones.paranoicus ? new Diarium(iterans) : iterans
  const aerarium = new Aerarium(interior, config.aerarium)
  const oraculum = config.memor ? new OraculumMemor(aerarium, config.fasciculusMemoriae) : aerarium
  return { oraculum, aerarium }
}

function creaFundamentum(config: Configuratio): Oraculum {
  switch (config.oraculum) {
    case "anthropic":
      return new OraculumAnthropicum(config.exemplar)
    case "openai":
      return new OraculumOpenAI(config.exemplar)
    case "openrouter":
      return new OraculumOpenAI(config.exemplar, 1024, {
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
      })
    case "ollama":
      return new OraculumOllama(config.exemplar)
    default:
      return new OraculumFictum()
  }
}
