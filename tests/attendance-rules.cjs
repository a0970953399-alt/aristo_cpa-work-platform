const record = {
  id: 'test-record', userId: 'employee', userName: 'Test Employee',
  date: '2026-09-09', startTime: '09:00', breakHours: 0, totalHours: 0,
};

function scenario(name, expectation, options = {}) {
  const profile = {
    userId: 'employee', name: 'Test Employee', role: 'intern', isActive: true,
    permissions: { manageTimesheets: false, canDeleteRecords: false },
    ...options.profile,
  };
  const user = { name: 'Test Employee', role: 'intern', ...options.user };
  const documentPath = '/databases/(default)/documents';
  const mocks = [];
  for (const [path, data] of [
    [`${documentPath}/googleUserProfiles/test-uid`, profile],
    [`${documentPath}/users/employee`, user],
  ]) {
    mocks.push({ function: 'exists', args: [{ exactValue: path }], result: { value: true } });
    mocks.push({ function: 'get', args: [{ exactValue: path }], result: { value: { data } } });
  }
  return {
    name,
    testCase: {
      expectation,
      request: {
        auth: options.signedOut ? null : { uid: 'test-uid' },
        path: `${documentPath}/checkIns/test-record`,
        method: options.method || 'create',
        resource: { data: { ...record, ...options.data } },
      },
      ...(options.existing ? { resource: { data: options.existing } } : {}),
      functionMocks: mocks,
    },
  };
}

const manual = {
  endTime: '17:00', totalHours: 8,
  // The Rules test API coerces ISO strings to timestamps; this field is stored as a string by the SDK.
  manualEntryAt: 'test-entry-time',
  manualEntryById: 'manager', manualEntryByName: 'Test Manager',
  manualEntryReason: 'Missed clock-in',
};
const manager = { userId: 'manager', name: 'Test Manager', role: 'supervisor' };

module.exports = [
  scenario('legacy employee without isActive can clock in', 'ALLOW'),
  scenario('explicit active employee can clock in', 'ALLOW', { user: { isActive: true } }),
  scenario('trainee can clock in', 'ALLOW', { profile: { role: 'trainee' }, user: { role: 'trainee', isActive: true } }),
  scenario('supervisor can clock in', 'ALLOW', { profile: { role: 'supervisor' }, user: { role: 'supervisor' } }),
  scenario('disabled target cannot clock in', 'DENY', { user: { isActive: false } }),
  scenario('disabled profile cannot clock in', 'DENY', { profile: { isActive: false } }),
  scenario('signed-out client cannot clock in', 'DENY', { signedOut: true }),
  scenario('employee cannot clock in for another user', 'DENY', { profile: { userId: 'other' } }),
  scenario('boss cannot be clock-in target', 'DENY', { profile: { role: 'boss' }, user: { role: 'boss' } }),
  scenario('employee cannot forge paid fields', 'DENY', { data: { paidAt: '2026-09-09' } }),
  scenario('employee cannot forge manual entry', 'DENY', { data: manual }),
  scenario('supervisor can manually enter legacy employee hours', 'ALLOW', { profile: manager, data: manual }),
  scenario('supervisor cannot manually enter disabled employee hours', 'DENY', { profile: manager, data: manual, user: { isActive: false } }),
  scenario('employee can clock out', 'ALLOW', { method: 'update', existing: record, data: { endTime: '17:00', totalHours: 8 } }),
  scenario('paid hours cannot be changed', 'DENY', { method: 'update', existing: { ...record, paidAt: '2026-09-09' }, data: { paidAt: '2026-09-09', endTime: '17:00', totalHours: 8 } }),
  scenario('historical settled hours cannot be changed', 'DENY', { method: 'update', existing: { ...record, date: '2026-06-30' }, data: { date: '2026-06-30', endTime: '17:00', totalHours: 8 } }),
];
