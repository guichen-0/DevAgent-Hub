import chalk from 'chalk';
import { BrowserReader } from '../readers/BrowserReader.js';
import { VSCodeReader } from '../readers/VSCodeReader.js';
import { GitReader } from '../readers/GitReader.js';
import { FilesystemReader } from '../readers/FilesystemReader.js';
import { CacheManager } from '../cache/CacheManager.js';
import { info as printInfo } from '../utils/logger.js';

export async function executeStatus(): Promise<void> {
  printInfo('Available data sources:\n');

  const readers = [
    new BrowserReader(),
    new VSCodeReader(),
    new GitReader(),
    new FilesystemReader(),
  ];

  const cache = new CacheManager();
  const cacheInfo = cache.getInfo();

  for (const reader of readers) {
    console.log(chalk.bold(`  ${reader.name} (${reader.source})`));

    // Quick test: try reading a few entries
    const result = await reader.scan({ since: new Date(Date.now() - 86400000) });

    if (result.success) {
      console.log(`    ${chalk.green('✓')} Available — ${result.meta.count} entries found`);
      if (result.meta.timeRange) {
        const from = new Date(result.meta.timeRange[0]).toLocaleDateString();
        const to = new Date(result.meta.timeRange[1]).toLocaleDateString();
        console.log(`    ${chalk.dim(`Data range: ${from} → ${to}`)}`);
      }
    } else {
      console.log(`    ${chalk.yellow('⚠')} ${result.error ?? 'Not available'}`);
    }

    if (cacheInfo.lastScanned[reader.source]) {
      console.log(`    ${chalk.dim(`Cached: ${cacheInfo.lastScanned[reader.source]}`)}`);
    }

    console.log();
  }
}
