// The single source for "what is on the payroll this month": the month table, yearly ledger, Excel export and batch send all read from here.
import type { Client, Employee, MonthlySalaryRecord } from './types';
import { Slip, Values, amountFields, attendanceFields, automaticPayrollIssue, basisAt, calculate, currentPayrollMonth, isFullMonth, defaultBaseSalary, defaultFoodAllowance, emptyValues, isEffectivePayroll, legacyAmounts, legacyIssues, legacyNeedsEnrollment, monthEnd, periods, recurringPayroll, totals } from './functions/src/payrollDomain';
import { sortEmployees } from './payrollDisplay';

export type PayrollRow = Employee & { sourceEmployeeId: string; slip?: Slip; legacyRecord?: MonthlySalaryRecord; periodId?: string; recommendedStart?: string; recommendedEnd?: string; warning?: string; reason?: string; excluded?: boolean };
export const HIDDEN_LEGACY_MESSAGE = '這個月有暫藏的舊薪資，請先核對';
export type PayrollSource = { client: Client | null; employees: Employee[]; legacy: MonthlySalaryRecord[]; slips: Slip[]; hiddenLegacy: Array<{ employeeId: string; month: string }> };

function alias(e: Employee, id: string, type: string, start: string, end: string | null): PayrollRow {
  return { ...e, id, sourceEmployeeId: e.id, employmentType: type as any, startDate: start, endDate: end || '', employmentHistory: [{ id, type: type as any, startDate: start, endDate: end }] };
}
const nextDay = (d: string, offset: number) => { const date = new Date(d + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); };

export function buildMonthRows(m: string, { client, employees, legacy, slips, hiddenLegacy }: PayrollSource, currentMonth = currentPayrollMonth()): PayrollRow[] {
  const rows: PayrollRow[] = [];
  for (const e of sortEmployees(employees)) {
    const olds = legacy.filter(r => r.employeeId === e.id && r.month === m);
    const ss = slips.filter(s => s.employeeId === e.id && s.month === m && s.status !== 'void' && s.status !== 'superseded').sort((a, b) => a.periodStart.localeCompare(b.periodStart) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    for (const r of olds) rows.push({ ...e, id: 'old:' + r.id, sourceEmployeeId: e.id, legacyRecord: r, warning: legacyIssues(r, legacy, employees).join('；'), excluded: legacyIssues(r, legacy, employees).length > 0 || legacyNeedsEnrollment(r, employees, slips, legacy) });
    for (const s of ss) rows.push({ ...alias(e, s.id, s.basis.employmentType, periods(e).find(p => p.id === s.employmentId)?.startDate || e.startDate, periods(e).find(p => p.id === s.employmentId)?.endDate || null), name: s.employee.name, empNo: s.employee.empNo, email: s.employee.email, idNumber: s.employee.idNumber || '', bankAccount: s.employee.bankAccount || '', defaultBaseSalary: s.basis.baseSalary, defaultFoodAllowance: s.basis.foodAllowance, compensationHistory: [], slip: s, excluded: !isEffectivePayroll(s, e, slips, legacy) });
    if (olds.length) continue;
    const reservedByHidden = hiddenLegacy.some(r => r.employeeId === e.id && r.month === m);
    for (const p of periods(e).filter(p => p.startDate <= monthEnd(m) && (!p.endDate || p.endDate >= m + '-01'))) {
      const start = p.startDate > m + '-01' ? p.startDate : m + '-01'; const end = p.endDate && p.endDate < monthEnd(m) ? p.endDate : monthEnd(m);
      const cuts = [...new Set([start, ...(e.compensationHistory || []).map(c => c.effectiveDate).filter(d => d > start && d <= end)])].sort();
      for (let i = 0; i < cuts.length; i++) {
        let gaps = [{ start: cuts[i], end: i + 1 < cuts.length ? nextDay(cuts[i + 1], -1) : end }];
        for (const slip of ss.filter(s => s.employmentId === p.id && s.kind === 'regular')) gaps = gaps.flatMap(g => slip.periodStart > g.end || slip.periodEnd < g.start ? [g] : [...(g.start < slip.periodStart ? [{ start: g.start, end: nextDay(slip.periodStart, -1) }] : []), ...(g.end > slip.periodEnd ? [{ start: nextDay(slip.periodEnd, 1), end: g.end }] : [])]);
        for (const g of gaps) {
          const recurring = reservedByHidden ? null : recurringPayroll(e, p, m, client!, slips, legacy, currentMonth);
          if (recurring && g.start === recurring.periodStart && g.end === recurring.periodEnd) rows.push({ ...alias(e, recurring.id, p.type, p.startDate, p.endDate), slip: recurring, excluded: false });
          else rows.push({ ...alias(e, 'period:' + e.id + ':' + p.id + ':' + g.start, p.type, p.startDate, p.endDate), periodId: p.id, recommendedStart: g.start, recommendedEnd: g.end, excluded: true, reason: reservedByHidden ? HIDDEN_LEGACY_MESSAGE : automaticPayrollIssue(e, p, m, g.start, g.end, slips, legacy, currentMonth) });
        }
      }
    }
  }
  return rows;
}

// Amounts and attendance of one row. A row without a slip shows what its slip would start from.
export function rowValues(row: PayrollRow, month: string, employees: Employee[]): any {
  if (row.slip) return { ...row.slip.amounts, ...row.slip.attendance, id: row.slip.id };
  if (row.legacyRecord) return { ...row.legacyRecord, ...legacyAmounts(row.legacyRecord) };
  try {
    const e = employees.find(e => e.id === row.sourceEmployeeId)!; const p = periods(e).find(p => p.id === row.periodId)!;
    const start = row.recommendedStart || (p.startDate > month + '-01' ? p.startDate : month + '-01'), end = row.recommendedEnd || (p.endDate && p.endDate < monthEnd(month) ? p.endDate : monthEnd(month));
    const b = basisAt(e, p, start, end);
    return { ...emptyValues(amountFields), ...emptyValues(attendanceFields), baseSalary: defaultBaseSalary(b, start.slice(0, 7), start, end), foodAllowance: defaultFoodAllowance(b) };
  } catch { return { ...emptyValues(amountFields), ...emptyValues(attendanceFields) }; }
}

// Rows that count toward the month's totals, the yearly ledger and the Excel export.
export const includedRows = (rows: PayrollRow[]) => rows.filter(row => !row.excluded && (row.slip || row.legacyRecord));
export const rowAmounts = (row: PayrollRow): Values => row.slip ? row.slip.amounts : legacyAmounts(row.legacyRecord);

export function monthTotals(rows: PayrollRow[]) {
  const t = { base: 0, fullAtt: 0, pos: 0, perf: 0, taxOt: 0, addTotal: 0, leave: 0, short: 0, late: 0, pension: 0, dedTotal: 0, taxable: 0, food: 0, freeOt: 0, freeTotal: 0, labor: 0, health: 0, tax: 0, advance: 0, withTotal: 0, net: 0 };
  for (const row of includedRows(rows)) {
    const a = rowAmounts(row), sum = totals(a);
    t.base += a.baseSalary; t.fullAtt += a.fullAttendance; t.pos += a.positionAllowance; t.perf += a.performanceBonus; t.taxOt += a.taxableOt; t.addTotal += sum.add;
    t.leave += a.leaveDeduction; t.short += a.dailyShortage; t.late += a.lateDeduction; t.pension += a.pensionSelf; t.dedTotal += sum.deduct;
    t.taxable += sum.add - sum.deduct;
    t.food += a.foodAllowance; t.freeOt += a.taxFreeOt; t.freeTotal += sum.exempt;
    t.labor += a.laborIns; t.health += a.healthIns; t.tax += a.incomeTax; t.advance += a.advancePay; t.withTotal += sum.withholding;
    t.net += sum.net;
  }
  return t;
}

// One person per line: the month table's states and grouping.
export type MonthState = 'fill' | 'ready' | 'sent';
export type MonthGroup = { employeeId: string; rows: PayrollRow[]; included: PayrollRow[]; state: MonthState; fillCount: number; period: string };
// Months before this were handled outside the platform, so batch send must not pick them up.
export const PLATFORM_SEND_FROM = '2026-11';

export function rowMonthState(row: PayrollRow, mail: Record<string, string> | null): MonthState {
  if (row.excluded) return 'fill';
  const id = row.slip?.id || row.legacyRecord?.id || '';
  const state = mail?.[id];
  if (state === 'ERROR') return 'ready';
  if (state) return 'sent';
  if (row.legacyRecord && (row.legacyRecord.isEmailSent || (row.legacyRecord as any).legacySeptemberMailId)) return 'sent';
  return 'ready';
}
export function rowStateLabel(row: PayrollRow, mail: Record<string, string> | null): string {
  const state = rowMonthState(row, mail);
  if (state === 'sent') return '已寄';
  if (state === 'ready') return '待寄';
  if (row.slip) return '待首次納入';
  if (row.legacyRecord) return '待核對';
  return '待填';
}
// A reason worth showing on the line: data that blocks work, not the normal "please fill this month".
export function rowDataProblem(row: PayrollRow): string {
  if (row.warning) return row.warning;
  if (row.reason === HIDDEN_LEGACY_MESSAGE) return row.reason;
  if (row.reason && /尚無已生效待遇|約定伙食費|待遇資料/.test(row.reason)) return '缺待遇資料';
  return '';
}
const rowRange = (row: PayrollRow, month: string) => ({ start: row.slip?.periodStart || row.recommendedStart || month + '-01', end: row.slip?.periodEnd || row.recommendedEnd || monthEnd(month) });
const shortDate = (d: string) => Number(d.slice(5, 7)) + '/' + Number(d.slice(8, 10));
// How a single slip is named when a person's line is expanded.
export function rowPeriodText(row: PayrollRow, month: string): string {
  if (row.slip?.kind === 'supplement') return '補發';
  if (row.legacyRecord) return '舊資料';
  const { start, end } = rowRange(row, month);
  return shortDate(start) + '–' + shortDate(end);
}
function periodLabel(rows: PayrollRow[], month: string, employee: Employee | undefined): string {
  const ranges = rows.filter(r => r.slip?.kind !== 'supplement').map(r => rowRange(r, month));
  if (!ranges.length) return '整月';
  if (ranges.length > 1) return ranges.map(r => shortDate(r.start) + '–' + shortDate(r.end)).join('、');
  const { start, end } = ranges[0];
  if (isFullMonth(month, start, end)) return '整月';
  const list = employee ? periods(employee) : [], period = list.find(p => p.startDate === start), left = list.find(p => p.endDate === end);
  if (period && !left && end === monthEnd(month)) return shortDate(start) + (list.indexOf(period) > 0 ? ' 復職' : ' 到職');
  if (left && !period && start === month + '-01') return shortDate(end) + ' 離職';
  return shortDate(start) + '–' + shortDate(end);
}
export function groupMonthRows(rows: PayrollRow[], mail: Record<string, string> | null, month: string, employees: Employee[]): MonthGroup[] {
  const order: string[] = [], byId: Record<string, PayrollRow[]> = {};
  for (const row of rows) { if (!byId[row.sourceEmployeeId]) { byId[row.sourceEmployeeId] = []; order.push(row.sourceEmployeeId); } byId[row.sourceEmployeeId].push(row); }
  return order.map(employeeId => {
    // Earliest days first, with a supplement after the slip it adds to.
    const list = [...byId[employeeId]].sort((a, b) => Number(a.slip?.kind === 'supplement') - Number(b.slip?.kind === 'supplement') || rowRange(a, month).start.localeCompare(rowRange(b, month).start));
    const states = list.map(r => rowMonthState(r, mail));
    const fillCount = states.filter(s => s === 'fill').length;
    return { employeeId, rows: list, included: includedRows(list), fillCount, state: fillCount ? 'fill' : states.every(s => s === 'sent') ? 'sent' : 'ready', period: periodLabel(list, month, employees.find(e => e.id === employeeId)) };
  });
}
// Amounts and attendance added across a person's slips in the month.
export function mergedValues(rows: PayrollRow[]): any {
  const out: any = { ...emptyValues(amountFields), ...emptyValues(attendanceFields) };
  for (const row of rows) {
    const values: any = row.slip ? { ...row.slip.amounts, ...row.slip.attendance } : row.legacyRecord ? { ...legacyAmounts(row.legacyRecord), ...row.legacyRecord } : {};
    for (const k of [...amountFields, ...attendanceFields]) out[k] += Number(values[k]) || 0;
  }
  return out;
}
// What one attendance field is worth. Old records did not save this, so they return null.
export function partAmount(row: PayrollRow, key: string, output: string): number | null {
  if (!row.slip) return row.legacyRecord ? null : 0;
  if (output === 'lateDeduction') return row.slip.amounts.lateDeduction;
  return calculate(row.slip.basis, { ...emptyValues(attendanceFields), [key]: row.slip.attendance[key] || 0 }, { ...emptyValues(amountFields), foodAllowance: row.slip.amounts.foodAllowance }, row.slip.kind)[output];
}
