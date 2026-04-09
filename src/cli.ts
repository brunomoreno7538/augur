import { Command } from "commander"

export interface OptionesMandati {
  fasciculus: string | undefined
  seance: boolean
  paranoicus: boolean
  oraculum: string | undefined
  exemplar: string | undefined
  temperatura: number | undefined
  aerarium: number | undefined
  memor: boolean
  fasciculusMemoriae: string | undefined
  conatus: number | undefined
}

export function legeMandata(argv: string[]): OptionesMandati {
  const program = new Command()
  program
    .name("aug")
    .description("Augur — a language whose operations are divined by an LLM instead of computed")
    .argument("[file]", "path to a .aug program")
    .option("--seance", "interactive REPL", false)
    .option("--paranoid", "log every AI call (prompt + response + cost)", false)
    .option("--oracle <name>", "anthropic | openai | openrouter | ollama | fake")
    .option("--model <id>", "model id")
    .option("--temperature <n>", "default temperature", legeFractionem)
    .option("--budget <n>", "AI call ceiling", legeInteger)
    .option("--remember", "cache divinations to disk for reproducible, cheaper runs", false)
    .option("--remember-file <path>", "cache file path (default .augur-cache.json)")
    .option("--retry <n>", "retries on a transient oracle error", legeInteger)
    .allowExcessArguments(false)

  program.parse(argv, { from: "user" })
  const opts = program.opts<{
    seance?: boolean
    paranoid?: boolean
    oracle?: string
    model?: string
    temperature?: number
    budget?: number
    remember?: boolean
    rememberFile?: string
    retry?: number
  }>()

  return {
    fasciculus: program.args[0],
    seance: opts.seance ?? false,
    paranoicus: opts.paranoid ?? false,
    oraculum: opts.oracle,
    exemplar: opts.model,
    temperatura: opts.temperature,
    aerarium: opts.budget,
    memor: opts.remember ?? false,
    fasciculusMemoriae: opts.rememberFile,
    conatus: opts.retry,
  }
}

function legeFractionem(valor: string): number {
  const n = Number.parseFloat(valor)
  if (Number.isNaN(n)) throw new Error(`invalid --temperature: ${valor}`)
  return n
}

function legeInteger(valor: string): number {
  const n = Number.parseInt(valor, 10)
  if (Number.isNaN(n)) throw new Error(`invalid --budget: ${valor}`)
  return n
}
