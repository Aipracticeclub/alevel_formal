-- A owns the schema. Coordinate field changes with B and update docs/API.md.
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY NOT NULL,
    syllabus TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question TEXT NOT NULL,
    answer TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS questions_syllabus ON questions(syllabus);
