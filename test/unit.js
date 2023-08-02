'use strict';

const assert = require('node:assert');
const test = require('node:test');
const { scheduler } = require('node:timers/promises');

const { Transaction } = require('../main.js');

const getData = () => ({
  name: 'John Doe',
  age: 30,
  email: 'johndoe@example.com'
});

test('Test get', () => {
  const data = getData();
  const { transaction, proxy } = Transaction.start(data);

  let eventEmitted = false;
  transaction.on('get', () => {
    eventEmitted = true;
  });

  const { name } = proxy;

  assert.strictEqual(eventEmitted, true);
  assert.strictEqual(name, 'John Doe');

  transaction.stop();
});

test('Test set', () => {
  const data = getData();
  const { transaction, proxy } = Transaction.start(data);

  let eventEmitted = false;
  transaction.on('set', () => {
    eventEmitted = true;
  });

  proxy.age = 31;

  assert.strictEqual(eventEmitted, true);
  assert.strictEqual(proxy.age, 31);
  assert.deepStrictEqual(transaction.delta, { age: 31 });
  assert.notStrictEqual(proxy.age, data.age);

  transaction.stop();
});

test('Test delete', () => {
  const data = getData();
  const { transaction, proxy } = Transaction.start(data);

  assert.strictEqual('name' in proxy, true);

  let eventEmitted = false;
  transaction.on('delete', () => {
    eventEmitted = true;
  });

  transaction.delete('name');

  assert.strictEqual(eventEmitted, true);
  assert.strictEqual('name' in proxy, true);
  assert.strictEqual(proxy.name, undefined);
  assert.deepStrictEqual(transaction.deletedProps, new Set(['name']));

  transaction.stop();
});

test('Test commit', () => {
  const data = getData();
  const { transaction, proxy } = Transaction.start(data);

  proxy.name = 'Jane Doe';
  proxy.age = 25;

  let eventEmitted = false;
  transaction.on('commit', () => {
    eventEmitted = true;
  });

  transaction.commit();

  assert.strictEqual(eventEmitted, true);
  assert.strictEqual(proxy.name, 'Jane Doe');
  assert.strictEqual(proxy.age, 25);
  assert.deepStrictEqual(proxy, data);
  assert.deepStrictEqual(transaction.delta, {});
  assert.deepStrictEqual(transaction.deletedProps, new Set());

  transaction.stop();
});

test('Test rollback', () => {
  const data = getData();
  const { transaction, proxy } = Transaction.start(data);

  proxy.name = 'Jane Doe';
  proxy.age = 25;
  delete proxy.email;

  assert.strictEqual(proxy.name, 'Jane Doe');
  assert.strictEqual(proxy.age, 25);
  assert.strictEqual(proxy.email, undefined);
  assert.notDeepStrictEqual(proxy, data);

  let eventEmitted = false;
  transaction.on('rollback', () => {
    eventEmitted = true;
  });

  transaction.rollback();

  assert.strictEqual(eventEmitted, true);
  assert.deepStrictEqual(proxy, data);
  assert.deepStrictEqual(transaction.delta, {});
  assert.deepStrictEqual(transaction.deletedProps, new Set());

  transaction.stop();
});

test('Test clone', () => {
  const data = getData();
  const { transaction, proxy } = Transaction.start(data);

  proxy.languages = ['JS'];

  const clone = transaction.clone();

  assert.deepStrictEqual(transaction.data, data);
  assert.deepStrictEqual(clone.transaction.data, data);

  assert.strictEqual(transaction.data, data);
  assert.notStrictEqual(clone.transaction.data, data);

  assert.deepStrictEqual(clone.proxy, proxy);
  assert.notStrictEqual(clone.proxy, proxy);

  assert.deepStrictEqual(clone.transaction.data, transaction.data);
  assert.notStrictEqual(clone.transaction.data, transaction.data);

  assert.deepStrictEqual(clone.transaction.delta, transaction.delta);
  assert.notStrictEqual(clone.transaction.delta, transaction.delta);

  transaction.stop();
});

test('Test timeout (commit)', async () => {
  const data = getData();
  const { transaction, proxy } = Transaction.start(data);

  const COMMIT = true;
  const WAIT = 150;

  transaction.timeout(WAIT, COMMIT, (event) => {
    assert.strictEqual(event, 'commit');
  });

  proxy.name = 'Jane Doe';
  delete proxy.age;

  let timeoutEventEmitted = false;
  transaction.on('timeout', () => {
    timeoutEventEmitted = true;
  });

  let commitEventEmitted = false;
  transaction.on('commit', () => {
    commitEventEmitted = true;
  });

  let rollbackEventEmitted = false;
  transaction.on('rollback', () => {
    rollbackEventEmitted = true;
  });

  await scheduler.wait(WAIT + 100);

  assert.strictEqual(timeoutEventEmitted, true);
  assert.strictEqual(commitEventEmitted, true);
  assert.strictEqual(rollbackEventEmitted, false);
  assert.strictEqual(proxy.name, 'Jane Doe');
  assert.strictEqual(proxy.age, undefined);
  assert.deepStrictEqual(transaction.delta, {});
  assert.deepStrictEqual(transaction.deletedProps, new Set());

  transaction.stop();
});

test('Test revoke', () => {
  const data = getData();
  const { transaction, proxy } = Transaction.start(data);

  transaction.revoke();

  assert.throws(() => void proxy.name);
});

test('Test stop', () => {
  const data = getData();
  const { transaction, proxy } = Transaction.start(data);

  transaction.timeout(1000);
  transaction.stop();

  assert.strictEqual(transaction.timer, null);
  assert.throws(() => void proxy.name);
});

test('Test timeout (rollback)', async () => {
  const data = getData();
  const { transaction, proxy } = Transaction.start(data);

  const COMMIT = false;
  const WAIT = 150;

  transaction.timeout(WAIT, COMMIT, (event) => {
    assert.strictEqual(event, 'rollback');
  });

  proxy.name = 'Jane Doe';
  delete proxy.age;

  let timeoutEventEmitted = false;
  transaction.on('timeout', () => {
    timeoutEventEmitted = true;
  });

  let commitEventEmitted = false;
  transaction.on('commit', () => {
    commitEventEmitted = true;
  });

  let rollbackEventEmitted = false;
  transaction.on('rollback', () => {
    rollbackEventEmitted = true;
  });

  await scheduler.wait(WAIT + 100);

  assert.strictEqual(timeoutEventEmitted, true);
  assert.strictEqual(commitEventEmitted, false);
  assert.strictEqual(rollbackEventEmitted, true);
  assert.strictEqual(proxy.name, 'John Doe');
  assert.strictEqual(proxy.age, 30);
  assert.deepStrictEqual(proxy, data);
  assert.deepStrictEqual(transaction.delta, {});
  assert.deepStrictEqual(transaction.deletedProps, new Set());

  transaction.stop();
});

test('Test refresh timer', async () => {
  const data = getData();
  const { transaction, proxy } = Transaction.start(data);

  const WAIT = 150;

  transaction.timeout(WAIT);

  let eventEmitted = false;
  transaction.on('timeout', () => {
    eventEmitted = true;
  });

  await scheduler.wait(WAIT - 100);
  assert.strictEqual(eventEmitted, false);

  proxy.name = 'Jane Doe';

  await scheduler.wait(WAIT - 100);
  assert.strictEqual(eventEmitted, false);

  delete proxy.age;

  await scheduler.wait(WAIT - 100);
  assert.strictEqual(eventEmitted, false);

  proxy.age = 25;

  await scheduler.wait(WAIT + 100);
  assert.strictEqual(eventEmitted, true);

  transaction.stop();
});
