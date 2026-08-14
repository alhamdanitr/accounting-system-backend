import { readFile } from 'node:fs/promises';

const coveragePath = new URL('../coverage/coverage-summary.json', import.meta.url);
const coverage = JSON.parse(await readFile(coveragePath, 'utf8'));
const thresholds = { statements: 75, lines: 75, functions: 75, branches: 65 };
const failures = [];

for (const [metric, minimum] of Object.entries(thresholds)) {
  const actual = coverage.total?.[metric]?.pct;
  if (typeof actual !== 'number' || actual < minimum) {
    failures.push(`${metric}: ${actual ?? 'missing'}% < ${minimum}%`);
  }
  console.log(`${metric}: ${actual}% (minimum ${minimum}%)`);
}

if (failures.length) {
  console.error(`Global coverage policy failed: ${failures.join('; ')}`);
  process.exit(1);
}

console.log('Global coverage policy passed.');
