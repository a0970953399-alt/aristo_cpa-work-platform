const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the actual Dashboard handlers with controlled write outcomes, without a live database.
const source = fs.readFileSync('Dashboard.tsx', 'utf8');
const ast = ts.createSourceFile('Dashboard.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['reportAttendanceError', 'sendAttendanceNotification', 'handleCheckIn', 'handleCheckOut'];
const declarations = [];
function collect(node) {
  if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(ast))) {
    declarations.push(`const ${node.getText(ast)};`);
  }
  ts.forEachChild(node, collect);
}
collect(ast);
assert.equal(declarations.length, names.length);
const script = ts.transpileModule(`${declarations.join('\n')}\nglobalThis.handlers = { handleCheckIn, handleCheckOut };`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup(options = {}) {
  const alerts = [], pending = [], writes = [];
  let modalClosed = false;
  const context = {
    navigator: { onLine: options.online !== false },
    confirm: () => options.confirm !== false,
    alert: message => alerts.push(message),
    console: { error() {} },
    attendancePendingRef: { current: false },
    setAttendancePending: value => pending.push(value),
    currentUser: { id: 'employee', name: 'Test Employee' },
    todayStr: '2026-09-09', timeStr: '18:00', deductBreak: false,
    myTodayRecord: { id: 'record', userId: 'employee', date: '2026-09-09', startTime: '09:00' },
    setIsCheckOutModalOpen: value => { modalClosed = !value; },
    TaskService: {
      addCheckIn: async record => { writes.push(record); await options.write?.(); },
      updateCheckIn: async record => { writes.push(record); await options.write?.(); },
    },
    NotificationService: { send: () => options.notify?.() },
  };
  vm.runInNewContext(script, context);
  return { context, alerts, pending, writes, handlers: context.handlers, modalClosed: () => modalClosed };
}

test('waits for server success and blocks repeated clicks', async () => {
  let finish;
  const state = setup({ write: () => new Promise(resolve => { finish = resolve; }) });
  const request = state.handlers.handleCheckIn();
  await state.handlers.handleCheckIn();
  assert.equal(state.writes.length, 1);
  assert.equal(state.alerts.length, 0);
  assert.equal(state.context.attendancePendingRef.current, true);
  finish();
  await request;
  assert.match(state.alerts[0], /上班打卡成功/);
  assert.deepEqual(state.pending, [true, false]);
});

test('permission rejection is visible and the next attempt can succeed', async () => {
  let reject = true;
  const state = setup({ write: () => { if (reject) throw { code: 'permission-denied' }; } });
  await state.handlers.handleCheckIn();
  assert.match(state.alerts[0], /permission-denied/);
  assert.equal(state.context.attendancePendingRef.current, false);
  reject = false;
  await state.handlers.handleCheckIn();
  assert.match(state.alerts[1], /上班打卡成功/);
});

test('local notification failure does not hide a saved clock-in', async () => {
  const state = setup({ notify: () => { throw new Error('Storage unavailable'); } });
  await state.handlers.handleCheckIn();
  assert.match(state.alerts[0], /上班打卡成功/);
  assert.equal(state.alerts.length, 1);
});

test('offline and cancelled requests do not write', async () => {
  const offline = setup({ online: false });
  await offline.handlers.handleCheckIn();
  await offline.handlers.handleCheckOut();
  assert.equal(offline.writes.length, 0);
  assert.match(offline.alerts[0], /網路/);
  const cancelled = setup({ confirm: false });
  await cancelled.handlers.handleCheckIn();
  assert.equal(cancelled.writes.length, 0);
});

test('failed clock-out keeps the dialog open and restores controls', async () => {
  const state = setup({ write: () => { throw { code: 'unavailable' }; } });
  await state.handlers.handleCheckOut();
  assert.match(state.alerts[0], /unavailable/);
  assert.equal(state.modalClosed(), false);
  assert.deepEqual(state.pending, [true, false]);
});

test('saved clock-out closes dialog even when local notification fails', async () => {
  const state = setup({ notify: () => { throw new Error('Corrupt local storage'); } });
  await state.handlers.handleCheckOut();
  assert.equal(state.modalClosed(), true);
  assert.match(state.alerts[0], /下班申請已送出/);
  assert.equal(state.context.attendancePendingRef.current, false);
});
