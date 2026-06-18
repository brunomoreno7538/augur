import { writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = dirname(fileURLToPath(import.meta.url))
const OUT = join(ROOT, "docs")
const GH = "https://github.com/bruneno/augur"

const escAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const aug = (code) => `<pre><code class="aug">${esc(code.replace(/^\n/, "").replace(/\s+$/, ""))}</code></pre>`
const sh = (code) => `<pre><code class="sh">${esc(code.replace(/^\n/, "").replace(/\s+$/, ""))}</code></pre>`
const note = (html, warn) => `<div class="note${warn ? " warn" : ""}">${html}</div>`
const tbl = (head, rows) =>
  `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>` +
  rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("") +
  `</tbody></table>`

const C = `<code>`, _C = `</code>`
const c = (s) => `<code>${esc(s)}</code>`

const CHAPTERS = [
  {
    group: "Getting Started", slug: "introduction", title: "Introduction",
    body: `
<p class="lede">Augur is a small, real programming language with one twist: the interpreter is 100% deterministic, but the <em>operations themselves</em> are divined by an LLM instead of computed.</p>
<p>Lexer, parser, scope, control flow, and function calls are an ordinary, deterministic tree-walking evaluator. But the operations — arithmetic, comparison, collection transforms, even HTTP and the database — descend to an <strong>oracle</strong> (an LLM) that decides what the result should be. A meme premise on a serious architecture. ${c("2 + 2")} is whatever the oracle says it is — unless you wrap it in ${c("certain { }")}, where it is real, native, free, and always ${c("4")}.</p>
${aug(`oracle "anthropic"

summon secret = divine "pick a random number from 1 to 100"
summon guess  = ask "Your guess: "

when guess == secret -> proclaim "You got it!"
otherwise            -> proclaim "Try again."`)}
<h2>The premise</h2>
<p>Every operation runs in one of three <strong>zones</strong> on a confidence gradient: <code>divine</code> (the default — through the AI), <code>chaos</code> (high temperature, anarchy), and <code>certain</code> (real, native, deterministic). The golden rule: control flow and scope are always deterministic; the oracle only decides whether each step's result is right, never what is computable.</p>
${note(`<strong>It's a joke about LLM-driven software</strong> — do not deploy it. But the genuinely-useful 20% (semantic <code>filter</code>/<code>extract</code>/<code>classify</code>, typed coercion, vibe-tests) turns out to be handy.`)}
<h2>Next</h2>
<p>Head to <a href="installation.html">Installation</a> to get it running, then <a href="confidence-gradient.html">The Confidence Gradient</a> for the core idea.</p>`,
  },
  {
    group: "Getting Started", slug: "installation", title: "Installation & Running",
    body: `
<p class="lede">Augur is built on <a href="https://bun.sh" target="_blank" rel="noopener">Bun</a> (<code>&gt;= 1.3.0</code>). For development you need Bun; to <em>run</em> a compiled binary you need nothing at all.</p>
${sh(`bun install
bun run src/index.ts <file.aug> [options]`)}
${tbl(["Command", "What it does"], [
  [c("bun run src/index.ts file.aug"), "Run a program."],
  [c("bun run src/index.ts --seance"), "Start the interactive REPL."],
  [c("bun run build"), "Compile a standalone binary <code>./aug</code>."],
  [c("bun run typecheck"), "<code>tsc --noEmit</code> (Bun does not type-check on its own)."],
  [c("bun run test"), "Run the vitest suite (offline, on the fake oracle)."],
])}
<h2>The REPL (séance)</h2>
<p>Type one line at a time; <code>exit</code> or <code>quit</code> leaves the séance.</p>
${sh(`$ bun run src/index.ts --seance
augur séance - type a line, or 'exit' to leave
aug> certain { proclaim 2 + 2 }
4
aug> exit`)}
<h2>Standalone binary</h2>
<p><code>bun build --compile</code> bundles the runtime and the interpreter into a single executable. No Bun or Node is needed to run the result.</p>
${sh(`bun run build        # -> ./aug
./aug examples/semantic_etl.aug`)}
<h3>Cross-compilation</h3>
${sh(`bun build src/index.ts --compile --target=bun-linux-x64    --outfile aug-linux
bun build src/index.ts --compile --target=bun-darwin-arm64 --outfile aug-mac
bun build src/index.ts --compile --target=bun-windows-x64  --outfile aug.exe`)}
${note(`The default oracle is <code>fake</code> — a deterministic, offline stub used by the test suite. Programs run with no API key and no network. Point at a real provider with <code>oracle "anthropic"</code> in the file or <code>--oracle anthropic</code> on the CLI.`)}`,
  },
  {
    group: "Language", slug: "confidence-gradient", title: "The Confidence Gradient",
    body: `
<p class="lede">Every operation runs in one of three zones. The zone is a runtime property of where the operation sits, decided at op-time by the nearest enclosing block.</p>
${tbl(["Zone", "Keyword", "Behaviour", "Cost"], [
  ["<strong>Divine</strong>", "<em>(default)</em>", "Through the oracle at the configured temperature. Plausible, usually correct.", "yes"],
  ["<strong>Chaos</strong>", c("chaos [N] { }"), "High temperature; anarchy. <code>2 + 2</code> may yield <code>\"fish\"</code>.", "yes"],
  ["<strong>Certain</strong>", c("certain { }"), "Real, deterministic, native computation. No oracle, no tokens.", "free"],
])}
${note(`<strong>The golden rule.</strong> Control flow, scope, and ritual calls are <em>always</em> resolved by the deterministic evaluator. The oracle only decides <strong>whether each step's result is right</strong> — never <strong>what is computable</strong>. Loops still loop, branches still branch, scopes still nest, regardless of zone.`)}
<p>It is maximalist on purpose: even <code>fetch</code> and the database are divinable. Outside <code>certain</code>, a <code>fetch</code> never hits the network — the oracle hallucinates a plausible response. Inside <code>certain</code>, it hits the real server.</p>
${aug(`proclaim 2 + 2                 // divined - usually 4, sometimes not
certain { proclaim 2 + 2 }     // native - always 4
chaos { proclaim 2 + 2 }       // high temperature - who knows`)}
<p>Zones nest; each block pushes onto a zone stack and pops on exit, so the active zone is always the innermost enclosing one. <code>chaos</code> with no number uses temperature <code>1.2</code>; <code>chaos 1.8</code> uses exactly that.</p>`,
  },
  {
    group: "Language", slug: "types", title: "Values & Types",
    body: `
<p class="lede">Augur is vibe-typed — there are no type declarations, and any value can flow anywhere.</p>
${tbl(["Type", "Literal", "Notes"], [
  ["number", c("42, 3.14"), "IEEE-754 doubles."],
  ["text", c('"hello"'), "Escapes: <code>\\n \\t \\r \\\" \\\\</code>."],
  ["yes / no", c("yes, no"), "The boolean type."],
  ["list", c("[1, 2, 3]"), "Heterogeneous, zero-indexed."],
  ["map", c('{name: "Ana", age: 30}'), "Keys are identifiers or strings."],
  ["naught", c("naught"), "The absence of a value (null)."],
  ["<strong>oracle</strong>", "<em>(not writable)</em>", "The poison value — see below."],
  ["ritual", "<em>(via <code>ritual</code>)</em>", "First-class function value."],
])}
<p>Indexing reads from lists (by number) and maps (by text); out-of-range or missing keys yield <code>naught</code>:</p>
${aug(`summon xs = [10, 20, 30]
proclaim xs[1]          // 20
summon m = {city: "Rio"}
proclaim m["city"]      // Rio
proclaim m["nope"]      // naught`)}
<h2>The oracle poison value</h2>
<p>When the oracle <strong>refuses</strong> an operation (it disagrees, returns malformed output, errors, or hits a type mismatch), the result is a special <strong>oracle</strong> value. It behaves like a <em>poison null</em>: any operation that touches it returns the oracle value unchanged, so a refusal propagates outward until something handles it. Booleanly it is false; iterating or calling it is a no-op (with a whisper to stderr). Catch it with <a href="errors.html"><code>attempt</code>/<code>rescue</code></a>.</p>
${tbl(["Refusal cause", "Meaning"], [
  [c("RECUSATIO"), "The oracle declined the operation."],
  [c("LECTIO_FALLAX"), "The oracle's response could not be read."],
  [c("ERROR_ORACULI"), "The provider call itself errored."],
  [c("GENUS_DISCORS"), "Type mismatch in a native operation."],
])}`,
  },
  {
    group: "Language", slug: "variables-control-flow", title: "Variables & Control Flow",
    body: `
<h2>Variables</h2>
${aug(`summon x = 10     // declare
x = 20            // reassign (must already exist)
forget x          // remove from scope`)}
<p><code>summon</code> declares in the current scope; bare <code>name = expr</code> reassigns an existing binding (walking outward through enclosing scopes); <code>forget</code> deletes it. Assigning or forgetting an undefined name is a runtime error.</p>
<h2>Conditionals</h2>
<p>Use <code>when … -&gt;</code> with optional chained <code>when</code> branches and a final <code>otherwise</code>:</p>
${aug(`when score > 90 -> proclaim "A"
when score > 80 -> proclaim "B"
otherwise       -> proclaim "C"`)}
<p>A branch body is either a single statement after <code>-&gt;</code> or a <code>{ }</code> block. If a condition divines to an oracle value it is treated as false (with a whisper).</p>
<h2>Loops</h2>
${aug(`while x > 0 { x = x - 1 }

repeat 3 { proclaim "again" }
repeat forever {
  summon line = ask "> "
  when line == "stop" -> break
}

for item in [1, 2, 3] { proclaim item }
for key in {a: 1, b: 2} { proclaim key }   // a, b`)}
<p><code>for … in</code> iterates a list (or a map's keys). <code>break</code> and <code>continue</code> work in all three loop forms.</p>`,
  },
  {
    group: "Language", slug: "operators", title: "Operators",
    body: `
${tbl(["Group", "Operators"], [
  ["Arithmetic", c("+  -  *  /  %  ^")],
  ["Comparison", c("==  !=  <  >  <=  >=")],
  ["Logical", c("and  or  not")],
  ["Unary", "<code>-</code> (negate), <code>not</code>"],
])}
${note(`Binary arithmetic and comparison operators are <strong>divined</strong> outside <code>certain</code> — sent to the oracle as an operation. Inside <code>certain</code> they are computed natively. The logical operators <code>and</code>/<code>or</code> (short-circuiting) and the unary operators are <strong>always</strong> native, in every zone.`)}
${aug(`proclaim 2 + 2                 // divined - usually 4, sometimes not
certain { proclaim 2 + 2 }     // native - always 4`)}
<p>Precedence, lowest to highest: <code>or</code> → <code>and</code> → <code>not</code> → equality → comparison → <code>+</code>/<code>-</code> → <code>*</code>/<code>/</code>/<code>%</code> → <code>^</code> (right-associative) → unary <code>-</code> → call/index → primary.</p>`,
  },
  {
    group: "Language", slug: "rituals", title: "Rituals (Functions)",
    body: `
<p class="lede">Rituals are first-class values. Define one with <code>ritual</code>, return with <code>give</code>.</p>
${aug(`ritual add(a, b) {
  give a + b
}
proclaim add(2, 3)`)}
<p>A ritual with no <code>give</code> returns <code>naught</code>. Rituals close over their defining scope and can be passed around like any value.</p>
<h2>Divined rituals</h2>
<p>A <strong>divined ritual</strong> has no body — the entire implementation is delegated to the oracle. Its arguments become the operands; the oracle invents the result:</p>
${aug(`ritual sentiment(text) divined
proclaim sentiment("this product is amazing")   // -> e.g. "positive"`)}
${note(`When a ritual is called, the callee being an oracle value propagates; but an oracle <em>argument</em> binds to the parameter (it does not poison the call) so the body can inspect it with <code>attempt</code>.`)}`,
  },
  {
    group: "Language", slug: "divination", title: "The divine Primitive",
    body: `
<p class="lede"><code>divine</code> asks the oracle directly. The instruction is a string; an optional <code>upon</code> clause supplies a subject value the instruction operates on.</p>
${aug(`summon name    = divine "a plausible Brazilian first name"
summon capital = divine "the capital city" upon "France"`)}
<p><code>divine "…"</code> produces a fresh value from the instruction alone; <code>divine "…" upon expr</code> divines <em>about</em> <code>expr</code>.</p>
<h2>Self-consistency with thrice</h2>
<p>Add <code>thrice</code> to run the divination three times in parallel and return the <strong>majority</strong> answer — a cheap self-consistency check that cuts down on one-off hallucinations. It pairs with <code>upon</code> and <code>as</code>:</p>
${aug(`summon mood = divine "the overall sentiment" upon review thrice as text`)}
${note(`<code>thrice</code> costs three oracle calls (and counts three against your budget). Use it where reliability matters more than spend — classification, extraction, anything you'd otherwise eyeball twice.`)}`,
  },
  {
    group: "Language", slug: "coercion", title: "Typed Coercion (as)",
    body: `
<p class="lede"><code>expr as &lt;type&gt;</code> coerces a value to a requested shape — the bridge that makes divined output safe to consume. Coercion is <strong>native</strong> when it can be, <strong>divined</strong> when it can't, and an <strong>oracle value</strong> inside <code>certain</code> when it's impossible.</p>
${tbl(["Type", "Meaning"], [
  [c("number"), 'a number (<code>"42" as number</code> → <code>42</code>)'],
  [c("text"), "text (anything stringifies)"],
  [c("bool"), "<code>yes</code>/<code>no</code> (by truthiness)"],
  ["<code>list</code> / <code>map</code>", "an untyped list / map"],
  [c("[T]"), "a list whose elements are each coerced to <code>T</code>"],
  [c("{field: T, …}"), "a map validated field-by-field"],
])}
${aug(`summon age    = ask "your age?" as number          // text input -> number
summon user   = divine "a fake user" as {name: text, age: number}
summon scores = divine "five test scores" as [number]

certain { proclaim "hello" as number }            // impossible -> <oracle: ...></code></pre>`.replace("</code></pre>",""))}
${note(`Native coercions never call the oracle, so <code>"42" as number</code> is free and deterministic. Only genuinely fuzzy conversions (<code>"a dozen" as number</code>) reach the AI. This is what makes divined output safe to use.`)}`,
  },
  {
    group: "Language", slug: "collections", title: "Semantic Collections",
    body: `
<p class="lede">Augur's most genuinely useful feature: collection operations whose criterion is <em>natural language</em>, resolved by the oracle.</p>
${tbl(["Operation", "Syntax", "Oracle?"], [
  [c("sort"), c('sort xs [by "criterion"]'), "divined (native in <code>certain</code>)"],
  [c("filter"), c('filter xs by "predicate"'), "divined"],
  [c("map"), c('map xs with "transform"'), "divined"],
  [c("pick"), c('pick xs [by "criterion"]'), "divined (first in <code>certain</code>)"],
  [c("classify"), c('classify xs into ["a","b"]'), "divined"],
  [c("extract"), c('extract "what" from x'), "divined"],
  [c("count"), c("count x"), "<strong>native</strong>"],
  [c("sum"), c("sum xs"), "<strong>native</strong>"],
  [c("reverse"), c("reverse x"), "<strong>native</strong>"],
  [c("unique"), c("unique xs"), "<strong>native</strong>"],
])}
${aug(`summon names   = ["ana", "joão", "  MARIA ", "pedro"]
summon cleaned = map names with "trim and title-case"
summon emails  = extract "only valid emails" from "contact: ana@x.com, junk, j@y.org"
summon urgent  = filter ["pay now", "hi", "URGENT: server down"] by "look urgent"
proclaim sort cleaned by "alphabetical order"

summon buckets = classify ["bug report", "thank you", "refund"] into ["complaint", "praise"]
proclaim count [1, 2, 3]          // 3 (native)`)}
${note(`The four native ops never call the oracle. <code>filter</code>/<code>map</code>/<code>classify</code>/<code>extract</code> require the oracle and return an oracle value inside <code>certain</code>. <code>sort</code> and <code>pick</code> degrade gracefully in <code>certain</code>: a native comparison sort and the first element.`)}
<h2>Parallelism (gather)</h2>
<p>Element-wise collection ops call the oracle once per element, in order. For many independent calls that's slow — <code>gather</code> runs them concurrently instead, preserving input order.</p>
${aug(`summon facts = gather [
  divine "the capital of France",
  divine "the capital of Japan",
  divine "the capital of Brazil",
]

summon translated = gather map articles with "translate to English"`)}`,
  },
  {
    group: "Language", slug: "errors", title: "Assertions & Error Handling",
    body: `
<h2>Assertions (believe)</h2>
<p><code>believe</code> asserts a condition, judged for truth <strong>natively</strong>. An optional <code>because</code> gives a reason that appears in the error message:</p>
${aug(`believe x > 0
believe email != "" because "an email is required"`)}
<p>A failed belief raises <code>The oracle disagrees - &lt;reason&gt;</code>, catchable by <code>attempt</code>/<code>rescue</code>.</p>
<h2>Vibe-tests (is)</h2>
<p><code>believe expr is "description"</code> asks the oracle to <em>judge</em> whether the value matches a natural-language description — a vibe-test for fuzzy output. Inside <code>certain</code> it degrades to native truthiness.</p>
${aug(`believe reply is "polite and on-topic"
believe summary is "under 200 characters and mentions the price"`)}
${note(`This is how you test LLM-driven output in CI: assert the <em>shape</em> and <em>vibe</em> of a result rather than an exact string. Pair it with <code>--remember</code> so the judgement is cached and the test stays deterministic.`)}
<h2>attempt / rescue</h2>
<p><code>attempt { } rescue [as e] { }</code> runs a block and, on failure, runs the rescue block. <code>as e</code> binds the error as an oracle value. Control-flow signals (<code>break</code>/<code>continue</code>/<code>give</code>) and budget-exceeded errors are <strong>not</strong> caught — they propagate.</p>
${aug(`attempt {
  believe no because "this always fails"
} rescue as e {
  proclaim e        // <oracle: The oracle disagrees - this always fails>
}`)}
<p>Two distinct failure mechanisms: an <strong>oracle poison value</strong> flows through expressions silently until handled; a <strong>thrown error</strong> (a failed <code>believe</code>, an undefined variable, a type error) unwinds to the nearest <code>attempt</code>/<code>rescue</code>.</p>`,
  },
  {
    group: "Standard Library", slug: "io", title: "Input & Output",
    body: `
${tbl(["Form", "Direction", "Description"], [
  [c('ask "prompt"'), "in", "Read a line from the console; yields text."],
  [c("proclaim expr"), "out", "Print to <strong>stdout</strong>."],
  [c("whisper expr"), "out", "Print to <strong>stderr</strong>."],
  [c("read expr"), "in", "Read a file (path string); yields its text."],
  [c("write data to path"), "out", "Write a value to a file path."],
])}
${aug(`summon name = ask "What is your name? "
proclaim "Hello, " + name

summon body = read "input.txt"
write body to "output.txt"
whisper "done"        // goes to stderr`)}
<p><code>read</code> and <code>write</code> are always native (real files), in every zone.</p>`,
  },
  {
    group: "Standard Library", slug: "http", title: "HTTP: fetch & serve",
    body: `
<h2>fetch</h2>
<p><code>fetch url [with { … }]</code> performs an HTTP request. The optional <code>with</code> map supplies <code>method</code>, <code>body</code>, and <code>headers</code>.</p>
${aug(`summon res = fetch "https://api.github.com/users/torvalds"
proclaim extract "the 'name' field" from res`)}
${note(`Outside <code>certain</code>, <code>fetch</code> <strong>never touches the network</strong> — the oracle hallucinates a plausible response. Inside <code>certain</code>, it performs a <strong>real</strong> request and returns <code>{status, headers, body}</code>. A failed real request yields an oracle value.`)}
<h2>serve</h2>
<p><code>serve &lt;port&gt; with &lt;ritual&gt;</code> starts a REST server and keeps the process alive. The handler ritual is called once per request with a <strong>request map</strong> and returns a <strong>response</strong>.</p>
${tbl(["Request key", "Value"], [
  [c("method"), '<code>"GET"</code>, <code>"POST"</code>, …'],
  [c("path"), 'the URL path, e.g. <code>"/notes"</code>'],
  [c("query"), "a map of query-string parameters"],
  [c("headers"), "a map of request headers"],
  [c("body"), "the raw request body (text)"],
  [c("json"), "the body parsed as JSON, or <code>naught</code>"],
])}
<p>Return <code>{status, body, headers?}</code>. A text <code>body</code> stays text; a map/list is serialized to JSON. A bare value becomes a <code>200</code>; an oracle value becomes a <code>500</code>.</p>
${aug(`ritual handle(req) {
  certain {
    commune with "sqlite://./notes.db"
    when req["method"] == "POST" and req["path"] == "/notes" -> {
      inscribe req["json"] into notes
      give {status: 201, body: {created: req["json"]}}
    }
    when req["method"] == "GET" and req["path"] == "/notes" ->
      give {status: 200, body: recall "all" from notes}
  }
  when req["path"] == "/fortune" -> give {status: 200, body: divine "a techie fortune cookie"}
  give {status: 404, body: {error: "not found"}}
}

serve 8787 with handle`)}
${note(`Each request runs on an isolated fork of the evaluator, so concurrent requests can't leak <strong>zones</strong> or <code>///</code> context. Module-scope state is <strong>shared</strong> by design: top-level variables and DB connections (pooled by connection string) persist across requests — that's what makes a CRUD work.`)}`,
  },
  {
    group: "Standard Library", slug: "database", title: "The Database",
    body: `
<p class="lede">A tiny database DSL. Connect once with <code>commune</code>, then read and write.</p>
${tbl(["Statement", "Meaning"], [
  [c('commune with "url"'), "Open/attach a database at the connection string."],
  [c("inscribe expr into name"), "Insert a value into a collection."],
  [c('recall "description" from name'), "Read matching records from a collection."],
  [c('revise target with "instruction"'), "Apply a natural-language edit."],
  [c('banish "description" from name'), "Delete matching records."],
  [c('query "question"'), "Ask a free-form question of the whole database."],
])}
${aug(`commune with "vibes://localhost/store"
inscribe {name: "Ana", balance: 100} into clients
inscribe {name: "Beto", balance: 50} into clients
summon ana = recall "the client named Ana" from clients
revise ana with "double her balance"
proclaim query "who has the highest balance?"
banish "clients with a balance under 60" from clients
proclaim query "list all remaining clients"`)}
<h2>The amnesiac model (outside certain)</h2>
<p>Outside <code>certain</code>, the database is <strong>not</strong> a store — it is a growing text <em>journal</em>. Every write appends a line; every read re-feeds the entire journal to the oracle. Consequences, all intentional:</p>
<ul>
<li>Persistence is fiction — there are no rows, only a remembered history.</li>
<li>Two reads of the same thing can disagree.</li>
<li>When the journal exceeds the context budget (<code>spatiumMemoriae</code>, ~4000 tokens), the <strong>oldest lines are forgotten</strong>. Amnesia is a feature.</li>
</ul>
<h2>The real engine (inside certain)</h2>
<p>Inside <code>certain</code>, the database talks to a <strong>real engine</strong> chosen by the URL scheme. Data persists: <code>inscribe</code> does an <code>INSERT</code>, <code>recall</code> a <code>SELECT</code>. <code>revise</code>/<code>banish</code> are not supported in <code>certain</code> (the real store is append-only) and raise an explicit error.</p>
${tbl(["Connection string", "Backing engine"], [
  [c('"sqlite://./data.db"'), "A real SQLite file (<code>bun:sqlite</code>)."],
  [c('"sqlite://"'), "An in-memory SQLite database."],
  [c('"postgres://…"'), "PostgreSQL via Bun's built-in <code>Bun.SQL</code>."],
  [c('"mysql://…"'), "MySQL / MariaDB via <code>Bun.SQL</code>."],
  [c('"vibes://…"'), "Any other scheme → in-memory SQLite in <code>certain</code>."],
])}
${note(`Postgres and MySQL use Bun's native SQL client, so the standalone binary needs no extra npm drivers. Collection names are validated and identifiers quoted, so the divined NL never reaches raw SQL.`)}`,
  },
  {
    group: "Standard Library", slug: "modules", title: "Modules & Context Notes",
    body: `
<h2>Modules (include)</h2>
<p><code>include "path/to/file.aug"</code> runs another file's top-level statements into the current scope, so its rituals and <code>summon</code>s become available — the way to split a program across files. Paths resolve from the working directory, and a given file is included at most once (cycles are safe).</p>
${aug(`include "lib/hash.aug"        // defines ritual hash(...)
include "lib/store.aug"       // defines ritual store()
proclaim hash("hunter2")`)}
<h2>Comments & context notes</h2>
${aug(`// line comment - discarded
/* block
   comment - discarded */
/// context note - NOT discarded`)}
<p>A <code>///</code> line is a <strong>context note</strong>. Its text is collected and injected into the oracle prompt for the statement that follows it, under a <code>Context notes:</code> heading. Use it to steer divinations.</p>
${aug(`/// prices are in BRL, round to 2 decimals
summon total = price * quantity`)}`,
  },
  {
    group: "Tooling", slug: "configuration-cli", title: "Configuration & CLI",
    body: `
<h2>Configuration header</h2>
<p>Configuration can be declared in a header at the top of a <code>.aug</code> file, read before the program runs.</p>
${tbl(["Header", "Default", "Effect"], [
  [c('oracle "name"'), c('"fake"'), "Which provider to use."],
  [c('model "id"'), "per-provider", "The model id."],
  [c("temperature N"), c("0.7"), "Default divination temperature."],
  [c("budget N"), c("1000"), "Max oracle calls before aborting."],
])}
${aug(`oracle "anthropic"
model "claude-haiku-4-5"
temperature 0.4
budget 200

proclaim divine "a haiku about determinism"`)}
${note(`CLI flags <strong>override</strong> the file header, which overrides the built-in defaults.`)}
<h2>CLI reference</h2>
${sh(`aug <file.aug | -> [options]      # - reads the program from stdin`)}
${tbl(["Flag", "Description"], [
  [c("--seance"), "Start the interactive REPL."],
  [c("--paranoid"), "Log every oracle call (operation, operands, response, tokens) to stderr."],
  [c("--quiet"), "Suppress the end-of-run cost summary."],
  [c("--oracle <name>"), "anthropic | openai | openrouter | ollama | fake."],
  [c("--model <id>"), "Override the model."],
  [c("--temperature <n>"), "Override the default temperature."],
  [c("--budget <n>"), "Override the oracle-call ceiling."],
  [c("--remember"), "Cache divinations to disk for reproducible, cheaper re-runs."],
  [c("--remember-file <path>"), "Cache file path (default <code>.augur-cache.json</code>)."],
  [c("--retry <n>"), "Retries on a transient oracle error (default 2)."],
  [c("-v, --version"), "Print the version."],
])}
<p>When a run makes at least one oracle call, a cost summary is printed to stderr:</p>
${sh(`You spent R$0.0123 on 4 divination(s) - 512 in / 96 out tokens (claude-haiku-4-5).`)}`,
  },
  {
    group: "Tooling", slug: "providers", title: "Providers",
    body: `
${tbl(["Oracle", "Default model", "Auth / host"], [
  [c("anthropic"), c("claude-haiku-4-5"), c("ANTHROPIC_API_KEY")],
  [c("openai"), c("gpt-4o-mini"), c("OPENAI_API_KEY")],
  [c("openrouter"), c("openai/gpt-4o-mini"), "<code>OPENROUTER_API_KEY</code> — OpenAI-compatible; any vendor/model id via <code>--model</code>."],
  [c("ollama"), c("llama3.1"), "local, <code>OLLAMA_HOST</code> — runs 100% on your machine."],
  [c("fake"), "<em>(none)</em>", "Deterministic offline stub used by the test suite."],
])}
${note(`API keys are read from the environment — never hardcoded. The end-of-run cost counter is in <strong>BRL</strong> (USD × 5.0), priced for <code>claude-haiku-4-5</code>, <code>gpt-4o-mini</code>, and <code>llama3.1</code>/<code>fake</code> (priced at 0). Other models — including most OpenRouter ids — read R$0; track real spend on your provider's dashboard.`)}
${sh(`bun run src/index.ts app.aug --oracle openrouter --model anthropic/claude-3.5-haiku
ANTHROPIC_API_KEY=sk-... bun run src/index.ts app.aug --oracle anthropic`)}`,
  },
  {
    group: "Tooling", slug: "architecture", title: "Architecture",
    body: `
<p class="lede">Augur is four layers, with a hard wall between the deterministic core and the oracle.</p>
<ol>
<li><strong>Deterministic pipeline</strong> — <code>Lector</code> (lexer) → <code>Grammaticus</code> (parser → AST) → <code>Aestimator</code> (tree-walking evaluator). Scope, control flow, and ritual dispatch never consult the oracle.</li>
<li><strong>Zone stack</strong> — <code>PilaZonarum</code> tracks the active zone per block, deciding whether each operation is divined, divined-hot, or computed natively.</li>
<li><strong>Provider layer</strong> — every backend implements a single <code>Oraculum.divina()</code> interface. An <code>Aerarium</code> (budget) wrapper enforces the call ceiling and tallies tokens; a <code>Diarium</code> (paranoid log) traces each call. The <code>fake</code> oracle makes the whole suite run offline.</li>
<li><strong>Native builtins</strong> — <code>Bancus</code> (database), <code>affer</code> (fetch), collection ops, and file/console I/O. These run real code in <code>certain</code> and delegate otherwise.</li>
</ol>
${note(`Implementation identifiers are written in <strong>Latin</strong> (the <em>augur</em> theme — a Roman priest who divined: <code>Lector</code>, <code>Grammaticus</code>, <code>Aestimator</code>, <code>Bancus</code>, <code>Oraculum</code>). The <code>.aug</code> keywords and all user-facing text are in <strong>English</strong>.`)}
<p>The evaluator is async end-to-end (every operation can <code>await</code> the oracle), so <code>gather</code> and per-request <code>serve</code> forks are real concurrency. The test suite uses the <code>fake</code> oracle exclusively, so it is deterministic, free, and never touches the network.</p>`,
  },
  {
    group: "Examples", slug: "examples", title: "Examples",
    body: `
<p class="lede">Every example runs offline with <code>--oracle fake</code>, or against a real oracle to let chaos in. Browse them in the <a href="${GH}/tree/main/examples" target="_blank" rel="noopener">repository</a>.</p>
${tbl(["Program", "What it shows"], [
  [`<a href="${GH}/blob/main/examples/calculator.aug" target="_blank" rel="noopener">calculator.aug</a>`, "A calculator in pure Augur: exact native math in <code>certain</code>, plus a divined natural-language mode."],
  [`<a href="${GH}/blob/main/examples/guess.aug" target="_blank" rel="noopener">guess.aug</a>`, "Number-guessing game — <code>repeat forever</code>, <code>ask</code>, <code>when</code>/<code>otherwise</code>."],
  [`<a href="${GH}/blob/main/examples/semantic_etl.aug" target="_blank" rel="noopener">semantic_etl.aug</a>`, "Semantic <code>map</code>/<code>extract</code>/<code>filter</code>/<code>sort</code> — the genuinely useful part."],
  [`<a href="${GH}/blob/main/examples/triage.aug" target="_blank" rel="noopener">triage.aug</a>`, "Support-desk triager — <code>gather</code>, <code>thrice</code>, typed extraction."],
  [`<a href="${GH}/blob/main/examples/crud_api.aug" target="_blank" rel="noopener">crud_api.aug</a>`, "A persistent REST CRUD over SQLite with <code>serve</code>, plus a divined route."],
  [`<a href="${GH}/blob/main/examples/crud_llm.aug" target="_blank" rel="noopener">crud_llm.aug</a>`, "A fully-divined CRUD where every route hits the oracle."],
  [`<a href="${GH}/blob/main/examples/amnesiac_db.aug" target="_blank" rel="noopener">amnesiac_db.aug</a>`, "The amnesiac database, the meme taken to its limit."],
  [`<a href="${GH}/blob/main/examples/http_mock.aug" target="_blank" rel="noopener">http_mock.aug</a>`, "Hallucinated <code>fetch</code> vs. a real one inside <code>certain</code>."],
])}
<p>There is also a separate <a href="${GH}-auth-demo" target="_blank" rel="noopener">augur-auth-demo</a> — a user/password auth API written almost entirely in <code>divine</code>, backed by real MySQL. A joke about LLM software; do not deploy it.</p>`,
  },
]

const GROUPS = ["Getting Started", "Language", "Standard Library", "Tooling", "Examples"]

function sidebar(activeSlug) {
  return GROUPS.map((g) => {
    const items = CHAPTERS.filter((ch) => ch.group === g)
    return `<div class="group"><div class="group-label">${g}</div>` +
      items.map((ch) => `<a href="${ch.slug}.html" class="${ch.slug === activeSlug ? "active" : ""}">${ch.title}</a>`).join("") +
      `</div>`
  }).join("")
}

function pager(i) {
  const prev = CHAPTERS[i - 1], next = CHAPTERS[i + 1]
  const p = prev ? `<a href="${prev.slug}.html"><span class="dir">← Previous</span><span class="ttl">${prev.title}</span></a>` : `<span style="flex:1"></span>`
  const n = next ? `<a class="next" href="${next.slug}.html"><span class="dir">Next →</span><span class="ttl">${next.title}</span></a>` : `<span style="flex:1"></span>`
  return `<div class="pager">${p}${n}</div>`
}

function page(ch, i) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escAttr(ch.title)} · Augur docs</title>
<meta name="description" content="${escAttr(ch.title)} — the Augur language documentation.">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="docs.css">
</head>
<body>
<header class="dheader">
  <button class="burger" id="burger" aria-label="Toggle navigation">☰</button>
  <a class="dbrand" href="introduction.html"><span class="mk">✦</span> Augur <span style="color:var(--muted);font-weight:400;font-size:.8rem">docs</span></a>
  <div class="spacer"></div>
  <div class="dsearch">
    <input id="dsearch" type="search" placeholder="Search docs…" autocomplete="off" aria-label="Search documentation">
    <div class="dsearch-results" id="dresults"></div>
  </div>
  <nav>
    <a href="../index.html">Home</a>
    <a href="${GH}" target="_blank" rel="noopener">GitHub ↗</a>
  </nav>
</header>
<aside class="dside">${sidebar(ch.slug)}</aside>
<div class="scrim"></div>
<main class="dmain">
  <article class="darticle">
    <p class="eyebrow">${ch.group}</p>
    <h1>${ch.title}</h1>
    ${ch.body}
    ${pager(i)}
  </article>
</main>
<footer class="dfoot">
  Augur — operations divined, not computed. <a href="${GH}">Source</a> · A joke about LLM-driven software. Do not deploy it.
</footer>
<script src="search-index.js"></script>
<script src="docs.js"></script>
</body>
</html>`
}

function plain(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim().slice(0, 600)
}

mkdirSync(OUT, { recursive: true })
for (let i = 0; i < CHAPTERS.length; i++) {
  writeFileSync(join(OUT, `${CHAPTERS[i].slug}.html`), page(CHAPTERS[i], i))
}
const redirect = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0; url=introduction.html"><link rel="canonical" href="introduction.html"><title>Augur docs</title></head><body><a href="introduction.html">Augur documentation</a></body></html>`
writeFileSync(join(OUT, "index.html"), redirect)
const index = CHAPTERS.map((ch) => ({ group: ch.group, title: ch.title, url: `${ch.slug}.html`, text: plain(ch.body) }))
writeFileSync(join(OUT, "search-index.js"), `window.AUGUR_DOCS=${JSON.stringify(index)};`)
console.log(`generated ${CHAPTERS.length} chapters + index + search`)
