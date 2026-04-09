import { existsSync, readFileSync, writeFileSync } from "node:fs"
import type { Oraculum, Responsum, Rogatio, ValorCrudus } from "./types"

export class OraculumMemor implements Oraculum {
  private readonly tabula = new Map<string, ValorCrudus>()

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
    const clavis = this.clavis(rogatio)
    const memoratum = this.tabula.get(clavis)
    if (memoratum !== undefined) return { ratum: true, valor: memoratum }

    const responsum = await this.interior.divina(rogatio)
    if (responsum.ratum) {
      this.tabula.set(clavis, responsum.valor)
      this.persiste()
    }
    return responsum
  }

  private clavis(r: Rogatio): string {
    return JSON.stringify([
      r.genusOperationis,
      r.operandi,
      r.instructio ?? null,
      r.genusExpectatum ?? null,
      r.contextus,
      r.temperatura,
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
