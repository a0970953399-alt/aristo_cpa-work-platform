# 碩業工作平台交接

更新日期：2026-09-05
基準分支：`main`
基準提交：`main` 最新提交（帳務處理與客戶工作紀錄單向聯動）

## 目前狀態

- 專案為 React、Vite、Firebase 的網頁版工作平台，正式網址為 `https://aristo-cpa-work-platform.vercel.app/`。
- GitHub `main` 已包含 Google 帳號登入、既有人員綁定、主管審核與 Google 日曆單向同步。
- PIN 登入與修改 PIN 已從前端移除；平台登入改為只走 Google 帳號登入／綁定申請。
- Firebase Functions 位於 `functions/src/index.ts`，區域為 `asia-east1`。
- 原有 Firestore 寄信 Extension 必須保留，不可視為本專案自建 Function 刪除。

## 最近完成事項

### 帳務處理與客戶工作紀錄聯動

- 客戶工作紀錄的六個雙月份期間已與「帳務處理」矩陣建立顯示聯動：兩個月份的「檢核」都完成後，工作紀錄 `Incharge` 直接讀取原任務完成者與日期；兩個月份的「覆核」都完成後，`會計師` 以同樣方式顯示。
- 簽章使用該雙月份中最後完成的日期與完成者；畫面和 Word 工作單匯出共用同一結果。
- 聯動結果由對應年度 `tasks` 即時推導，不批次改寫既有 `clients.workRecords`，也不會增加檢核／覆核時對客戶主檔的額外寫入。六個雙月份列以帳務處理為唯一顯示來源；舊的人工簽章資料不會被刪除，但不會覆蓋聯動結果。`扣繳申報`與`年終申報`繼續使用現有人工簽章。
- `ClientTask` 新增選填的 `completedById`、`completedByName`、`completedByRole`，只在之後完成任務時自動寫入，不遷移或重寫舊任務。舊任務會直接使用原有的完成日期、完成時間、履歷與人員欄位，不因缺少新欄位而無法顯示。
- 工作紀錄會優先使用客戶主檔的「記帳年度」對應任務；當該年度不是目前矩陣年度時，只在開啟客戶詳情期間額外監聽該一年，不長期讀取所有歷史年度。
- 帳務處理權限收緊為「檢核只能由主管完成，覆核只能由老闆完成」，已同步處理工作矩陣、今日工作清單及 Firestore Rules；不改變營業稅申報「檢核」的現行權限。
- 前端 `npm.cmd run build` 與 `git diff --check` 已通過。`npx.cmd tsc -b` 仍有專案原有的零用金、庫存等型別錯誤，本次新增的檔案行未出現新錯誤。
- 本輪程式碼與交接文件已推送 GitHub `main`，功能提交為 `edd20ca`；Firestore Rules 已於 2026-09-05 成功編譯並部署到 `aristo-cpa-work-platform` 正式環境。

### 收發信件與零用金表格捲動修正

- 修正收發信件、零用金與客戶代墊款表格在升序或降序後，最底下一筆看似消失的版面問題。
- 排序與資料筆數原本沒有遺失；問題來自固定高度的主內容區裁切超出範圍，而零用金頁面另以視窗高度設定過大的最低高度。
- `Dashboard.tsx`、`MailLogView.tsx`、`CashLogView.tsx` 已補齊 Flex 容器所需的 `min-h-0`，並移除零用金頁面不符合實際可用空間的最低高度。
- 本次只調整頁面高度與捲動 CSS，不修改 Firebase 資料、排序、結餘或代墊款業務邏輯。
- 前端正式建置與 `git diff --check` 已通過；本機預覽可正常載入登入頁，尚需用實際主管帳號確認升序與降序都能捲動到最底列。

### 客戶代墊款與碩業零用金完全分離

- 為避免大量匯入時重複入帳，碩業零用金與客戶代墊款暫停所有新的自動聯動。
- 碩業零用金手動新增不再提供客戶聯動選單；Excel 匯入仍保存 D 欄客戶名稱供零用金辨識，但不寫入 `clientId`，因此不會進入客戶代墊款。
- 客戶代墊款頁面新增或匯入的資料繼續使用 `client_advance`，只出現在該客戶代墊款及請款單，不影響碩業零用金。
- 主管可在客戶代墊紀錄首頁看到既有連結筆數，經確認後批次移除所有碩業舊紀錄的 `clientId`；客戶名稱與零用金其他欄位保留，完成後批次按鈕自動消失。
- 客戶代墊款頁面與代墊款總覽中，來源為碩業零用金的舊紀錄也可逐筆使用「取消客戶連結」，同樣只移除 `clientId`。
- 直接從客戶代墊款頁面新增的 `client_advance` 紀錄仍可正常刪除。
- 本輪只需由 GitHub `main` 觸發 Vercel 前端部署，不需部署 Functions 或 Firestore Rules；正式建置與 `git diff --check` 已通過，相關程式碼與本交接文件已一併提交。

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
- `users` 仍暫時允許公開讀取，因登入畫面需要先取得人員清單供使用者選擇平台身分；但 Google UID、Google Email、Google 顯示名稱禁止前端直接改寫。新增、刪除、調整人員資料原則上限老闆/主管。
- `tasks` 依 `clientTasks` 控制；工讀生基礎擁有，實習生需額外授權。
- `checkIns` 已配合前端改為：管理工時者可查月份全部工時；一般使用者只訂閱自己的工時。Rules 也限制一般使用者只能讀寫自己的打卡紀錄，刪除工時需管理權限及刪除正式資料權限。
- `mailRecords`、`cashRecords`、`payrollClients`、`payrollRecords`、`employees`、`monthlySalaries` 分別依收發信件、零用金/代墊款、薪資資料權限控制；刪除另需 `canDeleteRecords`。
- `clients` 讀取目前開放給具客戶事務矩陣、客戶主檔、零用金、收發信件或薪資權限者；寫入客戶主檔需 `clientData`，刪除另需 `canDeleteRecords`。
- 目前限制：雖然 PIN 登入已移除，但登入頁仍需在 Google Auth 前讀取人員清單；若要全面收緊 `users` 讀取，需另建只含姓名、頭像與必要狀態的公開登入名單集合，或改成先 Google Auth 再選擇平台人員。

### 內部工時結算

- 內部工時只新增「是否已結算薪資」狀態，不做薪資計算，也不與客戶薪資模組連動。
- `CheckInRecord` 新增 `paidAt`、`paidBy`、`paidById`；有 `paidAt` 即表示該筆工時已由老闆結算薪資。
- 只有老闆可以將未結算工時標記為已結算；主管不能結算薪資。
- 結算是不可逆操作：已結算工時不能修改、不能刪除、不能取消結算。
- `2026-06-30` 以前的工時不批次寫入結算欄位，但畫面與規則都視為已結算，不能修改或刪除；畫面只用結算色填滿，不顯示「歷史已結算」文字。
- `TimesheetView.tsx` 以較明顯的紫色系標示已結算工時，並在熱力圖與列表列背景使用同一套結算色；未結算仍維持原本顯示。
- Firestore Rules 已限制一般員工不能寫入結算欄位，主管不能結算，已結算或歷史工時不能再被前端更新或刪除。

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


### 代墊款總覽與請款單總覽討論

- 2026-08-11 討論零用金／代墊款頁面中的「代墊款總覽」功能。結論是目前代墊款總覽比較接近「代墊明細查詢表」，可以依請款單編號、客戶名稱、日期、代墊費用篩選，也能以 `requestId` 分組顯示小計，但尚未形成完整的請款管理流程。
- 目前代墊款資料主要仍保存於 `cashRecords`。`requestId` 與 `isReimbursed` 是寫在每一筆代墊明細上的欄位；系統尚未建立獨立的「請款單」資料模型，因此無法完整保存請款單日期、承辦事項小計、稅額、總額、建立人、建立時間、寄出狀態、收款狀態、作廢狀態或重新下載紀錄。
- 初步評估：現有代墊明細查詢功能約完成 70%，但請款管理流程約只完成 35%。缺口不在單筆代墊款的資料顯示，而在缺少「請款單層級」的狀態、歷史與流程管理。
- 建議新增「請款單總覽」，並與既有「代墊款總覽」分工：代墊款總覽負責查看每一筆代墊明細；請款單總覽負責查看每一張請款單及其狀態。建議欄位包含請款單編號、客戶名稱、請款日期、代墊款小計、承辦事項小計、稅額、請款總額、狀態、建立人、建立時間與操作按鈕。
- 請款單總覽有兩種技術路線。第一種是從現有 `cashRecords.requestId` 即時計算，改動較小，但無法完整保存請款單本身的資訊。第二種是新增正式請款單集合，例如 `invoiceRecords` 或 `billingRequests`，讓每張請款單成為正式資料；此方式改動較大，但較符合後續寄出、收款、作廢、重開與稽核需求。
- 初步傾向採用第二種做法：新增真正的請款單資料表，而不是只用代墊明細反推。原因是請款單一旦涉及承辦事項金額、稅額、收款狀態、作廢與歷史追蹤，單靠 `cashRecords` 分組會使業務邏輯不穩定，也不利於日後查核。
- 本次只是需求與架構討論，使用者明確要求未經同意不得修改程式碼。因此目前尚未變更 `CashLogView.tsx`、`InvoiceGenerator.tsx`、`taskService.ts`、`types.ts` 或 Firestore Rules。


### 共用電腦 Google 登入修正

- 已確認實習生資料的角色為 `trainee`、帳號為啟用狀態；登入異常並非實習生角色本身遭禁止。
- 原本 Firebase Auth 使用瀏覽器持續登入；只要 `auth.currentUser` 尚在，點選其他人員頭像後就不會重新顯示 Google 帳號選擇視窗。`App.tsx` 又會依現有 Google UID 自動切回其已綁定人員，因此共用電腦可能出現「點實習生頭像仍進入工讀生頁面」。
- `App.tsx` 現在會等待 Firebase 真正登出後才回到人員選擇頁，並在手動 Google 登入期間保存所選人員 ID，阻止其他已綁定 UID 覆蓋所選頭像。
- `googleIntegrationService.ts` 會在現有 Google UID 與所選人員不符時先登出，並以 `prompt: select_account` 重新開啟帳號選擇；登入已綁定人員時也會核對 UID。
- 選錯 Gmail 時會清除該次 Firebase Auth 並停在登入畫面，不會進入錯誤人員頁面；`LoginScreen.tsx` 會顯示明確的帳號不符訊息。
- 尚未綁定人員仍沿用原本「送出申請、主管核准」流程；既有 `users`、`googleUserProfiles`、Google 日曆與所有業務資料均不遷移、不重寫。
- 本輪只修改前端登入流程，不需變更 Functions 或 Firestore Rules。前端正式建置與 `git diff --check` 已通過，已以提交 `f318c55` 推送至 GitHub `main`，由 Vercel 自動部署。
- 已由使用者確認負向情境：點擊其他人員頭像後選擇自己的 Gmail，平台會阻止登入，不會跳進該 Gmail 原本綁定的人員頁面。共用電腦上兩個已綁定帳號的正向切換仍待實測。


### 營業稅申報新增檢核欄位

- 2026-08-27 依需求在「營業稅申報」矩陣中，於「文中」與「申報」之間新增「檢核」欄位。
- 欄位定義位於 `constants.ts` 的 `TAX_SUB_ITEMS`，目前順序為「憑證整理、EXCEL、文中、檢核、申報、歸檔」。
- 權限行為比照「帳務處理」的「覆核」欄位：一般工讀生／實習生不能自行登記該欄位；主管可開啟派案/直接完成流程；老闆可直接點擊完成並寫入今日日期。
- 對應邏輯位於 `Dashboard.tsx` 的 `isBossAssignableColumn`，已加入 `TabCategory.TAX` 且子項目為「檢核」時回傳 true。

### PIN 登入移除

- 2026-08-27 依需求移除 PIN 密碼登入。`LoginScreen.tsx` 已刪除 PIN state、PIN 驗證函式、過渡期間登入分隔線、密碼輸入框與「進入系統」按鈕；使用者點選人員後只能透過 Google 帳號登入或送出 Google 綁定申請。
- `Dashboard.tsx` 已移除個人設定與人員管理中的「修改登入密碼」區塊，並移除 `newUserPin` state、`handleUpdatePin` 函式與新增人員時寫入預設 `pin: '1234'` 的邏輯。
- `constants.ts` 已移除 `DEFAULT_PIN` 與預設使用者的 `pin` 欄位；`types.ts` 已移除 `User.pin` 型別。
- `firestore.rules` 已移除一般使用者自行更新 `pin` 的例外，只保留自行更新 `avatar` 與 `shiftColorHue`。這次 Rules 檔案有修改，若要讓 production 規則同步，需部署 Firestore Rules。
- 目前資料庫既有 `users` 文件中若仍有舊 `pin` 欄位，不會被本次前端修改自動清除；該欄位已不再被登入流程讀取或設定頁更新。

### 零用金匯入

- `b3d93fc`：事務所零用金匯入改以金額正負判斷收入與支出，寫入時保存絕對值。
- `e31569e`：匯入日期支援 Excel 日期值及民國／西元年月日格式，並略過空白列及可辨識的標題列。

## 已確認決策

- 目前只維護網頁版，不恢復獨立手機版。
- Google 登入沿用既有人員頭像及資料，不建立第二套平台使用者。
- 每個人使用自己的 Gmail；首次綁定由主管核准。
- Google 日曆採平台到 Google 的單向同步。
- 交接文件只保存最新狀態，每次工作結束直接覆寫，不保留每日紀錄。
- 修改必須聚焦相關模組，不可順手重構薪資、工時、零用金或其他業務邏輯。

## 待辦與待確認

- 在收發信件及零用金／代墊款頁面分別切換日期升序、降序，確認兩個方向都能捲動並看到最後一筆資料。

- 部署資安地基時需同時執行 Functions 與 Firestore Rules 部署，之後由已綁定老闆/主管登入觸發 `googleUserProfiles` 自動建立，或呼叫 `rebuildGoogleUserProfiles` 回填。
- 接著要把本輪平台權限 UI 部署/推送，並以老闆/主管帳號實測勾選權限後，確認工讀生/實習生可見頁籤與工時唯讀行為正確。
- 已在人員設定接上「解除自己的 Google 帳號綁定」按鈕，後續需用實際帳號確認解除後可重新申請或重新綁定。
- 以實際主管及員工帳號再次確認 Google 登入持續狀態、主管審核與共用電腦登出流程。
- 確認 `6b033ad` 的 Functions 版本是否已部署到 Firebase；GitHub 有程式碼不代表後端一定已部署。
- 以主管及工讀生兩個實際帳號確認指定提醒的平台可見性、唯讀權限與多方 Google 日曆同步。
- Google 日曆文字格式部署後，以主管及工讀生帳號各自載入一次平台，確認既有事件已自動改成新標題。
- 用少量可刪除的測試資料確認：碩業零用金匯入會保留客戶名稱但不進入客戶代墊款，客戶代墊款匯入也不進入碩業零用金。
- 前端部署後，由主管確認批次顯示筆數，再按「解除既有連結」執行正式資料更新；完成後確認客戶頁紀錄消失，而碩業零用金的客戶名稱、金額與餘額不變。
- PIN 登入已移除。後續若要進一步收緊 `users` 公開讀取，需設計公開登入名單集合或調整為先 Google Auth 再選平台人員。

- 請款單總覽尚未實作。下一步需先確認業務規則：請款單產生後是否可修改、是否允許作廢、已請款代墊款是否能移到另一張請款單、是否需要「已寄出」與「已收款」兩段狀態、請款單總覽是否納入承辦事項金額與稅額。

- 前端部署後，以工讀生與實習生共用的電腦實測：工讀生登出、實習生點自己頭像、選擇自己的 Gmail；確認選錯 Gmail 時留在登入畫面，選對 Gmail 時才進入對應頁面。實習生目前仍需完成首次主管核准綁定。

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
- 零用金資料操作：`taskService.ts`
- 客戶請款單：`InvoiceGenerator.tsx`
- 共用資料型別：`types.ts`
