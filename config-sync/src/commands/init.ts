import { initVault } from '../core/vault.js';
import { createProfile, setActiveProfile } from '../core/vault.js';

export function executeInit(options: { dir?: string; profile?: string }): void {
  const vaultPath = options.dir;
  const success = initVault(vaultPath);

  if (!success) {
    console.error('Failed to initialize vault');
    process.exit(1);
  }

  console.log(`Vault initialized at ${vaultPath ?? '~/.config-sync'}`);

  if (options.profile) {
    createProfile(options.profile);
    setActiveProfile(options.profile);
    console.log(`Profile "${options.profile}" created and set as active`);
  }

  console.log('Run "config-sync discover" to scan for available configurations.');
}
