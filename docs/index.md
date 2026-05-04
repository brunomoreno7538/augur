# Augur

> An interpreted language whose operations are **divined by an LLM instead of computed**.

Augur is a small, real programming language with one twist: the interpreter is
100% deterministic — lexer, parser, scope, control flow, function calls — but the
*operations themselves* (arithmetic, comparison, collection transforms, even HTTP
and the database) descend to an oracle (an LLM) that decides what the result
should be. A meme premise on a serious tree-walking architecture. `2 + 2` is
whatever the oracle says it is — unless you wrap it in `certain { }`, where it is
real, native, free, and always `4`.

```aug
oracle "anthropic"

summon secret = divine "pick a random number from 1 to 100"
summon guess  = ask "Your guess: "

when guess == secret -> proclaim "You got it!"
otherwise            -> proclaim "Try again."
```

---

## Table of contents

- [Quick start](#quick-start)
- [Install & run](#install--run)
  - [Standalone binary](#standalone-binary)
  - [Cross-compilation](#cross-compilation)
- [The confidence gradient](#the-confidence-gradient)
- [Language reference](#language-reference)
  - [Comments & context notes](#comments--context-notes)
  - [Types](#types)
  - [Variables](#variables)
  - [Operators](#operators)
  - [Control flow](#control-flow)
  - [Rituals (functions)](#rituals-functions)
  - [The `divine` primitive](#the-divine-primitive)
  - [Assertions](#assertions)
  - [Error handling](#error-handling)
  - [Zones](#zones)
  - [Semantic collections](#semantic-collections)
  - [I/O](#io)
  - [HTTP fetch](#http-fetch)
  - [The database](#the-database)
- [Configuration](#configuration)
- [CLI reference](#cli-reference)
- [Providers](#providers)
- [Architecture](#architecture)
- [Testing & development](#testing--development)
- [FAQ](#faq)

---

## Quick start

```sh
bun install                                  # install dependencies
bun run src/index.ts examples/semantic_etl.aug   # run a program
bun run src/index.ts --seance                # interactive REPL (séance)
```

A first program — `hello.aug`:

```aug
/// the user's name is Bruno
summon greeting = divine "a warm one-line greeting"
proclaim greeting

certain {
  proclaim 40 + 2     // always 42 — never touches the oracle
}
```

```sh
bun run src/index.ts hello.aug
```

> **Note**
> The default oracle is `fake` — a deterministic, offline stub used by the test
> suite. Programs run with no API key and no network. Point at a real provider
> with `oracle "anthropic"` in the file or `--oracle anthropic` on the CLI.

---

## Install & run

Augur is built on [Bun](https://bun.sh) (`>= 1.3.0`). For development you need Bun;
to *run* a compiled binary you need nothing at all.

```sh
bun install
bun run src/index.ts <file.aug> [options]
```

| Command | What it does |
|---|---|
| `bun run src/index.ts file.aug` | Run a program. |
| `bun run src/index.ts --seance` | Start the interactive REPL. |
| `bun run dev` | Alias for `bun run src/index.ts`. |
| `bun run build` | Compile a standalone binary `./aug`. |
| `bun run typecheck` | `tsc --noEmit` (Bun does not type-check on its own). |
| `bun run test` | Run the vitest suite (offline, on the fake oracle). |

In the REPL, type one line at a time; `exit` or `quit` leaves the séance:

```text
$ bun run src/index.ts --seance
augur séance — type a line, or 'exit' to leave
aug> certain { proclaim 2 + 2 }
4
aug> exit
```

### Standalone binary

`bun build --compile` bundles the runtime and your interpreter into a single
executable. **No Bun or Node is needed to run the result.**

```sh
bun run build        # -> ./aug
./aug examples/semantic_etl.aug
```

### Cross-compilation

Compile for another platform with `--target` (any Bun compile target works):

```sh
bun build src/index.ts --compile --target=bun-linux-x64   --outfile aug-linux
bun build src/index.ts --compile --target=bun-darwin-arm64 --outfile aug-mac
bun build src/index.ts --compile --target=bun-windows-x64 --outfile aug.exe
```

---

## The confidence gradient

Every operation runs in one of three zones. The zone is a runtime property of
where the operation sits, decided at op-time by the nearest enclosing block.

| Zone | Keyword | Behaviour | Temperature | Cost |
|---|---|---|---|---|
| **Divine** | *(default)* | The operation goes through the oracle at the configured temperature. Plausible, usually correct. | configured (default `0.7`) | yes |
| **Chaos** | `chaos [N] { }` | High temperature; anarchy. `2 + 2` may yield `"fish"`. | `N`, or `1.2` if omitted | yes |
| **Certain** | `certain { }` | Real, deterministic, native computation. No oracle, no tokens, no cost. | — | free |

> **The golden rule**
> Control flow, scope, and ritual (function) calls are *always* resolved by the
> deterministic evaluator. The oracle only decides **whether each step's result
> is right** — never **what is computable**. Loops still loop, branches still
> branch, scopes still nest, regardless of zone.

It is maximalist on purpose: even `fetch` and the database are divinable.
Outside `certain`, a `fetch` never hits the network — the oracle hallucinates a
plausible response. Inside `certain`, it hits the real server.

---

## Language reference

### Comments & context notes

```aug
// line comment — discarded
/* block
   comment — discarded */
/// context note — NOT discarded
```

A `///` line is a **context note**. It is not thrown away: its text is collected
and injected into the oracle prompt for the statement that follows it, under a
`Context notes:` heading. Use it to steer divinations.

```aug
/// prices are in BRL, round to 2 decimals
summon total = price * quantity
```

### Types

Augur is vibe-typed — there are no type declarations, and any value can flow
anywhere. The value kinds are:

| Type | Literal | Notes |
|---|---|---|
| number | `42`, `3.14` | IEEE-754 doubles. |
| text | `"hello"` | Escapes: `\n` `\t` `\r` `\"` `\\`. |
| yes / no | `yes`, `no` | The boolean type. |
| list | `[1, 2, 3]` | Heterogeneous, zero-indexed. |
| map | `{name: "Ana", age: 30}` | Keys are identifiers or strings. |
| naught | `naught` | The absence of a value (null). |
| **oracle** | *(not writable)* | The poison value — see below. |
| ritual | *(via `ritual`)* | First-class function value. |

Indexing reads from lists (by number) and maps (by text); out-of-range or
missing keys yield `naught`:

```aug
summon xs = [10, 20, 30]
proclaim xs[1]          // 20
summon m = {city: "Rio"}
proclaim m["city"]      // Rio
proclaim m["nope"]      // naught
```

#### The oracle poison value

When the oracle **refuses** an operation (it disagrees, returns malformed
output, errors, or hits a type mismatch), the result is a special **oracle**
value. It behaves like a *poison null*: any operation that touches it returns
the oracle value unchanged, so a refusal propagates outward until something
handles it. Booleanly it is false; iterating or calling it is a no-op (with a
whisper to stderr). Catch it with `attempt`/`rescue`.

| Refusal cause | Meaning |
|---|---|
| `RECUSATIO` | The oracle declined the operation. |
| `LECTIO_FALLAX` | The oracle's response could not be read. |
| `ERROR_ORACULI` | The provider call itself errored. |
| `GENUS_DISCORS` | Type mismatch in a native operation. |

### Variables

```aug
summon x = 10     // declare
x = 20            // reassign (must already exist)
forget x          // remove from scope
```

`summon` declares in the current scope; bare `name = expr` reassigns an existing
binding (walking outward through enclosing scopes); `forget` deletes it.
Assigning or forgetting an undefined name is a runtime error.

### Operators

| Group | Operators |
|---|---|
| Arithmetic | `+` `-` `*` `/` `%` `^` |
| Comparison | `==` `!=` `<` `>` `<=` `>=` |
| Logical | `and` `or` `not` |
| Unary | `-` (negate), `not` |

> **Note**
> Binary arithmetic and comparison operators are **divined** outside `certain` —
> sent to the oracle as an operation. Inside `certain` they are computed
> natively. The logical operators `and` / `or` (short-circuiting) and the unary
> operators (`-`, `not`) are **always** native, in every zone.

```aug
proclaim 2 + 2                 // divined — usually 4, sometimes not
certain { proclaim 2 + 2 }     // native — always 4
chaos { proclaim 2 + 2 }       // high temperature — who knows
```

Precedence, lowest to highest: `or` → `and` → `not` → equality → comparison →
`+`/`-` → `*`/`/`/`%` → `^` (right-associative) → unary `-` → call/index →
primary.

### Control flow

**Conditionals** use `when … ->` with optional chained `when` branches and a
final `otherwise`:

```aug
when score > 90 -> proclaim "A"
when score > 80 -> proclaim "B"
otherwise       -> proclaim "C"
```

A branch body is either a single statement after `->` or a `{ }` block. If a
condition divines to an oracle value it is treated as false (with a whisper).

**`while`** loops while the condition is true:

```aug
while x > 0 { x = x - 1 }
```

**`repeat`** runs a fixed number of times, or `forever`:

```aug
repeat 3 { proclaim "again" }
repeat forever {
  summon line = ask "> "
  when line == "stop" -> break
}
```

**`for … in`** iterates a list (or a map's keys):

```aug
for item in [1, 2, 3] { proclaim item }
for key in {a: 1, b: 2} { proclaim key }   // a, b
```

**`break`** and **`continue`** work in all three loop forms.

### Rituals (functions)

Rituals are first-class values. Define one with `ritual`, return with `give`:

```aug
ritual add(a, b) {
  give a + b
}
proclaim add(2, 3)
```

A ritual with no `give` returns `naught`. Rituals close over their defining
scope and can be passed around like any value.

A **divined ritual** has no body — the entire implementation is delegated to the
oracle. Its arguments become the operands; the oracle invents the result:

```aug
ritual sentiment(text) divined
proclaim sentiment("this product is amazing")   // -> e.g. "positive"
```

### The `divine` primitive

`divine` asks the oracle directly. The instruction is a string; an optional
`upon` clause supplies a subject value the instruction operates on:

```aug
summon name   = divine "a plausible Brazilian first name"
summon capital = divine "the capital city" upon "France"
```

`divine "…"` produces a fresh value from the instruction alone;
`divine "…" upon expr` divines *about* `expr`.

Add **`thrice`** to run the divination three times in parallel and return the
**majority** answer — a cheap self-consistency check that cuts down on one-off
hallucinations. It pairs with `upon` and `as`:

```aug
summon mood = divine "the overall sentiment" upon review thrice as text
```

> **Note** — `thrice` costs three oracle calls (and counts three against your
> budget). Use it where reliability matters more than spend — classification,
> extraction, anything you'd otherwise eyeball twice.

### Typed coercion (`as`)

`expr as <type>` coerces a value to a requested shape — the bridge that makes
divined output safe to consume. Coercion is **native** when it can be (no oracle
call), **divined** when it can't, and an **oracle value** inside `certain` when
it's impossible.

| Type | Meaning |
|---|---|
| `number` | a number (`"42" as number` → `42`) |
| `text` | text (anything stringifies) |
| `bool` | `yes`/`no` (by truthiness) |
| `list` / `map` | an untyped list / map |
| `[T]` | a list whose elements are each coerced to `T` |
| `{field: T, …}` | a map validated field-by-field |

```aug
summon age   = ask "your age?" as number          // text input → number
summon user  = divine "a fake user" as {name: text, age: number}
summon scores = divine "five test scores" as [number]

certain { proclaim "hello" as number }            // impossible → <oracle: …>
```

> **Note** — native coercions never call the oracle, so `"42" as number` is free
> and deterministic. Only genuinely fuzzy conversions (`"a dozen" as number`)
> reach the AI.

### Assertions

`believe` asserts a condition. The condition is evaluated and judged for truth
**natively** (truthiness of the value). An optional `because` gives a reason that
appears in the error message:

```aug
believe x > 0
believe email != "" because "an email is required"
```

A failed belief raises an error — `The oracle disagrees — <reason>` — which can
be caught by `attempt`/`rescue`.

**Semantic assertions (`is`).** `believe expr is "description"` asks the oracle
to *judge* whether the value matches a natural-language description — a vibe-test
for fuzzy output. It fails (raising `The oracle disagrees — <description>`) when
the oracle says no. Inside `certain` it degrades to native truthiness.

```aug
believe reply is "polite and on-topic"
believe summary is "under 200 characters and mentions the price"
```

> **Note** — this is how you test LLM-driven output in CI: assert the *shape* and
> *vibe* of a result rather than an exact string. Pair it with `--remember` so
> the judgement is cached and the test stays deterministic.

### Error handling

`attempt { } rescue [as e] { }` runs a block and, on failure, runs the rescue
block. `as e` binds the error as an oracle value whose message is the failure
text. Control-flow signals (`break`/`continue`/`give`) and budget-exceeded
errors are **not** caught — they propagate through.

```aug
attempt {
  believe no because "this always fails"
} rescue as e {
  proclaim e        // <oracle: The oracle disagrees — this always fails>
}
```

Note the two distinct failure mechanisms: an **oracle poison value** flows
through expressions silently until handled; a **thrown error** (a failed
`believe`, an undefined variable, a type error) unwinds to the nearest
`attempt`/`rescue`.

### Zones

`certain { }` forces native, deterministic execution for everything inside —
arithmetic, comparisons, collections, fetch, and the database all become real.

```aug
certain {
  proclaim 2 + 2                 // 4
  proclaim sort [3, 1, 2]        // [1, 2, 3] — native sort
}
```

`chaos [N] { }` cranks the temperature. With no number it uses `1.2`; with a
number it uses exactly that:

```aug
chaos { proclaim 2 + 2 }      // temperature 1.2
chaos 1.8 { proclaim 2 + 2 }  // temperature 1.8 — maximum chaos
```

Zones nest; each block pushes onto a zone stack and pops on exit, so the active
zone is always the innermost enclosing one.

### Semantic collections

Augur's most genuinely useful feature: collection operations whose criterion is
*natural language*, resolved by the oracle.

| Operation | Syntax | Oracle? | Result |
|---|---|---|---|
| `sort` | `sort xs [by "criterion"]` | divined (native in `certain`) | reordered list |
| `filter` | `filter xs by "predicate"` | divined | kept elements |
| `map` | `map xs with "transform"` | divined | transformed list |
| `pick` | `pick xs [by "criterion"]` | divined (first element in `certain`) | one element |
| `classify` | `classify xs into ["a", "b"]` | divined | map of label → list |
| `extract` | `extract "what" from x` | divined | extracted value |
| `count` | `count x` | **native** | length of list/text/map |
| `sum` | `sum xs` | **native** | total of a number list |
| `reverse` | `reverse x` | **native** | reversed list/text |
| `unique` | `unique xs` | **native** | de-duplicated list |

```aug
summon names   = ["ana", "joão", "  MARIA ", "pedro"]
summon cleaned = map names with "trim and title-case"
summon emails  = extract "only valid emails" from "contact: ana@x.com, junk, j@y.org"
summon urgent  = filter ["pay now", "hi", "URGENT: server down"] by "look urgent"
proclaim sort cleaned by "alphabetical order"

summon buckets = classify ["bug report", "thank you", "refund"] into ["complaint", "praise"]
proclaim count [1, 2, 3]          // 3 (native)
```

> **Note**
> The four native ops (`count`, `sum`, `reverse`, `unique`) never call the
> oracle. The semantic ops `filter`, `map`, `classify`, and `extract` *require*
> the oracle and are unavailable inside `certain` (they return an oracle value
> there). `sort` and `pick` degrade gracefully in `certain`: `sort` does a native
> comparison sort and `pick` returns the first element.

### Parallelism (`gather`)

Element-wise collection ops call the oracle once per element, in order. For many
independent calls that's slow — `gather` runs them concurrently instead.

```aug
// a bracketed list of expressions, evaluated in parallel
summon facts = gather [
  divine "the capital of France",
  divine "the capital of Japan",
  divine "the capital of Brazil",
]

// a parallel map / filter / classify (same result and order, just faster)
summon translated = gather map articles with "translate to English"
```

> **Note** — `gather` preserves input order in the result even though the calls
> race. The evaluator is async end-to-end, so this is real concurrency, not a
> trick. Budget and cost still count every call.

### I/O

| Form | Direction | Description |
|---|---|---|
| `ask "prompt"` | in | Read a line from the console; yields text. |
| `proclaim expr` | out | Print to **stdout**. |
| `whisper expr` | out | Print to **stderr**. |
| `read expr` | in | Read a file (path string); yields its text. |
| `write data to path` | out | Write a value to a file path. |

```aug
summon name = ask "What is your name? "
proclaim "Hello, " + name

summon body = read "input.txt"
write body to "output.txt"
whisper "done"        // goes to stderr
```

### HTTP fetch

`fetch url [with { … }]` performs an HTTP request. The optional `with` map
supplies `method`, `body`, and `headers`.

```aug
summon res = fetch "https://api.github.com/users/torvalds"
proclaim extract "the 'name' field" from res
```

> **Note**
> Outside `certain`, `fetch` **never touches the network** — the oracle
> hallucinates a plausible response (status, headers, body). Inside `certain`,
> it performs a **real** request and returns `{status, headers, body}`. A failed
> real request yields an oracle value.

```aug
certain {
  summon real = fetch "https://httpbin.org/get"
  proclaim real          // real status/headers/body
}
```

### HTTP server (`serve`)

`serve <port> with <ritual>` starts a REST server and keeps the process alive.
The handler ritual is called once per request with a **request map** and returns
a **response**.

The request map:

| Key | Value |
|---|---|
| `method` | `"GET"`, `"POST"`, … |
| `path` | the URL path, e.g. `"/notes"` |
| `query` | a map of query-string parameters |
| `headers` | a map of request headers |
| `body` | the raw request body (text) |
| `json` | the body parsed as JSON (a map/list), or `naught` if it isn't JSON |

The response: return `{status, body, headers?}`. A `body` that is text stays
text; a map or list is serialized to JSON automatically. A bare value (not a
map with `status`) becomes a `200`. An oracle value becomes a `500`.

Each request runs on an isolated fork of the evaluator (so concurrent requests
can't leak zones or `///` context into each other), but they **share the
database connection**, so state persists across requests. Routes can be
deterministic (`certain` + the database) or divined.

```aug
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

> **Note** — `serve` requires the Bun runtime (it uses `Bun.serve`); the
> standalone compiled binary serves fine. See `examples/crud_api.aug`.

### The database

A tiny database DSL. Connect once with `commune`, then read and write.

| Statement | Meaning |
|---|---|
| `commune with "url"` | Open/attach a database at the given connection string. |
| `inscribe expr into name` | Insert a value into a collection. |
| `recall "description" from name` | Read matching records from a collection. |
| `revise target with "instruction"` | Apply a natural-language edit. |
| `banish "description" from name` | Delete matching records. |
| `query "question"` | Ask a free-form question of the whole database. |

```aug
commune with "vibes://localhost/store"
inscribe {name: "Ana", balance: 100} into clients
inscribe {name: "Beto", balance: 50} into clients
summon ana = recall "the client named Ana" from clients
revise ana with "double her balance"
proclaim query "who has the highest balance?"
banish "clients with a balance under 60" from clients
proclaim query "list all remaining clients"
```

#### The amnesiac model (outside `certain`)

Outside `certain`, the database is **not** a store — it is a growing text
*journal*. Every `inscribe`, `revise`, and `banish` appends a line; every
`recall`/`query` re-feeds the entire journal to the oracle and asks it to answer.
Consequences, all intentional:

- Persistence is fiction — there are no rows, only a remembered history.
- Two reads of the same thing can disagree.
- When the journal exceeds the **context budget** (`spatiumMemoriae`, ~4000
  "tokens" by default), the **oldest lines are forgotten** to make room. Amnesia
  is a feature.

#### The real engine (inside `certain`)

Inside `certain`, the database talks to a **real engine** — chosen by the URL
scheme of `commune with`. Data actually persists: `inscribe` does an `INSERT`,
`recall` does a `SELECT`, and `query` returns every collection as a map. Each
collection becomes a table with a JSON column; collection names are validated
(`^[A-Za-z_][A-Za-z0-9_]*$`) and identifiers are quoted, so the divined NL never
reaches raw SQL.

| Connection string | Backing engine |
|---|---|
| `"sqlite://./data.db"` | A real SQLite file on disk (`bun:sqlite`). |
| `"sqlite://"` *(empty path)* | An in-memory SQLite database. |
| `"postgres://user:pass@host/db"` / `"postgresql://…"` | PostgreSQL via Bun's built-in `Bun.SQL`. |
| `"mysql://user:pass@host/db"` / `"mariadb://…"` | MySQL / MariaDB via `Bun.SQL`. |
| anything else (e.g. `"vibes://…"`) | Treated as a label; falls back to **in-memory** SQLite in `certain`. |

> **Note** — Postgres and MySQL use Bun's native SQL client, so the standalone
> binary needs no extra npm drivers. If the server is unreachable, the operation
> degrades gracefully to an oracle value (`<oracle: …>`) instead of crashing.

```aug
commune with "postgres://localhost/store"
certain {
  inscribe {name: "Ana", balance: 100} into clients
  proclaim recall "all" from clients     // real INSERT + SELECT, persisted
}
```

---

## Configuration

Configuration can be declared in a header at the top of a `.aug` file. Header
statements are read before the program runs.

| Header | Type | Default | Effect |
|---|---|---|---|
| `oracle "name"` | text | `"fake"` | Which provider to use. |
| `model "id"` | text | per-provider | The model id. |
| `temperature N` | number | `0.7` | Default divination temperature. |
| `budget N` | number | `1000` | Max number of oracle calls before aborting. |

```aug
oracle "anthropic"
model "claude-haiku-4-5"
temperature 0.4
budget 200

proclaim divine "a haiku about determinism"
```

> **Note**
> CLI flags **override** the file header, which overrides the built-in defaults.
> The `temperature` header (and a mid-program `temperature` statement) sets the
> baseline divine temperature; `chaos` overrides it locally.

---

## CLI reference

```text
aug <file.aug | -> [options]      # - reads the program from stdin
```

| Flag | Argument | Description |
|---|---|---|
| `--seance` | — | Start the interactive REPL instead of running a file. |
| `--paranoid` | — | Log every oracle call (operation, temperature, operands, instruction, response, tokens) to stderr. |
| `--quiet` | — | Suppress the end-of-run cost summary (keeps stdout clean for pipes). |
| `--oracle <name>` | `anthropic` \| `openai` \| `openrouter` \| `ollama` \| `fake` | Override the provider. |
| `--model <id>` | model id | Override the model. |
| `--temperature <n>` | number | Override the default temperature. |
| `--budget <n>` | integer | Override the oracle-call ceiling (counts every real attempt, including retries). |
| `--remember` | — | Cache divinations to disk for reproducible, cheaper re-runs. |
| `--remember-file <path>` | path | Cache file path (default `.augur-cache.json`). |
| `--retry <n>` | integer | Retries on a transient oracle error (default 2). |
| `-v, --version` | — | Print the version. |
| `--help` | — | Show usage. |

When a run makes at least one oracle call, a cost summary is printed to stderr at
the end:

```text
You spent R$0.0123 on 4 divination(s) — 512 in / 96 out tokens (claude-haiku-4-5).
```

---

## Providers

| Oracle | Default model | Auth / host | Notes |
|---|---|---|---|
| `anthropic` | `claude-haiku-4-5` | `ANTHROPIC_API_KEY` | Uses tool-calling to return a single typed result. |
| `openai` | `gpt-4o-mini` | `OPENAI_API_KEY` | JSON-object response mode. |
| `openrouter` | `openai/gpt-4o-mini` | `OPENROUTER_API_KEY` | OpenAI-compatible at `https://openrouter.ai/api/v1`; use any vendor/model id (e.g. `anthropic/claude-3.5-haiku`) via `--model`. |
| `ollama` | `llama3.1` | local, `OLLAMA_HOST` (default `http://127.0.0.1:11434`) | Runs 100% on your machine. |
| `fake` | *(none)* | none | Deterministic offline stub used by the test suite. |

> **Note**
> API keys are read from the environment — never hardcoded. The end-of-run cost
> counter is in **BRL** (USD × 5.0). It is priced for `claude-haiku-4-5`,
> `gpt-4o-mini`, and `llama3.1`/`fake` (the latter two priced at 0). Unpriced
> models — including all **OpenRouter** ids — read **R$0**; track real spend on
> your provider's dashboard.

Set the provider via header (`oracle "ollama"`) or flag (`--oracle ollama`):

```sh
bun run src/index.ts app.aug --oracle openrouter --model anthropic/claude-3.5-haiku
ANTHROPIC_API_KEY=sk-... bun run src/index.ts app.aug --oracle anthropic
```

---

## Architecture

Augur is four layers, with a hard wall between the deterministic core and the
oracle:

1. **Deterministic pipeline** — `Lector` (lexer) → `Grammaticus` (parser → AST)
   → `Aestimator` (tree-walking evaluator). Scope, control flow, and ritual
   dispatch never consult the oracle.
2. **Zone stack** — `PilaZonarum` tracks the active zone (`Divinus` / `Chaos` /
   `Certus`) per block, deciding whether each operation is divined, divined-hot,
   or computed natively.
3. **Provider layer** — every backend implements a single `Oraculum.divina()`
   interface. A `Aerarium` (budget) wrapper enforces the call ceiling and tallies
   tokens; a `Diarium` (paranoid log) wrapper traces each call. The `fake`
   oracle makes the whole suite run offline.
4. **Native builtins** — `Bancus` (database), `affer` (fetch), collection ops,
   and file/console I/O. These run real code in `certain` and delegate to the
   oracle otherwise.

> **Note**
> Implementation identifiers are written in **Latin** (the *augur* theme — a
> Roman priest who divined: `Lector`, `Grammaticus`, `Aestimator`, `Bancus`,
> `Oraculum`, `nomen`, `valor`, `linea`, `columna`). The `.aug` language keywords
> and all user-facing text (errors, CLI, output) are in **English**.

---

## Testing & development

```sh
bun run typecheck    # tsc --noEmit (strict)
bun run test         # vitest run — fully offline on the fake oracle, no network
bun run build        # standalone binary
```

The test suite uses the `fake` oracle exclusively, so it is deterministic, free,
and never touches the network. Always run `bun run typecheck` and the relevant
test file after a change.

---

## FAQ

**Why are answers nondeterministic?**
Because outside `certain` they come from an LLM at a non-zero temperature. That
is the entire premise. For determinism, wrap the operation in `certain { }`,
which uses real native computation.

**Is caching on?**
Off by default — every divined operation is a fresh oracle call, which is why the
same expression can yield different values across runs. Pass `--remember` to
memoize divinations to `.augur-cache.json` (a real result cache): re-running the
same program then replays cached answers for reproducible, zero-token output.
`thrice` still samples independently the first time (each vote is cached under its
own key), so it stays a real majority vote while remaining replayable.

**Does it cost money?**
Only when you point at a paid provider (`anthropic`, `openai`, some `openrouter`
models) and run operations outside `certain`. The `fake` and `ollama` oracles
are free; `certain` blocks cost nothing. A BRL cost summary prints at the end of
any run that made oracle calls, and `--budget` caps the number of calls.

**How does the database "forget"?**
Outside `certain`, the database is a growing text journal that is re-fed to the
oracle on every read. When the journal exceeds the context budget
(`spatiumMemoriae`, ~4000 tokens), the oldest lines are dropped to fit — so old
records silently vanish. Inside `certain`, a real engine (SQLite, PostgreSQL, or MySQL) is used and
nothing is forgotten.
