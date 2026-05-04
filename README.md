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
aug <file.aug | -> [options]      # - reads the program from stdin
  --seance              interactive REPL
  --paranoid            log every AI call (prompt + response + cost)
  --quiet               suppress the end-of-run cost summary
  --oracle <name>       anthropic | openai | openrouter | ollama | fake
  --model <id>          model id
  --temperature <n>     default temperature
  --budget <n>          ceiling on AI calls (kills runaway loops)
  --remember            cache divinations to disk (reproducible + cheap)
  --remember-file <p>   cache file path (default .augur-cache.json)
  --retry <n>           retries on a transient oracle error (default 2)
  -v, --version         print version
```

Flags override the `.aug` config header. Default oracle is `fake` (deterministic, offline). `proclaim` writes to stdout and the cost summary to stderr, so it pipes cleanly: `echo 'proclaim 2 + 2' | aug - --quiet`. Keys load from the environment or a `.env` file (see `.env.example`).

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

**Parallelism**: `gather [a, b, c]` evaluates the expressions concurrently; `gather map xs with "…"` (also `filter`/`classify`) runs the per-element divinations in parallel. Same results and order, far faster when you have many independent oracle calls.

**Divination primitive**: `divine "instruction"` and `divine "instruction" upon expr`. Add `thrice` to consult the oracle three times in parallel and take the majority — cheap self-consistency: `divine "the sentiment" upon review thrice`.

**Typed coercion**: `expr as <type>` — `number`, `text`, `bool`, `list`, `map`, `[T]`, or `{field: T, …}`. Coerced natively when possible (`"42" as number`), divined when not (`"twelve dozen" as number`), and an oracle value inside `certain` if impossible. This is what makes divined output safe to use: `divine "the user" as {name: text, age: number}`.

**Vibe-tests**: `believe expr is "description"` — the oracle judges whether `expr` matches a natural-language description and fails the assertion if not (`believe reply is "polite and on-topic"`). Plain `believe expr [because "…"]` stays native truthiness. A way to test fuzzy LLM output in CI.

**I/O**: `ask`, `proclaim`, `whisper`, `read`, `write … to …`.

**HTTP server**: `serve <port> with <ritual>` runs a REST API. The handler gets a request map `{method, path, query, headers, body, json}` (`json` is the parsed body) and returns `{status, body, headers?}` — `body` as text stays text, a map/list becomes JSON. Routes can be deterministic (`certain` + the database) or divined. A real persistent CRUD lives in `examples/crud_api.aug`:

```
ritual handle(req) {
    certain {
        commune with "sqlite://./notes.db"
        when req["method"] == "POST" and req["path"] == "/notes" -> {
            inscribe req["json"] into notes
            give {status: 201, body: {created: req["json"]}}
        }
        when req["method"] == "GET" and req["path"] == "/notes" -> give {status: 200, body: recall "all" from notes}
    }
    when req["path"] == "/fortune" -> give {status: 200, body: divine "a techie fortune cookie"}
    give {status: 404, body: {error: "not found"}}
}
serve 8787 with handle
```

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

- `examples/crud_api.aug` — a persistent REST CRUD over SQLite served with `serve`, plus a divined route.
- `examples/triage.aug` — a support-desk triager: parallel `classify`/`filter`, typed extraction (`as`), `thrice`, and per-ticket replies (the genuinely-useful side, end to end).
- `examples/guess.aug` — number-guessing game (`repeat forever`, `ask`, `when`/`otherwise`).
- `examples/semantic_etl.aug` — semantic `map`/`extract`/`filter`/`sort` (the genuinely useful part).
- `examples/http_mock.aug` — hallucinated `fetch` vs. a real one inside `certain`.
- `examples/amnesiac_db.aug` — the amnesiac database, the meme taken to its limit.
