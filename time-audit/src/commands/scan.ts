import { BrowserReader } from '../readers/BrowserReader.js';
import { VSCodeReader } from '../readers/VSCodeReader.js';
import { GitReader } from '../readers/GitReader.js';
import { FilesystemReader } from '../readers/FilesystemReader.js';
import { CacheManager } from '../cache/CacheManager.js';
import { info, success, warn, error as logError, dim } from '../utils/logger.js';
import type { ScanResult, RawActivityEntry, DataSource } from '../types.js';

interface ScanOptions {
  sources?: string;
  since?: string;
  fresh?: boolean;
}

export async function executeScan(options: ScanOptions): Promise<RawActivityEntry[]> {
  const cache = new CacheManager();
  const sourceFilter = options.sources?.split(',').map(s => s.trim() as DataSource) || null;
  const sinceDate = options.since ? new Date(options.since) : new Date(Date.now() - 7 * 86400000);
  const fresh = options.fresh ?? false;

  info('Starting scan...');
  if (options.since) {
    dim(`Since: ${options.since}`);
  }

  const readers = [
    new BrowserReader(),
    new VSCodeReader(),
    new GitReader(),
    new FilesystemReader(),
  ];

  const allEntries: RawActivityEntry[] = [];

  for (const reader of readers) {
    if (sourceFilter && !sourceFilter.includes(reader.source)) {
      dim(`Skipping ${reader.name} (filtered out)`);
      continue;
    }

    // Check cache
    if (!fresh) {
      const cached = cache.get(reader.source);
      if (cached) {
        success(`${reader.name}: using cache (${cached.entries.length} entries)`);
        allEntries.push(...cached.entries);
        continue;
      }
    }

    info(`Scanning ${reader.name}...`);
    const result: ScanResult = await reader.scan({ since: sinceDate });

    if (result.success) {
      success(`${reader.name}: ${result.meta.count} entries in ${result.durationMs}ms`);
      allEntries.push(...result.entries);

      // Cache the result
      cache.set(reader.source, Date.now(), result.entries);
    } else {
      logError(`${reader.name}: ${result.error}`);
    }
  }

  info(`Total: ${allEntries.length} raw entries collected`);

  return allEntries;
}
