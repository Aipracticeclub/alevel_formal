# Read this before changing code

## Project
This is a new school-club AS Level Mathematics question-bank website.
Classify questions only by syllabus position and difficulty (easy, medium, hard). No question-type field.
The student's data teammate collects and checks real questions. Do not collect or download question data unless explicitly assigned.
The supplied records are placeholders; demo-1 and demo-2 are not official syllabus references.
Stack: Node.js 24, SQLite, plain HTML/CSS/JavaScript. No framework or npm dependencies.
Connection: browser -> backend API -> SQLite. The backend also serves the frontend.
Keep this structure simple. Do not copy in another website or replace the stack.

## Your task
1. Identify the requested change and use the table below to find the relevant module. Ask only if the task itself is unclear; a role letter is optional.
2. Read this file, `docs/API.md`, and the existing files needed for that task. If you cannot access them, ask the student to attach or paste them. Do not guess their contents.
3. State which files you will change. Make one small, working change at a time.
4. Preserve the API and database fields. If they need to change, explain the handoff to the affected teammates before implementation.
5. Run `npm test` and any relevant manual checks. Report what passed, what was not tested, and any remaining problem.

## Who owns what
| Role | Main files | Connects to |
| --- | --- | --- |
| A: data and database | `database/` | B uses the schema; imports use the documented JSON fields |
| B: backend API | `backend/` | A's database and D's frontend, using `docs/API.md` |
| C: server and domain | `infra/`, `.env.example` | Runs the same app on Alibaba Cloud; see `infra/README.md` |
| D: page structure, search, device support | `frontend/index.html`, `frontend/app.js` | Calls `/api/questions`; coordinates markup with E |
| E: appearance | `frontend/styles.css` | Keeps IDs used by D's JavaScript intact; coordinates markup changes with D |
| F: testing and coordination | `tests/`, task descriptions | Checks the full workflow and coordinates shared changes |
| G/H: feedback and new features | GitHub Issues, then the relevant module | Work with that module's owner and use its existing API |

These are coordination boundaries. A task may cross them, but explain cross-module changes.

## Find the connection
- `frontend/app.js` sends filters to `backend/server.js` using `/api/questions`.
- `backend/server.js` validates query parameters and calls `listQuestions()` in `backend/questions.js`.
- `backend/questions.js` runs SQL and returns `{ items, total, limit, offset }`.
- `database/db.js` opens SQLite; `database/schema.sql` defines its tables.
- `database/import.js` validates JSON records and writes them in one transaction (all rows succeed or none do).
- The five record fields are `id`, `syllabus`, `difficulty`, `question`, and `answer`. Exact rules and examples are in `docs/API.md`.

## Keep changes small
- Edit an existing module before adding another layer. Use plain functions and descriptive names.
- Keep HTTP handling in `server.js`, SQL queries in `questions.js`, browser behavior in `app.js`, and appearance in `styles.css`.
- Write readable source, with one CSS declaration per line. Comments should explain a decision or connection.
- A new filter usually touches the form, browser request, query validation, SQL, API document, and tests. Update those together.
- `schema.sql` creates new tables; editing it does not upgrade an existing database. Plan a data-preserving migration when changing columns.

## Run and check
Use Node.js 24. Run commands from the folder containing `package.json`.
No `npm install` is needed.

```sh
npm run import
npm start
```

Open http://127.0.0.1:3000. Stop with Ctrl+C.
`npm run import` loads the sample file; matching IDs are updated and other rows are kept.
Use `npm run import -- path/to/questions.json` for another file.
Use `npm test` for automated tests; tests use temporary databases.
For browser changes, also run `node --check frontend/app.js` and check the affected behavior in a browser when available.
If your AI tool cannot execute commands, give the student the commands and report them as not run.

## Connection rules
- Frontend calls relative URLs such as `/api/questions?syllabus=demo-1&difficulty=easy`. Never put database access in browser code.
- Use `docs/API.md` as the shared request, response, and data format. Update it when an agreed format changes.
- Use SQL parameters for user input and `textContent` for question text. Never render database text as HTML.
- Server settings come from `.env`; `.env.example` is the shareable example. Keep secrets and real database files out of Git.
- Schema changes need a migration plan for existing data. Do not delete or recreate a teammate's database.
- Do not add packages, login systems, services, or unrelated features unless the task needs them. Explain the reason first.

## GitHub workflow
Start a branch from the latest `main`; use a descriptive name such as `codex/search-filter`.
Make a focused commit and open a pull request. Include the change, affected modules, and checks run.
The affected module owner reviews it; F coordinates acceptance; C handles server releases.
Do not push to `main`, publish, or change the server unless the student asks.

## When you finish
Give a short report: files changed, behavior changed, tests run, and anything another teammate must do.
Do not claim a browser or server test passed unless you actually ran it.
