// CONSTANTS
export const ISOLATED_SIGNAL = Symbol("Signal");

export const BREAK = Symbol.for("break");
export const REWIND = Symbol.for("rewind");
export const SKIP = Symbol.for("skip");

export type SignalType = typeof BREAK | typeof REWIND | typeof SKIP;

export interface IsolatedSignal {
  type: SignalType;
  options?: any;
  [ISOLATED_SIGNAL]: boolean;
}

export class IsolatedContext<T, H> {
  public global: T;
  public local: H;

  constructor(global: T, local: H) {
    this.global = global;
    this.local = local;
  }

  break(): IsolatedSignal {
    return { type: BREAK, options: {}, [ISOLATED_SIGNAL]: true };
  }

  skip(): IsolatedSignal {
    return { type: SKIP, [ISOLATED_SIGNAL]: true };
  }

  rewind(): IsolatedSignal {
    return { type: REWIND, [ISOLATED_SIGNAL]: true };
  }
}

export function isSignal(data: any): data is IsolatedSignal {
  return typeof data === "object" &&
    data !== null &&
    data[ISOLATED_SIGNAL] === true;
}
