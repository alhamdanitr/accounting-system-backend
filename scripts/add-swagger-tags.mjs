import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src');
const protectedModules = new Set([
  'accounting',
  'audit',
  'inventory',
  'printing',
  'products',
  'purchases',
  'reports',
  'sales',
  'settings',
  'sync',
  'whatsapp',
]);

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const moduleName = entry.name;
  const controllerPath = path.join(root, moduleName, `${moduleName}.controller.ts`);
  if (!fs.existsSync(controllerPath)) continue;
  let source = fs.readFileSync(controllerPath, 'utf8');
  if (!source.includes("from '@nestjs/swagger'")) {
    source = `import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';\n${source}`;
  } else if (!source.includes('ApiTags')) {
    source = source.replace(/import \{([^}]*)\} from '@nestjs\/swagger';/, "import {$1, ApiTags} from '@nestjs/swagger';");
  }
  source = source.replace(new RegExp(`@ApiTags\\('.*?'\\)\\n`, 'g'), '');
  source = source.replace(/@Controller\(([^)]*)\)\n/, `@ApiTags('${moduleName}')\n@Controller($1)\n`);
  if (protectedModules.has(moduleName)) {
    source = source.replace(/@ApiBearerAuth\('access-token'\)\n/g, '');
    source = source.replace(/(@ApiTags\('[^']+'\)\n@Controller\([^)]*\)\n)/, "$1@ApiBearerAuth('access-token')\n");
  }
  fs.writeFileSync(controllerPath, source);
}
