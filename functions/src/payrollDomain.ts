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
export function calculate(b: Basis, t: Values, a: Values): Values {
    numbers(t, attendanceFields);
    numbers(a, amountFields);
    assert(Number.isFinite(b.baseSalary) && b.baseSalary >= 0 && Number.isFinite(b.foodAllowance) && b.foodAllowance >= 0, '約定待遇不正確');
    const h = b.employmentType === 'full_time' ? b.baseSalary / 240 : b.baseSalary;
    const ot = b.employmentType === 'full_time' ? (b.baseSalary + b.foodAllowance) / 240 : b.baseSalary;
    return { ...a, lateDeduction: Math.round(h / 60 * t.lateHours), leaveDeduction: Math.round(h * t.sickLeave / 2) + Math.round(h * t.personalLeave), taxFreeOt: b.employmentType === 'full_time' ? Math.round(ot * t.annualLeave) + Math.round(ot * t.holidayOt) + Math.round(ot * t.normalOt * 1.3333) : Math.round(ot * t.holidayOt * 2) + Math.round(ot * t.normalOt * 1.3333) };
}
export function totals(a: Values) { const add = a.baseSalary + a.fullAttendance + a.positionAllowance + a.performanceBonus + a.taxableOt; const deduct = a.leaveDeduction + a.dailyShortage + a.lateDeduction + a.pensionSelf; const exempt = a.foodAllowance + a.taxFreeOt; const withholding = a.laborIns + a.healthIns + a.incomeTax + a.advancePay; return { add, deduct, exempt, withholding, net: Math.round((add - deduct + exempt - withholding) * 100) / 100 }; }
export function sameBasis(a: Basis, b: Basis): boolean { return (['employmentType','baseSalary','foodAllowance','insuranceBracket','hasLaborIns','hasHealthIns','effectiveDate','compensationId'] as (keyof Basis)[]).every(k=>a[k]===b[k]); }
export function annualMetrics(a: Values) { return { '薪資總額': a.baseSalary + a.fullAttendance + a.positionAllowance + a.taxableOt - a.leaveDeduction - a.dailyShortage - a.lateDeduction, '伙食費': a.foodAllowance, '免稅加班費': a.taxFreeOt, '獎金': a.performanceBonus, '實發': totals(a).net }; }
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
    assert(s.reviewedMonth === true, '請核對同月其他薪資單及代扣項目');
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
        assert(old && old.status === 'confirmed' && old.employeeId === s.employeeId && old.clientId === s.clientId && old.month === s.month && old.employmentId === s.employmentId, '被更正的單據已變更或不符合本單');
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
export function legacyAmounts(r: any): Values { return Object.fromEntries(amountFields.map(k => [k, typeof r[k] === 'number' && Number.isFinite(r[k]) ? r[k] : 0])); }
export function escapeHtml(s: unknown): string { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)); }
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
  <title>薪資單 - ${e(s.employee.name)}</title>
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
                    <h1 style="margin: 0 0 16px 0; color: #111827; font-size: 32px; font-weight: 900; letter-spacing: 4px;">薪資單</h1>
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
                  <td style="padding: 6px 0;"><strong>身分證字號：</strong><span style="color: #111827;">${e(s.employee.idNumber || '-')}</span></td>
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
