# TripJournal 项目说明

- 不重新初始化项目。
- 当前代码是最高事实来源。
- 不无故重构已工作的架构。
- 不提交真实 API Key。
- `.env` 不进入 Git。
- 重要架构变化才更新 README。

## Fast Iteration Rules

This project is already a working MVP. Default to fast, targeted edits.

- Do not scan the entire repository unless necessary.
- Read only files directly relevant to the requested change.
- Do not perform visual/browser QA unless explicitly requested.
- The user performs visual QA manually.
- Do not run npm install unless dependencies changed.
- Do not start a persistent dev server unless explicitly requested.
- Do not run repeated builds after every intermediate edit.
- For normal UI/code changes, make all requested edits first, then run npm run build once.
- Do not modify unrelated files or refactor working architecture.
- Do not create extensive plans before small scoped changes.
- Prefer the smallest correct patch.
- If the task is CSS/layout-only, do not inspect unrelated AI, EXIF, upload, clustering, backend, template-generation or deployment code unless directly required.
- Do not automatically open browsers, take screenshots or perform visual comparison.
- Do not re-read the whole repository after each edit.
- Reuse existing components/services/styles instead of creating parallel implementations.
- After completion, report only changed files, key changes, and build result.
- If npm run build passes, stop unless the user explicitly requests further QA.
