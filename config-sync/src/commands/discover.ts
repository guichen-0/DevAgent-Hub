import picocolors from 'picocolors';
import { getSourcesForCurrentPlatform, getSourceById } from '../sources/registry.js';

export function executeDiscover(sourceId?: string): void {
  const sources = sourceId
    ? [getSourceById(sourceId)].filter(Boolean)
    : getSourcesForCurrentPlatform();

  if (sources.length === 0) {
    console.log('No sources found for this platform.');
    return;
  }

  for (const source of sources) {
    if (!source) continue;
    console.log(`\n${picocolors.bold(source.name)} — ${source.description}`);

    if (!source.isInstalled()) {
      console.log(`  ${picocolors.dim('(not installed on this machine)')}`);
      continue;
    }

    const configs = source.detectConfigs();
    if (configs.length === 0) {
      console.log(`  ${picocolors.dim('No configuration files found')}`);
      continue;
    }

    for (const cfg of configs) {
      console.log(`  ${picocolors.green('✓')} ${cfg.label}`);
      console.log(`    ${picocolors.dim(cfg.filePath)}`);
    }
  }
}
