import picocolors from 'picocolors';
import { getActiveProfile, getManifest } from '../core/vault.js';
import { getSourcesForCurrentPlatform } from '../sources/registry.js';
import { hashFile } from '../utils/hasher.js';

export function executeStatus(): void {
  const profile = getActiveProfile();
  if (!profile) {
    console.log('No active profile. Run "config-sync init" first.');
    return;
  }

  console.log(`Active profile: ${picocolors.bold(profile.name)}`);
  console.log();

  const manifest = getManifest(profile.name);
  const sources = getSourcesForCurrentPlatform();

  console.log(`${picocolors.bold('Source')}          ${picocolors.bold('Status')}`);
  console.log('-'.repeat(40));

  for (const source of sources) {
    if (!source.isInstalled()) {
      console.log(`${source.name.padEnd(16)} ${picocolors.dim('not installed')}`);
      continue;
    }

    const sourceManifest = manifest?.sources[source.id];
    if (!sourceManifest) {
      console.log(`${source.name.padEnd(16)} ${picocolors.yellow('not backed up')}`);
      continue;
    }

    const configs = source.detectConfigs();
    let upToDate = 0;
    let outdated = 0;
    let missing = 0;

    for (const cfg of configs) {
      const entry = sourceManifest.files[cfg.fileId];
      if (!entry) {
        missing++;
        continue;
      }
      const localHash = hashFile(cfg.filePath);
      if (localHash === entry.hash) {
        upToDate++;
      } else {
        outdated++;
      }
    }

    if (outdated === 0 && missing === 0) {
      console.log(`${source.name.padEnd(16)} ${picocolors.green('up to date')} (${upToDate} files)`);
    } else if (outdated > 0) {
      console.log(`${source.name.padEnd(16)} ${picocolors.yellow(`${outdated} outdated`)}${missing > 0 ? `, ${missing} new` : ''}`);
    } else {
      console.log(`${source.name.padEnd(16)} ${picocolors.green('up to date')} (${upToDate} files)`);
    }
  }
}
