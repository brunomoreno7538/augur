// A real-ish support-desk triager. Run it for free offline with the fake
// oracle, or for real: aug examples/triage.aug --oracle openrouter \
//   --model openai/gpt-4o-mini --remember
//
// /// notes are fed to the oracle as context for the operations that follow.
/// You are triaging customer support tickets. Be strict and consistent.

summon tickets = [
    "My card was charged twice for the same order!",
    "How do I change my email address?",
    "The app crashes every time I open the reports page.",
    "Thank you, your team is amazing!"
]

// Classify and flag urgency in parallel (gather = concurrent oracle calls).
summon buckets = gather classify tickets into ["billing", "account", "bug", "praise"]
proclaim buckets

summon urgent = gather filter tickets by "an angry or urgent customer"
proclaim "urgent tickets: " + count urgent

// Structured extraction: the divined value is coerced to a known shape.
summon report = divine "extract the issue" upon tickets[0] as {topic: text, severity: number}
proclaim report

// Self-consistency: ask three times, take the majority.
summon mood = divine "overall sentiment in one word" upon tickets[3] thrice
proclaim mood

// A drafted first reply per ticket.
for ticket in tickets {
    proclaim divine "a one-sentence empathetic first reply" upon ticket
}
