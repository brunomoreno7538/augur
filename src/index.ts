#!/usr/bin/env bun
import { readFileSync } from "node:fs"
import { legeMandata } from "./cli"
import { componeConfigurationem, extraheCaput, type PartesConfigurationis } from "./config"
import { summariumPretii } from "./cost"
import { AugurErratum } from "./errors"
import { Aestimator } from "./interpreter/interpreter"
import type { Sententia } from "./parser/ast"
import { analyza } from "./parser/parser"
import { creaOraculum } from "./providers/factory"
import { incipeSessionem } from "./repl"

async function principium(): Promise<void> {
  const opts = legeMandata(process.argv.slice(2))

  const mandata: PartesConfigurationis = {
    oraculum: opts.oraculum,
    exemplar: opts.exemplar,
    temperatura: opts.temperatura,
    aerarium: opts.aerarium,
    memor: opts.memor ? true : undefined,
    fasciculusMemoriae: opts.fasciculusMemoriae,
    conatus: opts.conatus,
  }

  let programma: Sententia[] | null = null
  let caput: PartesConfigurationis = {}
  if (opts.fasciculus) {
    programma = analyza(readFileSync(opts.fasciculus, "utf8"))
    caput = extraheCaput(programma)
  }

  if (!programma && !opts.seance) {
    console.error("usage: aug <file.aug> [options]  (try --help)")
    process.exitCode = 1
    return
  }

  const config = componeConfigurationem(caput, mandata)
  const { oraculum, aerarium } = creaOraculum(config, { paranoicus: opts.paranoicus })
  const aestimator = new Aestimator({
    oraculum,
    temperaturaDivina: config.temperatura,
    spatiumMemoriae: config.spatiumMemoriae,
  })

  try {
    if (opts.seance) {
      await incipeSessionem(aestimator)
    } else if (programma) {
      await aestimator.curre(programma)
    }
  } finally {
    if (aerarium.vocationes > 0) {
      console.error(summariumPretii(aerarium.vocationes, aerarium.consumptio, config.exemplar))
    }
  }
}

principium().catch((err: unknown) => {
  console.error(err instanceof AugurErratum ? `augur: ${err.message}` : err instanceof Error ? err.message : String(err))
  process.exitCode = 1
})
