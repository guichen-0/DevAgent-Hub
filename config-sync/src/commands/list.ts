import picocolors from 'picocolors';
import { getSourcesForCurrentPlatform } from '../sources/registry.js';
import { getProfiles } from '../core/vault.js';

export function executeList(options: { sources?: boolean; profiles?: boolean }): void {
  if (options.sources) {
    console.log(picocolors.bold('Available sources:'));
    const sources = getSourcesForCurrentPlatform();
    for (const source of sources) {
      const installed = source.isInstalled();
      console.log(`  ${installed ? picocolors.green('✓') : picocolors.dim('✗')} ${source.name} — ${source.description}`);
    }
  }

  if (options.profiles || (!options.sources && !options.profiles)) {
    if (options.sources) console.log();
    console.log(picocolors.bold('Profiles:'));
    const { profiles, activeProfile } = getProfiles();
    for (const profile of profiles) {
      const isActive = profile.name === activeProfile;
      console.log(`  ${isActive ? picocolors.green('→') : ' '} ${profile.name}${isActive ? ' (active)' : ''}`);
      if (profile.description) {
        console.log(`    ${picocolors.dim(profile.description)}`);
      }
    }
  }
}
