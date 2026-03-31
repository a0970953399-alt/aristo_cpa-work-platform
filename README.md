<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 碩業會計師事務所 工作平台

**Aristo CPA Work Platform** — 一個專為會計師事務所設計的內部作業管理系統

</div>

---

## 專案簡介

碩業工作平台是一套完整的會計事務所內部管理系統，涵蓋客戶管理、工作進度追蹤、薪資計算、財務記錄等核心業務流程，支援桌面與行動裝置。

**使用對象：** 老闆、主管、工讀生（小型團隊）

---

## 主要功能

| 模組 | 功能說明 |
|------|----------|
| **工作矩陣** | 客戶 × 工作項目的進度矩陣（未開始 / 進行中 / 完成） |
| **客戶主檔** | 客戶基本資料、服務項目、繳費紀錄、簽核追蹤 |
| **現金帳** | 三帳戶收支記錄（碩業 / 永業 / 璞和），支援 Excel 匯入匯出 |
| **郵件記錄** | 往來文件追蹤（寄出 / 收件） |
| **發票產生器** | 基於範本自動產生發票，支援 Excel 匯出 |
| **股票庫存** | 客戶股票交易記錄、FIFO 成本計算、損益統計 |
| **薪資系統** | 員工薪資計算、勞健保扣繳、出勤管理 |
| **打卡系統** | 員工上下班打卡、休息時數記錄 |
| **訊息板** | 團隊公告、問題回報、日常溝通 |
| **行事曆** | 班表管理與事件排程 |

---

## 技術架構

**前端**
- React 18 + TypeScript
- Vite 5（建置工具）
- Tailwind CSS（樣式）
- Framer Motion（動畫）
- Recharts（圖表）

**後端 / 資料庫**
- Firebase Firestore（即時雲端資料庫）
- 純前端架構，無獨立後端伺服器

**文件處理**
- ExcelJS / XLSX（Excel 匯入匯出）
- Docxtemplater（Word 文件產生）

---

## 本地運行

**環境需求：** Node.js

### 1. 安裝依賴套件

```bash
npm install
```

### 2. 設定環境變數

在專案根目錄建立 `.env.local` 檔案，填入 Firebase 設定：

```env
VITE_FIREBASE_API_KEY=你的金鑰
VITE_FIREBASE_AUTH_DOMAIN=你的網域
VITE_FIREBASE_PROJECT_ID=你的專案ID
VITE_FIREBASE_STORAGE_BUCKET=你的儲存桶
VITE_FIREBASE_MESSAGING_SENDER_ID=你的發送者ID
VITE_FIREBASE_APP_ID=你的應用程式ID
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器前往 `http://localhost:5173`

### 其他指令

```bash
npm run build    # 產生正式版本
npm run preview  # 預覽正式版本
```

---

## 登入方式

- 從預設使用者清單中選擇身份（老闆 / 主管 / 工讀生）
- 輸入 PIN 碼驗證（預設：`1234`）
- 不同角色可見功能不同

---

## 專案結構

```
aristo_cpa-work-platform/
├── App.tsx                  # 主路由（登入 → 桌面/行動版）
├── Dashboard.tsx            # 桌面版主介面（9 個分頁）
├── MobileDashboard.tsx      # 行動版介面
├── MatrixView.tsx           # 工作進度矩陣
├── ClientMasterView.tsx     # 客戶主檔
├── CashLogView.tsx          # 現金帳
├── MailLogView.tsx          # 郵件記錄
├── InvoiceGenerator.tsx     # 發票產生器
├── StockInventoryView.tsx   # 股票庫存
├── PayrollView.tsx          # 薪資系統
├── TimesheetView.tsx        # 工時記錄
├── taskService.ts           # 資料服務層（Firebase）
├── types.ts                 # TypeScript 型別定義
├── constants.ts             # 全域常數與使用者清單
└── firebase.ts              # Firebase 設定
```
