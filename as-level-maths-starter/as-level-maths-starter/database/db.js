import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Used by both the API and importer. SQLite files stay outside Git.
export function openDatabase(filename = process.env.DATABASE_PATH || 'storage/as-maths.sqlite') {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  try {
    db.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
    db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
