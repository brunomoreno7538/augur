import { operatioCollectionis } from "../builtins/collections"
import { Bancus } from "../builtins/db"
import { affer } from "../builtins/http"
import { lege, rogaConsola, scribe } from "../builtins/io"
import type { ContextusNativus } from "../builtins/types"
import { AugurErratum, ErratumAerarii, ErratumExsecutionis, ErratumOraculi } from "../errors"
import type { Expressio, OperatorBinarius, Programma, Sententia } from "../parser/ast"
import { OraculumFictum } from "../providers/fake"
import type { Oraculum, Rogatio, SummariumOperandi } from "../providers/types"
import { coerce, summa } from "./coercio"
import { Ambitus } from "./environment"
import { coerceNativa, speciesDescriptio } from "./species"
import { PilaZonarum, temperaturaPro, type Zona } from "./zones"
import {
  creaAgmen,
  creaNumerus,
  creaTabula,
  creaTextus,
  creaVeritas,
  estOraculum,
  estVerum,
  fingeOraculum,
  NIHIL,
  operatioBinariaNativa,
  operatioUnariaNativa,
  repraesenta,
  type Valor,
  type ValorRitus,
} from "./values"

export class SignumInterruptionis {}

export class SignumContinuationis {}

export class SignumRedditionis {
  constructor(readonly valor: Valor) {}
}

export function estSignumDirectionis(e: unknown): boolean {
  return (
    e instanceof SignumInterruptionis ||
    e instanceof SignumContinuationis ||
    e instanceof SignumRedditionis
  )
}

export interface Scaena {
  proclama(linea: string): void
  susurra(linea: string): void
}

const scaenaConsolae: Scaena = {
  proclama: (linea) => console.log(linea),
  susurra: (linea) => console.error(linea),
}

export interface OptionesAestimatoris {
  scaena?: Scaena
  oraculum?: Oraculum
  temperaturaDivina?: number
  spatiumMemoriae?: number
  roga?: (invitatio: string) => Promise<string>
}

export class Aestimator {
  private readonly scaena: Scaena
  private readonly oraculum: Oraculum
  private temperaturaDivina: number
  private readonly spatiumMemoriae: number
  private readonly roga: (invitatio: string) => Promise<string>
  private readonly pila = new PilaZonarum()
  private contextusCurrens: string[] = []
  private bancus: Bancus | null = null

  constructor(optiones: OptionesAestimatoris = {}) {
    this.scaena = optiones.scaena ?? scaenaConsolae
    this.oraculum = optiones.oraculum ?? new OraculumFictum()
    this.temperaturaDivina = optiones.temperaturaDivina ?? 0.7
    this.spatiumMemoriae = optiones.spatiumMemoriae ?? 4000
    this.roga = optiones.roga ?? rogaConsola
  }

  private ctxNativus(): ContextusNativus {
    return {
      oraculum: this.oraculum,
      zona: this.pila.apex(),
      temperaturaDivina: this.temperaturaDivina,
      contextus: this.contextusCurrens,
    }
  }

  async curre(programma: Programma, ambitus: Ambitus = new Ambitus()): Promise<void> {
    for (const s of programma) {
      await this.exsequere(s, ambitus)
    }
  }

  private async exsequere(s: Sententia, amb: Ambitus): Promise<void> {
    const prior = this.contextusCurrens
    if (s.contextus) this.contextusCurrens = s.contextus
    try {
      return await this.exsequereNudum(s, amb)
    } finally {
      this.contextusCurrens = prior
    }
  }

  private async exsequereNudum(s: Sententia, amb: Ambitus): Promise<void> {
    switch (s.genus) {
      case "DeclaratioVar":
        amb.declara(s.nomen, await this.aestima(s.valor, amb))
        return
      case "Reassignatio":
        amb.muta(s.nomen, await this.aestima(s.valor, amb))
        return
      case "Oblivio":
        amb.oblivisce(s.nomen)
        return
      case "Conditio":
        return await this.exsequereConditionem(s, amb)
      case "DumIteratio":
        return await this.exsequereDum(s, amb)
      case "Repetitio":
        return await this.exsequereRepetitionem(s, amb)
      case "IteratioPer":
        return await this.exsequereIterationem(s, amb)
      case "DefinitioRitus": {
        const ritus: ValorRitus = {
          genus: "ritus",
          nomen: s.nomen,
          parametri: s.parametri,
          corpus: s.corpus,
          clausura: amb,
          divinatus: s.corpus === null,
        }
        amb.declara(s.nomen, ritus)
        return
      }
      case "Redditio":
        throw new SignumRedditionis(s.valor ? await this.aestima(s.valor, amb) : NIHIL)
      case "Interruptio":
        throw new SignumInterruptionis()
      case "Continuatio":
        throw new SignumContinuationis()
      case "Asseveratio":
        return await this.exsequereAsseverationem(s, amb)
      case "Conatus":
        return await this.exsequereConatum(s, amb)
      case "BlocusZonae":
        return await this.exsequereBlocumZonae(s, amb)
      case "Praeceptum":
        if (s.clavis === "temperature" && typeof s.valor === "number") this.temperaturaDivina = s.valor
        return
      case "Proclamatio":
        this.scaena.proclama(repraesenta(await this.aestima(s.expressio, amb)))
        return
      case "Susurrus":
        this.scaena.susurra(repraesenta(await this.aestima(s.expressio, amb)))
        return
      case "SententiaExpressionis":
        await this.aestima(s.expressio, amb)
        return
      case "Scriptio":
        scribe(await this.aestima(s.datum, amb), await this.aestima(s.fasciculus, amb))
        return
      case "Communio":
        this.bancus = new Bancus(s.locus, this.spatiumMemoriae)
        return
      case "Inscriptio":
        if (!this.bancus) return this.scaena.susurra("no database; commune first")
        await this.bancus.inscribe(this.ctxNativus(), await this.aestima(s.datum, amb), s.collectio)
        return
      case "Recensio":
        if (!this.bancus) return this.scaena.susurra("no database; commune first")
        this.bancus.recense(await this.aestima(s.scopus, amb), s.instructio)
        return
      case "Expulsio":
        if (!this.bancus) return this.scaena.susurra("no database; commune first")
        this.bancus.expelle(s.descriptio, s.collectio)
        return
    }
  }

  private async execCorpus(corpus: Sententia[], amb: Ambitus): Promise<void> {
    for (const s of corpus) {
      await this.exsequere(s, amb)
    }
  }

  private async exsequereBlocumZonae(
    s: Extract<Sententia, { genus: "BlocusZonae" }>,
    amb: Ambitus,
  ): Promise<void> {
    const zona: Zona =
      s.zonaGenus === "Certus" ? { genus: "Certus" } : { genus: "Chaos", temperatura: s.temperatura }
    this.pila.impone(zona)
    try {
      return await this.execCorpus(s.corpus, amb.filius())
    } finally {
      this.pila.detrahe()
    }
  }

  private async exsequereConditionem(
    s: Extract<Sententia, { genus: "Conditio" }>,
    amb: Ambitus,
  ): Promise<void> {
    for (const ramus of s.rami) {
      const condicio = await this.aestima(ramus.condicio, amb)
      if (estOraculum(condicio)) this.scaena.susurra("condition divined to an oracle; treating as false")
      if (estVerum(condicio)) {
        return await this.execCorpus(ramus.corpus, amb.filius())
      }
    }
    if (s.aliter) {
      await this.execCorpus(s.aliter, amb.filius())
    }
  }

  private async exsequereDum(
    s: Extract<Sententia, { genus: "DumIteratio" }>,
    amb: Ambitus,
  ): Promise<void> {
    for (;;) {
      const condicio = await this.aestima(s.condicio, amb)
      if (estOraculum(condicio)) this.scaena.susurra("loop condition divined to an oracle; stopping")
      if (!estVerum(condicio)) break
      try {
        await this.execCorpus(s.corpus, amb.filius())
      } catch (e) {
        if (e instanceof SignumInterruptionis) break
        if (e instanceof SignumContinuationis) continue
        throw e
      }
    }
  }

  private async exsequereRepetitionem(
    s: Extract<Sententia, { genus: "Repetitio" }>,
    amb: Ambitus,
  ): Promise<void> {
    let quotiens = Number.POSITIVE_INFINITY
    if (s.quotiens !== null) {
      const v = await this.aestima(s.quotiens, amb)
      if (v.genus !== "numerus") throw new ErratumExsecutionis("repeat count must be a number")
      quotiens = v.numerus
    }
    for (let i = 0; i < quotiens; i++) {
      try {
        await this.execCorpus(s.corpus, amb.filius())
      } catch (e) {
        if (e instanceof SignumInterruptionis) break
        if (e instanceof SignumContinuationis) continue
        throw e
      }
    }
  }

  private async exsequereIterationem(
    s: Extract<Sententia, { genus: "IteratioPer" }>,
    amb: Ambitus,
  ): Promise<void> {
    const iterabile = await this.aestima(s.iterabile, amb)
    const elementa = this.elementaIterabilis(iterabile)
    if (elementa === null) {
      this.scaena.susurra("iterating an oracle value; skipping")
      return
    }
    for (const elementum of elementa) {
      const local = amb.filius()
      local.declara(s.nomen, elementum)
      try {
        await this.execCorpus(s.corpus, local)
      } catch (e) {
        if (e instanceof SignumInterruptionis) break
        if (e instanceof SignumContinuationis) continue
        throw e
      }
    }
  }

  private elementaIterabilis(v: Valor): Valor[] | null {
    if (estOraculum(v)) return null
    if (v.genus === "agmen") return v.elementa
    if (v.genus === "tabula") return [...v.tabula.keys()].map(creaTextus)
    throw new ErratumExsecutionis(`cannot iterate over ${v.genus}`)
  }

  private async exsequereAsseverationem(
    s: Extract<Sententia, { genus: "Asseveratio" }>,
    amb: Ambitus,
  ): Promise<void> {
    const valor = await this.aestima(s.expressio, amb)
    if (!estVerum(valor)) {
      throw new ErratumOraculi(s.causa)
    }
  }

  private async exsequereConatum(
    s: Extract<Sententia, { genus: "Conatus" }>,
    amb: Ambitus,
  ): Promise<void> {
    try {
      await this.execCorpus(s.corpus, amb.filius())
    } catch (e) {
      if (estSignumDirectionis(e) || e instanceof ErratumAerarii) throw e
      const local = amb.filius()
      if (s.nomenErroris) {
        const nuntius = e instanceof AugurErratum ? e.message : String(e)
        local.declara(s.nomenErroris, fingeOraculum("RECUSATIO", nuntius))
      }
      await this.execCorpus(s.remedium, local)
    }
  }

  private async aestima(e: Expressio, amb: Ambitus): Promise<Valor> {
    switch (e.genus) {
      case "LitteraNumeri":
        return creaNumerus(e.valor)
      case "LitteraTextus":
        return creaTextus(e.valor)
      case "LitteraVeritatis":
        return creaVeritas(e.valor)
      case "LitteraNihil":
        return NIHIL
      case "LitteraAgminis": {
        const elementa: Valor[] = []
        for (const sub of e.elementa) elementa.push(await this.aestima(sub, amb))
        return creaAgmen(elementa)
      }
      case "LitteraTabulae": {
        const tabula = new Map<string, Valor>()
        for (const par of e.paria) tabula.set(par.clavis, await this.aestima(par.valor, amb))
        return creaTabula(tabula)
      }
      case "Nomen":
        return amb.accipe(e.nomen)
      case "ExpressioBinaria": {
        const a = await this.aestima(e.sinistra, amb)
        const b = await this.aestima(e.dextra, amb)
        if (estOraculum(a)) return a
        if (estOraculum(b)) return b
        if (this.pila.apex().genus === "Certus") return operatioBinariaNativa(e.operator, a, b)
        return await this.divinaBinariam(e.operator, a, b)
      }
      case "ExpressioLogica": {
        const sinistra = await this.aestima(e.sinistra, amb)
        if (e.operator === "and") {
          if (!estVerum(sinistra)) return sinistra
          return await this.aestima(e.dextra, amb)
        }
        if (estVerum(sinistra)) return sinistra
        return await this.aestima(e.dextra, amb)
      }
      case "ExpressioUnaria":
        return operatioUnariaNativa(e.operator, await this.aestima(e.operandum, amb))
      case "Vocatio":
        return await this.aestimaVocationem(e, amb)
      case "Indicium":
        return await this.aestimaIndicium(e, amb)
      case "Coercio":
        return await this.aestimaCoercionem(e, amb)
      case "Divinatio":
        return await this.aestimaDivinationem(e, amb)
      case "OperatioCollectionis":
        return await this.aestimaOperationemCollectionis(e, amb)
      case "Petitio": {
        const url = await this.aestima(e.url, amb)
        const optiones = e.optiones ? await this.aestima(e.optiones, amb) : null
        return await affer(this.ctxNativus(), url, optiones)
      }
      case "Interrogatio":
        return creaTextus(await this.roga(e.invitatio))
      case "Lectio":
        return lege(await this.aestima(e.fasciculus, amb))
      case "Consultatio":
        if (!this.bancus) return fingeOraculum("RECUSATIO", "no database; commune first")
        return await this.bancus.interroga(this.ctxNativus(), e.interrogatio)
      case "Memoria":
        if (!this.bancus) return fingeOraculum("RECUSATIO", "no database; commune first")
        return await this.bancus.memora(this.ctxNativus(), e.descriptio, e.collectio)
    }
  }

  private async aestimaOperationemCollectionis(
    e: Extract<Expressio, { genus: "OperatioCollectionis" }>,
    amb: Ambitus,
  ): Promise<Valor> {
    const subiectum = await this.aestima(e.subiectum, amb)
    if (estOraculum(subiectum)) return subiectum
    let rotuli: Valor[] | undefined
    if (e.rotuli) {
      rotuli = []
      for (const r of e.rotuli) rotuli.push(await this.aestima(r, amb))
    }
    return await operatioCollectionis(this.ctxNativus(), e.operatio, subiectum, e.criterium, rotuli)
  }

  private async divinaBinariam(op: OperatorBinarius, a: Valor, b: Valor): Promise<Valor> {
    const zona = this.pila.apex()
    const rogatio: Rogatio = {
      genusOperationis: op,
      operandi: [summa(a), summa(b)],
      temperatura: temperaturaPro(zona, this.temperaturaDivina),
      genusExpectatum: genusExpectatumOperatoris(op),
      contextus: this.contextusCurrens,
    }
    const responsum = await this.oraculum.divina(rogatio)
    if (!responsum.ratum) return fingeOraculum(responsum.causa)
    return coerce(responsum.valor)
  }

  private async aestimaDivinationem(
    e: Extract<Expressio, { genus: "Divinatio" }>,
    amb: Ambitus,
  ): Promise<Valor> {
    const operandi: SummariumOperandi[] = []
    if (e.supra) {
      const sup = await this.aestima(e.supra, amb)
      if (estOraculum(sup)) return sup
      operandi.push(summa(sup))
    }
    const zona = this.pila.apex()
    const rogatio: Rogatio = {
      genusOperationis: "divine",
      operandi,
      instructio: e.instructio,
      temperatura: temperaturaPro(zona, this.temperaturaDivina),
      contextus: this.contextusCurrens,
    }
    const responsum = await this.oraculum.divina(rogatio)
    if (!responsum.ratum) return fingeOraculum(responsum.causa)
    return coerce(responsum.valor)
  }

  private async aestimaVocationem(
    e: Extract<Expressio, { genus: "Vocatio" }>,
    amb: Ambitus,
  ): Promise<Valor> {
    const advocatus = await this.aestima(e.advocatus, amb)
    if (estOraculum(advocatus)) return advocatus
    if (advocatus.genus !== "ritus") {
      throw new ErratumExsecutionis(`value of type ${advocatus.genus} is not callable`)
    }
    const argumenta: Valor[] = []
    for (const arg of e.argumenta) argumenta.push(await this.aestima(arg, amb))

    if (advocatus.divinatus || advocatus.corpus === null) {
      const zona = this.pila.apex()
      const rogatio: Rogatio = {
        genusOperationis: `ritual:${advocatus.nomen}`,
        operandi: argumenta.map(summa),
        instructio: `invoke the ritual '${advocatus.nomen}'`,
        temperatura: temperaturaPro(zona, this.temperaturaDivina),
        contextus: this.contextusCurrens,
      }
      const responsum = await this.oraculum.divina(rogatio)
      if (!responsum.ratum) return fingeOraculum(responsum.causa)
      return coerce(responsum.valor)
    }
    if (argumenta.length !== advocatus.parametri.length) {
      throw new ErratumExsecutionis(
        `ritual '${advocatus.nomen}' expects ${advocatus.parametri.length} arguments, got ${argumenta.length}`,
      )
    }
    const local = advocatus.clausura.filius()
    advocatus.parametri.forEach((p, i) => local.declara(p, argumenta[i]!))
    try {
      await this.execCorpus(advocatus.corpus, local)
    } catch (err) {
      if (err instanceof SignumRedditionis) return err.valor
      throw err
    }
    return NIHIL
  }

  private async aestimaIndicium(
    e: Extract<Expressio, { genus: "Indicium" }>,
    amb: Ambitus,
  ): Promise<Valor> {
    const basis = await this.aestima(e.basis, amb)
    if (estOraculum(basis)) return basis
    const index = await this.aestima(e.index, amb)
    if (estOraculum(index)) return index
    if (basis.genus === "agmen" && index.genus === "numerus") {
      return basis.elementa[index.numerus] ?? NIHIL
    }
    if (basis.genus === "tabula" && index.genus === "textus") {
      return basis.tabula.get(index.textus) ?? NIHIL
    }
    throw new ErratumExsecutionis(`cannot index ${basis.genus} with ${index.genus}`)
  }

  private async aestimaCoercionem(
    e: Extract<Expressio, { genus: "Coercio" }>,
    amb: Ambitus,
  ): Promise<Valor> {
    const valor = await this.aestima(e.subiectum, amb)
    if (estOraculum(valor)) return valor

    const nativa = coerceNativa(valor, e.species)
    if (nativa !== null) return nativa

    const descriptio = speciesDescriptio(e.species)
    const zona = this.pila.apex()
    if (zona.genus === "Certus") {
      return fingeOraculum("GENUS_DISCORS", `cannot coerce ${valor.genus} to ${descriptio}`)
    }

    const rogatio: Rogatio = {
      genusOperationis: "coerce",
      operandi: [summa(valor)],
      instructio: `Convert this value to ${descriptio}`,
      temperatura: temperaturaPro(zona, this.temperaturaDivina),
      genusExpectatum: descriptio,
      contextus: this.contextusCurrens,
    }
    const responsum = await this.oraculum.divina(rogatio)
    if (!responsum.ratum) return fingeOraculum(responsum.causa)
    const divinatum = coerce(responsum.valor)
    return coerceNativa(divinatum, e.species) ?? divinatum
  }
}

function genusExpectatumOperatoris(op: OperatorBinarius): string | undefined {
  switch (op) {
    case "==":
    case "!=":
    case "<":
    case ">":
    case "<=":
    case ">=":
      return "veritas"
    default:
      return undefined
  }
}
