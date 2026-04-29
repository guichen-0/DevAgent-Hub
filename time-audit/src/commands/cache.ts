import { CacheManager } from '../cache/CacheManager.js';
import { info, success } from '../utils/logger.js';
import type { DataSource } from '../types.js';

export function executeCacheCommand(action: string, args: string[]): void {
  const cache = new CacheManager();

  switch (action) {
    case 'info': {
      const info = cache.getInfo();
      console.log('Cache info:');
      console.log(`  Sources cached: ${info.sources.length}`);
      console.log(`  Total entries: ${info.totalEntries}`);
      for (const [source, scannedAt] of Object.entries(info.lastScanned)) {
        console.log(`  ${source}: last scanned at ${scannedAt}`);
      }
      break;
    }

    case 'clear': {
      const source = args[0] as DataSource | undefined;
      if (source) {
        cache.clear(source);
        success(`Cache cleared for source: ${source}`);
      } else {
        cache.clear();
        success('All cache cleared');
      }
      break;
    }

    default: {
      console.error('Unknown cache action. Use: info, clear');
      process.exit(1);
    }
  }
}
