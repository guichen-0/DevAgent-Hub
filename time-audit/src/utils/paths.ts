import * as path from 'node:path';
import * as os from 'node:os';

export function resolveWindowsPath(envPath: string | undefined): string | null {
  return envPath ?? null;
}

export function findGitOnWindows(): string | null {
  const candidates = [
    path.join('C:\\', 'Program Files', 'Git', 'bin', 'git.exe'),
    path.join('C:\\', 'Program Files', 'Git', 'cmd', 'git.exe'),
  ];
  for (const candidate of candidates) {
    try {
      require('node:fs').accessSync(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return 'git'; // fallback to PATH
}
