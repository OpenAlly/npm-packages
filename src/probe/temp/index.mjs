import { ProbeRunner, Probe } from "../dist/index.mjs";

function initialIsolateContextData() {
  return { deepTrace: false };
}

class Example extends Probe {
  constructor() {
    super({
      name: "example",
      initialIsolateContextData
    });
    this.count = 0;
  }

  scan(node) {
    return node.type === "Literal";
  }

  * harvest(node) {
    // console.log(ctx.global.foo);
    // console.log(ctx.local.deepTrace);

    yield `${node.value} ${++this.count}`;

    // yield ctx.rewind();
    // yield ctx.break();
    // yield ctx.skip();
  }
}

const runner = new ProbeRunner(
  [new Example()],
  { foo: "bar" }
);

runner.walk({
  type: "Literal",
  value: "hello world"
});

