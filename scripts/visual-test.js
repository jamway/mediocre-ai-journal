/**
 * Visual Regression Test Script
 * Purpose: Compare current screenshot with baseline to detect unintended style changes
 * Workflow: Read baseline → Read current → Compare pixels → Output diff → Exit with status code
 * Usage: node scripts/visual-test.js
 */

import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

// Directory and file paths
const baselineDir = path.join('tests', 'baseline');
const outDir = path.join('out', 'blog');
const fileName = 'sample-post.png';
const baselinePath = path.join(baselineDir, fileName);
const currentPath = path.join(outDir, fileName);
const diffPath = path.join(outDir, 'sample-post-diff.png');

/**
 * Asynchronously read PNG file and return PNG object
 * @param {string} filePath - Path to PNG file
 * @returns {Promise<PNG>} Parsed PNG object with pixel data
 */
function readPNG(filePath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(new PNG())
      .on('parsed', function () {
        resolve(this);
      })
      .on('error', reject);
  });
}

(async function () {
  // Check if baseline exists
  if (!fs.existsSync(baselinePath)) {
    console.error('Baseline image not found at', baselinePath);
    process.exit(2);
  }
  // Check if current screenshot exists
  if (!fs.existsSync(currentPath)) {
    console.error('Current screenshot not found at', currentPath);
    process.exit(2);
  }

  // Read both images
  const img1 = await readPNG(baselinePath);
  const img2 = await readPNG(currentPath);

  // Verify dimensions match
  if (img1.width !== img2.width || img1.height !== img2.height) {
    console.error('Image dimensions differ:', img1.width, 'x', img1.height, 'vs', img2.width, 'x', img2.height);
    process.exit(3);
  }

  // Create diff image and compare pixels
  const { width, height } = img1;
  const diff = new PNG({ width, height });
  // pixelmatch: returns number of mismatched pixels
  // threshold: 0.15 means 15% color difference tolerance per pixel
  const mismatched = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.15 });

  // Write diff image for visual inspection
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  // Calculate mismatch ratio
  const totalPixels = width * height;
  const ratio = mismatched / totalPixels;
  console.log(`Mismatched pixels: ${mismatched} (${(ratio * 100).toFixed(3)}%)`);

  // Fail if ratio exceeds threshold (0.2% by default)
  const failThreshold = 0.002; // 0.2% default threshold
  if (ratio > failThreshold) {
    console.error('Visual test failed: difference exceeds threshold');
    process.exit(1);
  }

  console.log('Visual test passed');
})();
