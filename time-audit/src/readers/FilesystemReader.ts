import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseReader } from './BaseReader.js';
import { USER_HOME, DEFAULT_IGNORE_PATTERNS } from '../constants.js';
import type { RawActivityEntry, DataSource } from '../types.js';

interface FileEntry {
  path: string;
  mtimeMs: number;
  size: number;
}

export class FilesystemReader extends BaseReader {
  readonly source: DataSource = 'filesystem';
  readonly name = 'File System';

  private watchDirs: string[];

  constructor(watchDirs?: string[]) {
    super();
    this.watchDirs = watchDirs ?? [
      path.join(USER_HOME, 'Desktop'),
      path.join(USER_HOME, 'Documents'),
    ];
  }

  async read(options: { since?: Date } = {}): Promise<RawActivityEntry[]> {
    const sinceTime = options.since?.getTime() ?? Date.now() - 86400000; // last 24h
    const allFiles: FileEntry[] = [];

    for (const dir of this.watchDirs) {
      if (!fs.existsSync(dir)) continue;
      const fileEntries = this.scanDirectory(dir, sinceTime, 0, 2);
      allFiles.push(...fileEntries);
    }

    return this.groupIntoActivities(allFiles);
  }

  private scanDirectory(dir: string, sinceTime: number, depth: number, maxDepth: number): FileEntry[] {
    if (depth > maxDepth) return [];

    const results: FileEntry[] = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (DEFAULT_IGNORE_PATTERNS.includes(entry.name)) continue;
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const sub = this.scanDirectory(fullPath, sinceTime, depth + 1, maxDepth);
          results.push(...sub);
        } else if (entry.isFile()) {
          try {
            const stat = fs.statSync(fullPath);
            if (stat.mtimeMs >= sinceTime) {
              results.push({
                path: fullPath,
                mtimeMs: stat.mtimeMs,
                size: stat.size,
              });
            }
          } catch { /* skip inaccessible */ }
        }
      }
    } catch { /* permission denied */ }

    return results;
  }

  private groupIntoActivities(files: FileEntry[]): RawActivityEntry[] {
    const ACTIVITY_GAP_MS = 15 * 60 * 1000; // 15 minutes

    // Sort by modification time
    files.sort((a, b) => a.mtimeMs - b.mtimeMs);

    const activities: RawActivityEntry[] = [];
    let currentGroup: FileEntry[] = [];

    for (const file of files) {
      if (currentGroup.length === 0) {
        currentGroup.push(file);
      } else {
        const lastTime = currentGroup[currentGroup.length - 1].mtimeMs;
        if (file.mtimeMs - lastTime <= ACTIVITY_GAP_MS) {
          currentGroup.push(file);
        } else {
          const activity = this.createActivity(currentGroup);
          if (activity) activities.push(activity);
          currentGroup = [file];
        }
      }
    }

    // Last group
    if (currentGroup.length > 0) {
      const activity = this.createActivity(currentGroup);
      if (activity) activities.push(activity);
    }

    return activities;
  }

  private createActivity(files: FileEntry[]): RawActivityEntry | null {
    if (files.length === 0) return null;

    const startTime = files[0].mtimeMs;
    const endTime = files[files.length - 1].mtimeMs;
    const durationMs = endTime - startTime;

    // Skip very short activities (less than 1 minute)
    if (durationMs < 60000) return null;

    const firstPath = files[0].path;
    const dirName = path.basename(path.dirname(firstPath));

    return {
      id: `fs-${startTime}-${files.length}`,
      source: 'filesystem',
      startTime,
      endTime,
      title: `Files: ${dirName} (${files.length} files)`,
      detail: `Modified ${files.length} files in ${dirName}`,
      category: null,
      subcategory: null,
      metadata: { fileCount: files.length, directory: dirName },
    };
  }
}
