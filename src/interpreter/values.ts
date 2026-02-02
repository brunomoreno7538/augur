import type { OperatorBinarius, OperatorUnarius, Sententia } from "../parser/ast"
import type { Ambitus } from "./environment"

export const CAUSAE_ORACULI = {
  RECUSATIO: "RECUSATIO",
  LECTIO_FALLAX: "LECTIO_FALLAX",
  ERROR_ORACULI: "ERROR_ORACULI",
  GENUS_DISCORS: "GENUS_DISCORS",
} as const

export type CausaOraculi = keyof typeof CAUSAE_ORACULI

export interface ValorNumerus {
  genus: "numerus"
  numerus: number
}

export interface ValorTextus {
  genus: "textus"
  textus: string
}

export interface ValorVeritas {
  genus: "veritas"
  veritas: boolean
}

export interface ValorAgmen {
  genus: "agmen"
  elementa: Valor[]
}

export interface ValorTabula {
  genus: "tabula"
  tabula: Map<string, Valor>
}

export interface ValorNihil {
  genus: "nihil"
}

export interface ValorOraculi {
  genus: "oraculum"
  causa: CausaOraculi
  nuntius?: string
}

export interface ValorRitus {
  genus: "ritus"
  nomen: string
  parametri: string[]
  corpus: Sententia[] | null
  clausura: Ambitus
  divinatus: boolean
}

export type Valor =
  | ValorNumerus
  | ValorTextus
  | ValorVeritas
  | ValorAgmen
  | ValorTabula
  | ValorNihil
  | ValorOraculi
  | ValorRitus

export const NIHIL: ValorNihil = { genus: "nihil" }

export function creaNumerus(n: number): ValorNumerus {
  return { genus: "numerus", numerus: n }
}

export function creaTextus(s: string): ValorTextus {
  return { genus: "textus", textus: s }
}

export function creaVeritas(b: boolean): ValorVeritas {
  return { genus: "veritas", veritas: b }
}

export function creaAgmen(elementa: Valor[]): ValorAgmen {
  return { genus: "agmen", elementa }
}

export function creaTabula(tabula: Map<string, Valor>): ValorTabula {
  return { genus: "tabula", tabula }
}

export function fingeOraculum(causa: CausaOraculi, nuntius?: string): ValorOraculi {
  return { genus: "oraculum", causa, nuntius }
}

export function estOraculum(v: Valor): v is ValorOraculi {
  return v.genus === "oraculum"
}

export function estVerum(v: Valor): boolean {
  switch (v.genus) {
    case "numerus":
      return v.numerus !== 0
    case "textus":
      return v.textus.length > 0
    case "veritas":
      return v.veritas
    case "agmen":
      return v.elementa.length > 0
    case "tabula":
      return v.tabula.size > 0
    case "ritus":
      return true
    case "nihil":
    case "oraculum":
      return false
  }
}

export function suntAequales(a: Valor, b: Valor): boolean {
  if (a.genus !== b.genus) return false
  switch (a.genus) {
    case "numerus":
      return a.numerus === (b as ValorNumerus).numerus
    case "textus":
      return a.textus === (b as ValorTextus).textus
    case "veritas":
      return a.veritas === (b as ValorVeritas).veritas
    case "nihil":
      return true
    case "agmen": {
      const o = b as ValorAgmen
      if (a.elementa.length !== o.elementa.length) return false
      return a.elementa.every((e, i) => suntAequales(e, o.elementa[i]!))
    }
    case "tabula": {
      const o = b as ValorTabula
      if (a.tabula.size !== o.tabula.size) return false
      for (const [k, v] of a.tabula) {
        const w = o.tabula.get(k)
        if (w === undefined || !suntAequales(v, w)) return false
      }
      return true
    }
    case "oraculum":
    case "ritus":
      return a === b
  }
}

export function praevisio(v: Valor): string {
  switch (v.genus) {
    case "numerus":
      return String(v.numerus)
    case "textus":
      return JSON.stringify(v.textus)
    case "veritas":
      return v.veritas ? "yes" : "no"
    case "nihil":
      return "naught"
    case "agmen":
      return `[${v.elementa.map(praevisio).join(", ")}]`
    case "tabula":
      return `{${[...v.tabula].map(([k, w]) => `${JSON.stringify(k)}: ${praevisio(w)}`).join(", ")}}`
    case "oraculum":
      return "<oracle>"
    case "ritus":
      return `<ritual ${v.nomen}>`
  }
}

export function repraesenta(v: Valor): string {
  switch (v.genus) {
    case "numerus":
      return String(v.numerus)
    case "textus":
      return v.textus
    case "veritas":
      return v.veritas ? "yes" : "no"
    case "nihil":
      return "naught"
    case "agmen":
      return `[${v.elementa.map(repraesenta).join(", ")}]`
    case "tabula":
      return `{${[...v.tabula].map(([k, w]) => `${k}: ${repraesenta(w)}`).join(", ")}}`
    case "oraculum":
      return v.nuntius ? `<oracle: ${v.nuntius}>` : "<oracle>"
    case "ritus":
      return `<ritual ${v.nomen}>`
  }
}

export function generaNomen(v: Valor): string {
  return v.genus
}

export function operatioBinariaNativa(op: OperatorBinarius, a: Valor, b: Valor): Valor {
  if (estOraculum(a)) return a
  if (estOraculum(b)) return b

  switch (op) {
    case "+":
      if (a.genus === "numerus" && b.genus === "numerus") return creaNumerus(a.numerus + b.numerus)
      if (a.genus === "textus" && b.genus === "textus") return creaTextus(a.textus + b.textus)
      return fingeOraculum("GENUS_DISCORS", `cannot add ${a.genus} and ${b.genus}`)
    case "-":
    case "*":
    case "/":
    case "%":
    case "^":
      return arithmetica(op, a, b)
    case "==":
      return creaVeritas(suntAequales(a, b))
    case "!=":
      return creaVeritas(!suntAequales(a, b))
    case "<":
    case ">":
    case "<=":
    case ">=":
      return relatio(op, a, b)
  }
}

function arithmetica(op: "-" | "*" | "/" | "%" | "^", a: Valor, b: Valor): Valor {
  if (a.genus !== "numerus" || b.genus !== "numerus") {
    return fingeOraculum("GENUS_DISCORS", `cannot apply '${op}' to ${a.genus} and ${b.genus}`)
  }
  switch (op) {
    case "-":
      return creaNumerus(a.numerus - b.numerus)
    case "*":
      return creaNumerus(a.numerus * b.numerus)
    case "/":
      if (b.numerus === 0) return fingeOraculum("GENUS_DISCORS", "division by zero")
      return creaNumerus(a.numerus / b.numerus)
    case "%":
      if (b.numerus === 0) return fingeOraculum("GENUS_DISCORS", "division by zero")
      return creaNumerus(a.numerus % b.numerus)
    case "^":
      return creaNumerus(a.numerus ** b.numerus)
  }
}

function relatio(op: "<" | ">" | "<=" | ">=", a: Valor, b: Valor): Valor {
  let comparatio: number
  if (a.genus === "numerus" && b.genus === "numerus") {
    comparatio = a.numerus - b.numerus
  } else if (a.genus === "textus" && b.genus === "textus") {
    comparatio = a.textus < b.textus ? -1 : a.textus > b.textus ? 1 : 0
  } else {
    return fingeOraculum("GENUS_DISCORS", `cannot compare ${a.genus} and ${b.genus}`)
  }
  switch (op) {
    case "<":
      return creaVeritas(comparatio < 0)
    case ">":
      return creaVeritas(comparatio > 0)
    case "<=":
      return creaVeritas(comparatio <= 0)
    case ">=":
      return creaVeritas(comparatio >= 0)
  }
}

export function operatioUnariaNativa(op: OperatorUnarius, a: Valor): Valor {
  if (estOraculum(a)) return a
  if (op === "-") {
    if (a.genus !== "numerus") return fingeOraculum("GENUS_DISCORS", `cannot negate ${a.genus}`)
    return creaNumerus(-a.numerus)
  }
  return creaVeritas(!estVerum(a))
}
