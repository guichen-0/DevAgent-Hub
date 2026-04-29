import chalk from 'chalk';
import Table from 'cli-table3';
import { generateDailySummary, generateWeeklySummary } from '../engine/Analyzer.js';
import { formatDuration, formatPercentage } from '../utils/logger.js';
import type { TimeBlock, DailySummary, ReportOptions } from '../types.js';

export function generateReport(blocks: TimeBlock[], options: ReportOptions): string {
  switch (options.mode) {
    case 'summary':
      return generateSummaryReport(blocks, options);
    case 'weekly':
      return generateWeeklyReport(blocks, options);
    case 'daily':
    default:
      return generateDailyReport(blocks, options);
  }
}

function generateDailyReport(blocks: TimeBlock[], options: ReportOptions): string {
  const targetDate = options.since ?? new Date().toISOString().split('T')[0];
  const summary = generateDailySummary(blocks, targetDate);

  if (options.output === 'json') {
    return JSON.stringify(summary, null, 2);
  }

  const lines: string[] = [];
  lines.push(chalk.bold(`\n=== Time Audit: ${summary.date} ===`));

  if (summary.totalTrackedMs === 0) {
    lines.push(chalk.dim('No data tracked for this day.\n'));
    return lines.join('\n');
  }

  lines.push(`Total tracked: ${chalk.bold(formatDuration(summary.totalTrackedMs))}\n`);

  // Category table
  const table = new Table({
    head: ['Category', 'Time', '%', ''],
    colWidths: [24, 12, 8, 20],
    style: { head: ['bold', 'white'] },
  });

  const barWidth = 20;
  for (const [catName, catData] of Object.entries(summary.categories)) {
    const barLen = Math.round((catData.percentage / 100) * barWidth);
    const bar = '█'.repeat(barLen) + '░'.repeat(barWidth - barLen);
    table.push([catName, formatDuration(catData.totalMs), formatPercentage(catData.totalMs, summary.totalTrackedMs), bar]);

    // Subcategories
    for (const [sub, ms] of Object.entries(catData.subcategories)) {
      table.push([chalk.dim(`  ${sub}`), chalk.dim(formatDuration(ms)), '', '']);
    }
  }

  lines.push(table.toString());

  // Source breakdown
  const sourceParts = Object.entries(summary.sources)
    .filter(([_, ms]) => ms > 0)
    .map(([src, ms]) => `${src} ${formatDuration(ms)}`);
  if (sourceParts.length > 0) {
    lines.push(`\nSources: ${sourceParts.join(' | ')}`);
  }

  return lines.join('\n') + '\n';
}

function generateWeeklyReport(blocks: TimeBlock[], options: ReportOptions): string {
  const dateTo = options.to ?? new Date().toISOString().split('T')[0];
  const dateFrom = options.since ?? getWeekStart(new Date());

  const summaries = generateWeeklySummary(blocks, dateFrom, dateTo);

  if (options.output === 'json') {
    return JSON.stringify(summaries, null, 2);
  }

  const lines: string[] = [];
  lines.push(chalk.bold(`\n=== Time Audit: ${dateFrom} → ${dateTo} ===\n`));

  const table = new Table({
    head: ['Day', 'Development', 'Entertainment', 'Communication', 'Other'],
    colWidths: [14, 16, 16, 16, 16],
    style: { head: ['bold', 'white'] },
  });

  let totals = { dev: 0, ent: 0, comm: 0, other: 0 };

  for (const summary of summaries) {
    const dev = summary.categories['Development']?.totalMs ?? 0;
    const ent = summary.categories['Entertainment']?.totalMs ?? 0;
    const comm = summary.categories['Communication']?.totalMs ?? 0;
    const other = summary.totalTrackedMs - dev - ent - comm;

    totals.dev += dev;
    totals.ent += ent;
    totals.comm += comm;
    totals.other += other;

    const dayName = new Date(summary.date).toLocaleDateString('en-US', { weekday: 'short', month: '2-digit', day: '2-digit' });
    table.push([dayName, formatDuration(dev), formatDuration(ent), formatDuration(comm), formatDuration(Math.max(0, other))]);
  }

  lines.push(table.toString());

  // Total row
  lines.push(chalk.dim(`Total: Dev ${formatDuration(totals.dev)} | Ent ${formatDuration(totals.ent)} | Comm ${formatDuration(totals.comm)} | Other ${formatDuration(totals.other)}`));

  return lines.join('\n') + '\n';
}

function generateSummaryReport(blocks: TimeBlock[], options: ReportOptions): string {
  const dateTo = options.to ?? new Date().toISOString().split('T')[0];
  const dateFrom = options.since ?? getWeekStart(new Date());

  const summaries = generateWeeklySummary(blocks, dateFrom, dateTo);

  if (options.output === 'json') {
    return JSON.stringify(summaries, null, 2);
  }

  // Aggregate all summaries
  const totalSummary: DailySummary = {
    date: `${dateFrom} → ${dateTo}`,
    totalTrackedMs: 0,
    categories: {},
    sources: { browser: 0, vscode: 0, git: 0, filesystem: 0 },
  };

  for (const s of summaries) {
    totalSummary.totalTrackedMs += s.totalTrackedMs;
    for (const [cat, data] of Object.entries(s.categories)) {
      if (!totalSummary.categories[cat]) {
        totalSummary.categories[cat] = { totalMs: 0, percentage: 0, subcategories: {} };
      }
      totalSummary.categories[cat].totalMs += data.totalMs;
      for (const [sub, ms] of Object.entries(data.subcategories)) {
        totalSummary.categories[cat].subcategories[sub] =
          (totalSummary.categories[cat].subcategories[sub] ?? 0) + ms;
      }
    }
    for (const [src, ms] of Object.entries(s.sources)) {
      totalSummary.sources[src as keyof typeof totalSummary.sources] += ms;
    }
  }

  // Recalculate percentages
  for (const cat of Object.values(totalSummary.categories)) {
    cat.percentage = totalSummary.totalTrackedMs > 0
      ? (cat.totalMs / totalSummary.totalTrackedMs) * 100 : 0;
  }

  return generateDailyReport(blocks, { ...options, mode: 'daily', since: dateFrom }) + `\n${chalk.dim(`Period: ${dateFrom} → ${dateTo}`)}`;
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}
