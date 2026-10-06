import React, { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import * as XLSX from 'xlsx';
import { db, functions } from './firebase';
import { Client, Employee, MonthlySalaryRecord } from './types';
import { Slip, Values, amountFields, attendanceFields, labels, periods, basisAt, calculate, emptyValues, monthEnd, totals, annualMetrics, legacyIssues, legacyAmounts, slipHtml } from './functions/src/payrollDomain';
const command = httpsCallable<any, any>(functions, 'payrollCommand');
const money = (n: number) => n.toLocaleString('zh-TW', { maximumFractionDigits: 2 });
const statusLabel: Record<string, string> = { draft: '草稿', confirmed: '已確認', void: '已作廢', superseded: '已被更正取代' };
const mailLabel: Record<string, string> = { NONE: '尚未寄送', PENDING: '已排程', PROCESSING: '寄送處理中', SUCCESS: '寄送服務已完成', ERROR: '寄送失敗' };
const button = 'border rounded px-3 py-2 bg-white disabled:opacity-40';
const newId = () => crypto.randomUUID();
export function PayrollLedger({ client, employees: initialEmployees, legacy: initialLegacy, onEmployees, onBack, initialMode }: {
    client: Client;
    employees: Employee[];
    legacy: MonthlySalaryRecord[];
    onEmployees: () => void;
    onBack: () => void;
    initialMode: 'monthly' | 'yearly';
}) {
    const clientId = String(client.id);
    const [slips, setSlips] = useState<Slip[]>([]);
    const [slipReady, setReady] = useState(false);
    const [employees, setEmployees] = useState(initialEmployees);
    const [legacy, setLegacy] = useState(initialLegacy);
    const [legacyReady, setLegacyReady] = useState(false);
    const [employeeReady, setEmployeeReady] = useState(false);
    const ready = slipReady && legacyReady && employeeReady;
    const [mode, setMode] = useState(initialMode);
    const [month, setMonth] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }).slice(0, 7));
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const pending = useRef<{
        body: any;
        operationId: string;
    } | null>(null);
    const [editing, setEditing] = useState<Slip | null>(null);
    const [preview, setPreview] = useState<Slip | null>(null);
    const [history, setHistory] = useState<Slip[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [dates, setDates] = useState({ start: '', end: '' });
    const [mailStates, setMailStates] = useState<Record<string, string>>({});
    const [info, setInfo] = useState('');
    useEffect(() => { setReady(false); return onSnapshot(query(collection(db, 'payrollSlips'), where('clientId', '==', clientId)), s => { setSlips(s.docs.map(d => ({ ...d.data(), id: d.id } as Slip))); setReady(true); }, e => { setError('新薪資資料讀取失敗：' + e.message); setReady(false); }); }, [clientId]);
    useEffect(() => { setLegacyReady(false); setEmployeeReady(false); const fail = (e: Error) => { setError('薪資或員工資料載入失敗：' + e.message); setLegacyReady(false); setEmployeeReady(false); }; const a = onSnapshot(query(collection(db, 'monthlySalaries'), where('clientId', '==', clientId)), s => { setLegacy(s.docs.map(d => ({ ...d.data(), id: d.id } as MonthlySalaryRecord))); setLegacyReady(true); }, fail); const b = onSnapshot(query(collection(db, 'employees'), where('clientId', '==', clientId)), s => { setEmployees(s.docs.map(d => ({ ...d.data(), id: d.id } as Employee))); setEmployeeReady(true); }, fail); return () => { a(); b(); }; }, [clientId]);
    const run = async (body: any) => { if (lock.current)
        return; lock.current = true; setBusy(true); setError(''); setInfo(''); try {
        if (!pending.current || JSON.stringify(pending.current.body) !== JSON.stringify(body))
            pending.current = { body, operationId: newId() };
        const response = await command({ ...body, clientId, operationId: pending.current.operationId });
        pending.current = null;
        return response.data;
    }
    catch (e: any) {
        setError(e.message || '操作失敗，請重試');
        return undefined;
    }
    finally {
        lock.current = false;
        setBusy(false);
    } };
    const scope = (m: string) => mode === 'monthly' ? m === month : m.startsWith(month.slice(0, 4) + '-');
    const shown = slips.filter(s => scope(s.month)).sort((a, b) => a.month.localeCompare(b.month) || a.employee.name.localeCompare(b.employee.name) || a.periodStart.localeCompare(b.periodStart));
    const old = legacy.filter(s => scope(s.month));
    const issues = old.filter(r => legacyIssues(r, legacy, employees).length > 0);
    const confirmed = shown.filter(s => s.status === 'confirmed');
    const draft = shown.filter(s => s.status === 'draft');
    const oldComplete = old.filter(r => legacyIssues(r, legacy, employees).length === 0);
    const total = confirmed.reduce((sum, s) => sum + totals(s.amounts).net, 0);
    const emp = employees.find(e => e.id === selectedEmployee);
    const chooseEmployee = (id: string) => { setSelectedEmployee(id); setSelectedPeriod(''); setDates({ start: '', end: '' }); };
    const choosePeriod = (id: string) => { setSelectedPeriod(id); const p = emp && periods(emp).find(x => x.id === id); if (p)
        setDates({ start: p.startDate > month + '-01' ? p.startDate : month + '-01', end: p.endDate && p.endDate < monthEnd(month) ? p.endDate : monthEnd(month) }); };
    const begin = () => { try {
        if (!ready)
            throw new Error('請等資料載入完成');
        if (!emp)
            throw new Error('請選擇員工');
        const p = periods(emp).find(x => x.id === selectedPeriod);
        if (!p)
            throw new Error('請選擇任職期間');
        if (legacy.some(r => r.employeeId === emp.id && r.month === month))
            throw new Error('該月已有舊薪資，請先核對後再處理，避免重複結薪');
        const basis = basisAt(emp, p, dates.start, dates.end);
        const amounts = emptyValues(amountFields);
        amounts.baseSalary = basis.employmentType === 'full_time' ? basis.baseSalary : 0;
        amounts.foodAllowance = basis.foodAllowance;
        setEditing({ id: newId(), schemaVersion: 2, revision: 0, clientId, employeeId: emp.id, employmentId: p.id, month, periodStart: dates.start, periodEnd: dates.end, kind: 'regular', relatedId: '', replacesId: '', status: 'draft', basis, amounts, attendance: emptyValues(attendanceFields), employee: { name: emp.name, email: emp.email, empNo: emp.empNo }, company: { name: client.fullName || client.name, phone: client.phone || '', address: client.contactAddress || client.regAddress || '' }, note: '', reason: '', reviewedMonth: false, createdAt: '', updatedAt: '', actor: '' });
        setError('');
    }
    catch (e: any) {
        setError(e.message);
    } };
    const changeAttendance = (k: string, n: number) => { if (!editing)
        return; try {
        const attendance = { ...editing.attendance, [k]: n };
        let amounts = { ...editing.amounts };
        if (k === 'workHours' && editing.basis.employmentType === 'part_time')
            amounts.baseSalary = n * editing.basis.baseSalary;
        amounts = calculate(editing.basis, attendance, amounts);
        setEditing({ ...editing, attendance, amounts });
    }
    catch (e: any) {
        setError(e.message);
    } };
    const save = async () => { if (!editing)
        return; const result = await run({ action: 'saveSlip', slip: editing, expectedRevision: editing.revision }); if (result) {
        setEditing(result.slip);
        setInfo('草稿已保存；請確認明細後再確認薪資。');
    } };
    const transition = async (s: Slip, action: 'confirm' | 'void') => { let reason = ''; if (action === 'void') {
        const answer = window.prompt('請填作廢原因；原始版本仍保留。');
        if (!answer?.trim())
            return;
        reason = answer;
    }
    else if (!window.confirm('確認這張薪資單的金額與同月代扣已核對？確認不代表已付款。'))
        return; const result = await run({ action, id: s.id, expectedRevision: s.revision, reason }); if (result) {
        setEditing(null);
        setInfo(action === 'confirm' ? '薪資已確認。' : '薪資已作廢，原始版本保留。');
    } };
    const revise = (s: Slip) => { setEditing({ ...s, id: newId(), revision: 0, status: 'draft', replacesId: s.id, reason: '', reviewedMonth: false, createdAt: '', updatedAt: '' }); setInfo('更正草稿確認前，原已確認單仍列入合計。'); };
    const send = async (s: Slip, retry = false) => { const result = await run({ action: 'send', id: s.id, expectedRevision: s.revision, retry }); if (result) {
        setMailStates(p => ({ ...p, [s.id]: result.state }));
        setInfo('已建立本版本寄送排程；不代表收件匣已收到。');
    } };
    const batchSend = async () => { if (!window.confirm(`寄送本範圍 ${confirmed.length} 張已確認薪資單？已排程版本不會重複寄送。`))
        return; for (const s of confirmed) {
        const result = await run({ action: 'send', id: s.id, expectedRevision: s.revision, retry: false });
        if (!result)
            break;
        setMailStates(p => ({ ...p, [s.id]: result.state }));
    } };
    const loadHistory = async (s: Slip) => { try {
        const docs = await getDocs(collection(db, 'payrollSlips', s.id, 'versions'));
        setHistory(docs.docs.map(d => d.data() as Slip).sort((a, b) => b.revision - a.revision));
    }
    catch (e: any) {
        setError(e.message);
    } };
    const exportExcel = () => { const book = XLSX.utils.book_new(); const rows = shown.map(s => ({ '單號': s.id, '版本': s.revision, '姓名': s.employee.name, '月份': s.month, '計薪起日': s.periodStart, '計薪迄日': s.periodEnd, '狀態': statusLabel[s.status], '用途': s.kind === 'regular' ? '一般薪資' : '補發', '約定本薪或時薪': s.basis.baseSalary, '約定伙食費': s.basis.foodAllowance, ...Object.fromEntries(amountFields.map(k => [labels[k], s.amounts[k]])), ...Object.fromEntries(attendanceFields.map(k => [labels[k], s.attendance[k]])), '實發': totals(s.amounts).net, '備註': s.note, '原因': s.reason })); XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), '新薪資逐單'); XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(old.map(r => ({ '舊文件': r.id, '姓名': employees.find(e => e.id === r.employeeId)?.name || '員工主檔不存在', '月份': r.month, '說明': legacyIssues(r, legacy, employees).join('；') || '舊制保存值，確認及付款狀態未知', ...Object.fromEntries(amountFields.map(k => [labels[k], typeof r[k] === 'number' ? r[k] : '缺少'])), '保存值實發': amountFields.every(k => typeof r[k] === 'number') ? totals(legacyAmounts(r)).net : '無法計算' }))), '舊紀錄原值'); XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(summaryRows()), '員工分月核對'); XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['範圍', mode === 'monthly' ? month : month.slice(0, 4)], ['新制已確認實發小計', total], ['新制草稿張數', draft.length], ['舊制文件數', old.length], ['舊制待核對文件數', issues.length], ['說明', '新制小計未包含舊制文件及草稿；舊制保存值另列，不代表完整應付或已付款總額。']]), '合計範圍說明'); if (mode === 'yearly') {
        XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(annualRows()), '年度按員工彙總');
        XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(annualDetailRows()), '年度分類帳冊');
    } XLSX.writeFile(book, `${client.name}_${mode === 'monthly' ? month : month.slice(0, 4)}_薪資核對.xlsx`); };
    function summaryRows() { const keys = new Set([...shown.map(s => s.employeeId + '|' + s.month), ...old.map(r => r.employeeId + '|' + r.month)]); return [...keys].sort().map(key => { const [id, m] = key.split('|'); const ss = confirmed.filter(s => s.employeeId === id && s.month === m); const oo = old.filter(r => r.employeeId === id && r.month === m); const good = oo.filter(r => !legacyIssues(r, legacy, employees).length); return { '姓名': employees.find(e => e.id === id)?.name || shown.find(s => s.employeeId === id)?.employee.name || '員工主檔不存在', '月份': m, '新制已確認張數': ss.length, '新制已確認實發': ss.reduce((n, s) => n + totals(s.amounts).net, 0), '舊制可讀保存值小計': good.reduce((n, r) => n + totals(legacyAmounts(r)).net, 0), '舊制待核對文件': oo.length - good.length, '新制草稿': shown.filter(s => s.employeeId === id && s.month === m && s.status === 'draft').length }; }); }
    function annualRows() { const ids = new Set([...shown.map(s => s.employeeId), ...old.map(r => r.employeeId)]); return [...ids].map(id => { const employeeSlips = confirmed.filter(s => s.employeeId === id); return { '姓名': employees.find(e => e.id === id)?.name || shown.find(s => s.employeeId === id)?.employee.name || '員工主檔不存在', ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => { const m = month.slice(0, 4) + '-' + String(i + 1).padStart(2, '0'); return [String(i + 1) + '月', employeeSlips.filter(s => s.month === m).reduce((n, s) => n + totals(s.amounts).net, 0)]; })), '新制年度已確認實發': employeeSlips.reduce((n, s) => n + totals(s.amounts).net, 0), '舊制文件數': old.filter(r => r.employeeId === id).length, '舊制待核對數': issues.filter(r => r.employeeId === id).length }; }); }
    function annualDetailRows() { return [...new Set(confirmed.map(s => s.employeeId))].flatMap(id => { const es = confirmed.filter(s => s.employeeId === id); const rows = Object.keys(annualMetrics(emptyValues(amountFields))).map(metric => ({ '姓名': es[0].employee.name, '項目': metric, ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => { const m = month.slice(0, 4) + '-' + String(i + 1).padStart(2, '0'); return [(i + 1) + '月', es.filter(s => s.month === m).reduce((n, s) => n + annualMetrics(s.amounts)[metric], 0)]; })), '全年合計': es.reduce((n, s) => n + annualMetrics(s.amounts)[metric], 0) })); rows.push({ '姓名': es[0].employee.name, '項目': '健保投保金額（分段列示）', ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => { const m = month.slice(0, 4) + '-' + String(i + 1).padStart(2, '0'); return [(i + 1) + '月', es.filter(s => s.month === m).map(s => s.periodStart.slice(5) + '～' + s.periodEnd.slice(5) + '：' + (s.basis.hasHealthIns ? money(s.basis.insuranceBracket) : '未投保')).join('；')]; })), '全年合計': null }); return rows; }); }
    const field = (k: string, value: number, onChange: (n: number) => void, disabled = false) => <label key={k} className="block text-sm">{labels[k]}<input aria-label={labels[k]} type="number" min="0" step="any" value={value} disabled={disabled || busy} onChange={e => onChange(Number(e.target.value))} className="block w-full border rounded p-2 disabled:bg-gray-100"/></label>;
    if (!ready) return <div className="p-6 space-y-4"><button className={button} onClick={onBack}>返回客戶</button><p role="status">薪資資料尚未完整載入，暫不顯示合計或允許開單。</p>{error && <p role="alert">{error}</p>}</div>;
    return <div className="h-full overflow-auto bg-gray-50 p-5 space-y-5">
  <header className="flex flex-wrap gap-3 items-center"><button className={button} onClick={onBack}>返回客戶</button><h2 className="text-xl font-bold">{client.name} 薪資</h2><button className={button} onClick={onEmployees}>員工與復職</button><button className={button} onClick={() => setMode('monthly')}>每月薪資</button><button className={button} onClick={() => setMode('yearly')}>年度帳冊</button><label>{mode === 'monthly' ? '月份' : '年度（依選定月份的年份）'}<input aria-label="薪資月份" className="border rounded p-2 ml-2" type="month" value={month} onChange={e => { if (e.target.value)
        setMonth(e.target.value); }}/></label></header>
  {error && <div role="alert" className="bg-red-50 border border-red-300 p-3 whitespace-pre-wrap">{error}</div>}{info && <p role="status" className="bg-blue-50 p-3">{info}</p>}
  <section className="bg-white border rounded p-4 space-y-2"><p>新制已確認實發小計：<strong>{money(total)}</strong>；草稿 {draft.length} 張。確認不代表已付款。</p><p>舊制紀錄 {old.length} 份，其中 {issues.length} 份待核對。舊制可讀保存值另列：{money(oldComplete.reduce((n, r) => n + totals(legacyAmounts(r)).net, 0))}。</p><p className="text-amber-800">以上分開列示，不能當作完整應付總額。舊資料不會自動刪除、重算或與新單合併。</p><button disabled={!ready || busy} className={button} onClick={exportExcel}>匯出明細與核對說明</button> <button disabled={!ready || busy || !confirmed.length} className={button} onClick={batchSend}>寄送已確認單據</button></section>
  {mode === 'monthly' && <section className="bg-white border rounded p-4 space-y-3"><h3 className="font-bold">建立獨立薪資單</h3><div className="flex flex-wrap gap-3"><select aria-label="計薪員工" value={selectedEmployee} onChange={e => chooseEmployee(e.target.value)} className="border p-2"><option value="">選擇員工</option>{employees.filter(e => e.clientId === clientId).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select><select aria-label="任職期間" value={selectedPeriod} onChange={e => choosePeriod(e.target.value)} className="border p-2"><option value="">選擇任職期間</option>{emp && periods(emp).map(p => <option key={p.id} value={p.id}>{p.startDate}～{p.endDate || '在職'}（{p.type === 'full_time' ? '正職' : '兼職'}）</option>)}</select><label>計薪起日<input type="date" value={dates.start} onChange={e => setDates({ ...dates, start: e.target.value })} className="border p-2"/></label><label>計薪迄日<input type="date" value={dates.end} onChange={e => setDates({ ...dates, end: e.target.value })} className="border p-2"/></label><button disabled={!ready || busy} className={button} onClick={begin}>建立草稿</button></div><p className="text-sm text-gray-600">不足月本薪及伙食費由承辦人調整；同月每段任職各開一張。期間內調薪時再分開開單。</p></section>}
  <section className="bg-white border rounded p-4 overflow-x-auto"><h3 className="font-bold mb-3">新薪資單（每張單各列一行）</h3>{!ready ? <p>載入中…</p> : <table className="w-full text-sm"><thead><tr>{['姓名／月份', '計薪期間', '狀態／版本', '本薪', '伙食費', '實發', '操作'].map(h => <th key={h} className="text-left p-2">{h}</th>)}</tr></thead><tbody>{shown.map(s => <tr key={s.id} className="border-t"><td className="p-2">{s.employee.name}<br />{s.month}</td><td>{s.periodStart}～{s.periodEnd}<br />{s.kind === 'supplement' ? '補發' : s.replacesId ? '更正' : '一般薪資'}</td><td>{statusLabel[s.status]}／{s.revision}</td><td>{money(s.amounts.baseSalary)}</td><td>{money(s.amounts.foodAllowance)}</td><td>{money(totals(s.amounts).net)}</td><td className="p-2 space-x-2"><button className={button} onClick={() => setPreview(s)}>薪資單</button><button className={button} onClick={() => loadHistory(s)}>版本</button>{s.status === 'draft' && <><button disabled={busy} className={button} onClick={() => setEditing({ ...s, reviewedMonth: false })}>編輯</button><button disabled={busy} className={button} onClick={() => transition(s, 'confirm')}>確認</button></>}{s.status === 'confirmed' && <><button disabled={busy} className={button} onClick={() => revise(s)}>更正</button><button disabled={busy} className={button} onClick={() => send(s, mailStates[s.id] === 'ERROR')}>{mailStates[s.id] === 'ERROR' ? '失敗後重寄' : '寄送'}</button><button disabled={busy} className={button} onClick={async () => { const r = await run({ action: 'mailStatus', id: s.id }); if (r)
        setMailStates(p => ({ ...p, [s.id]: r.state })); }}>查寄送狀態</button><span>{mailLabel[mailStates[s.id]] || ''}</span></>}{['draft', 'confirmed'].includes(s.status) && <button disabled={busy} className={button} onClick={() => transition(s, 'void')}>作廢</button>}</td></tr>)}</tbody></table>}{ready && !shown.length && <p>此範圍尚無新薪資單。</p>}</section>
  <section className="bg-white border rounded p-4 overflow-auto"><h3 className="font-bold">員工分月核對（同月多張已確認單合計）</h3><table className="w-full text-sm"><thead><tr>{['姓名', '月份', '新制已確認張數', '新制已確認實發', '舊制可讀保存值小計', '舊制待核對文件', '新制草稿'].map(k => <th className="p-2" key={k}>{k}</th>)}</tr></thead><tbody>{summaryRows().map((r, i) => <tr key={i} className="border-t">{Object.values(r).map((v, j) => <td className="p-2" key={j}>{typeof v === 'number' ? money(v) : v}</td>)}</tr>)}</tbody></table></section>
  {mode === 'yearly' && <section className="bg-white border rounded p-4 overflow-auto"><h3 className="font-bold">年度按員工彙總（新制已確認實發，舊制另列）</h3><table className="text-sm w-full"><thead><tr>{['姓名', ...Array.from({ length: 12 }, (_, i) => (i + 1) + '月'), '新制年度已確認實發', '舊制文件數', '舊制待核對數'].map(k => <th key={k} className="p-2 whitespace-nowrap">{k}</th>)}</tr></thead><tbody>{annualRows().map((r, i) => <tr key={i} className="border-t">{Object.values(r).map((v, j) => <td key={j} className="p-2 whitespace-nowrap">{typeof v === 'number' ? money(v) : v}</td>)}</tr>)}</tbody></table></section>}
  {mode === 'yearly' && <section className="bg-white border rounded p-4 overflow-auto"><h3 className="font-bold">年度分類帳冊（新制已確認單據）</h3><table className="text-sm w-full"><thead><tr>{['姓名', '項目', ...Array.from({ length: 12 }, (_, i) => (i + 1) + '月'), '全年合計'].map(k => <th key={k} className="p-2 whitespace-nowrap">{k}</th>)}</tr></thead><tbody>{annualDetailRows().map((r, i) => <tr key={i} className="border-t">{Object.values(r).map((v, j) => <td key={j} className="p-2 whitespace-nowrap">{typeof v === 'number' ? money(v) : v ?? '—'}</td>)}</tr>)}</tbody></table></section>}
  <details className="bg-white border rounded p-4" open={issues.length > 0}><summary className="font-bold cursor-pointer">舊薪資原始紀錄／待核對（{old.length} 份，唯讀保留）</summary><div className="overflow-auto"><table className="text-sm w-full"><thead><tr><th>姓名／月份</th><th>文件</th><th>狀態說明</th>{amountFields.map(k => <th key={k}>{labels[k]}</th>)}</tr></thead><tbody>{old.map(r => <tr className="border-t" key={r.id}><td className="p-2">{employees.find(e => e.id === r.employeeId)?.name || '員工主檔不存在'}<br />{r.month}</td><td className="p-2">{r.id}</td><td className="p-2">{legacyIssues(r, legacy, employees).join('；') || '舊制保存值，確認及付款狀態未知'}</td>{amountFields.map(k => <td key={k} className="p-2 whitespace-nowrap">{typeof r[k] === 'number' ? money(r[k]) : '缺少'}</td>)}</tr>)}</tbody></table></div></details>
  {editing && <div className="fixed inset-0 z-50 bg-black/40 overflow-auto p-5"><div className="max-w-5xl mx-auto bg-white rounded p-5"><fieldset disabled={busy} className="space-y-4"><h3 className="text-xl font-bold">{editing.employee.name}／{editing.month} 薪資草稿</h3><p>{editing.periodStart}～{editing.periodEnd}；約定{editing.basis.employmentType === 'full_time' ? '月薪' : '時薪'} {money(editing.basis.baseSalary)}，約定伙食費 {money(editing.basis.foodAllowance)}。投保級距 {money(editing.basis.insuranceBracket)}；勞保 {editing.basis.hasLaborIns ? '是' : '否'}／健保 {editing.basis.hasHealthIns ? '是' : '否'}。</p><p>人工應付本薪與伙食費不會因修改其他欄位被覆蓋；請假、遲到、加班依約定待遇計算。</p>{error && <p role="alert" className="text-red-700">{error}</p>}{info && <p role="status">{info}</p>}
   <label>用途<select disabled={busy || !!editing.replacesId} value={editing.kind} onChange={e => setEditing({ ...editing, kind: e.target.value as Slip['kind'], reviewedMonth: false })} className="border p-2"><option value="regular">一般薪資</option><option value="supplement">補發（請將不需補發的預設金額改為零）</option></select></label>{editing.kind === 'supplement' && <label>原薪資單<select value={editing.relatedId} onChange={e => setEditing({ ...editing, relatedId: e.target.value })} className="border p-2"><option value="">選擇已確認單</option>{slips.filter(s => s.employeeId === editing.employeeId && s.status === 'confirmed').map(s => <option key={s.id} value={s.id}>{s.month} {s.periodStart}～{s.periodEnd} {money(totals(s.amounts).net)}</option>)}</select></label>}
   <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{attendanceFields.map(k => field(k, editing.attendance[k], n => changeAttendance(k, n)))}</div><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{amountFields.map(k => field(k, editing.amounts[k], n => setEditing({ ...editing, amounts: { ...editing.amounts, [k]: n } }), ['leaveDeduction', 'lateDeduction', 'taxFreeOt'].includes(k)))}</div>
   <p className="font-bold">本單實發：{money(totals(editing.amounts).net)}</p><label className="block">備註<textarea className="border w-full p-2" value={editing.note} maxLength={2000} onChange={e => setEditing({ ...editing, note: e.target.value })}/></label><label className="block">補發／更正原因<input className="border w-full p-2" value={editing.reason} maxLength={500} onChange={e => setEditing({ ...editing, reason: e.target.value })}/></label>
   <div className="bg-amber-50 p-3"><h4 className="font-bold">同月其他單據核對</h4>{slips.filter(s => s.id !== editing.id && s.employeeId === editing.employeeId && s.month === editing.month && ['draft', 'confirmed'].includes(s.status)).map(s => <p key={s.id}>{s.periodStart}～{s.periodEnd}／{statusLabel[s.status]}／實發 {money(totals(s.amounts).net)}；{['laborIns', 'healthIns', 'incomeTax', 'advancePay', 'pensionSelf', 'fullAttendance', 'positionAllowance', 'performanceBonus'].map(k => `${labels[k]} ${money(s.amounts[k])}`).join('、')}</p>)}<label><input type="checkbox" checked={editing.reviewedMonth} onChange={e => setEditing({ ...editing, reviewedMonth: e.target.checked })}/> 我已核對同月其他單據，確認本單加給及代扣沒有重複計入。</label></div>
   <div className="flex gap-3"><button disabled={busy} className={button} onClick={() => { if (window.confirm('關閉編輯？未儲存內容將不保留。')) {
            setEditing(null);
            setError('');
        } }}>關閉</button><button disabled={busy || !editing.reviewedMonth} className={button} onClick={save}>{busy ? '處理中…' : '保存草稿'}</button><button disabled={busy} className={button} onClick={() => setPreview(editing)}>預覽草稿</button></div><p className="text-sm">保存後關閉編輯，回到清單確認薪資。修改已確認金額請使用「更正」。</p></fieldset></div></div>}
  {preview && <div className="fixed inset-0 z-[60] bg-black/50 p-5 flex flex-col"><div className="bg-white p-2"><button className={button} onClick={() => setPreview(null)}>關閉預覽</button> <button className={button} onClick={() => { const frame = document.getElementById('salary-preview') as HTMLIFrameElement; frame.contentWindow?.print(); }}>列印／另存 PDF</button></div><iframe id="salary-preview" title="薪資單預覽" className="bg-white flex-1 w-full" srcDoc={slipHtml(preview)}/></div>}
  {history.length > 0 && <div className="fixed inset-0 z-50 bg-black/40 p-8 overflow-auto"><div className="bg-white p-5 max-w-2xl mx-auto"><h3 className="font-bold">保存版本</h3>{history.map(s => <p key={s.revision} className="p-2 border-b">第 {s.revision} 版／{statusLabel[s.status]}／{s.updatedAt}／實發 {money(totals(s.amounts).net)} <button className={button} onClick={() => setPreview(s)}>查看</button></p>)}<button className={button} onClick={() => setHistory([])}>關閉</button></div></div>}
 </div>;
}
