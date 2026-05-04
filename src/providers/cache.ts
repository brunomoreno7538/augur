import { existsSync, readFileSync, writeFileSync } from "node:fs"
import type { Oraculum, Responsum, Rogatio, ValorCrudus } from "./types"

export class OraculumMemor implements Oraculum {
  private readonly tabula = new Map<string, ValorCrudus>()
  private readonly pendentia = new Map<string, Promise<Responsum>>()

  constructor(
    private readonly interior: Oraculum,
    private readonly fasciculus: string,
  ) {
    if (existsSync(fasciculus)) {
      try {
        const datum = JSON.parse(readFileSync(fasciculus, "utf8")) as Record<string, ValorCrudus>
        for (const [clavis, valor] of Object.entries(datum)) this.tabula.set(clavis, valor)
      } catch {
        // a corrupt cache is treated as empty
      }
    }
  }

  async divina(rogatio: Rogatio): Promise<Responsum> {
    if (rogatio.sineMemoria) return await this.interior.divina(rogatio)
    const clavis = this.clavis(rogatio)
    const memoratum = this.tabula.get(clavis)
    if (memoratum !== undefined) return { ratum: true, valor: memoratum }

    const pendens = this.pendentia.get(clavis)
    if (pendens) return await pendens

    const promissum = this.interior.divina(rogatio)
    this.pendentia.set(clavis, promissum)
    try {
      const responsum = await promissum
      if (responsum.ratum) {
        this.tabula.set(clavis, responsum.valor)
        this.persiste()
      }
      return responsum
    } finally {
      this.pendentia.delete(clavis)
    }
  }

  private clavis(r: Rogatio): string {
    return JSON.stringify([
      r.genusOperationis,
      r.operandi,
      r.instructio ?? null,
      r.genusExpectatum ?? null,
      r.contextus,
      r.temperatura,
      r.nonce ?? null,
    ])
  }

  private persiste(): void {
    try {
      writeFileSync(this.fasciculus, JSON.stringify(Object.fromEntries(this.tabula), null, 2))
    } catch {
      // persistence is best-effort; an unwritable cache must not crash a run
    }
  }
}
