# Pre-Commit Hooks 設定

此文件說明如何使用 pre-commit hooks 在推送前驗證程式碼品質與構建完整性。

## 適合在 Pre-Commit 執行的步驟

| 步驟 | 耗時 | 建議 | 說明 |
|------|------|------|------|
| Markdown lint | 快 | ✅ 必做 | 檢查 `.md` 檔案語法、連結完整性 |
| `npm test` | 快 | ✅ 必做 | 驗證構建與內容編譯無誤 |
| `npm run build` | 中 | ⚠️ 可選 | 檢查生成的 HTML，保障產出正確 |
| `npm run screenshot` | 慢（需 Playwright） | ❌ 不建議 | 應留給 CI（但可在本地開發時手動執行） |
| `npm run visual-test` | 中 | ❌ 不建議 | 初次下載瀏覽器非常耗時，CI 更適合 |

推薦組合：
- **輕量版**：Markdown lint + `npm test`（<10s）
- **完整版**：Markdown lint + `npm test` + `npm run build`（<30s）
- **視覺驗證**：作者在本地手動執行 `npm run screenshot` 與 `npm run visual-test`（非自動化）

## 使用 Husky 設定 Pre-Commit Hook（推薦）

Husky 是簡單好用的 Git hooks 管理工具。

### 1. 安裝 Husky

```bash
npm install -D husky
npx husky install
```

### 2. 新增 Pre-Commit Hook

```bash
npx husky add .husky/pre-commit "npm run lint && npm test && npm run build"
```

這會建立 `.husky/pre-commit` 檔案。若你還沒有 `lint` 指令，先跳過 `lint` 部分：

```bash
npx husky add .husky/pre-commit "npm test && npm run build"
```

### 3. 驗證 Hook 運作

嘗試修改一個檔案並 commit：

```bash
# 故意破壞 Markdown
echo "# Bad markdown" > blog/test.md
git add blog/test.md
git commit -m "test commit"
# 預期：hook 執行 npm test & npm run build，若失敗則阻止 commit
```

## 直接使用 Git Hooks（無外部工具）

若不想使用 Husky，可直接建立 Git hook：

```bash
mkdir -p .git/hooks
cat > .git/hooks/pre-commit <<'HOOK'
#!/bin/bash
set -e

echo "Running pre-commit checks..."
npm test
npm run build
echo "Pre-commit checks passed!"
HOOK

chmod +x .git/hooks/pre-commit
```

## 快速 Markdown Lint 設定（可選）

若要檢查 Markdown 語法，可加入 `markdownlint`：

```bash
npm install -D markdownlint-cli
```

在 `package.json` 新增指令：

```json
"scripts": {
  "lint": "markdownlint '**/*.md' --ignore node_modules --ignore out"
}
```

然後在 pre-commit hook 中加入：

```bash
npx husky add .husky/pre-commit "npm run lint && npm test && npm run build"
```

## 作者工作流程（使用 Pre-Commit Hook）

1. 編輯文章或樣式（`blog/*.md`、`scripts/build.js` 等）。
2. 執行 commit：
   ```bash
   git add .
   git commit -m "feat(blog): add new post"
   ```
3. Hook 自動執行：
   - 若 `npm test` 或 `npm run build` 失敗，commit 被阻止。
   - 作者修正後重新 commit。
4. Commit 成功後 push 到遠端，CI 再做一次完整驗證（包括視覺測試）。

## 何時手動執行視覺測試（在提交前）

若想在本地先檢查視覺變動：

```bash
npm run screenshot
npm run visual-test
# 若超過閾值，會報失敗；檢視 out/blog/sample-post-diff.png
# 確認沒問題後再 commit
```

## 避免常見問題

1. **Hook 太慢**：若 pre-commit 超過 1 分鐘，開發體驗會變差。建議只做快速檢查（lint + test），視覺測試留給 CI。
2. **忽略 Hook**：若開發者使用 `git commit --no-verify` 繞過 hook，可能會推送未驗證的程式碼。建議在 CI 中再做一次驗證（已設定）。
3. **環境差異**：確保所有開發者執行 `npx husky install`，以同步 hook。

## 推薦的完整流程（本地 + CI）

本地 pre-commit：
```
npm run lint (可選)
npm test
npm run build
```

GitHub Actions (CI)：
```
npm ci
npm test
npm run build
npm run screenshot
npm run visual-test
發佈 out/ 到 gh-pages
```

---

**需要我幫你裝 Husky 並設定 pre-commit hook 嗎？**

