// Shared by the browser and callable backend. No Firebase or browser dependencies.
export const amountFields = ['baseSalary', 'fullAttendance', 'positionAllowance', 'performanceBonus', 'taxableOt', 'leaveDeduction', 'dailyShortage', 'lateDeduction', 'pensionSelf', 'foodAllowance', 'taxFreeOt', 'laborIns', 'healthIns', 'incomeTax', 'advancePay'] as const;
export const attendanceFields = ['workHours', 'lateHours', 'sickLeave', 'personalLeave', 'annualLeave', 'holidayOt', 'normalOt'] as const;
export const labels: Record<string, string> = { baseSalary: '應付本薪', fullAttendance: '全勤', positionAllowance: '職務加給', performanceBonus: '績效獎金', taxableOt: '應稅加班費', leaveDeduction: '請假扣薪', dailyShortage: '其他扣薪', lateDeduction: '遲到扣薪', pensionSelf: '勞退自提', foodAllowance: '應付伙食費', taxFreeOt: '免稅加班費', laborIns: '勞保代扣', healthIns: '健保代扣', incomeTax: '所得稅', advancePay: '預支', workHours: '工作時數', lateHours: '遲到分鐘', sickLeave: '病假時數', personalLeave: '事假時數', annualLeave: '特休折現時數', holidayOt: '國定假日加班時數', normalOt: '平日加班時數' };
export type Values = Record<string, number>;
export type Period = {
    id: string;
    type: 'full_time' | 'part_time';
    startDate: string;
    endDate: string | null;
};
export type Basis = {
    employmentType: 'full_time' | 'part_time';
    baseSalary: number;
    foodAllowance: number;
    insuranceBracket: number;
    hasLaborIns: boolean;
    hasHealthIns: boolean;
    effectiveDate: string;
    compensationId: string;
};
export type Slip = {
    id: string;
    schemaVersion: 2;
    revision: number;
    clientId: string;
    employeeId: string;
    employmentId: string;
    month: string;
    periodStart: string;
    periodEnd: string;
    kind: 'regular' | 'supplement';
    relatedId: string;
    replacesId: string;
    status: 'draft' | 'confirmed' | 'void' | 'superseded';
    basis: Basis;
    amounts: Values;
    attendance: Values;
    employee: {
        name: string;
        email: string;
        empNo: string;
        idNumber?: string;
        bankAccount?: string;
    };
    company: {
        name: string;
        phone: string;
        address: string;
    };
    note: string;
    reason: string;
    reviewedMonth: boolean;
    createdAt: string;
    updatedAt: string;
    actor: string;
};
export const assert = (ok: unknown, message: string): void => { if (!ok)
    throw new Error(message); };
export function validDate(s: unknown): s is string { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s; }
export function monthEnd(month: string): string { assert(/^\d{4}-\d{2}$/.test(month) && validDate(month + '-01'), '月份格式不正確'); return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10); }
export function periods(emp: any): Period[] { return emp.employmentHistory?.length ? emp.employmentHistory : [{ id: 'legacy-' + emp.id, type: emp.employmentType, startDate: emp.startDate, endDate: emp.endDate || null }]; }
export function slipPeriod(s: Slip, emp: any): Period | undefined {
    const history = periods(emp);
    if (s.employmentId) return history.find(p => p.id === s.employmentId);
    const matches = history.filter(p => p.startDate <= monthEnd(s.month) && (!p.endDate || p.endDate >= s.month + '-01'));
    return matches.length === 1 ? matches[0] : undefined;
}
export function validatePeriods(items: Period[]) { assert(Array.isArray(items) && items.length > 0, '請至少建立一段任職期間'); const sorted = [...items].sort((a, b) => a.startDate.localeCompare(b.startDate)); const ids = new Set(); sorted.forEach((p, i) => { assert(typeof p.id === 'string' && p.id.length > 0 && !ids.has(p.id), '任職期間編號重複'); ids.add(p.id); assert(['full_time', 'part_time'].includes(p.type), '聘僱身分不正確'); assert(validDate(p.startDate) && (p.endDate === null || validDate(p.endDate) && p.endDate >= p.startDate), '任職日期不正確；離職日為最後在職日'); if (i)
    assert(sorted[i - 1].endDate !== null && sorted[i - 1].endDate! < p.startDate, '任職期間不能重疊，請先填寫前一段離職日'); }); }
export function basisAt(emp: any, p: Period, start: string, end: string): Basis {
    const comps = [...(emp.compensationHistory || [])].sort((a: any, b: any) => b.effectiveDate.localeCompare(a.effectiveDate));
    const c = comps.find((x: any) => x.effectiveDate <= start);
    assert(c, '該計薪起日尚無已生效待遇，請先確認並建立待遇紀錄');
    assert(!comps.some((x: any) => x.effectiveDate > start && x.effectiveDate <= end), '期間內有待遇變更，請在生效日前後分開開單');
    assert(c.foodAllowance !== undefined, '請先確認這段待遇的約定伙食費（可為零）');
    return { employmentType: p.type, baseSalary: c.baseSalary, foodAllowance: c.foodAllowance, insuranceBracket: c.insuranceBracket, hasLaborIns: c.hasLaborIns, hasHealthIns: c.hasHealthIns, effectiveDate: c.effectiveDate, compensationId: c.id };
}
export function numbers(raw: any, fields: readonly string[]): Values { const out: Values = {}; for (const k of fields) {
    const n = raw?.[k];
    assert(typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100000000, '請填寫有效的非負數值：' + labels[k]);
    out[k] = n;
} return out; }
export const emptyValues = (fields: readonly string[]) => Object.fromEntries(fields.map(k => [k, 0])) as Values;
// Overtime uses the meal allowance actually paid that month. A supplement slip only holds the extra amounts, so it keeps the contractual one.
export function calculate(b: Basis, t: Values, a: Values, kind: Slip['kind'] = 'regular'): Values {
    numbers(t, attendanceFields);
    numbers(a, amountFields);
    assert(Number.isFinite(b.baseSalary) && b.baseSalary >= 0 && Number.isFinite(b.foodAllowance) && b.foodAllowance >= 0, '約定待遇不正確');
    const h = b.employmentType === 'full_time' ? b.baseSalary / 240 : b.baseSalary;
    const ot = b.employmentType === 'full_time' ? (b.baseSalary + (kind === 'supplement' ? b.foodAllowance : a.foodAllowance)) / 240 : b.baseSalary;
    return { ...a, lateDeduction: Math.round(h / 60 * t.lateHours), leaveDeduction: Math.round(h * t.sickLeave / 2) + Math.round(h * t.personalLeave), taxFreeOt: b.employmentType === 'full_time' ? Math.round(ot * t.annualLeave) + Math.round(ot * t.holidayOt) + Math.round(ot * t.normalOt * 1.3333) : Math.round(ot * t.holidayOt * 2) + Math.round(ot * t.normalOt * 1.3333) };
}
export function totals(a: Values) { const add = a.baseSalary + a.fullAttendance + a.positionAllowance + a.performanceBonus + a.taxableOt; const deduct = a.leaveDeduction + a.dailyShortage + a.lateDeduction + a.pensionSelf; const exempt = a.foodAllowance + a.taxFreeOt; const withholding = a.laborIns + a.healthIns + a.incomeTax + a.advancePay; return { add, deduct, exempt, withholding, net: Math.round((add - deduct + exempt - withholding) * 100) / 100 }; }
export function sameBasis(a: Basis, b: Basis): boolean { return (['employmentType','baseSalary','foodAllowance','insuranceBracket','hasLaborIns','hasHealthIns','effectiveDate','compensationId'] as (keyof Basis)[]).every(k=>a[k]===b[k]); }
export function annualMetrics(a: Values) { return { '薪資總額': a.baseSalary + a.fullAttendance + a.positionAllowance + a.taxableOt - a.leaveDeduction - a.dailyShortage - a.lateDeduction, '伙食費': a.foodAllowance, '免稅加班費': a.taxFreeOt, '獎金': a.performanceBonus, '實發': totals(a).net }; }
// An old record can only be matched to pay when it belongs to one employment period in its month.
export function legacyNeedsReview(r: any, employees: any[]): boolean {
    const emp = employees.find(e => e.id === r.employeeId);
    if (!emp) return true;
    return periods(emp).filter(p => p.startDate <= monthEnd(r.month) && (!p.endDate || p.endDate >= r.month + '-01')).length !== 1;
}
export function isEffectivePayroll(s: Slip, emp: any, slips: Slip[], legacy: any[]): boolean {
    if (s.status === 'confirmed') return true;
    if (s.status !== 'draft' || s.kind !== 'regular' || s.replacesId) return false;
    try { validateSlip(s, emp, slips, legacy); return sameBasis(basisAt(emp, periods(emp).find(p=>p.id===s.employmentId)!, s.periodStart, s.periodEnd), s.basis); } catch { return false; }
}
export function currentPayrollMonth(now = new Date()): string { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit' }).format(now); }
export function previousMonth(month: string): string { monthEnd(month); return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 2, 1)).toISOString().slice(0, 7); }
export function isFullMonth(month: string, start: string, end: string): boolean { return start === month + '-01' && end === monthEnd(month); }
// A partial month starts from the monthly amount by calendar days on a 30-day month; the person can change it.
export const proratedAmount = (monthly: number, start: string, end: string): number => Math.round(monthly / 30 * (Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1));
export function defaultBaseSalary(b: Basis, month: string, start: string, end: string): number { return b.employmentType !== 'full_time' ? 0 : isFullMonth(month, start, end) ? b.baseSalary : proratedAmount(b.baseSalary, start, end); }
export function defaultFoodAllowance(b: Basis, month: string, start: string, end: string): number { return isFullMonth(month, start, end) ? b.foodAllowance : proratedAmount(b.foodAllowance, start, end); }
// Insurance flags default to insured, matching the employee form.
const isInsured = (flag: unknown) => flag !== false;
export type PreviousPayroll = { amounts: Values; insurance: Pick<Basis, 'insuranceBracket' | 'hasLaborIns' | 'hasHealthIns'> };
// A month's saved pay can be split over several slips, so each carried amount comes from the latest slip that has it.
const carryFrom = (list: Values[]): Values => Object.fromEntries(['laborIns', 'healthIns', 'pensionSelf', 'positionAllowance'].map(k => [k, [...list].reverse().find(a => a[k] > 0)?.[k] || 0]));
// The saved payroll of the month directly before this one, or why it cannot be carried safely.
function findPreviousPayroll(emp: any, p: Period, month: string, slips: Slip[], legacy: any[]): { previous?: PreviousPayroll; issue?: string } {
    const prev = previousMonth(month), start = prev + '-01', end = monthEnd(prev);
    const visible = legacy.filter(r => r.temporaryPayrollHidden !== true);
    const olds = visible.filter(r => r.employeeId === emp.id && r.month === prev);
    const regular = slips.filter(s => s.employeeId === emp.id && s.month === prev && s.kind === 'regular' && s.revision > 0 && s.status !== 'void' && s.status !== 'superseded').sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
    if (olds.length + regular.length === 0) return { issue: '上月沒有已保存的薪資' };
    if (olds.length > 1) return { issue: '上月舊薪資待核對' };
    try {
        if (olds.length) {
            if (legacyIssues(olds[0], visible, [emp]).length || legacyNeedsReview(olds[0], [emp])) return { issue: '上月舊薪資待核對' };
            return { previous: { amounts: legacyAmounts(olds[0]), insurance: basisAt(emp, p, start > p.startDate ? start : p.startDate, end) } };
        }
        const effective = regular.filter(s => isEffectivePayroll(s, emp, slips, visible));
        if (!effective.length) return { issue: '上月沒有已保存的薪資' };
        const last = effective[effective.length - 1];
        return { previous: { amounts: { ...last.amounts, ...carryFrom(effective.map(s => s.amounts)) }, insurance: last.basis } };
    } catch { return { issue: '上月舊薪資待核對' }; }
}
// The latest saved pay before a date, in any month, used to start a new slip's insurance and other fixed items.
export function latestPayroll(emp: any, before: string, slips: Slip[], legacy: any[]): (PreviousPayroll & { month: string }) | null {
    const visible = legacy.filter(r => r.temporaryPayrollHidden !== true && r.employeeId === emp.id && r.month + '-31' < before && !legacyIssues(r, legacy.filter(x => x.temporaryPayrollHidden !== true), [emp]).length);
    const regular = slips.filter(s => s.employeeId === emp.id && s.kind === 'regular' && s.revision > 0 && s.status === 'confirmed' && s.periodEnd < before);
    const newest = [...visible.map(r => r.month), ...regular.map(s => s.month)].sort().pop();
    if (!newest) return null;
    const list = regular.filter(s => s.month === newest).sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
    if (list.length) return { month: newest, amounts: { ...list[list.length - 1].amounts, ...carryFrom(list.map(s => s.amounts)) }, insurance: list[list.length - 1].basis };
    const old = visible.find(r => r.month === newest);
    const periodAtOld = periods(emp).find(p => p.startDate <= monthEnd(newest) && (!p.endDate || p.endDate >= newest + '-01'));
    let insurance: PreviousPayroll['insurance'] = { insuranceBracket: NaN, hasLaborIns: true, hasHealthIns: true };
    try { if (periodAtOld) insurance = basisAt(emp, periodAtOld, newest + '-01' > periodAtOld.startDate ? newest + '-01' : periodAtOld.startDate, monthEnd(newest)); } catch { /* old months may predate any pay record */ }
    return { month: newest, amounts: legacyAmounts(old), insurance };
}
export function previousPayroll(emp: any, p: Period, month: string, slips: Slip[], legacy: any[]): PreviousPayroll | null { return findPreviousPayroll(emp, p, month, slips, legacy).previous || null; }
const INSURANCE_KEYS = ['insuranceBracket', 'hasLaborIns', 'hasHealthIns'] as const;
const hasMissingInsurance = (b: Basis, a: Values) => isInsured(b.hasLaborIns) && !(a.laborIns > 0) || isInsured(b.hasHealthIns) && !(a.healthIns > 0);
// Explains a row that was not filled automatically, so the person knows what to check.
export function automaticPayrollIssue(emp: any, p: Period, month: string, start: string, end: string, slips: Slip[], legacy: any[], currentMonth = currentPayrollMonth()): string {
    let basis: Basis;
    try { basis = basisAt(emp, p, start, end); } catch (e) { return e instanceof Error ? e.message : '待遇資料待確認'; }
    if (p.type !== 'full_time') return '兼職請填寫工時';
    if (!isFullMonth(month, start, end)) {
        const from = p.startDate > month + '-01' ? p.startDate : month + '-01', to = p.endDate && p.endDate < monthEnd(month) ? p.endDate : monthEnd(month);
        return (emp.compensationHistory || []).some((c: any) => c.effectiveDate > from && c.effectiveDate <= to) ? '本月有待遇變動，請確認這段的本薪' : '本月不足月，請確認本薪和伙食費';
    }
    if (month > currentMonth) return '未來月份不會自動帶入';
    if (slips.some(s => s.employeeId === emp.id && s.month === month && s.kind === 'regular' && s.status === 'void')) return '本月薪資單已作廢，請重新填寫';
    const found = findPreviousPayroll(emp, p, month, slips, legacy);
    if (!found.previous) return found.issue || '請填寫當月資料';
    if (INSURANCE_KEYS.some(k => found.previous!.insurance[k] !== basis[k])) return '投保級距或加退保有變動，請確認勞健保';
    if (hasMissingInsurance(basis, carriedAmounts(basis, found.previous))) return '應投保但上月金額為 0';
    return '請填寫當月資料';
}
export function carriedAmounts(b: Basis, previous: PreviousPayroll): Values {
    return { laborIns: isInsured(b.hasLaborIns) ? previous.amounts.laborIns : 0, healthIns: isInsured(b.hasHealthIns) ? previous.amounts.healthIns : 0, pensionSelf: previous.amounts.pensionSelf, positionAllowance: previous.amounts.positionAllowance };
}
export function payrollSendIssues(p: { kind: string; month: string; email: string; amounts: Values; basis: Pick<Basis, 'hasLaborIns' | 'hasHealthIns'> | null; hasOtherPay: boolean }, currentMonth = currentPayrollMonth()): string[] {
    const issues: string[] = [];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email || '')) issues.push('沒有有效收件信箱');
    if (p.month > currentMonth) issues.push('未來月份的薪資單還不能寄送');
    if (p.kind === 'regular') {
        if (!(p.amounts.baseSalary > 0)) issues.push('本薪尚未填寫');
        // Another saved slip in the month may legitimately hold the insurance deduction.
        if (p.basis && !p.hasOtherPay) {
            if (isInsured(p.basis.hasLaborIns) && !(p.amounts.laborIns > 0)) issues.push('應投保勞保但金額為 0');
            if (isInsured(p.basis.hasHealthIns) && !(p.amounts.healthIns > 0)) issues.push('應投保健保但金額為 0');
        }
    }
    return issues;
}
export function legacyBasis(r: any, emp: any): Basis | null {
    if (!emp) return null;
    try {
        const ps = periods(emp).filter(p => p.startDate <= monthEnd(r.month) && (!p.endDate || p.endDate >= r.month + '-01'));
        return ps.length === 1 ? basisAt(emp, ps[0], r.month + '-01', monthEnd(r.month)) : null;
    } catch { return null; }
}
export function legacySendIssues(r: any, emp: any, currentMonth = currentPayrollMonth()): string[] {
    return payrollSendIssues({ kind: 'regular', month: r.month, email: emp?.email || '', amounts: legacyAmounts(r), basis: legacyBasis(r, emp), hasOtherPay: false }, currentMonth);
}
// Old amounts may be hand-set, so an attendance edit only recalculates the one amount it drives.
export function legacyRecalculated(b: Basis, r: any, field: string): Values {
    const attendance = legacyAttendance(r), amounts = legacyAmounts(r);
    if (field === 'workHours') return b.employmentType === 'part_time' ? { baseSalary: attendance.workHours * b.baseSalary } : {};
    const output = field === 'lateHours' ? 'lateDeduction' : field === 'sickLeave' || field === 'personalLeave' ? 'leaveDeduction' : ['annualLeave', 'holidayOt', 'normalOt'].includes(field) ? 'taxFreeOt' : '';
    return output ? { [output]: calculate(b, attendance, amounts)[output] } : {};
}
export function recurringPayroll(emp: any, p: Period, month: string, company: any, slips: Slip[], legacy: any[], currentMonth = currentPayrollMonth()): Slip | null {
    if (month > currentMonth) return null;
    if (p.type !== 'full_time' || p.startDate > month + '-01' || p.endDate && p.endDate < monthEnd(month)) return null;
    if (legacy.some(r=>r.employeeId===emp.id&&r.month===month)) return null;
    if (slips.some(s=>s.employeeId===emp.id&&s.month===month&&s.kind==='regular'&&s.status!=='superseded')) return null;
    try {
        validatePeriods(periods(emp));
        const basis=basisAt(emp,p,month+'-01',monthEnd(month));
        const previous=previousPayroll(emp,p,month,slips,legacy);
        if (!previous) return null;
        // A changed bracket or insurance enrollment needs a person to confirm the new deductions.
        if (INSURANCE_KEYS.some(k=>previous.insurance[k]!==basis[k])) return null;
        const amounts: Values={...emptyValues(amountFields),...carriedAmounts(basis,previous),baseSalary:basis.baseSalary,foodAllowance:basis.foodAllowance};
        if (hasMissingInsurance(basis,amounts)) return null;
        const candidate: Slip = {id:'auto:'+emp.id+':'+p.id+':'+month,schemaVersion:2,revision:0,clientId:emp.clientId,employeeId:emp.id,employmentId:p.id,month,periodStart:month+'-01',periodEnd:monthEnd(month),kind:'regular',relatedId:'',replacesId:'',status:'draft',basis,amounts,attendance:emptyValues(attendanceFields),employee:{name:emp.name,email:emp.email||'',empNo:emp.empNo||'',idNumber:emp.idNumber||'',bankAccount:emp.bankAccount||''},company:{name:company.fullName||company.name||'',phone:company.phone||'',address:company.contactAddress||company.regAddress||''},note:'',reason:'',reviewedMonth:false,createdAt:'',updatedAt:'',actor:''};
        validateSlip(candidate,emp,slips,legacy);
        return candidate;
    } catch { return null; }
}
export function legacyCanEdit(r: any, all: any[], employees: any[], slips: Slip[]): boolean {
    return r.month >= '2026-09' && r.temporaryPayrollHidden !== true && !r.isEmailSent && !r.legacySeptemberMailId
        && legacyIssues(r, all, employees).length === 0
        && !slips.some(s => s.employeeId === r.employeeId && s.month === r.month && !['void','superseded'].includes(s.status));
}
export function validateSlip(s: Slip, emp: any, others: Slip[], legacy: any[]) {
    assert(s.employeeId === emp.id && s.clientId === emp.clientId, '員工與客戶不符');
    assert(validDate(s.periodStart) && validDate(s.periodEnd) && s.periodStart <= s.periodEnd, '計薪日期不正確');
    monthEnd(s.month);
    assert(s.periodStart.slice(0, 7) === s.month && s.periodEnd.slice(0, 7) === s.month, '每張單的計薪期間必須在同一月份');
    validatePeriods(periods(emp));
    const p = periods(emp).find(x => x.id === s.employmentId);
    assert(p, '找不到任職期間');
    assert(p && s.periodStart >= p.startDate && (!p.endDate || s.periodEnd <= p.endDate), '計薪期間超出任職範圍');
    assert(['regular', 'supplement'].includes(s.kind), '薪資用途不正確');
    assert(s.note.length <= 2000 && s.reason.length <= 500, '備註或原因過長');
    assert(!legacy.some(x => x.employeeId === s.employeeId && x.month === s.month), '這位員工該月已有舊薪資，請先核對舊紀錄，避免重複結薪');
    const relevant = others.filter(x => x.id !== s.id && x.id !== s.replacesId && x.employeeId === s.employeeId && x.status !== 'void' && x.status !== 'superseded');
    if (s.kind === 'regular')
        assert(!relevant.some(x => x.kind === 'regular' && x.periodStart <= s.periodEnd && x.periodEnd >= s.periodStart), '已有一般薪資單涵蓋此期間（含草稿）');
    if (s.kind === 'supplement') {
        const original = others.find(x => x.id === s.relatedId);
        assert(original && original.status === 'confirmed' && original.employeeId === s.employeeId && original.clientId === s.clientId, '補發必須連結同一員工的已確認薪資單');
        assert(s.reason.trim(), '請填補發原因');
    }
    if (s.replacesId) {
        const old = others.find(x => x.id === s.replacesId);
        const existingReplacement = others.find(x => x.id === s.id && x.status === 'confirmed' && x.replacesId === s.replacesId);
        assert(old && (old.status === 'confirmed' || old.status === 'superseded' && existingReplacement) && old.employeeId === s.employeeId && old.clientId === s.clientId && old.month === s.month && old.employmentId === s.employmentId, '被更正的單據已變更或不符合本單');
        assert(s.reason.trim(), '請填更正原因');
        assert(!relevant.some(x => x.replacesId === s.replacesId), '已有另一張更正草稿');
    }
    numbers(s.amounts, amountFields);
    numbers(s.attendance, attendanceFields);
}
export function legacyIssues(r: any, all: any[], employees: any[]): string[] {
    const reasons: string[] = [];
    const e = employees.find(x => x.id === r.employeeId);
    if (all.filter(x => x.clientId === r.clientId && x.employeeId === r.employeeId && x.month === r.month).length > 1)
        reasons.push('同人同月多份文件');
    if (!e)
        reasons.push('員工主檔不存在');
    else {
        try {
            const ps = periods(e);
            validatePeriods(ps);
            if (!ps.some(p => p.startDate <= monthEnd(r.month) && (!p.endDate || p.endDate >= r.month + '-01')))
                reasons.push('任職期間不符');
        }
        catch {
            reasons.push('任職資料待核對');
        }
    }
    if (amountFields.some(k => typeof r[k] !== 'number' || !Number.isFinite(r[k])))
        reasons.push('金額明細不完整');
    return reasons;
}
// Old records may have no attendance fields at all; only missing values default to zero.
export function legacyAttendance(r: any): any { return Object.fromEntries(attendanceFields.map(k => [k, r[k] ?? 0])); }
export function legacyAmounts(r: any): Values { return Object.fromEntries(amountFields.map(k => [k, typeof r[k] === 'number' && Number.isFinite(r[k]) ? r[k] : 0])); }
export function escapeHtml(s: unknown): string { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)); }
export type EmployeeChange = { label: string; from: string; to: string };
// Audit entries keep masked identity numbers, so the history never spreads the full values.
export function employeeChanges(before: any, after: any): EmployeeChange[] {
    if (!before) return [{ label: '新增員工', from: '—', to: String(after.name || '') }];
    const blank = (v: unknown) => v === undefined || v === null || v === '' ? '未填' : typeof v === 'boolean' ? (v ? '是' : '否') : typeof v === 'number' ? v.toLocaleString() : String(v);
    const changes: EmployeeChange[] = [];
    const fields: Array<[string, string, ((v: unknown) => string)?]> = [['empNo', '序號'], ['name', '姓名'], ['email', '電子郵件'], ['idNumber', '身分證字號', maskIdNumber], ['bankBranch', '銀行分行'], ['bankAccount', '銀行帳號', maskBankAccount], ['address', '戶籍地址']];
    for (const [key, label, mask] of fields) {
        if ((before[key] ?? '') === (after[key] ?? '')) continue;
        const from = blank(mask ? mask(before[key]) : before[key]), to = blank(mask ? mask(after[key]) : after[key]);
        changes.push({ label, from, to: from === to ? to + '（已修改）' : to });
    }
    const compare = (title: (item: any) => string, older: any[], newer: any[], keys: Array<[string, string]>) => {
        for (const item of newer) {
            const old = older.find(x => x.id === item.id);
            if (!old) { changes.push({ label: '新增' + title(item), from: '—', to: keys.map(([k, l]) => l + ' ' + blank(item[k])).join('、') }); continue; }
            for (const [k, l] of keys) if ((old[k] ?? null) !== (item[k] ?? null)) changes.push({ label: title(item) + ' ' + l, from: blank(old[k]), to: blank(item[k]) });
        }
        for (const old of older) if (!newer.some(x => x.id === old.id)) changes.push({ label: '刪除' + title(old), from: keys.map(([k, l]) => l + ' ' + blank(old[k])).join('、'), to: '—' });
    };
    compare(p => '任職（' + p.startDate + '）', periods(before), periods(after), [['type', '身分'], ['startDate', '入職日'], ['endDate', '離職日']]);
    compare(c => '待遇（' + c.effectiveDate + '）', before.compensationHistory || [], after.compensationHistory || [], [['effectiveDate', '生效日'], ['baseSalary', '月薪或時薪'], ['foodAllowance', '伙食費'], ['insuranceBracket', '投保級距'], ['hasLaborIns', '投保勞保'], ['hasHealthIns', '投保健保']]);
    return changes;
}
export function maskIdNumber(id: unknown): string { const s = String(id ?? '').trim(); return !s ? '' : s.length < 7 ? '****' : s.slice(0, 3) + '****' + s.slice(-3); }
export function maskBankAccount(account: unknown): string { const s = String(account ?? '').trim(); return !s ? '' : s.length <= 4 ? '****' : '****' + s.slice(-4); }
export function slipTitle(s: Pick<Slip, 'kind' | 'replacesId'>): string { return s.kind === 'supplement' ? '薪資單（補發）' : s.replacesId ? '薪資單（更正）' : '薪資單'; }
export function slipHtml(s: Slip, employment?: Period): string {
 const e=escapeHtml,a=s.amounts;
 const baseSalary=a.baseSalary,foodAllowance=a.foodAllowance,leaveDeduction=a.leaveDeduction,lateDeduction=a.lateDeduction,laborIns=a.laborIns,healthIns=a.healthIns;
 const totalOtPay=a.taxableOt+a.taxFreeOt,otherAdditions=a.fullAttendance+a.positionAllowance+a.performanceBonus,otherDeductions=a.dailyShortage+a.pensionSelf+a.incomeTax+a.advancePay;
 const netPay=totals(a).net,companyName=e(s.company.name),companyPhone=e(s.company.phone),companyAddress=e(s.company.address);
 const attendanceNames: Record<string, string> = { workHours: '工作時數', lateHours: '遲到', sickLeave: '病假', personalLeave: '事假', annualLeave: '特休折現', holidayOt: '國定假日加班', normalOt: '平日加班' };
 const displayEnd=validDate(s.periodEnd)?s.periodEnd:monthEnd(s.month);
 const withinSlip=(date:string)=>validDate(date)&&date>=s.periodStart&&date<=displayEnd;
 const shortDate=(date:string)=>`${Number(date.slice(5,7))}/${Number(date.slice(8,10))}`;
 const employmentNotes=[employment?.startDate&&withinSlip(employment.startDate)?`${shortDate(employment.startDate)}到職`:'',employment?.endDate&&withinSlip(employment.endDate)?`${shortDate(employment.endDate)}離職`:''].filter(Boolean);
 const attendanceSummary=e([...employmentNotes,...attendanceFields.filter(k=>s.attendance[k]>0).map(k=>`${attendanceNames[k]}：${s.attendance[k]} ${k==='lateHours'?'分鐘':'小時'}`)].join('；'));
 return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${slipTitle(s)} - ${e(s.employee.name)}</title>
</head>
<body style="background-color: #e5e7eb; margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, 'PingFang TC', '微軟正黑體', sans-serif;">

  <table width="100%" bgcolor="#e5e7eb" cellpadding="0" cellspacing="0" border="0" style="padding: 40px 10px;">
    <tr>
      <td align="center">

        <table width="100%" bgcolor="#ffffff" cellpadding="0" cellspacing="0" border="0" style="max-width: 800px; width: 100%; border-radius: 8px; border: 1px solid #d1d5db; overflow: hidden;">

          <tr>
            <td style="padding: 30px 40px 20px 40px; border-bottom: 2px solid #1F2937;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" valign="bottom">
                    <h1 style="margin: 0 0 16px 0; color: #111827; font-size: 32px; font-weight: 900; letter-spacing: 4px;">${slipTitle(s)}</h1>
                    <h2 style="margin: 0 0 6px 0; color: #1F2937; font-size: 18px; font-weight: bold;">${companyName}</h2>
                    <div style="color: #4B5563; font-size: 13px; line-height: 1.6;">
                        <div>📞 ${companyPhone}</div>
                        <div>📍 ${companyAddress}</div>
                    </div>
                  </td>
                  <td align="right" valign="bottom">
                    <div style="color: #6B7280; font-size: 13px; margin-bottom: 4px;">發放月份</div>
                    <div style="color: #111827; font-size: 20px; font-weight: bold;">${e(s.month)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 15px 40px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; color: #4B5563;">
                <tr>
                  <td style="padding: 6px 0; width: 50%;"><strong>員工姓名：</strong><span style="color: #111827;">${e(s.employee.name)}</span></td>
                  <td style="padding: 6px 0; width: 50%;"><strong>員工代號：</strong><span style="color: #111827;">${e(s.employee.empNo || '-')}</span></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0;"><strong>身分證字號：</strong><span style="color: #111827;">${e(maskIdNumber(s.employee.idNumber) || '-')}</span></td>
                  <td style="padding: 6px 0;"><strong>E-mail：</strong><span style="color: #111827;">${e(s.employee.email || '尚未設定')}</span></td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 30px 40px;">
              <p style="text-align: right; font-size: 12px; color: #9CA3AF; margin: 0 0 10px 0;">單位：新台幣 (元)</p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #E5E7EB; border-radius: 8px; font-size: 14px; text-align: right; border-collapse: separate; border-spacing: 0;">
                <thead>
                  <tr style="background-color: #F9FAFB; color: #374151;">
                    <th style="padding: 12px; border-bottom: 2px solid #E5E7EB; text-align: center; width: 25%;">加項</th>
                    <th style="padding: 12px; border-bottom: 2px solid #E5E7EB; border-right: 1px dashed #D1D5DB; text-align: center; width: 25%;">金額</th>
                    <th style="padding: 12px; border-bottom: 2px solid #E5E7EB; text-align: center; width: 25%;">減項</th>
                    <th style="padding: 12px; border-bottom: 2px solid #E5E7EB; text-align: center; width: 25%;">金額</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px dashed #E5E7EB; text-align: center; color: #4B5563;">本薪</td>
                    <td style="padding: 12px; border-bottom: 1px dashed #E5E7EB; border-right: 1px dashed #D1D5DB; color: #047857; font-weight: bold;">${baseSalary.toLocaleString()}</td>
                    <td style="padding: 12px; border-bottom: 1px dashed #E5E7EB; text-align: center; color: #4B5563;">病事假扣薪</td>
                    <td style="padding: 12px; border-bottom: 1px dashed #E5E7EB; color: #B91C1C; font-weight: bold;">${leaveDeduction.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px dashed #E5E7EB; text-align: center; color: #4B5563;">伙食費</td>
                    <td style="padding: 12px; border-bottom: 1px dashed #E5E7EB; border-right: 1px dashed #D1D5DB; color: #047857; font-weight: bold;">${foodAllowance.toLocaleString()}</td>
                    <td style="padding: 12px; border-bottom: 1px dashed #E5E7EB; text-align: center; color: #4B5563;">遲到扣薪</td>
                    <td style="padding: 12px; border-bottom: 1px dashed #E5E7EB; color: #B91C1C; font-weight: bold;">${lateDeduction.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px dashed #E5E7EB; text-align: center; color: #4B5563;">加班費</td>
                    <td style="padding: 12px; border-bottom: 1px dashed #E5E7EB; border-right: 1px dashed #D1D5DB; color: #047857; font-weight: bold;">${totalOtPay.toLocaleString()}</td>
                    <td style="padding: 12px; border-bottom: 1px dashed #E5E7EB; text-align: center; color: #4B5563;">勞保自負額</td>
                    <td style="padding: 12px; border-bottom: 1px dashed #E5E7EB; color: #B91C1C; font-weight: bold;">${laborIns.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px dashed #E5E7EB; text-align: center; color: #4B5563;">其他加項</td>
                    <td style="padding: 12px; border-bottom: 1px dashed #E5E7EB; border-right: 1px dashed #D1D5DB; color: #047857; font-weight: bold;">${otherAdditions.toLocaleString()}</td>
                    <td style="padding: 12px; border-bottom: 1px dashed #E5E7EB; text-align: center; color: #4B5563;">健保自負額</td>
                    <td style="padding: 12px; border-bottom: 1px dashed #E5E7EB; color: #B91C1C; font-weight: bold;">${healthIns.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; text-align: center;"></td>
                    <td style="padding: 12px; border-right: 1px dashed #D1D5DB;"></td>
                    <td style="padding: 12px; text-align: center; color: #4B5563;">其他減項</td>
                    <td style="padding: 12px; color: #B91C1C; font-weight: bold;">${otherDeductions.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 25px 40px; background-color: #F8FAFC; border-top: 1px solid #E5E7EB;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" valign="top" style="width: 50%;">
                    <p style="margin: 0; font-size: 13px; color: #4B5563; line-height: 1.6;">
                      <strong style="color: #111827;">任職與出勤：</strong><br/>
                      ${attendanceSummary || '無'}
                    </p>
                  </td>
                  <td align="right" valign="bottom" style="width: 50%;">
                    <span style="font-size: 16px; font-weight: bold; color: #374151;">實領金額：</span>
                    <span style="font-size: 28px; font-weight: 900; color: #15803D; border-bottom: 4px double #15803D; padding-bottom: 2px;">
                      $ ${netPay.toLocaleString()}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
