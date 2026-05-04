import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { ErratumAerarii } from "../src/errors"
import { Aestimator, type Scaena } from "../src/interpreter/interpreter"
import { Aerarium, OraculumIterans } from "../src/providers/budget"
import { OraculumMemor } from "../src/providers/cache"
import { OraculumFictum } from "../src/providers/fake"
import type { Oraculum, Rogatio, ValorCrudus } from "../src/providers/types"
import { analyza } from "../src/parser/parser"

async function curreCum(fons: string, oraculum: Oraculum): Promise<string[]> {
  const lineae: string[] = []
  const scaena: Scaena = { proclama: (l) => lineae.push(l), susurra: () => {} }
  await new Aestimator({ scaena, oraculum }).curre(analyza(fons))
  return lineae
}

const mora = (ms: number) => new Promise((r) => setTimeout(r, ms))
const rog: Rogatio = { genusOperationis: "+", operandi: [], temperatura: 0, contextus: [] }

describe("gather isolates zone + context across concurrent branches", () => {
  it("does not leak a chaos zone's temperature into a sibling branch", async () => {
    const temperaturae: Record<string, number> = {}
    const oraculum: Oraculum = {
      async divina(r) {
        const k = r.instructio ?? ""
        if (k === "hot") await mora(20)
        temperaturae[k] = r.temperatura
        return { ratum: true, valor: k }
      },
    }
    const fons = `
      ritual hot() { chaos 1.2 { give divine "hot" } }
      proclaim gather [ hot(), divine "cold" ]
    `
    await curreCum(fons, oraculum)
    expect(temperaturae.hot).toBe(1.2)
    expect(temperaturae.cold).toBe(0.7)
  })
})

describe("coerce tolerates a null divination result", () => {
  it("turns a null oracle value into naught instead of crashing", async () => {
    const oraculum: Oraculum = { async divina() {
      return { ratum: true, valor: null as unknown as ValorCrudus }
    } }
    expect(await curreCum('proclaim divine "x"', oraculum)).toEqual(["naught"])
  })
})

describe("divined comparisons normalize to a real boolean", () => {
  it("treats a string 'no' result as falsey", async () => {
    const oraculum: Oraculum = { async divina() {
      return { ratum: true, valor: "no" }
    } }
    expect(await curreCum("proclaim 2 < 3", oraculum)).toEqual(["no"])
    expect(await curreCum('when 2 < 3 -> proclaim "t" otherwise -> proclaim "f"', oraculum)).toEqual(["f"])
  })
})

describe("divine upon ... as ... coerces the result, not the operand", () => {
  it("parses as Coercion(Divination(upon y), type)", () => {
    const s = analyza('proclaim divine "x" upon y as number')
    const sentence = s[0]!
    if (sentence.genus !== "Proclamatio") throw new Error("unreachable")
    const e = sentence.expressio
    expect(e.genus).toBe("Coercio")
    if (e.genus !== "Coercio") throw new Error("unreachable")
    expect(e.subiectum.genus).toBe("Divinatio")
    if (e.subiectum.genus !== "Divinatio") throw new Error("unreachable")
    expect(e.subiectum.supra?.genus).toBe("Nomen")
  })
})

describe("retry does not swallow a budget error", () => {
  it("propagates ErratumAerarii instead of retrying past the ceiling", async () => {
    const aerarium = new Aerarium(new OraculumFictum(), 0)
    await expect(new OraculumIterans(aerarium, 3).divina(rog)).rejects.toBeInstanceOf(ErratumAerarii)
  })
})

describe("read/write tolerate an oracle operand", () => {
  it("propagates an oracle filename instead of crashing read", async () => {
    const fail: Oraculum = { async divina() {
      return { ratum: false, causa: "RECUSATIO" }
    } }
    const out = await curreCum('summon f = divine "x"\nproclaim read f', fail)
    expect(out[0]).toContain("oracle")
  })
})

describe("repeat uses an integer count", () => {
  it("floors a non-integer repeat count", async () => {
    const out = await curreCum("certain { summon n = 0  repeat 2.9 { n = n + 1 }  proclaim n }", new OraculumFictum())
    expect(out).toEqual(["2"])
  })
})

describe("cache collapses concurrent identical requests", () => {
  it("calls the interior once for duplicate in-flight keys", async () => {
    let n = 0
    const interior: Oraculum = {
      async divina() {
        n += 1
        await mora(10)
        return { ratum: true, valor: n }
      },
    }
    const file = join(mkdtempSync(join(tmpdir(), "aug-dd-")), "c.json")
    const memor = new OraculumMemor(interior, file)
    const [a, b, c] = await Promise.all([memor.divina(rog), memor.divina(rog), memor.divina(rog)])
    expect(n).toBe(1)
    expect(a).toEqual(b)
    expect(b).toEqual(c)
  })
})

describe("cache honours sineMemoria for independent samples", () => {
  it("does not memoize a request marked sineMemoria", async () => {
    let n = 0
    const interior: Oraculum = {
      async divina() {
        n += 1
        return { ratum: true, valor: n }
      },
    }
    const file = join(mkdtempSync(join(tmpdir(), "aug-sm-")), "c.json")
    const memor = new OraculumMemor(interior, file)
    await memor.divina({ ...rog, sineMemoria: true })
    await memor.divina({ ...rog, sineMemoria: true })
    expect(n).toBe(2)
  })
})
