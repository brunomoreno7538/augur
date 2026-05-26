import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { ErratumGrammaticae } from "../src/errors"
import { analyza } from "../src/parser/parser"
import type { Expressio, Sententia } from "../src/parser/ast"

function unaSententia(fons: string): Sententia {
  const s = analyza(fons)
  expect(s).toHaveLength(1)
  return s[0]!
}

function unaExpressio(fons: string): Expressio {
  const s = unaSententia(`proclaim ${fons}`)
  expect(s.genus).toBe("Proclamatio")
  if (s.genus !== "Proclamatio") throw new Error("unreachable")
  return s.expressio
}

describe("example programs parse", () => {
  for (const nomen of ["guess", "semantic_etl", "http_mock", "amnesiac_db", "triage", "crud_api", "crud_llm"]) {
    it(`parses examples/${nomen}.aug`, () => {
      const fons = readFileSync(`examples/${nomen}.aug`, "utf8")
      expect(() => analyza(fons)).not.toThrow()
      expect(analyza(fons).length).toBeGreaterThan(0)
    })
  }
})

describe("statements", () => {
  it("parses a summon declaration", () => {
    const s = unaSententia("summon x = 42")
    expect(s).toMatchObject({ genus: "DeclaratioVar", nomen: "x" })
  })

  it("parses reassignment vs expression statement", () => {
    expect(unaSententia("x = 1").genus).toBe("Reassignatio")
    expect(unaSententia("main()").genus).toBe("SententiaExpressionis")
  })

  it("parses a ritual with a body", () => {
    const s = unaSententia("ritual add(a, b) { give a + b }")
    expect(s).toMatchObject({ genus: "DefinitioRitus", nomen: "add", parametri: ["a", "b"] })
    if (s.genus === "DefinitioRitus") expect(s.corpus).not.toBeNull()
  })

  it("parses a divined ritual without a body", () => {
    const s = unaSententia("ritual guess(n) divined")
    expect(s).toMatchObject({ genus: "DefinitioRitus", corpus: null })
  })

  it("parses a when/otherwise chain into one Conditio", () => {
    const s = unaSententia("when a -> proclaim 1 when b -> proclaim 2 otherwise -> proclaim 3")
    expect(s.genus).toBe("Conditio")
    if (s.genus !== "Conditio") throw new Error("unreachable")
    expect(s.rami).toHaveLength(2)
    expect(s.aliter).toBeDefined()
  })

  it("parses certain and chaos zone blocks", () => {
    expect(unaSententia("certain { 2 + 2 }")).toMatchObject({ genus: "BlocusZonae", zonaGenus: "Certus" })
    expect(unaSententia("chaos 0.7 { 2 + 2 }")).toMatchObject({
      genus: "BlocusZonae",
      zonaGenus: "Chaos",
      temperatura: 0.7,
    })
  })

  it("parses attempt/rescue with binding", () => {
    const s = unaSententia("attempt { believe no } rescue as e { proclaim e }")
    expect(s).toMatchObject({ genus: "Conatus", nomenErroris: "e" })
  })

  it("parses config header statements", () => {
    expect(unaSententia('oracle "ollama"')).toMatchObject({ genus: "Praeceptum", clavis: "oracle", valor: "ollama" })
    expect(unaSententia("budget 1000")).toMatchObject({ genus: "Praeceptum", clavis: "budget", valor: 1000 })
  })

  it("parses the db statements", () => {
    expect(unaSententia('commune with "vibes://x"').genus).toBe("Communio")
    expect(unaSententia("inscribe {a: 1} into xs").genus).toBe("Inscriptio")
    expect(unaSententia('revise y with "do it"').genus).toBe("Recensio")
    expect(unaSententia('banish "old ones" from xs').genus).toBe("Expulsio")
    expect(unaSententia("banish req[\"query\"][\"q\"] from xs").genus).toBe("Expulsio")
  })
})

describe("expressions and precedence", () => {
  it("gives multiplication higher precedence than addition", () => {
    const e = unaExpressio("2 + 3 * 4")
    expect(e.genus).toBe("ExpressioBinaria")
    if (e.genus !== "ExpressioBinaria") throw new Error("unreachable")
    expect(e.operator).toBe("+")
    expect(e.dextra.genus).toBe("ExpressioBinaria")
  })

  it("parses power as right-associative", () => {
    const e = unaExpressio("2 ^ 3 ^ 2")
    expect(e).toMatchObject({ genus: "ExpressioBinaria", operator: "^" })
    if (e.genus !== "ExpressioBinaria") throw new Error("unreachable")
    expect(e.dextra).toMatchObject({ genus: "ExpressioBinaria", operator: "^" })
  })

  it("parses logical operators as distinct nodes", () => {
    expect(unaExpressio("a and b").genus).toBe("ExpressioLogica")
    expect(unaExpressio("not a").genus).toBe("ExpressioUnaria")
  })

  it("distinguishes a map literal from the map operator", () => {
    expect(unaExpressio('{a: 1, "b": 2}').genus).toBe("LitteraTabulae")
    expect(unaExpressio('map xs with "upper"').genus).toBe("OperatioCollectionis")
  })

  it("parses divine with upon", () => {
    const e = unaExpressio('divine "guess" upon x')
    expect(e).toMatchObject({ genus: "Divinatio", instructio: "guess" })
    if (e.genus === "Divinatio") expect(e.supra).toBeDefined()
  })

  it("parses calls and indexing", () => {
    expect(unaExpressio("f(1)(2)").genus).toBe("Vocatio")
    expect(unaExpressio("xs[0]").genus).toBe("Indicium")
  })
})

describe("context notes", () => {
  it("attaches a /// note to the following statement", () => {
    const s = unaSententia("/// be precise\nsummon x = 2 + 2")
    expect(s.contextus).toEqual(["be precise"])
  })
})

describe("errors", () => {
  it("throws ErratumGrammaticae on a missing brace", () => {
    expect(() => analyza("certain { 2 + 2")).toThrow(ErratumGrammaticae)
  })
})
