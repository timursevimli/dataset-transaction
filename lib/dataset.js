'use strict';

const { Transaction } = require('./transaction.js');

class DatasetTransaction {
  constructor(dataset) {
    this._dataset = dataset.map((data, idx) => Transaction.start(data, ++idx));
    this.logs = [];
    this.operationCount = 0;
    this._initLogEvents();
  }

  static from(dataset) {
    return new DatasetTransaction(dataset);
  }

  get dataset() {
    return this._dataset.map(({ proxy }) => proxy);
  }

  findOneById(id) {
    return this._dataset.find(({ transaction }) => transaction.id === id);
  }

  find(key, value) {
    return this.dataset.filter((data) => data[key] === value);
  }

  clone(id) {
    if (!id) return DatasetTransaction.from([...this.dataset]);
    const data = this.findOneById(id);
    return data ? data.transaction.clone() : null;
  }

  commit(id) {
    this._performTransAction((trans) => void trans.commit(), id);
  }

  rollback(id) {
    this._performTransAction((trans) => void trans.rollback(), id);
  }

  on(name, listener = null, id) {
    this._performTransAction((trans) => void trans.on(name, listener), id);
  }

  toString(id) {
    if (id) {
      const { transaction } = this.findOneById(id);
      return transaction ? transaction.toString() : '';
    }
    const { length } = this._dataset;
    const transactions = new Array(length).fill(undefined);
    for (let i = 0; i < length; i++) {
      const { transaction } = this._dataset[i];
      transactions[i] = `${transaction}`;
    }
    return transactions.join();
  }

  update(key, value, id) {
    this._performTransAction((trans) => void trans.update(key, value), id);
  }

  delete(key, id) {
    this._performTransAction((trans) => void trans.delete(key), id);
  }

  timeout(msec, commit = false, done = null, id) {
    this._performTransAction((trans) => {
      trans.timeout(msec, commit, done);
    }, id);
  }

  stop(id) {
    this._performTransAction((trans) => void trans.stop(), id);
  }

  removeListener(name, id) {
    this._performTransAction((trans) => void trans.removeListener(name), id);
  }

  removeTimer(id) {
    this._performTransAction((trans) => void trans.removeTimer(), id);
  }

  _performTransAction(operation, id) {
    if (!id) {
      for (const data of this._dataset) operation(data.transaction);
      return;
    }
    const data = this.findOneById(id);
    if (data) operation(data.transaction);
  }

  _initLogEvents() {
    for (const data of this._dataset) {
      const { transaction } = data;
      const { id, eventNames } = transaction;
      for (const eventName of eventNames) {
        const saveLog = () => {
          const log = {
            transactionId: id,
            operationId: ++this.operationCount,
            operation: eventName,
            time: new Date().toISOString(),
          };
          this.logs.push(log);
        };
        transaction.on(eventName, saveLog);
      }
    }
  }
}

module.exports = { DatasetTransaction };
