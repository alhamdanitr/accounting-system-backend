import fs from 'node:fs';
import path from 'node:path';

const sourceRoot = path.resolve('src');
const violations = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(absolutePath);
      continue;
    }
    if (!entry.name.endsWith('.ts')) continue;
    const relativePath = path.relative(process.cwd(), absolutePath);
    const lines = fs.readFileSync(absolutePath, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/\bconsole\.(log|error|warn|debug|info|trace)\s*\(/.test(line)) {
        violations.push(`${relativePath}:${index + 1}`);
      }
    });
  }
}

visit(sourceRoot);
if (violations.length > 0) {
  console.error('Console usage is forbidden inside src; use Nest Logger instead:');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}
console.log('Console usage audit passed for src.');
