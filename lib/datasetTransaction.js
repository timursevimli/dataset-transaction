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
    if (data) return data.transaction.clone();
  }

  commit(id) {
    this._performTransAction((trans) => trans.commit(), id);
  }

  rollback(id) {
    this._performTransAction((trans) => trans.rollback(), id);
  }

  on(name, listener, id) {
    this._performTransAction((trans) => trans.on(name, listener), id);
  }

  toString(id) {
    if (!id)
      return this._dataset.map(({ transaction }) => transaction.toString());
    const data = this.findOneById(id);
    if (data) return data.transaction.toString();
    return;
  }

  update(key, value, id) {
    this._performTransAction((trans) => trans.update(key, value), id);
  }

  delete(key, id) {
    this._performTransAction((trans) => trans.delete(key), id);
  }

  timeout(msec, commit = false, done, id) {
    this._performTransAction((trans) => trans.timeout(msec, commit, done), id);
  }

  stop(id) {
    this._performTransAction((trans) => trans.stop(), id);
  }

  removeListener(name, id) {
    this._performTransAction((trans) => trans.removeListener(name), id);
  }

  removeTimer(id) {
    this._performTransAction((trans) => trans.removeTimer(), id);
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
