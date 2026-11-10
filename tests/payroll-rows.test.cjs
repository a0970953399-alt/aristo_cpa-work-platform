// Scenario matrix for the shared month data: new hire, leaver, rehire, pay change, supplement, old records and missing data.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const repo = path.resolve(__dirname, '..'), ts = require(path.join(repo, 'node_modules/typescript'));
function load(file, imports = {}) { const code = ts.transpileModule(fs.readFileSync(path.join(repo, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText; const exports = {}; new Function('exports', 'require', code)(exports, name => { if (imports[name]) return imports[name]; throw Error('unexpected import ' + name); }); return exports; }
const d = load('functions/src/payrollDomain.ts');
const display = load('payrollDisplay.ts', { './functions/src/payrollDomain': d });
const R = load('payrollRows.ts', { './functions/src/payrollDomain': d, './payrollDisplay': display });
const CUR = '2026-11', client = { id: 'c1', name: '測試客戶' };
const comp = (date, base = 36000, more = {}) => ({ id: 'c' + date + base, effectiveDate: date, baseSalary: base, foodAllowance: 3000, insuranceBracket: 36300, hasLaborIns: true, hasHealthIns: true, ...more });
const per = (id, start, end = null, type = 'full_time') => ({ id, type, startDate: start, endDate: end });
const emp = (id, hist, comps, more = {}) => ({ id, clientId: 'c1', name: id, email: id + '@example.com', empNo: id, employmentType: hist[hist.length - 1].type, startDate: hist[0].startDate, endDate: hist[hist.length - 1].endDate || '', employmentHistory: hist, compensationHistory: comps, ...more });
const zeroAtt = d.emptyValues(d.attendanceFields);
const slip = (id, e, pid, month, start, end, amounts, more = {}) => ({ id, schemaVersion: 2, revision: 1, clientId: 'c1', employeeId: e.id, employmentId: pid, month, periodStart: start, periodEnd: end, kind: 'regular', relatedId: '', replacesId: '', status: 'confirmed', basis: d.basisAt(e, e.employmentHistory.find(p => p.id === pid), start, end), amounts: { ...d.emptyValues(d.amountFields), ...amounts }, attendance: zeroAtt, employee: { name: e.name, email: e.email, empNo: e.empNo }, company: { name: 'x', phone: '', address: '' }, note: '', reason: '', reviewedMonth: false, createdAt: month + '-01', updatedAt: month + '-01', actor: 'u', ...more });
const pay = { baseSalary: 36000, foodAllowance: 3000, laborIns: 900, healthIns: 560 };
const old = (id, e, month, amounts = pay, more = {}) => ({ id, clientId: 'c1', employeeId: e, month, ...d.emptyValues(d.amountFields), ...d.emptyValues(d.attendanceFields), ...amounts, updatedAt: month, ...more });

const steady = emp('steady', [per('p', '2025-01-01')], [comp('2025-01-01')]);
const fresh = emp('fresh', [per('p', '2026-11-05')], [comp('2026-11-05')], { payrollEnrollmentRequired: ['p'] });
const drafted = emp('drafted', [per('p', '2026-11-03')], [comp('2026-11-03')], { payrollEnrollmentRequired: ['p'] });
const leaver = emp('leaver', [per('p', '2025-01-01', '2026-11-10')], [comp('2025-01-01')]);
const rehire = emp('rehire', [per('p1', '2025-01-01', '2026-11-03'), per('p2', '2026-11-20')], [comp('2025-01-01'), comp('2026-11-20')], { payrollEnrollmentRequired: ['p2'] });
const back = emp('back', [per('p1', '2025-01-01', '2026-09-30'), per('p2', '2026-11-10')], [comp('2025-01-01'), comp('2026-11-10')], { payrollEnrollmentRequired: ['p2'] });
const raise = emp('raise', [per('p', '2025-01-01')], [comp('2025-01-01'), comp('2026-11-16', 40000)]);
const extra = emp('extra', [per('p', '2025-01-01')], [comp('2025-01-01')]);
const legacyOk = emp('legacyok', [per('p', '2025-01-01')], [comp('2025-01-01')]);
const second = emp('second', [per('p', '2026-10-15')], [comp('2026-10-15')], { payrollAdmissions: ['p'] });
const part = emp('part', [per('p', '2025-01-01', null, 'part_time')], [comp('2025-01-01', 200, { foodAllowance: 0, hasHealthIns: false })]);
const noComp = emp('nocomp', [per('p', '2026-11-02')], [], { payrollEnrollmentRequired: ['p'] });
const lateComp = emp('latecomp', [per('p', '2026-11-01')], [comp('2026-11-05', 200, { foodAllowance: 0 })], { payrollEnrollmentRequired: ['p'] });
const noFood = emp('nofood', [per('p', '2026-11-02')], [{ ...comp('2026-11-02'), foodAllowance: undefined }], { payrollEnrollmentRequired: ['p'] });
const hiddenMonth = emp('hiddenmonth', [per('p', '2025-01-01')], [comp('2025-01-01')]);
const noPeriod = emp('noperiod', [per('p', '2024-12-14', '2025-02-22', 'part_time'), per('p2', '2026-09-12', null, 'part_time')], [comp('2024-12-14', 200, { foodAllowance: 0 })]);
const stub = emp('stub', [per('p', '2025-01-01')], [comp('2025-01-01')]);
const employees = [steady, fresh, drafted, leaver, rehire, back, raise, extra, legacyOk, second, part, noComp, lateComp, noFood, hiddenMonth, noPeriod, stub];
const slips = [
  slip('s-steady', steady, 'p', '2026-10', '2026-10-01', '2026-10-31', pay),
  slip('s-drafted', drafted, 'p', '2026-11', '2026-11-03', '2026-11-30', { ...pay, baseSalary: 33600 }, { status: 'draft' }),
  slip('s-rehire', rehire, 'p1', '2026-11', '2026-11-01', '2026-11-03', { ...pay, baseSalary: 3600, foodAllowance: 300 }),
  slip('s-extra', extra, 'p', '2026-11', '2026-11-01', '2026-11-30', pay),
  slip('s-extra-sup', extra, 'p', '2026-11', '2026-11-01', '2026-11-30', { performanceBonus: 5000 }, { kind: 'supplement', relatedId: 's-extra', reason: '補發', reviewedMonth: true }),
  slip('s-void', stub, 'p', '2026-11', '2026-11-01', '2026-11-30', pay, { status: 'void' }),
  slip('s-second', second, 'p', '2026-10', '2026-10-15', '2026-10-31', { ...pay, baseSalary: 20400, foodAllowance: 1700 }),
];
const legacy = [old('old-nov', 'legacyok', '2026-11'), old('old-noperiod', 'noperiod', '2026-03', { baseSalary: 7200, foodAllowance: 0 }), { id: 'old-stub', clientId: 'c1', employeeId: 'stub', month: '2026-04', isEmailSent: true, updatedAt: '2026-05-01' }];
const source = { client, employees, legacy, slips };
const rowsOf = m => R.buildMonthRows(m, source, CUR);
const forEmp = (m, id) => rowsOf(m).filter(r => r.sourceEmployeeId === id);

test('a saved previous month fills the next full month automatically and counts it', () => { const [r] = forEmp('2026-11', 'steady'); assert.equal(r.slip.revision, 0); assert.equal(r.excluded, false); });
test('a new hire is told what to fill, not that pay changed', () => { const [r] = forEmp('2026-11', 'fresh'); assert.equal(r.excluded, true); assert.match(r.reason, /本月不足月/); assert.doesNotMatch(r.reason, /待遇變動/); });
test('a rehire is told what to fill, not that pay changed', () => { for (const id of ['rehire', 'back']) { const r = forEmp('2026-11', id).find(x => x.periodId === 'p2'); assert.match(r.reason, /本月不足月/); } });
test('a real mid-month pay change keeps two rows with a pay change reason', () => { const rows = forEmp('2026-11', 'raise'); assert.equal(rows.length, 2); for (const r of rows) assert.match(r.reason, /待遇變動/); assert.deepEqual(rows.map(r => r.recommendedStart), ['2026-11-01', '2026-11-16']); });
test('a leaver only has the days before leaving', () => { const [r] = forEmp('2026-11', 'leaver'); assert.equal(r.recommendedEnd, '2026-11-10'); assert.match(r.reason, /本月不足月/); assert.equal(forEmp('2026-12', 'leaver').length, 0); });
test('the same-month rehire keeps the saved slip and one row to fill', () => { const rows = forEmp('2026-11', 'rehire'); assert.equal(rows.length, 2); assert.equal(rows.filter(r => r.slip).length, 1); assert.equal(rows.filter(r => r.excluded).length, 1); });
test('missing pay data is named instead of being called a partial month', () => { assert.match(forEmp('2026-11', 'nocomp')[0].reason, /尚無已生效待遇/); assert.match(forEmp('2026-11', 'nofood')[0].reason, /約定伙食費/); });
test('days before the first pay record say so, and the covered days stay separate', () => { const rows = forEmp('2026-11', 'latecomp'); assert.equal(rows.length, 2); assert.match(rows[0].reason, /尚無已生效待遇/); assert.match(rows[1].reason, /兼職|不足月|待遇變動/); });
test('a part-time month asks for hours', () => { assert.match(forEmp('2026-11', 'part')[0].reason, /兼職請填寫工時/); });
test('the month after a partial first month fills from it automatically', () => { const [r] = forEmp('2026-11', 'second'); assert.equal(r.excluded, false); assert.equal(r.slip.revision, 0); assert.equal(r.slip.amounts.baseSalary, 36000); assert.equal(r.slip.amounts.laborIns, 900); });
test('an older saved draft counts like any saved slip', () => { const [r] = forEmp('2026-11', 'drafted'); assert.equal(r.excluded, false); assert.equal(R.includedRows([r]).length, 1); });
test('a supplement is a second counted row', () => { const rows = forEmp('2026-11', 'extra'); assert.equal(rows.length, 2); assert.equal(R.includedRows(rows).length, 2); });
// Hidden old records sit in the recycle bin: the month is open like any other and no hidden amount shows.
test('hidden old records no longer reserve the month', () => {
  const hiddenNov = old('hidden-nov', 'hiddenmonth', '2026-11', { ...pay, performanceBonus: 999 }, { temporaryPayrollHidden: true });
  const rows = R.buildMonthRows('2026-11', source, CUR).filter(r => r.sourceEmployeeId === 'hiddenmonth');
  assert.equal(rows.length, 1); assert.equal(rows[0].legacyRecord, undefined); assert.notEqual(rows[0].reason, '這個月有暫藏的舊薪資，請先核對');
  assert.equal(R.rowDataProblem(rows[0]), '');
  const p = hiddenMonth.employmentHistory[0];
  const prevOct = old('old-oct', 'hiddenmonth', '2026-10', pay);
  assert.ok(d.recurringPayroll(hiddenMonth, p, '2026-11', client, [], [prevOct, hiddenNov], CUR), 'a hidden record must not stop the automatic row');
  assert.equal(d.recurringPayroll(hiddenMonth, p, '2026-11', client, [], [prevOct, { ...hiddenNov, temporaryPayrollHidden: false }], CUR), null, 'a visible record still stops it');
  const slip = d.recurringPayroll(hiddenMonth, p, '2026-11', client, [], [prevOct], CUR);
  assert.doesNotThrow(() => d.validateSlip(slip, hiddenMonth, [], [hiddenNov]));
  assert.throws(() => d.validateSlip(slip, hiddenMonth, [], [{ ...hiddenNov, temporaryPayrollHidden: undefined }]), /該月已有舊薪資/);
});
test('the recycle bin lists hidden records with a reason and writes nothing', () => {
  const twin = old('twin-visible', 'legacyok', '2026-11');
  const hidden = [
    old('h-orphan', 'gone', '2026-03', { baseSalary: 1000 }, { temporaryPayrollHidden: true }),
    old('h-same', 'legacyok', '2026-11', pay, { temporaryPayrollHidden: true }),
    old('h-diff', 'legacyok', '2026-11', { ...pay, performanceBonus: 1 }, { temporaryPayrollHidden: true }),
    old('h-outside', 'noperiod', '2026-04', { baseSalary: 7200 }, { temporaryPayrollHidden: true }),
    old('h-plain', 'extra', '2026-05', pay, { temporaryPayrollHidden: true }),
  ];
  const hiddenPerson = emp('hiddenperson', [per('p', '2025-01-01')], [comp('2025-01-01')], { temporaryPayrollHidden: true, name: '暫藏員工', empNo: '099' });
  const before = JSON.stringify(hidden);
  const items = R.recycleItems(hidden, [hiddenPerson], employees, [twin]);
  assert.equal(JSON.stringify(hidden), before);
  const why = Object.fromEntries(items.map(i => [i.id, i.why]));
  assert.equal(why['legacy:h-orphan'], '員工資料已不存在'); assert.equal(items.find(i => i.id === 'legacy:h-orphan').who, '（員工資料已不存在）');
  assert.equal(why['legacy:h-same'], '同月重複，內容相同'); assert.equal(why['legacy:h-diff'], '同月另有一筆薪資');
  assert.equal(why['legacy:h-outside'], '不在任職期間'); assert.equal(why['legacy:h-plain'], '已暫藏');
  assert.equal(items.find(i => i.id === 'legacy:h-orphan').net, d.totals(d.legacyAmounts(hidden[0])).net);
  const person = items.find(i => i.id === 'employee:hiddenperson'); assert.equal(person.kind, '員工'); assert.equal(person.who, '暫藏員工（099）'); assert.equal(person.net, null);
  assert.deepEqual(items.filter(i => i.kind === '薪資').map(i => i.month), ['2026-03', '2026-04', '2026-05', '2026-11', '2026-11']);
  assert.deepEqual(R.recycleItems([], [], employees, legacy), []);
});
test('a voided slip brings the row back to filling', () => { const [r] = forEmp('2026-11', 'stub'); assert.equal(r.slip, undefined); assert.match(r.reason, /已作廢/); });
test('old records are counted only when clean', () => { assert.equal(forEmp('2026-11', 'legacyok')[0].excluded, false); const a = forEmp('2026-03', 'noperiod')[0]; assert.equal(a.excluded, true); assert.match(a.warning, /任職期間不符/); const b = forEmp('2026-04', 'stub')[0]; assert.equal(b.excluded, true); assert.match(b.warning, /金額明細不完整/); });
test('old record amounts are read as saved, never recalculated', () => { const a = R.rowAmounts(forEmp('2026-11', 'legacyok')[0]); assert.equal(a.baseSalary, 36000); assert.equal(d.totals(a).net, 37540); });
test('row values never throw on missing pay data', () => { const r = forEmp('2026-11', 'nocomp')[0]; assert.equal(R.rowValues(r, '2026-11', employees).baseSalary, 0); });

for (const m of ['2026-03', '2026-04', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01']) test('totals equal the sum of counted rows in ' + m, () => {
  const rows = rowsOf(m), t = R.monthTotals(rows), inc = R.includedRows(rows), sum = (f) => inc.reduce((n, r) => n + f(R.rowAmounts(r)), 0);
  assert.equal(t.net, sum(a => d.totals(a).net)); assert.equal(t.addTotal, sum(a => d.totals(a).add)); assert.equal(t.dedTotal, sum(a => d.totals(a).deduct)); assert.equal(t.freeTotal, sum(a => d.totals(a).exempt)); assert.equal(t.withTotal, sum(a => d.totals(a).withholding)); assert.equal(t.taxable, t.addTotal - t.dedTotal);
  assert.equal(t.base + t.fullAtt + t.pos + t.perf + t.taxOt, t.addTotal); assert.equal(t.leave + t.short + t.late + t.pension, t.dedTotal); assert.equal(t.food + t.freeOt, t.freeTotal); assert.equal(t.labor + t.health + t.tax + t.advance, t.withTotal);
  assert.equal(new Set(rows.map(r => r.id)).size, rows.length, 'row ids must be unique');
  for (const r of rows) if (!r.slip && !r.legacyRecord) assert.equal(r.excluded, true);
});
test('November totals match the scenario by hand', () => { const t = R.monthTotals(rowsOf('2026-11')); assert.equal(t.net, 37540 /*steady*/ + 35140 /*drafted*/ + 2440 /*rehire*/ + 37540 + 5000 /*extra*/ + 37540 /*legacyok*/ + 37540 /*second*/); });
test('future months do not fill automatically', () => { assert.equal(forEmp('2026-12', 'steady')[0].excluded, true); assert.match(forEmp('2026-12', 'steady')[0].reason, /未來月份/); });

// One person per line: grouping, states and labels used by the month table and Excel export.
const groupOf = (m, id, mail = null) => R.groupMonthRows(rowsOf(m), mail, m, employees).find(g => g.employeeId === id);
test('every person has exactly one line in every month', () => { for (const m of ['2026-03', '2026-10', '2026-11', '2026-12']) { const gs = R.groupMonthRows(rowsOf(m), null, m, employees); assert.equal(new Set(gs.map(g => g.employeeId)).size, gs.length); assert.equal(gs.flatMap(g => g.rows).length, rowsOf(m).length); } });
test('lines show the right state', () => {
  assert.equal(groupOf('2026-11', 'steady').state, 'ready');
  assert.equal(groupOf('2026-11', 'fresh').state, 'fill');
  assert.equal(groupOf('2026-11', 'drafted').state, 'ready');
  const rehireGroup = groupOf('2026-11', 'rehire'); assert.equal(rehireGroup.state, 'fill'); assert.equal(rehireGroup.fillCount, 1);
  assert.equal(groupOf('2026-11', 'extra', { 's-extra': 'SUCCESS', 's-extra-sup': 'PENDING' }).state, 'sent');
  assert.equal(groupOf('2026-11', 'extra', { 's-extra': 'SUCCESS' }).state, 'ready');
  assert.equal(groupOf('2026-11', 'extra', { 's-extra': 'ERROR', 's-extra-sup': 'SUCCESS' }).state, 'ready');
  assert.equal(groupOf('2026-11', 'legacyok', { 'old-nov': 'UNTRACKED' }).state, 'sent');
});
test('state labels stay honest about what is waiting', () => {
  assert.equal(R.rowStateLabel(forEmp('2026-11', 'fresh')[0], null), '待填');
  assert.equal(R.rowStateLabel(forEmp('2026-11', 'drafted')[0], null), '待寄');
  assert.equal(R.rowStateLabel(forEmp('2026-04', 'stub')[0], null), '待核對');
  assert.equal(R.rowStateLabel(forEmp('2026-11', 'steady')[0], null), '待寄');
});
test('period labels read as a person would say them', () => {
  assert.equal(groupOf('2026-11', 'steady').period, '整月');
  assert.equal(groupOf('2026-11', 'fresh').period, '11/5 到職');
  assert.equal(groupOf('2026-11', 'leaver').period, '11/10 離職');
  assert.equal(groupOf('2026-11', 'back').period, '11/10 復職');
  assert.equal(groupOf('2026-11', 'rehire').period, '11/1–11/3、11/20–11/30');
  assert.equal(groupOf('2026-11', 'raise').period, '11/1–11/15、11/16–11/30');
  assert.equal(groupOf('2026-11', 'extra').period, '整月');
  assert.equal(groupOf('2026-11', 'legacyok').period, '整月');
});
test('a saved later slip and its unfilled earlier days list in date order', () => { const late = emp('late', [per('p', '2026-10-01', null, 'part_time')], [comp('2026-10-05', 200, { foodAllowance: 0 })]); const s = slip('s-late', late, 'p', '2026-10', '2026-10-05', '2026-10-31', { baseSalary: 22400, laborIns: 277, healthIns: 475 }); const rows = R.buildMonthRows('2026-10', { client, employees: [late], legacy: [], slips: [s], hiddenLegacy: [] }, CUR); const [g] = R.groupMonthRows(rows, null, '2026-10', [late]); assert.equal(g.period, '10/1–10/4、10/5–10/31'); assert.deepEqual(g.rows.map(r => R.rowPeriodText(r, '2026-10')), ['10/1–10/4', '10/5–10/31']); assert.equal(R.rowDataProblem(g.rows[0]), '缺待遇資料'); });
test('a supplement is named and listed after its slip', () => { const g = groupOf('2026-11', 'extra'); assert.deepEqual(g.rows.map(r => R.rowPeriodText(r, '2026-11')), ['11/1–11/30', '補發']); });
test('only blocking data problems are shown on the line', () => {
  assert.equal(R.rowDataProblem(forEmp('2026-11', 'fresh')[0]), '');
  assert.equal(R.rowDataProblem(forEmp('2026-11', 'part')[0]), '');
  assert.equal(R.rowDataProblem(forEmp('2026-11', 'nocomp')[0]), '缺待遇資料');
  assert.equal(R.rowDataProblem(forEmp('2026-11', 'nofood')[0]), '缺待遇資料');
  assert.match(R.rowDataProblem(forEmp('2026-04', 'stub')[0]), /金額明細不完整/);
});
test('merged values add a person\'s slips, and match the month totals', () => {
  const g = groupOf('2026-11', 'extra'); const v = R.mergedValues(g.included); assert.equal(v.baseSalary, 36000); assert.equal(v.performanceBonus, 5000); assert.equal(d.totals(v).net, 42540);
  for (const m of ['2026-10', '2026-11']) { const gs = R.groupMonthRows(R.includedRows(rowsOf(m)), null, m, employees); assert.equal(gs.reduce((n, x) => n + d.totals(R.mergedValues(x.rows)).net, 0), R.monthTotals(rowsOf(m)).net); }
});
test('attendance amounts are read from the slip; old records report none', () => { assert.equal(R.partAmount(forEmp('2026-11', 'legacyok')[0], 'sickLeave', 'leaveDeduction'), null); assert.equal(R.partAmount(forEmp('2026-11', 'fresh')[0], 'sickLeave', 'leaveDeduction'), 0); });
test('months handled outside the platform are never picked up by batch send', () => { assert.equal(R.PLATFORM_SEND_FROM, '2026-11'); const hook = fs.readFileSync(path.join(repo, 'usePayrollPresentation.ts'), 'utf8'); assert(hook.includes('if(month<PLATFORM_SEND_FROM)')); });
test('a slip marked as sent shows as sent even before mail states load', () => {
  const row = forEmp('2026-11', 'extra').find(r => r.slip && r.slip.kind === 'regular');
  assert.equal(R.rowMonthState({ ...row, slip: { ...row.slip, isEmailSent: true } }, null), 'sent');
  assert.equal(R.rowStateLabel({ ...row, slip: { ...row.slip, isEmailSent: true } }, {}), '已寄');
  assert.notEqual(R.rowMonthState(row, null), 'sent');
});
