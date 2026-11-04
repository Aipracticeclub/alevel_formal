import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openDatabase } from './db.js';

const textLimits = { id: 100, syllabus: 120, question: 20000, answer: 20000 };

export function validateQuestions(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('The input must be a non-empty JSON array of questions.');
  }
  const ids = new Set();
  return records.map((record, index) => {
    const label = `Question ${index + 1}`;
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error(`${label} must be an object.`);
    }
    const result = {};
    for (const [field, max] of Object.entries(textLimits)) {
      const value = typeof record[field] === 'string' ? record[field].trim() : '';
      if (!value || value.length > max) {
        throw new Error(`${label}: ${field} must be text with 1-${max} characters.`);
      }
      result[field] = value;
    }
    const difficulty = typeof record.difficulty === 'string' ? record.difficulty.trim() : '';
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      throw new Error(`${label}: difficulty must be easy, medium, or hard.`);
    }
    if (ids.has(result.id)) throw new Error(`${label}: duplicate id ${result.id}.`);
    ids.add(result.id);
    return { ...result, difficulty };
  });
}

// Validate the whole file first. Either every record is imported or none is.
export function importQuestions(db, records) {
  const questions = validateQuestions(records);
  const save = db.prepare(`
    INSERT INTO questions (id, syllabus, difficulty, question, answer)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET syllabus=excluded.syllabus,
      difficulty=excluded.difficulty, question=excluded.question, answer=excluded.answer
  `);
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const q of questions) save.run(q.id, q.syllabus, q.difficulty, q.question, q.answer);
    db.exec('COMMIT');
    return questions.length;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let db;
  try {
    const input = process.argv[2] || new URL('./sample.json', import.meta.url);
    const records = JSON.parse(readFileSync(input, 'utf8'));
    db = openDatabase();
    const count = importQuestions(db, records);
    console.log(`Imported ${count} questions. Existing matching IDs were updated; other rows were kept.`);
  } catch (error) {
    console.error(`Import failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    db?.close();
  }
}
