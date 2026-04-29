import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export function writeFileSafe(filePath: string, content: string): boolean {
  try {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export function copyFileSafe(src: string, dest: string): boolean {
  try {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    return true;
  } catch {
    return false;
  }
}

export function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function createBackup(filePath: string): string | null {
  if (!fileExists(filePath)) return null;
  const backupPath = filePath + '.bak';
  if (copyFileSafe(filePath, backupPath)) {
    return backupPath;
  }
  return null;
}

export function readJsonSafe<T>(filePath: string): T | null {
  const content = readFileSafe(filePath);
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export function writeJsonSafe(filePath: string, data: unknown): boolean {
  try {
    return writeFileSafe(filePath, JSON.stringify(data, null, 2));
  } catch {
    return false;
  }
}
