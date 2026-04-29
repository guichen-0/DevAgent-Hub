#!/usr/bin/env node

import('../src/index.js').catch(err => {
  console.error('Failed to load config-sync:', err);
  process.exit(1);
});
