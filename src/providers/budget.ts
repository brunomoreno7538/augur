import { ErratumAerarii } from "../errors"
import type { Consumptio, Oraculum, Responsum, Rogatio } from "./types"

export class Aerarium implements Oraculum {
  private numerus = 0
  private readonly summa: Consumptio = { signaImmissa: 0, signaEmissa: 0 }

  constructor(
    private readonly interior: Oraculum,
    private readonly limen: number,
  ) {}

  get vocationes(): number {
    return this.numerus
  }

  get consumptio(): Consumptio {
    return { ...this.summa }
  }

  async divina(rogatio: Rogatio): Promise<Responsum> {
    if (this.numerus >= this.limen) throw new ErratumAerarii(this.limen)
    this.numerus++
    const responsum = await this.interior.divina(rogatio)
    if (responsum.consumptio) {
      this.summa.signaImmissa += responsum.consumptio.signaImmissa
      this.summa.signaEmissa += responsum.consumptio.signaEmissa
    }
    return responsum
  }
}

export class Diarium implements Oraculum {
  constructor(private readonly interior: Oraculum) {}

  async divina(rogatio: Rogatio): Promise<Responsum> {
    const operandi = rogatio.operandi.map((o) => o.praevisio).join(", ")
    const instructio = rogatio.instructio ? ` instr=${JSON.stringify(rogatio.instructio)}` : ""
    console.error(`[paranoid] divine ${rogatio.genusOperationis} (temp ${rogatio.temperatura}) [${operandi}]${instructio}`)
    const responsum = await this.interior.divina(rogatio)
    if (responsum.ratum) {
      const tok = responsum.consumptio
        ? ` (${responsum.consumptio.signaImmissa}+${responsum.consumptio.signaEmissa} tok)`
        : ""
      console.error(`[paranoid] -> ${JSON.stringify(responsum.valor)}${tok}`)
    } else {
      console.error(`[paranoid] -> oracle refused (${responsum.causa})`)
    }
    return responsum
  }
}
