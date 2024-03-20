'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { Transaction, DatasetTransaction } = require('../main.js');

const getDataset = () => [
  {
    name: 'John Doe',
    age: 30,
    email: 'johndoe@example.com',
  },
  {
    name: 'Jane Smith',
    age: 25,
    email: 'janesmith@example.com',
  },
];

test('Test from', () => {
  const dataset = getDataset();
  const datasetTransaction = DatasetTransaction.from(dataset);

  const dataFromDataset = datasetTransaction._dataset[0];

  assert.deepStrictEqual(datasetTransaction.dataset, dataset);
  assert.deepStrictEqual(dataFromDataset.proxy, dataset[0]);
  assert.strictEqual(dataFromDataset.transaction.data, dataset[0]);
  assert.ok(dataFromDataset.transaction instanceof Transaction);
  assert.ok(datasetTransaction instanceof DatasetTransaction);
  assert.strictEqual(datasetTransaction._dataset.length, dataset.length);
});

test('Test dataset getter', () => {
  const dataset = getDataset();
  const datasetTransaction = DatasetTransaction.from(dataset);

  assert.deepStrictEqual(datasetTransaction.dataset, dataset);
  assert.notDeepStrictEqual(datasetTransaction._dataset, dataset);
});

test('Test findOneById', () => {
  const dataset = getDataset();
  const datasetTransaction = DatasetTransaction.from(dataset);

  const foundData = datasetTransaction.findOneById(2);
  assert.ok(foundData);
  assert.strictEqual(foundData.transaction.id, 2);
  assert.deepStrictEqual(foundData.proxy, dataset[1]);

  const notFoundData = datasetTransaction.findOneById(3);
  assert.strictEqual(notFoundData, undefined);
});

test('Test find', () => {
  const dataset = getDataset();
  const datasetTransaction = DatasetTransaction.from(dataset);

  const foundData = datasetTransaction.find('name', 'John Doe');
  assert.ok(foundData);
  assert.strictEqual(foundData.length, 1);
  assert.deepStrictEqual(foundData[0], dataset[0]);

  const notFoundData = datasetTransaction.find('name', 'John Smith');
  assert.strictEqual(notFoundData.length, 0);
});

test('Test clone', () => {
  const dataset = getDataset();
  const datasetTransaction = DatasetTransaction.from(dataset);

  const dataFromDataset = datasetTransaction._dataset[0].transaction.data;
  assert.strictEqual(dataset[0], dataFromDataset);
  assert.notStrictEqual(dataset, datasetTransaction.dataset);
  assert.deepStrictEqual(dataset, datasetTransaction.dataset);

  const clonedData1 = datasetTransaction.clone(1);
  assert.ok(clonedData1.transaction instanceof Transaction);
  assert.deepStrictEqual(clonedData1.proxy, dataset[0]);
  assert.notStrictEqual(clonedData1.proxy, dataset[0]);
  assert.notStrictEqual(clonedData1.transaction.data, dataset[0]);

  const clonedData3 = datasetTransaction.clone(3);
  assert.strictEqual(clonedData3, null);

  const clonedDataset = datasetTransaction.clone();
  assert.ok(clonedDataset instanceof DatasetTransaction);
  assert.deepStrictEqual(clonedDataset.dataset, datasetTransaction.dataset);
  assert.notStrictEqual(clonedDataset.dataset, datasetTransaction.dataset);
});

test('Test logs', () => {
  const dataset = getDataset();
  const datasetTransaction = DatasetTransaction.from(dataset);

  datasetTransaction.update('age', 31, 1);

  assert.strictEqual(datasetTransaction.logs[0].operation, 'set');
  assert.strictEqual(datasetTransaction.logs[0].operationId, 1);
  assert.strictEqual(datasetTransaction.logs[0].transactionId, 1);
  assert.strictEqual(datasetTransaction.logs.length, 1);

  datasetTransaction.delete('email', 2);

  assert.strictEqual(datasetTransaction.logs[1].operation, 'delete');
  assert.strictEqual(datasetTransaction.logs[1].operationId, 2);
  assert.strictEqual(datasetTransaction.logs[1].transactionId, 2);
  assert.strictEqual(datasetTransaction.logs.length, 2);

  const logExample = [
    {
      transactionId: 1,
      operationId: 1,
      operation: 'set',
      time: new Date().toISOString(),
    },
    {
      transactionId: 2,
      operationId: 2,
      operation: 'delete',
      time: new Date().toISOString(),
    },
  ];

  assert.deepStrictEqual(logExample, datasetTransaction.logs);

  datasetTransaction.commit(1);
  datasetTransaction.rollback(2);

  assert.strictEqual(datasetTransaction.logs.length, 4);
  assert.strictEqual(datasetTransaction.logs[2].operation, 'commit');
  assert.strictEqual(datasetTransaction.logs[3].operation, 'rollback');

  datasetTransaction.stop();

  assert.strictEqual(datasetTransaction.logs[4].operation, 'revoke');
  assert.strictEqual(datasetTransaction.logs[5].operation, 'revoke');
  assert.strictEqual(datasetTransaction.logs.length, 6);
});

test('Test toString', () => {
  const dataset = getDataset();
  const datasetTransaction = DatasetTransaction.from(dataset);

  const expected = dataset.map((data) => JSON.stringify(data)).join();
  const result = datasetTransaction.toString();
  assert.strictEqual(result, expected);
});
