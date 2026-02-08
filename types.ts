
export enum UserRole {
  SUPERVISOR = 'supervisor',
  INTERN = 'intern'
}

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
  history?: HistoryEntry[]; // New: Track changes
}

// Calendar Types
export type EventType = 'shift' | 'reminder';

export interface CalendarEvent {
    id: string;
    date: string; // YYYY-MM-DD
    type: EventType;
    title: string;
    description?: string;
    ownerId: string; // The person this event belongs to (Assignee for shift, Creator for reminder)
    ownerName: string;
    creatorId: string; // The person who created this
    createdAt: string;
}

export interface Client {
    id: string;
    code: string;
    name: string;
}

// 新增：客戶詳細檔案
export interface ClientProfile {
    clientId: string;
    specialNotes: string;    // 特殊注意事項 (紅色警報區 - 行政/習慣)
    accountingNotes: string; // 入帳注意事項 (藍色工作區 - 帳務/稅務)
    tags?: string[];         // 標籤
}

export interface Instruction {
    id: string;
    title: string;
    category: string;
    imageUrl: string;
    description: string;
}

export enum TabCategory {
  WORK_LIST = "工作清單",
  CALENDAR = "行事曆",
  ACCOUNTING = "帳務處理",
  TAX = "營業稅申報",
  INCOME_TAX = "所得扣繳",
  ANNUAL = "年度申報",
  SUBMISSION = "送件"
}
