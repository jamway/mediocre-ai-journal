# Architecture & Workflow

本文件說明 mediocre-ai-journal 的整體架構、工作流程與代碼組織。

## 高層次流程圖

```
┌─────────────────────────────────────────────────────────────┐
│                     開發者工作流程                           │
└─────────────────────────────────────────────────────────────┘

1. 編輯 Markdown
   ├─ blog/*.md (Markdown 文章)
   ├─ README.md (首頁內容)
   └─ docs/*.md (文檔)

2. 本地驗證 (Pre-Commit Hook via Husky)
   ├─ npm test → 檢查構建
   └─ npm run build → 產生 HTML

3. 提交到 Git
   └─ git commit/push → 觸發 GitHub Actions

4. CI/CD Pipeline (GitHub Actions)
   ├─ .github/workflows/pages.yml (Pages 發佈)
   │  ├─ npm ci (安裝依賴)
   │  ├─ npm test (驗證構建)
   │  ├─ npm run build (產生靜態網站)
   │  └─ 發佈 out/ → gh-pages 分支
   │
   └─ .github/workflows/visual-tests.yml (視覺測試)
      ├─ npm ci (安裝依賴)
      ├─ npx playwright install (下載瀏覽器)
      ├─ npm run build (產生網站)
      ├─ npm run screenshot (截圖)
      └─ npm run visual-test (比對 baseline)

5. GitHub Pages 發佈
   └─ https://<user>.github.io/mediocre-ai-journal/ 自動上線
```

## 代碼結構與組件說明

### 目錄樹狀圖

```
mediocre-ai-journal/
├── README.md                    # 專案說明與使用指南
├── blog/                        # Blog 文章目錄
│   ├── sample-post.md           # 範例 Markdown 文章
│   └── sample-post.html         # 手寫範例 HTML（展示輸出樣式）
├── docs/                        # 項目文檔
│   ├── visual-testing.md        # 視覺測試說明
│   └── pre-commit-hooks.md      # Pre-commit Hook 說明
├── scripts/                     # 構建與測試腳本
│   ├── build.js                 # [核心] Markdown → HTML 轉換器
│   ├── test-build.js            # 構建驗證腳本
│   ├── screenshot.js            # Playwright 截圖工具
│   └── visual-test.js           # 像素比對視覺測試
├── tests/                       # 測試相關
│   └── baseline/                # 視覺測試 baseline 截圖
│       └── sample-post.png      # 參考截圖
├── out/                         # 生成的靜態網站（發佈到 gh-pages）
│   ├── index.html               # 首頁
│   ├── blog/sample-post.html    # 文章頁面
│   ├── assets/                  # 靜態資源
│   │   ├── style.css            # 生成的全站樣式
│   │   └── site.js              # 生成的全站 JavaScript
│   └── 404.html                 # 404 頁面
├── .github/
│   └── workflows/               # GitHub Actions 工作流程
│       ├── pages.yml            # Pages 自動發佈工作流程
│       └── visual-tests.yml     # 視覺測試工作流程
├── .husky/                      # Pre-commit hooks 配置
│   └── pre-commit               # Pre-commit 驗證腳本
├── skills/                      # Agent skill 文檔
│   └── frontend-slides.skill.md # 前端幻燈片 skill 說明
├── package.json                 # Node.js 依賴與腳本定義
└── .gitignore                   # Git 忽略清單
```

### 關鍵組件說明

#### 1. Build Pipeline (`scripts/build.js`)
- **輸入**：repo 根目錄與 `blog/` 下的所有 `.md` 檔案
- **處理**：
  - 使用 `markdown-it` + `markdown-it-anchor` 將 Markdown 轉為 HTML
  - 使用 `highlight.js` 進行代碼高亮
  - 為每頁生成一致的 HTML 樣版（header、footer、navigation）
  - 輸出 `out/assets/style.css` 與 `out/assets/site.js`
- **輸出**：`out/` 目錄中的靜態 HTML 網站

#### 2. 測試驗證 (`scripts/test-build.js`)
- **目的**：確保每個 Markdown 檔案都正確轉換成 HTML
- **流程**：掃描 repo 中的 `.md`、逐一檢查 `out/` 中的對應 `.html`
- **失敗時**：回傳非零 exit code，阻止 CI 繼續

#### 3. 視覺截圖 (`scripts/screenshot.js`)
- **目的**：用 Headless browser 對頁面進行視口截圖
- **流程**：使用 Playwright 打開本地 HTML、等待內容載入、拍照
- **輸出**：`out/blog/sample-post.png`（或指定的任意頁面）
- **用途**：為視覺回歸測試建立參考截圖

#### 4. 視覺比對 (`scripts/visual-test.js`)
- **目的**：比對當前截圖與 baseline，檢測視覺回歸
- **流程**：
  - 讀取 `tests/baseline/sample-post.png` 與 `out/blog/sample-post.png`
  - 使用 `pixelmatch` 逐像素比對
  - 輸出 diff 圖到 `out/blog/sample-post-diff.png`
  - 若差異超過閾值（預設 0.2%），回傳非零 exit code
- **用途**：在 CI 中自動檢測樣式變動

#### 5. Pre-Commit Hook (`.husky/pre-commit`)
- **觸發時機**：開發者執行 `git commit` 時
- **動作**：執行 `npm test && npm run build`
- **失敗行為**：若驗證失敗，commit 被阻止（開發者需修正後重試）

#### 6. GitHub Actions Workflows

##### `pages.yml` (Pages 發佈流程)
- **觸發**：Push 到 `main` 分支或 PR
- **步驟**：
  1. 檢出代碼
  2. 安裝 Node.js 與依賴
  3. 執行 `npm test`（驗證）
  4. 執行 `npm run build`（產生網站）
  5. 使用 `peaceiris/actions-gh-pages` 自動發佈 `out/` 到 `gh-pages` 分支
- **結果**：網站自動上線到 GitHub Pages

##### `visual-tests.yml` (視覺測試流程)
- **觸發**：PR 與 Push
- **步驟**：
  1. 檢出代碼
  2. 安裝 Node.js、依賴、Playwright 瀏覽器
  3. 執行 `npm run build`
  4. 執行 `npm run screenshot`
  5. 執行 `npm run visual-test`
  6. 上傳 artifact（diff 與 current 截圖）
- **失敗時**：Job 失敗，reviewer 可檢視 artifacts 判斷是否接受修改

## 數據流向圖

```
Markdown Files
(blog/*.md, README.md)
        ↓
    [build.js]
    ├─ markdown-it 解析
    ├─ highlight.js 高亮代碼
    ├─ markdown-it-anchor 生成錨點
    └─ 使用樣版生成 HTML
        ↓
    Static HTML Website
    (out/index.html, out/blog/*.html)
        ↓
    ├─ [Local Preview] (瀏覽器打開或本地伺服器)
    │   └─ 開發者手動檢驗
    │
    ├─ [GitHub Pages] (CI 自動發佈)
    │   └─ https://user.github.io/repo/
    │
    └─ [Visual Tests] (CI 自動測試)
        ├─ [screenshot.js] → out/blog/sample-post.png
        ├─ [visual-test.js] → 與 tests/baseline/sample-post.png 比對
        └─ [Artifact Upload] → 用於 PR review
```

## 開發循環

```
1. 編輯 Markdown
   ↓
2. Pre-commit Hook 自動驗證
   ├─ npm test ✓
   └─ npm run build ✓
   ↓
3. git commit 成功
   ↓
4. git push origin main
   ↓
5. GitHub Actions 觸發
   ├─ Pages Workflow (build + publish)
   ├─ Visual Tests Workflow (screenshot + pixelmatch)
   └─ 失敗時 reviewer 檢視 artifacts
   ↓
6. GitHub Pages 自動更新
   ↓
7. 用戶訪問網站 → 看到最新內容
```

## 技術棧

| 層級 | 工具/框架 | 用途 |
|------|---------|------|
| **Markdown Processing** | `markdown-it` | Markdown → HTML 解析 |
| | `markdown-it-anchor` | 生成目錄錨點 |
| | `highlight.js` | 代碼塊高亮 |
| **Templating** | Vanilla JavaScript | HTML 樣版生成 |
| **Styling** | Vanilla CSS | 網站樣式（生成於 `renderStyleSheet()`） |
| **Browser Automation** | `playwright` | Headless 截圖 |
| **Visual Testing** | `pixelmatch`, `pngjs` | 像素比對與 PNG 處理 |
| **Git Hooks** | `husky` | Pre-commit 驗證自動化 |
| **CI/CD** | GitHub Actions | 自動化 build、test、deploy |
| **Hosting** | GitHub Pages | 靜態網站發佈 |

## 擴展點

若要進一步改進：

1. **搜尋功能**：在 build.js 中生成索引 JSON，前端使用 Lunr.js
2. **RSS 訂閱**：build.js 產生 `feed.xml`
3. **評論系統**：集成 Utterances / Disqus
4. **SEO 優化**：在 HTML header 加入 meta tags、og tags
5. **圖片優化**：自動壓縮與產生 WebP 格式
6. **Sitemap**：build.js 產生 `sitemap.xml`
7. **分析**：加入 Google Analytics 或自託管分析

