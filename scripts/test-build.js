import fs from 'fs';
import path from 'path';
import { buildSite } from './build.js';

async function run() {
  const root = path.resolve('./');
  const outDir = path.join(root, 'out');
  await buildSite();

  if (!fs.existsSync(outDir)) {
    throw new Error('Build output directory not found.');
  }

  const markdownFiles = fs.readdirSync(root).filter((entry) => entry.endsWith('.md'));
  const missing = [];
  for (const file of markdownFiles) {
    const expected = file === 'README.md' ? 'index.html' : file.replace(/\.md$/, '.html');
    const expectedPath = path.join(outDir, expected);
    if (!fs.existsSync(expectedPath)) {
      missing.push(expected);
    }
  }

  if (missing.length) {
    throw new Error(`Missing generated HTML output for: ${missing.join(', ')}`);
  }

  console.log('Build verification passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
