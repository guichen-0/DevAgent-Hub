#!/usr/bin/env node

import { Command } from 'commander';
import { executeInit } from './commands/init.js';
import { executeDiscover } from './commands/discover.js';
import { executeBackup } from './commands/backup.js';
import { executeRestore } from './commands/restore.js';
import { executeDiff } from './commands/diff.js';
import { executeStatus } from './commands/status.js';
import { executeList } from './commands/list.js';
import { executeProfileCommand } from './commands/profile.js';
import { executeRemoteCommand } from './commands/remote.js';

const program = new Command();

program
  .name('config-sync')
  .description('Cross-platform dev environment config sync tool')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize vault and default profile')
  .option('--dir <path>', 'Custom vault directory')
  .option('--profile <name>', 'Create and switch to a profile')
  .action(executeInit);

program
  .command('discover')
  .description('Scan machine for detectable configuration files')
  .argument('[sourceId]', 'Specific source to scan (e.g., vscode, git)')
  .action(executeDiscover);

program
  .command('backup')
  .description('Copy local configurations to vault')
  .option('--profile <name>', 'Profile to use')
  .option('--source <id>', 'Specific source to backup')
  .option('--dry-run', 'Show what would be backed up without writing')
  .action(executeBackup);

program
  .command('restore')
  .description('Copy vault configurations to local machine')
  .option('--profile <name>', 'Profile to use')
  .option('--source <id>', 'Specific source to restore')
  .option('--dry-run', 'Show what would be restored without writing')
  .option('--force', 'Restore even if files are identical')
  .action(executeRestore);

program
  .command('diff')
  .description('Show differences between local and vault configurations')
  .option('--profile <name>', 'Profile to use')
  .option('--source <id>', 'Specific source to diff')
  .action(executeDiff);

program
  .command('status')
  .description('Show sync state for all sources')
  .action(executeStatus);

program
  .command('list')
  .description('List available sources or profiles')
  .option('--sources', 'List available source adapters')
  .option('--profiles', 'List configured profiles')
  .action(executeList);

program
  .command('profile')
  .description('Manage profiles (create, switch, delete, list)')
  .argument('<action>', 'Action: create, switch, delete, list')
  .argument('[args...]', 'Additional arguments')
  .action((action: string, args: string[]) => executeProfileCommand(action, args));

program
  .command('remote')
  .description('Manage remote sync (Git-based)')
  .argument('<action>', 'Action: init, push, pull, status, disconnect')
  .argument('[args...]', 'Additional arguments')
  .action((action: string, args: string[]) => executeRemoteCommand(action, args));

program.parse(process.argv);
