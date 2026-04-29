import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { BaseReader } from './BaseReader.js';
import { USER_HOME, DEFAULT_IGNORE_PATTERNS } from '../constants.js';
import { warn } from '../utils/logger.js';
import type { RawActivityEntry, DataSource } from '../types.js';

export class GitReader extends BaseReader {
  readonly source: DataSource = 'git';
  readonly name = 'Git Repos';

  private customRepos: string[];

  constructor(customRepos: string[] = []) {
    super();
    this.customRepos = customRepos;
  }

  async read(options: { since?: Date } = {}): Promise<RawActivityEntry[]> {
    const repos = this.discoverRepos();
    const entries: RawActivityEntry[] = [];

    for (const repo of repos) {
      try {
        const repoEntries = this.readRepoHistory(repo, options.since);
        entries.push(...repoEntries);
      } catch {
        // skip repos that fail
      }
    }

    return entries;
  }

  private discoverRepos(): string[] {
    const repos = new Set<string>();

    // Add custom repos first
    for (const r of this.customRepos) {
      if (fs.existsSync(path.join(r, '.git'))) {
        repos.add(r);
      }
    }

    // Scan common directories
    const searchDirs = [
      USER_HOME,
      path.join(USER_HOME, 'Desktop'),
      path.join(USER_HOME, 'Documents'),
      path.join(USER_HOME, 'source'),
      path.join(USER_HOME, 'projects'),
      path.join(USER_HOME, 'repos'),
    ];

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      this.scanForRepos(dir, repos, 0, 3);
    }

    return [...repos];
  }

  private scanForRepos(dir: string, repos: Set<string>, depth: number, maxDepth: number): void {
    if (depth > maxDepth) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (DEFAULT_IGNORE_PATTERNS.includes(entry.name)) continue;
        if (entry.name.startsWith('.')) continue;

        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name);
          if (fs.existsSync(path.join(fullPath, '.git'))) {
            repos.add(fullPath);
          } else {
            this.scanForRepos(fullPath, repos, depth + 1, maxDepth);
          }
        }
      }
    } catch { /* permission denied, skip */ }
  }

  private readRepoHistory(repoPath: string, since?: Date): RawActivityEntry[] {
    const sinceArg = since ? `--since="${since.toISOString()}"` : '';
    const cmd = `git log --all ${sinceArg} --format="%H|%ai|%s" --name-status`;

    try {
      const output = execSync(cmd, {
        cwd: repoPath,
        encoding: 'utf-8',
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      }) as string;

      if (!output.trim()) return [];

      const lines = output.trim().split('\n');
      const entries: RawActivityEntry[] = [];
      let currentCommit: { hash: string; date: Date; message: string } | null = null;

      for (const line of lines) {
        if (line.includes('|')) {
          // New commit
          const parts = line.split('|');
          if (parts.length >= 3) {
            currentCommit = {
              hash: parts[0],
              date: new Date(parts[1]),
              message: parts.slice(2).join('|'),
            };
            entries.push({
              id: `git-${currentCommit.hash}`,
              source: 'git',
              startTime: currentCommit.date.getTime(),
              endTime: null,
              title: currentCommit.message.substring(0, 80),
              detail: `${repoPath}: ${currentCommit.message}`,
              category: null,
              subcategory: null,
              metadata: { repo: repoPath, hash: currentCommit.hash },
            });
          }
        }
      }

      return entries;
    } catch {
      return [];
    }
  }
}
