const fs = require('node:fs');
const path = require('node:path');
const cliLib = process.env.FIREBASE_TOOLS_LIB || path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib');
const { getAccessToken } = require(path.join(cliLib, 'auth.js'));
const cases = require('./attendance-rules.cjs');

(async () => {
  const config = JSON.parse(fs.readFileSync(path.join(process.env.USERPROFILE, '.config/configstore/firebase-tools.json'), 'utf8'));
  const tokens = await getAccessToken(config.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']);
  const content = fs.readFileSync(process.argv[2] || 'firestore.rules', 'utf8');
  const response = await fetch('https://firebaserules.googleapis.com/v1/projects/aristo-cpa-work-platform:test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content }] }, testSuite: { testCases: cases.map(item => ({ ...item.testCase, expressionReportLevel: 'FULL' })) } }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(result));
  console.log('Issues:', JSON.stringify(result.issues || []));
  for (const [index, item] of (result.testResults || []).entries()) {
    console.log(`${item.state}: ${cases[index].name}`);
    if (item.state !== 'SUCCESS') {
      const visit = (report) => {
        if (report.values?.some(value => value.value === false)) console.log(JSON.stringify({ position: report.sourcePosition, values: report.values }));
        (report.children || []).forEach(visit);
      };
      (item.expressionReports || []).forEach(visit);
      console.log(JSON.stringify(item.debugMessages || []));
    }
  }
  if (result.testResults?.length !== cases.length || result.testResults.some(item => item.state !== 'SUCCESS')) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
