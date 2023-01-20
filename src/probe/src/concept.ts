import { IsolatedContext } from "./context.js";
import { Probe } from "./probe.js";

interface GlobalCtx { foo: string }
interface LocalCtx { deepTrace: boolean }

export class Example extends Probe<any, any, GlobalCtx, LocalCtx> {
  constructor() {
    super({
      name: "example",
      initialIsolateContextData() {
        return { deepTrace: false };
      }
    });
  }

  scan(node): boolean {
    return node.type === "Literal";
  }

  * harvest(node, ctx: IsolatedContext<GlobalCtx, LocalCtx>) {
    console.log(ctx.global.foo);
    console.log(ctx.local.deepTrace);

    yield node.value;

    if (!ctx.local.deepTrace) {
      yield ctx.rewind(
        () => ({ deepTrace: true })
      );
    }

    // 1. just break, 2. break by tag, 3. break by name
    yield ctx.break({ always: true });

    yield ctx.skip();
  }
}
