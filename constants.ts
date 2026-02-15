
import { UserRole, TabCategory } from './types';
import type { User, Client, Instruction } from './types';

export const SUPERVISOR_NAME = "周愉";
export const DEFAULT_PIN = "1234";

export const USERS: User[] = [
  {
    id: 'u1',
    name: SUPERVISOR_NAME,
    role: UserRole.SUPERVISOR,
    avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=周愉&backgroundColor=ffdfbf&radius=50',
    pin: DEFAULT_PIN
  },
  {
    id: 'u2',
    name: "洪煥喆",
    role: UserRole.INTERN,
    avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=洪煥喆&backgroundColor=b6e3f4&radius=50',
    pin: DEFAULT_PIN
  },
  {
    id: 'u3',
    name: "吳東燁",
    role: UserRole.INTERN,
    avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=吳東燁&backgroundColor=c0aede&radius=50',
    pin: DEFAULT_PIN
  },
  {
    id: 'u4',
    name: "彭耀宣",
    role: UserRole.INTERN,
    avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=彭耀宣&backgroundColor=d1d4f9&radius=50',
    pin: DEFAULT_PIN
  }
];

export const MATRIX_TABS = [
  TabCategory.ACCOUNTING,
  TabCategory.TAX,
  TabCategory.INCOME_TAX,
  TabCategory.ANNUAL,
  TabCategory.SUBMISSION
];

export const TABS = [
  ...MATRIX_TABS
];

export const ACCOUNTING_SUB_ITEMS = ["入帳", "貼傳票", "鄧會覆核"];
export const TAX_SUB_ITEMS = ["憑證整理", "EXCEL", "文中", "申報", "歸檔"];

export const COLUMN_CONFIG: Record<string, string[]> = {
    [TabCategory.ACCOUNTING]: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
    [TabCategory.TAX]: ["1-2月", "3-4月", "5-6月", "7-8月", "9-10月", "11-12月"],
    [TabCategory.INCOME_TAX]: ["資料收件", "薪資", "租金", "勞務費", "捐贈", "利息", "調節表", "盈餘分配", "二代健保", "鄧會確認", "回傳客戶", "客戶確認", "申報日"],
    [TabCategory.ANNUAL]: ["結算日", "底稿", "財報", "稅報", "申報書", "鄧會確認", "回傳客戶", "客戶確認", "申報日", "營所稅款", "營所稅繳款日", "未分配盈餘稅款", "未分配盈餘繳款日"],
    [TabCategory.SUBMISSION]: ["申報收執聯", "收執E客戶", "製作財報", "寄出財報", "製作稅報", "寄出稅報", "國稅局送件"]
};

export const YEAR_OPTIONS = ["115", "116", "117"];
export const DEFAULT_YEAR = "115";

export const DUMMY_CLIENTS: Client[] = Array.from({ length: 5 }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    return {
        id: `c_${num}`,
        code: `A${num}`,
        name: `科技股份有限公司`
    };
});

export const INSTRUCTIONS: Instruction[] = [
    {
        id: 'i1',
        title: '營業稅申報作業流程',
        category: '營業稅',
        imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800',
        description: '1. 整理發票 2. 輸入申報系統 3. 產出 401 表單 4. 主管審核。'
    },
    {
        id: 'i2',
        title: '所得扣繳注意事項',
        category: '扣繳',
        imageUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=800',
        description: '注意非居住者扣繳稅率與居住者之差異，申報期限為給付日後 10 日內。'
    },
    {
        id: 'i3',
        title: '系統資料備份教學',
        category: '一般',
        imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800',
        description: '每日下班前確認 Dropbox 同步燈號為綠色。'
    }
];

export const INITIAL_TASKS = [];
