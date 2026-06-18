/**
 * Screenshot Script: Use Playwright to capture rendered HTML pages
 * Purpose: Generate baseline screenshots for visual regression testing
 * Usage: node scripts/screenshot.js [target-html-file]
 */

import { chromium } from 'playwright';
import path from 'path';

// Default target: blog sample post (can be overridden via command line)
const target = process.argv[2] || 'out/blog/sample-post.html';
const resolved = path.resolve(target);
// Convert file path to file:// URL for Playwright
const url = `file://${resolved}`;

(async () => {
  console.log('Opening', url);
  // Launch headless Chromium browser
  const browser = await chromium.launch();
  // Create a new page with 1280x720 viewport (standard preview size)
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  // Navigate to the HTML file and wait for network to be idle
  await page.goto(url, { waitUntil: 'networkidle' });
  // Wait 500ms to ensure any animations/transitions complete
  await page.waitForTimeout(500);
  // Determine output directory and filename
  const outDir = path.join('out', 'blog');
  const outFile = path.join(outDir, 'sample-post.png');
  // Capture screenshot (fullPage: true captures entire scrollable content)
  await page.screenshot({ path: outFile, fullPage: true });
  console.log('Saved screenshot to', outFile);
  // Clean up: close browser
  await browser.close();
})();
