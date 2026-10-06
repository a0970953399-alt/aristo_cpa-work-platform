# 碩業工作平台交接

更新日期：2026-10-06
基準分支：`main`
功能提交：`8259888`（人員權限精確更新與 Google 身分權限同步修正）

## 本次完成

- 修正主管勾選權限後，前端主檔與 Google 身分權限可能不一致的流程。前端使用 `updateUserPermission`，只寫指定使用者的指定權限欄位。
- 頭像、啟用狀態也使用各自的單欄更新。人員名單讀取不再回寫整份資料；排班顏色維護只更新角色／顏色欄位。舊名單保存入口只建立缺少的人員，不覆寫既有設定或 Google 綁定。
- 權限操作加入送出中狀態、防重複點擊、離線提示及失敗提示；使用既有即時監聽更新畫面。
- Google 身分同步使用交易讀取最新 `users`，明確保存所有已知權限的 true／false，整份替換 permissions map，防止撤權後殘留 true。延遲事件不再直接使用舊事件內容重建授權。
- 綁定變更／停用／刪除的清理只刪除仍屬於該人員的身分資料，避免舊事件刪除別人的對應。
- 已依使用者授權修正指定工讀生的薪資權限：只更新主檔 `permissions.payroll`，其他主檔欄位經讀回比對未變；後端已自動同步，所有有效權限一致。修改前資料備份僅保留本機，不放 GitHub。
- 保留「我的進度／全所進度」切換設計；有薪資權限的工讀生需進入全所進度查看薪資頁籤。

## 驗證與發布

- 前端 `npm.cmd run build`、Functions `npm.cmd run build`、`git diff --check` 通過。
- `node --test tests/permission-regression.test.cjs tests/attendance-handlers.test.cjs`：22 項通過。
- `node tests/run-permission-rules.cjs`：13 項通過。
- `node tests/run-attendance-rules.cjs`：16 項通過。
- 測試涵蓋授權與撤權、各角色存取、自己的頭像、禁止自行提升權限、舊名單寫入保護、排班顏色同步、延遲事件、停用／刪除／重新綁定、儲存失敗／重試與既有打卡。所有 Rules 文件均為模擬，未建立正式測試紀錄。
- 使用者已明確同意推送 main 與更新正式網站。功能提交已推送；Vercel 對該提交回報 success，正式網址下載的入口與 Dashboard 也確認含有新精確更新方法、儲存中與失敗提示。雲端與本機建置資源檔名不同，未宣稱逐位元相同。
- 已成功部署四個 Functions：`syncGoogleUserProfileOnUserWrite`、`requestAccountBinding`、`reviewAccountBinding`、`rebuildGoogleUserProfiles`。其他 Functions、寄信 Extension 未部署或刪除；Firestore Rules 本次未修改、未部署。
- 首次部署遇到 Functions 探索預設 10 秒逾時；本次命令設定 `FUNCTIONS_DISCOVERY_TIMEOUT=120` 後成功。未升級依賴或變更永久環境設定。
- 尚未以指定工讀生真實登入操作驗證；主管與工讀生需重新整理載入新版，再確認全所進度中的薪資頁籤與實際讀取。不能把管理身分讀回或模擬測試當作本人操作完成。

## 已確認決策與下一步

- 薪資復職功能仍暫停，僅完成討論與正式資料唯讀診斷；本次未改客戶員工、薪資紀錄、薪資公式、報表或寄送資料。診斷及個資不放入程式儲存庫。
- 既有客戶薪資資料含同月重複紀錄、失去員工關聯、任職日期矛盾等待核對事項；不要因本次人員權限修正而自動清理或轉換。
- 原本打卡修正基準為 `247d365`，正式 Rules 的歷史修正已部署，本次再次通過 16 項模擬規則回歸。仍不得宣稱所有員工均已實際操作驗證。
- 保留原有 Google 登入／首次綁定審核及平台到 Google 日曆單向同步；不改成雙向同步。寄信 Extension 必須保留。
- 工讀生基礎權限為客戶事務矩陣及本人工時唯讀；實習生沒有預設矩陣權限；額外模組依授權。主管／老闆原本全部模組存取維持。
- 每次接手先同步 Git 並讀本文件。正式服務版本需依問題重新核對，不能只依歷史「已部署」記錄推定。
- 現有工讀生刪除入口原本透過名單保存，不是完整實體刪除流程；本次沒有擴大重做刪除或改變資料保留政策。如另有刪除需求須獨立確認，勿以整份名單回寫取代精確操作。
- 過往完整前端型別檢查有其他模組既有錯誤；本次前端驗證是 Vite build、原函式測試及 Rules 測試，Functions TypeScript build 通過。

## 相關檔案

- `Dashboard.tsx`：權限操作等待／失敗提示，頭像與啟用欄位更新。
- `taskService.ts`：人員精確寫入、舊名單保護、唯讀更新與顏色維護。
- `functions/src/index.ts`：完整權限正規化、交易同步與延遲事件處理。
- `permissions.ts`：既有角色／頁籤判斷，本次未修改。
- `tests/permission-regression.test.cjs`、`tests/permission-rules.cjs`、`tests/run-permission-rules.cjs`：新增回歸檢查，執行方式見 `tests/README.md`。
