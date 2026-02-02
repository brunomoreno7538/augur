import { ErratumExsecutionis } from "../errors"
import type { Valor } from "./values"

export class Ambitus {
  private readonly vincula = new Map<string, Valor>()

  constructor(private readonly parens: Ambitus | null = null) {}

  declara(nomen: string, valor: Valor): void {
    this.vincula.set(nomen, valor)
  }

  muta(nomen: string, valor: Valor): void {
    let scopus: Ambitus | null = this
    while (scopus !== null) {
      if (scopus.vincula.has(nomen)) {
        scopus.vincula.set(nomen, valor)
        return
      }
      scopus = scopus.parens
    }
    throw new ErratumExsecutionis(`assignment to undefined variable '${nomen}'`)
  }

  accipe(nomen: string): Valor {
    let scopus: Ambitus | null = this
    while (scopus !== null) {
      const valor = scopus.vincula.get(nomen)
      if (valor !== undefined) return valor
      scopus = scopus.parens
    }
    throw new ErratumExsecutionis(`undefined variable '${nomen}'`)
  }

  habet(nomen: string): boolean {
    let scopus: Ambitus | null = this
    while (scopus !== null) {
      if (scopus.vincula.has(nomen)) return true
      scopus = scopus.parens
    }
    return false
  }

  oblivisce(nomen: string): void {
    let scopus: Ambitus | null = this
    while (scopus !== null) {
      if (scopus.vincula.has(nomen)) {
        scopus.vincula.delete(nomen)
        return
      }
      scopus = scopus.parens
    }
    throw new ErratumExsecutionis(`cannot forget undefined variable '${nomen}'`)
  }

  filius(): Ambitus {
    return new Ambitus(this)
  }
}
