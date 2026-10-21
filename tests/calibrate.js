// Run: node tests/calibrate.js
// Unit checks for answer-key scoring and rounding, then the calibration table
// comparing simulated bands with the reference ratings of the sample responses.
const assert = require('assert');
const E = require('../js/engine.js');
const C = require('../js/content.js');

// --- rounding (IELTS rule)
assert.strictEqual(E.roundHalf(6.25), 6.5);
assert.strictEqual(E.roundHalf(6.75), 7.0);
assert.strictEqual(E.roundHalf(6.125), 6.0);
assert.strictEqual(E.roundHalf(6.875), 7.0);
assert.deepStrictEqual(E.overallBand({ listening: 6.5, reading: 6.5, writing: 5, speaking: 7 }).band, 6.5); // 6.25 -> 6.5
assert.deepStrictEqual(E.overallBand({ listening: 7, reading: 7, writing: 6.5, speaking: 6.5 }).band, 7.0); // 6.75 -> 7.0

// --- official anchors
assert.strictEqual(E.rawToBand(30, 'listening').band, 7);
assert.strictEqual(E.rawToBand(16, 'listening').band, 5);
assert.strictEqual(E.rawToBand(15, 'reading_academic').band, 5);
assert.strictEqual(E.rawToBand(35, 'reading_general').band, 7);
assert.strictEqual(E.rawToBand(30, 'reading_general').band, 6);
assert.strictEqual(E.rawToBand(33, 'listening').band, 7.5);

// --- answer key
const L = C.LISTENING.questions;
assert.ok(E.checkAnswer(L[3], '0771 486 392').correct);
assert.ok(E.checkAnswer(L[5], 'Rs. 12,500').correct);
assert.strictEqual(E.checkAnswer(L[2], 'Fernandoo').errorType, 'spelling');
assert.ok(E.checkAnswer(L[1], 'Tuesdays').correct);
assert.ok(E.checkAnswer(L[4], 'ten').correct);
const R = C.READING.questions;
assert.strictEqual(E.checkAnswer(R[7], 'the seeds of trees', 2).errorType, 'format');
assert.ok(E.checkAnswer(R[7], 'the seeds', 2).correct);
const allRight = {}; R.forEach(q => allRight[q.n] = Array.isArray(q.answer) ? q.answer[0] : q.answer);
const sr = E.scoreObjective(R, allRight, 'reading_academic', { maxWords: 2 });
assert.strictEqual(sr.raw, 10); assert.strictEqual(sr.band, 9);
console.log('Unit checks passed.\n');

// --- calibration
const cases = [];
['task2', 'task1_ac'].forEach(k => C.WRITING_SAMPLES[k].forEach(s =>
  cases.push({ id: `${k}-${s.level}`, kind: 'writing', text: s.text, task: C.WRITING[k], teacherBand: s.teacherBand })));
C.SPEAKING.samples.forEach(s => cases.push({ id: `speak-${s.level}`, kind: 'speaking', text: s.text, seconds: s.seconds, part: C.SPEAKING.parts[1], teacherBand: s.teacherBand }));

const verbose = process.argv.includes('-v');
cases.forEach(c => {
  const out = c.kind === 'speaking' ? E.scoreSpeaking(c.text, c.seconds, c.part) : E.scoreWriting(c.text, c.task);
  if (verbose) {
    console.log(c.id, 'band', out.band, out.criteria.map(x => `${x.code}:${x.band}(${x.raw.toFixed(2)})`).join(' '));
    const m = out.metrics;
    console.log('   ', JSON.stringify(Object.fromEntries(Object.entries(m).filter(([k, v]) => typeof v === 'number').map(([k, v]) => [k, +v.toFixed(2)]))));
    if (m.errors) console.log('    errors:', m.errors.map(e => e.label + ' x' + e.count).join('; '), '| spelling:', (m.spellingErrors || []).join(','));
  }
});
const cal = E.calibrate(cases);
console.log('Case                 Reference  System  Diff  Within 0.5');
cal.rows.forEach(r => console.log(r.id.padEnd(20), String(r.reference).padStart(9), String(r.system).padStart(7), (r.diff >= 0 ? '+' : '') + r.diff.toFixed(1).padStart(4), r.withinHalf ? '   yes' : '   NO'));
console.log(`\nAgreement within half a band: ${(cal.agreement * 100).toFixed(0)}%   Mean absolute difference: ${cal.mae.toFixed(2)}`);
