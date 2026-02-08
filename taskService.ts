
import { ClientTask, TaskStatusType, HistoryEntry, TabCategory, ClientProfile, User, CalendarEvent, Client } from '../types';
import { INITIAL_TASKS, DEFAULT_YEAR, ACCOUNTING_SUB_ITEMS, TAX_SUB_ITEMS, COLUMN_CONFIG, USERS as DEFAULT_USERS, DUMMY_CLIENTS } from '../constants';

const DB_NAME = 'ShuoyeTaskDB';
const STORE_NAME = 'file_handles';
const KEY_NAME = 'db_file_handle';
const LOCAL_STORAGE_KEY = 'shuoye_tasks_local_backup';
const CLIENT_PROFILE_KEY = 'shuoye_client_profiles'; 
const USERS_STORAGE_KEY = 'shuoye_users_v1';

let useLocalStorage = false;

// Interface for the raw file structure
interface DataStore {
    tasks: ClientTask[];
    events: CalendarEvent[];
    clients?: Client[]; // Added clients field
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

// Helper to normalize data from file (Array vs Object)
const normalizeData = (raw: any): DataStore => {
    if (Array.isArray(raw)) {
        return { tasks: raw, events: [], clients: [] };
    }
    return {
        tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
        events: Array.isArray(raw.events) ? raw.events : [],
        clients: Array.isArray(raw.clients) ? raw.clients : undefined // Leave undefined to trigger fallback if needed
    };
};

export const TaskService = {
  isUsingLocalStorage(): boolean {
    return useLocalStorage;
  },

  // --- User Management ---
  getUsers(): User[] {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (stored) {
          try {
              return JSON.parse(stored);
          } catch (e) {
              return DEFAULT_USERS;
          }
      }
      return DEFAULT_USERS;
  },

  saveUsers(users: User[]): void {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  },

  // --- Database Connection ---
  async connectDatabase(): Promise<boolean> {
    try {
      if (typeof (window as any).showOpenFilePicker !== 'function') {
        throw new Error('API_NOT_SUPPORTED');
      }
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{ description: 'JSON Database', accept: { 'application/json': ['.json'] } }],
        multiple: false,
      });
      fileHandle = handle;
      useLocalStorage = false;
      await storeHandle(handle);
      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') return false;
      useLocalStorage = true;
      fileHandle = null;
      return true;
    }
  },

  async restoreConnection(triggerPrompt: boolean = false): Promise<'connected' | 'permission_needed' | 'failed'> {
    try {
      const handle = await getStoredHandle();
      if (!handle) return 'failed';
      
      const options = { mode: 'readwrite' as any };
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
    } catch (error) { return 'failed'; }
  },

  isConnected(): boolean { return fileHandle !== null || useLocalStorage; },

  // --- Low Level File I/O ---
  async loadFullData(): Promise<DataStore> {
      if (useLocalStorage) {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          return stored ? normalizeData(JSON.parse(stored)) : { tasks: INITIAL_TASKS, events: [], clients: [] };
      }
      if (!fileHandle) return { tasks: [], events: [], clients: [] };
      try {
          const file = await fileHandle.getFile();
          const text = await file.text();
          return text.trim() ? normalizeData(JSON.parse(text)) : { tasks: INITIAL_TASKS, events: [], clients: [] };
      } catch (error) {
          throw new Error("讀取檔案失敗");
      }
  },

  async saveFullData(data: DataStore): Promise<void> {
      if (useLocalStorage) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data, null, 2));
          return;
      }
      if (!fileHandle) throw new Error("尚未連線至資料庫檔案");
      try {
          const writable = await fileHandle.createWritable();
          await writable.write(JSON.stringify(data, null, 2));
          await writable.close();
      } catch (error) {
          throw new Error("寫入失敗");
      }
  },

  // --- Client Management API ---
  async fetchClients(): Promise<Client[]> {
      const data = await this.loadFullData();
      // If clients is undefined in JSON, fallback to DUMMY_CLIENTS for initialization, 
      // but once saved it will be an array (even if empty).
      if (data.clients === undefined) {
          return DUMMY_CLIENTS;
      }
      return data.clients;
  },

  async saveClients(clients: Client[]): Promise<void> {
      const currentData = await this.loadFullData();
      await this.saveFullData({ ...currentData, clients });
  },

  // --- Tasks API ---
  async fetchTasks(): Promise<ClientTask[]> {
    const data = await this.loadFullData();
    const rawTasks = data.tasks;
    return rawTasks.map((t: any) => {
        let cat = t.category;
        if (cat === '入帳') cat = TabCategory.ACCOUNTING;
        if (cat === '所得/扣繳') cat = '所得扣繳';

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

  // --- Calendar Events API ---
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

  // --- Client Profile API ---
  getClientProfile(clientId: string): ClientProfile {
      const stored = localStorage.getItem(CLIENT_PROFILE_KEY);
      const profiles: Record<string, ClientProfile> = stored ? JSON.parse(stored) : {};
      return profiles[clientId] || { clientId, specialNotes: "", accountingNotes: "", tags: [] };
  },

  saveClientProfile(profile: ClientProfile): void {
      const stored = localStorage.getItem(CLIENT_PROFILE_KEY);
      const profiles: Record<string, ClientProfile> = stored ? JSON.parse(stored) : {};
      profiles[profile.clientId] = profile;
      localStorage.setItem(CLIENT_PROFILE_KEY, JSON.stringify(profiles));
  },

  // --- Task Operations ---
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
  }
};

let fileHandle: FileSystemFileHandle | null = null;
