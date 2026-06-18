---
title: GitHub Pages JavaScript 範例文章
---

# GitHub Pages Blog 範例

這是一篇 blog 範例文章，展示如何在 Markdown 中嵌入 GitHub Pages 支援的 JavaScript。

## 特性

- 文章標題與段落
- 支援行內 HTML
- 可在生成後的 HTML 頁面中執行 JavaScript

<div id="interactive-widget" class="widget-card">
  <p>下面的按鈕由 JavaScript 啟動：</p>
  <button id="widget-action">點我</button>
  <span id="widget-count">0</span> 次
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('widget-action');
  const counter = document.getElementById('widget-count');
  let count = 0;
  if (!button || !counter) return;

  button.addEventListener('click', () => {
    count += 1;
    counter.textContent = String(count);
    button.textContent = count === 1 ? '再次點我' : '再點一次';
  });
});
</script>
