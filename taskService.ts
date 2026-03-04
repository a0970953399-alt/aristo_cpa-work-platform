
import { TabCategory } from './types';
import type { ClientTask, TaskStatusType, HistoryEntry, ClientProfile, User, CalendarEvent, Client } from './types';
import { INITIAL_TASKS, DEFAULT_YEAR, USERS as DEFAULT_USERS, DUMMY_CLIENTS, INSTRUCTIONS } from './constants';
import { StockClientConfig, StockTarget, StockTransaction } from './types';

const DB_NAME = 'ShuoyeTaskDB';
const STORE_NAME = 'file_handles';
const KEY_NAME = 'db_file_handle';
const LOCAL_STORAGE_KEY = 'shuoye_tasks_local_backup';
const CLIENT_PROFILE_KEY = 'shuoye_client_profiles'; 
const USERS_STORAGE_KEY = 'shuoye_users_v1';

let useLocalStorage = false;
let fileHandle: FileSystemFileHandle | null = null;

// Cache variables to prevent unnecessary parsing
let cachedData: DataStore | null = null;
let lastFileModifiedTime: number = 0;

interface DataStore {
    tasks: ClientTask[];
    events: CalendarEvent[];
    clients?: Client[];
    clientProfiles?: ClientProfile[];
    checkIns?: CheckInRecord[];
    messages?: Message[];
    mailRecords?: MailRecord[];
    cashRecords?: CashRecord[];
    instructions?: Instruction[];
}

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const storeHandle = async (handle: FileSystemFileHandle) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(handle, KEY_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

const getStoredHandle = async (): Promise<FileSystemFileHandle | undefined> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(KEY_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

const normalizeData = (raw: any): DataStore => {
    if (!raw) return { tasks: [], events: [], clients: [] };
    if (Array.isArray(raw)) {
        return { tasks: raw, events: [], clients: [] };
    }
    return {
        tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
        events: Array.isArray(raw.events) ? raw.events : [],
        clients: Array.isArray(raw.clients) ? raw.clients : undefined,
        clientProfiles: Array.isArray(raw.clientProfiles) ? raw.clientProfiles : [],
        checkIns: Array.isArray(raw.checkIns) ? raw.checkIns : [],
        messages: Array.isArray(raw.messages) ? raw.messages : [],
        mailRecords: Array.isArray(raw.mailRecords) ? raw.mailRecords : [],
        cashRecords: Array.isArray(raw.cashRecords) ? raw.cashRecords : [],
        instructions: Array.isArray(raw.instructions) ? raw.instructions : []

    };
};

export const TaskService = {
  isUsingLocalStorage(): boolean {
    return useLocalStorage;
  },
    
    getUsers: (): User[] => {
      const cached = localStorage.getItem(USERS_STORAGE_KEY);
      if (cached) {
          let parsedUsers: User[] = JSON.parse(cached);
          
          // ✨ B 方案防呆邏輯：檢查快取中是否缺少 constants.ts 裡定義的人（例如新加的 Brandon）
          let hasNewUser = false;
          
          // 這裡的 DEFAULT_USERS 是從 constants.ts import 進來的 USERS
          DEFAULT_USERS.forEach(defaultUser => {
              const userExists = parsedUsers.find(u => u.id === defaultUser.id);
              if (!userExists) {
                  // 發現快取裡沒有這個人 (例如 u0 的 Brandon)
                  // 因為你想讓他排在第一位，所以我們用 unshift 把他插隊到陣列最前面
                  parsedUsers.unshift(defaultUser);
                  hasNewUser = true;
              }
          });

          // 如果有發現新名單並加入，就立刻更新瀏覽器的快取
          if (hasNewUser) {
              localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedUsers));
          }

          return parsedUsers;
      }
        // 如果完全沒有快取（例如第一次使用），就直接寫入預設名單
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS;
    },

  saveUsers(users: User[]): void {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  },

  async connectDatabase(): Promise<boolean> {
    // Check if API is supported
    if (typeof (window as any).showOpenFilePicker !== 'function') {
      console.warn("FileSystem Access API not supported. Falling back to LocalStorage.");
      useLocalStorage = true;
      return true; // Return true so the app loads in "offline/local" mode
    }

    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{ description: 'JSON Database', accept: { 'application/json': ['.json'] } }],
        multiple: false,
      });
      fileHandle = handle;
      useLocalStorage = false;
      cachedData = null; // Clear cache on new connection
      lastFileModifiedTime = 0;
      await storeHandle(handle);
      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') return false;
      // Fallback if something else goes wrong
      useLocalStorage = true;
      fileHandle = null;
      return true;
    }
  },

  async restoreConnection(triggerPrompt: boolean = false): Promise<'connected' | 'permission_needed' | 'failed'> {
    // If API not supported, assume connected via LocalStorage
    if (typeof (window as any).showOpenFilePicker !== 'function') {
        useLocalStorage = true;
        return 'connected';
    }

    try {
      const handle = await getStoredHandle();
      if (!handle) return 'failed';
      
      const options = { mode: 'readwrite' as any };
      // Check permission
      let permissionState = await (handle as any).queryPermission(options);
      
      if (permissionState === 'granted') {
        fileHandle = handle;
        useLocalStorage = false;
        return 'connected';
      }
      
      if (triggerPrompt) {
        const requestState = await (handle as any).requestPermission(options);
        if (requestState === 'granted') {
          fileHandle = handle;
          useLocalStorage = false;
          return 'connected';
        }
      }
      return 'permission_needed';
    } catch (error) { 
        console.error("Restore connection failed:", error);
        return 'failed'; 
    }
  },

  isConnected(): boolean { return fileHandle !== null || useLocalStorage; },

  async loadFullData(): Promise<DataStore> {
      // 1. LocalStorage Mode
      if (useLocalStorage) {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          // Simple caching for local storage isn't strictly necessary but good for consistency
          const parsed = stored ? normalizeData(JSON.parse(stored)) : { tasks: INITIAL_TASKS, events: [], clients: [] };
          // For local storage, we can essentially always return the parsed data.
          // In a real app, we might check if localStorage string changed, but it's fast enough.
          cachedData = parsed;
          return parsed;
      }

      // 2. File System Mode
      if (!fileHandle) return { tasks: [], events: [], clients: [] };

      try {
          const file = await fileHandle.getFile();
          
          // CRITICAL OPTIMIZATION: Check last modified time
          // If the file hasn't changed since we last read it, return the cached object.
          // This prevents React from re-rendering because the object reference stays the same.
          if (cachedData && file.lastModified === lastFileModifiedTime) {
              return cachedData;
          }

          const text = await file.text();
          const parsed = text.trim() ? normalizeData(JSON.parse(text)) : { tasks: INITIAL_TASKS, events: [], clients: [] };
          
          // Update cache
          cachedData = parsed;
          lastFileModifiedTime = file.lastModified;
          
          return parsed;
      } catch (error) {
          console.error("Load data failed:", error);
          throw new Error("讀取檔案失敗");
      }
  },

  async saveFullData(data: DataStore): Promise<void> {
      // Update the cache immediately so the UI reflects changes before the next poll
      // (Optimistic update for the local session)
      cachedData = data; 
      
      if (useLocalStorage) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data, null, 2));
          return;
      }
      
      if (!fileHandle) throw new Error("尚未連線至資料庫檔案");
      
      try {
          const writable = await fileHandle.createWritable();
          await writable.write(JSON.stringify(data, null, 2));
          await writable.close();
          
          // After writing, the file's lastModified time changes on disk.
          // We need to update our tracker so the next poll doesn't think it's an external change.
          // However, we can't easily predict the exact OS timestamp.
          // So we reset the timestamp to 0 to force a re-read on the next poll to ensure consistency.
          lastFileModifiedTime = 0; 
      } catch (error) {
          console.error("Save data failed:", error);
          throw new Error("寫入失敗");
      }
  },

  // --- API Methods ---

async fetchClients(): Promise<Client[]> {
      const data = await this.loadFullData();
      const clients = data.clients || DUMMY_CLIENTS;
      
      // 使用 [...clients] 建立副本，確保不會因為唯讀屬性而排序失敗
      // 這裡強制依照 code (A01, A02...) 進行排序
      return [...clients].sort((a, b) => {
          const codeA = a.code || '';
          const codeB = b.code || '';
          return codeA.localeCompare(codeB, 'zh-Hant', { numeric: true });
      });
},

  async saveClients(clients: Client[]): Promise<void> {
      // Use loadFullData to ensure we have the latest OTHER data (tasks, events)
      // Note: If loadFullData hits cache, it's fast.
      const currentData = await this.loadFullData(); 
      await this.saveFullData({ ...currentData, clients });
  },

  async fetchTasks(): Promise<ClientTask[]> {
      const data = await this.loadFullData();
      const rawTasks = data.tasks;
      // We map here to ensure data integrity, but if data.tasks is essentially the same,
      // we might want to memoize this too. For now, rely on loadFullData caching.
      return rawTasks.map((t: any) => {
          let cat = t.category;
          // Legacy support
          if (cat === '入帳') cat = TabCategory.ACCOUNTING;
          if (cat === '所得/扣繳') cat = TabCategory.INCOME_TAX;

          return {
              ...t,
              id: String(t.id),
              status: (t.status === 'completed' || t.status === 'pending') ? (t.status === 'completed' ? 'done' : 'todo') : t.status || 'todo',
              workItem: t.workItem || '',
              category: cat,
              year: t.year || DEFAULT_YEAR,
              isNA: t.isNA || false,
              isMisc: t.isMisc || false,
              assigneeId: t.assigneeId || '',
              assigneeName: t.assigneeName || '',
              completionDate: t.completionDate || '',
              history: t.history || []
          };
      });
  },

  async saveTasks(tasks: ClientTask[]): Promise<void> {
      const currentData = await this.loadFullData();
      await this.saveFullData({ ...currentData, tasks });
  },

  async fetchEvents(): Promise<CalendarEvent[]> {
      const data = await this.loadFullData();
      return data.events || [];
  },

  async saveEvents(events: CalendarEvent[]): Promise<void> {
      const currentData = await this.loadFullData();
      await this.saveFullData({ ...currentData, events });
  },

  async addEvent(event: CalendarEvent): Promise<CalendarEvent[]> {
      const events = await this.fetchEvents();
      const newEvents = [...events, event];
      await this.saveEvents(newEvents);
      return newEvents;
  },

  async updateEvent(updatedEvent: CalendarEvent): Promise<CalendarEvent[]> {
      const events = await this.fetchEvents();
      const newEvents = events.map(e => e.id === updatedEvent.id ? updatedEvent : e);
      await this.saveEvents(newEvents);
      return newEvents;
  },

  async deleteEvent(eventId: string): Promise<CalendarEvent[]> {
      const events = await this.fetchEvents();
      const newEvents = events.filter(e => e.id !== eventId);
      await this.saveEvents(newEvents);
      return newEvents;
  },

  getClientProfile(clientId: string): ClientProfile {
      // 1. 先從快取資料 (cachedData) 裡面找
      if (cachedData && cachedData.clientProfiles) {
          const found = cachedData.clientProfiles.find(p => p.clientId === clientId);
          if (found) return found;
      }
      // 2. 找不到就回傳空的預設值
      return { clientId, specialNotes: "", accountingNotes: "", tags: [] };
  },

  async saveClientProfile(profile: ClientProfile): Promise<void> {
      // 1. 讀取目前的完整資料
      const currentData = await this.loadFullData();
      
      // 2. 確保陣列存在
      if (!currentData.clientProfiles) {
          currentData.clientProfiles = [];
      }

      // 3. 更新或新增這筆備註
      const index = currentData.clientProfiles.findIndex(p => p.clientId === profile.clientId);
      if (index >= 0) {
          currentData.clientProfiles[index] = profile;
      } else {
          currentData.clientProfiles.push(profile);
      }

      // 4. ✨ 呼叫你原本就有的 saveFullData 寫入檔案
      await this.saveFullData(currentData);
  },

  async addTask(task: ClientTask): Promise<ClientTask[]> {
    const currentTasks = await this.fetchTasks();
    let existingIndex = -1;
    if (!task.isMisc) {
        existingIndex = currentTasks.findIndex(t => t.clientId === task.clientId && t.category === task.category && t.workItem === task.workItem && t.year === task.year);
    } else {
        existingIndex = currentTasks.findIndex(t => t.id === task.id);
    }

    const historyEntry: HistoryEntry = {
        timestamp: new Date().toISOString(),
        userName: task.lastUpdatedBy,
        action: existingIndex >= 0 ? "更新派案/備註" : "初始派案",
        details: task.isNA ? "標記為 N/A" : `指派給: ${task.assigneeName || '無'}`
    };

    let newTasks;
    if (existingIndex >= 0) {
        newTasks = [...currentTasks];
        const oldHistory = newTasks[existingIndex].history || [];
        newTasks[existingIndex] = { ...task, history: [historyEntry, ...oldHistory].slice(0, 20) };
    } else {
        newTasks = [{ ...task, history: [historyEntry] }, ...currentTasks];
    }
    await this.saveTasks(newTasks);
    return newTasks;
  },

  async deleteTask(taskId: string): Promise<ClientTask[]> {
    const currentTasks = await this.fetchTasks();
    const newTasks = currentTasks.filter(t => String(t.id) !== String(taskId));
    await this.saveTasks(newTasks);
    return newTasks;
  },

  async updateTaskStatus(taskId: string, status: TaskStatusType, user: string, completionDate?: string): Promise<ClientTask[]> {
    const currentTasks = await this.fetchTasks();
    const newTasks = currentTasks.map(t => {
      if (String(t.id) === String(taskId)) {
        const historyEntry: HistoryEntry = {
            timestamp: new Date().toISOString(),
            userName: user,
            action: `更改狀態至 ${status}`,
            details: completionDate ? `完成日期: ${completionDate}` : undefined
        };
        return {
          ...t,
          status: status,
          completionDate: completionDate !== undefined ? completionDate : t.completionDate,
          lastUpdatedBy: user,
          lastUpdatedAt: new Date().toISOString(),
          history: [historyEntry, ...(t.history || [])].slice(0, 20)
        };
      }
      return t;
    });
    await this.saveTasks(newTasks);
    return newTasks;
  },

  async updateTaskNote(taskId: string, note: string, user: string): Promise<ClientTask[]> {
    const currentTasks = await this.fetchTasks();
    const newTasks = currentTasks.map(t => {
      if (String(t.id) === String(taskId)) {
        const historyEntry: HistoryEntry = {
            timestamp: new Date().toISOString(),
            userName: user,
            action: "更新備註",
            details: note.substring(0, 20) + (note.length > 20 ? "..." : "")
        };
        return {
          ...t,
          note: note,
          lastUpdatedBy: user,
          lastUpdatedAt: new Date().toISOString(),
          history: [historyEntry, ...(t.history || [])].slice(0, 20)
        };
      }
      return t;
    });
    await this.saveTasks(newTasks);
    return newTasks;
  },

// --- 打卡系統相關 API ---

  async fetchCheckIns(): Promise<CheckInRecord[]> {
      const data = await this.loadFullData();
      return data.checkIns || [];
  },

  async addCheckIn(record: CheckInRecord): Promise<CheckInRecord[]> {
      const currentData = await this.loadFullData();
      if (!currentData.checkIns) currentData.checkIns = [];
      
      currentData.checkIns.push(record);
      await this.saveFullData(currentData);
      return currentData.checkIns;
  },

  async updateCheckIn(updatedRecord: CheckInRecord): Promise<CheckInRecord[]> {
      const currentData = await this.loadFullData();
      if (!currentData.checkIns) currentData.checkIns = [];
      
      const index = currentData.checkIns.findIndex(r => r.id === updatedRecord.id);
      if (index >= 0) {
          currentData.checkIns[index] = updatedRecord;
      }
      await this.saveFullData(currentData);
      return currentData.checkIns;
  },
  
  // 刪除打卡紀錄 (主管補救用)
  async deleteCheckIn(recordId: string): Promise<CheckInRecord[]> {
      const currentData = await this.loadFullData();
      if (!currentData.checkIns) return [];
      
      currentData.checkIns = currentData.checkIns.filter(r => r.id !== recordId);
      await this.saveFullData(currentData);
      return currentData.checkIns;
  },    

// --- 留言板 API ---

  async fetchMessages(): Promise<Message[]> {
      const data = await this.loadFullData();
      return data.messages || [];
  },

  async addMessage(msg: Message): Promise<Message[]> {
      const data = await this.loadFullData();
      if (!data.messages) data.messages = [];
      data.messages.push(msg);
      await this.saveFullData(data);
      return data.messages;
  },

  async deleteMessage(msgId: string): Promise<Message[]> {
      const data = await this.loadFullData();
      if (!data.messages) return [];
      data.messages = data.messages.filter(m => m.id !== msgId);
      await this.saveFullData(data);
      return data.messages;
  },

// --- 📦 收發信件 API ---

  async fetchMailRecords(): Promise<MailRecord[]> {
      const data = await this.loadFullData();
      return data.mailRecords || [];
  },

  async addMailRecord(record: MailRecord): Promise<MailRecord[]> {
      const data = await this.loadFullData();
      if (!data.mailRecords) data.mailRecords = [];
      data.mailRecords.push(record);
      await this.saveFullData(data);
      return data.mailRecords;
  },

  // 批次匯入用
  async addMailRecordsBatch(records: MailRecord[]): Promise<MailRecord[]> {
      const data = await this.loadFullData();
      if (!data.mailRecords) data.mailRecords = [];
      data.mailRecords = [...data.mailRecords, ...records]; // 追加模式
      await this.saveFullData(data);
      return data.mailRecords;
  },

  async updateMailRecord(updated: MailRecord): Promise<MailRecord[]> {
      const data = await this.loadFullData();
      if (!data.mailRecords) return [];
      const idx = data.mailRecords.findIndex(r => r.id === updated.id);
      if (idx !== -1) {
          data.mailRecords[idx] = updated;
          await this.saveFullData(data);
      }
      return data.mailRecords;
  },

  async deleteMailRecord(id: string): Promise<MailRecord[]> {
      const data = await this.loadFullData();
      if (!data.mailRecords) return [];
      data.mailRecords = data.mailRecords.filter(r => r.id !== id);
      await this.saveFullData(data);
      return data.mailRecords;
},

// --- 💰 零用金/代墊款 API ---

  async fetchCashRecords(): Promise<CashRecord[]> {
      const data = await this.loadFullData();
      return data.cashRecords || [];
  },

  async addCashRecord(record: CashRecord): Promise<CashRecord[]> {
      const data = await this.loadFullData();
      if (!data.cashRecords) data.cashRecords = [];
      data.cashRecords.push(record);
      await this.saveFullData(data);
      return data.cashRecords;
  },

  async updateCashRecord(updated: CashRecord): Promise<CashRecord[]> {
      const data = await this.loadFullData();
      if (!data.cashRecords) return [];
      const idx = data.cashRecords.findIndex(r => r.id === updated.id);
      if (idx !== -1) {
          data.cashRecords[idx] = updated;
          await this.saveFullData(data);
      }
      return data.cashRecords;
  },

  async deleteCashRecord(id: string): Promise<CashRecord[]> {
      const data = await this.loadFullData();
      if (!data.cashRecords) return [];
      data.cashRecords = data.cashRecords.filter(r => r.id !== id);
      await this.saveFullData(data);
      return data.cashRecords;
  },

  async fetchInstructions(): Promise<Instruction[]> {
      const data = await this.loadFullData();
      // ✨ 拿掉 INSTRUCTIONS 預設值，如果是空的就乖乖回傳空陣列
      return data.instructions || [];
  },

  async addInstruction(instruction: Instruction): Promise<Instruction[]> {
      const data = await this.loadFullData();
      if (!data.instructions) data.instructions = []; // ✨ 改為空陣列
      data.instructions.push(instruction);
      await this.saveFullData(data);
      return data.instructions;
  },

  async updateInstruction(updated: Instruction): Promise<Instruction[]> {
      const data = await this.loadFullData();
      if (!data.instructions) data.instructions = []; // ✨ 改為空陣列
      const idx = data.instructions.findIndex(i => i.id === updated.id);
      if (idx !== -1) {
          data.instructions[idx] = updated;
          await this.saveFullData(data);
      }
      return data.instructions;
  },

  async deleteInstruction(id: string): Promise<Instruction[]> {
      const data = await this.loadFullData();
      if (!data.instructions) data.instructions = []; // ✨ 改為空陣列
      data.instructions = data.instructions.filter(i => i.id !== id);
      await this.saveFullData(data);
      return data.instructions;
  }

    // ==========================================
    // 📊 股票進銷存系統 (Stock Inventory)
    // ==========================================

    // 1. 取得已開通的客戶名單
    static async fetchStockClients(): Promise<StockClientConfig[]> {
        try {
            const url = `${this.getBaseUrl()}/stockClients`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
        } catch (error) {
            console.error("Error fetching stock clients:", error);
            return [];
        }
    }

    // 2. 開通新客戶 (新增)
    static async addStockClient(config: StockClientConfig): Promise<StockClientConfig[]> {
        const url = `${this.getBaseUrl()}/stockClients`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        return this.fetchStockClients();
    }

    // 3. 關閉客戶 (刪除)
    static async deleteStockClient(id: string): Promise<StockClientConfig[]> {
        const url = `${this.getBaseUrl()}/stockClients/${id}`;
        await fetch(url, { method: 'DELETE' });
        return this.fetchStockClients();
    }

    // 4. 取得所有股票標的
    static async fetchStockTargets(): Promise<StockTarget[]> {
        try {
            const url = `${this.getBaseUrl()}/stockTargets`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
        } catch (error) {
            console.error("Error fetching stock targets:", error);
            return [];
        }
    }

    // 5. 新增股票標的
    static async addStockTarget(target: StockTarget): Promise<StockTarget[]> {
        const url = `${this.getBaseUrl()}/stockTargets`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(target)
        });
        return this.fetchStockTargets();
    }

    // 6. 刪除股票標的
    static async deleteStockTarget(id: string): Promise<StockTarget[]> {
        const url = `${this.getBaseUrl()}/stockTargets/${id}`;
        await fetch(url, { method: 'DELETE' });
        return this.fetchStockTargets();
    }
    
    // 7. 取得交易紀錄 (為第三層準備)
    static async fetchStockTransactions(): Promise<StockTransaction[]> {
        try {
            const url = `${this.getBaseUrl()}/stockTransactions`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
        } catch (error) {
            console.error("Error fetching transactions:", error);
            return [];
        }
    }

} // ✅ 整個 TaskService 類別的結尾大括號！整份檔案的最後一個字必須是它！
