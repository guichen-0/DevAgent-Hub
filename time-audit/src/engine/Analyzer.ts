import { categorize } from './Categorizer.js';
import type { RawActivityEntry, TimeBlock, DailySummary, CategorySummary, DataSource } from '../types.js';

export function analyze(entries: RawActivityEntry[]): TimeBlock[] {
  // Categorize all entries
  for (const entry of entries) {
    const cat = categorize(entry);
    entry.category = cat.category;
    entry.subcategory = cat.subcategory;
  }

  // Sort by start time
  entries.sort((a, b) => a.startTime - b.startTime);

  // Merge overlapping entries into time blocks
  const blocks: TimeBlock[] = [];
  let currentBlock: TimeBlock | null = null;

  for (const entry of entries) {
    const date = new Date(entry.startTime).toISOString().split('T')[0];
    const endTime = entry.endTime ?? entry.startTime + 300000; // default 5 min
    const duration = endTime - entry.startTime;

    if (duration <= 0) continue;

    if (
      currentBlock &&
      currentBlock.category === entry.category &&
      currentBlock.subcategory === entry.subcategory &&
      currentBlock.date === date &&
      entry.startTime - currentBlock.endTime < 300000 // 5 min gap tolerance
    ) {
      // Extend current block
      currentBlock.endTime = Math.max(currentBlock.endTime, endTime);
      currentBlock.durationMs = currentBlock.endTime - currentBlock.startTime;
    } else {
      // Start new block
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = {
        date,
        startTime: entry.startTime,
        endTime,
        durationMs: duration,
        category: entry.category ?? 'Uncategorized',
        subcategory: entry.subcategory,
        source: entry.source,
        confidence: entry.endTime !== null ? 0.8 : 0.3,
      };
    }
  }

  if (currentBlock) blocks.push(currentBlock);

  return blocks;
}

export function generateDailySummary(blocks: TimeBlock[], date: string): DailySummary {
  const dayBlocks = blocks.filter(b => b.date === date);
  const totalTrackedMs = dayBlocks.reduce((sum, b) => sum + b.durationMs, 0);

  const categories: Record<string, CategorySummary> = {};
  const sources: Record<DataSource, number> = {
    browser: 0,
    vscode: 0,
    git: 0,
    filesystem: 0,
  };

  for (const block of dayBlocks) {
    // Aggregate categories
    if (!categories[block.category]) {
      categories[block.category] = { totalMs: 0, percentage: 0, subcategories: {} };
    }
    categories[block.category].totalMs += block.durationMs;

    if (block.subcategory) {
      categories[block.category].subcategories[block.subcategory] =
        (categories[block.category].subcategories[block.subcategory] ?? 0) + block.durationMs;
    }

    // Aggregate by source
    sources[block.source] = (sources[block.source] ?? 0) + block.durationMs;
  }

  // Calculate percentages
  for (const cat of Object.values(categories)) {
    cat.percentage = totalTrackedMs > 0 ? (cat.totalMs / totalTrackedMs) * 100 : 0;
  }

  return {
    date,
    totalTrackedMs,
    categories,
    sources,
  };
}

export function generateWeeklySummary(blocks: TimeBlock[], dateFrom: string, dateTo: string): DailySummary[] {
  const summaries: DailySummary[] = [];
  const start = new Date(dateFrom);
  const end = new Date(dateTo);

  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    summaries.push(generateDailySummary(blocks, dateStr));
    current.setDate(current.getDate() + 1);
  }

  return summaries;
}

// ─── Efficiency Score ───

export interface EfficiencyReport {
  score: number;             // 0-100
  productiveMs: number;
  entertainmentMs: number;
  neutralMs: number;
  totalMs: number;
  ratio: number;             // productive / entertainment
  trend: { date: string; score: number }[];
}

const PRODUCTIVE_CATEGORIES = new Set([
  'Development', 'Education', 'Productivity', 'Communication',
]);

const ENTERTAINMENT_CATEGORIES = new Set([
  'Entertainment', 'Social',
]);

export function calculateEfficiency(blocks: TimeBlock[]): EfficiencyReport {
  const byDay = new Map<string, { productive: number; entertainment: number; neutral: number; total: number }>();

  for (const block of blocks) {
    if (!byDay.has(block.date)) {
      byDay.set(block.date, { productive: 0, entertainment: 0, neutral: 0, total: 0 });
    }
    const day = byDay.get(block.date)!;
    day.total += block.durationMs;

    if (PRODUCTIVE_CATEGORIES.has(block.category)) {
      day.productive += block.durationMs;
    } else if (ENTERTAINMENT_CATEGORIES.has(block.category)) {
      day.entertainment += block.durationMs;
    } else {
      day.neutral += block.durationMs;
    }
  }

  const totals = { productive: 0, entertainment: 0, neutral: 0, total: 0 };
  const trend: { date: string; score: number }[] = [];

  for (const [date, data] of byDay) {
    totals.productive += data.productive;
    totals.entertainment += data.entertainment;
    totals.neutral += data.neutral;
    totals.total += data.total;

    const dayScore = calculateDayScore(data.productive, data.entertainment, data.total);
    trend.push({ date, score: dayScore });
  }

  trend.sort((a, b) => a.date.localeCompare(b.date));

  const overallScore = calculateDayScore(totals.productive, totals.entertainment, totals.total);
  const ratio = totals.entertainment > 0 ? totals.productive / totals.entertainment : totals.productive > 0 ? 10 : 0;

  return {
    score: overallScore,
    productiveMs: totals.productive,
    entertainmentMs: totals.entertainment,
    neutralMs: totals.neutral,
    totalMs: totals.total,
    ratio,
    trend,
  };
}

function calculateDayScore(productiveMs: number, entertainmentMs: number, totalMs: number): number {
  if (totalMs === 0) return 0;

  const productiveRatio = productiveMs / totalMs;
  const entertainmentRatio = entertainmentMs / totalMs;

  // Base score from productive ratio
  let score = productiveRatio * 100;

  // Penalty for high entertainment
  if (entertainmentRatio > 0.3) {
    score -= (entertainmentRatio - 0.3) * 50;
  }

  // Bonus for high productive + low entertainment
  if (productiveRatio > 0.5 && entertainmentRatio < 0.2) {
    score += 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
