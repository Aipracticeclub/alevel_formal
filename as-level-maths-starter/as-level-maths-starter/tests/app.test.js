import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { openDatabase } from '../database/db.js';
import { importQuestions, validateQuestions } from '../database/import.js';
import { createApp } from '../backend/server.js';

// Keep test data independent of the sample file that A may replace.
const sample = [
  { id: 'demo-001', syllabus: 'demo-1', difficulty: 'easy', question: 'First test question', answer: 'First answer' },
  { id: 'demo-002', syllabus: 'demo-1', difficulty: 'medium', question: 'Second test question', answer: 'Second answer' },
  { id: 'demo-003', syllabus: 'demo-2', difficulty: 'medium', question: 'Third test question', answer: 'Third answer' },
  { id: 'demo-004', syllabus: 'demo-2', difficulty: 'hard', question: 'Test pagination', answer: 'Fourth answer' }
];

test('bundled sample data follows the import contract', () => {
  const records = JSON.parse(readFileSync(new URL('../database/sample.json', import.meta.url), 'utf8'));
  assert.doesNotThrow(() => validateQuestions(records));
});

test('import normalizes whitespace and rejects invalid difficulty before writing', () => {
  const db = openDatabase(':memory:');
  try {
    importQuestions(db, [{ ...sample[0], id: '  demo-001  ', difficulty: ' easy ', syllabus: ' demo-1 ' }]);
    assert.equal(db.prepare('SELECT difficulty FROM questions WHERE id = ?').get('demo-001').difficulty, 'easy');
    assert.equal(db.prepare('SELECT syllabus FROM questions WHERE id = ?').get('demo-001').syllabus, 'demo-1');
    assert.throws(() => importQuestions(db, [{ ...sample[0], difficulty: 1 }]), /difficulty/);
  } finally { db.close(); }
});

test('import persists after reopening and updates matching IDs without deleting others', () => {
  const directory = mkdtempSync(join(tmpdir(), 'club-db-'));
  const filename = join(directory, 'test.sqlite');
  let db;
  try {
    db = openDatabase(filename);
    assert.equal(importQuestions(db, sample), 4);
    importQuestions(db, [{ ...sample[0], answer: 'Updated answer' }]);
    db.close();
    db = openDatabase(filename);
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM questions').get().total, 4);
    assert.equal(db.prepare('SELECT answer FROM questions WHERE id = ?').get(sample[0].id).answer, 'Updated answer');
  } finally {
    db?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('invalid data and duplicate IDs do not partially import', () => {
  const db = openDatabase(':memory:');
  try {
    importQuestions(db, sample);
    for (const records of [
      [], {}, [null],
      [sample[0], sample[0]],
      [{ ...sample[0], answer: 'Changed' }, { ...sample[1], difficulty: 'unknown' }],
      [{ ...sample[0], question: ' ' }],
      [{ ...sample[0], id: 'x'.repeat(101) }]
    ]) assert.throws(() => importQuestions(db, records));
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM questions').get().total, 4);
    assert.equal(db.prepare('SELECT answer FROM questions WHERE id = ?').get(sample[0].id).answer, sample[0].answer);
  } finally { db.close(); }
});

test('a database failure rolls back earlier rows in the same import', () => {
  const db = openDatabase(':memory:');
  try {
    db.exec(`CREATE TRIGGER reject_second BEFORE INSERT ON questions
      WHEN NEW.id = 'demo-002' BEGIN SELECT RAISE(ABORT, 'test failure'); END;`);
    assert.throws(() => importQuestions(db, sample), /test failure/);
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM questions').get().total, 0);
  } finally { db.close(); }
});

test('HTTP API, filters, pagination, errors, and static boundaries', async (t) => {
  const db = openDatabase(':memory:');
  importQuestions(db, sample);
  const server = createApp(db);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    db.close();
  });

  await t.test('health and exact question response shape', async () => {
    assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { status: 'ok' });
    const response = await fetch(`${base}/api/questions`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.deepEqual(Object.keys(data).sort(), ['items', 'limit', 'offset', 'total']);
    assert.equal(data.total, 4);
    assert.equal(data.limit, 20);
    assert.equal(data.offset, 0);
    assert.deepEqual(data.items[0], sample[0]);
  });

  await t.test('text, syllabus position, difficulty, combined filters and no matches', async () => {
    const search = async params => (await fetch(`${base}/api/questions?${new URLSearchParams(params)}`)).json();
    assert.equal((await search({ q: 'PAGINATION' })).total, 1);
    assert.equal((await search({ syllabus: 'demo-1' })).total, 2);
    assert.equal((await search({ difficulty: 'medium' })).total, 2);
    assert.equal((await search({ syllabus: 'demo-1', difficulty: 'medium' })).total, 1);
    assert.equal((await search({ syllabus: 'demo-1', difficulty: 'hard' })).total, 0);
    assert.equal((await search({ syllabus: 'demo-1', q: 'pagination' })).total, 0);
    assert.deepEqual((await search({ q: 'no-such-question' })).items, []);
    assert.equal((await search({ q: '%' })).total, 0);
    assert.equal((await search({ q: '_' })).total, 0);
    assert.equal((await search({ q: "' OR 1=1 --" })).total, 0);
  });

  await t.test('pagination returns stable pages with the unpaginated total', async () => {
    const first = await (await fetch(`${base}/api/questions?limit=2&offset=0`)).json();
    const second = await (await fetch(`${base}/api/questions?limit=2&offset=2`)).json();
    assert.equal(first.total, 4);
    assert.equal(second.offset, 2);
    assert.equal(second.items.length, 2);
    assert.equal(new Set([...first.items, ...second.items].map(q => q.id)).size, 4);
  });

  await t.test('bad input and unsupported routes/methods use documented errors', async () => {
    for (const query of ['limit=0', 'limit=101', 'limit=abc', 'offset=-1', 'offset=1.5', 'offset=9007199254740992', 'difficulty=unknown', `syllabus=${'a'.repeat(121)}`, `q=${'a'.repeat(201)}`]) {
      const response = await fetch(`${base}/api/questions?${query}`);
      assert.equal(response.status, 400, query);
      assert.equal((await response.json()).error.code, 'INVALID_QUERY');
    }
    const unknown = await fetch(`${base}/api/missing`);
    assert.equal(unknown.status, 404);
    assert.equal((await unknown.json()).error.code, 'NOT_FOUND');
    const post = await fetch(`${base}/api/questions`, { method: 'POST' });
    assert.equal(post.status, 405);
    assert.equal(post.headers.get('allow'), 'GET, HEAD');
  });

  await t.test('frontend assets load; private files and prototype names do not', async () => {
    for (const [path, type] of [['/', 'text/html'], ['/app.js', 'text/javascript'], ['/styles.css', 'text/css']]) {
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, 200);
      assert.ok(response.headers.get('content-type').startsWith(type));
      assert.ok((await response.text()).length > 50);
    }
    for (const path of ['/.env', '/database/sample.json', '/storage/as-maths.sqlite', '/AGENTS.md', '/__proto__', '/constructor']) {
      assert.equal((await fetch(`${base}${path}`)).status, 404, path);
    }
    const head = await fetch(`${base}/`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    assert.ok(head.headers.get('content-security-policy').includes("script-src 'self'"));
  });
});
