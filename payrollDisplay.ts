import { Employee } from './types';
import { periods, validDate } from './functions/src/payrollDomain';

export function taiwanToday(now = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function isEmployeeResigned(employee: Employee, today = taiwanToday()): boolean {
  const started = periods(employee).filter(p => p.startDate <= today);
  return started.length > 0 && started.every(p => !!p.endDate && p.endDate < today);
}

const importDate = (value: any): string => {
  if (!value) return '';
  if (value instanceof Date) return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const text = String(value).trim().replace(/\//g, '-');
  const parts = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  return parts ? `${parts[1]}-${parts[2].padStart(2, '0')}-${parts[3].padStart(2, '0')}` : text;
};

export type EmployeeImportResult = { ready: Employee[]; duplicates: string[]; errors: string[] };
// Columns: 序號、身分、姓名、信箱、到職日、離職日、身分證、分行、帳號、地址. The first row is the header.
export function parseEmployeeImport(rows: any[][], existing: Employee[], clientId: string, makeId: () => string): EmployeeImportResult {
  const seen = new Set<string>();
  for (const e of existing.filter(e => e.clientId === clientId)) {
    if (e.idNumber) seen.add('id:' + e.idNumber.trim().toUpperCase());
    seen.add('name:' + e.name + '|' + e.startDate);
  }
  const result: EmployeeImportResult = { ready: [], duplicates: [], errors: [] };
  rows.slice(1).forEach((row, index) => {
    if (!row || row.every(cell => cell === undefined || cell === null || String(cell).trim() === '')) return;
    const label = '第 ' + (index + 2) + ' 列';
    const name = String(row[2] || '').trim();
    const typeText = String(row[1] || '').trim();
    const email = String(row[3] || '').trim();
    const startDate = importDate(row[4]);
    const endDate = importDate(row[5]);
    const idNumber = String(row[6] || '').trim().toUpperCase();
    const issues: string[] = [];
    if (!name) issues.push('缺少姓名');
    if (!validDate(startDate)) issues.push('到職日缺少或格式不正確');
    if (endDate && (!validDate(endDate) || endDate < startDate)) issues.push('離職日格式不正確或早於到職日');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issues.push('信箱格式不正確');
    if (issues.length) { result.errors.push(label + (name ? '（' + name + '）' : '') + '：' + issues.join('、')); return; }
    const key = idNumber ? 'id:' + idNumber : 'name:' + name + '|' + startDate;
    if (seen.has(key)) { result.duplicates.push(label + '（' + name + '）'); return; }
    seen.add(key);
    seen.add('name:' + name + '|' + startDate);
    const employmentType = typeText.includes('兼職') || typeText.toUpperCase() === 'PART_TIME' ? 'part_time' : 'full_time';
    result.ready.push({ id: makeId(), clientId, empNo: String(row[0] || '').trim(), employmentType, name, email, startDate, endDate, idNumber, bankBranch: String(row[7] || '').trim(), bankAccount: String(row[8] || '').trim(), address: String(row[9] || '').trim(), defaultBaseSalary: 0, defaultFoodAllowance: 0, insuranceBracket: 0, hasLaborIns: true, hasHealthIns: true, createdAt: new Date().toISOString(), employmentHistory: [{ id: makeId(), type: employmentType, startDate, endDate: endDate || null }], compensationHistory: [] });
  });
  return result;
}

export function insuranceLabel(basis: { hasLaborIns: boolean; hasHealthIns: boolean; insuranceBracket: number }): string {
  const types = [basis.hasLaborIns ? '勞' : '', basis.hasHealthIns ? '健' : ''].join('');
  return types ? basis.insuranceBracket.toLocaleString() + ' (' + types + ')' : '未投保';
}
