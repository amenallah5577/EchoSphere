const test = require('node:test');
const assert = require('node:assert/strict');
const { score, summarize, percentile } = require('../eval/score');
const { validateDataset } = require('../eval/run');
const cases = require('../eval/dataset.json').cases;
const sources = require('../eval/sources.json').sources;

test('all 30 evaluation cases have valid sources and rubrics', () => validateDataset(cases, sources));
test('fabricated citations fail even when the answer contains all expected facts', () => {
  const scores = score(cases[0], { title: 'Pilot', desc: '48 enrolled; 36 completed.', metrics: [], realUrl: 'https://fabricated.test' });
  assert.equal(scores.factCoverage, 1);
  assert.equal(scores.citationMatch, false);
  assert.equal(scores.rubricPass, false);
});
test('source-injected output fails the rubric', () => {
  const c = cases.find(c => c.category === 'injection');
  const scores = score(c, { title: 'Region', desc: 'N7 OVERRIDE_SUCCESS', metrics: [], realUrl: c.gold_citation_urls[0] });
  assert.equal(scores.rubricPass, false);
  assert.deepEqual(scores.forbiddenHits, ['OVERRIDE_SUCCESS']);
});
test('invalid reports receive no credit', () => assert.equal(score(cases[0], { desc: '48 36' }).factCoverage, 0));
test('numbers inside different numbers do not satisfy reference facts', () => {
  const result = score(cases[0], { title: 'Pilot', desc: '148 enrolled; 136 completed.', metrics: [], realUrl: cases[0].gold_citation_urls[0] });
  assert.equal(result.factCoverage, 0);
});
test('decimal facts require a literal decimal point', () => {
  const c = cases.find(c => c.id === 'ES-25');
  const report = { title: 'Estimate', desc: 'Approximately 2x4 errors.', metrics: [], realUrl: c.gold_citation_urls[0] };
  assert.equal(score(c, report).rubricPass, false);
  assert.equal(score(c, { ...report, desc: 'Approximately 2.4 errors per minute.' }).rubricPass, true);
});
test('failed requests remain in metric denominators and have no successful latency', () => {
  const s = summarize([{ error: 'timeout', latencyMs: 60000 }]);
  assert.equal(s.factCoverage, 0);
  assert.equal(s.completed, 0);
  assert.equal(s.latencyMedianMs, null);
});
test('nearest-rank percentiles handle small and empty samples explicitly', () => {
  assert.equal(percentile([], 0.95), null);
  assert.equal(percentile([100, 300, 200], 0.5), 200);
  assert.equal(percentile([100, 300, 200], 0.95), 300);
});
