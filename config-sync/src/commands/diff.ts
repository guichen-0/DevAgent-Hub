import picocolors from 'picocolors';
import { getActiveProfile, getManifest } from '../core/vault.js';
import { readFileSafe } from '../utils/file-utils.js';
import * as path from 'node:path';
import { getProfileVaultDir } from '../utils/paths.js';
import { getSourceById } from '../sources/registry.js';

export function executeDiff(options: { profile?: string; source?: string }): void {
  const profileName = options.profile ?? getActiveProfile()?.name;
  if (!profileName) {
    console.error('No active profile.');
    process.exit(1);
  }

  const manifest = getManifest(profileName);
  if (!manifest) {
    console.error('No backup found for this profile. Run "config-sync backup" first.');
    process.exit(1);
  }

  const vaultDir = getProfileVaultDir(profileName);
  const sourceIds = options.source ? [options.source] : Object.keys(manifest.sources);

  for (const sourceId of sourceIds) {
    const sourceManifest = manifest.sources[sourceId];
    if (!sourceManifest) {
      console.log(`${picocolors.yellow('?')} ${sourceId}: no backup data`);
      continue;
    }

    const source = getSourceById(sourceId);
    if (!source) continue;

    console.log(`\n${picocolors.bold(source.name)}`);

    for (const [fileId, entry] of Object.entries(sourceManifest.files)) {
      const localContent = readFileSafe(entry.originalPath);
      const vaultContent = readFileSafe(path.join(vaultDir, entry.relativePath));

      if (localContent === null) {
        console.log(`  ${picocolors.red('✗')} ${entry.label}: local file not found`);
        continue;
      }
      if (vaultContent === null) {
        console.log(`  ${picocolors.yellow('?')} ${entry.label}: vault file not found`);
        continue;
      }

      if (localContent === vaultContent) {
        console.log(`  ${picocolors.green('✓')} ${entry.label}: identical`);
      } else {
        console.log(`  ${picocolors.yellow('~')} ${entry.label}: differs from backup`);
        // Show simple line-based diff
        const localLines = localContent.split('\n');
        const vaultLines = vaultContent.split('\n');
        let diffCount = 0;
        const maxLines = Math.max(localLines.length, vaultLines.length);
        for (let i = 0; i < maxLines && diffCount < 10; i++) {
          if (localLines[i] !== vaultLines[i]) {
            const lineNum = i + 1;
            if (localLines[i] !== undefined) {
              console.log(`    ${picocolors.red('-')} L${lineNum}: ${localLines[i].trim().substring(0, 80)}`);
            }
            if (vaultLines[i] !== undefined) {
              console.log(`    ${picocolors.green('+')} L${lineNum}: ${vaultLines[i].trim().substring(0, 80)}`);
            }
            diffCount++;
          }
        }
        if (diffCount >= 10) {
          console.log(`    ${picocolors.dim('... more differences ...')}`);
        }
      }
    }
  }
}
