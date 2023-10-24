'use strict';

const { EventEmitter } = require('node:events');

class Transaction {
  constructor() {
    this.delta = {};
    this.deletedProps = new Set();
    this.ee = new EventEmitter();
    this._revoke = null;
    this.proxy = null;
    this.setTimer = null;
    this.timer = null;
    this.id = undefined;
    this.eventNames = [
      'commit',
      'rollback',
      'get',
      'set',
      'delete',
      'timeout',
      'revoke',
    ];
  }

  static start(data, id) {
    const transaction = new Transaction();
    const { revoke, proxy } = Proxy.revocable(data, {
      get(target, key) {
        transaction.ee.emit('get');
        const { delta, deletedProps } = transaction;
        if (delta.hasOwnProperty(key)) return delta[key];
        if (!deletedProps.has(key)) return target[key];
      },
      set(target, key, val) {
        const { delta, deletedProps, setTimer } = transaction;
        if (target[key] === val) delete delta[key];
        else delta[key] = val;
        deletedProps.delete(key);
        if (!setTimer) {
          transaction.ee.emit('set');
        } else {
          setTimer((event) => {
            if (event === 'commit') transaction.ee.emit('set');
          });
        }
        return true;
      },
      getOwnPropertyDescriptor(target, key) {
        const { delta } = transaction;
        return Object.getOwnPropertyDescriptor(
          delta.hasOwnProperty(key) ? delta : target,
          key,
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
        if (!setTimer) {
          transaction.ee.emit('delete');
        } else {
          setTimer((event) => {
            if (event === 'commit') transaction.ee.emit('delete');
          });
        }
        return true;
      },
    });
    transaction.id = id;
    transaction.data = data;
    transaction.proxy = proxy;
    transaction._revoke = revoke;
    return { transaction, proxy };
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.revoke();
  }

  timeout(msec, commit = false, done) {
    if (msec < 0) return;
    const setTimer = (cb) => {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      this.timer = setTimeout(() => {
        const event = commit ? 'commit' : 'rollback';
        commit ? this.commit() : this.rollback();
        if (done) done(event);
        if (cb) cb(event);
        this.timer = null;
        this.ee.emit('timeout');
      }, msec);
    };
    this.setTimer = setTimer;
  }

  revoke() {
    if (this._revoke) this._revoke();
    this.ee.emit('revoke');
  }

  removeTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.setTimer = null;
  }

  removeListener(name) {
    this.ee.removeListener(name);
  }

  emit(name) {
    if (this.eventNames.includes(name)) this.ee.emit(name);
  }

  on(name, listener) {
    if (this.eventNames.includes(name)) this.ee.on(name, listener);
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

module.exports = { Transaction };
