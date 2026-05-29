import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { ErratumExsecutionis } from "../src/errors"
import { Aestimator, type Scaena } from "../src/interpreter/interpreter"
import { analyza } from "../src/parser/parser"

async function curre(fons: string): Promise<string[]> {
  const lineae: string[] = []
  const scaena: Scaena = { proclama: (l) => lineae.push(l), susurra: () => {} }
  await new Aestimator({ scaena }).curre(analyza(fons))
  return lineae
}

describe("include", () => {
  it("brings another file's rituals and bindings into scope", async () => {
    const dir = mkdtempSync(join(tmpdir(), "aug-inc-"))
    const lib = join(dir, "lib.aug")
    writeFileSync(lib, 'ritual greet(n) { give "hi " + n }\nsummon answer = 42\n')
    const out = await curre(`include "${lib}"\nproclaim greet("bob")\nproclaim answer`)
    expect(out).toEqual(["hi bob", "42"])
  })

  it("includes the same file at most once", async () => {
    const dir = mkdtempSync(join(tmpdir(), "aug-inc2-"))
    const lib = join(dir, "lib.aug")
    writeFileSync(lib, 'proclaim "loaded"\n')
    const out = await curre(`include "${lib}"\ninclude "${lib}"\nproclaim "done"`)
    expect(out).toEqual(["loaded", "done"])
  })

  it("raises on a missing file", async () => {
    await expect(curre('include "/no/such/augur/file.aug"')).rejects.toBeInstanceOf(ErratumExsecutionis)
  })
})
