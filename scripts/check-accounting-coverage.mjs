import fs from 'node:fs';

const reportPath = 'coverage/coverage-final.json';
const targetSuffix = '/src/accounting/accounting.service.ts';
const minimum = { statements: 100, functions: 100, lines: 100, branches: 95 };

if (!fs.existsSync(reportPath)) {
  console.error(`Coverage artifact not found: ${reportPath}`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const entry = Object.entries(report).find(([file]) => file.endsWith(targetSuffix))?.[1];
if (!entry) {
  console.error(`Coverage entry not found for ${targetSuffix}`);
  process.exit(1);
}

function percentage(counts) {
  const values = Object.values(counts).flatMap((value) => (Array.isArray(value) ? value : [value]));
  if (values.length === 0) return 100;
  return (values.filter((value) => value > 0).length / values.length) * 100;
}

const actual = {
  statements: percentage(entry.s),
  functions: percentage(entry.f),
  lines: percentage(entry.s),
  branches: percentage(entry.b),
};
const failures = Object.entries(minimum).filter(([metric, threshold]) => actual[metric] + Number.EPSILON < threshold);
console.log(`Accounting coverage: ${Object.entries(actual).map(([metric, value]) => `${metric}=${value.toFixed(2)}%`).join(', ')}`);
if (failures.length > 0) {
  console.error(`Accounting coverage below policy: ${failures.map(([metric, threshold]) => `${metric} requires ${threshold}%`).join(', ')}`);
  process.exit(1);
}
console.log('Accounting coverage policy passed.');
