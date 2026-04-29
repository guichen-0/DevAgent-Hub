import { analyze } from '../engine/Analyzer.js';
import { generateReport } from '../report/ReportGenerator.js';
import { info, error as logError } from '../utils/logger.js';
import { executeScan } from './scan.js';
import type { ReportOptions, RawActivityEntry } from '../types.js';

interface ReportCommandOptions {
  daily?: boolean;
  weekly?: boolean;
  summary?: boolean;
  timeline?: boolean;
  since?: string;
  to?: string;
  output?: string;
  chart?: boolean;
  sources?: string;
  fresh?: boolean;
}

export async function executeReport(options: ReportCommandOptions): Promise<void> {
  let entries: RawActivityEntry[];

  // Determine report mode
  const mode = options.daily ? 'daily' as const
    : options.weekly ? 'weekly' as const
    : options.timeline ? 'timeline' as const
    : 'summary' as const;

  try {
    entries = await executeScan({
      sources: options.sources,
      since: options.since,
      fresh: options.fresh,
    });
  } catch (err) {
    logError(`Scan failed: ${(err as Error).message}`);
    process.exit(1);
  }

  if (entries.length === 0) {
    info('No data to report.');
    return;
  }

  info(`Analyzing ${entries.length} entries...`);
  const blocks = analyze(entries);
  info(`Generated ${blocks.length} time blocks.`);

  const reportOptions: ReportOptions = {
    mode,
    since: options.since,
    to: options.to,
    output: options.output === 'json' ? 'json' : 'terminal',
    chart: options.chart ?? true,
  };

  const report = generateReport(blocks, reportOptions);
  console.log(report);
}
