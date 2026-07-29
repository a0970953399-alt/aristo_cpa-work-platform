import { TabCategory, UserRole } from './types';
import type { PlatformPermissions, User } from './types';

export type PlatformPermissionKey = keyof PlatformPermissions;

export const EXTRA_PERMISSION_OPTIONS: Array<{
  key: PlatformPermissionKey;
  label: string;
  description: string;
}> = [
  { key: 'clientTasks', label: '客戶事務矩陣', description: '可查看與更新帳務、稅務、送件等進度' },
  { key: 'clientData', label: '客戶主檔', description: '可開啟並維護客戶基本資料' },
  { key: 'cash', label: '零用金 / 代墊款', description: '可操作事務所零用金與客戶代墊款' },
  { key: 'mail', label: '收發信件', description: '可查看與登錄收發信件紀錄' },
  { key: 'payroll', label: '薪資資料', description: '可進入薪資計算模組' },
  { key: 'manageTimesheets', label: '管理工時', description: '可查看、修改、刪除全部人員工時' },
  { key: 'canDeleteRecords', label: '刪除正式資料', description: '可執行高風險刪除操作' },
];

export const isPrivilegedRole = (user: User) =>
  user.role === UserRole.BOSS || user.role === UserRole.SUPERVISOR;

export const hasPlatformPermission = (user: User, permission: PlatformPermissionKey) => {
  if (isPrivilegedRole(user)) return true;
  if (permission === 'clientTasks') {
    return user.role === UserRole.INTERN || user.permissions?.clientTasks === true;
  }
  return user.permissions?.[permission] === true;
};

export const getNormalizedPermissions = (user: User): PlatformPermissions => ({
  clientTasks: hasPlatformPermission(user, 'clientTasks'),
  clientData: hasPlatformPermission(user, 'clientData'),
  cash: hasPlatformPermission(user, 'cash'),
  mail: hasPlatformPermission(user, 'mail'),
  payroll: hasPlatformPermission(user, 'payroll'),
  manageTimesheets: hasPlatformPermission(user, 'manageTimesheets'),
  canDeleteRecords: hasPlatformPermission(user, 'canDeleteRecords'),
});

export const canAccessTab = (user: User, tab: TabCategory | string) => {
  if ([
    TabCategory.ACCOUNTING,
    TabCategory.TAX,
    TabCategory.INCOME_TAX,
    TabCategory.ANNUAL,
    TabCategory.SUBMISSION,
  ].includes(tab)) {
    return hasPlatformPermission(user, 'clientTasks');
  }

  if (tab === '收發信件') return hasPlatformPermission(user, 'mail');
  if (tab === TabCategory.CASH) return hasPlatformPermission(user, 'cash');
  if (tab === TabCategory.PAYROLL) return hasPlatformPermission(user, 'payroll');
  if (tab === TabCategory.STOCK) return isPrivilegedRole(user);
  return false;
};
