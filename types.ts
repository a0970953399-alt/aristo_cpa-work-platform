
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

export interface ClientProfile {
    clientId: string;
    specialNotes: string;
    accountingNotes: string;
    tags?: string[];
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
