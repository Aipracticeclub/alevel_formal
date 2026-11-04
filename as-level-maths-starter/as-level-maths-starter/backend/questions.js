// B owns API queries. Keep the response fields aligned with docs/API.md.
export function listQuestions(db, { q = '', syllabus = '', difficulty = '', limit = 20, offset = 0 }) {
  const conditions = [];
  const values = [];
  if (q) {
    // Treat SQL LIKE wildcards as ordinary search characters.
    const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    conditions.push("(question LIKE ? ESCAPE '\\' OR syllabus LIKE ? ESCAPE '\\')");
    values.push(pattern, pattern);
  }
  if (syllabus) {
    conditions.push('syllabus = ?');
    values.push(syllabus);
  }
  if (difficulty) {
    conditions.push('difficulty = ?');
    values.push(difficulty);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM questions ${where}`).get(...values);
  const items = db.prepare(`
    SELECT id, syllabus, difficulty, question, answer FROM questions ${where}
    ORDER BY syllabus ASC, id ASC LIMIT ? OFFSET ?
  `).all(...values, limit, offset);
  return { items, total, limit, offset };
}
