import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openDatabase } from '../database/db.js';
import { listQuestions } from './questions.js';

const assets = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8']
};

function json(req, res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(req.method === 'HEAD' ? undefined : payload);
}

function searchOptions(params) {
  const q = (params.get('q') || '').trim();
  const syllabus = (params.get('syllabus') || '').trim();
  const difficulty = (params.get('difficulty') || '').trim();
  const limitText = params.get('limit') ?? '20';
  const offsetText = params.get('offset') ?? '0';
  const limit = Number(limitText);
  const offset = Number(offsetText);
  if (q.length > 200 || syllabus.length > 120 || !['', 'easy', 'medium', 'hard'].includes(difficulty) ||
      !/^\d+$/.test(limitText) || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 ||
      !/^\d+$/.test(offsetText) || !Number.isSafeInteger(offset) || offset < 0) {
    return null;
  }
  return { q, syllabus, difficulty, limit, offset };
}

// Exported so tests can use a temporary database and an available port.
export function createApp(db) {
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('Allow', 'GET, HEAD');
        return json(req, res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET or HEAD.' } });
      }
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/health') {
        db.prepare('SELECT 1').get();
        return json(req, res, 200, { status: 'ok' });
      }
      if (url.pathname === '/api/questions') {
        const options = searchOptions(url.searchParams);
        if (!options) return json(req, res, 400, { error: {
          code: 'INVALID_QUERY', message: 'Use q up to 200 characters, syllabus up to 120, difficulty easy/medium/hard, limit 1-100 and offset 0 or greater.'
        } });
        return json(req, res, 200, listQuestions(db, options));
      }
      const asset = Object.hasOwn(assets, url.pathname) ? assets[url.pathname] : null;
      if (asset) {
        const body = await readFile(new URL(`../frontend/${asset[0]}`, import.meta.url));
        res.writeHead(200, { 'Content-Type': asset[1], 'Content-Length': body.length, 'Cache-Control': 'no-cache' });
        return res.end(req.method === 'HEAD' ? undefined : body);
      }
      return json(req, res, 404, { error: { code: 'NOT_FOUND', message: 'This page or endpoint does not exist.' } });
    } catch (error) {
      console.error(error);
      return json(req, res, 500, { error: { code: 'INTERNAL_ERROR', message: 'The server could not complete the request.' } });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
  const db = openDatabase();
  const server = createApp(db);
  server.on('error', (error) => { console.error(error.message); db.close(); process.exitCode = 1; });
  server.listen(port, host, () => console.log(`AS Level Mathematics: http://${host}:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close(() => db.close()));
  }
}
