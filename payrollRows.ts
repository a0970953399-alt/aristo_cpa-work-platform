// The single source for "what is on the payroll this month": the month table, yearly ledger, Excel export and batch send all read from here.
import type { Client, Employee, MonthlySalaryRecord } from './types';
import { Slip, Values, amountFields, attendanceFields, automaticPayrollIssue, basisAt, currentPayrollMonth, defaultBaseSalary, defaultFoodAllowance, emptyValues, isEffectivePayroll, legacyAmounts, legacyIssues, legacyNeedsEnrollment, monthEnd, periods, recurringPayroll, totals } from './functions/src/payrollDomain';
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
