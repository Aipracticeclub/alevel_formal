# AS Level Mathematics — Club Starter

A small, working starting point for the club's new AS Level Mathematics website.
Question classification uses syllabus position and difficulty only; there is no question-type field.
The data teammate will collect and check the real questions. This project includes placeholders only.

**Browser -> Node.js API -> SQLite database**, all in one project.
Node serves the HTML, CSS, and JavaScript as well as the API, so the team uses one address.
No framework, build step, external service, or npm package is required.

## Start locally

Install **Node.js 24**. Open a terminal in this folder:

```sh
npm run import
npm start
```

Open **http://127.0.0.1:3000**. Try syllabus position `demo-1`, select a difficulty, and expand an answer.
Stop the server with Ctrl+C. `npm test` runs the automated checks.
If PowerShell blocks `npm.ps1`, use `npm.cmd` instead of `npm`.

The importer creates `storage/as-maths.sqlite` and loads four placeholder records.
`demo-1` and `demo-2` are example positions, not official syllabus references.
It can be rerun: existing IDs are updated, unrelated records are kept.
Starting without an import creates an empty database; the page shows an empty state.
The database remains on disk after stopping the server.

Optional: copy `.env.example` to `.env` to set HOST, PORT, or DATABASE_PATH.
The default host accepts connections only from your own computer.

## Find your part

```text
AGENTS.md               Short instructions for every AI
frontend/               D: page and search; E: appearance
  index.html
  app.js
  styles.css
backend/                B: API and database queries
  server.js
  questions.js
database/               A: schema, import, sample data
  db.js
  schema.sql
  import.js
  sample.json
infra/                  C: server and domain setup
tests/                  F: automated tests
docs/API.md             Shared data and API format
.github/                Pull request / task templates and test workflow
storage/                Local database, created at runtime and ignored by Git
```

G and H collect feedback, then develop features in the relevant folder with its owner.

One search follows this path:
`frontend/app.js` -> `backend/server.js` -> `backend/questions.js` -> SQLite.
The same path returns JSON to the browser, where `app.js` creates the result cards.
Separately, `database/import.js` validates an input file and saves its records to SQLite.

Each document has one purpose: `README.md` explains setup, `AGENTS.md` directs the AI,
and `docs/API.md` defines the shared data format. Start from the existing files for your module.

## Give this to your AI

If your AI tool does not automatically read `AGENTS.md`, attach or paste it and the relevant files.
Use this task prompt with DeepSeek or another AI:

```text
Read AGENTS.md and docs/API.md before writing code.
My role, if known: [A / B / C / D / E / F / G / H].
My task is: [one specific change].
Success means: [what should work when finished].
Tell me which files you need. Follow the existing structure and API.
Make the smallest working change, run the relevant checks, and report the result.
```

The model does not need access to every file. Start with the two shared documents and the files for its task.
If the AI cannot run commands, the student runs them and sends back the output.

## Import your own data

Copy the format in `database/sample.json`, then run:

```sh
npm run import -- path/to/questions.json
```

See `docs/API.md` for validation rules. The full file is validated before any rows are changed.
Your data teammate chooses the actual syllabus references and checks difficulty labels with the team.

## Upload this project to GitHub

Create a new empty repository on GitHub, without an initial README or .gitignore.
From this project folder (not its parent), run:

```sh
git init -b main
git add .
git commit -m "Add club website starter"
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the example URL with your repository URL. Set your Git name/email if Git requests them.
This starter has no nested Git repository yet; run `git init` here first so only this folder is uploaded.
Never use `git add .` from the parent workspace, which contains unrelated projects.
If the remote already contains work, clone it separately and copy these files into it instead.

Add teammates as collaborators. Each student pulls the latest `main`, creates a branch, makes a focused change, and opens a pull request.
F coordinates review; C releases accepted changes. GitHub Actions runs `npm test` on pushes and pull requests.
For a private repository, check the account's Actions allowance before enabling CI.

## What this starter includes

Working data import, persistent database, API, text search, syllabus-position and difficulty filters, pagination, answer display, and responsive styling.
This is a structure to extend, with placeholder content. Accounts, PDF uploads, editing screens, mathematical formula rendering, feedback storage, and automatic server deployment are not implemented.
Read `infra/README.md` before putting it on the club's server.
