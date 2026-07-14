# 碩業工作平台交接文件

這份文件是給「下一台電腦 / 下一位接手的人」看的。  
每次從家裡電腦換到事務所筆電，或從事務所筆電換回家裡電腦，都先看這份文件。

## 專案位置

- GitHub repo: `https://github.com/a0970953399-alt/aristo_cpa-work-platform`
- 主要分支: `main`
- 建議本機資料夾: `Desktop/aristo_cpa-work-platform`

## 目前專案狀態

- 前端框架: React 18 + TypeScript + Vite
- 後端 / 資料庫: Firebase Firestore
- 主要功能包含:
  - 儀表板
  - 工作矩陣 / 工時熱力圖
  - 客戶主檔
  - 工時紀錄
  - 發票產生
  - 現金紀錄
  - 郵件紀錄
  - 庫存
  - 薪資
  - 留言 / 通知

## 最近已完成的工作

- 已移除獨立的手機版 Dashboard。
- 所有裝置登入後都進入一般網頁版 Dashboard。
- 手機或小螢幕顯示改由現有響應式版面處理。
- 最近 GitHub 最新提交: `51292b5 Remove mobile dashboard`

## 換電腦工作前

在開始改之前，先做這幾件事:

1. 打開這台電腦的 `Desktop/aristo_cpa-work-platform`。
2. 確認目前分支是 `main`。
3. 從 GitHub 拉最新版本。
4. 看本文件的「目前做到哪裡」。
5. 再開始請 Codex 修改或自己修改。

建議請 Codex 說:

```text
請先幫我在桌面上的 aristo_cpa-work-platform 做 git pull，然後看 HANDOFF.md，接著延續上次工作。
```

## 換電腦前要留下的交接

每次結束工作前，至少更新這三件事:

1. 在本文件的「目前做到哪裡」補上最新進度。
2. 把完成的修改 commit。
3. 把 commit push 到 GitHub。

建議請 Codex 說:

```text
請幫我更新 HANDOFF.md 的交接內容，然後 commit 並 push 到 GitHub。
```

## 目前做到哪裡

### 2026-07-14

- 事務所筆電已確認桌面有本機專案資料夾。
- 已將 GitHub 最新版本拉到桌面專案。
- 目前桌面專案在 `main` 分支，已更新到 `51292b5 Remove mobile dashboard`。
- 新增本交接文件，之後兩台電腦都以這份文件作為工作銜接依據。

## 下一步建議

- 確認家裡電腦也有同一份 `HANDOFF.md`。
- 如果家裡電腦還沒有這份文件，先在家裡電腦對專案執行 pull。
- 之後每次換電腦，都先 pull，再看這份文件。

## 常用指令

安裝套件:

```bash
npm install
```

啟動開發環境:

```bash
npm run dev
```

建置正式版本:

```bash
npm run build
```

預覽正式版本:

```bash
npm run preview
```

## 注意事項

- Codex 任務對話不一定會完整跨電腦同步。
- GitHub 主要同步的是程式碼和文件。
- 所以重要的工作脈絡要寫進這份 `HANDOFF.md`。
- 如果有尚未完成的想法，不要只留在 Codex 對話裡，要補到本文件。
