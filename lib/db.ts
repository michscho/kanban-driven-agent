import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = path.join(process.cwd(), 'data', 'todos.db');

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const d = new Database(DB_PATH);
  d.pragma('journal_mode = WAL');
  d.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      work_commit_sha TEXT,
      approve_commit_sha TEXT,
      agent_log TEXT NOT NULL DEFAULT '',
      error TEXT,
      created_at INTEGER NOT NULL,
      started_at INTEGER,
      completed_at INTEGER,
      approved_at INTEGER,
      reverted_at INTEGER
    );
  `);
  _db = d;
  return d;
}

export type TodoStatus =
  | 'pending'
  | 'in_progress'
  | 'done'
  | 'approving'
  | 'approved'
  | 'reverted'
  | 'failed';

export interface Todo {
  id: number;
  slug: string;
  title: string;
  description: string;
  status: TodoStatus;
  work_commit_sha: string | null;
  approve_commit_sha: string | null;
  agent_log: string;
  error: string | null;
  created_at: number;
  started_at: number | null;
  completed_at: number | null;
  approved_at: number | null;
  reverted_at: number | null;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'todo';
}

export function uniqueSlug(base: string): string {
  const d = db();
  let slug = base;
  let i = 2;
  while (d.prepare('SELECT 1 FROM todos WHERE slug = ?').get(slug)) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export function listTodos(): Todo[] {
  return db().prepare('SELECT * FROM todos ORDER BY id DESC').all() as Todo[];
}

export function getTodo(id: number): Todo | undefined {
  return db().prepare('SELECT * FROM todos WHERE id = ?').get(id) as Todo | undefined;
}

export function createTodo(title: string, description: string): Todo {
  const slug = uniqueSlug(slugify(title));
  const now = Date.now();
  const info = db()
    .prepare(
      'INSERT INTO todos (slug, title, description, status, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .run(slug, title, description, 'pending', now);
  return getTodo(Number(info.lastInsertRowid))!;
}

export function updateTodo(id: number, patch: Partial<Todo>): void {
  const keys = Object.keys(patch).filter((k) => k !== 'id');
  if (!keys.length) return;
  const set = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => (patch as any)[k]);
  db().prepare(`UPDATE todos SET ${set} WHERE id = ?`).run(...values, id);
}

export function appendLog(id: number, chunk: string): void {
  db().prepare('UPDATE todos SET agent_log = agent_log || ? WHERE id = ?').run(chunk, id);
}

export function deleteTodo(id: number): void {
  db().prepare('DELETE FROM todos WHERE id = ?').run(id);
}
