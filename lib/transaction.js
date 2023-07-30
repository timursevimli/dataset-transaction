'use strict';

const { EventEmitter } = require('node:events');

class Transaction {
  constructor() {
    this.delta = {};
    this.deletedProps = new Set();
    this.ee = new EventEmitter();
    this.revoke = null;
    this.proxy = null;
    this.setTimer = () => {};
    this.timer = null;
    this.id = undefined;
    this.eventNames = [
      'commit', 'rollback', 'get', 'set', 'delete', 'timeout', 'revoke'
    ];
  }

  static start(data, id) {
    const transaction = new Transaction();
    const { revoke, proxy } = Proxy.revocable(data, {
      get(target, key) {
        const { delta } = transaction;
        if (delta.hasOwnProperty(key)) return delta[key];
        transaction.ee.emit('get');
        return target[key];
      },
      set(target, key, val) {
        const { delta, deletedProps, setTimer } = transaction;
        if (target[key] === val) delete delta[key];
        else delta[key] = val;
        deletedProps.delete(key);
        transaction.ee.emit('set');
        setTimer();
        return true;
      },
      getOwnPropertyDescriptor(target, key) {
        const { delta } = transaction;
        return Object.getOwnPropertyDescriptor(
          delta.hasOwnProperty(key) ? delta : target, key
        );
      },
      ownKeys() {
        const { delta } = transaction;
        const changes = Object.keys(delta);
        const keys = Object.keys(data).concat(changes);
        return Array.from(new Set(keys));
      },
      deleteProperty(target, key) {
        const { deletedProps, setTimer } = transaction;
        if (deletedProps.has(key)) return false;
        deletedProps.add(key);
        transaction.ee.emit('delete');
        setTimer();
        return true;
      }
    });
    transaction.id = id;
    transaction.data = data;
    transaction.proxy = proxy;
    transaction.revoke = revoke;
    return { transaction, proxy };
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.revoke && this.revoke();
  }

  timeout(msec, commit = false, done) {
    if (msec < 0) return;
    const setTimer = () => {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      this.timer =  setTimeout(() => {
        commit ? this.commit() : this.rollback();
        if (done) done(commit ? 'commit' : 'rollback');
        this.timer = null;
        this.ee.emit('timeout');
      }, msec);
    };
    this.setTimer = setTimer;
  }

  removeTimeout() {
    this.setTimer = () => {};
  }

  removeListener(name) {
    this.ee.removeListener(name);
  }

  emit(name) {
    if (!this.eventNames.includes(name)) return;
    this.ee.emit(name);
  }

  on(name, listener) {
    if (!this.eventNames.includes(name)) return;
    this.ee.on(name, listener);
  }

  commit() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.deletedProps.size > 0) {
      for (const key of this.deletedProps) {
        delete this.data[key];
      }
      this.deletedProps.clear();
    }
    Object.assign(this.data, this.delta);
    this.delta = {};
    this.ee.emit('commit');
  }

  rollback() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.delta = {};
    this.deletedProps.clear();
    this.ee.emit('rollback');
  }

  clone() {
    const cloned = Transaction.start({ ...this.data });
    Object.assign(cloned.transaction.delta, { ...this.delta });
    return cloned;
  }

  toString() {
    return JSON.stringify(this.data);
  }

  delete(key) {
    delete this.proxy[key];
  }

  update(key, value) {
    this.proxy[key] = value;
  }
}

module.exports = Transaction;
