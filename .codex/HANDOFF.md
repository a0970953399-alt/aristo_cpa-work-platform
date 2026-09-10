# 碩業工作平台交接

更新日期：2026-09-10
基準分支：`main`
基準提交：`main` 最新提交（打卡相容性與失敗回應修正）
本輪打卡修正、測試、`AGENTS.md` 與本交接文件已提交並推送 GitHub `main`。

## 目前優先事項

- 使用者表示 9/8 打卡正常，9/9 部分同事無法打卡，並在 9/10 說明會於上班後提醒同事再試。目前尚未收到 9/10 實測結果，不可宣稱所有帳號已實測恢復。
- 已確認問題來自 9/9 新部署的工時權限規則，不是記帳工作單簽名顯示修改。部分舊帳號缺少選填的 `users.isActive`，新規則直接讀取它而拒絕打卡；有明確啟用欄位的帳號不受同一缺陷影響。
- 正式 Firestore Rules 修正版已於 9/9 晚間部署；前端的錯誤提示與防連點修正已推送 GitHub，交由 Vercel 自動發布。
- 本次 9/10 更新協作規則與交接文件，並將 9/9 已完成的打卡修正及測試一併推送；未另改正式資料或再次部署 Firebase。

## 打卡修正與證據

- 影片顯示按下上班確認後圖示短暫變綠再復原，當日工時未出現，再點仍顯示上班確認。
- 9/9 唯讀核對正式環境確認，當天 11:13 台北時間已部署包含主管補登的新規則，當時交接文件的「尚未部署」記載已過時。
- 根因：`isActiveNonBossCheckInTarget` 使用 `get(targetPath).data.isActive != false`；模擬規則測試重現 `Property isActive is undefined`。多位既有員工資料缺此欄位，Google 綁定、對應人員 ID、姓名及 profile 啟用狀態則一致。
- `firestore.rules` 僅將該條件改為 `.data.get('isActive', true) != false`，與前端、Functions 的原有啟用判斷一致；明確停用者仍禁止打卡。未批次補寫人員或既有工時。
- `Dashboard.tsx` 上下班處理新增錯誤提示、`finally` 狀態復原、獨立送出中狀態、ref 防連點與離線阻擋。成功提示等待 Firestore 確認，本機通知失敗不再遮蔽已保存結果。工時計算公式未改。
- 修正版 Rules 於 9/9 19:56 台北時間部署成功，之後經 API 讀回確認與本機修正版一致。這是 9/9 已完成的核對，9/10 本輪未重新查詢正式環境。

## 驗證與部署狀態

- 9/9 前端 `npm.cmd run build` 通過；`git diff --check` 通過。
- `node --test tests/attendance-handlers.test.cjs`：6 項通過，涵蓋等待伺服器確認、連點、權限失敗後重試、離線／取消、下班失敗與通知失敗。
- `node tests/run-attendance-rules.cjs`：16 項通過，涵蓋舊帳號、工讀生、實習生、主管正常打卡／補登、停用、冒用、偽造補登／結算欄位與已結算資料保護。
- 規則測試使用 Firebase Rules Test API，所有文件查詢均以模擬資料提供，不建立正式測試紀錄；不是實際使用者登入測試。執行環境及 CLI 要求見 `tests/README.md`。
- Firestore Rules：本輪修正已部署。前端：修改已推送 GitHub `main`，由 Vercel 自動發布；本次未另核對 Vercel 完成時間。Functions：本輪未修改、未部署。寄信 Extension 未變動。
- 本機預覽曾於 9/9 啟動在 `http://127.0.0.1:5173/`；跨日或換電腦後需重新確認是否仍在執行。
- 不要依過往的「本輪已部署」字樣推斷其他服務現在的版本，排查新問題時重新核對相關正式服務。

## 已確認決策與既有功能

- 維持 React、Vite、Firebase 網頁版。正式網址：`https://aristo-cpa-work-platform.vercel.app/`。Functions 位於 `functions/src/index.ts`，區域 `asia-east1`。
- Google 登入沿用既有人員頭像與帳號，首次綁定需主管核准；PIN 登入與修改入口已移除。共用電腦切換需登出並選對 Google 帳號，選錯帳號會阻止登入。
- 權限由 `permissions.ts` 與 Firestore 的 `googleUserProfiles` 配合控制。工讀生預設有工作矩陣，實習生沒有；兩者預設只能查看自己的工時。額外模組權限由主管設定。
- Google 日曆維持平台單向同步。排班與主管指定提醒同步給本人及已連接日曆的在職主管／老闆；私人提醒不因此公開。今日提醒排除當日排班。
- Google 排班標題：員工為「碩業排班」，主管／老闆為「人員姓名-排班」；提醒為「碩業-提醒標題」或管理者的「人員姓名｜提醒標題」。說明結尾為「僅作為提醒，請以碩業工作平台為準」。
- 工時補登限老闆／主管，對象為啟用中的非老闆人員；不能補登未來、歷史已結算期間或同人同日第二筆，並保留補登原因與操作人員等來源欄位。
- 工時薪資結算僅老闆可操作，已結算不可修改、刪除或取消結算。`2026-06-30` 以前工時視為已結算，不批次回填結算欄位；不與客戶薪資模組連動。
- 帳務處理檢核限主管、覆核限老闆。客戶工作紀錄六個雙月份的 Incharge／會計師以對應兩個月份任務均完成為準，直接推導完成者與最後完成日期；單向顯示，不改寫舊 `clients.workRecords`。扣繳申報、年終申報仍用既有人工簽章。
- 記帳工作單畫面及 Word 匯出已支援既有簽名字樣轉為指定中文顯示名，日期不變，不遷移原資料；實作在 `ClientMasterView.tsx`。
- 碩業零用金與客戶代墊款已停止新的自動聯動，兩邊匯入／新增獨立。舊連結可經主管確認移除 `clientId`，保留金額、客戶名稱及其他紀錄；不要自行再次批次處理。
- 零用金匯入以金額正負判斷收支並保存絕對值，支援 Excel 日期及民國／西元格式，略過空白／標題列。
- 收發信件與零用金表格曾以 `min-h-0` 及高度調整修正最底列裁切，排序與資料未被刪除。
- `AGENTS.md` 已新增影響範圍檢查、舊資料相容、角色正反案例、根因證據、回歸測試、非同步錯誤處理及各服務部署核對；後續修改依此執行。

## 下一步與剩餘風險

1. 等待 9/10 同事重新整理正式平台後的打卡回報，確認成功提示、工作中狀態與當日工時；下班時再確認正常保存。若仍異常，記錄操作時間、帳號角色與錯誤訊息，核對修正版生效後的情況，不直接沿用舊結論。
2. 另一台電腦接手前先執行 `git pull`，確認取得 `Dashboard.tsx`、`firestore.rules`、`tests/`、`AGENTS.md` 與本文件的最新版本；不要重新部署舊版規則。
3. 既有流程仍待實際帳號確認的項目：共用電腦雙帳號正向切換、不同角色額外權限、指定提醒多方日曆同步，以及表格升降序到底列。不要把這些列為必須再次部署或自動修改資料的指令。
4. 請款單總覽目前僅討論，未授權實作。後續需確認修改／作廢／收款／寄出／歷史保留規則，再決定正式請款單資料模型。
5. `users` 目前仍供登入頁讀取人員名單；全面收緊前需另設公開登入資料或調整登入流程，此項未授權實作。
6. 過往 `npx.cmd tsc -b` 曾有零用金、庫存等既有型別錯誤；本輪正式驗證是 Vite build，不代表完整型別檢查已通過。

## 相關檔案與界線

- 協作／交接：`AGENTS.md`、`.codex/HANDOFF.md`。
- 打卡／工時：`Dashboard.tsx`、`TimesheetView.tsx`、`taskService.ts`、`notificationService.ts`、`firestore.rules`、`tests/`。
- 登入／權限：`App.tsx`、`LoginScreen.tsx`、`googleIntegrationService.ts`、`permissions.ts`、`functions/src/index.ts`。
- 工作紀錄／日曆：`ClientMasterView.tsx`、`CalendarView.tsx`；零用金／請款：`CashLogView.tsx`、`InvoiceGenerator.tsx`。
- 保留既有 Firebase 資料及薪資、零用金、工時等業務邏輯，避免無關重構。原有 `firebase/firestore-send-email` Extension 不可刪除或取代。
- 交接只保存最新狀態，歷史由 Git 保留；不得寫入 Gmail、PIN、OAuth secret、token 或其他敏感資料。
