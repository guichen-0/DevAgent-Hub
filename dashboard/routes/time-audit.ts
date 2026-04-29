import { Router } from 'express';
import { BrowserReader } from '../../time-audit/src/readers/BrowserReader.js';
import { VSCodeReader } from '../../time-audit/src/readers/VSCodeReader.js';
import { GitReader } from '../../time-audit/src/readers/GitReader.js';
import { FilesystemReader } from '../../time-audit/src/readers/FilesystemReader.js';
import { analyze, generateDailySummary, generateWeeklySummary, calculateEfficiency } from '../../time-audit/src/engine/Analyzer.js';
import type { EfficiencyReport } from '../../time-audit/src/engine/Analyzer.js';
import { generateReport } from '../../time-audit/src/report/ReportGenerator.js';
import { CacheManager } from '../../time-audit/src/cache/CacheManager.js';

const router = Router();

router.get('/sources', async (req, res) => {
  const readers = [
    new BrowserReader(),
    new VSCodeReader(),
    new GitReader(),
    new FilesystemReader(),
  ];

  const results = [];
  for (const reader of readers) {
    const result = await reader.scan({ since: new Date(Date.now() - 86400000) });
    results.push({
      name: reader.name,
      source: reader.source,
      available: result.success,
      entries: result.meta.count,
      error: result.error || null,
    });
  }

  res.json({ sources: results });
});

router.post('/scan', async (req, res) => {
  const { since, fresh } = req.body || {};
  const cache = new CacheManager();
  const sinceDate = since ? new Date(since) : new Date(Date.now() - 7 * 86400000);

  const readers = [
    new BrowserReader(),
    new VSCodeReader(),
    new GitReader(),
    new FilesystemReader(),
  ];

  const allEntries: any[] = [];

  for (const reader of readers) {
    if (!fresh) {
      const cached = cache.get(reader.source);
      if (cached) {
        allEntries.push(...cached.entries);
        continue;
      }
    }

    const result = await reader.scan({ since: sinceDate });
    if (result.success) {
      allEntries.push(...result.entries);
      cache.set(reader.source, Date.now(), result.entries);
    }
  }

  res.json({ entries: allEntries.length, sources: readers.map(r => r.source) });
});

async function getEntries(since?: string, fresh?: boolean): Promise<any[]> {
  const cache = new CacheManager();
  const sinceDate = since ? new Date(since) : new Date(Date.now() - 7 * 86400000);

  const readers = [
    new BrowserReader(),
    new VSCodeReader(),
    new GitReader(),
    new FilesystemReader(),
  ];

  const allEntries: any[] = [];
  for (const reader of readers) {
    if (!fresh) {
      const cached = cache.get(reader.source);
      if (cached) { allEntries.push(...cached.entries); continue; }
    }
    const result = await reader.scan({ since: sinceDate });
    if (result.success) {
      allEntries.push(...result.entries);
      cache.set(reader.source, Date.now(), result.entries);
    }
  }
  return allEntries;
}

router.post('/report', async (req, res) => {
  const { mode = 'summary', since, to, output = 'json' } = req.body || {};
  const entries = await getEntries(since);
  const blocks = analyze(entries);

  const reportOptions = { mode: mode as 'summary' | 'daily' | 'weekly', since, to, output: 'json' as const };
  const reportText = generateReport(blocks, reportOptions);

  const targetDate = (since || new Date().toISOString().split('T')[0]);
  const dailySummary = generateDailySummary(blocks, targetDate);

  res.json({
    entries: entries.length,
    blocks: blocks.length,
    summary: dailySummary,
    raw: reportText,
  });
});

// ─── Daily Digest ───

router.post('/digest', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const entries = await getEntries(yesterday);
  const blocks = analyze(entries);

  const todaySummary = generateDailySummary(blocks, today);
  const yesterdaySummary = generateDailySummary(blocks, yesterday);
  const efficiency = calculateEfficiency(blocks);

  // Top activities (subcategories with most time)
  const activities: { name: string; category: string; ms: number }[] = [];
  for (const [cat, catData] of Object.entries(todaySummary.categories)) {
    for (const [sub, ms] of Object.entries(catData.subcategories)) {
      activities.push({ name: sub, category: cat, ms });
    }
    // Also add the category total if no subcategories
    if (Object.keys(catData.subcategories).length === 0) {
      activities.push({ name: cat, category: cat, ms: catData.totalMs });
    }
  }
  activities.sort((a, b) => b.ms - a.ms);
  const topActivities = activities.slice(0, 5);

  // Delta calculation
  const todayTotal = todaySummary.totalTrackedMs;
  const yesterdayTotal = yesterdaySummary.totalTrackedMs;
  const deltaMs = todayTotal - yesterdayTotal;

  // Suggestions based on patterns
  const suggestions: string[] = [];
  const entCat = todaySummary.categories['Entertainment'];
  const devCat = todaySummary.categories['Development'];
  const entMs = entCat?.totalMs ?? 0;
  const devMs = devCat?.totalMs ?? 0;

  if (entMs > devMs && entMs > 3600000) {
    suggestions.push('娱乐时间超过开发时间，考虑减少非必要的浏览');
  }
  if (todayTotal < 3600000) {
    suggestions.push('今日活跃时间不足1小时，可能数据不完整');
  }
  if (devMs > 0 && !todaySummary.categories['Communication']) {
    suggestions.push('今日没有通讯记录，确认是否需要检查 Slack/邮件');
  }
  if (efficiency.score < 40) {
    suggestions.push('效率评分偏低，尝试设定明确的工作目标');
  }
  if (activities.length > 0 && activities[0].ms > 7200000) {
    suggestions.push(`在"${activities[0].name}"上花费了较多时间，考虑是否需分解任务`);
  }

  res.json({
    date: today,
    totalTrackedMs: todayTotal,
    deltaMs,
    trackedHours: Math.round(todayTotal / 3600000 * 10) / 10,
    yesterdayTrackedHours: yesterdayTotal > 0 ? Math.round(yesterdayTotal / 3600000 * 10) / 10 : null,
    categories: todaySummary.categories,
    sources: todaySummary.sources,
    efficiency: {
      score: efficiency.score,
      productiveMs: efficiency.productiveMs,
      entertainmentMs: efficiency.entertainmentMs,
      ratio: Math.round(efficiency.ratio * 10) / 10,
    },
    topActivities,
    suggestions,
    yesterdayDate: yesterday,
    yesterdayTotalMs: yesterdayTotal,
  });
});

// ─── Efficiency & Trends ───

router.post('/efficiency', async (req, res) => {
  const { since, fresh } = req.body || {};
  const entries = await getEntries(since, fresh);
  const blocks = analyze(entries);
  const efficiency = calculateEfficiency(blocks);
  res.json(efficiency);
});

router.post('/trends', async (req, res) => {
  const { since, fresh } = req.body || {};
  const sinceDate = since || new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const entries = await getEntries(sinceDate, fresh);
  const blocks = analyze(entries);

  // Daily category breakdown for chart
  const summaries = generateWeeklySummary(blocks, sinceDate, today);

  const trendData = summaries.map(s => {
    const dev = s.categories['Development']?.totalMs ?? 0;
    const ent = s.categories['Entertainment']?.totalMs ?? 0;
    const social = s.categories['Social']?.totalMs ?? 0;
    const comm = s.categories['Communication']?.totalMs ?? 0;
    const other = s.totalTrackedMs - dev - ent - social - comm;
    return {
      date: s.date,
      total: s.totalTrackedMs,
      categories: {
        Development: dev,
        Entertainment: ent,
        Social: social,
        Communication: comm,
        Other: Math.max(0, other),
      },
    };
  });

  const efficiency = calculateEfficiency(blocks);

  res.json({ trends: trendData, efficiency });
});

router.get('/cache', (req, res) => {
  const cache = new CacheManager();
  res.json(cache.getInfo());
});

router.post('/cache/clear', (req, res) => {
  const { source } = req.body || {};
  const cache = new CacheManager();
  if (source) cache.clear(source);
  else cache.clear();
  res.json({ success: true });
});

export default router;
