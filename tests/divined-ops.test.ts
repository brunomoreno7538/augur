import { describe, expect, it } from "vitest"
import { ErratumAerarii } from "../src/errors"
import { Aestimator, type Scaena } from "../src/interpreter/interpreter"
import { Aerarium } from "../src/providers/budget"
import { OraculumFictum } from "../src/providers/fake"
import { analyza } from "../src/parser/parser"

function collector(): { scaena: Scaena; lineae: string[] } {
  const lineae: string[] = []
  return { lineae, scaena: { proclama: (l) => lineae.push(l), susurra: () => {} } }
}

describe("divined operators", () => {
  it("routes operators through the provider outside certain", async () => {
    const { scaena, lineae } = collector()
    const fictum = new OraculumFictum()
    await new Aestimator({ scaena, oraculum: fictum }).curre(analyza("proclaim 2 + 2"))
    expect(lineae).toEqual(["4"])
    expect(fictum.vocationes).toBeGreaterThanOrEqual(1)
  })

  it("runs operators natively inside certain without calling the provider", async () => {
    const { scaena, lineae } = collector()
    const fictum = new OraculumFictum()
    await new Aestimator({ scaena, oraculum: fictum }).curre(analyza("certain { proclaim 2 + 2 }"))
    expect(lineae).toEqual(["4"])
    expect(fictum.vocationes).toBe(0)
  })

  it("short-circuits logical operators without billing the provider", async () => {
    const { scaena, lineae } = collector()
    const fictum = new OraculumFictum()
    const aest = new Aestimator({ scaena, oraculum: fictum })
    await aest.curre(analyza("proclaim no and (2 + 2)\nproclaim yes or (2 + 2)"))
    expect(lineae).toEqual(["no", "yes"])
    expect(fictum.vocationes).toBe(0)
  })

  it("propagates an oracle operand without re-billing the operator", async () => {
    const { scaena, lineae } = collector()
    const fictum = new OraculumFictum({ defectus: () => true })
    await new Aestimator({ scaena, oraculum: fictum }).curre(analyza('proclaim (divine "x") + 1'))
    expect(lineae[0]).toContain("oracle")
    expect(fictum.vocationes).toBe(1)
  })
})

describe("divine primitive", () => {
  it("calls the provider for a bare divine", async () => {
    const { scaena, lineae } = collector()
    const fictum = new OraculumFictum({ responsa: { divine: "hi" } })
    await new Aestimator({ scaena, oraculum: fictum }).curre(analyza('proclaim divine "greet"'))
    expect(lineae).toEqual(["hi"])
  })

  it("passes the upon operand to the provider", async () => {
    const { scaena, lineae } = collector()
    const fictum = new OraculumFictum({ responsa: { divine: 42 } })
    await new Aestimator({ scaena, oraculum: fictum }).curre(analyza('proclaim divine "double" upon 21'))
    expect(lineae).toEqual(["42"])
    expect(fictum.ultimaRogatio?.operandi[0]?.praevisio).toBe("21")
    expect(fictum.ultimaRogatio?.instructio).toBe("double")
  })
})

describe("budget enforcement", () => {
  it("kills a divined repeat forever once the ceiling is hit", async () => {
    const { scaena } = collector()
    const aerarium = new Aerarium(new OraculumFictum(), 3)
    const aest = new Aestimator({ scaena, oraculum: aerarium })
    await expect(aest.curre(analyza("repeat forever { summon x = 1 + 1 }"))).rejects.toBeInstanceOf(
      ErratumAerarii,
    )
  })
})
