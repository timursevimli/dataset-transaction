'use strict';

const { EventEmitter } = require('node:events');

class Transaction extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.delta = {};
    this.deletedProps = new Set();
    this._revoke = null;
    this.proxy = null;
    this.setTimer = null;
    this.timer = null;
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
    const transaction = new Transaction(id);
    const { revoke, proxy } = Proxy.revocable(data, {
      get(target, key) {
        transaction.emit('get');
        const { delta, deletedProps } = transaction;
        if (delta.hasOwnProperty(key)) return delta[key];
        return !deletedProps.has(key) ? target[key] : undefined;
      },
      set(target, key, val) {
        const { delta, deletedProps, setTimer } = transaction;
        if (target[key] === val) delete delta[key];
        else delta[key] = val;
        deletedProps.delete(key);
        if (!setTimer) {
          transaction.emit('set');
        } else {
          setTimer((event) => {
            if (event === 'commit') transaction.emit('set');
          });
        }
        return true;
      },
      getOwnPropertyDescriptor(target, key) {
        const { delta } = transaction;
        const object = delta.hasOwnProperty(key) ? delta : target;
        return Object.getOwnPropertyDescriptor(object, key);
      },
      ownKeys() {
        const { delta } = transaction;
        const changes = Object.keys(delta);
        const keys = Object.keys(data).concat(changes);
        return Array.from(new Set(keys));
      },
      deleteProperty(_, key) {
        const { deletedProps, setTimer } = transaction;
        if (deletedProps.has(key)) return false;
        deletedProps.add(key);
        if (!setTimer) {
          transaction.emit('delete');
        } else {
          setTimer((event) => {
            if (event === 'commit') transaction.emit('delete');
          });
        }
        return true;
      },
    });
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

  timeout(msec, commit = false, done = null) {
    if (msec < 0) return;
    const setTimer = (cb) => {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        const event = commit ? 'commit' : 'rollback';
        commit ? this.commit() : this.rollback();
        if (done) done(event);
        if (cb) cb(event);
        this.timer = null;
        this.emit('timeout');
      }, msec);
    };
    this.setTimer = setTimer;
  }

  revoke() {
    if (this._revoke) this._revoke();
    this.emit('revoke');
  }

  removeTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.setTimer = null;
  }

  emit(name) {
    if (this.eventNames.includes(name)) super.emit(name);
  }

  on(name, listener) {
    if (this.eventNames.includes(name)) super.on(name, listener);
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
    this.emit('commit');
  }

  rollback() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.delta = {};
    this.deletedProps.clear();
    this.emit('rollback');
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
