import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(process.cwd(), 'src');
const publicControllers = new Set(['auth.controller.ts', 'health.controller.ts']);
const publicMethods = new Set([
  'company.controller.ts:createCompany',
  'users.controller.ts:createUser',
]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (entry.name.endsWith('.controller.ts')) files.push(path);
  }
  return files;
}

const violations = [];
for (const file of await walk(root)) {
  const source = await readFile(file, 'utf8');
  const basename = file.split('/').pop();
  const hasClassGuard = /@UseGuards\([\s\S]*?\)[\s\S]{0,240}export class/.test(source);
  if (publicControllers.has(basename)) continue;
  if (hasClassGuard) continue;

  const lines = source.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^\s+@(Get|Post|Put|Patch|Delete)\(/.test(lines[index])) continue;
    const methodBlock = lines.slice(index, Math.min(index + 18, lines.length)).join('\n');
    const methodMatch = methodBlock.match(/async\s+(\w+)\s*\(/);
    if (!methodMatch) continue;
    const method = methodMatch[1];
    const key = `${basename}:${method}`;
    if (publicMethods.has(key)) continue;
    if (!/@UseGuards\([^\n]+\)/.test(methodBlock)) {
      violations.push(`${file}:${index + 1} ${method}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Unprotected controller routes detected:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Route guard audit passed. Public routes are explicitly allowlisted.');
