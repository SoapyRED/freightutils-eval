import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matches, scoreAnswer, clean, isUnknown } from '../harness/score.mjs';

const q = (expected, accept) => ({ expected, accept });

test('clean strips wrapping and keeps the last line', () => {
  assert.equal(clean('**33**'), '33');
  assert.equal(clean('Answer: F1.'), 'F1');
  assert.equal(clean('Let me think.\nThe value is fixed.\n`D/E`'), 'D/E');
});

test('unknown is detected and never counts as wrong', () => {
  assert.ok(isUnknown('UNKNOWN'));
  assert.ok(isUnknown("I don't know"));
  assert.equal(scoreAnswer(q('33', { rule: 'code' }), 'UNKNOWN'), 'unknown');
  assert.equal(scoreAnswer(q('33', { rule: 'code' }), '30'), 'wrong');
  assert.equal(scoreAnswer(q('33', { rule: 'code' }), ''), 'unknown');
});

test('codes, classes and packing groups', () => {
  assert.ok(matches('F1', 'f1', { rule: 'code' }));
  assert.ok(matches('33', 'HIN 33', { rule: 'code' }));
  assert.ok(matches('X423', 'x423', { rule: 'code' }));
  assert.ok(!matches('33', '336', { rule: 'code' }));
  assert.ok(matches('3', 'Class 3', { rule: 'adr_class' }));
  assert.ok(matches('6.1', '6.1', { rule: 'adr_class' }));
  assert.ok(!matches('6.1', '6.2', { rule: 'adr_class' }));
  assert.ok(matches('II', 'PG II', { rule: 'packing_group' }));
  assert.ok(matches('III', '3', { rule: 'packing_group' }));
  assert.ok(!matches('II', 'III', { rule: 'packing_group' }));
});

test('tunnel codes ignore brackets', () => {
  assert.ok(matches('(D/E)', 'D/E', { rule: 'tunnel' }));
  assert.ok(matches('(E)', '(E)', { rule: 'tunnel' }));
  assert.ok(!matches('(D/E)', 'E', { rule: 'tunnel' }));
});

test('limited quantity units and the zero', () => {
  assert.ok(matches('1 L', '1L', { rule: 'limited_quantity' }));
  assert.ok(matches('1 L', '1 litre', { rule: 'limited_quantity' }));
  assert.ok(matches('5 kg', '5kg', { rule: 'limited_quantity' }));
  assert.ok(matches('0', 'None', { rule: 'limited_quantity' }));
  assert.ok(!matches('1 L', '5 L', { rule: 'limited_quantity' }));
  assert.ok(!matches('1 L', '1 kg', { rule: 'limited_quantity' }));
});

test('labels compare as a set', () => {
  assert.ok(matches('2.3 +2.1', '2.3+2.1', { rule: 'labels' }));
  assert.ok(matches('2.3 +2.1 +8', '2.3, 2.1 and 8', { rule: 'labels' }));
  assert.ok(!matches('2.3 +2.1 +8', '2.3+2.1', { rule: 'labels' }));
  assert.ok(matches('3', '3', { rule: 'labels' }));
});

test('special provisions compare as a number set', () => {
  assert.ok(matches('188 230 310', '310, 188, 230', { rule: 'number_set' }));
  assert.ok(!matches('188 230 310', '188 230', { rule: 'number_set' }));
});

test('NO CHANGE token', () => {
  const a = { rule: 'code', no_change_token: true };
  assert.ok(matches('NO CHANGE', 'No change', a));
  assert.ok(matches('NO CHANGE', 'unchanged', a));
  assert.ok(!matches('NO CHANGE', '2TFC', a));
  assert.ok(!matches('2TFC', 'NO CHANGE', a));
  assert.ok(matches('2TFC', '2TFC', a));
});

test('numeric tolerance', () => {
  const a = { rule: 'numeric', tolerance_pct: 0.5 };
  assert.ok(matches(320, '320 kg', a));
  assert.ok(matches(320, '321.5', a));
  assert.ok(!matches(320, '322', a));
  assert.ok(matches(1234.5, '1,234.5', a));
  assert.ok(matches(705, '705', { rule: 'numeric', tolerance_pct: 0 }));
  assert.ok(!matches(705, '706', { rule: 'numeric', tolerance_pct: 0 }));
  assert.ok(!matches(705, 'about seven hundred', { rule: 'numeric', tolerance_pct: 0 }));
});

test('yes/no and digits', () => {
  assert.ok(matches('YES', 'Yes.', { rule: 'yes_no' }));
  assert.ok(matches('NO', 'No', { rule: 'yes_no' }));
  assert.ok(!matches('NO', 'Yes', { rule: 'yes_no' }));
  assert.ok(matches('0101', '01.01', { rule: 'digits' }));
  assert.ok(!matches('0101', '101', { rule: 'digits' }));
});

test('text: token-set similarity, not paraphrase', () => {
  assert.ok(matches('Nickel and articles thereof', 'Nickel and articles thereof.', { rule: 'text' }));
  assert.ok(matches('Horses, asses, mules and hinnies; live', 'Live horses, asses, mules and hinnies', { rule: 'text' }));
  assert.ok(matches('Rotterdam', 'ROTTERDAM', { rule: 'text' }));
  assert.ok(!matches('Nickel and articles thereof', 'Copper and articles thereof', { rule: 'text' }));
  assert.ok(!matches('Delevan', 'Delavan', { rule: 'text' }));
});
