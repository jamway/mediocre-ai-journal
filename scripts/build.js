import fs from 'fs';
import path from 'path';
import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import hljs from 'highlight.js';

// Configuration: Define root directory and output path
const ROOT = path.resolve('./');
const OUT_DIR = path.join(ROOT, 'out');
// Skip certain directories when scanning for Markdown files
const EXCLUDE_DIRS = new Set(['.git', 'node_modules', 'out', '.github']);

// Initialize Markdown parser with configuration:
// - html: true → Allow inline HTML in Markdown
// - linkify: true → Auto-convert URLs to links
// - typographer: true → Smart typography (quotes, dashes, etc.)
// - highlight: Custom function to syntax-highlight code blocks
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  // Syntax highlighting for code blocks using highlight.js
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        // Return highlighted HTML-escaped code
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
      } catch {
        return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
      }
    }
    // Fallback: plain text code block
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  }
// Register the markdown-it-anchor plugin to auto-generate anchor links (#sections)
}).use(markdownItAnchor, {
  permalink: markdownItAnchor.permalink.linkInsideHeader({
    symbol: '§',  // Symbol shown next to header
    placement: 'after',  // Place link after header text
    class: 'anchor-link'  // CSS class for styling
  }),
});

/**
 * Recursively find all .md files in the directory tree,
 * excluding certain folders (node_modules, .git, etc.)
 * @param {string} baseDir - Directory to scan
 * @returns {string[]} Array of absolute paths to .md files
 */
function discoverMarkdownFiles(baseDir) {
  const markdownFiles = [];

  function walk(dir) {
    // Read directory entries
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      // Skip excluded directories
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Recursively walk subdirectories
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // Collect .md files
        markdownFiles.push(fullPath);
      }
    }
  }

  walk(baseDir);
  return markdownFiles;
}

function normalizeTitle(content, filePath) {
  // Extract first H1 heading from content as page title
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) return titleMatch[1].trim();
  // Fallback: use filename without extension
  return path.basename(filePath, '.md');
}

/**
 * Ensure a directory exists; create if necessary
 * @param {string} dir - Directory path
 */
function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Compute relative path to assets for a given output file
 * Used to generate correct CSS/JS references in HTML pages
 * @param {string} outputFile - Full path to output HTML file
 * @returns {string} Relative path to assets directory
 */
function assetPathFor(outputFile) {
  const relative = path.relative(path.dirname(outputFile), OUT_DIR);
  return relative.length === 0 ? 'assets' : `${relative.replace(/\\/g, '/')}/assets`;
}

/**
 * Generate the complete HTML page with layout (header, footer, navigation)
 * @param {object} options - { title, html (rendered Markdown), description, pagePath, outputFile }
 * @returns {string} Complete HTML document
 */
function renderPage({ title, html, description, pagePath, outputFile }) {
  const assetPath = assetPathFor(outputFile);
  const pageTitle = title || 'Page';
  const descriptionTag = description ? `<meta name="description" content="${description}">` : '';
  // Return complete HTML template with Markdown content embedded
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle} · Mediocre AI Journal</title>
  ${descriptionTag}
  <link rel="stylesheet" href="${assetPath}/style.css">
  <script type="module" src="${assetPath}/site.js" defer></script>
</head>
<body>
  <div class="site-shell">
    <header class="site-header">
      <a class="brand" href="${path.relative(path.dirname(outputFile), path.join(OUT_DIR, 'index.html')).replace(/\\/g, '/')}#top">Mediocre AI Journal</a>
      <button class="theme-toggle" data-action="toggle-theme">切換主題</button>
    </header>
    <main class="page-content">
      <article class="markdown-body">
        ${html}
      </article>
    </main>
    <footer class="site-footer">
      <p>本頁由 GitHub Actions 自動編譯。來源於 <code>${pagePath}</code></p>
    </footer>
  </div>
</body>
</html>`;
}

function renderIndex(pages) {
  const listItems = pages
    .map(({ title, url, excerpt }) => {
      const excerptHtml = excerpt ? `<p class="excerpt">${excerpt}</p>` : '';
      return `      <li>
        <a class="page-link" href="${url}">${title}</a>
        ${excerptHtml}
      </li>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mediocre AI Journal</title>
  <link rel="stylesheet" href="assets/style.css">
  <script type="module" src="assets/site.js" defer></script>
</head>
<body>
  <div class="site-shell">
    <header class="site-header">
      <div>
        <h1>Mediocre AI Journal</h1>
        <p>自動編譯 Markdown 為 GitHub Pages 靜態網站。</p>
      </div>
      <button class="theme-toggle" data-action="toggle-theme">切換主題</button>
    </header>
    <main class="page-content">
      <section class="hero">
        <p>更新 Markdown 後，GitHub Actions 會編譯並發布靜態頁面。</p>
      </section>
      <section class="page-list">
        <h2>已生成頁面</h2>
        <ul>
${listItems}
        </ul>
      </section>
    </main>
    <footer class="site-footer">
      <p>GitHub Pages 自動部署自 <code>gh-pages</code> 分支。</p>
    </footer>
  </div>
</body>
</html>`;
}

function renderStyleSheet() {
  return `:root {
  color-scheme: light;
  --bg: #faf0e6;
  --surface: #fff8e3;
  --surface-muted: rgba(224, 238, 224, 0.55);
  --text: #4d473c;
  --muted: #7b7162;
  --accent: #d2b48c;
  --accent-soft: #e0eee0;
  --accent-strong: #b89a72;
  --border: rgba(129, 111, 87, 0.18);
  --shadow: 0 24px 60px rgba(81, 69, 53, 0.12);
}

[data-theme="dark"] {
  --bg: #f6f0de;
  --surface: #f5ead9;
  --surface-muted: rgba(209, 193, 158, 0.38);
  --text: #4a4338;
  --muted: #7c6d5f;
  --accent: #c7a775;
  --accent-soft: #e9e4d5;
  --accent-strong: #a98f69;
  --border: rgba(129, 111, 87, 0.22);
  --shadow: 0 24px 60px rgba(81, 69, 53, 0.14);
}

* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; font-family: Inter, system-ui, sans-serif; background: radial-gradient(circle at top, rgba(224, 238, 224, 0.22), transparent 30%), linear-gradient(180deg, #fbf4e9 0%, #f8eee0 100%); color: var(--text); }
body { line-height: 1.7; background: var(--bg); }
button { font: inherit; }
img { max-width: 100%; }
.site-shell { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 48px; }
.site-header { display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: 20px 24px; border: 1px solid var(--border); border-radius: 24px; background: rgba(255, 250, 238, 0.96); backdrop-filter: blur(12px); box-shadow: var(--shadow); }
.site-header h1 { margin: 0; font-size: clamp(2rem, 2.5vw, 3rem); letter-spacing: -0.02em; color: #473d30; }
.site-header p { margin: 0.35rem 0 0; color: var(--muted); }
.brand { font-size: 1.1rem; color: var(--text); text-decoration: none; font-weight: 700; letter-spacing: -0.02em; }
.theme-toggle { border: 1px solid rgba(129, 111, 87, 0.2); background: rgba(210, 180, 140, 0.12); color: var(--text); padding: 0.8rem 1rem; border-radius: 999px; cursor: pointer; }
.hero { margin: 36px 0; padding: 32px; border-radius: 32px; background: rgba(224, 238, 224, 0.35); border: 1px solid rgba(184, 154, 114, 0.22); box-shadow: 0 20px 40px rgba(81, 69, 53, 0.08); }
.hero p { margin: 0; font-size: 1.05rem; color: #5b4f40; }
.page-list { margin-top: 24px; }
.page-list h2 { margin-bottom: 16px; font-size: 1.5rem; color: #4d473c; }
.page-list ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 16px; }
.page-list li { padding: 20px; border-radius: 24px; background: rgba(255, 248, 232, 0.85); border: 1px solid rgba(129, 111, 87, 0.14); }
.page-link { color: var(--accent-strong); text-decoration: none; font-size: 1.05rem; font-weight: 600; }
.excerpt { margin: 10px 0 0; color: var(--muted); }
.page-content { display: grid; gap: 24px; }
.markdown-body { padding: 32px; border-radius: 32px; background: rgba(255, 255, 250, 0.95); border: 1px solid rgba(129, 111, 87, 0.12); box-shadow: inset 0 0 0 1px rgba(224, 238, 224, 0.4); }
.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 { color: #4a4135; margin-top: 1.75rem; }
.markdown-body h1 { font-size: clamp(2.2rem, 4vw, 4rem); }
.markdown-body h2 { font-size: 2rem; }
.markdown-body h3 { font-size: 1.6rem; }
.markdown-body p { margin: 1rem 0; color: var(--text); }
.markdown-body a { color: var(--accent-strong); }
.markdown-body ul, .markdown-body ol { padding-left: 1.25rem; margin: 1rem 0; }
.markdown-body li { margin: 0.5rem 0; }
.markdown-body code { background: rgba(220, 204, 180, 0.35); border-radius: 12px; padding: 0.2rem 0.45rem; color: #5b4f40; }
.markdown-body pre { margin: 1.25rem 0; padding: 1.25rem; border-radius: 24px; overflow: auto; background: #f2ebdd; border: 1px solid rgba(129, 111, 87, 0.14); }
.markdown-body table { width: 100%; border-collapse: collapse; margin: 1.25rem 0; }
.markdown-body th, .markdown-body td { padding: 0.9rem 1rem; border: 1px solid rgba(129, 111, 87, 0.12); }
.markdown-body th { background: rgba(224, 238, 224, 0.4); }
.site-footer { margin-top: 40px; color: var(--muted); font-size: 0.95rem; }
@media (max-width: 760px) {
  .site-shell { width: min(100%, calc(100% - 24px)); padding: 20px 0 36px; }
  .site-header { flex-direction: column; align-items: stretch; gap: 16px; }
}
`;
}

function renderScript() {
  return `const root = document.documentElement;
const button = document.querySelector('[data-action="toggle-theme"]');

const themeMap = {
  light: 'dark',
  dark: 'light'
};

if (button) {
  button.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') || 'light';
    const next = themeMap[current] || 'light';
    root.setAttribute('data-theme', next);
    localStorage.setItem('site-theme', next);
  });
}

const stored = localStorage.getItem('site-theme');
if (stored) {
  document.documentElement.setAttribute('data-theme', stored);
} else {
  document.documentElement.setAttribute('data-theme', 'light');
}
`;
}

function extractExcerpt(content) {
  const lines = content.split(/\r?\n/);
  const excerptLine = lines.find((line) => line.trim().length > 0 && !line.startsWith('#'));
  return excerptLine ? excerptLine.trim().slice(0, 140) : '';
}

/**
 * Main build function: Transform all Markdown files into static HTML website
 * Steps:
 * 1. Discover all .md files
 * 2. Prepare output directories
 * 3. Convert each Markdown → HTML using templates
 * 4. Generate index page listing all content
 * 5. Create static assets (CSS, JS)
 * 6. Create 404.html fallback
 */
export async function buildSite() {
  // Step 1: Find all Markdown files in repo (excluding node_modules, .git, etc.)
  const markdownFiles = discoverMarkdownFiles(ROOT);
  if (!markdownFiles.length) {
    throw new Error('No markdown files found.');
  }

  // Step 2: Create output directory structure
  ensureDirectory(OUT_DIR);
  ensureDirectory(path.join(OUT_DIR, 'assets'));
  // .nojekyll tells GitHub Pages to skip Jekyll processing
  fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '');

  // Step 3: Process each Markdown file
  const pages = [];
  for (const fullPath of markdownFiles) {
    // Read Markdown content
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    // Extract page title from H1 or filename
    const title = normalizeTitle(fileContent, fullPath);
    // Render Markdown to HTML (includes syntax highlighting via highlight.js)
    const html = md.render(fileContent);
    // Determine output path (README.md → index.html, blog/*.md → blog/*.html)
    const relativePath = path.relative(ROOT, fullPath);
    const outputName = relativePath === 'README.md' ? 'index.html' : relativePath.replace(/\.md$/, '.html');
    const outputFile = path.join(OUT_DIR, outputName);
    // Create output directory if needed
    ensureDirectory(path.dirname(outputFile));
    // Render full HTML page with layout template and write to disk
    fs.writeFileSync(outputFile, renderPage({ title, html, description: extractExcerpt(fileContent), pagePath: relativePath, outputFile }));
    // Track page metadata for index generation
    pages.push({ title, url: `./${outputName}`, excerpt: extractExcerpt(fileContent) });
  }

  // Step 4: Generate index (landing) page listing all pages
  const indexFile = path.join(OUT_DIR, 'index.html');
  fs.writeFileSync(indexFile, renderIndex(pages));
  
  // Step 5: Generate static assets
  // CSS: Global stylesheet with dark theme and typography
  fs.writeFileSync(path.join(OUT_DIR, 'assets', 'style.css'), renderStyleSheet());
  // JS: Client-side theme toggler script
  fs.writeFileSync(path.join(OUT_DIR, 'assets', 'site.js'), renderScript());
  
  // Step 6: Generate 404.html fallback (shows page list on 404 errors)
  fs.writeFileSync(path.join(OUT_DIR, '404.html'), renderIndex(pages));

  return { pages };
}

if (process.argv[1].endsWith('build.js')) {
  buildSite().then(() => {
    console.log('Site generated under out/');
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
