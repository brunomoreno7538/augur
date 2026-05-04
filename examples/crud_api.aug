// A real CRUD over a persistent SQLite store, served over HTTP — plus one
// deliberately divined route. Run it:
//
//   aug examples/crud_api.aug
//
// Then, in another terminal:
//   curl -s -X POST localhost:8787/notes -d '{"text": "buy milk"}'
//   curl -s localhost:8787/notes
//   curl -s localhost:8787/fortune              # this one is divined
//
// The handler is a normal ritual. The request is a map:
//   {method, path, query, headers, body, json}   (json = parsed body, if any)
// It returns {status, body, headers?}; a bare value becomes a 200.

ritual handle(req) {
    summon method = req["method"]
    summon path = req["path"]

    certain {
        commune with "sqlite://./notes.db"

        when method == "POST" and path == "/notes" -> {
            inscribe req["json"] into notes
            give {status: 201, body: {created: req["json"]}}
        }
        when method == "GET" and path == "/notes" -> {
            give {status: 200, body: recall "all notes" from notes}
        }
    }

    // a route whose body is invented by the oracle (needs a real --oracle)
    when path == "/fortune" -> give {status: 200, body: divine "a short techie fortune cookie"}

    give {status: 404, body: {error: "not found", path: path}}
}

serve 8787 with handle
