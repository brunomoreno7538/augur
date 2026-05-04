import type { CausaOraculi } from "../interpreter/values"

export type ValorCrudus =
  | number
  | string
  | boolean
  | ValorCrudus[]
  | { [clavis: string]: ValorCrudus }

export interface Consumptio {
  signaImmissa: number
  signaEmissa: number
}

export interface SummariumOperandi {
  genus: string
  praevisio: string
}

export interface Rogatio {
  genusOperationis: string
  operandi: SummariumOperandi[]
  instructio?: string
  temperatura: number
  genusExpectatum?: string
  contextus: string[]
  sineMemoria?: boolean
  nonce?: number
}

export type Responsum =
  | { ratum: true; valor: ValorCrudus; consumptio?: Consumptio }
  | { ratum: false; causa: CausaOraculi; consumptio?: Consumptio }

export interface Oraculum {
  divina(rogatio: Rogatio): Promise<Responsum>
}
