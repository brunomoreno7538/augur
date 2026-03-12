import type { Configuratio } from "../config"
import { OraculumAnthropicum } from "./anthropic"
import { Aerarium, Diarium } from "./budget"
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
  const interior = optiones.paranoicus ? new Diarium(fundamentum) : fundamentum
  const aerarium = new Aerarium(interior, config.aerarium)
  return { oraculum: aerarium, aerarium }
}

function creaFundamentum(config: Configuratio): Oraculum {
  switch (config.oraculum) {
    case "anthropic":
      return new OraculumAnthropicum(config.exemplar)
    case "openai":
      return new OraculumOpenAI(config.exemplar)
    case "ollama":
      return new OraculumOllama(config.exemplar)
    default:
      return new OraculumFictum()
  }
}
