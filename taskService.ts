
import { TabCategory } from './types';
import type { ClientTask, TaskStatusType, HistoryEntry, ClientProfile, User, CalendarEvent, Client } from './types';
import { INITIAL_TASKS, DEFAULT_YEAR, USERS as DEFAULT_USERS, DUMMY_CLIENTS } from './constants';

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
        clientProfiles: Array.isArray(raw.clientProfiles) ? raw.clientProfiles : []
    };
};

export const TaskService = {
  isUsingLocalStorage(): boolean {
    return useLocalStorage;
  },

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
      return data.clients || DUMMY_CLIENTS;
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

  saveClientProfile(profile: ClientProfile): Promise<void> {
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
  }
};
