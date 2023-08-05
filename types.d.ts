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

interface LogEntry {
  transactionId: number;
  operationId: number;
  operation: string;
  time: string;
}

export class DatasetTransaction {
  constructor(dataset: object[]);

  static from(dataset: object[]): DatasetTransaction;

  readonly logs: LogEntry[];
  readonly operationCount: number;
  readonly dataset: Transaction[];

  findOneById(
    id: number,
  ): { proxy: object; transaction: Transaction } | undefined;
  find(
    key: string,
    value: any,
  ): [{ proxy: object; transaction: Transaction[] }];
  clone(
    id?: number,
  ):
    | DatasetTransaction
    | { proxy: object; transaction: Transaction }
    | undefined;
  commit(id: number): void;
  rollback(id: number): void;
  on(name: TransactionEvent, listener: Function, id: number): void;
  toString(id?: number): string | undefined;
  update(key: string, value: any, id: number): void;
  delete(key: string, id: number): void;
  timeout(msec: number, commit?: boolean, done?: Function, id?: number): void;
  stop(id: number): void;
  removeListener(name: string, id: number): void;
  removeTimer(id: number): void;

  private _performTransAction(
    operation: (trans: Transaction) => void,
    id?: number,
  ): void;
  private _initLogEvents(): void;
}
