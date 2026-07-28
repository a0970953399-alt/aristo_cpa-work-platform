# Codex 專案協作規則

## 交接流程

- 每次開始處理本專案前，先閱讀 `.codex/HANDOFF.md`，再檢查 `git status` 與最新提交。
- 每次完成一段 vibe coding 工作後，更新 `.codex/HANDOFF.md`，讓另一台電腦的 Codex 能直接接手。
- `HANDOFF.md` 只保留當下最新狀態，不要累積逐日流水帳；過往內容由 Git 歷史保存。
- 交接內容應包含：目前基準版本、本次完成事項、已確認決策、待辦事項、驗證結果、部署狀態、風險與相關檔案。
- 不要在交接文件寫入 Gmail、OAuth Client secret、Firebase secret、refresh token、PIN 或其他敏感資料。
- 若使用者要求推送 GitHub，將本次相關程式碼與最新交接文件一起提交到 `main`；不要夾帶無關檔案。

## 專案原則

- 保留既有 Firebase 資料與薪資、零用金、工時、工作矩陣等業務邏輯，除非任務明確要求修改。
- 修改前先理解既有資料格式與模組邊界，避免建立重複的人員、事件或業務資料。
- 根目錄正式驗證使用 `npm.cmd run build`；Functions 修改另在 `functions` 目錄執行 `npm.cmd run build`。
- Google 日曆目前是平台單向同步到 Google，不要自行改成雙向同步。
- 原有 `firebase/firestore-send-email` Extension 不屬於自建 Functions，部署時不得刪除或取代。
