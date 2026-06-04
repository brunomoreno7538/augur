// A calculator written entirely in Augur. Two modes:
//   precise  - native arithmetic inside `certain` (exact, deterministic, free)
//   divine   - the oracle evaluates a natural-language expression
//
//   aug examples/calculator.aug                       # precise mode runs offline
//   aug examples/calculator.aug --oracle openrouter --model openai/gpt-4o-mini

/// You are a precise calculator. Given an arithmetic expression, reply with
/// ONLY the resulting number and nothing else.

ritual precise(a, op, b) {
    certain {
        summon x = a as number
        summon y = b as number
        when op == "+" -> give x + y
        when op == "-" -> give x - y
        when op == "*" -> give x * y
        when op == "/" -> {
            when y == 0 -> give "nope - division by zero"
            give x / y
        }
        when op == "%" -> give x % y
        when op == "^" -> give x ^ y
        give "unknown operator: " + op
    }
}

ritual main() {
    proclaim "Augur calculator. 'q' quits at the mode prompt."
    repeat forever {
        summon mode = ask "mode (p)recise / (d)ivine / (q)uit: "
        when mode == "q" -> {
            proclaim "the omens fall silent."
            break
        }
        when mode == "d" -> {
            summon expr = ask "expression: "
            proclaim divine "evaluate this arithmetic expression exactly" upon expr as number
        }
        otherwise -> {
            summon a = ask "a: "
            summon op = ask "op (+ - * / % ^): "
            summon b = ask "b: "
            proclaim precise(a, op, b)
        }
    }
}

main()
