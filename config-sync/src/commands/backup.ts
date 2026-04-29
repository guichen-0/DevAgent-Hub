import picocolors from 'picocolors';
import { backupProfile } from '../core/sync-engine.js';
import { getActiveProfile, getProfiles, setActiveProfile } from '../core/vault.js';

export function executeBackup(options: { profile?: string; source?: string; dryRun?: boolean }): void {
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

  if (dryRun) {
    console.log(picocolors.dim('--- DRY RUN ---'));
  }

  console.log(`Backing up profile: ${picocolors.bold(profileName!)}`);
  const results = backupProfile(profileName!, dryRun);

  for (const result of results) {
    const successCount = result.fileResults.filter(r => r.success).length;
    const failCount = result.fileResults.filter(r => !r.success).length;

    if (successCount > 0) {
      console.log(`  ${picocolors.green('✓')} ${result.sourceId}: ${successCount} file(s) backed up`);
    }
    if (failCount > 0) {
      console.log(`  ${picocolors.red('✗')} ${result.sourceId}: ${failCount} file(s) failed`);
      for (const fr of result.fileResults.filter(r => !r.success)) {
        console.log(`    ${picocolors.dim(fr.error ?? 'unknown error')}`);
      }
    }
  }

  const totalSuccess = results.reduce((acc, r) => acc + r.fileResults.filter(f => f.success).length, 0);
  console.log(`\nDone. ${totalSuccess} file(s) backed up.`);
}
