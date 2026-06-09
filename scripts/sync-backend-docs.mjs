import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const backendDocsDir = path.resolve(frontendRoot, '../backend/docs');
const backendReadme = path.resolve(frontendRoot, '../backend/README.md');
const targetDir = path.resolve(frontendRoot, 'docs/backend');

const docFiles = [
  'GUIA_IDENTIFICADORES.md',
  'GLOSARIO_SCHEMAS.md',
  'API.md',
  'DATABASE.md',
  'ENVIRONMENT.md',
  'INTEGRACIONES.md',
];

if (!fs.existsSync(backendDocsDir)) {
  console.log('[sync-backend-docs] Backend no presente; se usan copias en frontend/docs/backend');
  process.exit(0);
}

fs.mkdirSync(targetDir, { recursive: true });

for (const file of docFiles) {
  const source = path.join(backendDocsDir, file);
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, path.join(targetDir, file));
  }
}

if (fs.existsSync(backendReadme)) {
  fs.copyFileSync(backendReadme, path.join(targetDir, 'README.md'));
}

console.log('[sync-backend-docs] Documentación backend sincronizada en frontend/docs/backend');
