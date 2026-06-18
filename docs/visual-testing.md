# Visual Testing (視覺測試) 管理說明

此文件說明如何在本專案使用 GitHub Actions + Playwright + pixelmatch 執行視覺回歸測試。

## 概要

流程：
- Build 靜態站 (`npm run build`)。
- 使用 Headless browser（Playwright）對目標頁面做截圖（`npm run screenshot`）。
- 使用 `pixelmatch` 比對 `tests/baseline/*.png` 與剛產生的截圖，輸出 diff（`npm run visual-test`）。
- 若差異超過閾值，CI job 失敗並上傳 `diff.png`/`current.png` 作為 artifact，供 reviewer 檢視。

## 檔案與位置（專案內）

- 截圖腳本： `scripts/screenshot.js`
- 視覺比對腳本： `scripts/visual-test.js`
- baseline（請將可信任的參考截圖存放）： `tests/baseline/`（例如 `tests/baseline/sample-post.png`）
- 產出截圖： `out/blog/sample-post.png`
- CI workflow： `.github/workflows/visual-tests.yml`

## 本地執行（快速驗證）

1. 安裝依賴（含 Playwright）：

```bash
npm install
npx playwright install
```

2. 生成網站並截圖：

```bash
npm run build
npm run screenshot
```

3. 執行視覺比對：

```bash
npm run visual-test
```

- 若通過，會印出 `Visual test passed`。
- 若失敗，會在 `out/blog/` 看到 `sample-post-diff.png`，並以非零 exit code 結束。

## GitHub Actions 流程要點

- Workflow 會執行：checkout → install (npm ci) → `npx playwright install --with-deps` → `npm run build` → `npm run screenshot` → `npm run visual-test`。
- 若比對失敗，請透過 artifact 檢視 `current.png` 與 `diff.png` 判斷是否接受變更。
- 建議在 workflow 中使用 `actions/upload-artifact` 上傳 `out/**` 供審查。

## Baseline 管理

- 建立 baseline：在本地執行 `npm run screenshot`，確認輸出正常，將 `out/blog/sample-post.png` 複製到 `tests/baseline/sample-post.png` 並 commit。

```bash
mkdir -p tests/baseline
cp out/blog/sample-post.png tests/baseline/sample-post.png
git add tests/baseline/sample-post.png
git commit -m "chore: add baseline screenshot for visual tests"
```

- 更新 baseline：當樣式改動為預期時，先在本地執行截圖並比較 diff，確認後覆蓋 `tests/baseline/*.png` 並 commit。

- PR 流程建議：CI 若失敗， reviewer 可檢視 artifacts（`current.png` / `diff.png`）並要求作者更新 baseline 或修正樣式。

## 失敗原因與排查建議

1. 字體差異：確保使用相同的 Web 字體或將字體檔一併提交，避免系統字體造成的文字渲染差異。
2. 不同瀏覽器版本：CI 與本機必須使用相同 Playwright 瀏覽器版本（在 workflow 中執行 `npx playwright install`）。
3. 時序問題：截圖前加 `page.waitForTimeout(300)` 或等待特定 selector 出現，確保動態內容穩定。
4. 分辨率不同：確保 baseline 與 current 的截圖使用相同 viewport（`scripts/screenshot.js` 內設定）
5. 動態內容（時間戳、廣告、動畫）：在生成頁面時盡量移除或隱藏動態內容（例如在測試環境以 query string 指定 `?test=1` 並載入無動畫樣式）。

## 閾值與策略

- 範例腳本使用 `failThreshold = 0.002`（0.2% 像素差）作為預設。可依照專案容忍度調整。
- 若某些區域容易變動，可在比對前 crop 出需要的穩定區塊（或在 `visual-test.js` 中增加排除區域）。

## CI 自動化建議（進階）

- 自動在 PR 中貼上 diff 圖：在 workflow 中使用 `actions/upload-artifact` 並搭配 `actions/github-script` 或專用 action，將 artifact 轉為公開 URL 或直接上傳至 PR comment。若需要，我可以幫你把這部分也寫入 workflow。
- 長期紀錄：將每次 run 的 screenshot 作為 artifact 保存到外部儲存（例如 S3）以便追蹤視覺回歸歷史。

## 常用命令摘要

```bash
npm install
npx playwright install
npm run build
npm run screenshot
npm run visual-test
```

---

若你同意，我可以：
- 幫你把當前 `out/blog/sample-post.png` 複製為 `tests/baseline/sample-post.png` 並 commit。
- 或將 workflow 擴充為在 PR 中直接貼上 diff 圖。請告訴我你要哪一個動作。