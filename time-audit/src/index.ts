#!/usr/bin/env node

import { Command } from 'commander';
import { executeScan } from './commands/scan.js';
import { executeReport } from './commands/report.js';
import { executeStatus } from './commands/status.js';
import { executeCacheCommand } from './commands/cache.js';

const program = new Command();

program
  .name('time-audit')
  .description('Personal time audit CLI - analyze how you spend your time on the computer')
  .version('0.1.0');

program
  .command('scan')
  .description('Collect raw activity data from all available sources')
  .option('--sources <list>', 'Comma-separated list of sources (browser,vscode,git,filesystem)')
  .option('--since <date>', 'Only data since date (ISO format)')
  .option('--fresh', 'Ignore cache, re-read all data')
  .action(async (options) => {
    await executeScan(options);
  });

program
  .command('report')
  .description('Generate time audit report')
  .option('--daily', 'Daily breakdown')
  .option('--weekly', 'Weekly aggregation')
  .option('--summary', 'Overall summary (default)')
  .option('--timeline', 'Timeline view')
  .option('--since <date>', 'Start date (ISO format)')
  .option('--to <date>', 'End date (ISO format)')
  .option('--output <format>', 'Output format (terminal, json)')
  .option('--chart', 'Include bar charts', true)
  .option('--sources <list>', 'Comma-separated list of sources')
  .option('--fresh', 'Ignore cache, re-read all data')
  .action(async (options) => {
    await executeReport(options);
  });

program
  .command('status')
  .description('Show available data sources and their status')
  .action(async () => {
    await executeStatus();
  });

program
  .command('cache')
  .description('Manage cache (info, clear)')
  .argument('<action>', 'Action: info, clear')
  .argument('[args...]', 'Additional arguments')
  .action((action: string, args: string[]) => {
    executeCacheCommand(action, args);
  });

program.parse(process.argv);
