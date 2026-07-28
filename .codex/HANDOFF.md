# 碩業工作平台交接

更新日期：2026-07-28
基準分支：`main`
基準提交：`7e5a090 Link Shuoye cash imports to client advances`

## 目前狀態

- 專案為 React、Vite、Firebase 的網頁版工作平台，正式網址為 `https://aristo-cpa-work-platform.vercel.app/`。
- GitHub `main` 已包含 Google 帳號登入、既有人員綁定、主管審核與 Google 日曆單向同步。
- PIN 登入與修改 PIN 仍作為過渡期備援，尚未移除。
- Firebase Functions 位於 `functions/src/index.ts`，區域為 `asia-east1`。
- 原有 Firestore 寄信 Extension 必須保留，不可視為本專案自建 Function 刪除。

## 最近完成事項

### Codex 跨電腦交接

- 已移除只供 Claude Code 使用的 `.claude/settings.local.json`，並將 `.claude/` 加入 `.gitignore`。
- 已新增根目錄 `AGENTS.md`，要求每台 Codex 開始工作前讀取本文件，工作結束後覆寫最新交接狀態。
- 本文件只保存最新狀態，不累積逐日紀錄。
- 根目錄 `package-lock.json` 已確認不含使用者個資、事務所資料或系統憑證，並納入 Git 以固定前端套件版本。
- 上述變更已建立本機提交；要讓另一台電腦取得，仍需推送到 GitHub `main`。

### Google 登入與日曆

- `6b033ad` 改善登入持續狀態：瀏覽器已有 Firebase Auth 使用者時，不再重複開啟 Google 帳號選擇視窗。
- 排班事件標題改為「人員姓名 - 班別」。
- 排班除了同步給排班本人，也同步到所有已連接 Google 日曆的在職主管與老闆。
- 使用 `googleSyncTargets` 分別保存每個 Google 帳號的日曆事件 ID，支援同一排班同步到多人日曆。
- Google 日曆仍是單向同步；Google 端修改不會回寫平台。

### 零用金匯入

- `b3d93fc`：事務所零用金匯入改以金額正負判斷收入與支出，寫入時保存絕對值。
- `e31569e`：匯入日期支援 Excel 日期值及民國／西元年月日格式，並略過空白列及可辨識的標題列。
- `7e5a090`：碩業零用金的支出若客戶名稱能對應既有客戶，會帶入 `clientId`，使該筆資料能連結至客戶代墊款。

## 已確認決策

- 目前只維護網頁版，不恢復獨立手機版。
- Google 登入沿用既有人員頭像及資料，不建立第二套平台使用者。
- 每個人使用自己的 Gmail；首次綁定由主管核准。
- Google 日曆採平台到 Google 的單向同步。
- 交接文件只保存最新狀態，每次工作結束直接覆寫，不保留每日紀錄。
- 修改必須聚焦相關模組，不可順手重構薪資、工時、零用金或其他業務邏輯。

## 待辦與待確認

- 以實際主管及員工帳號再次確認 Google 登入持續狀態、主管審核與共用電腦登出流程。
- 確認 `6b033ad` 的 Functions 版本是否已部署到 Firebase；GitHub 有程式碼不代表後端一定已部署。
- 用實際零用金 Excel 檔驗證三項匯入調整：金額正負、日期正規化、客戶代墊款連結。
- 所有人完成 Google 綁定並穩定使用後，再討論移除 PIN 與全面收緊 Firestore Auth 規則。

## 驗證與部署

- 前端驗證：在專案根目錄執行 `npm.cmd run build`。
- Functions 驗證：在 `functions` 目錄執行 `npm.cmd run build`。
- 程式修改後執行 `git diff --check`。
- 2026-07-28 已確認前端與 Functions 建置成功，`git diff --check` 通過。
- Functions 部署前確認 `functions/.env` 的公開 App URL，Secret Manager 的值不可寫入 Git。
- 推送前只加入本次相關檔案與本交接文件。

## 相關檔案

- Google 整合：`LoginScreen.tsx`、`App.tsx`、`Dashboard.tsx`、`googleIntegrationService.ts`
- Calendar 後端：`functions/src/index.ts`
- Firebase：`firebase.ts`、`firebase.json`、`firestore.rules`
- 零用金匯入：`CashLogView.tsx`
- 共用資料型別：`types.ts`
