import picocolors from 'picocolors';
import { restoreProfile } from '../core/sync-engine.js';
import { getActiveProfile } from '../core/vault.js';

export function executeRestore(options: { profile?: string; dryRun?: boolean; force?: boolean }): void {
  let profileName = options.profile;
  if (!profileName) {
    const active = getActiveProfile();
    if (!active) {
      console.error('No active profile. Run "config-sync init" or specify --profile.');
      process.exit(1);
    }
    profileName = active.name;
  }

  const dryRun = options.dryRun ?? false;
  const force = options.force ?? false;

  if (dryRun) {
    console.log(picocolors.dim('--- DRY RUN ---'));
  }

  console.log(`Restoring profile: ${picocolors.bold(profileName!)}`);
  const results = restoreProfile(profileName!, dryRun, force);

  for (const result of results) {
    for (const fr of result.fileResults) {
      if (fr.success) {
        if (fr.skipped) {
          console.log(`  ${picocolors.dim('-')} ${result.sourceId}/${fr.fileId}: up-to-date, skipped`);
        } else {
          console.log(`  ${picocolors.green('✓')} ${result.sourceId}/${fr.fileId}: restored`);
        }
      } else {
        console.log(`  ${picocolors.red('✗')} ${result.sourceId}/${fr.fileId}: ${fr.error}`);
      }
    }
  }
}
