import React, { useState } from 'react';
import { MonthGroup, MonthState, groupMonthRows, mergedValues, monthTotals, partAmount, rowDataProblem, rowMonthState, rowPeriodText, rowStateLabel, rowValues, PayrollRow } from './payrollRows';
import { Employee } from './types';

const STATE_STYLE: Record<MonthState, string> = { fill: 'bg-amber-100 text-amber-700', ready: 'bg-blue-100 text-blue-700', sent: 'bg-green-100 text-green-700' };
const STATE_NAME: Record<MonthState, string> = { fill: '待填', ready: '待寄', sent: '已寄' };
const MAIL_TITLE: Record<string, string> = { PENDING: '已排程', PROCESSING: '處理中', SUCCESS: '已寄送', ERROR: '寄送失敗', UNTRACKED: '已寄送' };
type Groups = { attendance: boolean; additions: boolean; deductions: boolean; taxFree: boolean; withholdings: boolean };
const ADD = [['baseSalary', '本薪', 'base'], ['fullAttendance', '全勤', 'fullAtt'], ['positionAllowance', '職務津貼', 'pos'], ['performanceBonus', '業績獎金', 'perf'], ['taxableOt', '應稅加班', 'taxOt']];
const DED = [['leaveDeduction', '請假扣款', 'leave'], ['dailyShortage', '結帳差額', 'short'], ['lateDeduction', '遲到扣款', 'late'], ['pensionSelf', '勞退自提', 'pension']];
const FREE = [['foodAllowance', '伙食費', 'food'], ['taxFreeOt', '免稅加班', 'freeOt']];
const WH = [['laborIns', '勞保', 'labor'], ['healthIns', '健保', 'health'], ['incomeTax', '所得稅', 'tax'], ['advancePay', '預支款', 'advance']];
const ATT: Array<[string, string, string, string | null, '+' | '-' | '']> = [['workHours', '出勤(時)', 'text-gray-500', null, ''], ['lateHours', '遲到(分)', 'text-red-400', 'lateDeduction', '-'], ['sickLeave', '病假', 'text-red-400', 'leaveDeduction', '-'], ['personalLeave', '事假', 'text-red-400', 'leaveDeduction', '-'], ['annualLeave', '特休換薪', 'text-blue-400', 'taxFreeOt', '+'], ['holidayOt', '國定加班', 'text-blue-400', 'taxFreeOt', '+'], ['normalOt', '日常加班', 'text-blue-400', 'taxFreeOt', '+']];
const num = (v: number) => Number(v || 0).toLocaleString();

export const PayrollMonthTable: React.FC<{ rows: PayrollRow[]; month: string; employees: Employee[]; mail: Record<string, string> | null; ready: boolean; isFullTime: (row: PayrollRow) => boolean; onOpen: (row: PayrollRow) => void }> = ({ rows, month, employees, mail, ready, isFullTime, onOpen }) => {
  const [groups, setGroups] = useState<Groups>({ attendance: false, additions: false, deductions: false, taxFree: false, withholdings: false });
  const [filter, setFilter] = useState<MonthState | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const all = groupMonthRows(rows, mail, month, employees);
  const counts = { fill: 0, ready: 0, sent: 0 } as Record<MonthState, number>;
  all.forEach(g => counts[g.state]++);
  const shown = filter ? all.filter(g => g.state === filter) : all;
  const totals = monthTotals(shown.flatMap(g => g.rows));
  if (!ready) return null;
  const toggle = (k: keyof Groups) => setGroups(p => ({ ...p, [k]: !p[k] }));
  const head = (k: keyof Groups, label: string, span: number, cls: string) => <th colSpan={groups[k] ? span : 1} onClick={() => toggle(k)} className={`p-2 border-r border-gray-200 cursor-pointer transition-colors ${cls}`}>{label} {groups[k] ? '[-]' : '[+]'}</th>;
  const cols = (k: keyof Groups, list: string[][], total: string, cls: string, bg: string) => groups[k] ? <>{list.map((c, i) => <th key={c[0]} className={`p-3 text-right ${bg} ${i === list.length - 1 ? 'border-r border-gray-200' : ''}`}>{c[1]}</th>)}</> : <th className={`p-3 text-right border-r border-gray-200 ${bg} ${cls}`}>{total}</th>;
  const cells = (k: keyof Groups, list: string[][], sum: number, values: any, has: boolean, cls: string) => groups[k] ? <>{list.map((c, i) => <td key={c[0]} className={`p-3 text-right font-medium ${cls} ${i === list.length - 1 ? 'border-r border-gray-200' : ''}`}>{has ? num(values[c[0]]) : '—'}</td>)}</> : <td className={`p-3 text-right border-r border-gray-200 font-bold ${cls}`}>{has ? num(sum) : '—'}</td>;
  const moneyCells = (values: any, t: ReturnType<typeof monthTotals>, has: boolean) => <>
    {cells('additions', ADD, t.addTotal, values, has, 'text-blue-700')}
    {cells('deductions', DED, t.dedTotal, values, has, 'text-red-600')}
    <td className="p-3 text-right border-r border-gray-200 font-black text-purple-700 bg-purple-50/20">{has ? num(t.taxable) : '—'}</td>
    {cells('taxFree', FREE, t.freeTotal, values, has, 'text-yellow-600')}
    {cells('withholdings', WH, t.withTotal, values, has, 'text-orange-600')}
  </>;
  const attendance = (list: PayrollRow[], g: MonthGroup | null) => {
    const real = list.filter(r => r.slip || r.legacyRecord);
    const values = mergedValues(real);
    if (!groups.attendance) return <td className="p-3 text-center border-r border-gray-200 font-bold text-gray-600">{ATT.some(a => values[a[0]] > 0) ? '有' : '—'}</td>;
    return <>{ATT.map(([k, , , out, sign], i) => {
      const full = real.length ? real.every(isFullTime) : list.every(isFullTime);
      if (k === 'workHours' && full || k === 'annualLeave' && !full) return <td key={k} className="p-3 text-center text-gray-300">-</td>;
      const amounts = out ? real.map(r => partAmount(r, k, out)) : [];
      const known = amounts.length > 0 && amounts.every(a => a !== null);
      const amount = known ? amounts.reduce((n: number, a) => n + (a as number), 0) : null;
      return <td key={k} className={`p-3 group/cell relative text-center ${i === ATT.length - 1 ? 'border-r border-gray-200' : ''}`}><span className={`font-bold text-gray-600 ${out ? 'group-hover/cell:opacity-0 transition-opacity' : ''}`}>{values[k] || 0}</span>{out && <div className={`absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover/cell:opacity-100 font-black text-sm rounded transition-all ${sign === '-' ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'}`}>{amount === null ? '—' : sign + '$' + amount}</div>}</td>;
    })}</>;
  };
  const sticky = 'sticky z-20 bg-white group-hover:bg-blue-50';
  return <div className="flex flex-col h-full gap-2 min-h-0">
    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-2">{(['fill', 'ready', 'sent'] as MonthState[]).map(k => <button key={k} type="button" data-testid={'filter-' + k} aria-pressed={filter === k} onClick={() => setFilter(filter === k ? null : k)} className={`px-3 py-1 rounded-lg text-sm font-bold ${STATE_STYLE[k]} ${filter === k ? 'ring-2 ring-current' : ''}`}>{STATE_NAME[k]} {counts[k]}</button>)}</div>
      <div className="flex items-baseline gap-2"><span className="text-sm font-bold text-gray-500">{filter ? STATE_NAME[filter] + '合計' : '本月實發'}</span><span data-testid="month-net" className="text-2xl font-black text-green-700">{num(totals.net)}</span></div>
    </div>
    <div className="flex-1 min-h-0 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-auto custom-scrollbar relative">
      <table className="w-full text-left text-sm border-separate border-spacing-0 whitespace-nowrap [&_td]:border-b [&_td]:border-gray-100 [&_th]:border-b [&_th]:border-gray-200">
        <thead className="sticky top-0 z-30 shadow-sm">
          <tr className="text-[11px] uppercase tracking-widest text-center bg-gray-50">
            <th colSpan={5} className="p-2 border-r border-gray-200 text-gray-500 bg-gray-100 sticky left-0 z-40">員工</th>
            {head('attendance', '出勤紀錄', ATT.length, 'text-gray-500 hover:bg-gray-100')}
            {head('additions', '應加金額', ADD.length, 'text-blue-600 bg-blue-50/50 hover:bg-blue-100')}
            {head('deductions', '應扣金額', DED.length, 'text-red-600 bg-red-50/50 hover:bg-red-100')}
            <th className="p-2 border-r border-gray-200 text-purple-600 bg-purple-50/50">稅務結轉</th>
            {head('taxFree', '應加免稅', FREE.length, 'text-yellow-600 bg-yellow-50/50 hover:bg-yellow-100')}
            {head('withholdings', '代扣款項', WH.length, 'text-orange-600 bg-orange-50/50 hover:bg-orange-100')}
            <th className="p-2 text-green-700 bg-green-50">最終結算</th>
          </tr>
          <tr className="text-xs text-gray-500 bg-white font-bold">
            <th className="p-3 w-[60px] min-w-[60px] text-center sticky left-0 z-40 bg-white">序號</th>
            <th className="p-3 w-[60px] min-w-[60px] text-center sticky left-[60px] z-40 bg-white">身分</th>
            <th className="p-3 w-[130px] min-w-[130px] sticky left-[120px] z-40 bg-white border-r-2 border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">姓名</th>
            <th className="p-3">狀態</th>
            <th className="p-3 border-r border-gray-200">期間</th>
            {groups.attendance ? ATT.map((a, i) => <th key={a[0]} className={`p-3 text-center ${a[2]} ${i === ATT.length - 1 ? 'border-r border-gray-200' : ''}`}>{a[1]}</th>) : <th className="p-3 text-center border-r border-gray-200">出勤</th>}
            {cols('additions', ADD, '應加總計', 'text-blue-700', 'bg-blue-50/20')}
            {cols('deductions', DED, '應扣總計', 'text-red-700', 'bg-red-50/20')}
            <th className="p-3 text-right border-r border-gray-200 bg-purple-50/20 text-purple-700">應稅金額</th>
            {cols('taxFree', FREE, '免稅總計', 'text-yellow-700', 'bg-yellow-50/20')}
            {cols('withholdings', WH, '代扣總計', 'text-orange-700', 'bg-orange-50/20')}
            <th className="p-3 text-right bg-green-50 text-green-800 font-black">實發金額</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((g, index) => {
            const multi = g.rows.length > 1, expanded = open[g.employeeId], last = g.rows[g.rows.length - 1], full = isFullTime(last);
            const t = monthTotals(g.rows), values = mergedValues(g.included);
            const problem = g.rows.map(rowDataProblem).find(Boolean);
            const failed = g.rows.some(r => mail?.[r.slip?.id || r.legacyRecord?.id || ''] === 'ERROR');
            const mailState = g.rows.map(r => mail?.[r.slip?.id || r.legacyRecord?.id || '']).find(Boolean);
            const openRow = g.rows.find(r => rowMonthState(r, mail) === 'fill') || g.rows.find(r => rowMonthState(r, mail) === 'ready') || g.rows[0];
            const has = g.included.length > 0;
            return <React.Fragment key={g.employeeId}>
              <tr onClick={() => onOpen(openRow)} className="hover:bg-blue-50 transition-colors cursor-pointer group">
                <td className={`p-3 w-[60px] min-w-[60px] text-center font-mono text-gray-400 left-0 ${sticky}`}>{last.empNo || String(index + 1).padStart(3, '0')}</td>
                <td className={`p-3 w-[60px] min-w-[60px] text-center left-[60px] ${sticky}`}><span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${full ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{full ? '正職' : '兼職'}</span></td>
                <td className={`p-3 w-[130px] min-w-[130px] left-[120px] border-r-2 border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${sticky}`}>
                  <div className="flex items-center gap-1">{multi && <button type="button" data-testid="row-expand" aria-expanded={!!expanded} aria-label={`展開${last.name}的薪資單`} onClick={e => { e.stopPropagation(); setOpen(p => ({ ...p, [g.employeeId]: !p[g.employeeId] })); }} className="text-[10px] text-gray-500 px-1 hover:text-blue-600">{expanded ? '▼' : '▶'}</button>}<span className="font-black text-gray-800 group-hover:text-blue-600 transition-colors">{last.name}</span></div>
                  {problem && <span data-testid="row-problem" className="block text-[10px] font-bold text-red-600 whitespace-normal">{problem}</span>}
                </td>
                <td className="p-3"><span data-testid="row-state" title={mailState ? MAIL_TITLE[mailState] || mailState : undefined} className={`px-2 py-0.5 rounded-md text-xs font-bold ${STATE_STYLE[g.state]}`}>{multi && g.fillCount ? `待填 ${g.fillCount} 張` : g.rows.length === 1 ? rowStateLabel(g.rows[0], mail) : STATE_NAME[g.state]}</span>{failed && <span data-testid="row-mail-state" className="ml-1 text-xs font-bold text-red-600">寄送失敗</span>}</td>
                <td className="p-3 border-r border-gray-200 text-gray-600">{g.period}</td>
                {attendance(g.rows, g)}
                {moneyCells(values, t, has)}
                <td className="p-3 text-right bg-green-50/30 font-black text-green-700 text-base">{has ? num(t.net) : '—'}</td>
              </tr>
              {multi && expanded && g.rows.map(r => {
                const state = rowMonthState(r, mail), rt = monthTotals([r]), rv = r.slip || r.legacyRecord ? rowValues(r, month, employees) : {}, counted = !r.excluded;
                const label = rowPeriodText(r, month);
                return <tr key={r.id} data-testid="row-sub" onClick={() => onOpen(r)} className="bg-gray-50/70 hover:bg-blue-50 transition-colors cursor-pointer group">
                  <td colSpan={3} className="p-2 pl-[136px] sticky left-0 z-20 bg-gray-50 group-hover:bg-blue-50 border-r-2 border-gray-200 text-gray-600 text-xs font-bold">{label}</td>
                  <td className="p-2"><span className={`px-2 py-0.5 rounded-md text-xs font-bold ${STATE_STYLE[state]}`}>{rowStateLabel(r, mail)}</span></td>
                  <td className="p-2 border-r border-gray-200 text-xs text-gray-500">{rowDataProblem(r) || ''}</td>
                  {attendance([r], null)}
                  {moneyCells(rv, rt, counted)}
                  <td className="p-2 text-right bg-green-50/30 font-bold text-green-700">{counted ? num(rt.net) : '—'}</td>
                </tr>;
              })}
            </React.Fragment>;
          })}
          {shown.length === 0 && <tr><td colSpan={30} className="py-16 text-center text-gray-400 font-bold">{filter ? '沒有符合的員工' : '本月沒有在職員工'}</td></tr>}
          {shown.length > 0 && <tr data-testid="month-total" className="bg-gray-100">
            <td colSpan={3} className="p-3 font-black text-gray-800 text-center sticky left-0 z-20 bg-gray-100 border-r-2 border-gray-300">合計（{shown.length} 人）</td>
            <td className="p-3" /><td className="p-3 border-r border-gray-200" />
            {groups.attendance ? ATT.map((a, i) => <td key={a[0]} className={`p-3 text-center text-gray-400 ${i === ATT.length - 1 ? 'border-r border-gray-200' : ''}`}>-</td>) : <td className="p-3 text-center text-gray-400 border-r border-gray-200">-</td>}
            {groups.additions ? ADD.map((c, i) => <td key={c[0]} className={`p-3 text-right font-black text-gray-700 ${i === ADD.length - 1 ? 'border-r border-gray-200' : ''}`}>{num((totals as any)[c[2]])}</td>) : <td className="p-3 text-right border-r border-gray-200 font-black text-blue-800">{num(totals.addTotal)}</td>}
            {groups.deductions ? DED.map((c, i) => <td key={c[0]} className={`p-3 text-right font-black text-red-600 ${i === DED.length - 1 ? 'border-r border-gray-200' : ''}`}>{num((totals as any)[c[2]])}</td>) : <td className="p-3 text-right border-r border-gray-200 font-black text-red-700">{num(totals.dedTotal)}</td>}
            <td className="p-3 text-right border-r border-gray-200 font-black text-purple-800 bg-purple-100/50">{num(totals.taxable)}</td>
            {groups.taxFree ? FREE.map((c, i) => <td key={c[0]} className={`p-3 text-right font-black text-yellow-700 ${i === FREE.length - 1 ? 'border-r border-gray-200' : ''}`}>{num((totals as any)[c[2]])}</td>) : <td className="p-3 text-right border-r border-gray-200 font-black text-yellow-800">{num(totals.freeTotal)}</td>}
            {groups.withholdings ? WH.map((c, i) => <td key={c[0]} className={`p-3 text-right font-black text-orange-600 ${i === WH.length - 1 ? 'border-r border-gray-200' : ''}`}>{num((totals as any)[c[2]])}</td>) : <td className="p-3 text-right border-r border-gray-200 font-black text-orange-700">{num(totals.withTotal)}</td>}
            <td className="p-3 text-right font-black text-green-800 bg-green-100/60 text-base">{num(totals.net)}</td>
          </tr>}
        </tbody>
      </table>
    </div>
  </div>;
};
