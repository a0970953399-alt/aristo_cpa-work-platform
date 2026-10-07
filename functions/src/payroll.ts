import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createHash } from 'node:crypto';
import { Slip, assert, periods, slipPeriod, validatePeriods, validDate, basisAt, sameBasis, numbers, amountFields, attendanceFields, calculate, validateSlip, slipHtml } from './payrollDomain.js';
const key = (value: unknown) => { assert(typeof value === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(value), '識別碼不正確'); return value as string; };
const text = (value: unknown, max = 2000) => { assert(typeof value === 'string' && value.length <= max, '文字欄位不正確'); return value as string; };
const canonical = (v: any): string => JSON.stringify(v && typeof v === 'object' ? Array.isArray(v) ? v.map(x => JSON.parse(canonical(x))) : Object.fromEntries(Object.keys(v).sort().map(k => [k, JSON.parse(canonical(v[k]))])) : v);
// All mutations run here. Direct browser writes are denied by Rules, including old clients.
export const payrollCommand = onCall({ region: 'asia-east1' }, async (request) => {
    if (!request.auth)
        throw new HttpsError('unauthenticated', '請先登入');
    const db = getFirestore();
    try {
        const data = request.data;
        assert(data && typeof data === 'object', '缺少操作內容');
        const op = key(data.operationId);
        const clientId = key(data.clientId);
        const action = text(data.action, 40);
        const digest = createHash('sha256').update(JSON.stringify(data)).digest('hex');
        return await db.runTransaction(async (tx) => {
            const profile = await tx.get(db.doc('googleUserProfiles/' + request.auth!.uid));
            assert(profile.exists, '帳號尚未綁定');
            const uid = key(profile.data()!.userId);
            const user = await tx.get(db.doc('users/' + uid));
            const u = user.data();
            if (!u || u.isActive === false || u.googleUid !== request.auth!.uid || !(['boss', 'supervisor'].includes(u.role) || u.permissions?.payroll === true))
                throw new HttpsError('permission-denied', '沒有薪資操作權限');
            const receiptRef = db.doc('payrollOperations/' + op);
            const receipt = await tx.get(receiptRef);
            if (receipt.exists) {
                assert(receipt.data()!.digest === digest && receipt.data()!.actor === uid, '重試內容不一致，請重新整理');
                return receipt.data()!.result;
            }
            const company = await tx.get(db.doc('clients/' + clientId));
            assert(company.exists, '客戶不存在');
            const enabled = await tx.get(db.collection('payrollClients').where('clientId', '==', clientId));
            assert(!enabled.empty, '客戶尚未開通薪資');
            const oldRecords = await tx.get(db.collection('monthlySalaries').where('clientId', '==', clientId));
            const slipsResult = await tx.get(db.collection('payrollSlips').where('clientId', '==', clientId));
            const legacy: any[] = oldRecords.docs.map(d => ({ ...d.data(), id: d.id }));
            const slips = slipsResult.docs.map(d => ({ ...d.data(), id: d.id } as Slip));
            const now = new Date().toISOString();
            let result: any = {};
            const writeSlip = (s: Slip) => { tx.set(db.doc('payrollSlips/' + s.id), s); tx.create(db.doc(`payrollSlips/${s.id}/versions/${s.revision}`), s); };
            if (action === 'saveEmployee') {
                const raw = data.employee;
                const id = key(raw?.id);
                const ref = db.doc('employees/' + id);
                const prev = await tx.get(ref);
                const before = prev.data();
                assert(!before || before.clientId === clientId, '員工不屬於此客戶');
                assert(canonical(before ? { ...before, id } : null) === canonical(data.expected || null), '員工資料已變更，請重新開啟後再儲存');
                const emp: any = { id, clientId };
                for (const field of ['empNo', 'name', 'email', 'idNumber', 'bankBranch', 'bankAccount', 'address'])
                    emp[field] = text(raw[field] ?? '', 500);
                assert(emp.name.trim(), '請填寫姓名');
                assert(!emp.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emp.email), '電子郵件格式不正確');
                const ps = periods(raw);
                validatePeriods(ps);
                emp.employmentHistory = ps.map(p => ({ id: key(p.id), type: p.type, startDate: p.startDate, endDate: p.endDate }));
                const comps = raw.compensationHistory || [];
                assert(Array.isArray(comps), '待遇資料不正確');
                assert(new Set(comps.map((c: any) => c.id)).size === comps.length, '待遇紀錄編號重複');
                const dates = new Set();
                emp.compensationHistory = comps.map((c: any) => { assert(validDate(c.effectiveDate) && !dates.has(c.effectiveDate), '待遇生效日期不正確或重複'); dates.add(c.effectiveDate); const out: any = { id: key(c.id), effectiveDate: c.effectiveDate }; for (const k of ['baseSalary', 'insuranceBracket']) {
                    assert(typeof c[k] === 'number' && Number.isFinite(c[k]) && c[k] >= 0 && c[k] <= 100000000, '待遇金額不正確');
                    out[k] = c[k];
                } if (c.foodAllowance !== undefined) {
                    assert(typeof c.foodAllowance === 'number' && Number.isFinite(c.foodAllowance) && c.foodAllowance >= 0 && c.foodAllowance <= 100000000, '伙食費不正確');
                    out.foodAllowance = c.foodAllowance;
                } for (const k of ['hasLaborIns', 'hasHealthIns']) {
                    assert(typeof c[k] === 'boolean', '投保設定不正確');
                    out[k] = c[k];
                } return out; });
                const sorted = [...emp.employmentHistory].sort((a, b) => a.startDate.localeCompare(b.startDate));
                const last = sorted[sorted.length - 1];
                emp.startDate = sorted[0].startDate;
                emp.endDate = last.endDate ?? '';
                emp.employmentType = last.type;
                for (const k of ['defaultBaseSalary', 'defaultFoodAllowance', 'insuranceBracket']) {
                    assert(typeof raw[k] === 'number' && Number.isFinite(raw[k]) && raw[k] >= 0, '預設待遇不正確');
                    emp[k] = raw[k];
                }
                emp.hasLaborIns = raw.hasLaborIns ?? true;
                emp.hasHealthIns = raw.hasHealthIns ?? true;
                emp.createdAt = before?.createdAt || now;
                for (const s of slips.filter(x => x.employeeId === id)) {
                    const p = emp.employmentHistory.find((x: any) => x.id === s.employmentId);
                    const old = before && periods(before).find(x => x.id === s.employmentId);
                    assert(p && old && p.startDate === old.startDate && p.type === old.type && (!p.endDate || p.endDate >= s.periodEnd), '已有薪資引用的任職期間不能刪除、改起日／身分或縮短至計薪期間之前');
                }
                if (before && legacy.some((x: any) => x.employeeId === id))
                    for (const p of periods({ ...before, id })) {
                        assert(emp.employmentHistory.some((x: any) => x.id === p.id), '仍有舊薪資的員工必須保留既有任職歷程；歷史清理需另行核對');
                    }
                // Preserve pre-existing fields. Never rewrite or delete any legacy salary.
                tx.set(ref, emp, { merge: true });
                result = { id };
            }
            else if (action === 'saveLegacySeptember' || action === 'sendLegacySeptember' || action === 'legacySeptemberMailStatus') {
                assert(['boss', 'supervisor'].includes(u.role), '僅主管或老闆可處理舊薪資');
                const id = key(data.id);
                const old = legacy.find((x: any) => x.id === id);
                assert(old && old.month === '2026-09' && old.clientId === clientId && old.temporaryPayrollHidden !== true, '找不到可處理的 2026 年 9 月薪資');
                const record = old!;
                const revision = record.legacySeptemberRevision || 0;
                const ref = db.doc('monthlySalaries/' + id);
                if (action === 'saveLegacySeptember') {
                    assert(!record.isEmailSent && !record.legacySeptemberMailId, '已寄送或排程的舊薪資不能再修改');
                    assert(legacy.filter((x: any) => x.employeeId === record.employeeId && x.month === record.month && x.temporaryPayrollHidden !== true).length === 1, '同員工同月仍有多筆可見薪資，請先核對');
                    assert(!slips.some(s => s.employeeId === record.employeeId && s.month === record.month && s.status !== 'void' && s.status !== 'superseded'), '同月已有新薪資單，不能修改舊薪資');
                    assert(revision === data.expectedRevision && canonical(record) === canonical(data.expected), '薪資資料已變更，請重新開啟');
                    const employee = await tx.get(db.doc('employees/' + key(record.employeeId)));
                    assert(employee.exists && employee.data()!.clientId === clientId, '員工主檔不存在或不屬於此客戶');
                    const amounts = numbers(data.amounts, amountFields);
                    const attendance = numbers(data.attendance, attendanceFields);
                    const changes = { ...amounts, ...attendance };
                    assert([...amountFields, ...attendanceFields].some(k => record[k] !== changes[k]), '薪資明細沒有變更');
                    const reason = text(data.reason || '', 500).trim();
                    assert(reason, '請填寫更正原因');
                    const next = { ...record, ...changes, legacySeptemberRevision: revision + 1, updatedAt: now };
                    tx.create(db.doc(`monthlySalaries/${id}/versions/${revision + 1}`), { before: record, after: next, reason, actor: uid, changedAt: now });
                    tx.set(ref, next, { merge: true });
                    result = { record: next };
                }
                else {
                    const emp = await tx.get(db.doc('employees/' + key(record.employeeId)));
                    assert(emp.exists && emp.data()!.clientId === clientId, '員工主檔不存在或不屬於此客戶');
                    const employee = emp.data()!;
                    if (action === 'legacySeptemberMailStatus') {
                        const mailId = record.legacySeptemberMailId;
                        if (!mailId) return { state: 'NONE' };
                        const mail = await tx.get(db.doc('mail/' + key(mailId)));
                        return { state: mail.data()?.delivery?.state || 'PENDING' };
                    }
                    assert(revision === data.expectedRevision, '薪資版本已變更，請重新開啟');
                    assert(!record.isEmailSent, '這份舊薪資已有寄信標記，請先核對');
                    assert(legacy.filter((x: any) => x.employeeId === record.employeeId && x.month === record.month && x.temporaryPayrollHidden !== true).length === 1, '同員工同月仍有多筆可見薪資，請先核對');
                    assert(!slips.some(s => s.employeeId === record.employeeId && s.month === record.month && s.status !== 'void' && s.status !== 'superseded'), '同月已有新薪資單，不能重複寄送');
                    const amounts = numbers(record, amountFields), attendance = numbers(record, attendanceFields);
                    assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email || ''), '員工主檔沒有有效收件信箱');
                    const dispatchRef = db.doc(`payrollDispatch/legacy_${id}_${revision}`);
                    const dispatch = await tx.get(dispatchRef);
                    assert(!record.legacySeptemberMailId || dispatch.exists && record.legacySeptemberMailId === dispatch.data()!.mailId, '寄送紀錄不一致，請先查明');
                    let attempt = 1;
                    if (dispatch.exists) {
                        const previous = await tx.get(db.doc('mail/' + key(dispatch.data()!.mailId)));
                        const state = previous.data()?.delivery?.state || 'PENDING';
                        if (data.retry !== true) return { mailId: dispatch.data()!.mailId, state, alreadyQueued: true };
                        assert(state === 'ERROR', '此版本已排程或寄送；只有明確失敗後可重試');
                        attempt = dispatch.data()!.attempt + 1;
                    }
                    const mailId = `legacyPayroll_${id}_${revision}_${attempt}`;
                    const c = company.data()!;
                    const snapshot = { id, schemaVersion: 2, revision, month: record.month, periodStart: '2026-09-01', periodEnd: '2026-09-30', status: 'confirmed', amounts, attendance, employee: { name: employee.name, email: employee.email, empNo: employee.empNo || '', idNumber: employee.idNumber || '', bankAccount: employee.bankAccount || '' }, company: { name: String(c.fullName || c.name || ''), phone: String(c.phone || ''), address: String(c.contactAddress || c.regAddress || '') }, note: '舊制 2026 年 9 月薪資，已核對後寄送', reason: '' } as Slip;
                    tx.create(db.doc('mail/' + mailId), { to: employee.email, message: { subject: `${snapshot.company.name} 2026-09 薪資單`, html: slipHtml(snapshot, slipPeriod(snapshot, { ...employee, id: record.employeeId })) }, salaryId: id, salaryVersion: revision, clientId, createdAt: now });
                    tx.set(dispatchRef, { clientId, slipId: id, revision, mailId, attempt, requestedAt: now, actor: uid });
                    tx.set(ref, { legacySeptemberMailId: mailId }, { merge: true });
                    result = { mailId, state: 'PENDING' };
                }
            }
            else if (action === 'saveSlip') {
                const raw = data.slip;
                const id = key(raw?.id);
                const target = await tx.get(db.doc('payrollSlips/' + id));
                assert(!target.exists || target.data()!.clientId === clientId, '單據不屬於此客戶');
                const current = slips.find(s => s.id === id);
                assert(!current || current.status === 'draft', '已確認或已作廢薪資不能直接修改');
                assert((current?.revision || 0) === data.expectedRevision, '薪資版本已變更，請重新開啟');
                const employeeId = key(raw.employeeId);
                const empDoc = await tx.get(db.doc('employees/' + employeeId));
                assert(empDoc.exists, '員工不存在');
                const emp = { ...empDoc.data(), id: employeeId };
                assert(!current || current.employeeId === employeeId, '不能更換已保存單據的員工');
                const employmentId = key(raw.employmentId);
                const p = periods(emp).find(x => x.id === employmentId);
                assert(p, '任職期間不存在');
                const start = text(raw.periodStart, 10), end = text(raw.periodEnd, 10);
                const basis = basisAt(emp, p!, start, end);
                const attendance = numbers(raw.attendance, attendanceFields);
                const amounts = calculate(basis, attendance, numbers(raw.amounts, amountFields));
                const c = company.data()!;
                const s: Slip = { id, schemaVersion: 2, revision: (current?.revision || 0) + 1, clientId, employeeId, employmentId, month: text(raw.month, 7), periodStart: start, periodEnd: end, kind: raw.kind, relatedId: raw.relatedId ? key(raw.relatedId) : '', replacesId: raw.replacesId ? key(raw.replacesId) : '', status: 'draft', basis, amounts, attendance, employee: { name: text((emp as any).name, 500), email: text((emp as any).email || '', 500), empNo: text((emp as any).empNo || '', 500), idNumber: text((emp as any).idNumber || '', 50), bankAccount: text((emp as any).bankAccount || '', 100) }, company: { name: String(c.fullName || c.name || ''), phone: String(c.phone || ''), address: String(c.contactAddress || c.regAddress || '') }, note: text(raw.note || ''), reason: text(raw.reason || '', 500), reviewedMonth: raw.reviewedMonth === true, createdAt: current?.createdAt || now, updatedAt: now, actor: uid };
                validateSlip(s, emp, slips, legacy);
                writeSlip(s);
                result = { slip: s };
            }
            else if (action === 'confirm' || action === 'void') {
                const id = key(data.id);
                const current = slips.find(s => s.id === id);
                assert(current, '找不到薪資單');
                const s = current!;
                assert(s.revision === data.expectedRevision, '薪資版本已變更，請重新開啟');
                assert(action === 'confirm' ? s.status === 'draft' : s.status === 'draft' || s.status === 'confirmed', '此狀態不能進行該操作');
                const reason = text(data.reason || '', 500);
                if (action === 'void')
                    assert(reason.trim(), '請填作廢原因');
                if (action === 'confirm') {
                    const empDoc = await tx.get(db.doc('employees/' + s.employeeId));
                    assert(empDoc.exists, '員工不存在');
                    const emp = { ...empDoc.data(), id: s.employeeId };
                    validateSlip(s, emp, slips, legacy);
                    const p = periods(emp).find(x => x.id === s.employmentId)!;
                    assert(sameBasis(basisAt(emp, p, s.periodStart, s.periodEnd), s.basis), '待遇已變更，請重新編輯並儲存草稿');
                    if (s.replacesId) {
                        const old = slips.find(x => x.id === s.replacesId)!;
                        writeSlip({ ...old, status: 'superseded', revision: old.revision + 1, updatedAt: now, actor: uid, reason: '由 ' + s.id + ' 更正取代' });
                    }
                }
                const next: Slip = { ...s, status: action === 'confirm' ? 'confirmed' : 'void', revision: s.revision + 1, updatedAt: now, actor: uid, reason: reason || s.reason };
                writeSlip(next);
                result = { slip: next };
            }
            else if (action === 'send') {
                const id = key(data.id);
                const s = slips.find(x => x.id === id);
                assert(s && s.status === 'confirmed' && s.revision === data.expectedRevision, '僅能寄送目前已確認版本');
                assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s!.employee.email), '本單未保存有效收件信箱，請建立更正版本');
                const dispatchRef = db.doc(`payrollDispatch/${id}_${s!.revision}`);
                const dispatch = await tx.get(dispatchRef);
                let attempt = 1;
                if (dispatch.exists) {
                    const mail = await tx.get(db.doc('mail/' + dispatch.data()!.mailId));
                    const state = mail.data()?.delivery?.state || 'PENDING';
                    if (data.retry !== true)
                        return { mailId: dispatch.data()!.mailId, state, alreadyQueued: true };
                    assert(state === 'ERROR', '此版本已排程或寄送；只有明確失敗後可重試');
                    attempt = dispatch.data()!.attempt + 1;
                }
                const mailId = `payroll_${id}_${s!.revision}_${attempt}`;
                const employee = await tx.get(db.doc('employees/' + s!.employeeId));
                const employment = employee.exists ? slipPeriod(s!, { ...employee.data(), id: s!.employeeId }) : undefined;
                tx.create(db.doc('mail/' + mailId), { to: s!.employee.email, message: { subject: `${s!.company.name} ${s!.month} 薪資單（${s!.periodStart}～${s!.periodEnd}）`, html: slipHtml(s!, employment) }, salaryId: id, salaryVersion: s!.revision, clientId, createdAt: now });
                tx.set(dispatchRef, { clientId, slipId: id, revision: s!.revision, mailId, attempt, requestedAt: now, actor: uid });
                result = { mailId, state: 'PENDING' };
            }
            else if (action === 'mailStatus') {
                const id = key(data.id);
                const s = slips.find(x => x.id === id);
                assert(s, '找不到薪資單');
                const d = await tx.get(db.doc(`payrollDispatch/${id}_${s!.revision}`));
                if (!d.exists)
                    return { state: 'NONE' };
                const m = await tx.get(db.doc('mail/' + d.data()!.mailId));
                return { state: m.data()?.delivery?.state || 'PENDING', attempt: d.data()!.attempt };
            }
            else
                throw new Error('不支援此操作');
            tx.create(receiptRef, { actor: uid, digest, result, createdAt: now, clientId });
            return result;
        });
    }
    catch (error) {
        if (error instanceof HttpsError)
            throw error;
        throw new HttpsError('failed-precondition', error instanceof Error ? error.message : '操作失敗');
    }
});
