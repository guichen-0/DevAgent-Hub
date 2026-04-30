import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export interface DbRow {
  [key: string]: unknown;
}

let sqlJs: any = null;

export async function initDatabase() {
  ensureDir(DATA_DIR);
  sqlJs = await import('sql.js');
  console.log(`[DB] Data directory: ${DATA_DIR}`);
  return true;
}

function getDbPath(name: string): string {
  return join(DATA_DIR, `${name}.db`);
}

export function getDataDir(): string {
  return DATA_DIR;
}

// ─── SQLite Helpers ───

function openDb(name: string) {
  const dbPath = getDbPath(name);
  let buffer: Buffer | null = null;
  if (existsSync(dbPath)) {
    const fs = require('node:fs');
    buffer = fs.readFileSync(dbPath);
  }
  const SQL = sqlJs;
  const db = new SQL.Database(buffer);
  return db;
}

function saveDb(name: string, db: any) {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(getDbPath(name), buffer);
}

function closeDb(db: any) {
  db.close();
}

// ─── Public API ───

export function query(dbName: string, sql: string, params?: any[]): DbRow[] {
  const db = openDb(dbName);
  try {
    const stmt = db.prepare(sql);
    if (params) stmt.bind(params);

    const results: DbRow[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row as DbRow);
    }
    stmt.free();
    return results;
  } finally {
    saveDb(dbName, db);
    closeDb(db);
  }
}

export function execute(dbName: string, sql: string, params?: any[]): { rowsAffected: number } {
  const db = openDb(dbName);
  try {
    db.run(sql, params);
    return { rowsAffected: db.getRowsModified() };
  } finally {
    saveDb(dbName, db);
    closeDb(db);
  }
}

export function runTransaction(dbName: string, fn: (db: any) => void): void {
  const db = openDb(dbName);
  try {
    db.run('BEGIN TRANSACTION');
    fn(db);
    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  } finally {
    saveDb(dbName, db);
    closeDb(db);
  }
}

// ─── Schema ───

export function ensureSchema(dbName: string, createSql: string): void {
  const db = openDb(dbName);
  try {
    db.run(createSql);
  } finally {
    saveDb(dbName, db);
    closeDb(db);
  }
}
