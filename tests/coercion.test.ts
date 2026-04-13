import { describe, expect, it } from "vitest"
import { Aestimator, type Scaena } from "../src/interpreter/interpreter"
import { OraculumFictum } from "../src/providers/fake"
import type { Oraculum } from "../src/providers/types"
import { analyza } from "../src/parser/parser"

async function curreCum(fons: string, oraculum: Oraculum): Promise<string[]> {
  const lineae: string[] = []
  const scaena: Scaena = { proclama: (l) => lineae.push(l), susurra: () => {} }
  await new Aestimator({ scaena, oraculum }).curre(analyza(fons))
  return lineae
}

describe("typed coercion (as)", () => {
  it("parses a coercion expression", () => {
    const s = analyza('proclaim divine "x" as number')
    expect(s[0]?.genus).toBe("Proclamatio")
  })

  it("coerces text to number natively without the provider", async () => {
    const fictum = new OraculumFictum()
    expect(await curreCum('summon t = "42"\nproclaim t as number', fictum)).toEqual(["42"])
    expect(fictum.vocationes).toBe(0)
  })

  it("coerces number to text and value to bool natively", async () => {
    const fictum = new OraculumFictum()
    expect(await curreCum("proclaim 42 as text", fictum)).toEqual(["42"])
    expect(await curreCum("proclaim 0 as bool", fictum)).toEqual(["no"])
    expect(await curreCum("proclaim 5 as bool", fictum)).toEqual(["yes"])
  })

  it("validates a structured map shape natively", async () => {
    const fictum = new OraculumFictum()
    const out = await curreCum('proclaim {name: "Ana", age: 30} as {name: text, age: number}', fictum)
    expect(out).toEqual(["{name: Ana, age: 30}"])
    expect(fictum.vocationes).toBe(0)
  })

  it("divines the conversion when native coercion fails", async () => {
    const oraculum: Oraculum = {
      async divina(r) {
        return r.genusOperationis === "coerce" ? { ratum: true, valor: 99 } : { ratum: true, valor: 0 }
      },
    }
    expect(await curreCum('proclaim "twelve dozen" as number', oraculum)).toEqual(["99"])
  })

  it("mints an oracle value on impossible coercion inside certain", async () => {
    const fictum = new OraculumFictum()
    const out = await curreCum('certain { proclaim "hello" as number }', fictum)
    expect(out[0]).toContain("oracle")
    expect(fictum.vocationes).toBe(0)
  })
})
