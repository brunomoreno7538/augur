import { describe, expect, it } from "vitest"
import { ErratumOraculi } from "../src/errors"
import { Aestimator, type Scaena } from "../src/interpreter/interpreter"
import { analyza } from "../src/parser/parser"

async function curre(fons: string): Promise<string[]> {
  const lineae: string[] = []
  const scaena: Scaena = { proclama: (l) => lineae.push(l), susurra: () => {} }
  await new Aestimator({ scaena }).curre(analyza(fons))
  return lineae
}

describe("arithmetic and operators", () => {
  it("respects precedence", async () => {
    expect(await curre("proclaim 2 + 3 * 4")).toEqual(["14"])
  })

  it("treats power as right-associative", async () => {
    expect(await curre("proclaim 2 ^ 3 ^ 2")).toEqual(["512"])
  })

  it("concatenates strings with +", async () => {
    expect(await curre('proclaim "a" + "b"')).toEqual(["ab"])
  })

  it("negates and applies not", async () => {
    expect(await curre("proclaim -5")).toEqual(["-5"])
    expect(await curre("proclaim not no")).toEqual(["yes"])
  })
})

describe("control flow", () => {
  it("evaluates recursive fibonacci", async () => {
    const fons = `
      ritual fib(n) {
        when n < 2 -> give n
        give fib(n - 1) + fib(n - 2)
      }
      proclaim fib(10)
    `
    expect(await curre(fons)).toEqual(["55"])
  })

  it("runs a while loop", async () => {
    const fons = `
      summon i = 0
      summon s = 0
      while i < 5 { s = s + i  i = i + 1 }
      proclaim s
    `
    expect(await curre(fons)).toEqual(["10"])
  })

  it("breaks out of repeat forever", async () => {
    const fons = `
      summon n = 0
      repeat forever { n = n + 1  when n == 3 -> break }
      proclaim n
    `
    expect(await curre(fons)).toEqual(["3"])
  })

  it("continues inside a loop", async () => {
    const fons = `
      summon s = 0
      summon i = 0
      while i < 5 {
        i = i + 1
        when i == 3 -> continue
        s = s + i
      }
      proclaim s
    `
    expect(await curre(fons)).toEqual(["12"])
  })

  it("iterates over a list", async () => {
    const fons = `
      summon t = 0
      for x in [1, 2, 3, 4] { t = t + x }
      proclaim t
    `
    expect(await curre(fons)).toEqual(["10"])
  })

  it("iterates over map keys in insertion order", async () => {
    const fons = `
      summon m = {a: 1, b: 2, c: 3}
      summon ks = ""
      for k in m { ks = ks + k }
      proclaim ks
    `
    expect(await curre(fons)).toEqual(["abc"])
  })

  it("chains when/otherwise", async () => {
    const fons = `
      summon x = 5
      when x > 10 -> proclaim "big"
      when x > 3 -> proclaim "mid"
      otherwise -> proclaim "small"
    `
    expect(await curre(fons)).toEqual(["mid"])
  })

  it("short-circuits logical operators", async () => {
    expect(await curre("proclaim no and naught")).toEqual(["no"])
    expect(await curre("proclaim yes or naught")).toEqual(["yes"])
    expect(await curre("proclaim yes and 5")).toEqual(["5"])
  })
})

describe("zones (native baseline)", () => {
  it("runs a certain block natively", async () => {
    expect(await curre("certain { proclaim 2 + 2 }")).toEqual(["4"])
  })
})

describe("believe and attempt", () => {
  it("passes a true belief", async () => {
    expect(await curre("believe yes\nproclaim 1")).toEqual(["1"])
  })

  it("throws ErratumOraculi on a false belief", async () => {
    await expect(curre("believe no")).rejects.toBeInstanceOf(ErratumOraculi)
  })

  it("rescues a false belief and binds the error", async () => {
    const out = await curre('attempt { believe no because "nope" } rescue as e { proclaim e }')
    expect(out[0]).toContain("The oracle disagrees")
  })

  it("lets give escape an attempt back to the ritual", async () => {
    const fons = `
      ritual f() { attempt { give 7 } rescue { give 0 } }
      proclaim f()
    `
    expect(await curre(fons)).toEqual(["7"])
  })
})

describe("type mismatch", () => {
  it("mints an oracle value instead of NaN on bad arithmetic", async () => {
    const out = await curre('certain { proclaim 5 * "peixe" }')
    expect(out[0]).toContain("oracle")
  })
})
