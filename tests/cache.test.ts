import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { OraculumMemor } from "../src/providers/cache"
import type { Oraculum, Rogatio } from "../src/providers/types"

function rog(op = "+"): Rogatio {
  return { genusOperationis: op, operandi: [{ genus: "numerus", praevisio: "2" }], temperatura: 0, contextus: [] }
}

function tempFile(): string {
  return join(mkdtempSync(join(tmpdir(), "aug-cache-")), "c.json")
}

describe("OraculumMemor", () => {
  it("memoizes a successful divination", async () => {
    let n = 0
    const interior: Oraculum = {
      async divina() {
        n += 1
        return { ratum: true, valor: n }
      },
    }
    const memor = new OraculumMemor(interior, tempFile())
    expect(await memor.divina(rog())).toEqual({ ratum: true, valor: 1 })
    expect(await memor.divina(rog())).toEqual({ ratum: true, valor: 1 })
    expect(n).toBe(1)
  })

  it("persists across instances via the cache file", async () => {
    const file = tempFile()
    const interior: Oraculum = { async divina() {
      return { ratum: true, valor: 7 }
    } }
    await new OraculumMemor(interior, file).divina(rog())

    const explosivum: Oraculum = { async divina() {
      throw new Error("interior must not be called on a cache hit")
    } }
    expect(await new OraculumMemor(explosivum, file).divina(rog())).toEqual({ ratum: true, valor: 7 })
  })

  it("does not cache failures", async () => {
    let n = 0
    const flaky: Oraculum = {
      async divina() {
        n += 1
        return { ratum: false, causa: "ERROR_ORACULI" }
      },
    }
    const memor = new OraculumMemor(flaky, tempFile())
    await memor.divina(rog())
    await memor.divina(rog())
    expect(n).toBe(2)
  })
})
