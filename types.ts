
export const UserRole = {
  SUPERVISOR: 'supervisor',
  INTERN: 'intern'
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  pin?: string;
}

export type TaskStatusType = 'todo' | 'in_progress' | 'done';

export interface HistoryEntry {
  timestamp: string;
  userName: string;
  action: string;
  details?: string;
}

export interface ClientTask {
  id: string;
  clientId: string;
  clientName: string;
  workItem: string;
  status: TaskStatusType;
  note: string;
  assigneeId?: string;
  assigneeName?: string;
  year: string;
  completionDate?: string;
  isNA?: boolean;
  isMisc?: boolean;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  category: string;
  history?: HistoryEntry[];
}

export type EventType = 'shift' | 'reminder';

export interface CalendarEvent {
    id: string;
    date: string;
    type: EventType;
    title: string;
    description?: string;
    ownerId: string;
    ownerName: string;
    creatorId: string;
    createdAt: string;
}

export interface Client {
    id: string;
    code: string;
    name: string;
}

export interface Client {
    id: string;
    code: string; // 客戶編號 (原本就有的)
    name: string; // 顯示用的簡稱
    
    // --- 補上這兩個漏掉的標頭欄位 ---
    year?: string; // 記帳年度 (如: 114)
    workNo?: string; // 記帳工作 (如: 114B044)
    
    // --- 下面是原本已經加好的 ---
    fullName?: string; // 公司全名
    taxId?: string; // 統一編號
    taxFileNo?: string; // 稅籍編號
    owner?: string; // 負責人
    contact?: string; // 聯絡人
    phone?: string; // 聯絡電話
    fax?: string; // 傳真
    email?: string; // E-mail
    regAddress?: string; // 登記地址
    contactAddress?: string; // 聯絡地址
    cpa?: string; // 負責會計師
    period?: string; // 委任期限
    feeMonthly?: string; // 委任公費
    feeWithholding?: string; // 各類扣繳
    feeTax?: string; // 結算申報
    fee22_1?: string; // 22-1申報
    chkAccount?: boolean; 
    chkInvoice?: boolean; 
    chkVat?: boolean; 
    chkWithholding?: boolean; 
    chkHealth?: boolean; 
    boxReview?: boolean; 
    boxAudit?: boolean; 
    boxCpa?: boolean; 
}

export interface Instruction {
    id: string;
    title: string;
    category: string;
    imageUrl: string;
    description: string;
}

export const TabCategory = {
  WORK_LIST: "工作清單",
  CALENDAR: "行事曆",
  ACCOUNTING: "帳務處理",
  TAX: "營業稅申報",
  INCOME_TAX: "所得扣繳",
  ANNUAL: "年度申報",
  SUBMISSION: "送件",
  CASH: "零用金/代墊款",
  STOCK: "股票進銷存",
  PAYROLL: "薪資計算"
} as const;
export type TabCategory = typeof TabCategory[keyof typeof TabCategory];

export interface CheckInRecord {
    id: string;
    userId: string;
    userName: string;
    date: string;       // 格式: YYYY-MM-DD
    startTime: string;  // 格式: HH:mm
    endTime?: string;   // 格式: HH:mm (上班時是空的)
    breakHours: number; // 午休扣除時數
    totalHours: number; // 最終計算工時
}

export type MessageCategory = 'announcement' | 'bug' | 'chat';

export interface Message {
    id: string;
    content: string;
    category: MessageCategory;
    authorId: string;
    authorName: string;
    createdAt: string; // ISO 時間格式
}

// ✨ 新增：收發信件相關定義
export type MailCategory = 'aristo_out' | 'lawyer_out' | 'inbound'; // 碩業寄件 | 張律師寄件 | 收文

export interface MailRecord {
    id: string;
    date: string;          // 日期
    fileName: string;      // 文件名稱
    clientName: string;    // 客戶名稱 (寄件=請款對象, 收件=收件客戶)
    counterpart: string;   // 對方名稱 (寄件=收件者, 收件=寄件者)
    address?: string;      // 地址 (僅寄件需要)
    method: string;        // 送件方式 (普掛/快遞...)
    amount?: string;       // 金額 (僅寄件需要)
    trackingNumber?: string; // 單號
    category: MailCategory; // 分類
}

// ✨ 新增：零用金/代墊款相關定義
export type CashAccountType = 'shuoye' | 'yongye' | 'puhe';

export interface CashRecord {
    id: string;
    date: string;               // 日期 (YYYY-MM-DD)
    type: 'income' | 'expense'; // 收入 或 支出
    amount: number;             // 金額
    category: string;           // 代墊費用/會計科目 (如: 規費, 郵資, 零用金)
    description: string;        // 說明
    note?: string;              // 備註 (客戶代墊時自動生成 1,2,3... / 內部則為手動)
    
    // 連動相關欄位
    account: CashAccountType;   // 帳本歸屬 (碩業/永業/璞和)
    clientId?: string;          // 若有值，代表是「客戶代墊款」 (連動關鍵)
    clientName?: string;        // 客戶名稱
    
    // 特殊欄位
    requestId?: string;         // 請款單編號 (客戶代墊用，做藍色分組)
    isReimbursed?: boolean;     // 是否已請款 (碩業用)
    voucherId?: string;         // 傳票號碼 (內部用)
}

// ==========================================
// ✨ 股票進銷存系統相關定義 (Stock Inventory)
// ==========================================

// 1. 紀錄有開通股票進銷存的客戶
export interface StockClientConfig {
    id: string;       // 通常可以直接用 clientId 作為文件 ID
    clientId: string; 
    createdAt: string;
}

// 2. 紀錄單一客戶追蹤的股票標的
export interface StockTarget {
    id: string;       // 系統生成的唯一碼
    clientId: string; // 屬於哪位客戶
    code: string;     // 股票代號 (如: 2330)
    name: string;     // 股票名稱 (如: 台積電)
    createdAt: string;
}

// 3. 股票交易明細與餘額 (涵蓋買入、賣出、FIFO)
export type StockTransactionType = 'buy' | 'sell';

export interface StockTransaction {
    id: string;
    stockTargetId: string; // 綁定在哪一檔股票下
    clientId: string;      // 綁定在哪位客戶下
    type: StockTransactionType;
    
    // 共通欄位
    date: string;          // 交易日期
    voucherNo: string;     // 傳票號碼
    units: number;         // 單位數 (股數)
    unitPrice: number;     // 單位成本/賣價
    fee: number;           // 手續費
    paymentDate: string;   // 扣款日/入款日
    
    // 【買入】專屬欄位
    buyAmount?: number;      // 金額 (單位數 * 單價)
    buyActualCost?: number;  // 實際成本 (金額 + 手續費)
    
    // 【賣出】專屬欄位
    sellAmount?: number;     // 賣價 (單位數 * 單價)
    sellTax?: number;        // 證交稅
    sellNetAmount?: number;  // 實際賣出淨額 (賣價 - 手續費 - 證交稅)
    matchedCost?: number;    // 金額帳列成本 (由系統 FIFO 抓取買入成本)
    realizedPnl?: number;    // 處分損益 (實際賣出淨額 - 金額帳列成本)
    
    // 備註與系統紀錄
    note?: string;
    createdAt: string;
}

// ==========================================
// ✨ 薪資計算系統相關定義 (Payroll System)
// ==========================================

export type EmploymentType = 'full_time' | 'part_time';

// ✨ 新增：員工詳細資料結構
export interface Employee {
    id: string;
    clientId: string;        // 屬於哪位客戶
    empNo: string;           // 序號(流水編號)
    employmentType: EmploymentType; // 職稱(正職或兼職)
    name: string;            // 姓名
    startDate: string;       // 到職日
    endDate: string;         // 離職日 (若無則為空字串)
    
    // 隱藏的詳細資訊
    idNumber: string;        // 身分證字號
    bankBranch: string;      // 銀行分行名稱
    bankAccount: string;     // 銀行戶頭代號
    address: string;         // 戶籍地址
    
    // 預設薪資設定
    defaultBaseSalary: number;    // 預設本薪
    defaultFoodAllowance: number; // 預設伙食費 (僅正職擁有)
    
    createdAt: string;
}

// 1. 紀錄有開通薪資計算的客戶
export interface PayrollClientConfig {
    id: string;
    clientId: string; 
    createdAt: string;
}

// 2. 薪資發放明細紀錄
export interface PayrollRecord {
    id: string;
    clientId: string;       // 屬於哪位客戶
    yearMonth: string;      // 發放年月 (例如: "2026-03")
    employeeName: string;   // 員工姓名
    
    // 加項
    baseSalary: number;     // 本薪
    foodAllowance: number;  // 伙食津貼
    overtimePay: number;    // 加班費
    bonus: number;          // 獎金/其他加項
    
    // 減項
    leaveDays: number;      // 請假天數
    leaveDeduction: number; // 請假扣薪
    laborIns: number;       // 勞保代扣
    healthIns: number;      // 健保代扣
    
    // 雇主負擔 (可能用來產出雇主報表，不扣員工薪水)
    employerPension: number;// 勞退 6%
    
    // 結算
    netPay: number;         // 實發薪資
    
    note?: string;          // 備註
    createdAt: string;
}
