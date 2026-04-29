#!/usr/bin/env node

import('../src/index.js').catch(err => {
  console.error('Failed to load time-audit:', err);
  process.exit(1);
});
