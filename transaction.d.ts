type TransactionEvent =
  | 'commit'
  | 'rollback'
  | 'get'
  | 'set'
  | 'delete'
  | 'timeout'
  | 'revoke';

export class Transaction {
  delta: Record<string, any>;
  deletedProps: Set<string>;
  ee: NodeJS.EventEmitter;
  proxy: object;
  setTimer: ((cb: (event: 'commit' | 'rollback') => void) => void) | null;
  timer: NodeJS.Timeout | null;
  id: number;
  eventNames: TransactionEvent[];
  private _revoke: (() => void) | null;

  static start(
    data: object,
    id: number,
  ): { transaction: Transaction; proxy: object };

  stop(): void;
  timeout(
    msec: number,
    commit?: boolean,
    done?: (event: 'commit' | 'rollback') => void,
  ): void;
  revoke(): void;
  removeTimer(): void;
  removeListener(name: TransactionEvent): void;
  emit(name: TransactionEvent): void;
  on(name: TransactionEvent, listener: (...args: any[]) => void): void;
  commit(): void;
  rollback(): void;
  clone(): { transaction: Transaction; proxy: any };
  toString(): string;
  delete(key: string): void;
  update(key: string, value: any): void;
}
