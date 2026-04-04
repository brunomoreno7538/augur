import { describe, expect, it } from "vitest"
import { Aestimator, type OptionesAestimatoris } from "../src/interpreter/interpreter"
import { OraculumFictum } from "../src/providers/fake"
import type { Oraculum, Rogatio } from "../src/providers/types"
import { analyza } from "../src/parser/parser"

async function curre(fons: string, optiones: OptionesAestimatoris): Promise<string[]> {
  const lineae: string[] = []
  await new Aestimator({ scaena: { proclama: (l) => lineae.push(l), susurra: () => {} }, ...optiones }).curre(
    analyza(fons),
  )
  return lineae
}

function oraculumCapiens(valor: string): { oraculum: Oraculum; ultima: () => Rogatio | null } {
  let ultima: Rogatio | null = null
  return {
    oraculum: {
      async divina(r) {
        ultima = r
        return { ratum: true, valor }
      },
    },
    ultima: () => ultima,
  }
}

describe("divined database", () => {
  it("feeds the journal of writes to the oracle on a query", async () => {
    const cap = oraculumCapiens("Ana")
    const fons = `
      commune with "vibes://localhost/loja"
      inscribe {nome: "Ana"} into clientes
      proclaim query "who is here?"
    `
    expect(await curre(fons, { oraculum: cap.oraculum })).toEqual(["Ana"])
    expect(cap.ultima()?.instructio).toContain("who is here?")
    expect(cap.ultima()?.operandi[0]?.praevisio).toContain("Ana")
  })

  it("forgets the oldest records when the context budget overflows", async () => {
    const cap = oraculumCapiens("ok")
    const fons = `
      commune with "vibes://x"
      inscribe {n: 1} into nums
      inscribe {n: 2} into nums
      inscribe {n: 3} into nums
      inscribe {n: 4} into nums
      inscribe {n: 5} into nums
      proclaim query "list them"
    `
    await curre(fons, { oraculum: cap.oraculum, spatiumMemoriae: 10 })
    const blob = cap.ultima()?.operandi[0]?.praevisio ?? ""
    expect(blob).not.toContain("{n: 1}")
    expect(blob).toContain("{n: 5}")
  })

  it("returns an oracle value when querying before commune", async () => {
    const out = await curre('proclaim query "anything"', { oraculum: new OraculumFictum() })
    expect(out[0]).toContain("oracle")
  })
})

describe("certain database (bun:sqlite)", () => {
  const sqliteAdest = typeof Bun !== "undefined"

  it.skipIf(!sqliteAdest)("persists rows in a real SQLite engine", async () => {
    const fons = `
      certain {
        commune with "sqlite://:memory:"
        inscribe {nome: "Ana", saldo: 100} into clientes
        inscribe {nome: "Beto", saldo: 50} into clientes
        proclaim count recall "all" from clientes
      }
    `
    expect(await curre(fons, { oraculum: new OraculumFictum() })).toEqual(["2"])
  })
})

describe("certain database (postgres)", () => {
  const pgUrl = process.env.AUGUR_PG_URL

  it.skipIf(!pgUrl)("persists rows in a real PostgreSQL engine", async () => {
    const tabula = `aug_pg_${Date.now()}`
    const fons = `
      certain {
        commune with "${pgUrl}"
        inscribe {nome: "Ana", saldo: 100} into ${tabula}
        inscribe {nome: "Beto", saldo: 50} into ${tabula}
        proclaim count recall "all" from ${tabula}
      }
    `
    expect(await curre(fons, { oraculum: new OraculumFictum() })).toEqual(["2"])
  })
})

describe("certain database (mysql)", () => {
  const mysqlUrl = process.env.AUGUR_MYSQL_URL

  it.skipIf(!mysqlUrl)("persists rows in a real MySQL engine", async () => {
    const tabula = `aug_mysql_${Date.now()}`
    const fons = `
      certain {
        commune with "${mysqlUrl}"
        inscribe {nome: "Ana", saldo: 100} into ${tabula}
        inscribe {nome: "Beto", saldo: 50} into ${tabula}
        proclaim count recall "all" from ${tabula}
      }
    `
    expect(await curre(fons, { oraculum: new OraculumFictum() })).toEqual(["2"])
  })
})
