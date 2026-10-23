const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
process.env.GROQ_API_KEY = '';
process.env.GROQ_MODEL = '';
process.env.CLERK_SECRET_KEY = '';
process.env.CLERK_PUBLISHABLE_KEY = '';
process.env.ADMIN_USERNAME = '';
process.env.ADMIN_PASSWORD = '';
const app = require('../server');
const { extractPdfText } = require('../lib/pdf');
let server, base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); });
test('PDF v2 parser extracts a real synthetic PDF', async () => {
  const text = await extractPdfText(fs.readFileSync(path.join(__dirname, 'fixtures/brief.pdf')));
  assert.match(text, /Project Cedar/);
  assert.match(text, /18000 EUR/);
});
test('malformed PDF fails instead of silently losing document evidence', async () => {
  await assert.rejects(extractPdfText(Buffer.from('not a PDF')));
});
test('invalid research input is rejected and absent providers produce an explicit unavailable response', async () => {
  for (const [task, expected] of [['x', 400], ['Explain a software architecture', 503]]) {
    const response = await fetch(base + '/api/dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task }) });
    assert.equal(response.status, expected);
    assert.equal(typeof (await response.json()).error, 'string');
  }
});
test('guest profile works without providers while unavailable history and unconfigured admin fail closed', async () => {
  assert.deepEqual(await (await fetch(base + '/api/profile')).json(), { mode: 'guest' });
  assert.equal((await fetch(base + '/api/history')).status, 503);
  assert.equal((await fetch(base + '/api/admin/history')).status, 404);
});
