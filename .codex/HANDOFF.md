# 碩業工作平台交接

更新日期：2026-11-05。基準版本 `4dc6a95`（Complete recurring payroll enrollment continuity），工作分支 `main`。功能提交 `0478907` 已推送 `main`；Vercel Production 部署 success，`payrollCommand` 已於 2026-11-05 部署。尚未以正式帳號驗收。

使用者表示 10/13 的 `fe34c17`、`4dc6a95` 已上線，並要求以最新程式碼為準；本文件未實際核對正式版本。

## 本次範圍與已確認決策

修正薪資掃描第一大類（可能發錯薪資或算錯帳），並依使用者同意一併處理批次寄送的中斷與結果顯示。

- 自動帶入：月份不晚於台灣當月，且上月有唯一一張已保存的完整月份薪資才帶入；未保存的自動帶入單不算已保存，因此不會連續往後產生。
- 沿用項目：本薪、伙食費依目前待遇；勞保、健保、勞退自提、職務津貼沿用上月。全勤、所得稅、績效獎金、加班、請假、遲到、預支、結帳差額每月重新填。
- 不帶入改顯示「待填當月資料」：上月不足月或有多張一般單、投保級距或加退保變動、應投保卻是 0 元。開啟時仍預填可沿用的金額，保存後才納入。
- 投保勾選以待遇歷程為準，舊資料未設定視為有投保；只有勞保的員工要取消勾選「投保健保」。未投保項目帶 0。
- 寄送擋下條件（前端與 Functions 一致）：信箱無效、未來月份、一般單本薪為 0、應投保卻是 0 元。同月已有其他已保存單時不檢查投保金額；補發單不檢查本薪與投保。
- 不足月本薪與伙食費都預設 0，需手動填。
- 空白新單保存後才算納入，只有自動帶入單可未保存就寄送。
- 批次寄送改為核對表，黃底標示與上月不同；有問題的員工略過，其餘照常寄送，結果顯示於月表上方。
- 作廢已生效的更正單會恢復被取代的原單。寄送紀錄改查單據所有版本，作廢或恢復後仍顯示真實寄送狀態，也不會重複寄送或直接修改。
- 作廢已排程或已寄出的單會先警告，但仍允許作廢。
- 勞健保每月由人工核對，因此不做費率表，也不做費率生效月提醒。

## 相關檔案

`functions/src/payrollDomain.ts`、`functions/src/payroll.ts`、`usePayrollPresentation.ts`、`PayrollView.tsx`、`tests/payroll-regression.test.cjs`、`tests/payroll-workflow-ui.test.cjs`、`tests/payroll-fixes-ui.test.cjs`、`tests/payroll-layout.test.cjs`、`tests/README.md`。Firestore Rules 與既有資料未修改。

## 驗證結果

全部使用模擬資料，未登入正式帳號、未寫入正式 Firestore、未實際寄信。

- `tests/payroll-regression`、`payroll-display`、`permission-regression`、`attendance-handlers` 通過 93/93，其中 10 項為新增。
- `tests/payroll-workflow-ui.test.cjs` 通過，並新增批次核對、略過、結果顯示、空白單與未來月份情境；另修正其測試替身依系統日期判斷首次納入的問題。
- `tests/payroll-ui.test.cjs` 通過。
- `tests/payroll-fixes-ui.test.cjs` 與 `tests/payroll-layout.test.cjs` 已更新並通過。兩者在 `def7210` 通過、自 `fe34c17` 起失敗，根因是測試仍依舊的「保存草稿／確認薪資」流程與舊規則，並非應用程式錯誤；本次改成目前流程，原本的檢查項目保留。例外：`payroll-layout` 的舊單唯讀檢查已改為未修改時不能保存，因舊單已可編輯；其欄寬比對的測試員工改為已首次納入，才能與舊版同樣顯示實發金額（未納入列顯示「—」、欄寬較窄是 `806ae55` 既有設計）。
- 根目錄與 Functions 的 `npm.cmd run build` 通過。

Playwright 未安裝於專案；瀏覽器測試使用專案外的 `playwright-core`，以 `PLAYWRIGHT_MODULE` 指定路徑，搭配本機 Edge。

## 部署狀態

| 服務 | 需要部署 | 目前狀態 |
|---|---|---|
| 前端 | 是 | 已部署（Vercel Production success） |
| Functions（`payrollCommand`） | 是 | 已部署，只更新此函式 |
| Firestore Rules | 否 | 無差異 |
| `firebase/firestore-send-email` Extension | 否 | 不得刪除或取代 |

部署後已確認函式與 `ext-firestore-send-email-processqueue` 都存在，未登入呼叫回 401；正式網址的 `PayrollView-B9Ujj8X6.js` 含新版批次核對程式。本機部署曾因分析程式碼逾時失敗，可在部署指令前設定 `FUNCTIONS_DISCOVERY_TIMEOUT=120`。

## 待辦

- 以正式帳號驗收批次核對、寄送檢查與作廢更正單；驗收時注意不要寄出真實薪資單。
- 掃描清單其餘項目依大類逐步處理：第二大類第 9–16 項，另加「需處理」清單要說明具體原因（目前投保變動的單只顯示「待填當月資料」）；第三大類操作體驗、第四大類程式缺陷、第五大類事務所規則確認（兼職請假、平日加班倍率、免稅範圍）。
- 舊有待核對：「9 月舊薪資多人編輯覆蓋」保持原樣。

## 風險

- 有投保勾選但金額為 0 的員工（含兼職）會被擋下寄送，需填金額或取消勾選。
- 沒有上月完整薪資的月份不再顯示自動金額，月表小計與年度帳冊數字會比先前少。
- 正式資料有八筆 `temporaryPayrollHidden` 標記（依前次交接，本次未核對）；後端仍會因這些紀錄拒絕該月新單。不要自行清理、取消、重算或遷移。
- Google 日曆仍為單向同步。
