
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
    feeMonthly?: string; // 每月公費
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
  SUBMISSION: "送件"
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
