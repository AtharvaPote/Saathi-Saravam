import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, applyAction, prepareMessage, decideMessage, today } from '../app/lib/domain.ts';
import { toolsFor, actionFromTool } from '../app/lib/action-registry.ts';
import { chatMessages } from '../app/lib/chat-prompt.ts';

const crop = (extra = {}) => ({ type: 'farm_crop', plot: 'North field', crop: 'Onion', variety: 'Red', area: 2.5, areaUnit: 'acres', sownOn: today(), location: 'Nashik', stage: 'growing', ...extra });
const expense = (extra = {}) => ({ type: 'farm_expense', category: 'seeds', amount: 1250.75, date: today(), note: 'Onion seed', ...extra });
const records = s => structuredClone({ crops: s.farmCrops, expenses: s.farmExpenses, tasks: s.tasks, activity: s.activity });
const addCrop = (s, extra = {}) => { applyAction(s, crop(extra), 'farm'); return s.farmCrops.find(c => c.plot === (extra.plot || 'North field')); };
const future = () => new Date(Date.parse(today()) + 86400000 * 2).toISOString().slice(0, 10);

test('crop review leaves records unchanged and repeated confirmation adds exactly one crop', () => {
 const s = seed('farm'), before = records(s), p = prepareMessage(s, crop(), 'farm', 'en-IN', 'farm-crop-idempotency');
 assert.equal(p.status, 'pending'); assert.ok(p.review.lines.length); assert.deepEqual(records(s), before);
 assert.equal(prepareMessage(s, crop(), 'farm', 'en-IN', 'farm-crop-idempotency').id, p.id);
 assert.equal(decideMessage(s, p.id, 'confirm', 'farm'), 'saved');
 assert.equal(decideMessage(s, p.id, 'confirm', 'farm'), 'saved');
 assert.equal(s.farmCrops.filter(c => c.plot === 'North field').length, 1);
 assert.equal(s.farmCrops.find(c => c.plot === 'North field').area, 2.5);
});

test('cancelled and replaced crop proposals never change farm records', () => {
 const s = seed('farm'), before = records(s), old = prepareMessage(s, crop(), 'farm');
 const latest = prepareMessage(s, crop({ area: 3 }), 'farm');
 assert.equal(decideMessage(s, old.id, 'confirm', 'farm'), 'cancelled');
 assert.equal(decideMessage(s, latest.id, 'cancel', 'farm'), 'cancelled');
 assert.equal(decideMessage(s, latest.id, 'confirm', 'farm'), 'cancelled');
 assert.deepEqual(records(s), before);
});

test('crop edits keep identity and linked expenses while updating field details', () => {
 const s = seed('farm'), c = addCrop(s); applyAction(s, expense({ cropId: c.id }), 'farm');
 const count = s.farmCrops.length;
 applyAction(s, crop({ id: c.id, area: 1.8, areaUnit: 'hectares', variety: 'New variety', location: 'Pune', stage: 'harvested' }), 'farm');
 assert.equal(s.farmCrops.length, count); assert.equal(c.area, 1.8); assert.equal(c.stage, 'harvested');
 assert.equal(s.farmExpenses[0].cropId, c.id);
 for (const changed of [{ plot: 'Another field' }, { crop: 'Wheat' }, { sownOn: '2026-01-01' }]) {
  const before = records(s); assert.throws(() => applyAction(s, crop({ id: c.id, ...changed }), 'farm')); assert.deepEqual(records(s), before);
 }
});

test('normalized plot/crop/date duplicates are rejected but a new season is distinct', () => {
 const s = seed('farm'); addCrop(s);
 const before = records(s);
 assert.throws(() => applyAction(s, crop({ plot: '  NORTH   field ', crop: 'ONION' }), 'farm')); assert.deepEqual(records(s), before);
 applyAction(s, crop({ sownOn: '2026-01-01' }), 'farm');
 assert.equal(s.farmCrops.filter(c => c.plot === 'North field').length, 2);
});

test('planned crops allow future dates and planted crops reject them without mutation', () => {
 const s = seed('farm'); applyAction(s, crop({ sownOn: future(), stage: 'planned' }), 'farm');
 const before = records(s);
 for (const stage of ['growing', 'harvested']) {
  assert.throws(() => applyAction(s, crop({ plot: stage, sownOn: future(), stage }), 'farm')); assert.deepEqual(records(s), before);
 }
});

test('invalid crop values and missing edit IDs cannot create records', () => {
 for (const invalid of [{ area: 0 }, { area: -1 }, { area: Infinity }, { areaUnit: 'kg' }, { sownOn: '2026-02-31' }, { plot: '' }, { crop: '' }, { location: '' }, { stage: 'unknown' }, { id: 'missing-crop' }]) {
  const s = seed('farm'), before = records(s); assert.throws(() => prepareMessage(s, crop(invalid), 'farm')); assert.deepEqual(records(s), before);
 }
});

test('expense review requires confirmation, retains crop association and saves once', () => {
 const s = seed('farm'), c = addCrop(s), before = records(s), p = prepareMessage(s, expense({ cropId: c.id }), 'farm');
 assert.deepEqual(records(s), before); assert.equal(p.status, 'pending');
 assert.equal(decideMessage(s, p.id, 'confirm', 'farm'), 'saved'); assert.equal(decideMessage(s, p.id, 'confirm', 'farm'), 'saved');
 assert.equal(s.farmExpenses.length, (before.expenses?.length || 0) + 1);
 assert.equal(s.farmExpenses[0].amount, 1250.75); assert.equal(s.farmExpenses[0].cropId, c.id);
});

test('an edited linked crop invalidates an expense review before saving', () => {
 const s = seed('farm'), c = addCrop(s), p = prepareMessage(s, expense({ cropId: c.id }), 'farm');
 const oldBasis = p.review.basis;
 applyAction(s, crop({ id: c.id, area: 4 }), 'farm');
 const before = structuredClone(s.farmExpenses);
 assert.equal(decideMessage(s, p.id, 'confirm', 'farm'), 'review_updated');
 assert.deepEqual(s.farmExpenses, before); assert.notEqual(p.review.basis, oldBasis);
 assert.equal(decideMessage(s, p.id, 'confirm', 'farm'), 'saved');
});

test('unlinked expenses are allowed and absent note defaults to empty text', () => {
 const s = seed('farm'); const a = expense(); delete a.note; applyAction(s, a, 'farm');
 assert.equal(s.farmExpenses[0].note, ''); assert.equal(s.farmExpenses[0].cropId, undefined);
});

test('expense limits, exact currency precision, dates and crop ownership are enforced', () => {
 for (const invalid of [{ amount: 0 }, { amount: -1 }, { amount: 1000000.01 }, { amount: 1.001 }, { amount: Infinity }, { date: future() }, { date: '2026-02-31' }, { category: 'unknown' }, { cropId: 'missing-crop' }]) {
  const s = seed('farm'), before = records(s); assert.throws(() => prepareMessage(s, expense(invalid), 'farm')); assert.deepEqual(records(s), before);
 }
 const s = seed('farm'); for (const amount of [0.01, 1.1, 1000000]) applyAction(s, expense({ amount }), 'farm');
 assert.equal(s.farmExpenses.length, 3);
});

test('legacy state without farm arrays supports crop, expense and unlinked task writes', () => {
 const s = seed('farm'); delete s.farmCrops; delete s.farmExpenses;
 applyAction(s, expense(), 'farm'); const c = addCrop(s);
 applyAction(s, { type: 'task', title: 'Inspect irrigation', date: today(), cropId: c.id }, 'farm');
 assert.equal(s.farmExpenses.length, 1); assert.equal(s.farmCrops.length, 1); assert.equal(s.tasks[0].cropId, c.id);
});

test('linked task reviews include the selected crop and require refreshed review after edits', () => {
 const s = seed('farm'), c = addCrop(s);
 const p = prepareMessage(s, { type: 'task', title: 'Inspect irrigation', date: today(), cropId: c.id }, 'farm');
 assert.ok(JSON.stringify(p.review).includes('North field'));
 applyAction(s, crop({ id: c.id, stage: 'harvested' }), 'farm');
 assert.equal(decideMessage(s, p.id, 'confirm', 'farm'), 'review_updated');
 assert.equal(decideMessage(s, p.id, 'confirm', 'farm'), 'saved'); assert.equal(s.tasks[0].cropId, c.id);
 assert.throws(() => prepareMessage(s, { type: 'task', title: 'Invalid link', date: today(), cropId: 'missing' }, 'farm'));
});

test('task completion and reopening use confirmed proposals', () => {
 const s = seed('farm'), task = s.tasks[0];
 for (const done of [true, false]) {
  const before = task.done, p = prepareMessage(s, { type: 'task_status', id: task.id, done }, 'farm');
  assert.equal(task.done, before); decideMessage(s, p.id, 'confirm', 'farm'); assert.equal(task.done, done);
 }
});

test('shop and farmer boundaries reject incompatible record mutations', () => {
 const shop = seed('shop'), before = records(shop);
 for (const action of [crop(), expense(), { type: 'task', title: 'Cross profile', date: today(), cropId: 'missing' }]) assert.throws(() => prepareMessage(shop, action, 'shop'));
 assert.deepEqual(records(shop), before);
 assert.throws(() => prepareMessage(seed('farm'), { type: 'inventory', item: 'Rice', quantity: 1, unit: 'kg', mode: 'add' }, 'farm'));
});

test('native farm tools are only offered to farmers and preserve structured action arguments', () => {
 const farm = toolsFor('farm').map(t => t.function.name), shop = toolsFor('shop').map(t => t.function.name);
 for (const tool of ['read_farm', 'prepare_farm_crop', 'prepare_farm_expense']) { assert.ok(farm.includes(tool)); assert.ok(!shop.includes(tool)); }
 assert.ok(!farm.includes('prepare_inventory')); assert.ok(!farm.some(n => n.includes('confirm')));
 const { type, ...args } = crop(); assert.deepEqual(actionFromTool('prepare_farm_crop', args, 'farm'), { ...args, type });
 assert.throws(() => actionFromTool('prepare_farm_crop', args, 'shop'));
});

test('farmer chat context contains stored crop and expense data plus dated linked tasks', () => {
 const s = seed('farm'), c = addCrop(s); applyAction(s, expense({ cropId: c.id, note: 'Unique seed supplier note' }), 'farm');
 applyAction(s, { type: 'task', title: 'Inspect irrigation', date: today(), cropId: c.id }, 'farm');
 const prompt = chatMessages(s, 'farm', { text: 'How much have I spent?', language: 'en-IN' }, today(), {}).find(m => m.role === 'system').content;
 for (const text of ['North field', 'Unique seed supplier note', c.id, '1250.75', 'Inspect irrigation']) assert.ok(prompt.includes(text), `Missing context: ${text}`);
 assert.ok(!prompt.includes('Farmer tools are tasks only'));
});
