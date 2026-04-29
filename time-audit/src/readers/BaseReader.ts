import type { DataSource, RawActivityEntry, ScanResult } from '../types.js';

export abstract class BaseReader {
  abstract readonly source: DataSource;
  abstract readonly name: string;

  abstract read(options: { since?: Date }): Promise<RawActivityEntry[]>;

  async scan(options: { since?: Date } = {}): Promise<ScanResult> {
    const start = Date.now();
    try {
      const entries = await this.read(options);
      const end = Date.now();
      return {
        source: this.source,
        success: true,
        entries,
        durationMs: end - start,
        meta: {
          count: entries.length,
          timeRange: entries.length > 0
            ? [
                Math.min(...entries.map(e => e.startTime)),
                Math.max(...entries.map(e => e.endTime ?? e.startTime)),
              ]
            : null,
        },
      };
    } catch (err) {
      const end = Date.now();
      return {
        source: this.source,
        success: false,
        error: (err as Error).message,
        entries: [],
        durationMs: end - start,
        meta: { count: 0, timeRange: null },
      };
    }
  }
}
