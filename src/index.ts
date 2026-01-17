#!/usr/bin/env bun
import { legeMandata } from "./cli"

async function principium(): Promise<void> {
  const opts = legeMandata(process.argv.slice(2))

  if (!opts.fasciculus && !opts.seance) {
    console.error("usage: aug [file.aug] [options]  (try --help)")
    process.exitCode = 1
    return
  }

  console.error("augur: interpreter not yet implemented (Phase 0)")
  process.exitCode = 1
}

principium().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exitCode = 1
})
