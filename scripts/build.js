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
// - html: true → allow inline HTML
// - linkify: true → auto-convert URLs to links
// - typographer: true → smart typography
// - highlight: custom function to syntax-highlight code blocks
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
    symbol: '('-')',
    placement: 'after',
    class: 'anchor-link'
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

// function normalizeTitle(content, filePath) {
//   // Extract first H1 heading from content as page title
//   const titleMatch = content.match(/^#\s+(.+)$/m);
//   if (titleMatch) return titleMatch[1].trim();
//   // Fallback: use filename without extension
//   return path.basename(filePath, '.md');
// }

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
 * Extract the first heading from Markdown content as a fallback title.
 * @param {string} content
 * @param {string} filePath
 * @returns {string}
 */
function normalizeTitle(content, filePath) {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) return titleMatch[1].trim();
  return path.basename(filePath, '.md');
}

/**
 * Extract a short excerpt from Markdown content.
 * Ignores YAML front matter and first heading.
 * @param {string} content
 * @returns {string}
 */
function extractExcerpt(content) {
  const body = content.replace(/^---[\s\S]*?---\s*/, '');
  const lines = body.split(/\r?\n/);
  const excerptLine = lines.find((line) => line.trim().length > 0 && !line.startsWith('#'));
  return excerptLine ? excerptLine.trim().slice(0, 140) : '';
}

/**
 * Parse YAML front matter from the top of a Markdown file.
 * Supports simple scalar values and tag arrays.
 * @param {string} content
 * @returns {{metadata: object, content: string}}
 */
function parseFrontMatter(content) {
  const frontMatterMatch = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  const metadata = {};

  if (!frontMatterMatch) {
    return { metadata, content };
  }

  const raw = frontMatterMatch[1];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...valueParts] = trimmed.split(':');
    if (!key) continue;
    const normalizedKey = key.trim().toLowerCase();
    const value = valueParts.join(':').trim();

    if (normalizedKey === 'tags') {
      const listMatch = value.match(/^\[(.*)\]$/);
      const payload = listMatch ? listMatch[1] : value;
      metadata.tags = payload
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    } else if (normalizedKey === 'date') {
      metadata.date = value;
    } else if (normalizedKey === 'title') {
      metadata.title = value;
    } else if (normalizedKey === 'summary') {
      metadata.summary = value;
    }
  }

  return { metadata, content: content.slice(frontMatterMatch[0].length) };
}

/**
 * Format a date string into a localized date.
 * @param {string} dateString
 * @returns {string}
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return dateString;
  return parsed.toLocaleDateString('zh-Hant', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Normalize page metadata and provide safe defaults.
 * @param {string} fileContent
 * @param {string} filePath
 * @returns {{title:string, excerpt:string, date:string, tags:string[], content:string}}
 */
function normalizePageMetadata(fileContent, filePath) {
  const { metadata, content } = parseFrontMatter(fileContent);
  const title = metadata.title || normalizeTitle(content, filePath);
  const excerpt = metadata.summary || extractExcerpt(content);
  const date = formatDate(metadata.date || '');
  const tags = Array.isArray(metadata.tags) && metadata.tags.length > 0 ? metadata.tags : ['全部'];
  return { title, excerpt, date, tags, content };
}

/**
 * Render the HTML template for an individual Markdown page.
 * @param {object} options
 * @returns {string}
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
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pagefind@latest/dist/pagefind.css">
  <script type="module" src="${assetPath}/site.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/pagefind@latest/dist/pagefind.js" defer></script>
</head>
<body>
  <div class="site-shell">
    <header class="site-header">
      <a class="brand" href="${path.relative(path.dirname(outputFile), path.join(OUT_DIR, 'index.html')).replace(/\\/g, '/')}#top">Mediocre AI Journal</a>
      <button class="theme-toggle" data-action="toggle-theme">切換主題</button>
    </header>
    <main class="page-content" data-pagefind-body>
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

/**
 * Render the homepage with responsive card layout and search UI.
 * @param {Array} pages
 * @returns {string}
 */
function renderIndex(pages) {
  const topics = ['全部', '業界觀察', '職場學寫', '技術研究', '社會影響'];
  const filterButtons = topics
    .map((topic) => `          <button class="filter-button${topic === '全部' ? ' is-active' : ''}" data-tag="${topic}">${topic}</button>`)
    .join('\n');

  const listItems = pages
    .map(({ title, url, excerpt, date, tags }) => {
      const tagPills = tags.map((tag) => `<span class="tag-pill">${tag}</span>`).join('');
      const displayDate = date ? `<time datetime="${date}">${date}</time>` : '';
      const excerptHtml = excerpt ? `<p class="excerpt">${excerpt}</p>` : '';
      return `      <li class="post-card" data-tags="${tags.join(' ')}">
        <a class="card-link" href="${url}">
          <div class="card-meta">
            ${displayDate}
            <div class="card-tags">${tagPills}</div>
          </div>
          <h3>${title}</h3>
          ${excerptHtml}
        </a>
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
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pagefind@latest/dist/pagefind.css">
  <script type="module" src="assets/site.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/pagefind@latest/dist/pagefind.js" defer></script>
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
    <main class="page-content" data-pagefind-body>
      <section class="hero">
        <p>更新 Markdown 後，GitHub Actions 會編譯並發布靜態頁面。可透過標籤篩選與全文搜尋快速找到筆記。</p>
      </section>
      <section class="filter-panel">
        <div class="filter-label">主題分類</div>
        <div class="filter-buttons">
${filterButtons}
        </div>
      </section>
      <div id="search"></div>
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

/**
 * Render shared CSS including dark theme and Pagefind overrides.
 * @returns {string}
 */
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
  --card-bg: rgba(255, 248, 232, 0.95);
  --pagefind-surface: #fff8e3;
  --pagefind-text: #4d473c;
}

[data-theme="dark"] {
  color-scheme: dark;
  --bg: #1e1b18;
  --surface: #27221d;
  --surface-muted: rgba(64, 57, 50, 0.32);
  --text: #e6dfd5;
  --muted: #b8ab96;
  --accent: #c4a96b;
  --accent-soft: #3a332d;
  --accent-strong: #d9c79d;
  --border: rgba(255, 255, 255, 0.08);
  --shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  --card-bg: rgba(40, 34, 28, 0.9);
  --pagefind-surface: #2f2a25;
  --pagefind-text: #e6dfd5;
}

* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; font-family: Inter, system-ui, sans-serif; background: radial-gradient(circle at top, rgba(224, 238, 224, 0.22), transparent 30%), linear-gradient(180deg, #fbf4e9 0%, #f8eee0 100%); color: var(--text); }
body { line-height: 1.7; background: var(--bg); }
button { font: inherit; }
img { max-width: 100%; }
.site-shell { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 48px; }
.site-header { display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: 22px 28px; border: 1px solid var(--border); border-radius: 24px; background: var(--surface); backdrop-filter: blur(12px); box-shadow: var(--shadow); }
.site-header h1 { margin: 0; font-size: clamp(2rem, 2.5vw, 3rem); letter-spacing: -0.02em; color: var(--text); }
.site-header p { margin: 0.35rem 0 0; color: var(--muted); }
.brand { font-size: 1.1rem; color: var(--text); text-decoration: none; font-weight: 700; letter-spacing: -0.02em; }
.theme-toggle { border: 1px solid rgba(129, 111, 87, 0.2); background: rgba(210, 180, 140, 0.12); color: var(--text); padding: 0.85rem 1rem; border-radius: 999px; cursor: pointer; }
.hero { margin: 36px 0; padding: 32px; border-radius: 32px; background: var(--surface); border: 1px solid var(--border); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.06); }
.hero p { margin: 0; font-size: 1.05rem; color: var(--muted); }
.filter-panel { display: grid; gap: 0.75rem; margin-bottom: 24px; }
.filter-label { font-size: 0.95rem; font-weight: 700; color: var(--muted); }
.filter-buttons { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.filter-button { border: 1px solid var(--border); background: var(--surface); color: var(--text); padding: 0.8rem 1rem; border-radius: 999px; cursor: pointer; transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease; }
.filter-button:hover { transform: translateY(-1px); }
.filter-button.is-active { border-color: var(--accent-strong); background: var(--accent-soft); color: var(--text); }
.page-list { margin-top: 0; }
.page-list h2 { margin-bottom: 18px; font-size: 1.75rem; color: var(--text); }
.page-list ul { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
.post-card { display: block; background: var(--card-bg); border-radius: 28px; border: 1px solid var(--border); box-shadow: 0 18px 40px rgba(0, 0, 0, 0.06); transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease; }
.post-card:hover { transform: translateY(-3px); border-color: rgba(129, 111, 87, 0.22); }
.card-link { display: grid; gap: 16px; padding: 24px; color: inherit; text-decoration: none; }
.card-meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; align-items: center; font-size: 0.95rem; color: var(--muted); }
.card-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.tag-pill { display: inline-flex; align-items: center; padding: 0.35rem 0.75rem; border-radius: 999px; background: rgba(210, 180, 140, 0.18); color: var(--text); font-size: 0.85rem; }
.post-card h3 { margin: 0; font-size: 1.4rem; color: var(--text); }
.excerpt { margin: 0.75rem 0 0; color: var(--muted); line-height: 1.75; }
.page-content { display: grid; gap: 24px; }
.markdown-body { padding: 32px; border-radius: 32px; background: var(--surface); border: 1px solid var(--border); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06); }
.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 { color: var(--text); margin-top: 1.75rem; }
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
.is-hidden { display: none !important; }
.pf-shell { background: var(--surface) !important; }
.pf-search-input, .pf-result, .pf-side-panel { color: var(--pagefind-text) !important; background: var(--pagefind-surface) !important; border-color: var(--border) !important; }
.pf-action-button, .pf-search-input { background: var(--accent-soft) !important; color: var(--text) !important; }
.pf-result-title a { color: var(--accent-strong) !important; }

@media (max-width: 960px) {
  .site-shell { width: min(100%, calc(100% - 24px)); padding: 20px 0 36px; }
  .site-header { flex-direction: column; align-items: stretch; gap: 16px; }
  .page-list ul { grid-template-columns: 1fr; }
}
`;
}

function renderScript() {
  return `const root = document.documentElement;
const themeButton = document.querySelector('[data-action="toggle-theme"]');
const filterButtons = Array.from(document.querySelectorAll('.filter-button'));
const postCards = Array.from(document.querySelectorAll('.post-card'));
const themeMap = { light: 'dark', dark: 'light' };

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem('site-theme', theme);
}

const storedTheme = localStorage.getItem('site-theme');
applyTheme(storedTheme || 'light');

if (themeButton) {
  themeButton.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') || 'light';
    applyTheme(themeMap[current] || 'light');
  });
}

function updateActiveButton(activeButton) {
  filterButtons.forEach((button) => button.classList.toggle('is-active', button === activeButton));
}

function filterPosts(tag) {
  postCards.forEach((card) => {
    const tags = card.dataset.tags ? card.dataset.tags.split(' ') : [];
    const hidden = tag !== '全部' && !tags.includes(tag);
    card.classList.toggle('is-hidden', hidden);
  });
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    updateActiveButton(button);
    filterPosts(button.dataset.tag);
  });
});
`;
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
    const relativePath = path.relative(ROOT, fullPath);
    const outputName = relativePath === 'README.md' ? 'index.html' : relativePath.replace(/\.md$/, '.html');
    const outputFile = path.join(OUT_DIR, outputName);
    // Create output directory if needed
    const { title, excerpt, date, tags, content } = normalizePageMetadata(fileContent, fullPath);
    const html = md.render(content);

    ensureDirectory(path.dirname(outputFile));
    // Render full HTML page with layout template and write to disk
    fs.writeFileSync(outputFile, renderPage({ title, html, description: excerpt, pagePath: relativePath, outputFile }));
    // Track page metadata for index generation
    pages.push({ title, url: `./${outputName}`, excerpt, date, tags });
  }

  // Step 4: Generate index (landing) page listing only blog posts
  const blogPages = pages.filter((page) => page.url.startsWith('./blog/'));
  const indexFile = path.join(OUT_DIR, 'index.html');
  fs.writeFileSync(indexFile, renderIndex(blogPages));
  
  // Step 5: Generate static assets
  // CSS: Global stylesheet with dark theme and typography
  fs.writeFileSync(path.join(OUT_DIR, 'assets', 'style.css'), renderStyleSheet());
  // JS: Client-side theme toggler script
  fs.writeFileSync(path.join(OUT_DIR, 'assets', 'site.js'), renderScript());
  
  // Step 6: Generate 404.html fallback (shows blog post list on 404 errors)
  fs.writeFileSync(path.join(OUT_DIR, '404.html'), renderIndex(blogPages));

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
