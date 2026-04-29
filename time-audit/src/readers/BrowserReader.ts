import * as fs from 'node:fs';
import { BaseReader } from './BaseReader.js';
import { CHROME_HISTORY_PATH, EDGE_HISTORY_PATH } from '../constants.js';
import * as path from 'node:path';
import * as os from 'node:os';
import { warn } from '../utils/logger.js';
import type { RawActivityEntry, DataSource } from '../types.js';

// Chrome epoch is 1601-01-01 UTC in microseconds
const WINDOWS_EPOCH_MS = 11644473600000;

function chromeTimeToJs(chromeTime: number): number {
  return Math.floor(chromeTime / 1000) - WINDOWS_EPOCH_MS;
}

interface BrowserConfig {
  source: 'browser';
  browserName: string;
  historyPath: string | null;
}

export class BrowserReader extends BaseReader {
  readonly source: DataSource = 'browser';
  readonly name = 'Browser History';

  private browsers: BrowserConfig[];

  constructor() {
    super();
    this.browsers = [
      { source: 'browser', browserName: 'Chrome', historyPath: CHROME_HISTORY_PATH },
      { source: 'browser', browserName: 'Edge', historyPath: EDGE_HISTORY_PATH },
    ];
  }

  async read(options: { since?: Date } = {}): Promise<RawActivityEntry[]> {
    const allEntries: RawActivityEntry[] = [];

    for (const browser of this.browsers) {
      if (!browser.historyPath || !fs.existsSync(browser.historyPath)) {
        continue;
      }

      try {
        const entries = await this.readBrowserHistory(browser.historyPath, browser.browserName, options.since);
        allEntries.push(...entries);
      } catch (err) {
        warn(`Cannot read ${browser.browserName} history (may be locked): ${(err as Error).message}`);
      }
    }

    return allEntries;
  }

  private async readBrowserHistory(
    dbPath: string,
    browserName: string,
    since?: Date
  ): Promise<RawActivityEntry[]> {
    // Copy the database file to avoid SQLite locking issues
    const tmpPath = path.join(os.tmpdir(), `time-audit-${browserName}-history-${Date.now()}.db`);
    fs.copyFileSync(dbPath, tmpPath);

    try {
      const initSqlJs = await import('sql.js');
      const SQL = await initSqlJs.default();
      const buffer = fs.readFileSync(tmpPath);
      const db = new SQL.Database(buffer);

      const sinceTimestamp = since ? since.getTime() : 0;

      const query = `
        SELECT
          urls.id,
          urls.url,
          urls.title,
          visits.visit_time,
          visits.visit_duration
        FROM urls
        JOIN visits ON urls.id = visits.url
        WHERE visits.visit_duration > 0
          AND visits.visit_time > 0
        ORDER BY visits.visit_time DESC
        LIMIT 10000
      `;

      const results = db.exec(query);
      db.close();

      if (results.length === 0 || results[0].values.length === 0) {
        return [];
      }

      const entries: RawActivityEntry[] = [];
      const columns = results[0].columns;
      const idIdx = columns.indexOf('id');
      const urlIdx = columns.indexOf('url');
      const titleIdx = columns.indexOf('title');
      const timeIdx = columns.indexOf('visit_time');
      const durationIdx = columns.indexOf('visit_duration');

      for (const row of results[0].values) {
        const visitTime = Number(row[timeIdx]);
        const visitDuration = Number(row[durationIdx]);

        const startMs = chromeTimeToJs(visitTime);
        if (sinceTimestamp > 0 && startMs < sinceTimestamp) continue;

        const durationMs = Math.floor(visitDuration / 1000); // microseconds to ms

        const url = String(row[urlIdx] ?? '');
        const title = String(row[titleIdx] ?? '');

        entries.push({
          id: `browser-${browserName}-${row[idIdx]}`,
          source: 'browser',
          startTime: startMs,
          endTime: durationMs > 0 ? startMs + durationMs : null,
          title: title || url,
          detail: url,
          category: null,
          subcategory: null,
          metadata: { browser: browserName },
        });
      }

      return entries;
    } finally {
      // Clean up temp file
      try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    }
  }
}
