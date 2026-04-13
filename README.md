# Augur

An interpreted programming language whose **operations are divined by an LLM instead of computed**. A meme premise with a serious architecture: the interpreter is 100% deterministic — only the *operations* descend to the AI.

```
summon secret = divine "pick a number from 1 to 100"
when guess == secret -> proclaim "You got it!"
```

## The confidence gradient

Every operation runs in one of three zones, decided at op-time:

| Zone | Behaviour |
|---|---|
| `divine` (default) | The operation goes through the AI at normal temperature. |
| `chaos [N]` | High temperature; anarchy. `2 + 2` may yield `"fish"`. |
| `certain` | Real, deterministic, native computation. No AI, no cost. |

The golden rule: control flow, scope, and function calls are resolved by a normal tree-walking evaluator. The AI only decides *whether each step's result is right*, never *what is computable*.

It is maximalist: even `fetch` (HTTP) and the database are divinable. Outside `certain`, a `fetch` never hits the network — the oracle hallucinates a plausible response. Inside `certain`, it hits the real server.

## Install & run

Requires [Bun](https://bun.sh) for development.

```sh
bun install
bun run src/index.ts examples/semantic_etl.aug      # run a program
bun run src/index.ts --seance                        # interactive REPL
```

Build a **standalone binary** (no Bun or Node needed to run it):

```sh
bun run build            # produces ./aug
./aug examples/semantic_etl.aug
```

### CLI flags

```
aug <file.aug> [options]
  --seance              interactive REPL
  --paranoid            log every AI call (prompt + response + cost)
  --oracle <name>       anthropic | openai | ollama | fake
  --model <id>          model id
  --temperature <n>     default temperature
  --budget <n>          ceiling on AI calls (kills runaway loops)
  --remember            cache divinations to disk (reproducible + cheap)
  --remember-file <p>   cache file path (default .augur-cache.json)
  --retry <n>           retries on a transient oracle error (default 2)
```

Flags override the `.aug` config header. Default oracle is `fake` (deterministic, offline).

**Reproducible & cheap runs.** `--remember` memoizes every divination to `.augur-cache.json`, keyed by the exact request. Re-running the same program replays cached answers — deterministic output, zero new tokens, no budget spent. Perfect for CI, demos, and not getting a surprise bill. Delete the file to re-roll the dice. (Caching is **off** by default — nondeterminism is the whole point.)

### Providers

| Oracle | Default model | Auth |
|---|---|---|
| `anthropic` | `claude-haiku-4-5` | `ANTHROPIC_API_KEY` |
| `openai` | `gpt-4o-mini` | `OPENAI_API_KEY` |
| `openrouter` | `openai/gpt-4o-mini` | `OPENROUTER_API_KEY` |
| `ollama` | `llama3.1` | local, `OLLAMA_HOST` (optional) |
| `fake` | — | none (used by the test suite) |

`openrouter` is OpenAI-compatible (`https://openrouter.ai/api/v1`); use any OpenRouter model id via `--model`, e.g. `--oracle openrouter --model anthropic/claude-3.5-haiku`. The end-of-run BRL counter reads `0` for OpenRouter (billing is tracked on your OpenRouter dashboard).

Keys are read from the environment — never hardcoded. `oracle "ollama"` runs 100% locally.

## Language tour

```
oracle "anthropic"          // config header (also: model, temperature, budget)
temperature 0.4

summon x = 10               // declare; `x = 20` reassigns; `forget x` removes
ritual add(a, b) { give a + b }
ritual guess(n) divined     // no body — the whole impl is divined

when x > 5 -> proclaim "big"
otherwise  -> proclaim "small"

while x > 0 { x = x - 1 }
repeat 3 { proclaim "again" }
for item in [1, 2, 3] { proclaim item }

believe x > 0 because "x must stay positive"   // assertion judged natively
attempt { believe no } rescue as e { proclaim e }

certain { proclaim 2 + 2 }   // always 4, never touches the AI
chaos 0.9 { proclaim 2 + 2 } // who knows
```

**Types** (vibe-typed, no declarations): number, text, `yes`/`no`, list `[1,2,3]`, map `{k: v}`, `naught`, and the special **oracle** value (returned on AI refusal; propagates like a poison-null until handled by `attempt`/`rescue`).

**Semantic collections** (divined): `sort by`, `filter by`, `map with`, `pick`, `classify into`, `extract from`; plus native `count`, `sum`, `reverse`, `unique`.

**Divination primitive**: `divine "instruction"` and `divine "instruction" upon expr`.

**Typed coercion**: `expr as <type>` — `number`, `text`, `bool`, `list`, `map`, `[T]`, or `{field: T, …}`. Coerced natively when possible (`"42" as number`), divined when not (`"twelve dozen" as number`), and an oracle value inside `certain` if impossible. This is what makes divined output safe to use: `divine "the user" as {name: text, age: number}`.

**I/O**: `ask`, `proclaim`, `whisper`, `read`, `write … to …`.

**Database** (`vibes://…`): `commune with`, `inscribe … into`, `recall … from`, `revise … with`, `banish … from`, `query`. Outside `certain` the database is a growing text journal re-fed to the oracle on every read — so persistence is fiction, reads can disagree, and when the journal overflows the context budget **the oldest records are forgotten** (amnesia is a feature). Inside `certain`, it uses a real `bun:sqlite` engine and data persists.

**Context notes**: `/// note` lines are not discarded — they are injected into the AI prompt for the operations that follow.

## Development

```sh
bun run typecheck    # tsc --noEmit (Bun does not type-check on its own)
bun run test         # vitest, entirely on the fake oracle — no network
bun run build        # standalone binary
```

The implementation identifiers are written in Latin (the project's theme — *augur* was a Roman priest who divined); the `.aug` language keywords and all user-facing text are in English.

## Examples

- `examples/guess.aug` — number-guessing game (`repeat forever`, `ask`, `when`/`otherwise`).
- `examples/semantic_etl.aug` — semantic `map`/`extract`/`filter`/`sort` (the genuinely useful part).
- `examples/http_mock.aug` — hallucinated `fetch` vs. a real one inside `certain`.
- `examples/amnesiac_db.aug` — the amnesiac database, the meme taken to its limit.
