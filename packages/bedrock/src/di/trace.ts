import { ServiceIdentifier } from './base';

const enum TraceType {
  None = 0,
  Creation = 1,
  Invocation = 2,
  Branch = 3,
}

export class Trace {
  static all: Set<string> = new Set();

  private static readonly _None: Trace = new (class extends Trace {
    constructor() {
      super(TraceType.None, null);
    }

    override stop() {
      // Override
    }

    override branch() {
      return this;
    }
  })();

  private static _totals: number = 0;

  static traceInvocation(_enableTracing: boolean, ctor: any): Trace {
    return !_enableTracing
      ? Trace._None
      : new Trace(
          TraceType.Invocation,
          ctor.name || new Error().stack!.split('\n').slice(3, 4).join('\n'),
        );
  }

  static traceCreation(_enableTracing: boolean, ctor: any): Trace {
    return !_enableTracing
      ? Trace._None
      : new Trace(TraceType.Creation, ctor.name);
  }

  private readonly _start: number = Date.now();

  private readonly _dep: [ServiceIdentifier<any>, boolean, Trace?][] = [];

  private constructor(readonly type: TraceType, readonly name: string | null) {}

  branch(id: ServiceIdentifier<any>, first: boolean): Trace {
    const child = new Trace(TraceType.Branch, id.toString());
    this._dep.push([id, first, child]);
    return child;
  }

  stop() {
    const dur = Date.now() - this._start;
    Trace._totals += dur;

    let causedCreation = false;

    function printChild(n: number, trace: Trace) {
      const res: string[] = [];
      const prefix = new Array(n + 1).join('\t');
      for (const [id, first, child] of trace._dep) {
        if (first && child) {
          causedCreation = true;
          res.push(`${prefix}CREATES -> ${id}`);
          const nested = printChild(n + 1, child);
          if (nested) {
            res.push(nested);
          }
        } else {
          res.push(`${prefix}uses -> ${id}`);
        }
      }
      return res.join('\n');
    }

    const lines = [
      `${this.type === TraceType.Creation ? 'CREATE' : 'CALL'} ${this.name}`,
      `${printChild(1, this)}`,
      `DONE, took ${dur.toFixed(2)}ms (grand total ${Trace._totals.toFixed(
        2,
      )}ms)`,
    ];

    if (dur > 2 || causedCreation) {
      Trace.all.add(lines.join('\n'));
    }
  }
}
