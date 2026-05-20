import { describe, expect, it } from "vitest"
import { Aestimator, type Scaena } from "../src/interpreter/interpreter"
import { OraculumFictum } from "../src/providers/fake"
import type { Oraculum, Responsum, Rogatio } from "../src/providers/types"
import { analyza } from "../src/parser/parser"

function scaenaCapiens(): { scaena: Scaena; lineae: string[] } {
  const lineae: string[] = []
  return { lineae, scaena: { proclama: (l) => lineae.push(l), susurra: () => {} } }
}

async function curreCum(fons: string, oraculum: Oraculum): Promise<string[]> {
  const { scaena, lineae } = scaenaCapiens()
  await new Aestimator({ scaena, oraculum }).curre(analyza(fons))
  return lineae
}

function oraculumExpressum(fn: (r: Rogatio) => Responsum): { o: Oraculum; vocationes: () => number } {
  let n = 0
  return {
    o: {
      async divina(r) {
        n++
        return fn(r)
      },
    },
    vocationes: () => n,
  }
}

describe("native collection ops", () => {
  it("counts, sums, reverses and dedupes without the provider", async () => {
    const fictum = new OraculumFictum()
    expect(await curreCum("proclaim count [1, 2, 3]", fictum)).toEqual(["3"])
    expect(await curreCum("proclaim sum [1, 2, 3]", fictum)).toEqual(["6"])
    expect(await curreCum("proclaim reverse [1, 2, 3]", fictum)).toEqual(["[3, 2, 1]"])
    expect(await curreCum("proclaim unique [1, 1, 2, 3, 3]", fictum)).toEqual(["[1, 2, 3]"])
    expect(fictum.vocationes).toBe(0)
  })

  it("takes and skips natively (logical pagination)", async () => {
    const fictum = new OraculumFictum()
    expect(await curreCum("proclaim take 2 from [1, 2, 3, 4]", fictum)).toEqual(["[1, 2]"])
    expect(await curreCum("proclaim skip 2 from [1, 2, 3, 4]", fictum)).toEqual(["[3, 4]"])
    expect(await curreCum("proclaim take 2 from skip 1 from [10, 20, 30, 40, 50]", fictum)).toEqual(["[20, 30]"])
    expect(fictum.vocationes).toBe(0)
  })

  it("sorts and picks natively inside certain", async () => {
    const fictum = new OraculumFictum()
    expect(await curreCum("certain { proclaim sort [3, 1, 2] }", fictum)).toEqual(["[1, 2, 3]"])
    expect(await curreCum("certain { proclaim pick [9, 8, 7] }", fictum)).toEqual(["9"])
    expect(fictum.vocationes).toBe(0)
  })
})

describe("divined collection ops", () => {
  it("maps each element through the provider once, in order", async () => {
    const { o, vocationes } = oraculumExpressum((r) => ({
      ratum: true,
      valor: Number(r.operandi[0]?.praevisio) * 2,
    }))
    expect(await curreCum('proclaim map [1, 2, 3] with "double"', o)).toEqual(["[2, 4, 6]"])
    expect(vocationes()).toBe(3)
  })

  it("filters element by element", async () => {
    const { o } = oraculumExpressum((r) => ({
      ratum: true,
      valor: Number(r.operandi[0]?.praevisio) % 2 === 0,
    }))
    expect(await curreCum('proclaim filter [1, 2, 3, 4] by "even"', o)).toEqual(["[2, 4]"])
  })

  it("classifies elements into labelled buckets", async () => {
    const { o } = oraculumExpressum((r) => ({
      ratum: true,
      valor: Number(r.operandi[0]?.praevisio) > 0 ? "pos" : "nonpos",
    }))
    const out = await curreCum('proclaim classify [-1, 2, -3] into ["pos", "nonpos"]', o)
    expect(out).toEqual(["{pos: [2], nonpos: [-1, -3]}"])
  })

  it("extracts via the provider", async () => {
    const { o } = oraculumExpressum(() => ({ ratum: true, valor: "found" }))
    expect(await curreCum('proclaim extract "emails" from "blah"', o)).toEqual(["found"])
  })

  it("refuses semantic filter inside certain", async () => {
    const fictum = new OraculumFictum()
    const out = await curreCum('certain { proclaim filter [1, 2] by "x" }', fictum)
    expect(out[0]).toContain("oracle")
    expect(fictum.vocationes).toBe(0)
  })
})

describe("divined rituals", () => {
  it("divines a bodyless ritual from its name and args", async () => {
    const { o } = oraculumExpressum((r) =>
      r.genusOperationis === "ritual:guess"
        ? { ratum: true, valor: Number(r.operandi[0]?.praevisio) * 2 }
        : { ratum: true, valor: 0 },
    )
    const fons = `
      ritual guess(n) divined
      proclaim guess(21)
    `
    expect(await curreCum(fons, o)).toEqual(["42"])
  })

  it("binds an oracle argument without poisoning the call", async () => {
    const fictum = new OraculumFictum({ defectus: (r) => r.genusOperationis === "divine" })
    const fons = `
      ritual handle(x) {
        attempt { believe x } rescue { give "caught" }
        give "ok"
      }
      proclaim handle(divine "fail")
    `
    expect(await curreCum(fons, fictum)).toEqual(["caught"])
  })
})
