import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'template.png');
const target = path.join(root, 'netlify/functions/_shared/template-base64.ts');

const bytes = await readFile(source);
const base64 = bytes.toString('base64');

const content = `/**
 * FILE GENERATED — jangan edit manual.
 * Sumber: template.png
 * Regenerate: npm run template:embed
 */
export const TEMPLATE_BASE64 = '${base64}';
`;

await writeFile(target, content, 'utf8');
console.log(`Embedded template.png (${bytes.length} bytes) -> ${target}`);
