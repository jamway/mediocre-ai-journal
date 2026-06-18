# 還不完全的AI筆記

2026的某天，我父親在Line上問了我對AI的發展或將來對人類的影響有什麼看法，我花了點時間回答這個問題-但最後我對於自己的答案不甚滿意。回想過去幾年的經驗，有很多該組織起來的想法因為不斷湧入的新資訊而沒有成形，暫且在這裡記下。
這個代碼庫會以Markdown為主，更新時間未定。

## 提問及質疑

對於記述內容的質疑與問題請提出 Issue。

## GitHub Pages 使用說明

1. 將 repo 推送到 `main`。
2. GitHub Actions 會在 `main` 分支的推送時觸發：
   - 安裝 Node.js 依賴
   - 執行 `npm test` 確認 build 正常
   - 執行 `npm run build` 生成靜態網站到 `out/`
   - 發佈 `out/` 到 `gh-pages` 分支
3. 前往 GitHub 倉庫的 `Settings` → `Pages`，確認 Pages 來源已設定為 `gh-pages` 分支。
4. 修改 Markdown 後再次 push，Actions 會自動重新編譯並發布。

## 本地預覽與調整版面

- 先安裝依賴：
  ```bash
  npm install
  ```
- 生成網站：
  ```bash
  npm run build
  ```
- 在瀏覽器中開啟 `out/index.html`，或從 `out/` 啟動本地伺服器：
  ```bash
  cd out
  python3 -m http.server 8000
  ```
  然後瀏覽 `http://localhost:8000`。
- 若要微調版面，請修改 `scripts/build.js` 中 `renderStyleSheet()` 的 CSS 內容，或直接編輯 `blog/sample-post.md` 作為範例文章。
- `out/assets/style.css` 是生成的網站樣式檔案；每次修改後需重新執行 `npm run build`。

## Blog 範例

新增了一個 `blog/` 資料夾，用於整理文章。示範檔案：

- `blog/sample-post.md`：範例 Markdown，包含 GitHub Pages 支援的內嵌 JavaScript。
- `blog/sample-post.html`：實際範例 HTML 範本，可直接在瀏覽器中查看動態效果。

## Pre-Commit Hooks（開發工作流程）

本專案已設定使用 **Husky** 進行 pre-commit 驗證：

- 每次 commit 前會自動執行 `npm test && npm run build`。
- 若驗證失敗（例如構建錯誤），commit 會被阻止。
- 修正錯誤後重新 commit。

首次開發需執行初始化：
```bash
npm install
npx husky install
```

若要手動執行驗證（而非等待 commit）：
```bash
npm test
npm run build
```

更多詳情請見 [docs/pre-commit-hooks.md](docs/pre-commit-hooks.md)。

## 視覺測試（回歸測試）

專案使用 Playwright 與 pixelmatch 進行視覺回歸測試：

- 本地執行：`npm run screenshot && npm run visual-test`
- GitHub Actions 會自動執行視覺測試並與 baseline 比對。
- 若發現無預期的樣式變動，可在 artifact 中查看 diff 圖。

更多詳情請見 [docs/visual-testing.md](docs/visual-testing.md)。

## 作者貢獻流程

1. 編輯 `blog/` 下的 Markdown 檔案。
2. 本地驗證（pre-commit hook 會自動執行，或手動執行 `npm test && npm run build`）。
3. 提交並推送到 `main`。
4. GitHub Actions 會自動編譯並發佈到 GitHub Pages。

若使用協作流程（PR），reviewer 可檢視視覺測試的 artifacts 決定是否接受修改。

