import { describe, expect, it } from "vitest"
import { Aestimator, type Scaena } from "../src/interpreter/interpreter"
import type { Oraculum, ValorCrudus } from "../src/providers/types"
import { analyza } from "../src/parser/parser"

async function curreCum(fons: string, oraculum: Oraculum): Promise<string[]> {
  const lineae: string[] = []
  const scaena: Scaena = { proclama: (l) => lineae.push(l), susurra: () => {} }
  await new Aestimator({ scaena, oraculum }).curre(analyza(fons))
  return lineae
}

function oraculumSequens(valores: ValorCrudus[]): { o: Oraculum; vocationes: () => number } {
  let i = 0
  return {
    o: {
      async divina() {
        const valor = valores[i] ?? valores[valores.length - 1] ?? null
        i += 1
        return valor === null ? { ratum: false, causa: "RECUSATIO" } : { ratum: true, valor }
      },
    },
    vocationes: () => i,
  }
}

describe("thrice (self-consistency)", () => {
  it("runs three times and returns the majority answer", async () => {
    const { o, vocationes } = oraculumSequens(["cat", "cat", "dog"])
    expect(await curreCum('proclaim divine "an animal" thrice', o)).toEqual(["cat"])
    expect(vocationes()).toBe(3)
  })

  it("composes with typed coercion", async () => {
    const { o } = oraculumSequens([7, 7, 8])
    expect(await curreCum('proclaim divine "a number" thrice as number', o)).toEqual(["7"])
  })

  it("returns an oracle value when every vote refuses", async () => {
    const refuser: Oraculum = { async divina() {
      return { ratum: false, causa: "RECUSATIO" }
    } }
    const out = await curreCum('proclaim divine "x" thrice', refuser)
    expect(out[0]).toContain("oracle")
  })
})
