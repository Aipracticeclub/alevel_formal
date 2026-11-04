# Shared connection format

This new site is for AS Level Mathematics. A owns the data, B the API, and D the browser calls.
Coordinate field changes together. The data teammate collects real questions; this starter contains placeholders only.

## Question record

The importer accepts a non-empty JSON array:

```json
[
  {
    "id": "demo-001",
    "syllabus": "demo-1",
    "difficulty": "easy",
    "question": "[Placeholder] Replace with an AS Level Mathematics question.",
    "answer": "[Placeholder] Replace with the checked answer."
  }
]
```

| Field | Rule |
| --- | --- |
| id | Unique text ID; 1-100 characters |
| syllabus | Position in the chosen syllabus; text, 1-120 characters |
| difficulty | Exactly `easy`, `medium`, or `hard` |
| question | Plain text, 1-20000 characters |
| answer | Plain text, 1-20000 characters |

All five fields are required. Text is trimmed and must not be empty.
There is no question-type field. `demo-1` and `demo-2` are placeholders, not official syllabus codes.
A assigns actual references from the team's chosen syllabus; no exam board is assumed here.
Difficulty labels are team judgements, not official exam-board ratings.

IDs must be unique within an input file. Importing an existing ID updates its row;
absent IDs are kept. Invalid input imports nothing. Extra input fields are ignored.
Formula rendering, diagrams and PDF references are future work, not part of this plain-text structure.

## GET /api/questions

| Query parameter | Default | Meaning |
| --- | --- | --- |
| q | empty | Literal substring in question or syllabus; maximum 200 characters |
| syllabus | empty | Exact syllabus-position match; maximum 120 characters |
| difficulty | empty | `easy`, `medium`, or `hard` |
| limit | 20 | Integer from 1 to 100 |
| offset | 0 | Non-negative safe integer |

Empty filters apply no restriction. Filters combine with AND.
Text search is case-insensitive for ASCII English letters, without full Unicode case folding.
Results sort by syllabus text ascending, then ID ascending. Syllabus order is lexical, not numeric.
Unknown query parameters are ignored.

Example: `/api/questions?syllabus=demo-1&difficulty=easy&limit=20&offset=0`

HTTP 200:

```json
{
  "items": [
    {
      "id": "demo-001",
      "syllabus": "demo-1",
      "difficulty": "easy",
      "question": "[Placeholder] Replace with an AS Level Mathematics question.",
      "answer": "[Placeholder] Replace with the checked answer."
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

No matches is HTTP 200 with `items: []` and `total: 0`.
Answers are public in this practice starter.

## GET /api/health

HTTP 200: `{ "status": "ok" }`. Confirms the API can query its database.

## Errors

```json
{ "error": { "code": "INVALID_QUERY", "message": "Human-readable explanation" } }
```

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | INVALID_QUERY | Invalid query length, difficulty, or pagination |
| 404 | NOT_FOUND | Unknown page or endpoint |
| 405 | METHOD_NOT_ALLOWED | Use GET or HEAD |
| 500 | INTERNAL_ERROR | Server failure; details stay in server logs |

HEAD uses the same status and headers with no body.
There is no public data-write API. A imports data using the command line.
