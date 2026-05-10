import { creaTabula, creaTextus, estOraculum, NIHIL, type Valor } from "../interpreter/values"
import { jsonAdValor, valorAdJson } from "./db-motores"

export type Manipulator = (petitio: Valor) => Promise<Valor>

export async function construeReq(request: Request): Promise<Valor> {
  const url = new URL(request.url)

  const query = new Map<string, Valor>()
  for (const [clavis, valor] of url.searchParams) query.set(clavis, creaTextus(valor))

  const capita = new Map<string, Valor>()
  request.headers.forEach((valor, clavis) => capita.set(clavis, creaTextus(valor)))

  const corpus = await request.text()
  let datum: Valor = NIHIL
  if (corpus.length > 0) {
    try {
      datum = jsonAdValor(JSON.parse(corpus))
    } catch {
      datum = NIHIL
    }
  }

  return creaTabula(
    new Map<string, Valor>([
      ["method", creaTextus(request.method)],
      ["path", creaTextus(url.pathname)],
      ["query", creaTabula(query)],
      ["headers", creaTabula(capita)],
      ["body", creaTextus(corpus)],
      ["json", datum],
    ]),
  )
}

export function construeResponsionem(v: Valor): Response {
  if (estOraculum(v)) return responsioErroris(v.nuntius)
  if (v.genus === "tabula") {
    const corpus = v.tabula.get("body") ?? NIHIL
    if (estOraculum(corpus)) return responsioErroris(corpus.nuntius)
    return construeCorpus(sanaStatus(v.tabula.get("status")), corpus, capitaEx(v.tabula.get("headers")))
  }
  return construeCorpus(200, v, {})
}

export async function tractaPetitionem(manipulator: Manipulator, request: Request): Promise<Response> {
  try {
    const petitio = await construeReq(request)
    const responsum = await manipulator(petitio)
    return construeResponsionem(responsum)
  } catch (e) {
    return responsioErroris(e instanceof Error ? e.message : String(e))
  }
}

export async function incipeServitorem(portus: number, manipulator: Manipulator): Promise<never> {
  if (typeof Bun === "undefined") {
    throw new Error("serve requires the Bun runtime")
  }
  Bun.serve({ port: portus, fetch: (request: Request) => tractaPetitionem(manipulator, request) })
  console.error(`augur is serving on http://localhost:${portus} (Ctrl-C to stop)`)
  return await new Promise<never>(() => {})
}

function construeCorpus(status: number, corpus: Valor, capita: Record<string, string>): Response {
  if (corpus.genus === "textus") {
    return new Response(corpus.textus, {
      status,
      headers: { "content-type": "text/plain; charset=utf-8", ...capita },
    })
  }
  if (corpus.genus === "nihil") {
    return new Response("", { status, headers: capita })
  }
  return new Response(JSON.stringify(valorAdJson(corpus)), {
    status,
    headers: { "content-type": "application/json", ...capita },
  })
}

function capitaEx(v: Valor | undefined): Record<string, string> {
  const capita: Record<string, string> = {}
  if (v && v.genus === "tabula") {
    for (const [clavis, valor] of v.tabula) if (valor.genus === "textus") capita[clavis] = valor.textus
  }
  return capita
}

function sanaStatus(v: Valor | undefined): number {
  if (v && v.genus === "numerus" && Number.isInteger(v.numerus) && v.numerus >= 100 && v.numerus <= 599) {
    return v.numerus
  }
  return 200
}

function responsioErroris(detail?: string): Response {
  if (detail) console.error(`[augur serve] 500: ${detail}`)
  return responsioJson(500, { error: "internal error" })
}

function responsioJson(status: number, datum: unknown): Response {
  return new Response(JSON.stringify(datum), { status, headers: { "content-type": "application/json" } })
}
