import {
  creaAgmen,
  creaNumerus,
  creaTabula,
  creaTextus,
  creaVeritas,
  NIHIL,
  type Valor,
} from "../interpreter/values"

export interface OrdoCollectionis {
  collectio: string
  ordines: unknown[]
}

export interface MotorBasis {
  praeparaCollectionem(collectio: string): Promise<void>
  insere(collectio: string, datum: unknown): Promise<void>
  lege(collectio: string): Promise<unknown[]>
  legeOmnia(collectiones: Iterable<string>): Promise<OrdoCollectionis[]>
}

class MotorSqlite implements MotorBasis {
  private database: import("bun:sqlite").Database | null = null

  constructor(private readonly semita: string) {}

  private async db(): Promise<import("bun:sqlite").Database> {
    if (this.database === null) {
      const { Database } = await import("bun:sqlite")
      this.database = new Database(this.semita === "" ? ":memory:" : this.semita)
    }
    return this.database
  }

  async praeparaCollectionem(collectio: string): Promise<void> {
    const db = await this.db()
    db.run(`CREATE TABLE IF NOT EXISTS "${collectio}" (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT)`)
  }

  async insere(collectio: string, datum: unknown): Promise<void> {
    await this.praeparaCollectionem(collectio)
    const db = await this.db()
    db.run(`INSERT INTO "${collectio}" (data) VALUES (?)`, [JSON.stringify(datum)])
  }

  async lege(collectio: string): Promise<unknown[]> {
    await this.praeparaCollectionem(collectio)
    const db = await this.db()
    const ordines = db.query(`SELECT data FROM "${collectio}"`).all() as { data: string }[]
    return ordines.map((o) => JSON.parse(o.data) as unknown)
  }

  async legeOmnia(collectiones: Iterable<string>): Promise<OrdoCollectionis[]> {
    const omnia: OrdoCollectionis[] = []
    for (const collectio of collectiones) {
      omnia.push({ collectio, ordines: await this.lege(collectio) })
    }
    return omnia
  }
}

class MotorSql implements MotorBasis {
  private cliens: import("bun").SQL | null = null

  constructor(
    private readonly url: string,
    private readonly genus: "postgres" | "mysql",
  ) {}

  private async sql(): Promise<import("bun").SQL> {
    if (this.cliens === null) {
      const { SQL } = await import("bun")
      this.cliens = new SQL(this.url)
    }
    return this.cliens
  }

  private tabulaTuta(collectio: string): string {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(collectio)) {
      throw new Error(`unsafe collection name "${collectio}"`)
    }
    if (this.genus === "mysql") return `\`${collectio}\``
    return `"${collectio}"`
  }

  private columnaJson(): string {
    return this.genus === "mysql"
      ? "id BIGINT AUTO_INCREMENT PRIMARY KEY, data JSON"
      : "id BIGSERIAL PRIMARY KEY, data JSONB"
  }

  private locusPositionalis(index: number): string {
    return this.genus === "mysql" ? "?" : `$${index}`
  }

  async praeparaCollectionem(collectio: string): Promise<void> {
    const cliens = await this.sql()
    const nomen = this.tabulaTuta(collectio)
    await cliens.unsafe(`CREATE TABLE IF NOT EXISTS ${nomen} (${this.columnaJson()})`)
  }

  async insere(collectio: string, datum: unknown): Promise<void> {
    await this.praeparaCollectionem(collectio)
    const cliens = await this.sql()
    const nomen = this.tabulaTuta(collectio)
    await cliens.unsafe(`INSERT INTO ${nomen} (data) VALUES (${this.locusPositionalis(1)})`, [
      JSON.stringify(datum),
    ])
  }

  async lege(collectio: string): Promise<unknown[]> {
    await this.praeparaCollectionem(collectio)
    const cliens = await this.sql()
    const nomen = this.tabulaTuta(collectio)
    const ordines = (await cliens.unsafe(`SELECT data FROM ${nomen}`)) as { data: unknown }[]
    return ordines.map((o) => (typeof o.data === "string" ? (JSON.parse(o.data) as unknown) : o.data))
  }

  async legeOmnia(collectiones: Iterable<string>): Promise<OrdoCollectionis[]> {
    const omnia: OrdoCollectionis[] = []
    for (const collectio of collectiones) {
      omnia.push({ collectio, ordines: await this.lege(collectio) })
    }
    return omnia
  }
}

export function creaMotor(locus: string): MotorBasis {
  const divisor = locus.indexOf("://")
  const schema = divisor === -1 ? "" : locus.slice(0, divisor).toLowerCase()
  const reliquum = divisor === -1 ? locus : locus.slice(divisor + "://".length)

  switch (schema) {
    case "":
    case "sqlite":
      return new MotorSqlite(reliquum)
    case "postgres":
    case "postgresql":
      return new MotorSql(locus, "postgres")
    case "mysql":
    case "mariadb":
      if (typeof Bun === "undefined" || typeof (Bun as { SQL?: unknown }).SQL !== "function") {
        throw new Error("mysql engine requires Bun's built-in SQL client (Bun.SQL is unavailable)")
      }
      return new MotorSql(locus, "mysql")
    default:
      return new MotorSqlite("")
  }
}

export function valorAdJson(v: Valor): unknown {
  switch (v.genus) {
    case "numerus":
      return v.numerus
    case "textus":
      return v.textus
    case "veritas":
      return v.veritas
    case "nihil":
      return null
    case "agmen":
      return v.elementa.map(valorAdJson)
    case "tabula":
      return Object.fromEntries([...v.tabula].map(([k, w]) => [k, valorAdJson(w)]))
    case "oraculum":
      return "<oracle>"
    case "ritus":
      return `<ritual ${v.nomen}>`
  }
}

export function jsonAdValor(x: unknown): Valor {
  if (x === null) return NIHIL
  if (typeof x === "number") return creaNumerus(x)
  if (typeof x === "string") return creaTextus(x)
  if (typeof x === "boolean") return creaVeritas(x)
  if (Array.isArray(x)) return creaAgmen(x.map(jsonAdValor))
  if (typeof x === "object") {
    const tabula = new Map<string, Valor>()
    for (const [k, v] of Object.entries(x)) tabula.set(k, jsonAdValor(v))
    return creaTabula(tabula)
  }
  return NIHIL
}
