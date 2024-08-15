function abort(reason: string): never {
  throw new Error(`assert(${reason})`);
}

export function assert(expr: unknown, reason?: string): asserts expr {
  if (!expr) {
    abort(reason ?? '#expr is false');
  }
}

export function assertNotHere(reason?: string): never {
  abort(reason ?? 'unreachable code flow');
}

export function assertNever(member: never, message = 'illegal value:'): never {
  abort(`${message}: ${member}`);
}

export function assertNotNil<T>(
  val: T,
  reason?: string,
): asserts val is NonNullable<T> {
  if (val === null || val === undefined) {
    abort(reason ?? '#val is nil');
  }
}
