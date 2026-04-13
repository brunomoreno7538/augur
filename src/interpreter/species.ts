import type { SpeciesExpectata } from "../parser/ast"
import { creaAgmen, creaNumerus, creaTabula, creaTextus, creaVeritas, estVerum, repraesenta, type Valor } from "./values"

export function speciesDescriptio(s: SpeciesExpectata): string {
  switch (s.genus) {
    case "primitiva":
      return s.nomen === "bool" ? "yes/no" : s.nomen
    case "agmen":
      return `[${speciesDescriptio(s.elementum)}]`
    case "tabula":
      return `{${s.campi.map((c) => `${c.clavis}: ${speciesDescriptio(c.species)}`).join(", ")}}`
  }
}

export function coerceNativa(v: Valor, s: SpeciesExpectata): Valor | null {
  switch (s.genus) {
    case "primitiva":
      return coercePrimitiva(v, s.nomen)
    case "agmen": {
      if (v.genus !== "agmen") return null
      const elementa: Valor[] = []
      for (const e of v.elementa) {
        const c = coerceNativa(e, s.elementum)
        if (c === null) return null
        elementa.push(c)
      }
      return creaAgmen(elementa)
    }
    case "tabula": {
      if (v.genus !== "tabula") return null
      const tabula = new Map<string, Valor>()
      for (const campus of s.campi) {
        const valor = v.tabula.get(campus.clavis)
        if (valor === undefined) return null
        const c = coerceNativa(valor, campus.species)
        if (c === null) return null
        tabula.set(campus.clavis, c)
      }
      return creaTabula(tabula)
    }
  }
}

function coercePrimitiva(v: Valor, nomen: string): Valor | null {
  switch (nomen) {
    case "any":
      return v
    case "text":
      return creaTextus(repraesenta(v))
    case "bool":
      return creaVeritas(estVerum(v))
    case "number":
      if (v.genus === "numerus") return v
      if (v.genus === "veritas") return creaNumerus(v.veritas ? 1 : 0)
      if (v.genus === "textus") {
        const n = Number(v.textus)
        if (v.textus.trim() !== "" && !Number.isNaN(n)) return creaNumerus(n)
      }
      return null
    case "list":
      return v.genus === "agmen" ? v : null
    case "map":
      return v.genus === "tabula" ? v : null
    default:
      return null
  }
}
