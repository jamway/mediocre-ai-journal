---
name: frontend-slides
summary: Generate a self-contained HTML presentation from Markdown content with animation-rich slides and fixed 16:9 stage scaling.
---

# Frontend Slides Skill

This skill creates polished HTML slide decks from Markdown content and deploys them as a GitHub Pages site. It includes:

- A GitHub Pages build pipeline that compiles Markdown to static HTML.
- A test step that verifies generated output before publishing.
- A self-contained HTML slide template using the `frontend-slides` fixed 16:9 stage model.
- HTML + JavaScript outputs that run in the browser without external build tools.

## Usage

Place Markdown files in the repository root and push changes to `main`.
The GitHub Action will:

1. Install dependencies.
2. Run `npm test` to verify the build.
3. Run `npm run build` to generate HTML into `out/`.
4. Publish `out/` to the `gh-pages` branch.

## Notes

- The skill stores build assets in `out/assets`.
- The site uses `highlight.js` for code blocks and `markdown-it` for Markdown rendering.
- The deploy workflow is configured in `.github/workflows/pages.yml`.
