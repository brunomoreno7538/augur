import { describe, expect, it } from "vitest"
import { OraculumIterans } from "../src/providers/budget"
import type { Oraculum, Rogatio } from "../src/providers/types"

const rog: Rogatio = { genusOperationis: "+", operandi: [], temperatura: 0, contextus: [] }

describe("OraculumIterans", () => {
  it("retries a transient error then succeeds", async () => {
    let n = 0
    const flaky: Oraculum = {
      async divina() {
        n += 1
        return n < 3 ? { ratum: false, causa: "ERROR_ORACULI" } : { ratum: true, valor: 42 }
      },
    }
    expect(await new OraculumIterans(flaky, 3).divina(rog)).toEqual({ ratum: true, valor: 42 })
    expect(n).toBe(3)
  })

  it("does not retry a genuine refusal", async () => {
    let n = 0
    const refuser: Oraculum = {
      async divina() {
        n += 1
        return { ratum: false, causa: "RECUSATIO" }
      },
    }
    expect(await new OraculumIterans(refuser, 3).divina(rog)).toEqual({ ratum: false, causa: "RECUSATIO" })
    expect(n).toBe(1)
  })

  it("gives up after exhausting retries", async () => {
    let n = 0
    const dead: Oraculum = {
      async divina() {
        n += 1
        return { ratum: false, causa: "ERROR_ORACULI" }
      },
    }
    const responsum = await new OraculumIterans(dead, 2).divina(rog)
    expect(responsum.ratum).toBe(false)
    expect(n).toBe(3)
  })
})
