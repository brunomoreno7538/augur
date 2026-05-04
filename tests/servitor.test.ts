import { describe, expect, it } from "vitest"
import { analyza } from "../src/parser/parser"
import { construeResponsionem, tractaPetitionem, type Manipulator } from "../src/builtins/servitor"
import { creaNumerus, creaTabula, creaTextus, fingeOraculum, type Valor } from "../src/interpreter/values"

function tabula(entries: Record<string, Valor>): Valor {
  return creaTabula(new Map(Object.entries(entries)))
}

describe("serve parsing", () => {
  it("parses `serve <port> with <handler>`", () => {
    const s = analyza("serve 3000 with handle")
    expect(s[0]).toMatchObject({ genus: "Servitio" })
  })
})

describe("HTTP glue: response building", () => {
  it("returns text bodies with a text content-type", async () => {
    const manip: Manipulator = async () => tabula({ status: creaNumerus(200), body: creaTextus("ok") })
    const res = await tractaPetitionem(manip, new Request("http://x/"))
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/plain")
    expect(await res.text()).toBe("ok")
  })

  it("serializes map/list bodies as JSON", async () => {
    const manip: Manipulator = async () => tabula({ status: creaNumerus(201), body: tabula({ id: creaNumerus(7) }) })
    const res = await tractaPetitionem(manip, new Request("http://x/"))
    expect(res.status).toBe(201)
    expect(res.headers.get("content-type")).toContain("application/json")
    expect(await res.json()).toEqual({ id: 7 })
  })

  it("treats a bare value as a 200", () => {
    const res = construeResponsionem(creaTextus("hi"))
    expect(res.status).toBe(200)
  })

  it("maps an oracle result to a 500", async () => {
    const manip: Manipulator = async () => fingeOraculum("RECUSATIO", "nope")
    const res = await tractaPetitionem(manip, new Request("http://x/"))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "nope" })
  })

  it("turns a thrown handler error into a 500", async () => {
    const manip: Manipulator = async () => {
      throw new Error("boom")
    }
    const res = await tractaPetitionem(manip, new Request("http://x/"))
    expect(res.status).toBe(500)
  })
})

describe("HTTP glue: request parsing", () => {
  it("exposes method, path, query, and parsed json", async () => {
    const manip: Manipulator = async (req) => {
      if (req.genus !== "tabula") throw new Error("req must be a map")
      const query = req.tabula.get("query")
      const json = req.tabula.get("json")
      const name = query?.genus === "tabula" ? query.tabula.get("name") : undefined
      const n = json?.genus === "tabula" ? json.tabula.get("n") : undefined
      return tabula({
        status: creaNumerus(200),
        body: tabula({
          method: req.tabula.get("method") ?? creaTextus("?"),
          path: req.tabula.get("path") ?? creaTextus("?"),
          name: name ?? creaTextus("?"),
          n: n ?? creaNumerus(-1),
        }),
      })
    }
    const res = await tractaPetitionem(
      manip,
      new Request("http://x/items?name=Bruno", { method: "POST", body: '{"n": 5}' }),
    )
    expect(await res.json()).toEqual({ method: "POST", path: "/items", name: "Bruno", n: 5 })
  })
})
