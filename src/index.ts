#!/usr/bin/env bun
import { readFileSync } from "node:fs"
import { legeMandata } from "./cli"
import { AugurErratum } from "./errors"
import { Aestimator } from "./interpreter/interpreter"
import { analyza } from "./parser/parser"

async function principium(): Promise<void> {
  const opts = legeMandata(process.argv.slice(2))

  if (!opts.fasciculus) {
    console.error("usage: aug <file.aug> [options]  (try --help)")
    process.exitCode = 1
    return
  }

  const fons = readFileSync(opts.fasciculus, "utf8")
  const programma = analyza(fons)
  await new Aestimator().curre(programma)
}

principium().catch((err: unknown) => {
  console.error(err instanceof AugurErratum ? `augur: ${err.message}` : err instanceof Error ? err.message : String(err))
  process.exitCode = 1
})
