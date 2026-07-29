# 碩業工作平台交接

更新日期：2026-07-29
基準分支：`main`
基準提交：`e6e7dd3 Add Codex handoff workflow and lock dependencies`

## 目前狀態

- 專案為 React、Vite、Firebase 的網頁版工作平台，正式網址為 `https://aristo-cpa-work-platform.vercel.app/`。
- GitHub `main` 已包含 Google 帳號登入、既有人員綁定、主管審核與 Google 日曆單向同步。
- PIN 登入與修改 PIN 仍作為過渡期備援，尚未移除。
- Firebase Functions 位於 `functions/src/index.ts`，區域為 `asia-east1`。
- 原有 Firestore 寄信 Extension 必須保留，不可視為本專案自建 Function 刪除。

## 最近完成事項

### 資安地基：Google UID 對應資料

- 第一階段先建立 Firestore Rules 可直接讀取的 `googleUserProfiles/{googleUid}` 對應資料，不直接一次收緊全部業務資料權限。
- `types.ts` 新增 `PlatformPermissions` 與 `GoogleUserProfile` 型別；`User` 可保存額外模組權限 `permissions`。
- `functions/src/index.ts` 新增 `syncGoogleUserProfile` 相關 helper，Google 帳號首次 bootstrap 綁定、主管核准綁定、已綁定者再次登入時都會同步 `googleUserProfiles`。
- 新增 `syncGoogleUserProfileOnUserWrite` Firestore trigger，當 `users/{userId}` 的角色、停用狀態、權限或 Google 綁定狀態被更新時，自動維護對應資料；使用者刪除或 Google UID 變更時會移除舊對應。
- 新增 `rebuildGoogleUserProfiles` callable，供已綁定主管或老闆之後手動回填既有已綁定使用者。
- 新增 `unlinkOwnGoogleAccount` callable、前端 service 方法與人員設定畫面按鈕；使用者只能解除自己的 Google 帳號綁定，解除時會一併停止 Google 日曆同步並登出。
- `firestore.rules` 已先把 `googleUserProfiles` 加入前端禁止直接讀寫的敏感集合，避免新對應表被現有 catch-all 規則公開。
- 本階段已於 2026-07-29 部署 Functions 與 Firestore Rules，並推送至 GitHub `main`，提交為 `5482a41 Add Google user profile security foundation`。

### 平台權限 UI 與基礎權限

- 新增 `permissions.ts` 作為前端共同權限 helper；老闆與主管預設擁有全部權限。
- 工讀生基礎權限包含：登入、自己的帳號/Google 綁定、自己的排班/提醒、可操作客戶事務矩陣、只能唯讀查看自己的工時。
- 實習生基礎權限維持較低：登入、自己的帳號/Google 綁定、自己的排班/提醒、只能唯讀查看自己的工時；不預設開啟客戶事務矩陣。
- 工讀生與實習生都不能因基礎權限開啟客戶主檔；矩陣中的客戶名稱點擊只有具備 `clientData` 權限者才會開啟客戶資料抽屜。
- 人員設定頁面已新增平台權限勾選：客戶主檔、零用金/代墊款、收發信件、薪資資料、管理工時、刪除正式資料。
- 額外權限寫入 `users/{userId}.permissions`；既有已部署的 `syncGoogleUserProfileOnUserWrite` 會同步到 `googleUserProfiles`，但因本輪新增了新 permission key，Functions 仍需重新部署才會完整同步所有欄位。
- 工時頁已改成：有 `manageTimesheets` 權限才可看全部人員、編輯、刪除；一般工讀生/實習生只訂閱自己的工時資料並唯讀顯示。
- 前端頁籤會依權限顯示：客戶事務矩陣為基礎權限；收發信件、零用金、薪資依額外權限；股票進銷存目前仍限老闆/主管。
- 本輪前端與 Functions 建置已通過，相關修改已部署並推送 GitHub。

### Firestore Rules 權限收緊

- 第三階段已開始把前端平台權限同步落到 Firestore Rules。
- `firestore.rules` 已改為以 `googleUserProfiles/{googleUid}` 判斷目前 Google 登入者的角色、停用狀態與平台權限。
- `calendarConnections`、`googleBindingRequests`、`googleOAuthStates`、`googleUserProfiles` 維持只能由 Cloud Functions 透過 Firebase Admin 操作，前端不可直接讀寫。
- `users` 仍暫時允許公開讀取，因為 PIN 過渡期與登入畫面需要先取得人員清單；但 Google UID、Google Email、Google 顯示名稱禁止前端直接改寫。新增、刪除、調整人員資料原則上限老闆/主管。
- `tasks` 依 `clientTasks` 控制；工讀生基礎擁有，實習生需額外授權。
- `checkIns` 已配合前端改為：管理工時者可查月份全部工時；一般使用者只訂閱自己的工時。Rules 也限制一般使用者只能讀寫自己的打卡紀錄，刪除工時需管理權限及刪除正式資料權限。
- `mailRecords`、`cashRecords`、`payrollClients`、`payrollRecords`、`employees`、`monthlySalaries` 分別依收發信件、零用金/代墊款、薪資資料權限控制；刪除另需 `canDeleteRecords`。
- `clients` 讀取目前開放給具客戶事務矩陣、客戶主檔、零用金、收發信件或薪資權限者；寫入客戶主檔需 `clientData`，刪除另需 `canDeleteRecords`。
- 目前限制：只要 PIN 登入仍存在，登入所需的人員清單仍無法完全鎖成 Google Auth 才能讀；全面收緊讀取需等 PIN 移除或另建公開登入名單集合。

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

### 指定人員提醒

- 老闆與主管可在行事曆替在職工讀生或實習生建立指定提醒，也可修改日期、內容、對象或刪除。
- 被提醒者可在自己的行事曆與今日提醒視窗查看，但不能修改或刪除主管指派的提醒。
- 所有老闆與主管可在平台行事曆看到指定提醒；提醒列使用淡黃色與左側琥珀色線條，主管畫面另顯示對象姓名。
- 工讀生或實習生自己建立的私人提醒仍只有本人可見，不會公開給管理者。
- 今日提醒視窗已排除當日排班，只顯示提醒事項。
- 指定提醒的 Google 日曆標題為「人員姓名｜提醒標題」，同步給被提醒者及所有已連接的在職老闆與主管。
- 2026-07-28 最新 Functions 已成功部署；前端由 GitHub `main` 的 Vercel 流程發布。

### Google 日曆文字格式

- 平台行事曆維持原本的排班與提醒樣式。
- 工讀生／實習生的 Google 排班標題改為「碩業排班」；老闆／主管看到「人員姓名-排班」，時間區間仍依上午、下午或整天設定。
- 工讀生／實習生的 Google 提醒標題改為「碩業-提醒標題」；老闆／主管的指定提醒維持「人員姓名｜提醒標題」。
- Google 事件說明只保留使用者填寫的備註，結尾統一為「僅作為提醒，請以碩業工作平台為準」。
- 新增 Google 事件格式版本；既有連線使用者下次載入平台時會自動更新既有事件一次，之後不重複執行。
- 這一輪 Google 日曆文字格式修改已推送至 GitHub `main`，最新 Functions 也已成功部署。

### 零用金匯入

- `b3d93fc`：事務所零用金匯入改以金額正負判斷收入與支出，寫入時保存絕對值。
- `e31569e`：匯入日期支援 Excel 日期值及民國／西元年月日格式，並略過空白列及可辨識的標題列。
- `7e5a090`：碩業零用金的支出若客戶名稱能對應既有客戶，會帶入 `clientId`，使該筆資料能連結至客戶代墊款。

### 客戶代墊款與碩業零用金拆分

- 不修改或搬移任何既有 Firebase 資料，也不新增「事務所已代付」欄位。
- 從客戶代墊款頁面新增或匯入的新資料使用 `client_advance` 帳本類型，只列入該客戶代墊款及請款單，不出現在碩業零用金，也不影響事務所餘額。
- 從碩業零用金新增且指定客戶的支出仍使用 `shuoye`，因此同時保留在碩業零用金並顯示於該客戶代墊款。
- 從碩業零用金匯入的支出若客戶名稱對應成功，仍使用 `shuoye` 並寫入 `clientId`，因此會自動顯示於該客戶代墊款。
- 客戶編號比較統一轉成文字後再判斷，兼容既有資料中可能存在的數字或文字編號，不會回寫資料庫。
- 本輪修改已完成建置驗證，並隨本交接文件提交至 GitHub `main`。

## 已確認決策

- 目前只維護網頁版，不恢復獨立手機版。
- Google 登入沿用既有人員頭像及資料，不建立第二套平台使用者。
- 每個人使用自己的 Gmail；首次綁定由主管核准。
- Google 日曆採平台到 Google 的單向同步。
- 交接文件只保存最新狀態，每次工作結束直接覆寫，不保留每日紀錄。
- 修改必須聚焦相關模組，不可順手重構薪資、工時、零用金或其他業務邏輯。

## 待辦與待確認

- 部署資安地基時需同時執行 Functions 與 Firestore Rules 部署，之後由已綁定老闆/主管登入觸發 `googleUserProfiles` 自動建立，或呼叫 `rebuildGoogleUserProfiles` 回填。
- 接著要把本輪平台權限 UI 部署/推送，並以老闆/主管帳號實測勾選權限後，確認工讀生/實習生可見頁籤與工時唯讀行為正確。
- 已在人員設定接上「解除自己的 Google 帳號綁定」按鈕，後續需用實際帳號確認解除後可重新申請或重新綁定。
- 以實際主管及員工帳號再次確認 Google 登入持續狀態、主管審核與共用電腦登出流程。
- 確認 `6b033ad` 的 Functions 版本是否已部署到 Firebase；GitHub 有程式碼不代表後端一定已部署。
- 以主管及工讀生兩個實際帳號確認指定提醒的平台可見性、唯讀權限與多方 Google 日曆同步。
- Google 日曆文字格式部署後，以主管及工讀生帳號各自載入一次平台，確認既有事件已自動改成新標題。
- 用實際零用金 Excel 檔驗證三項匯入調整：金額正負、日期正規化、客戶代墊款連結。
- 在不建立正式測試資料的前提下，待使用者於平台確認三條新流程：客戶頁新增不進碩業、碩業新增會進客戶頁、碩業匯入匹配客戶後會進客戶頁。
- 所有人完成 Google 綁定並穩定使用後，再討論移除 PIN 與全面收緊 Firestore Auth 規則。

## 驗證與部署

- 前端驗證：在專案根目錄執行 `npm.cmd run build`。
- Functions 驗證：在 `functions` 目錄執行 `npm.cmd run build`。
- 程式修改後執行 `git diff --check`。
- 2026-07-28 已確認指定提醒修改的前端與 Functions 建置成功，`git diff --check` 通過。
- 2026-07-28 已確認客戶代墊款與碩業零用金拆分的前端建置成功，未建立或修改任何 Firebase 測試資料。
- 已在本機主管頁面檢查新增提醒視窗與人員選單；未送出測試事件，因此沒有修改正式 Firebase 資料。
- Functions 部署前確認 `functions/.env` 的公開 App URL，Secret Manager 的值不可寫入 Git。
- 推送前只加入本次相關檔案與本交接文件。

## 相關檔案

- Google 整合：`LoginScreen.tsx`、`App.tsx`、`Dashboard.tsx`、`googleIntegrationService.ts`
- 行事曆顯示：`CalendarView.tsx`
- Calendar 後端：`functions/src/index.ts`
- Firebase：`firebase.ts`、`firebase.json`、`firestore.rules`
- 零用金匯入：`CashLogView.tsx`
- 客戶請款單：`InvoiceGenerator.tsx`
- 共用資料型別：`types.ts`
