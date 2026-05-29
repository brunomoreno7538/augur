// A CRUD where EVERY route goes through the LLM — no `certain` anywhere.
// Storage is the amnesiac divined journal; reads are divined over it; writes are
// cleaned up by the oracle first. Persistence is fiction and the store forgets
// its oldest records when the journal overflows — that is the whole joke.
//
// Run it (needs a real oracle):
//   aug examples/crud_llm.aug --oracle openrouter --model openai/gpt-4o-mini
//
// Then:
//   curl -s -X POST localhost:8788/notes -d '{"text":"  buy MILK!!  "}'
//   curl -s localhost:8788/notes
//   curl -s "localhost:8788/notes/search?q=groceries"

/// You are the database for a notes app. Records are JSON objects with a text
/// field and a tags array. When asked to list or filter, answer ONLY with the
/// requested JSON array, nothing else.

commune with "vibes://localhost/notes"

ritual handle(req) {
    summon method = req["method"]
    summon path = req["path"]

    // AUTH — the oracle is the bouncer. (Divined auth is NOT secure — it is
    // prompt-injectable; use `certain { ... == "opensesame" }` for real auth.)
    summon authorized = divine "is this the correct API key? the only valid key is exactly 'opensesame'" upon req["headers"]["x-api-key"] as bool
    when not authorized -> give {status: 401, body: {error: "the oracle does not recognize you"}}

    // CREATE — the oracle normalizes the note and invents tags before storing
    when method == "POST" and path == "/notes" -> {
        summon note = divine "clean up the text and add a short tags array" upon req["json"] as {text: text, tags: [text]}
        inscribe note into notes
        give {status: 201, body: note}
    }

    // SEARCH — the oracle lists the store, then keeps notes whose TEXT is
    // relevant to the query q (semantic, case-insensitive, partial ok)
    when method == "GET" and path == "/notes/search" -> {
        summon all = query "every note still present — the ledger may contain BANISH entries; treat those as deleted and exclude them — as a JSON array of {text, tags}" as [{text: text, tags: [text]}]
        give {status: 200, body: divine "from these notes, return only the ones whose 'text' field is relevant to the search query 'q' — match by meaning and substring, case-insensitive" upon {notes: all, q: req["query"]["q"]} as [{text: text, tags: [text]}]}
    }

    // PAGE — logical pagination: the oracle lists the store, then take/skip
    // slice it natively (deterministic, zero extra tokens).  ?limit=2&offset=0
    when method == "GET" and path == "/notes/page" -> {
        summon all = query "every note still present — the ledger may contain BANISH entries; treat those as deleted and exclude them — as a JSON array of {text, tags}" as [{text: text, tags: [text]}]
        give {status: 200, body: take (req["query"]["limit"] as number) from skip (req["query"]["offset"] as number) from all}
    }

    // SORT — divined ordering by an arbitrary natural-language criterion.  ?by=...
    when method == "GET" and path == "/notes/sorted" -> {
        summon all = query "every note still present — the ledger may contain BANISH entries; treat those as deleted and exclude them — as a JSON array of {text, tags}" as [{text: text, tags: [text]}]
        give {status: 200, body: divine "sort these notes by the given criterion" upon {notes: all, criterion: req["query"]["by"]} as [{text: text, tags: [text]}]}
    }

    // DELETE — divined banish: a polite request to the oracle to forget.  ?q=...
    when method == "DELETE" and path == "/notes" -> {
        banish req["query"]["q"] from notes
        give {status: 200, body: {banished: req["query"]["q"]}}
    }

    // LIST — the oracle reconstructs the whole store from its journal
    when method == "GET" and path == "/notes" ->
        give {status: 200, body: query "every note still present — the ledger may contain BANISH entries; treat those as deleted and exclude them — as a JSON array of {text, tags}" as [{text: text, tags: [text]}]}

    give {status: 404, body: {error: "not found", path: path}}
}

serve 8788 with handle
