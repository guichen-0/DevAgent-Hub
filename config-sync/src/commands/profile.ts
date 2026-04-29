import picocolors from 'picocolors';
import {
  getProfiles, setActiveProfile, createProfile, deleteProfile
} from '../core/vault.js';

export function executeProfileCommand(action: string, args: string[]): void {
  switch (action) {
    case 'create': {
      const name = args[0];
      if (!name) {
        console.error('Usage: config-sync profile create <name>');
        process.exit(1);
      }
      const desc = args.slice(1).join(' ') || undefined;
      if (createProfile(name, desc)) {
        console.log(`Profile "${name}" created.`);
      } else {
        console.error(`Profile "${name}" already exists.`);
        process.exit(1);
      }
      break;
    }

    case 'switch': {
      const name = args[0];
      if (!name) {
        console.error('Usage: config-sync profile switch <name>');
        process.exit(1);
      }
      if (setActiveProfile(name)) {
        console.log(`Switched to profile "${name}".`);
      } else {
        console.error(`Profile "${name}" not found.`);
        process.exit(1);
      }
      break;
    }

    case 'delete': {
      const name = args[0];
      if (!name) {
        console.error('Usage: config-sync profile delete <name>');
        process.exit(1);
      }
      if (deleteProfile(name)) {
        console.log(`Profile "${name}" deleted.`);
      } else {
        console.error(`Cannot delete profile "${name}". It may not exist or is the default profile.`);
        process.exit(1);
      }
      break;
    }

    case 'list': {
      const { profiles, activeProfile } = getProfiles();
      for (const p of profiles) {
        const isActive = p.name === activeProfile;
        console.log(`  ${isActive ? picocolors.green('→') : ' '} ${p.name}${isActive ? ' (active)' : ''}`);
      }
      break;
    }

    default:
      console.error('Unknown profile action. Use: create, switch, delete, list');
      process.exit(1);
  }
}
