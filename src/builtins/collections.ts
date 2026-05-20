import type { OperatioCollectionisGenus } from "../parser/ast"
import { coerce, estVerumCrudus, summa } from "../interpreter/coercio"
import { temperaturaPro } from "../interpreter/zones"
import {
  creaAgmen,
  creaNumerus,
  creaTabula,
  creaTextus,
  fingeOraculum,
  praevisio,
  repraesenta,
  suntAequales,
  type Valor,
} from "../interpreter/values"
import type { Rogatio } from "../providers/types"
import type { ContextusNativus } from "./types"

export async function operatioCollectionis(
  ctx: ContextusNativus,
  operatio: OperatioCollectionisGenus,
  subiectum: Valor,
  criterium: string | undefined,
  rotuli: Valor[] | undefined,
  quantitas: Valor | undefined,
  parallelus = false,
): Promise<Valor> {
  switch (operatio) {
    case "count":
      return numera(subiectum)
    case "sum":
      return summaElementorum(subiectum)
    case "reverse":
      return inverte(subiectum)
    case "unique":
      return singularia(subiectum)
    case "take":
      return sumere(subiectum, quantitas)
    case "skip":
      return omittere(subiectum, quantitas)
    case "sort":
      return await ordina(ctx, subiectum, criterium)
    case "pick":
      return await selige(ctx, subiectum, criterium)
    case "filter":
      return await cribra(ctx, subiectum, criterium, parallelus)
    case "map":
      return await transforma(ctx, subiectum, criterium, parallelus)
    case "classify":
      return await classifica(ctx, subiectum, rotuli ?? [], parallelus)
    case "extract":
      return await extrahe(ctx, subiectum, criterium)
  }
}

async function perElementum<T>(
  parallelus: boolean,
  elementa: readonly Valor[],
  fn: (elementum: Valor) => Promise<T>,
): Promise<T[]> {
  if (parallelus) return await Promise.all(elementa.map(fn))
  const exitus: T[] = []
  for (const elementum of elementa) exitus.push(await fn(elementum))
  return exitus
}

function numera(v: Valor): Valor {
  if (v.genus === "agmen") return creaNumerus(v.elementa.length)
  if (v.genus === "textus") return creaNumerus(v.textus.length)
  if (v.genus === "tabula") return creaNumerus(v.tabula.size)
  return fingeOraculum("GENUS_DISCORS", `cannot count ${v.genus}`)
}

function summaElementorum(v: Valor): Valor {
  if (v.genus !== "agmen") return fingeOraculum("GENUS_DISCORS", `cannot sum ${v.genus}`)
  let total = 0
  for (const e of v.elementa) {
    if (e.genus !== "numerus") return fingeOraculum("GENUS_DISCORS", "sum needs a list of numbers")
    total += e.numerus
  }
  return creaNumerus(total)
}

function inverte(v: Valor): Valor {
  if (v.genus === "agmen") return creaAgmen([...v.elementa].reverse())
  if (v.genus === "textus") return creaTextus([...v.textus].reverse().join(""))
  return fingeOraculum("GENUS_DISCORS", `cannot reverse ${v.genus}`)
}

function singularia(v: Valor): Valor {
  if (v.genus !== "agmen") return fingeOraculum("GENUS_DISCORS", `cannot dedupe ${v.genus}`)
  const unica: Valor[] = []
  for (const e of v.elementa) {
    if (!unica.some((u) => suntAequales(u, e))) unica.push(e)
  }
  return creaAgmen(unica)
}

function quantitasNumeri(quantitas: Valor | undefined): number | null {
  if (!quantitas || quantitas.genus !== "numerus") return null
  return Math.max(0, Math.floor(quantitas.numerus))
}

function sumere(v: Valor, quantitas: Valor | undefined): Valor {
  if (v.genus !== "agmen") return fingeOraculum("GENUS_DISCORS", `cannot take from ${v.genus}`)
  const n = quantitasNumeri(quantitas)
  if (n === null) return fingeOraculum("GENUS_DISCORS", "take needs a number")
  return creaAgmen(v.elementa.slice(0, n))
}

function omittere(v: Valor, quantitas: Valor | undefined): Valor {
  if (v.genus !== "agmen") return fingeOraculum("GENUS_DISCORS", `cannot skip from ${v.genus}`)
  const n = quantitasNumeri(quantitas)
  if (n === null) return fingeOraculum("GENUS_DISCORS", "skip needs a number")
  return creaAgmen(v.elementa.slice(n))
}

async function ordina(ctx: ContextusNativus, subiectum: Valor, criterium: string | undefined): Promise<Valor> {
  if (subiectum.genus !== "agmen") return fingeOraculum("GENUS_DISCORS", `cannot sort ${subiectum.genus}`)
  if (ctx.zona.genus === "Certus") {
    const copia = [...subiectum.elementa]
    copia.sort((a, b) => {
      if (a.genus === "numerus" && b.genus === "numerus") return a.numerus - b.numerus
      return repraesenta(a) < repraesenta(b) ? -1 : repraesenta(a) > repraesenta(b) ? 1 : 0
    })
    return creaAgmen(copia)
  }
  return await divina(ctx, {
    genusOperationis: "sort",
    operandi: [summa(subiectum)],
    instructio: criterium ?? "natural order",
    genusExpectatum: "agmen",
  })
}

async function selige(ctx: ContextusNativus, subiectum: Valor, criterium: string | undefined): Promise<Valor> {
  if (subiectum.genus !== "agmen") return fingeOraculum("GENUS_DISCORS", `cannot pick from ${subiectum.genus}`)
  if (ctx.zona.genus === "Certus") {
    return subiectum.elementa[0] ?? fingeOraculum("GENUS_DISCORS", "cannot pick from an empty list")
  }
  return await divina(ctx, {
    genusOperationis: "pick",
    operandi: [summa(subiectum)],
    instructio: criterium ?? "the most fitting element",
  })
}

async function cribra(
  ctx: ContextusNativus,
  subiectum: Valor,
  criterium: string | undefined,
  parallelus: boolean,
): Promise<Valor> {
  if (subiectum.genus !== "agmen") return fingeOraculum("GENUS_DISCORS", `cannot filter ${subiectum.genus}`)
  if (ctx.zona.genus === "Certus") {
    return fingeOraculum("GENUS_DISCORS", "semantic filter needs the oracle; not available in certain")
  }
  const iudicia = await perElementum(parallelus, subiectum.elementa, async (elementum) => {
    const responsum = await ctx.oraculum.divina(plenaRogatio(ctx, {
      genusOperationis: "filter",
      operandi: [summa(elementum)],
      instructio: criterium ?? "keep it?",
      genusExpectatum: "veritas",
    }))
    return responsum.ratum && estVerumCrudus(responsum.valor)
  })
  return creaAgmen(subiectum.elementa.filter((_, i) => iudicia[i]))
}

async function transforma(
  ctx: ContextusNativus,
  subiectum: Valor,
  criterium: string | undefined,
  parallelus: boolean,
): Promise<Valor> {
  if (subiectum.genus !== "agmen") return fingeOraculum("GENUS_DISCORS", `cannot map ${subiectum.genus}`)
  if (ctx.zona.genus === "Certus") {
    return fingeOraculum("GENUS_DISCORS", "semantic map needs the oracle; not available in certain")
  }
  const nova = await perElementum(parallelus, subiectum.elementa, async (elementum) => {
    const responsum = await ctx.oraculum.divina(plenaRogatio(ctx, {
      genusOperationis: "map",
      operandi: [summa(elementum)],
      instructio: criterium ?? "transform it",
    }))
    return responsum.ratum ? coerce(responsum.valor) : fingeOraculum(responsum.causa)
  })
  return creaAgmen(nova)
}

async function classifica(
  ctx: ContextusNativus,
  subiectum: Valor,
  rotuli: Valor[],
  parallelus: boolean,
): Promise<Valor> {
  if (subiectum.genus !== "agmen") return fingeOraculum("GENUS_DISCORS", `cannot classify ${subiectum.genus}`)
  if (ctx.zona.genus === "Certus") {
    return fingeOraculum("GENUS_DISCORS", "classify needs the oracle; not available in certain")
  }
  const nomina = rotuli.map((r) => repraesenta(r))
  const rotulati = await perElementum(parallelus, subiectum.elementa, async (elementum) => {
    const responsum = await ctx.oraculum.divina(plenaRogatio(ctx, {
      genusOperationis: "classify",
      operandi: [summa(elementum)],
      instructio: `assign to exactly one of: ${nomina.join(", ")}`,
      genusExpectatum: "textus",
    }))
    return responsum.ratum ? String(responsum.valor) : null
  })
  const tabula = new Map<string, Valor>()
  for (const nomen of nomina) tabula.set(nomen, creaAgmen([]))
  subiectum.elementa.forEach((elementum, i) => {
    const rotulus = rotulati[i]
    if (rotulus === null || rotulus === undefined) return
    const grex = tabula.get(rotulus)
    if (grex && grex.genus === "agmen") grex.elementa.push(elementum)
    else tabula.set(rotulus, creaAgmen([elementum]))
  })
  return creaTabula(tabula)
}

async function extrahe(ctx: ContextusNativus, subiectum: Valor, criterium: string | undefined): Promise<Valor> {
  if (ctx.zona.genus === "Certus") {
    return fingeOraculum("GENUS_DISCORS", "extract needs the oracle; not available in certain")
  }
  return await divina(ctx, {
    genusOperationis: "extract",
    operandi: [summa(subiectum)],
    instructio: criterium ?? "the relevant part",
  })
}

function plenaRogatio(ctx: ContextusNativus, pars: Omit<Rogatio, "temperatura" | "contextus">): Rogatio {
  return {
    ...pars,
    temperatura: temperaturaPro(ctx.zona, ctx.temperaturaDivina),
    contextus: ctx.contextus,
  }
}

async function divina(ctx: ContextusNativus, pars: Omit<Rogatio, "temperatura" | "contextus">): Promise<Valor> {
  const responsum = await ctx.oraculum.divina(plenaRogatio(ctx, pars))
  if (!responsum.ratum) return fingeOraculum(responsum.causa)
  return coerce(responsum.valor)
}
